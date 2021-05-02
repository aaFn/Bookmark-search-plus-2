'use strict';


/*
 * Worker for getting favicons in background, and populating the sidebar bookmarks table
 * and saved storage with an URI (data:....) to keep them in self contained form
 * and not fetch them on Internet permanently (performance ..)
 */


/*
 * Constants
 */
const Hysteresis = 60000; // Wait time in milliseconds before starting fetch favicon
						  // after add-on start.
const Cadence = 200; // Wait time in milliseconds between a request completion
                     // and start next one in queue
const FetchTimeout = 30000; // Wait time in milliseconds for a fetch URL to complete
const FReader = new FileReader();


/*
 *  Global variables
 */
let hysteresis = Cadence;
let requestTimerID; // Hold current reference to timer if there is one active
let fetchController = null;
let reqQueue = []; // Array of input requests, to serialize and cadence their handling
//let xmlHttpReq; // XMLHttpRequest
let fetchTimerID = null;


/*
 * Functions
 * ---------
 */

/*
 * Send back to main thread the URI, and redispatch if more in the queue
 * 
 * bnId = Id of BookmarkNode
 * uri is a String
 */
function answerBack (bnId, uri) {
//  console.log("Answering [BN.id="+BN.id+",uri=<<"+uri.substr(0,40)+">>]");
//  postMessage([bnId, uri]);
  try { // Ensure we always come back here even if there is a problem in called code
	    // in order to restart timer and continue dequeueing, or clear timer as needed.
	asyncFavicon({data: [bnId, uri]});
  }
  catch (err) {
	let msg = "Error in favicon call to asyncFavicon() : "+err;
	console.log(msg);
	if (err != undefined) {
	  let fn = err.fileName;
	  if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
	  console.log("fileName:   "+fn);
	  console.log("lineNumber: "+err.lineNumber);
	}
  }

  if (uri != "starting:") {
	reqQueue.shift(); // Remove the element in queue we just processed (= first one)
	if (reqQueue.length > 0) { // Still work in reqQueue, continue the cadence process
//console.log("Still work in queue: "+reqQueue.length+" - redispatching");
	  requestTimerID = setTimeout(handleRequest, hysteresis);
	}
	else {
	  requestTimerID = undefined; // No more request running and scheduled for now
	}
  }
}

/*
 * Global object to read URI encoded contents of blob and send back to main thread 
 */
let readerBNId; // Id of BookmarkNode on which is the URI 
let freader_resolve;
let freader_reject;
function readerLoad () { // Called when interpretation of a Blob as data uri is complete
  // Return the result String
//console.log("Read blob as: "+FReader.result);
  freader_resolve(FReader.result);
}
function readerError () { // Called when interpretation of a Blob as data uri fails
  // Return the result String
//console.log("Error reading blob as data");
  freader_reject(new Error ("Error converting Blob to Data"));
}

/*
 * Function to handle a timeout on fetch() request: abort it 
 */
function fetchTimeoutHandler () {
//  console.log("timeout");
  fetchTimerID = null;
  fetchController.abort();
}

/*
 * Retrieve the favicon, and transform it to a data: uri
 * 
 * BN is a BookmarkNode
 * url is a String
 */
const MyInitFF56 = {
  credentials: "omit",
  mode: "cors",
  redirect: "follow"
};
const MyInitFF57 = {
  credentials: "omit",
  mode: "cors",
  redirect: "follow",
  signal: null
};

/*
 * Fetch URI of a favicon
 * 
 * bnId = Id of BookmarkNode
 * url = URL string
 * enableCookies = a Boolean to "omit" (false) or "include" (true)
 * 
 * Returns undefined if error, or the URI string
 */
//const PatternHtmlText = /text\/html\;\s*charset\=/i; // Detect things like "text/html; charset="
const PatternHtmlText = /text\/html/i; // Detect things like "text/html
async function getUri (url, enableCookies) {
  //console.log("Getting favicon contents from "+url);
  // Need to recreate the AbortController each time, or else all requests after
  // an abort will abort .. and there appears to be no way to remove / clear the abort signal
  // from the AbortController.
  try { // Only supported as of FF 57
	fetchController = new AbortController();
  }
  catch (error) {
	console.log("getUri error: "+error);
  }
  let myInit;
  if (fetchController == null) { // we are below FF 57
	myInit = MyInitFF56;
  }
  else {
	myInit = MyInitFF57;
	let fetchSignal = fetchController.signal;
	myInit.signal = fetchSignal;
  }
  myInit.credentials = (enableCookies ? "include" : "omit");

  let uri;
  // Set timeout on fetch
  fetchTimerID = setTimeout(fetchTimeoutHandler, FetchTimeout);
  try {
	let response = await fetch(url, myInit); // A Response object
	// Remove fetch timeout
	clearTimeout(fetchTimerID);
	fetchTimerID = null;

//console.log("Status: "+response.status+"'for url: "+url);
	if (response.status == 200) { // If ok, get contents as blob
	  try {
		let blob = await response.blob(); // a Blob ..
//console.log("Contents: "+blob);
		if (blob.type.search(PatternHtmlText) >= 0) { // We are not getting a favicon !
		  console.log("Got HTML response with no favicon at "+url);
		}
		else {
		  let getData = new Promise (
			(resolve, reject) => {
			  // Externalise the resolve and reject functions
			  freader_resolve = resolve;
			  freader_reject = reject;
			}
		  );
		  FReader.readAsDataURL(blob);
		  uri = await getData;
		}
	  }
	  catch (err) {
		let msg = "Response.blob Error :-S "+err;
		console.log(msg, url);
		if (err != undefined) {
		  let fn = err.fileName;
		  if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
		  console.log("fileName:   "+fn);
		  console.log("lineNumber: "+err.lineNumber);
		}
	  }
	}
	else {
	  let msg = "error: Looks like there was a URL fetch problem. Status Code: "+response.status;
	  console.log(msg+" url: "+url);
	}
  }
  catch (err) {
	// Remove fetch timeout
	if (fetchTimerID != null) {
	  clearTimeout(fetchTimerID);
	  fetchTimerID = null;
	}
	let msg = "Favicon fetch Error :-S "+err;
	console.log(msg, url);
  }

//console.log(url+" : "+uri);
  return(uri);
}

/*
* Parse to retrieve "href=\"" and then get the text between the two '\"'.
* 
* text is the original <link ...> HTML document String
*/
const PatternHrefa = /href\s*=\s*\"([^\"]+)/i;
const PatternHrefb = /href\s*=\s*\'([^\']+)/i;
const PatternHrefc = /href\s*=([^\s\>]+)/i;
function retrieveHref (text) {
  // Let's find the href string
  let a_href = text.match(PatternHrefa);
  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match
  // for format of the return value of match()
  if (a_href == null) {
	a_href = text.match(PatternHrefb);
	if (a_href == null) {
    a_href = text.match(PatternHrefc);
	  if (a_href == null) {
	    return(null); // Not found
	  }
	}
  }

  // Get the value with current Caps and lower case mix, and return it
  // Indeed, /i is only used for matching, but the result and groups still contain upper cases if there are 
  let faviconUrl = a_href[1]; // 0 is the full matched string, 1 is the first () group matched

  return(faviconUrl);
}

/*
* Parse to retrieve "sizes=\"" and then * get the lowest width x height between the two '\"'.
* Cf. https://html.spec.whatwg.org/multipage/links.html#rel-icon
* 
* text is the original <link ...> HTML document String
* Returns an array with width first, then height, or null if not found or if "any"
*/
const PatternSizesa = /sizes\s*=\s*\"([^\"]+)\"/i;
const PatternSizesb = /sizes\s*=\s*\'([^\']+)\'/i;
const PatternWxH = /(\d*)x(\d*)\s*/iy;
function retrieveSizes (text) {
  let a_size = null;

  // Let's find the sizes string
  let a_sizes = text.match(PatternSizesa);
  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match
  // for format of the return value of match()
  if (a_sizes == null) {
	a_sizes = text.match(PatternSizesb);
	if (a_sizes == null) {
	  return(null); // Not found
	}
  }

  // Get the values, and keep lowest one
//console.log("a_sizes = "+a_sizes);
  let sizes = a_sizes[1];
  let a_wxh;
  let width = undefined;
  let height = undefined;
  let w, h;
  while ((a_wxh = sizes.match(PatternWxH)) != null) {
	w = parseInt(a_wxh[1], 10);
	h = parseInt(a_wxh[2], 10);
	if ((width == undefined) || (w < width) || (h < height)) {
	  width = w;
	  height = h;
	}
  }

  if ((width != undefined)) {
	a_size = [width, height];
  }
  return(a_size);
}

/*
* Parse the page HTML to retrieve a favicon URL of closest size to 16x16 and return an
* array of all of them ordered by increasing size.
* 
* Could use a DOMParser, that would surely be the most complete method ..
* however this can be an heavy process, so trying first with some basic string searches.
* If success rate is not high, will revert to that higher demanding process.
* 
* (Also, not sure at this stage that a DOMParser can run in a worker ..
*  For sure, XMLHttpRequest.responseXML() is not available to Workers
*  cf. https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)
*  
* text is an HTML document string
* Returns an Array of favicon URL strings
*/
//const PatternLinkRelIcon = /<\s*link\s[^\>]*rel\s*=[^\>-]+icon[^\>]+\>/gi; // Don't take things like "apple-touch-icon"
const PatternLinkRelIcon = /<\s*link\s[^\>]*rel\s*=\s*(?:icon|[\"\'][^\>\-i]*icon[\"\'])[^\>]*\>/gi; // Don't take things like "apple-touch-icon"
const PatternShortcutIcon1  = /rel\s*=\s*\"shortcut icon\"/i; // Not to be used anymore per standard,
const PatternShortcutIcon1b = /rel\s*=\s*\'shortcut icon\'/i; // but a lot of sites still use it
function retrieveFaviconUrl (text) {
  let a_faviconUrl = null; // Result URL closest to 16x16
  let a_width = undefined;  // Corresponding width
  let a_height = undefined; // Corresponding height

  // Search for all possible instances, and then select the one with closest size to 16x16
  let a_linkrel = text.match(PatternLinkRelIcon);
  let is_shortcutIcon;
  let href;
  let a_size;
  let w, h;
  if (a_linkrel != null) {
	let linkrel;
	let len = a_linkrel.length;
	for (let i=0 ; i<len ; i++) {
	  linkrel = a_linkrel[i];
//console.log(linkrel);
	  // Detect if we are on a shortcut icon link
	  if ((linkrel.search(PatternShortcutIcon1) >= 0) || (linkrel.search(PatternShortcutIcon1b) >= 0)) {
		is_shortcutIcon = true;
	  }
	  else {
		is_shortcutIcon = false;
	  }
//console.log("is_shortcutIcon = "+is_shortcutIcon);
	  // Get the href content
	  href = retrieveHref(linkrel);
//console.log("href = "+href);
	  // Get the sizes, keeping the lowest (if "any", or no size, then a_size is null)
	  a_size = retrieveSizes(linkrel);
//console.log("a_size = "+a_size);
	  if (a_size == null) {
		w = 17; // Prefer an icon which is 16x16, but prefer an unsized icon to any other bigger
		h = 17;
	  }
	  else {
		w = a_size[0];
		h = a_size[1];
	  }
	  if (a_faviconUrl == null) {
		a_faviconUrl = [href];
		a_width = [w];
		a_height = [h];
	  }
	  else if ((w >= 16) && (h >= 16)) {
		let i = 0;
		let l = a_width.length;
		while ((i < l)
			   && ((is_shortcutIcon && ((w >= a_width[i]) || (h >= a_height[i])))
				   || (!is_shortcutIcon && ((w > a_width[i]) || (h > a_height[i])))
				  )
			  ) {
		  i++;
		}
		// Insert the new element at i
		a_faviconUrl.splice(i, 0, href);
		a_width.splice(i, 0, w);
		a_height.splice(i, 0, h);
	  }
	}
  }
//console.log("a-width = "+a_width+" - a_height = "+a_height+" - a_faviconUrl = "+a_faviconUrl);
//console.log("-----------------------------------------------------------------");

  return(a_faviconUrl);
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
*/
const PatternBase = /<\s*base\s[^\>]+\>/i;
function retrieveBaseUrl (text) {
  let baseUrl = null;

  // Search for "/<\s*base\s/"
  // (see https://superuser.com/questions/157925/how-to-download-favicon-from-website
  //      https://stackoverflow.com/questions/1990475/how-can-i-retrieve-the-favicon-of-a-website
  //      https://stackoverflow.com/questions/5119041/how-can-i-get-a-web-sites-favicon
  let a_base = text.match(PatternBase);
  if (a_base != null) { // Found a candidate, then search for the href piece ..
	baseUrl = retrieveHref(a_base[0]);
  }

  return(baseUrl);
}

/*
 * Handle decoding of HTML entities (&xxx; or &#nnn; sequences) for retrieving favicon links.
 *         https://developer.mozilla.org/en-US/docs/Glossary/Entity
 * HTML entities decode
 * Cf. https://gist.github.com/yidas/797c9e6d5c856158cffd685b8a8b4ee4
 *
 * @param {string} str Input text
 * @return {string} Filtered text
 */
/*
function htmldecode (str) {

  let txt = document.createElement("textarea");
  txt.// innerHTML = str;  // Setting this generates a security vioalation warning on AMO
  return(txt.value);
}
*/

/*
 * Fetch favicon, and then get its URI
 * 
 * bnId = Id of BookmarkNode
 * bnUrl = URL string
 * myInit = fetch parameters
 * enableCookies = a Boolean to "omit" (false) or "include" (true)
 * 
 * Returns undefoined if error, or favicon uri String to set in BookmarkNode
 */
async function fetchFavicon (bnUrl, enableCookies) {
  // Need to recreate the AbortController each time, or else all requests after
  // an abort will abort .. and there appears to be no way to remove / clear the abort signal
  // from the AbortController.
  try { // Only supported as of FF 57
    fetchController = new AbortController();
  }
  catch (err) {
    console.log("handleRequest error: "+err);
  }
  let myInit;
  if (fetchController == null) { // we are below FF 57
    myInit = MyInitFF56;
  }
  else {
    myInit = MyInitFF57;
    let fetchSignal = fetchController.signal;
    myInit.signal = fetchSignal;
  }
  myInit.credentials = (enableCookies ? "include" : "omit");

  let uri;
  // Set timeout on fetch
  fetchTimerID = setTimeout(fetchTimeoutHandler, FetchTimeout);
  try {
	let response = await fetch(bnUrl, myInit); // A Response object
 
	// Interpret HTML response on the bookmark URL fetch from fetchFavicon, to find favicon
//console.log("response");
	// Remove fetch timeout
	clearTimeout(fetchTimerID);
	fetchTimerID = null;

//console.log("Status: "+response.status);
	// Some errors return a page with a favicon, when the site implements a proper error page
	//if (response.status == 200) { // If ok, get contents as a string
	  try {
		// Agauin, timeout on fetch
		fetchTimerID = setTimeout(fetchTimeoutHandler, FetchTimeout);
		let text = await response.text();
		// text is a USVString returned by Response.text()
//		text = htmldecode(text);
//console.log("Got text");
//console.log("Contents: "+text.substr(0,5000));
		let a_faviconUrl = retrieveFaviconUrl(text);
		let faviconUrl;

		if (a_faviconUrl != null) {
		  for (faviconUrl of a_faviconUrl) {
			if (faviconUrl.startsWith("data:")) { // Cool, it is already a self contained piece ..
//console.log("Got it directly !");
			  uri = faviconUrl;
			  break;
			}
			else {
			  if (!faviconUrl.startsWith("http")) { // Not an absolute URL, make it absolute
				let urlObj = new URL (response.url); // Use the URL of response in case
													 // we were redirected ..
				if (faviconUrl.startsWith("//")) { // Scheme (protocol, e.g. https:) relative URL
				  faviconUrl = urlObj.protocol + faviconUrl;
				}
				else if (faviconUrl.charAt(0) == '/') { // Root relative URL
				  // Verify if there is a <base href=..> tag
				  let baseUrl = retrieveBaseUrl(text);
//console.log("baseUrl 1: <<"+baseUrl+">>");
				  if ((baseUrl != null) && (baseUrl.includes("://"))) {
//					URL.revokeObjectURL(urlObj);
					urlObj = new URL (baseUrl);
				  }
				  faviconUrl = urlObj.origin + faviconUrl;
				}
				else { // Just relative URL ...
				  // Verify if there is a <base href=..> tag
				  let baseUrl = retrieveBaseUrl(text);
//console.log("baseUrl 2: <<"+baseUrl+">>");
				  if (baseUrl != null) {
					if (baseUrl.includes("://"))
					  faviconUrl = baseUrl + faviconUrl;
					else
					  faviconUrl = urlObj.origin + baseUrl + faviconUrl;
				  }
				  else {
					// Need to get back to closest '/' from end of path, removing all
					// ?xxx=yy and other stuff
					let temp = urlObj.origin + urlObj.pathname
					let pos = temp.lastIndexOf("/");
					faviconUrl = temp.slice(0, pos+1) + faviconUrl;
				  }
				}
//				URL.revokeObjectURL(urlObj);
				urlObj = undefined;
			  }
			  // We have an absolute URL
//console.log("faviconUrl 4: <<"+faviconUrl+">>");
			  uri = await getUri(faviconUrl, enableCookies);
			  if (uri != undefined) {
				break;
			  }
			}
		  }
		}

		if (uri == undefined) { // If not found, try the old root/favicon.ico method
		  let urlObj = new URL (response.url); // Use the URL of response in case
											   // we were redirected ..
		  faviconUrl = urlObj.origin + "/favicon.ico";
//console.log("faviconUrl 2: <<"+faviconUrl+">>");
//		  URL.revokeObjectURL(urlObj);
		  urlObj = undefined;
		  uri = await getUri(faviconUrl, enableCookies);
		}

		if (uri == undefined) {
		  console.log("Error could not get any favicon for: "+bnUrl);
		}
	  }
	  catch (err) {
		// Remove fetch timeout
		if (fetchTimerID != null) {
		  clearTimeout(fetchTimerID);
		  fetchTimerID = null;
		}
		let msg = "Error on getting favicon URL : "+err;
		console.log(msg);
		if (err != undefined) {
		  let fn = err.fileName;
		  if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
		  console.log("fileName:   "+fn);
		  console.log("lineNumber: "+err.lineNumber);
		}
	  }
/*
	}
	else {
	  let msg = "error: Looks like there was a page fetch problem. Status Code: "+response.status;
	  console.log(msg+" url: "+bnUrl);
	  console.log(response.statusText);
	  answerBack(BN, msg+"\r\n"
		             +"Full text: "+response.statusText);
	}
*/
  }
  catch (err) {
	// Remove fetch timeout
	if (fetchTimerID != null) {
	  clearTimeout(fetchTimerID);
	  fetchTimerID = null;
	}
	let msg = "Page fetch Error :-S "+err;
	console.log(msg, bnUrl);
	if (err != undefined) {
	  let fn = err.fileName;
	  if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
	  console.log("fileName:   "+fn);
	  console.log("lineNumber: "+err.lineNumber);
	}
  }

  return(uri);
}

/*
 * Dequeue a request and process it.
 * Then re-dispatch itself if more work, after <cadence> milliseconds delay
 */
async function handleRequest () {
  hysteresis = Cadence; // Hysteresis is a one shot only thing, for the first fetch of massive load,
  						// so now reset to default.
  let request = reqQueue[0]; // This is [action, BN, enableCookies], with:
  							 //
  							 // action = a string, either "get" or "icon:<url>"
  							 // bnId = Id of a BookmarkNode of type "bookmark"
  							 // bnUrl = url of page ("get" & "get2") or of favicon ("iconurl")
  							 // enableCookies = a Boolean to "omit" (false) or "include" (true)
  							 //   cookies info chen getting favicon. Drawback = user/pwd prompts
  							 //   on some sites.
  let action        = request[0];
  let bnId          = request[1];
  let bnUrl         = request[2];
  let enableCookies = request[3];
//console.log("Dequeued request action: "+action);
  if (bnId != undefined) { // Protect against too many redispatch events 
//console.log("Dequeued request action: "+action+" BN.id: "+bnId+" url: "+bnUrl+" remains: "+reqQueue.length);
	let uri;
	if (bnUrl.startsWith("ftp:")) {
	  uri = "/icons/ftpfavicon.png";
	}
	else if (action == "iconurl") { // We already got the favicon URL (e.g. tab refresh)
	  								// so simply get it.
//console.log("faviconUrl: <<"+action.slice(5)+">> 2");
	  // In case we get the icon directly, this is on updated tab .. let's not remove the previous favicon
	  // to leave a chance to detect this is the same and to not do massive favicon saves when doing
	  // History -> Restore previous session
	  //answerBack(bnId, "starting:"); // Signal we are starting to retrieve favicon for that BN
	  uri = await getUri(bnUrl, enableCookies); // async function !!
	}
	else { // Normal get process
	  answerBack(bnId, "starting:"); // Signal we are starting to retrieve favicon for that BN
	  // This requires the "<all_urls>" permission in manifest.json
	  // Get the page at bookmarked URL, following redirections,
	  // and attempt to retrieve the favicon URL

//console.log("Fetching: "+bnUrl);
	  uri = await fetchFavicon(bnUrl, enableCookies);
	}
	if (uri == undefined) {
	  answerBack(bnId, "error: could not get any valid favicon uri");
	}
	else {
	  answerBack(bnId, uri);
	}
  }
}

/*
 * Enqueue a request for processing, and trigger processing if needed.
 */
//Set up internal queueing for posted messages from main thread
//let nbBN = 0;
//let nbBNmin = 0;
//let nbBNmax = nbBNmin + 100;
function faviconWorkerPostMessage (e) { // e is of type MessageEvent,
  // and its data contains [action, bnId, bnUrl, enableCookies], with:
  //
  // action = a string, either "get", "get2", "iconurl", "hysteresis" or "nohysteresis"
  // bnId = Id of a BookmarkNode of type "bookmark"
  // bnUrl = url of page ("get" & "get2") or of favicon ("iconurl")
  // enableCookies = a Boolean to "omit" (false) or "include" (true)
  //   cookies info chen getting favicon. Drawback = user/pwd prompts
  //   on some sites when true.
  // Cannot use the browser.bookmarks interface from within the worker ...
  let data = e.data;
  let action = data[0];
  if (action == "hysteresis") { // Next shot due to a bookmark create or an initial massive load
								// request will wait for Hysteresis time before really starting.
//console.log("Hysteresis");
	hysteresis = Hysteresis;
  }
  else if (action == "nohysteresis") { // Remove the hysteresis now if nothing is scheduled,
									   // else it will be naturally reset when the handler runs
//console.log("Remove Hysteresis");
	if (requestTimerID == undefined) {
	  hysteresis = Cadence;
	}
  }
  else if (action == "stopfetching") { // Stop all process and empty the queue
	if (requestTimerID != undefined) { // A request is scheduled with Hysteresis
	  clearTimeout(requestTimerID);
	  requestTimerID = undefined; // It will get rescheduled on next request submitted
	}
	reqQueue.length = 0; // No more request
  }
  else {
	let url = data[1];
	if (action == "get2") { // If this is a manual refresh favicon request, or an existing bookmark,
	  						// put the request at front of the queue, and reset hysteresis to
	  						// normal Cadence value.
	  						// This will make it process immediately, or just after the current
	  						// ongoing one if there is.
//console.log("Manual triggered fetch");
	  if (hysteresis == Hysteresis) { // Reset hysteresis if there was one, we are accelerating
		hysteresis = Cadence;
		if (requestTimerID != undefined) { // A request is scheduled with Hysteresis
		  clearTimeout(requestTimerID);
		  requestTimerID = undefined; // It will get rescheduled a few lines below with the new Cadence
		}
	  }
	  reqQueue.unshift(data); // Add new request at beginning
	}
	else { // Not a manual refresh of favicon, queue at end
//	  if (((nbBN >= nbBNmin) && (nbBN < nbBNmax)) || e.data[0].startsWith("icon:") || e.data[0].startsWith("get2")) {
	  reqQueue.push(data); // Add new request at end
	}
	if (requestTimerID == undefined) { // No cadence process already running, start it
//console.log("There was no work in queue: "+reqQueue.length+" - dispatching");
	  requestTimerID = setTimeout(handleRequest, hysteresis);
	}
  }
//console.log("Finished queueing request "+action+" for BN.id: "+data[1]+" url: "+data[2]+" Queue length: "+reqQueue.length);
//  }
//  nbBN++;
}


/*
 * Main code:
 * ----------
*/
// Set up final structure for URI conversion
FReader.addEventListener("load", readerLoad);
FReader.addEventListener("abort", readerError);
FReader.addEventListener("error", readerError);

//onmessage = faviconWorkerPostMessage;