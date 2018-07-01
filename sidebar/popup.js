'use strict';

//----- Workaround for top and left position parameters being ignored for panels -----
// Cf. https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/windows/create
//This is also used as workaround for bug 1408446 in Linux (window contents is not painted ..)
// Cf. https://bugzilla.mozilla.org/show_bug.cgi?id=1408446
// imposing to resize in order to draw contents - Apparently corrected FF in 59.x -
const PopupWidth  = 375;
const PopupHeight = 150;

let remembersizes_option;
let gettingItem = browser.storage.local.get(
  {popuptop_option: 300,
   popupleft_option: 300,
   remembersizes_option: false,
   popupheight_option: PopupHeight,
   popupwidth_option: PopupWidth
  }
);
gettingItem.then((res) => {
  let top = res.popuptop_option;
  let left = res.popupleft_option;
  remembersizes_option = res.remembersizes_option;
  let height;
  let width;
  if (remembersizes_option) {
    height = res.popupheight_option;
    width = res.popupwidth_option;
  }
  else {
    height = PopupHeight;
    width = PopupWidth;
  }
  browser.windows.update(browser.windows.WINDOW_ID_CURRENT,
                         {left: left,
	                      top: top,
	                      height: height,
	                      width: width
	                     }
                        );
});
//----- End of position ignored workaround -----

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
let platformOs;
let myWindowId;
let myTab;
let myType; //String = type of window being open. This conditions button names and actions
            // Can be:	newbkmk
			//          newfldr
            //          propbkmk
			//			propfldr
let isPropPopup; // To signal if we are a properties popup, or a creation one
let isFolder; // To signal if we are on folder or a bookmark item
let btnId;
let btnTitle;
let btnUrl1;
let btnUrl2;
let btnUrl;

/*
 * Receive event from keyboard anywhere in the popup
 * 
 * e is of type KeyboardEvent
 */
function keyHandler (e) {
  let target = e.target; // Type depends ..
//  console.log("Key event: "+e.type+" key: "+e.key+" char: "+e.char+" target: "+target);

  if (e.key == "Escape") {
	// Shortcut to exit popup
	e.stopImmediatePropagation();
	e.preventDefault();
	cancelInputHandler ();
  }
  else if (e.key == "Enter") {
	if (!AckInput.disabled) {
	  // Commit any change and close self
	  if (btnId != undefined) {
		if (isFolder) {
	      browser.bookmarks.update(
  	        btnId,
  	        {title: TitleInput.value,
  	        }
  	      );
		}
		else {
	      let value = AddressInput.value;
	      if (value.length == 0)
		    value = "about:blank";
	      browser.bookmarks.update(
	        btnId,
	        {title: TitleInput.value,
		     url: value	
	        }
	      );
	    }
	  }
	  ackInputHandler();
	}
  }
}

/*
 * Handle committed change to the title input
 */
function titleInputHandler () {
  // Modify title of the bookmark
  if (btnId != undefined) {
    browser.bookmarks.update(
      btnId,
      {title: TitleInput.value
      }
    );
  }
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
    let value = AddressInput.value;
    if (value.length == 0)
	  value = "about:blank";
    if (btnId != undefined) {
      browser.bookmarks.update(
        btnId,
        {url: value	
        }
      );
    }
  }
  else {
	AckInput.disabled = true;
  }
}

/*
 * Close window, remembering its position
 */
function closeSelf () {
  btnId = undefined; // To avoid closeHandler to remove / update it ...

/*	  console.log("wInfo.top: "+wInfo.top+" screenY: "+window.screenY);
	  console.log("calc top: "+(window.screen.top+window.screenY));
	  console.log("wInfo.left: "+wInfo.left+" screenX: "+window.screenX);
	  console.log("calc left: "+(window.screen.left+window.screenX));
*/
  // Get and remember our own position
  let top = window.screenY;
  let left = window.screenX;
/*  browser.windows.getCurrent()
  .then(
	function (wInfo) {
	  let top = wInfo.top;
	  let left = wInfo.left;
*/
      let saving;
	  if (remembersizes_option) {
		let height = window.outerHeight;
		let width = window.outerWidth;
		saving = browser.storage.local.set({
		  popuptop_option: top,
		  popupleft_option: left,
		  popupheight_option: height,
		  popupwidth_option: width
		});
	  }
      else {
        saving = browser.storage.local.set({
		  popuptop_option: top,
		  popupleft_option: left
		});
	  }
	  saving.then(
		function () {
	      // window.close() is not working, in spite of setting allowScriptsToClose: true
	      // in browser.windows.create(), and of having a URL in "moz-extension:" !!
	      // Firefox Bug ??
	      // Have to resort to using the trick below ..
	      let winId = browser.windows.WINDOW_ID_CURRENT;
	      browser.windows.remove(winId);
	    //  window.close();
		}
	  );
//	}
//  );
}

/*
 * Handle click on Ack button
 */
function ackInputHandler () {
//  console.log("Ack clicked");
  closeSelf();
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
        closeSelf();
      }
    );
  }
  else { // Delete the bookmark, then close
    browser.bookmarks.remove(btnId)
    .then(
      function () {
        closeSelf();
      }
    );
  }
}

/*
 * Handle window close
 */
function closeHandler (e) {
//  console.log("Close clicked: "+e.type);
  // Note that this is unclean ... the promise to be returned by browser.bookmarks.update
  // or by ()browser.bookmarks.remove()
  // will never be able to be dispatched to something stil existing, therefore generating
  // an error message on the browser console.
  // Could do something complex by listening in the main code for the windows.onRemoved
  // event, and then compare with windowId we got at creation to retrieve the btnId and
  // then update/remove the bookmark .. but I guess I am lazy tonight .. that will be one
  // more junk message .. too bad for the console ..
  if (btnId != undefined) {
    // Get and remember our own position (and size if option is activated)
	let top = window.screenY;
	let left = window.screenX;
	if (remembersizes_option) {
	  let height = window.outerHeight;
	  let width = window.outerWidth;
	  browser.storage.local.set({
	    popuptop_option: top,
	    popupleft_option: left,
	    popupheight_option: height,
	    popupwidth_option: width
	  });
//      console.log("Outer h,w: "+height+","+width);
	}
	else {
	  browser.storage.local.set({
	    popuptop_option: top,
	    popupleft_option: left
	  });
	}

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
  let splitPos = paramStr.indexOf("=");
  let param = paramStr.slice(0, splitPos);
  let value = decodeURI(paramStr.slice(splitPos+1));

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
      let myUrl = myTab.url; 
//      console.log("Id: "+windowInfo.id+" Window title: "+windowInfo.title+" Window type: "+windowInfo.type+" Tabs length: "+windowInfo.tabs.length);
//      console.log("Tab title: "+myTab.title+" Tab url: "+myUrl);

      // Some variations depending on platform
      if (platformOs == "win") {
    	let fontDflt = "fontdflt";
    	let fontWin = "fontwin";
    	Body.classList.replace(fontDflt, fontWin);
        TitleInput.classList.replace(fontDflt, fontWin);
        AddressInput.classList.replace(fontDflt, fontWin);
        AckInput.classList.replace(fontDflt, fontWin);
        CancelInput.classList.replace(fontDflt, fontWin);
      }
      else if (platformOs == "linux") {
      	let fontSize = "12px";
        Body.style.fontSize = fontSize;
        TitleInput.style.fontSize = fontSize;
        AddressInput.style.fontSize = fontSize;
        AckInput.style.fontSize = fontSize;
        CancelInput.style.fontSize = fontSize;
      }
      else if (platformOs == "mac") {
    	let fontSize = "12px";
        Body.style.fontSize = fontSize;
        TitleInput.style.fontSize = fontSize;
        AddressInput.style.fontSize = fontSize;
        AckInput.style.fontSize = fontSize;
        CancelInput.style.fontSize = fontSize;
      }

      // Parse the url, it will give us our type of window, the BTN.id, BTN.title and BTN.url
      let paramsPos = myUrl.indexOf("?");

      // There should be 3 or 4 arguments, url should be the last and can itself contain "&"
      let paramStr;
      let endPos;
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

      // General event handler for keyboard actions
      addEventListener("keydown", keyHandler, true);

      // Catch commited changes to each input box contents
      TitleInput.addEventListener("change", titleInputHandler);
      AddressInput.addEventListener("input", addressInputModifiedHandler);
      AddressInput.addEventListener("change", addressInputHandler);

      // Catch button clicks, and window close
      AckInput.addEventListener("click", ackInputHandler);
      CancelInput.addEventListener("click", cancelInputHandler);
      window.onbeforeunload = closeHandler; // Window close is like clicking Cancel button
//      window.onclose = closeHandler; // Window close is like clicking Cancel button
    }
  );
});