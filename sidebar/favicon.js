'use strict';

/*
 * Worker for getting favicons in background, and populating the sidebar bookmarks table
 * and saved storage with an URI (data:....) to keep them in self contained form
 * and not fetch them on Internet permanently (performance ..)
 */


/*
 * Constants
 */
const Cadence=20; // Wait time in milliseconds between a request completion
                  // and start next one in queue
const FetchTimeout = 30000; // Wait time in milliseconds for a fetch URL to complete
const FReader = new FileReader();


/*
 *  Global variables
 */
var fetchController;
var reqQueue = []; // Array of input requests, to serialize and cadence their handling
//var xmlHttpReq; // XMLHttpRequest
var fetchTimerID = null;


/*
 * Send back to main thread the URI, and redispatch if more in the queue
 * 
 * BTN is a BookmarkTreeNode
 * uri is a String
 */
function answerBack (BTN, uri) {
//  console.log("Answering [BTN.id="+BTN.id+",uri=<<"+FReader.result.substr(0,40)+">>]");
  postMessage([BTN, uri]);

  if (uri != "starting:") {
	reqQueue.shift(); // Remove the element in queue we just processed (= first one)
	if (reqQueue.length > 0) { // Still work in reqQueue, continue the cadence process
//      console.log("Still work in queue: "+reqQueue.length+" - redispatching");
      setTimeout(handleRequest, Cadence);
	}
  }
}

/*
 * Global object to read URI encoded contents of blob and send back to main thread 
 */
var readerBTN; // BookmarkTreeNode on which is the URI 
function readerLoad () {
  answerBack(readerBTN, FReader.result);
}

/*
 * Function to handle a timeout on fetch() request: abort it 
 */
function fetchTimeoutHandler () {
  fetchTimerID = null;
  fetchController.abort();
}

/*
 * Retrieve the favicon, and transform it to a data: uri
 * 
 * BTN is a BookmarkTreeNode
 * url is a String
 */
function getUri (BTN, url) {
//  console.log("Getting favicon contents from "+url);
  // Need to recreate the AbortController each time, or else all requests after
  // an abort will abort .. and there appears to be no way to remove / clear the abort signal
  // from the AbortController.
  fetchController = new AbortController();
  var fetchSignal = fetchController.signal;
  var myInit = {
	credentials: "include",
	redirect: "follow",
	signal: fetchSignal
  };

  fetch(url, myInit)
  .then(
    function (response) { // This is a Response object 
      // Remove fetch timeout
      clearTimeout(fetchTimerID);
      fetchTimerID = null;
//      console.log("Status: "+response.status+"'for url: "+url);
      if (response.status == 200) { // If ok, get contents as blob
        response.blob().then(
          function (blob) { // blob is a Blob ..
//            console.log("Contents: "+blob);
            readerBTN = BTN;
   	        FReader.readAsDataURL(blob);
          }
   	    )
      }
      else {
        console.log("Looks like there was a problem 1. Status Code: "+response.status+" url: "+url);
        answerBack(BTN, "error: Looks like there was a problem 1. Status Code: "+response.status+"\r\n"
                        +"Full text: "+response.statusText);
      }
    }
  )
  .catch( // Asynchronous also, like then
    function (err) {
      // Remove fetch timeout
      clearTimeout(fetchTimerID);
      fetchTimerID = null;
      console.log("Fetch Error 1 :-S", err, url);
      answerBack(BTN, "error: Fetch Error 1 :-S "+err);
    }
  );

  // Set timeout on fetch
  fetchTimerID = setTimeout(fetchTimeoutHandler, FetchTimeout);
}

/*
 * Parse relative to position index to retrieve "href=\"" around,
 * and within limits of '<' and '>' on left and right, and then
 * get the text between the two '\"'.
 * 
 * lctext is a lower case version of the HTML document string
 * text is the original HTML document string
 * pos is the position in both from where to search
 * token is a string describing the HTML <token> to search for. E.g. "link", "base", ..
 */
const PatternCheckLink = /^<\s*link\s/;
const PatternHref2 = /href\s*=\s*\"/;
const PatternHref2b = /href\s*=\s*\'/;
const PatternHref2c = /href\s*=\S/;
const PatternHref3 = /^\S+/;
function retrieveHref (lctext, text, pos, searchLinkToken = false) {
  var faviconUrl;

  // Find enclosing brakets
  var posStart = lctext.lastIndexOf("<", pos); // Search left starting from pos included
  var posEnd = lctext.indexOf(">", pos);
  if ((posStart < 0) || (posEnd < 0))
    return(null); // Not found
  var extract = lctext.slice(posStart, posEnd); // Warning, last char '>' not included

  if (searchLinkToken // Verify this is a <link>
      && (extract.search(PatternCheckLink) < 0)
     ) {
    return(null); // Not found
  }

  // Looks good so far, let's find the href string
  var isDoubleQuote = true;
  var isNoQuote = false;
  var a_href = extract.match(PatternHref2);
  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match
  // for format of the return value of match()
  if (a_href == null) {
	a_href = extract.match(PatternHref2b);
	if (a_href == null) {
      a_href = extract.match(PatternHref2c);
	  if (a_href == null) {
	    return(null); // Not found
	  }
	  isNoQuote = true;
	}
	isDoubleQuote = false;
  }

  // Found something, let's find the end of it
  var posStartQuote = a_href.index + a_href[0].length;
  var posEndQuote;
  if (isNoQuote) {
	posStartQuote--; // Include the first non-space character at end, just after =
	// End = first blank or end of string
	var rest = extract.slice(posStartQuote);
	a_href = rest.match(PatternHref3);
    posEndQuote = posStartQuote + a_href[0].length;
  }
  else {
	posEndQuote = extract.indexOf((isDoubleQuote ? "\"" : "\'"),
                                  posStartQuote);
  }
  if (posEndQuote < 0) // We were so close :-(
    return(null); // Not found

  // Get the value with corrent Caps and lower case mix, and return it
  faviconUrl = text.slice(posStart+posStartQuote, posStart+posEndQuote);
  
  return(faviconUrl);
}

/*
 * Parse the page HTML to retrieve a base URL and return it.
 * Could use a DOMParser, that would surely be the most complete method ..
 * however this can be an heavy process, so trying first with some basic string searches.
 * If success rate is not high, will revert to that higher demanding process.
 * 
 * (Also, not sure at this stage that a DOMParser can run in a worker ..
 *  For sure, XMLHttpRequest.responseXML() is not available to Workers
 *  cf. https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)
 *  
 *  text is an HTML document string
 *  lctext is the same, but in lowercase
 */
const PatternBase = /<\s*base\s/;
function retrieveBaseUrl (text, lctext) {
  var baseUrl = null;

  // Search for "/<\s*base\s/"
  // (see https://superuser.com/questions/157925/how-to-download-favicon-from-website
  //      https://stackoverflow.com/questions/1990475/how-can-i-retrieve-the-favicon-of-a-website
  //      https://stackoverflow.com/questions/5119041/how-can-i-get-a-web-sites-favicon
  var pos = lctext.search(PatternBase);
  if (pos >= 0) { // Found a candidate, then search for the href piece ..
	baseUrl = retrieveHref(lctext, text, pos);
  }

  return(baseUrl);
}

/*
 * Parse the page HTML to retrieve a favicon URL and return it.
 * Could use a DOMParser, that would surely be the most complete method ..
 * however this can be an heavy process, so trying first with some basic string searches.
 * If success rate is not high, will revert to that higher demanding process.
 * 
 * (Also, not sure at this stage that a DOMParser can run in a worker ..
 *  For sure, XMLHttpRequest.responseXML() is not available to Workers
 *  cf. https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)
 *  
 *  text is an HTML document string
 *  lctext is the same, but in lowercase
 */
const PatternFavicon1 = /rel\s*=\s*\"shortcut icon\"/; // Not to be used anymore per standard,
                                                       // but a lot of sites still use it, and Firefox
                                                       // still appears to give preference to this one ...
const PatternFavicon1b = /rel\s*=\s*\'shortcut icon\'/;
const PatternFavicon2 = /rel\s*=\s*\"icon\"/;
const PatternFavicon2b = /rel\s*=\s*\'icon\'/;
function retrieveFaviconUrl (text, lctext) {
  var faviconUrl = null;

  // First, search for "rel=\"shortcut icon\""
  // (see https://superuser.com/questions/157925/how-to-download-favicon-from-website
  //      https://stackoverflow.com/questions/1990475/how-can-i-retrieve-the-favicon-of-a-website
  //      https://stackoverflow.com/questions/5119041/how-can-i-get-a-web-sites-favicon
  var pos = lctext.search(PatternFavicon1);
  if (pos >= 0) { // Found a candidate, then search for the href piece ..
    faviconUrl = retrieveHref(lctext, text, pos, true);
  }
  if (faviconUrl == null) { // Not yet found
    pos = lctext.search(PatternFavicon1b);
    if (pos >= 0) { // Found a candidate, then search for the href piece ..
      faviconUrl = retrieveHref(lctext, text, pos, true);
    }
  }
  if (faviconUrl == null) { // Not yet found
    pos = lctext.search(PatternFavicon2);
    if (pos >= 0) { // Found a candidate, then search for the href piece ..
      faviconUrl = retrieveHref(lctext, text, pos, true);
    }
  }
  if (faviconUrl == null) { // Not yet found
    pos = lctext.search(PatternFavicon2b);
    if (pos >= 0) { // Found a candidate, then search for the href piece ..
      faviconUrl = retrieveHref(lctext, text, pos, true);
    }
  }

  return(faviconUrl);
}

/*
 * Dequeue a request and process it.
 * Then re-dispatch itself if more work, after <cadence> milliseconds delay
 */
function handleRequest () {
  // var BTN = reqQueue.shift(); // This is a BookmarkTreeNode
  var request = reqQueue[0]; // This is [action, BTN], with:
                             //
                             // action = a string, either "get" or "icon:<url>"
                            // BTN = a BookmarkTreeNode of type "bookmark"
  var action = request[0];
  var BTN    = request[1];
//  console.log("Dequeued request action: "+action);
  if (BTN != undefined) { // Protect against too many redispatch events 
	answerBack(BTN, "starting:"); // Signal we are starting to retrieve favicon for that BTN
//    console.log("Dequeued request action: "+action+" BTN.id: "+BTN.id+" url: "+BTN.url+" remains: "+reqQueue.length);

	if (BTN.url.startsWith("ftp:")) {
	  answerBack(BTN, "/icons/ftpfavicon.png");
	}
	else if (action.startsWith("icon:")) { // We already got the favicon URL (e.g. tab refresh)
		                                   // so simply get it.
//      console.log("faviconUrl: <<"+action.slice(5)+">> 2");
	  getUri(BTN, action.slice(5));
	}
	else { // Normal get process
      // This requires the "<all_urls>" permission in manifest.json
      // Get the page at bookmarked URL, following redirections,
	  // and attempt to retrieve the favicon URL

	  // Need to recreate the AbortController each time, or else all requests after
	  // an abort will abort .. and there appears to be no way to remove / clear the abort signal
	  // from the AbortController.
	  fetchController = new AbortController();
	  var fetchSignal = fetchController.signal;
	  var myInit = {
		credentials: "include",
		redirect: "follow",
		signal: fetchSignal
	  };
//      console.log("Fetching: "+BTN.url);
      fetch(BTN.url, myInit)
      .then(
        function (response) { // This is a Response object 
          // Remove fetch timeout
          clearTimeout(fetchTimerID);
          fetchTimerID = null;
//          console.log("Status: "+response.status);
// Some errors return a page with a favicon, when the site implements a proper error page
//          if (response.status == 200) { // If ok, get contents as a string
            response.text()
            .then(
   	          function (text) { // text is a USVString returned by Response.text()
//                console.log("Contents: "+text.substr(0,5000));
   	        	var lctext = text.toLowerCase(); // Avoid getting lost because of Caps ...
                var faviconUrl = retrieveFaviconUrl(text, lctext);
//                console.log("faviconUrl 1: <<"+faviconUrl+">>");

                if (faviconUrl == null) { // If not found, try the old root/favicon.ico method
                  var url = new URL (response.url); // Use the URL of response in case
                                                    // we were redirected ..
                  faviconUrl = url.origin + "/favicon.ico";
//                  console.log("faviconUrl 2: <<"+faviconUrl+">>");
                  getUri(BTN, faviconUrl);
                }
                else if (faviconUrl.startsWith("data:")) { // Cool, it is already a self contained piece ..
//                  console.log("Got it directly !");
                  answerBack(BTN, faviconUrl);
                }
                else if (!faviconUrl.startsWith("http")) { // Not an absolute URL, make it absolute
                  var url = new URL (response.url); // Use the URL of response in case
                                                    // we were redirected ..
                  if (faviconUrl.startsWith("//")) // Scheme (protocol, e.g. https:) relative URL
            	    faviconUrl = url.protocol + faviconUrl;
                  else if (faviconUrl.charAt(0) == '/') { // Root relative URL
                	// Verify if there is a <base href=..> tag
                	var baseUrl = retrieveBaseUrl(text, lctext);
//                    console.log("baseUrl 1: <<"+baseUrl+">>");
                    if ((baseUrl != null) && (baseUrl.includes("://")))
                      url = new URL (baseUrl);
                    faviconUrl = url.origin + faviconUrl;
                  }
                  else { // Just relative URL ...
                  	// Verify if there is a <base href=..> tag
                  	var baseUrl = retrieveBaseUrl(text, lctext);
//                    console.log("baseUrl 2: <<"+baseUrl+">>");
                    if (baseUrl != null) {
                      if (baseUrl.includes("://"))
                        faviconUrl = baseUrl + faviconUrl;
                      else   faviconUrl = url.origin + baseUrl + faviconUrl;
                    }
                    else {
                      // Need to get back to closest '/' from end of path, removing all
                	  //  ?xxx=yy and other stuff
                	  var temp = url.origin + url.pathname
                	  var pos = temp.lastIndexOf("/");
                      faviconUrl = temp.slice(0, pos+1) + faviconUrl;
                    }
                  }
//                  console.log("faviconUrl 3: <<"+faviconUrl+">>");
                  getUri(BTN, faviconUrl);
                }
                else {
//                  console.log("faviconUrl 4: <<"+faviconUrl+">>");
                  getUri(BTN, faviconUrl);
                }
              }
   	        )
/*          }
          else {
            console.log("Looks like there was a problem 2. Status Code: "+response.status+" url: "+BTN.url);
            console.log(response.statusText);
            answerBack(BTN, "error: Looks like there was a problem 2. Status Code: "+response.status+"\r\n"
                            +"Full text: "+response.statusText);
          }
*/
        }
      )
      .catch( // Asynchronous, like .then
        function (err) {
          // Remove fetch timeout
          clearTimeout(fetchTimerID);
          fetchTimerID = null;
          console.log("Fetch Error 2 :-S", err, BTN.url);
          answerBack(BTN, "error: Fetch Error 2 :-S "+err);
        }
      );

      // Set timeout on fetch
      fetchTimerID = setTimeout(fetchTimeoutHandler, FetchTimeout);
//      console.log("Finished sending request");

      /*
      xmlHttpReq = new XMLHttpRequest();
      xmlHttpReq.addEventListener("progress", reqProgress);
      xmlHttpReq.addEventListener("load", reqComplete);
      xmlHttpReq.addEventListener("error", reqFailed);
      xmlHttpReq.addEventListener("abort", reqCanceled);
      xmlHttpReq.open("GET", "https://stackoverflow.com/questions/5119041/how-can-i-get-a-web-sites-favicon");
      xmlHttpReq.send();
      */
    }
  }
}


/*
 * Main code:
 * ----------
*/
// Set up final structure for URI conversion
FReader.addEventListener("load", readerLoad);

// Set up internal queueing for posted messages from main thread
//var nbBTN = 0;
//var nbBTNmin = 0;
//var nbBTNmax = nbBTNmin + 100;
onmessage = function (e) { // e is of type MessageEvent,
	                       // and its data contains [action, BTN], with:
                           //
                           // action = a string, either "get" or "icon:<url>"
	                       // BTN = a BookmarkTreeNode of type "bookmark"
  // Cannot use the browser.bookmarks interface from within the worker ...
  // var getTree = browser.bookmarks.getTree();

//  if (((nbBTN >= nbBTNmin) && (nbBTN < nbBTNmax)) || e.data[0].startsWith("icon:") || e.data[0].startsWith("get2")) {
  var BTN = e.data[1];
  reqQueue.push(e.data); // Add new request at end
  if (reqQueue.length == 1) { // reqQueue was empty, need to start cadence process
//    console.log("There was no work in queue: "+reqQueue.length+" - dispatching");
	setTimeout(handleRequest, Cadence);
  }
//  console.log("Finished queueing request "+e.data[0]+" for BTN.id: "+BTN.id+" url: "+BTN.url+" Queue length: "+reqQueue.length);
//  }
//  nbBTN++;
}