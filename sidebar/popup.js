'use strict';

//----- Workaround for top and left position parameters being ignored for panels and bug on popups (szince panel is an alis for popup) -----
// Cf. https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/windows/create
//     https://bugzilla.mozilla.org/show_bug.cgi?id=1271047
//This is also used as workaround for bug 1408446 in Linux (window contents is not painted ..)
// Cf. https://bugzilla.mozilla.org/show_bug.cgi?id=1408446
// imposing to resize in order to draw contents - Apparently corrected in FF 59.x -
const PopupWidth  = 380;
const PopupHeight = 190;

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
//console.log("popup.js entrance - remembersizes_option set - top="+top+" left="+left+" height="+height+" width="+width);
  }
  else {
	height = PopupHeight;
	width = PopupWidth;
//console.log("popup.js entrance - top="+top+" left="+left);
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
const PathLabel = document.querySelector("#path"); // Assuming it is an HTMLLabelElement
const TitleInput = document.querySelector("#title"); // Assuming it is an HTMLInputElement
const AddressLabel = document.querySelector("#addrlabel"); // Assuming it is an HTMLLabelElement
const AddressInput = document.querySelector("#address"); // Assuming it is an HTMLInputElement
const AckInput = document.querySelector("#ack"); // Assuming it is an HTMLInputElement
const CancelInput = document.querySelector("#cancel"); // Assuming it is an HTMLInputElement


/*
 *  Global variables
 */
let platformOs;
let isMacOS = false; // To indicate we are under MacOS, used for properly detecting the Cmd key
					 // which is Ctrl in Windows/Linux (Apple always want to do it their way, don't they ?)
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
let btnPath;
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
//let target = e.target; // Type depends ..
//console.log("Key event: "+e.type+" key: "+e.key+" char: "+e.char+" target: "+target);

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
 * Fire when there is a mouse wheel event
 * Used to disblae zooming with Ctrl+mouse wheel
 */
function onWheel (aEvent) {
  let is_ctrlKey;
  let is_metaKey;
  if (isMacOS) {
	is_ctrlKey = aEvent.metaKey;
	is_metaKey = aEvent.ctrlKey;
  }
  else {
	is_ctrlKey = aEvent.ctrlKey;
	is_metaKey = aEvent.metaKey;
  }
  if (is_ctrlKey && !aEvent.altKey && !is_metaKey && !aEvent.shiftKey) {
	aEvent.preventDefault();
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

  // Get the CSS pixel ratio
  // Note 1: window.windowUtils does not work ...
  // Note 2: not reliable ! Is impacted by both the system DPI and the window zoom factor,
  //         however window.screenX and screenY are only impacted by the window zoom factor :-(
  //         => Need to rely on browser.windows.getCurrent() instead, which is all in pixels
//let pixelsPerCSS = window.devicePixelRatio;
//console.log("closeSelf() - window.devicePixelRatio="+pixelsPerCSS);

  // Get and remember our own position, converting to real pixels
//  let top = Math.floor(window.screenY * pixelsPerCSS);
//  let left = Math.floor(window.screenX * pixelsPerCSS);
  browser.windows.getCurrent()
  .then(
	function (wInfo) {
//console.log("closeSelf() - window.devicePixelRatio="+window.devicePixelRatio);
//console.log("closeSelf() - wInfo.top: "+wInfo.top+" screenY: "+window.screenY);
//console.log("closeSelf() - calc top: "+(window.screen.top+window.screenY));
//console.log("closeSelf() - wInfo.left: "+wInfo.left+" screenX: "+window.screenX);
//console.log("closeSelf() - calc left: "+(window.screen.left+window.screenX));
	  let top = wInfo.top;
	  let left = wInfo.left;

	  let saving;
	  if (remembersizes_option) {
//		let height = Math.floor(window.outerHeight*pixelsPerCSS);
//		let width = Math.floor(window.outerWidth*pixelsPerCSS);
		let height = wInfo.height;
		let width = wInfo.width;
		saving = browser.storage.local.set({
		  popuptop_option: top,
		  popupleft_option: left,
		  popupheight_option: height,
		  popupwidth_option: width
		});
//console.log("closeSelf() - remembersizes_option set - top="+top+" left="+left+" height="+height+" width="+width);
	  }
	  else {
		saving = browser.storage.local.set({
		  popuptop_option: top,
		  popupleft_option: left
		});
//console.log("closeSelf() - top="+top+" left="+left);
	  }

/*
browser.windows.getCurrent()
.then(
  function (wInfo) {
	let top1 = wInfo.top;
	let left1 = wInfo.left;
	let height1 = wInfo.height;
	let width1 = wInfo.width;
console.log("closeSelf() - browser.windows.getCurrent wInfo - top="+top1+" left="+left1+" height="+height1+" width="+width1);
  }
);
*/

	  saving.then(
		function () {
		  // window.close() is not working, in spite of setting allowScriptsToClose: true
		  // in browser.windows.create(), and of having a URL in "moz-extension:" !!
		  // Firefox Bug ??
		  // Have to resort to using the trick below ..
		  let winId = browser.windows.WINDOW_ID_CURRENT;
		  browser.windows.remove(winId);
		  //window.close();
		}
	  );
	}
  );
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
 	// Proceed like native bookmark FF = no undo / redo on such "cancel" => do not use BSP2 trash
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
//console.log("Close clicked: "+e.type);
  // Note that this is unclean ... the promise to be returned by browser.bookmarks.update
  // or by browser.bookmarks.remove()
  // will never be able to be dispatched to something stil existing, therefore generating
  // an error message on the browser console.
  // Could do something complex by listening in the main code for the windows.onRemoved
  // event, and then compare with windowId we got at creation to retrieve the btnId and
  // then update/remove the bookmark .. but I guess I am lazy tonight .. that will be one
  // more junk message .. too bad for the console ..
  if (btnId != undefined) {
	// Get the CSS pixel ratio
	// Note 1: window.windowUtils does not work ...
	// Note 2: not reliable ! Is impacted by both the system DPI and the window zoom factor,
	//         however window.screenX and screenY are only impacted by the window zoom factor :-(
	//         => Need to rely on browser.windows.getCurrent() instead, which is all in pixels
//let pixelsPerCSS = window.devicePixelRatio;
//console.log("closeHandler() - window.devicePixelRatio="+pixelsPerCSS);

	// Get and remember our own position (and size if option is activated), converting to real pixels
//	let top = Math.floor(window.screenY * pixelsPerCSS);
//	let left = Math.floor(window.screenX * pixelsPerCSS);
	browser.windows.getCurrent()
	.then(
	  function (wInfo) {
//console.log("closeHandler() - window.devicePixelRatio="+window.devicePixelRatio);
//console.log("closeHandler() - wInfo.top: "+wInfo.top+" screenY: "+window.screenY);
//console.log("closeHandler() - calc top: "+(window.screen.top+window.screenY));
//console.log("closeHandler() - wInfo.left: "+wInfo.left+" screenX: "+window.screenX);
//console.log("closeHandler() - calc left: "+(window.screen.left+window.screenX));
		let top = wInfo.top;
		let left = wInfo.left;
		if (remembersizes_option) {
//		  let height = Math.floor(window.outerHeight*pixelsPerCSS);
//		  let width = Math.floor(window.outerWidth*pixelsPerCSS);
		  let height = wInfo.height;
		  let width = wInfo.width;
		  browser.storage.local.set({
			popuptop_option: top,
			popupleft_option: left,
			popupheight_option: height,
			popupwidth_option: width
		  });
//console.log("closeHandler() - remembersizes_option set - top="+top+" left="+left+" height="+height+" width="+width);
		}
		else {
		  browser.storage.local.set({
			popuptop_option: top,
			popupleft_option: left
		  });
//console.log("closeHandler() - top="+top+" left="+left);
		}

/*
browser.windows.getCurrent()
.then(
  function (wInfo) {
	let top1 = wInfo.top;
	let left1 = wInfo.left;
	let height1 = wInfo.height;
	let width1 = wInfo.width;
console.log("closeHandler() - browser.windows.getCurrent wInfo - top="+top1+" left="+left1+" height="+height1+" width="+width1);
  }
);
*/
	  }
	);

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
	else { // Delete the bookmark
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
  else if (param == "path") {
	btnPath = decodeURIComponent(value);
  }
  else if (param == "title") {
	btnTitle = decodeURIComponent(value);
  }
  else if (param == "url") {
	btnUrl = decodeURIComponent(value);
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
//console.log("Id: "+windowInfo.id+" Window title: "+windowInfo.title+" Window type: "+windowInfo.type+" Tabs length: "+windowInfo.tabs.length);
//console.log("Tab title: "+myTab.title+" Tab url: "+myUrl);

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
		isMacOS = true;
		let fontSize = "12px";
		Body.style.fontSize = fontSize;
		TitleInput.style.fontSize = fontSize;
		AddressInput.style.fontSize = fontSize;
		AckInput.style.fontSize = fontSize;
		CancelInput.style.fontSize = fontSize;
	  }

	  // Parse the url, it will give us our type of window, the BTN.id, BTN.title and BTN.url
	  let paramsPos = myUrl.indexOf("?");

	  // There should be 5 arguments, url should be the last and can itself contain "&"
	  let paramStr;
	  let endPos;
	  for (let i=0 ; i<4 ; i++) {
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
//console.log("Type: "+myType+" BTN id: "+btnId+" title: "+btnTitle);
//console.log("Url: "+btnUrl);

	  // Adjust Window contents
	  if (myType.startsWith("prop")) {
		isPropPopup = true;
		AckInput.value = "Save";
	  }
	  else {
		isPropPopup = false;
	  }
	  PathLabel.textContent = btnPath;
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

	  // General event handler for keyboard or mouse actions
	  addEventListener("keydown", keyHandler, true);
	  addEventListener('wheel', onWheel, {capture: true, passive: false}); // To disable zooming

	  // Catch commited changes to each input box contents
	  TitleInput.addEventListener("change", titleInputHandler);
	  AddressInput.addEventListener("input", addressInputModifiedHandler);
	  AddressInput.addEventListener("change", addressInputHandler);

	  // Catch button clicks, and window close
	  AckInput.addEventListener("click", ackInputHandler);
	  CancelInput.addEventListener("click", cancelInputHandler);
	  window.onbeforeunload = closeHandler; // Window close is like clicking Cancel button
//	  window.onclose = closeHandler; // Window close is like clicking Cancel button
	}
  );
});