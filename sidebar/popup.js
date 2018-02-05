'use strict';

/*
 * Contents for bookmark properties / add popup
 */


/*
 * Constants
 */
const Body = document.querySelector("#body"); // Assuming it is an HTMLBodyElement
const TitleInput = document.querySelector("#title"); // Assuming it is an HTMLInputElement
const AddressLabel = document.querySelector("#addrlabel"); // Assuming it is an HTMLLabelElement
const AddressInput = document.querySelector("#address"); // Assuming it is an HTMLInputElement
const AckInput = document.querySelector("#ack"); // Assuming it is an HTMLInputElement
const CancelInput = document.querySelector("#cancel"); // Assuming it is an HTMLInputElement


/*
 *  Global variables
 */
var platformOs;
var myWindowId;
var myTab;
var myType; //String = type of window being open. This conditions button names and actions
            // Can be:	newbkmk
			//          newfldr
            //          propbkmk
			//			propfldr
var isPropPopup; // To signal if we are a properties popup, or a creation one
var isFolder; // To signal if we are on folder or a bookmark item
var btnId;
var btnTitle;
var btnUrl1;
var btnUrl2;
var btnUrl;

/*
 * Handle committed change to the title input
 */
function titleInputHandler () {
  // Modify title of the bookmark
  browser.bookmarks.update(
    btnId,
    {title: TitleInput.value	
    }
  );
}

/*
 * Handle updates to the address input
 */
function addressInputModifiedHandler () {
  // Modify state of the Ack button fonction of validity status
  if (AddressInput.validity.valid) {
	AckInput.disabled = false;
  }
  else {
	AckInput.disabled = true;
  }
}

/*
 * Handle committed change to the address input
 */
function addressInputHandler () {
  // Modify url of the bookmark if ok
  if (AddressInput.validity.valid) {
	AckInput.disabled = false;
    var value = AddressInput.value;
    if (value.length == 0)
	  value = "about:blank";
    browser.bookmarks.update(
      btnId,
      {url: value	
      }
    );
  }
  else {
	AckInput.disabled = true;
  }
}

/*
 * Handle click on Ack button
 */
function ackInputHandler () {
//  console.log("Ack clicked");
  btnId = undefined; // To avoid closeHandler to remove / update it ...

  // window.close() is not working, in spite of setting allowScriptsToClose: true
  // in browser.windows.create(), and of having a URL in "moz-extension:" !!
  // Firefox Bug ??
  // Have to resort to using the trick below ..
  var winId = browser.windows.WINDOW_ID_CURRENT;
  var removing = browser.windows.remove(winId);
//  window.close();
}

/*
 * Handle click on Cancel button
 */
function cancelInputHandler () {
//  console.log("Cancel clicked");
  if (isPropPopup) { // Cancel on properties = set back previous values, and then close
    browser.bookmarks.update(
      btnId,
      (isFolder ?
         {title: btnTitle
         }
        :
         {title: btnTitle,
          url: btnUrl	
         }
      )
    )
    .then(
      function () {
        btnId = undefined; // To avoid the closeHandler to redo the update ...

        // window.close() is not working, in spite of setting allowScriptsToClose: true
    	// in browser.windows.create(), and of having a URL in "moz-extension:" !!
    	// Firefox Bug ??
    	// Have to resort to using the trick below ..
    	var winId = browser.windows.WINDOW_ID_CURRENT;
    	var removing = browser.windows.remove(winId);
//    	  window.close();
      }
    );
  }
  else { // Delete the bookmark, then close
    browser.bookmarks.remove(btnId)
    .then(
      function () {
        btnId = undefined; // To avoid the closeHandler to redo the remove ...

        // window.close() is not working, in spite of setting allowScriptsToClose: true
        // in browser.windows.create(), and of having a URL in "moz-extension:" !!
        // Firefox Bug ??
        // Have to resort to using the trick below ..
     	  var winId = browser.windows.WINDOW_ID_CURRENT;
     	  var removing = browser.windows.remove(winId);
//        window.close();
      }
    );
  }
}

/*
 * Handle window close
 */
function closeHandler () {
//  console.log("Close clicked");
  // Note that this is unclean ... the promise to be returned by browser.bookmarks.update
  // or by ()browser.bookmarks.remove()
  // will never be able to be dispatched to something stil existing, therefore generating
  // an error message on the browser console.
  // Could do something complex by listening in the main code for the windows.onRemoved
  // event, and then compare with windowId we got at creation to retrieve the btnId and
  // then update/remove the bookmark .. but I guess I am lazy tonight .. that will be one
  // more junk message .. too bad for the console ..
  if (btnId != undefined) {
    if (isPropPopup) { // Set back previous values
      browser.bookmarks.update(
	    btnId,
	    (isFolder ?
	       {title: btnTitle
	       }
		 :
		   {title: btnTitle,
		    url: btnUrl	
		   }
		)
      );
    }
    else { // Delete the bookmark.
      browser.bookmarks.remove(btnId);
    }
  }
}

/*
 * Parse a received parameter
 * 
 * paramStr is of type String, with format "xxx=yyy"
 */
function paramParse (paramStr) {
  var splitPos = paramStr.indexOf("=");
  var param = paramStr.slice(0, splitPos);
  var value = decodeURI(paramStr.slice(splitPos+1));

  if (param == "type") {
	myType = value;
  }
  else if (param == "id") {
	btnId = value;
  }
  else if (param == "title") {
	btnTitle = value;
  }
  else if (param == "url") {
	btnUrl = value;
  }
}


/*
 * Main code:
 * ----------
*/
//Retrieve Platform
browser.runtime.getPlatformInfo().then(function(info){
  platformOs = info.os;

  // Get Id of the window we are running in
  //browser.windows.getCurrent(
  browser.windows.get(browser.windows.WINDOW_ID_CURRENT,
                      {populate: true	
                      }
                     )
  .then(
    (windowInfo) => {
      myWindowId = windowInfo.id;
      myTab = windowInfo.tabs[0];
      var myUrl = myTab.url; 
//      console.log("Id: "+windowInfo.id+" Window title: "+windowInfo.title+" Window type: "+windowInfo.type+" Tabs length: "+windowInfo.tabs.length);
//      console.log("Tab title: "+myTab.title+" Tab url: "+myUrl);

      // ----- Workaround for bug 1408446 in Linux (window contents is not painted ..) -----
      // Cf. https://bugzilla.mozilla.org/show_bug.cgi?id=1408446
      var wHeight = window.outerHeight;
      browser.windows.update(myWindowId, {height: wHeight+1});
      window.setTimeout(() => {browser.windows.update(myWindowId, {height: wHeight});
    	                      },
    	                0);
      // ----- End of bug workaround -----

      // Some variations depending on platform
      if (platformOs == "linux") {
        Body.style.fontSize = "12px";
        TitleInput.style.fontSize = "12px";
        AddressInput.style.fontSize = "12px";
        AckInput.style.fontSize = "12px";
        CancelInput.style.fontSize = "12px";
      }

      // Parse the url, it will give us our type of window, the BTN.id, BTN.title and BTN.url
      var paramsPos = myUrl.indexOf("?");

      // There should be 3 or 4 arguments, url should be the last and can itself contain "&"
      var paramStr;
      var endPos;
      for (let i=0 ; i<3 ; i++) {
        endPos = myUrl.indexOf("&", paramsPos+1);
        if (endPos == -1) { // Reached last param
          break;
        }
        paramStr = myUrl.slice(paramsPos+1, endPos);
        paramParse(paramStr);
        paramsPos = endPos;
      }
      // Get last param until end of string
      paramStr = myUrl.slice(paramsPos+1);
      paramParse(paramStr);
//      console.log("Type: "+myType+" BTN id: "+btnId+" title: "+btnTitle);
//      console.log("Url: "+btnUrl);
      
      // Adjust Window contents
      if (myType.startsWith("prop")) {
        isPropPopup = true;
        AckInput.value = "Save";
      }
      else {
        isPropPopup = false;
      }
      TitleInput.value = btnTitle;
      TitleInput.select();
      if (myType.endsWith("fldr")) { // No URL for folders
        isFolder = true;
        AddressLabel.hidden = true;
        AddressInput.hidden = true;
        AckInput.disabled = false;
      }
      else { // Bookmark popup, we have a URL
        isFolder = false;
        if (btnUrl != "about:blank") {
          AddressInput.value = btnUrl;
        }
        if (AddressInput.validity.valid) {
   		  AckInput.disabled = false;
        }
      }

      // Catch commited changes to each input box contents
      TitleInput.addEventListener("change", titleInputHandler);
      AddressInput.addEventListener("input", addressInputModifiedHandler);
      AddressInput.addEventListener("change", addressInputHandler);

      // Catch button clicks, and window close
      AckInput.addEventListener("click", ackInputHandler);
      CancelInput.addEventListener("click", cancelInputHandler);
      window.onclose = closeHandler; // Window close is like clicking Cancel button
      window.onbeforeunload = closeHandler; // Window close is like clicking Cancel button
    }
  );
});