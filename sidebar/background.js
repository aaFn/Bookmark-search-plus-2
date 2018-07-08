'use strict';


/*
 * Constants
 */
const Navigator = window.navigator; // Get version of navigator to detect unavailable features between FF 54 and FF 56
const BuildID = Navigator.buildID; // BuildID: 20100101 means that we have the websites.resistFingerprinting setting
                                   // set .. see https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/privacy/websites
                                   // This can happen when the Privacy Settings add-on is used for example ..
                                   // See https://addons.mozilla.org/fr/firefox/addon/privacy-settings/ .. good news, this
                                   //   add-on requires FF 57 minimum, and that particular setting exist only since FF 58,
                                   //   so we cannot have it on FF 56 and it means BeforeFF57 must be false.
//console.log("BuildID: "+BuildID);
const BeforeFF57 = ((BuildID != "20100101") && (BuildID < "20171112125346"));
//console.log("BeforeFF57: "+BeforeFF57);
const SaveMinHysteresis = 2000; // Space saves to lower memory consumption
const SaveMaxHysteresis = 20000; // Space saves to lower memory consumption
const SidebarScanInterval = 1000; // Every 1 s
//Declared in libstore.js
//const VersionImg16 = "-img16"; // Signal that all favicons are in 16x16 format
//const VersionBNList = "-bnlist"; // Signal that we are in BookmarkNode tree format
const CvtCanvas = document.createElement('canvas'); // For image conversion to 16 x 16
CvtCanvas.height = 16;
CvtCanvas.width = 16;
const CvtCtx = CvtCanvas.getContext("2d");
//const Ctx = Canvas.getContext("bitmaprenderer");
//CvtCtx.fillStyle = "white";
CvtCtx.imageSmoothingEnabled = false;
CvtCtx.imageSmoothingQuality = "high";
const CvtImage = new Image(16, 16);
CvtImage.onload = convertOnLoad;
CvtImage.onerror = errorCvtOnLoad;
const CvtCanvas2 = document.createElement('canvas'); // For loading a favicon to downscale
const CvtCtx2 = CvtCanvas2.getContext("2d");
const CvtImageData = CvtCtx.createImageData(16, 16);
const CvtIDData = CvtImageData.data;


/*
 * Global variables, seen by foreground instances (var)
 */
var ready = false; // Set to true when background initialization is done
var platformOs;
//Declared in BookmarkNode.js
//var countBookmarks = 0, countFolders = 0, countSeparators = 0, countOddities = 0;
var loadDuration, treeLoadDuration, treeBuildDuration, saveDuration;
var curBNList = {}; // Current list of BookmarkNode - Saved in storage at each modification
var bypassedFFAPI = false;
var rootBN; // Type is BookmarkNode. This is curBNList[0]


/*
 * Global variables, private to background (let)
 */
let justInstalled; // Signal if we were just installed or this is an update
let isSidebarOpen = {};			// Track state of open sidebars
let privateSidebarsList = {};	// Track private windows sidebars
let sidebarScanIntervalId = undefined; // To scan open private sidebars ...
//let faviconWorker; // For background retrieval of favicons
let migr16x16Open = true; // Set to false on the first signalMigrate16x16() received
let migration_bnlist = false;
let startTime, endLoadTime, endTreeLoadTime, endTreeBuildTime, endSaveTime;


/*
 * Objects
 */


/*
 * Functions
 * ---------
 */

/*
 * Trace when needed ...
 * 
 * text = string to trace
 * force (optional) = if true, force putting trace in box even if not activated (for later display)
 */
function trace (text, force = false) {
  if (traceEnabled_option || force) {
    console.log(text+"\r\n");
  }
}

/*
 * Trace a bookmark item
 * 
 * BTN = BookmarkTreeNode
 */
function traceBTN (BTN) {
  trace("  "+Object.keys(BTN));
  trace("  "+Object.values(BTN));
  trace("---------------------");
}

/*
 * Save curBNList (serialized) including full tree structure at entry 0
 * Includes an hysteresis mechanism to space saves when they are frequent
 *   (typically during favicon fetching).
 * Returns a promise to signal save completion
 */
let saving = false;
let saveQueued = false;
let saveHysteresis = SaveMinHysteresis;
let lastSaveCallTime = undefined;
function recallSaveBNList () {
  setTimeout(
  function () {
    saving = false; // Clear flag, we're not busy anymore
    if (saveQueued) { // Something more to save, so save now
      saveQueued = false;
      saveBNList();
    }
  }
  , saveHysteresis);
}

const saveObject0 = {savedBNList: undefined, fTime: undefined};
const saveObject1 = {savedBNListBak: undefined, fTimeBak: undefined};
let fIndex = 0;
const saveFIndex = {fIndex: fIndex};
function saveBNList () {
//  trace("saveBNList");
//  let t1 = new Date();

  // Recalculate hysteresis in function of call frequency
  let curDate = new Date ();
  let curTime = curDate.getTime();
  if (lastSaveCallTime == undefined) {
	lastSaveCallTime = curTime;
  }
  else {
    let delay = curTime - lastSaveCallTime; // In ms
	if (delay < 2000) { // Doing favicon fetching, increase to maximum
	  saveHysteresis = SaveMaxHysteresis; 
	}
	else { // Reset to minimum
  	  saveHysteresis = SaveMinHysteresis; 
	}
	lastSaveCallTime = curTime;
  }

  // Execute or register save request for later
  let p = new Promise (
    (resolve, reject) => {
      if (!saving) { // Avoid doing too many saves at same time.
        saving = true;
        try {
          let saveObj;
//          if (delayLoad_option && (savedBNList != undefined)) { // Merge both list when saving to
//                                                                // keep what was not yet verified
//            saveObj = Object.assign({}, savedBNList, curBNList);
//          }
//          else {
          saveObj = curBNList;
//          }
          let json = BN_serialize(saveObj[0]);
          saveObj = undefined; // Free pointer on object
//console.log("json.length = "+json.length);
//recallSaveBNList();
//resolve();

          let saveObject;
          if (!enableFlipFlop_option || (fIndex == 0)) {
        	saveObject = saveObject0;
        	saveObject0.savedBNList = json;
        	saveObject0.fTime = curTime;
//        	console.log("savedBNList");
          }
          else {
          	saveObject = saveObject1;
  		    saveObject1.savedBNListBak = json;
        	saveObject1.fTimeBak = curTime;
//        	console.log("savedBNListBak");
          }
          json = undefined; // Free pointer on string
          browser.storage.local.set(saveObject)
          .then(
            function () { // Save finished
              //trace("Saved curBNList");
// 	            let t2 = new Date ();
//              trace("End of saveBNList. Delay = "+(t2.getTime() - t1.getTime())+" ms", true);
              // Record last slot which was saved
              saveFIndex.fIndex = fIndex;
              browser.storage.local.set(saveFIndex)
              .then(
                function () {
//                  console.log("saveFIndex: "+fIndex);
                  if (enableFlipFlop_option) { // Go to other slot on next save
                    fIndex = 1 - fIndex;
                  }
                }
              );
              // Introduce an hysteresis before clearing flags
              // and triggering another save.
              recallSaveBNList();
              resolve(); // Send promise for anybody waiting ..
            }
          )
          .catch ( // Asynchronous also, like .then
            function (err) {
        	  let msg = "saveBNList() error when writing to local storage: "+err;
              trace(msg, true);
              console.log(msg);
              recallSaveBNList();
              reject();
            }
          );

          // Free json string and time
		  delete saveObject0.savedBNList;
      	  delete saveObject0.fTime;
		  delete saveObject1.savedBNListBak;
      	  delete saveObject1.fTimeBak;
        } catch (error) { // Most probably out of memory error
        	              // Calm down, stop the save chain
          console.log("saveBNList() error: "+error);

          // Clear flags, we're not busy anymore
          saving = false;
          saveQueued = false;
          reject();

          // Stop and restart the favicon worker so that refresh favicon remains operational
          // (often, the worker gets "killed" by the out of memory situation)
/*
          faviconWorker.terminate();
          faviconWorker = new Worker("favicon.js");
          faviconWorker.onmessage = asyncFavicon;
          faviconWorker.onerror = errorFavicon;
          faviconWorker.onmessageerror = msgerrorFavicon;
*/
        }
      }
      else { // Already saving .. queue and do only once later when ongoing one 
             // + hysteresis is finished
        saveQueued = true;
        resolve(); // Send promise for anybody waiting ..
      }
    }
  );

  return(p); // Return promise
}

/*
 * Called by a sidebar when opening
 */
function newSidebar (windowId) {
//  console.log("Background received newSidebar notification from "+windowId);
  isSidebarOpen[windowId] = true;
}

/*
 * Called by a sidebar when closing
 */
function closeSidebar (windowId) {
//  console.log("Background received closeSidebar notification from "+windowId);
  delete isSidebarOpen[windowId];
}

/*
 * Verify if private window sidebars are still open. If not, update scanSidebars status
 */
function scanSidebars () {
  for (let i in privateSidebarsList) {
	let windowId = privateSidebarsList[i];
//    console.log("Scanning "+windowId);
	browser.sidebarAction.isOpen(
	  {windowId: windowId}
	).then(
	  function (open) {
//        console.log(windowId+" is "+open);
		if (!open) { // Remove from lists of open sidebars
//          console.log("Deleting "+windowId);
		  delete privateSidebarsList[windowId];
		  delete isSidebarOpen[windowId];
		  if (privateSidebarsList.length == 0) {
			clearInterval(sidebarScanIntervalId);
			sidebarScanIntervalId = undefined;
		  }
		}
	  }
	).catch( // Asynchronous also, like .then
	  function (err) {
	    // window doesn't exist anymore
//        console.log("Error name: "+err.name+" Error message: "+err.message);
		if (err.message.includes("Invalid window ID")) {
//          console.log("Window doesn't exist anymore, deleting it: "+windowId);
		  delete privateSidebarsList[windowId];
		  delete isSidebarOpen[windowId];
		}
	  }
	);
  }
}

/*
 * Handle responses or errors when talking with sidebars
 */
function handleMsgResponse (message) {
  // Is always called, even is destination didn't specifically reply (then message is undefined)
//  console.log("Sidebar sent a response: <<"+message.content+">> received in background");
}

function handleMsgError (error) {
  // Do not log communication error generated when there is no sidebar to receive
  if (!error.message.startsWith("Could not establish connection. Receiving end does not exist.")) {
    console.log("Error: "+error);
  }
}

/*
 * Send msg to sidebars
 */
function sendAddonMessage (msg) {
  browser.runtime.sendMessage(
	{source: "background",
	 content: msg
	}
  ).then(handleMsgResponse, handleMsgError);
}

/*
 * Send asyncFavicon msg to sidebars
 * 
 * bnId = String, id of bookmark
 * uri = String, uri of image
 */
function sendAddonMsgFavicon (bnId, uri) {
  browser.runtime.sendMessage(
	{source: "background",
	 content: "asyncFavicon",
	 bnId: bnId,
	 uri: uri
	}
  ).then(handleMsgResponse, handleMsgError);
}

/*
 * Send a complex message to sidebars
 * 
 * msg = an object {source: "background",
 *                  content: "<cmd_string>",
 *                  + other <field: value> pairs comma separated
 *                 }
 */
function sendAddonMsgComplex (msg) {
  browser.runtime.sendMessage(msg)
  .then(handleMsgResponse, handleMsgError);
}

/*
 * Get and handle messages from sidebar scripts
 */
function handleAddonMessage (request, sender, sendResponse) {
  try{ // Use a try catch structure, as any exception will be caught as an error response to calling part
	// When coming from background:
	//   sender.url: moz-extension://28a2a188-53d6-4f91-8974-07cd0d612f9e/_generated_background_page.html
	// When coming from sidebar:
	//   sender.url: moz-extension://28a2a188-53d6-4f91-8974-07cd0d612f9e/sidebar/panel.html
	let msg = request.content;
//	console.log("Got message <<"+msg+">> from "+request.source+" in background");
//    console.log("  sender.tab: "+sender.tab);
//    console.log("  sender.frameId: "+sender.frameId);
//    console.log("  sender.id: "+sender.id);
//    console.log("  sender.url: "+sender.url);
//    console.log("  sender.tlsChannelId: "+sender.tlsChannelId);

	if (msg.startsWith("New:")) { // New private window sidebar opening - Register it
	  let windowId = parseInt(msg.slice(4), 10);
	  privateSidebarsList[windowId] = windowId;
	  newSidebar(windowId);
	  // Start private windows sidebar tracking, except if FF56 as we cannot track sidebar status in that version
	  if ((sidebarScanIntervalId == undefined) && !BeforeFF57) {
		sidebarScanIntervalId = setInterval(scanSidebars, SidebarScanInterval);
	  }
	}
	else if (msg.startsWith("Close:")) { // Private window closing - De-register it
	                                     // In fact, this message never comes :-(
	                                     // So have to poll such pages ...
	  let windowId = parseInt(msg.slice(6), 10);
	  closeSidebar(windowId);
	}
	else if (msg.startsWith("savedOptions")) { // Option page changed something to options, reload them
	  // Look at what changed
	  let disableFavicons_option_old = disableFavicons_option;
	  let enableCookies_option_old = enableCookies_option;
	  let enableFlipFlop_option_old = enableFlipFlop_option;
	  let advancedClick_option_old = advancedClick_option;
	  let closeSearch_option_old = closeSearch_option;
	  let openTree_option_old = openTree_option;
	  let rememberSizes_option_old = rememberSizes_option;
	  let traceEnabled_option_old = traceEnabled_option;
	  refreshOptionsLStore()
	  .then(
		function () {
		  if (disableFavicons_option_old != disableFavicons_option) {
			// Rescan tree to either clear favicons or trigger fetching them, and save it
			scanBNTree(rootBN, faviconWorkerPostMessage);
			saveBNList();

			// Change to DFF requires a full reload of all sidebars
			sendAddonMessage("reload");
		  }
		  else if ((enableCookies_option_old != enableCookies_option)
			       || (enableFlipFlop_option_old != enableFlipFlop_option)
			       || (advancedClick_option_old != advancedClick_option)
			       || (closeSearch_option_old != closeSearch_option)
			       || (openTree_option_old != openTree_option)
			       || (traceEnabled_option_old != traceEnabled_option)
			      ) { // Those options only require a re-read and some minor actions
			sendAddonMessage("savedOptions");
		  }
		}
	  );
	}
	else if (msg.startsWith("reloadFFAPI")) { // Option page "Reload tree from FF API" button was pressed
	  endLoadTime = new Date();
	  savedBNList = curBNList;
	  faviconWorkerPostMessage({data: ["hysteresis"]});
	  browser.bookmarks.getTree().then(storeAndConvertTree, onRejected);
	}
	else if (msg.startsWith("resetSizes")) { // Option page reset sizes button was pressed
	  // Relay to sidebars
	  sendAddonMessage("resetSizes");
	}
	else if (msg.startsWith("resetMigr16x16")) { // Option page "Reset 16x16 migration" button was pressed
	  // Remove the VersionImg16 flag from structureVersion
	  let pos = structureVersion.indexOf(VersionImg16);
	  if (pos != -1) { // Remove the flag
		structureVersion = structureVersion.slice(0, pos)
		                   + structureVersion.slice(pos + VersionImg16.length);
		migr16x16Open = true; // Reset to allow next migration signal to work
		// Do not send any signal to add-ons. Migration is triggered when loading a new sidebar and displaying
	  }
	}
	else if (msg.startsWith("signalMigrate16x16")) { // A private window sidebar sent a list of favicons to migrate
	  signalMigrate16x16(request.list, request.len);
	}
	else if (msg.startsWith("getFavicon")) { // A private window sidebar asks us to fetch / refresh a favicon
	  faviconWorkerPostMessage({data: request.postMsg});
	}
 
	// Answer
	if (msg.startsWith("getCurBNList")) {
	  let json = BN_serialize(curBNList[0]);
	  sendResponse(
		{content: "getCurBNList",
	     json: json		
		}
	  );
	  json = undefined;
	}
	else if (ready && msg.startsWith("getBackground")) { // Asked to resend ready message .. if we are ready
	  sendResponse(
	    {content: "Ready"		
	    }
	  );
	}
	else {
	  sendResponse(
	    {content: "Background response to "+request.source		
	    }
	  );
	}
  }
  catch (error) {
	console.log("Error processing message: "+request.content);
	console.log("message:    "+error.message);
	console.log("lineNumber: "+error.lineNumber);
//	console.log("   keys: "+Object.keys(error));
//	console.log("   values: "+Object.values(error));
  }
}

/*
 * Called by browser action button click (if enabled)
 * tab: a tabs.Tab indicating the tab that was active when the icon was clicked
 */
function buttonClicked (tab) {
//  console.log("Background received button click");
  let windowId = tab.windowId;
  // Can't use browser.sidebarAction.isOpen() here, as this is waiting for a Promise,
  // and so when it arrives we are not anymore in the code flow of a user action, so
  // the browser.sidebarAction.close() and browser.sidebarAction.open() are not working :-(
  // => Have to track state through other mechanisms to not rely on Promises ...
  if (isSidebarOpen[windowId] == true) {
//    console.log("Sidebar is open. Closing.");
    browser.sidebarAction.close();
  }
  else {
//    console.log("Sidebar is closed. Opening.");
    browser.sidebarAction.open();
  }
}

/*
 * Detect whether we were just installed, or if this is an update
 */
// Create a Promise to be wait on and resolved outside of it by the Install handler
// The resolve() call should hold an isInstalled boolean, reflecting global justInstalled
let gis_resolve;
let getInstallStatusTimerID;
let getInstallStatus = new Promise (
  (resolve, reject) => {
	// Externalise the resolve function
	gis_resolve = resolve;
  }
);
function handleInstall (details) {
  console.log("Install event reason: "+details.reason+" Temporary: "+details.temporary);
  if (details.reason == "install") {
	justInstalled = true;
  }
  else {
	justInstalled = false;
  }
  gis_resolve(justInstalled);
}

/*
 * Convert and store image in 16x16, triggered by end of CvtImage.src load
 * 
 * Uses global variables cvtUri, convertedUri, destCvtImg and destCvtBnId
 */
let cvtUri;
let convertedUri;
let destCvtBnId;
function convertOnLoad () {
  let nh = CvtImage.naturalHeight;
  let nw = CvtImage.naturalWidth;
//  console.log("  nh,nw: "+nh+","+nw);
  if ((nh > 0) && (nw > 0) && ((nh != 16) || (nw != 16))) {
    try {
	  if ((nh > 16) && (nw > 16)) { // Only downscaling .. avoid FF canvas native algo, not really good
//        console.log("  downscale");
        // Get ImageData.data of the image
        let srcIDData;
	    CvtCanvas2.height = nh;
	    CvtCanvas2.width = nw;
	    CvtCtx2.drawImage(CvtImage, 0, 0);
	    srcIDData = CvtCtx2.getImageData(0, 0, nw, nh).data;

	    // Downscale into CvtImageData
        downscaleImg(srcIDData, CvtIDData, nh, nw);

	    // Put CvtImage into CvtCtx and get base64 uri
	    CvtCtx.putImageData(CvtImageData, 0, 0);
        convertedUri = CvtCanvas.toDataURL();
//        console.log("  convertedUri: "+convertedUri);
	  }
	  else {
	    //Ctx.fillRect(0, 0, 16, 16);
	    CvtCtx.clearRect(0, 0, 16, 16);
	    CvtCtx.drawImage(CvtImage, 0, 0, 16, 16);
	    //Ctx.drawImage(CvtImage, 0, 0);
        convertedUri = CvtCanvas.toDataURL();

/*
	    createImageBitmap(CvtImage)
	    .then(
		  function (imageBitmap) {
console.log("imageBitmap: "+imageBitmap.height+","+imageBitmap.width);
		    CvtCtx.transferFromImageBitmap(imageBitmap);
		    imageBitmap.close();

		    let convertedUri = CvtCanvas.toDataURL();
console.log("convertedUri: "+convertedUri);
		  }
	    );
*/
	  }
    }
	catch (error) { // Error on rescale, keep original
	  let title = curBNList[destCvtBnId].title;
	  console.log("convertOnLoad error: "+error.type+" for "+cvtUri+" - "+destCvtBnId+" - "+title);
	  convertedUri = cvtUri;
	}
  }
  else { // Cannot rescale or no need to, keep original
//    console.log("No rescale: "+nh+","+nw+" for "+CvtImage.src.substr(0,50)+" - "+destCvtBnId);
	convertedUri = cvtUri;
  }

  // Save new favicon
  curBNList[destCvtBnId].faviconUri = convertedUri;
  saveBNList();

  // Signal to sidebars
  sendAddonMsgFavicon(destCvtBnId, convertedUri);
}

/*
 * Set favicon on bookmark after migrating to 16x16
 */
function setFavicon (bnId, uri) {
  destCvtBnId = bnId; // Remember it for 16x16 processing to come
//  trace("BN.id: "+bnId+" index: "+row.rowIndex+" Row id: "+row.dataset.id);
//  console.log("setFavicon for: "+bnId+" uri: "+uri);

  // Special handling for x-icons, which are libraries of icons, not well handded
  // by Canvas 2d context drawImage(), since it takes only the first icon in the librrary.
  // Verify if this is an x-icon by header .. because the mime type is not always reliable !!
  cvtUri = selectXIconImg(uri);
  if (cvtUri != null) { // It is an x-ixon and there was more than 1, go with selected image
//    console.log("  go with selected uri: "+cvtUri);
	CvtImage.src = cvtUri;
  }
  else {
	CvtImage.src = cvtUri = uri;
  }
/*
  let data = '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px">' +
             '<foreignObject width="100%" height="100%">' +
             '<img xmlns="http://www.w3.org/1999/xhtml" src="'+uri+'" height="16px" width="16px"/>' +
             '</foreignObject>' +
             '</svg>';
console.log("data: "+data);
  data = encodeURIComponent(data);
  CvtImage.src = "data:image/svg+xml," + data;
*/
}

/*
 * Set Favicon on screen to waiting its new value
 *
 * bnId is BookmarktreeNode id string
 */
function setWaitingFavicon (bnId) {
  let uri = "/icons/waiting.gif";
//  trace("BN.id: "+BN.id+" index: "+row.rowIndex+" Row id: "+row.dataset.id+" set to waiting");

  // Keep waiting image in memory only, do not save (it has the temporary one on disk anyway)
  curBNList[bnId].faviconUri = uri;

  // Signal to sidebars
  sendAddonMsgFavicon(bnId, uri);
}

/*
 * Set Favicon on screen to nofavicon.png
 *
 * bnId is BookmarktreeNode id string
 */
function setNoFavicon (bnId) {
  let uri = "/icons/nofavicon.png";
//  trace("BN.id: "+bnId+" index: "+row.rowIndex+" Row id: "+row.dataset.id+" uri: "+uri);

  // Save new icon
  curBNList[bnId].faviconUri = uri;
  saveBNList();

  // Signal to sidebars
  sendAddonMsgFavicon(bnId, uri);
}

/*
 * Error on loading the image to convert, triggered by error when loading CvtImage.src
 * 
 * Uses global variable destCvtBnId
 */
function errorCvtOnLoad (error) {
  let title = curBNList[destCvtBnId].title;
  console.log("error: "+error.type+" for "+cvtUri+" - "+destCvtBnId+" - "+title);
  setNoFavicon(destCvtBnId);
}

/*
 * Favicon background retrieval process
 *
 * e is of type MessageEvent, containing a [bnId, uri]
 */
function asyncFavicon (e) {
  let bnId = e.data[0]; // Id of BookmarkNode
  let uri = e.data[1]; // String
  let BN = curBNList[bnId]; 
//  trace("Async uri received for BN.id: "+BN.id+" url: "+BN.url+" uri: <<"+uri.substr(0,50)+">>");

  // Refresh display of the icon, and save it
  if (uri.startsWith("error:")) { // Got an error ... trace it
    trace("Error on getting favicon for "+bnId+":\r\n"
          +"title: "+BN.title+"\r\n"
          +"url:   "+BN.url+"\r\n"
          +uri+"\r\n"
          +"--------------------");
    setNoFavicon(bnId);
  }
  else if (uri.startsWith("starting:")) { // We started retrieving a new favicon, signal it
                                          // on the bookmarks table by a "waiting" icon
    setWaitingFavicon(bnId);
  }
  else if (!uri.startsWith("data:image/")
           && !uri.startsWith("data:application/octet-stream")
           && !uri.startsWith("data:text/plain")
           && !uri.startsWith("data:text/html")
           && !uri.startsWith("/icons/")
          ) { // Received another data type than image ...!
    trace("Didn't get an image on favicon for "+bnId+":\r\n"
          +"url:   "+BN.url+"\r\n"
          +uri+"\r\n"
          +"--------------------");
    setNoFavicon(bnId);
  }
  else { // Valid URI returned
    setFavicon(bnId, uri);
  }
}

function errorFavicon (e) {
  console.log('There is an error with faviconWorker !'+e.type);
  console.log(Object.keys(e));
  console.log(Object.values(e));
}

function msgerrorFavicon () {
  console.log('There is a message deserialization error with faviconWorker !');
}

/*
 * Migration of existing favicons to 16x16
 * 
 * migr16x16ConvertList = Array of bnId's to convert
 * migr16x16Len = size of array
 */
function migrate16x16 (migr16x16ConvertList, migr16x16Len) {
  trace("Migrating "+migr16x16Len+" favicons to 16x16");

  // Process list
  let count0x0Favicons = 0;
  if (migr16x16Len > 0) {
	const MigrCanvas = document.createElement('canvas'); // For image conversion to 16 x 16
	MigrCanvas.height = 16;
	MigrCanvas.width = 16;
	const MigrCtx = MigrCanvas.getContext("2d");
	MigrCtx.imageSmoothingEnabled = false;
	MigrCtx.imageSmoothingQuality = "high";
	const MigrImage = new Image(16, 16);
	const MigrCanvas2 = document.createElement('canvas'); // For loading a favicon to downscale
	const MigrCtx2 = MigrCanvas2.getContext("2d");
	const MigrImageData = MigrCtx.createImageData(16, 16);
	const MigrIDData = MigrImageData.data;
	const MigrCadence = 200; // Wait time in milliseconds between a migration request completion
	                         // and start next one in queue
    let migrUri;
	let migratedUri;
	let destBnId;
	let destBn;

	// Loop on list with MigrCadence intervals
	function loop () {
	  setTimeout(
		function () {
		  if (migr16x16Len <= 0) {
			// Set migration as finished
			trace("Migration to 16x16 favicons complete");
			trace("Count of abnormal favicons: "+count0x0Favicons, true); 
		    structureVersion += VersionImg16;
		    browser.storage.local.set({
		  	  structureVersion: structureVersion
		    });
	      }
		  else {
			destBnId = migr16x16ConvertList.shift();
			migr16x16Len--;
			destBn = curBNList[destBnId];
			if (destBn != undefined) { // Still there (could have been deleted by the time ...)
//              console.log("Rescaling: "+destImg.src.substr(0,50)+" - "+row.firstElementChild.firstElementChild.title);
			  // Special handling for x-icons, which are libraries of icons, not well handded
			  // by Canvas 2d context drawImage(), since it takes only the first icon in the librrary.
			  // Verify if this is an x-icon by header .. because the mime type is not always reliable !!
			  let uri = destBn.faviconUri;
			  migrUri = selectXIconImg(uri);
			  if (migrUri != null) { // It is an x-ixon and there was more than 1, go with selected image
//                console.log("  go with selected uri: "+migrUri);
				MigrImage.src = migrUri;
			  }
			  else {
				MigrImage.src = migrUri = uri;
			  }
			}
			else {
			  loop();
			}
		  }
		}
		, MigrCadence
	  );
	}

	// When image loaded, convert it
	function migrateOnLoad () {
	  let nh = MigrImage.naturalHeight;
	  let nw = MigrImage.naturalWidth;
	  try {
	    if ((nh > 16) && (nw > 16)) { // Only downscaling .. avoid FF canvas native algo,
	    	                          // not really good
	      try {
	  	    // Get ImageData.data of the image
	  	    MigrCanvas2.height = nh;
	  	    MigrCanvas2.width = nw;
	  	    MigrCtx2.drawImage(MigrImage, 0, 0);
	  	    let srcIDData = MigrCtx2.getImageData(0, 0, nw, nh).data;

	  	    // Downscale into MigrImageData
	        downscaleImg(srcIDData, MigrIDData, nh, nw);

	  	    // Put MigrImageData into MigrCtx and get base64 uri
	  	    MigrCtx.putImageData(MigrImageData, 0, 0);
	  	    migratedUri = MigrCanvas.toDataURL();
	      }
	      catch (error) {
	  	    console.log("migrateOnLoad error: "+error.type+" for "+migrUri+" - "+destBnId+" - "+destBn.title);
	    	loop();
	      }
	  	}
	  	else {
		  MigrCtx.clearRect(0, 0, 16, 16);
		  MigrCtx.drawImage(MigrImage, 0, 0, 16, 16);
		  migratedUri = MigrCanvas.toDataURL();
	  	}

	    // Save new favicon
		curBNList[destBnId].faviconUri = migratedUri;
		saveBNList();

		// Signal to sidebars
		sendAddonMsgFavicon(destBnId, migratedUri);
	  }
	  catch (error) { // Error on rescale, keep original in place, no change
		console.log("migrateOnLoad error: "+error);
	  }

	  // Next iteration
	  loop();
	}

	// If error on load, set to no favicon and go to next
	function errorMigrOnLoad (error) {
	  setNoFavicon(destBnId);
	  loop();
	}


	// Initiate migration loop
	MigrImage.onload = migrateOnLoad;
	MigrImage.onerror = errorMigrOnLoad;
	loop();
  }
  else {
	// Set migration as finished
	trace("Nothing to migrate to 16x16 favicons");
	trace("Count of abnormal favicons: "+count0x0Favicons, true); 
	structureVersion += VersionImg16;
	browser.storage.local.set({
	  structureVersion: structureVersion
	});
  }
}

/*
 * Receive signal for migrating a list of existing favicons to 16x16.
 * And launch it only if this is the first time received (or when reset).
 * 
 * migr16x16ConvertList = Array of bnId's to convert
 * migr16x16Len = size of array
 */
function signalMigrate16x16 (migr16x16ConvertList, migr16x16Len) {
  if (migr16x16Open) { // If migration open, launch it on given list
	migr16x16Open = false;
	migrate16x16(migr16x16ConvertList, migr16x16Len);
  }
}

/*
 * Recursively explore depth first a BookmarkTreeNode and its children,
 * and build corresponding BN tree.
 *
 * BTN = BookmarkTreeNode
 * level = integer, the tree depth
 * 
 * Return created BookmarkNode tree
 */
//let countDuplicates = 0;
function buildTree (BTN, level) {
  let BTN_id = BTN.id;
/*
  // Detect objects which would be structurally duplicated = appear several times
  // with same bookmark is, supposed to be unique. 
  let BN = curBNList[BTN_id]; 
  if (BN != undefined) { // Already exists !!
    let newId = "dup"+(countDuplicates++)+"-"+BTN_id;
    trace("Duplicate BTN.id = "+BTN_id+" !! Re-id to : "+newId, true);
    traceBTN(BTN);
    BTN.id = BTN_id = newId;
    trace("---------------", true);
    trace("Duplicate with:", true);
    BN_trace(BN);
    trace("---------------", true);
  }
*/
//  let node = curBNList[BTN_id] = BN_create(BTN, level, faviconWorker);
  let node = curBNList[BTN_id] = BN_create(BTN, level, faviconWorkerPostMessage);

  // If there are children, recursively display them
  if (BeforeFF57) {
	if (node.type == "folder") {
	  let btnChildren = BTN.children;
	  if (btnChildren != undefined) {
	    let children = node.children;
	    let j = 0;
	    let index, id;
	    let node1;
        for (let i of btnChildren) {
    	  index = i.index; 
    	  while (j < index) {
    	    id = "separator" + countSeparators;
    	    node1 = new BookmarkNode (id, "separator", level+1, BTN_id, 0,
                                      ((countSeparators++ == 0) ? true : false)
                                     );
            children[j++] = node1;
    	  }
          children[j++] = buildTree(i, level+1);
        }
	  }
    }
  }
  else {
   	if (node.type == "folder") {
  	  let btnChildren = BTN.children;
	  if (btnChildren != undefined) {
	    let children = node.children;
	    let j = 0;
        for (let i of btnChildren) {
          children[j++] = buildTree(i, level+1);
        }
	  }
    }
  }

  return(node);
}

/*
 * Used by BN_insert() in BookmarkNode.js
 * A gap at end of parent children was detected in FF 56, a separator was created,
 * get it displayed by sidebars.
 *
 * parentBN = parent BookmarkNode of already appended gap end BookmarkNode separator
 *
 * Uses and maintain global variable highest_open_level.
 */
function insertFF56EndGapSep (parentBN) {
  let children = parentBN.children;
  let len = children.length;
  let BN = children[len-1]; // Is there since we just inserted it
  sendAddonMsgComplex({
	source: "background",
	content: "bkmkCreated",
	newtree: BN_serialize(BN),
	index: len-1
  });
}

/*
 * Handle bookmark creation event
 *
 * id = string. The new bookmark item's ID.
 * BTN = BookmarkTreeNode. Information about the new bookmark item.
 * 
 * Note: we initially got a problem before switching to the BoopkmarkNode tree in memory ..
 *       When creating several bookmarks in a row very fast like "Mark all tabs", we are getting
 *       plenty of requests nearly at the same time just after the initial parent folder, which are
 *       its children.
 *       And when we were using getSubTree(id) to get more on BTN children, since getSubTree() can be
 *       quite long, it frequently happened that children that we were starting to process while still
 *       processing the parent folder (thanks to the Promise mechanism) were processed faster than their
 *       parent, so their result arrived before.
 *       That ended up in a mess, with exceptions thrown since for ex. curRowList was not yet filled
 *       with the parent when children got executed, and so parentRowIndex was null, and we were calling
 *       insertBkmks() with therefore a null returned by bookmarksTable.rows[parentRowIndex] !!
 *       Total disorder .. !!
 * => Async/await was not helping ... still getting things in "paralleled" disorder :-(
 * => Would have needed semaphores or true synchronicity, but none of this exists in javascript :-(
 * => Had to implement a queueing mechanism at entry .. (again, javascript is a crap language).
 * => Anyway, no other choice to write an extension for our favorite browser :-(
 * 
 *       Now we don't need that anymore since thanks to the BoopkmarkNode tree in memory there is no
 *       more Promise break in the middle, all is sequential.
 * 
 * Global variable isOtherThanSeparatorCreated is set to true if something other than a
 * separator (folder or bookmark) was created in the sequence.
 */
function bkmkCreatedHandler (id, BTN) {
  // We need the parent to calculate the real offset of insertion
  let parentId = BTN.parentId;
  let parentBN = curBNList[parentId];
  let index = BTN.index;
//  let t1 = new Date();
//  trace(t1.getTime()+" Create event on: "+id+" type: "+BTN.type+" parentId: "+parentId+" index: "+index);

  // Create the new BN tree and insert it under its parent
  let BN = buildTree(BTN, parentBN.level+1);
  BN_insert(BN, parentBN, index);

  // Save new current info
  saveBNList();
  
  // Signal to sidebars to make them display it (must work with Private window sidebars
  // also, which have their own separate copy of curBNList).
  sendAddonMsgComplex({
	source: "background",
	content: "bkmkCreated",
	newtree: BN_serialize(BN),
	index: index
  });
}

/*
 * Handle bookmark deletion event
 *
 * id = string. ID of the item that was removed.
 * removeInfo = an object containing info about the removed item.
 *   {parentId: string. ID of the item's parent in the tree.
 *    index:    integer. Zero-based index position of this item in its parent.
 *    node:     BookmarkTreeNode. Detailed information about the item that was removed.
 *   }
 */
function bkmkRemovedHandler (id, removeInfo) {
//  trace("Remove event on: "+id+" title: <<"+removeInfo.node.title+">> type: "+removeInfo.node.type);
  // Remove item and its children from curBNList
  let bn = curBNList[id]; 
  BN_delete(bn, removeInfo.parentId);

  // Save new current info
  saveBNList();

  // Signal to sidebars to make them remove things from display (must work with Private window sidebars
  // also, which have their own separate copy of curBNList).
  sendAddonMsgComplex({
	source: "background",
	content: "bkmkRemoved",
	bnId: id
  });
}

/*
 * Handle bookmark changed event
 *
 * id = string. ID of the item that was changed.
 * changeInfo = an object containing info about the changed item.
 *   {title: string containing the item's title if that changed, else undefined
 *    url: string containing the item's URL if that changed, else undefined
 *   }
 */
function bkmkChangedHandler (id, changeInfo) {
//  trace("Change event on: "+id+" title: <<"+changeInfo.title+">> url: "+changeInfo.url);
  // Retrieve the real BookmarkNode for complete information
  let BN = curBNList[id];
//  trace("Change event on: "+id+" title: <<"+changeInfo.title+">> url: <<"+changeInfo.url+">> isBookmark: "+isBookmark);

  // Update BookmarkNode contents and fetch new favicon if needed
  let cTitle = changeInfo.title;
  if (cTitle != undefined) // Did change
    BN.title = cTitle;
  let cUrl = changeInfo.url;
  let isSpecial;
  if (cUrl != undefined) { // Did change, and is not a folder
	BN.url = cUrl;
    isSpecial = cUrl.startsWith("place:");
    if (isSpecial) {
      BN.faviconUri = "/icons/specfavicon.png";
    }
    else if (cUrl.startsWith("about:")) { // about: is protected - security error ..
      // Set uri to nofavicon.png
      BN.faviconUri = "/icons/nofavicon.png";
    }
    else if (disableFavicons_option) {
  	  BN.faviconUri = undefined;
    }
    else {
      // Trigger asynchronous favicon retrieval process in background
	  BN.faviconUri = "/icons/nofavicontmp.png";
      // This is a bookmark, so here no need for cloneBN(), there is no tree below
//      faviconWorker.postMessage(["get2", id, cUrl, enableCookies_option]);
      faviconWorkerPostMessage({data: ["get2", id, cUrl, enableCookies_option]});
    }
  }

  // Save new values
  saveBNList();

  // Signal to sidebars to make them change things on display (must work with Private window sidebars
  // also, which have their own separate copy of curBNList).
  sendAddonMsgComplex({
	source: "background",
	content: "bkmkChanged",
	bnId: id,
	isBookmark: (BN.type == "bookmark"),
	title: BN.title,
	url: BN.url,
	uri: BN.faviconUri
  });
}

/*
 * Handle bookmark moved event
 *
 * id = string. ID of the item that was moved.
 * moveInfo = an object containing info about the moved item.
 *   {parentId: string. The new parent folder.
 *    index: integer. The new index of this item in its parent.
 *    oldParentId: string. The old parent folder.
 *    oldIndex: integer. The old index of the item in its parent. 
 *   }
 */
function bkmkMovedHandler (id, moveInfo) {
//trace("Move event on: "+id+" from: <<"+moveInfo.oldParentId+", "+moveInfo.oldIndex+">> to: <<"+moveInfo.parentId+", "+moveInfo.index+">>");

  // Retrieve the real BookmarkNode and all its children, and its new parent
  let BN = curBNList[id];
  let curParentId = moveInfo.oldParentId;
  let targetParentId = moveInfo.parentId;
  let targetParentBN = curBNList[targetParentId];
  let targetIndex = moveInfo.index;

  // Remove item and its children from its current parent, but keep them in list
  // as this is only a move.
  BN_delete(BN, curParentId, false);
  // Then insert it at new place, again not touching the list
  BN_insert(BN, targetParentBN, targetIndex, false);

  // Save new values
  saveBNList();

  // Signal to sidebars to make them change things on display (must work with Private window sidebars
  // also, which have their own separate copy of curBNList).
  sendAddonMsgComplex({
	source: "background",
	content: "bkmkMoved",
	bnId: id,
	curParentId: curParentId,
	targetParentId: targetParentId,
	targetIndex: targetIndex
  });
}

/*
 * Handle bookmark reordered event
 *
 * id = string. ID of the folder whose children were reordered.
 * reorderInfo = an object containing info about the reordered item.
 *   {childIds: array of string. Array containing the IDs of all the bookmark items in this folder,
 *              in the order they now appear in the UI. 
 *   }
 */
function bkmkReorderedHandler (id, reorderInfo) {
//  trace("Reorder event on: "+id);

  // We need the BN to get real info
  let folderBN = curBNList[id];

  // Delete all children of folderBN, if any (no cleanup)
  let children = folderBN.children;
  if (children != undefined) {
	// Create a new array with all children of folderBN in new order
	let len = children.length;
	children = folderBN.children = new Array (len); // Start new list from scratch, discarding the old one
	let j = 0;
   	for (let i of reorderInfo) {
   	  children[j++] = curBNList[i];
   	}
  }

  // Save new values
  saveBNList();

  // Signal to sidebars to make them change things on display (must work with Private window sidebars
  // also, which have their own separate copy of curBNList).
  sendAddonMsgComplex({
	source: "background",
	content: "bkmkReordered",
	bnId: id,
	reorderInfo: reorderInfo
  });
}

/*
 * Complete load of bookmarks table
 */
function completeBookmarks () {
  // Remove the faviconworker delay at start if nothing queued
//  faviconWorker.postMessage(["nohysteresis"]);
  faviconWorkerPostMessage({data: ["nohysteresis"]});

  if (ready) { // If already ready, that means we were told to reload the tree from FF API
	// Tell all sidebars to reload
	sendAddonMessage("reload");
  }
  else {
	// Setup event handlers for bookmark modifications
	browser.bookmarks.onCreated.addListener(bkmkCreatedHandler);
	browser.bookmarks.onRemoved.addListener(bkmkRemovedHandler);
	browser.bookmarks.onChanged.addListener(bkmkChangedHandler);
	browser.bookmarks.onMoved.addListener(bkmkMovedHandler);
	// onChildrenReordered doesn't seem implemented for now ... :-(
	// It apears to use a sequence of Move instead ...
	// See https://bugzilla.mozilla.org/show_bug.cgi?id=1319530 ??
	if (browser.bookmarks.onChildrenReordered != undefined) {
	  browser.bookmarks.onChildrenReordered.addListener(bkmkReorderedHandler);
	}

	// Signal we're ready
	ready = true;
	sendAddonMessage("Ready");

	// If we got so far, we can remove the backup version now, the next save will be on primary
	browser.storage.local.remove(["savedBNListBak", "fTimeBak"]);
  }

  // Save current info
  let p1 = saveBNList();
  p1.then(
    function() {
      endSaveTime = new Date();
      trace("Save duration: "+(saveDuration = (endSaveTime.getTime() - endTreeBuildTime.getTime()))+" ms", true);

      // Cleanup saved info and release memory, all is now maintained in cur... lists
      savedBkmkUriList = undefined;
      savedBNList = undefined;
    }
  );

  // If BNList migration was ongoing, complete it
  if (migration_bnlist) {
  	browser.storage.local.remove("savedBkmkUriList");
	structureVersion += VersionBNList;
	browser.storage.local.set({
	 structureVersion: structureVersion
	});
	migration_bnlist = false;
  }
}

/*
 * Search for and recursively build depth first a BookmarkNode tree of a given id in the
 * BTN array
 *
 * a_BTN = array of BookmarkTreeNode
 * id = string, the node id looked for
 * level = integer, the tree depth
 * force = boolean, force display even if empty (default, set to false for Mobile folder)
 * 
 * Return created BookmarkNode
 */
function buildBookmarkId (a_BTN, id, level, force = true) {
  let node;
  for (let i of a_BTN) {
    if (i.id == id) {
      if ((i.children.length > 0) || force) {
        node = buildTree(i, level);
      }
      break;
    }
  }

  return(node);
}

/*
 * Store promised entire bookmark tree in a global variable,
 * then convert it to a curBNList BookarkNode cache structure.
 *
 * a_BTN = array of BookmarkTreeNode
 */
function storeAndConvertTree (a_BTN) {
//  trace("storeAndConvertTree");
  endTreeLoadTime = new Date();
  trace("(FF API) Tree load duration: "+(treeLoadDuration = (endTreeLoadTime.getTime() - endLoadTime.getTime()))+" ms", true);

  // Build the BookmarkNode tree
  let root = a_BTN[0]; // Id is "root________" and type is "folder"
//  trace("Root: <<"+root.id+">>"+"<<"+root.title+">>"+"<<"+root.type+">>");
  rootBN = new BookmarkNode (root.id, "folder", -1, undefined, root.dateAdded, true);
  curBNList[0] = curBNList[root.id] = rootBN;
//  if (delayLoad_option) {
//	delete savedBNList[0];
//  }

  // First, build the Personal toolbar  "toolbar_____"
  let child1 = buildBookmarkId(root.children, PersonalToobar, 0);
  // Then, build the Bookmarks menu     "menu________"
  let child2 = buildBookmarkId(root.children, BookmarksMenu, 0);
  // Then, build the Other bookmarks    "unfiled_____"
  let child3 = buildBookmarkId(root.children, OtherBookmarks, 0);
  // And last, build the Mobile bookmarks    "mobile______"
  let child4 = buildBookmarkId(root.children, MobileBookmarks, 0, false);

  // Add them to rootBN
  let children;
  if (child4 == undefined) {
	children = rootBN.children = [child1, child2, child3];
  }
  else {
	children = rootBN.children = [child1, child2, child3, child4];
  }
  endTreeBuildTime = new Date();
  trace("Tree build duration: "+(treeBuildDuration = (endTreeBuildTime.getTime() - endTreeLoadTime.getTime()))+" ms", true);
	
  completeBookmarks();
}

/*
 * Log error
 *
 * error is whatever the Promise sent as error ... don't want to guess
 */
function onRejected (error) {
  let msg = "BookmarkSearchPlus2 FF API load tree error: "+error;
  console.log(msg);
  trace(msg, true);
}

/*
 * Initialization phase 2: triggered when we know if we're installed or simply loaded / updated
 * and we have loaded all from Local store
 */
function initialize2 () {
  // Start the favicon worker, with a delay if there are fetches triggered by the tree load
/*
  faviconWorker = new Worker ("favicon.js");
  faviconWorker.onmessage = asyncFavicon;
  faviconWorker.onerror = errorFavicon;
  faviconWorker.onmessageerror = msgerrorFavicon;
  faviconWorker.postMessage(["hysteresis"]);
*/
  faviconWorkerPostMessage({data: ["hysteresis"]});

  // If just installed, or if load FF API each time is forced, or if we didn't retrieve the Bookmark node
  // saved structure, then re-read the Bookmark tree from FF API to sync / re-sync.
  if (justInstalled || loadffapi_option || (savedBNList == undefined)) {
	browser.bookmarks.getTree().then(storeAndConvertTree, onRejected);
  }
  else { // We got a full Bookmark node saved structure and we are on an add-on update or reload
	// Use the saved structure as current one
	curBNList = savedBNList;
	endTreeLoadTime = new Date();
	bypassedFFAPI = true;
	trace("(Bypass FF API) Tree load duration: "+(treeLoadDuration = (endTreeLoadTime.getTime() - endLoadTime.getTime()))+" ms", true);

	// Scan tree to get stats and if we have still favicons to fetch, trigger that.
	scanBNTree(rootBN, faviconWorkerPostMessage);
	endTreeBuildTime = new Date();
	trace("Tree build duration: "+(treeBuildDuration = (endTreeBuildTime.getTime() - endTreeLoadTime.getTime()))+" ms", true);

	completeBookmarks();
  }
}


/*
 * Main code:
 * ----------
*/
//Retrieve Platform
browser.runtime.getPlatformInfo()
.then(function (info) {
  platformOs = info.os;
});

// General add-on events
browser.runtime.onInstalled.addListener(handleInstall);

// Watch for sidebar/options script messages from start
browser.runtime.onMessage.addListener(handleAddonMessage);

// Get our version number and
// show the browser action button if option is set
browser.management.getSelf()
.then(
  function (extensionInfo) {
	let name = extensionInfo.name;
	let version = extensionInfo.version;
//	let title1 = name;
	let title2 = name + "\nv" +version;

	// Disable the toolbar button in FF56, it is useless ..
	if (BeforeFF57) {
	  browser.browserAction.disable();
	  title2 += "\nButton not working in FF56 !";
	}

//	browser.browserAction.enable();
//	browser.browserAction.setBadgeText(
//	  {text: title1
//	  }
//	);
	browser.browserAction.setTitle(
	  {title: title2
	  }
	);
	browser.browserAction.setIcon(
	  {path: "icons/star2.png"
	  }
	);
	browser.browserAction.onClicked.addListener(buttonClicked);
  }
);

// Load options and tree (but not the folders state)
trace("Load saved state..", true);
startTime = new Date();
readFullLStore(false, trace)
.then(
  function () {
	// If we got savedBNList, rebuild it
	if (savedBNList != undefined) {
	  let proto = Object.prototype.toString.call(savedBNList).slice(8, -1);
//      trace("proto "+proto, true);
	  if (proto == "String") { // New jsonified method
		trace("jsonified save method", true);
		let json = savedBNList;
		if (json.length < 20) { // Bad save last time .. look at the other one
		  json = savedBNListBak;
		  if ((json != undefined) && (json.length < 20)) { // Not here or bad save again :-(
			json = undefined;
		  }
		}
		if (json == undefined) { // We got nothing ... all was corrupted
		  savedBNList = undefined;
		}
		else { // Rebuild the full savedBNList object
		  rootBN = BN_deserialize(json);
		  savedBNList = {};
		  rebuildBNList(savedBNList, rootBN);
		  savedBNList[0] = rootBN;
		}
	  }
	}
  
	trace("structureVersion: "+structureVersion, true);
	trace("disableFavicons_option: "+disableFavicons_option, true);
	if (!structureVersion.includes(VersionBNList)) {
	  // Signal to migrate from savedBkmkUriList
	  migration_bnlist = true;
	}

	endLoadTime = new Date();
	trace("Load local store duration: "+(loadDuration = (endLoadTime.getTime() - startTime.getTime()))+" ms", true);

	// Wait for getting the install status
	if (justInstalled != undefined) {
	  initialize2();
	} else {
	  getInstallStatus.then(
		function (isInstalled) {
		  if (getInstallStatusTimerID != undefined) { // We got an event before timeout
			clearTimeout(getInstallStatusTimerID);
			getInstallStatusTimerID = undefined;
		  }
		  initialize2();
		}
	  );
	  // The install status will never come on regular FF start and no addon install, so timeout 20 ms on it
	  getInstallStatusTimerID = setTimeout(
		function () { // Timeout, will never get the install event, assume justInstalled = false
		  console.log("No install event");
		  getInstallStatusTimerID = undefined;
		  justInstalled = false;
		  gis_resolve(justInstalled);
		}
		, 20
	  );
	}
  }
)
.catch( // Asynchronous, like .then
  function (err) {
	let msg = "Error on loading from local storage : "+err;
	console.log(msg);
  }
);

/*
let count = 20;
function test() {
  const Root = "root________";
  let endLoadTime = new Date();
  browser.bookmarks.get(Root)
  .then(
    function (BTN) {
	  let t2 = new Date();
	  console.log("Root get duration: "+(t2.getTime() - endLoadTime.getTime())+" ms");
	  console.log("      Root.children: "+BTN.children);
 	  browser.bookmarks.getChildren(Root)
 	  .then(
 	    function (a_BTN1) {
 		  let t3 = new Date();
 		  console.log("Root getChildren duration: "+(t3.getTime() - t2.getTime())+" ms");
 		  console.log("      Number of children: "+a_BTN1.length);
 	      browser.bookmarks.getSubTree(Root)
 	      .then(
 	        function (a_BTN2) {
 	    	  let t4 = new Date();
 	    	  console.log("Root getSubTree duration: "+(t4.getTime() - t3.getTime())+" ms");
 	    	  console.log("      Root.children: "+a_BTN2[0].children);
 	    	  console.log("      Number of children: "+a_BTN2[0].children.length);
 	  	      browser.bookmarks.getTree()
 	  	      .then(
 	  	        function (a_BTN3) {
 	  	    	  let t5 = new Date();
 	  	    	  console.log("(Root) getTree duration: "+(t5.getTime() - t4.getTime())+" ms");
 	  	    	  console.log("      Root.children: "+a_BTN3[0].children);
 	  	    	  console.log("      Number of children: "+a_BTN3[0].children.length);
 	  	    	  if (count-- > 0)   test();
 	  	        }
 	  	      );
 	        }
 	      );
 	    }
 	  );
    }
  );
}
setTimeout(test, 10000);
*/