'use strict';


/*
 * Constants
 */
// With FF64, BuildID is returning a fixed value, and cannot be used anymore ...
// so use browser.runtime.getBrowserInfo() instead.
//const Navigator = window.navigator; // Get version of navigator to detect unavailable features between FF 54 and FF 56
//const BuildID = Navigator.buildID; // BuildID: 20100101 means that we have the websites.resistFingerprinting setting
								   // set .. see https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/privacy/websites
								   // This can happen when the Privacy Settings add-on is used for example ..
								   // See https://addons.mozilla.org/fr/firefox/addon/privacy-settings/ .. good news, this
								   //   add-on requires FF 57 minimum, and that particular setting exist only since FF 58,
								   //   so we cannot have it on FF 56 and it means BeforeFF57 must be false.
//const BeforeFF57 = ((BuildID != "20100101") && (BuildID < "20171112125346"));
//const BeforeFF63 = ((BuildID != "20100101") && (BuildID < "20181018182531"));
let beforeFF57;
let beforeFF58;
let beforeFF60;
let beforeFF62;
let beforeFF63;
let beforeFF64;
let beforeFF66;
let beforeFF77;
let beforeFF109;
browser.runtime.getBrowserInfo()
.then(function (info) {
  let ffversion = parseFloat(info.version);
  beforeFF57 = (ffversion < 57.0);
  beforeFF58 = (ffversion < 58.0);
  beforeFF60 = (ffversion < 60.0);
  beforeFF62 = (ffversion < 62.0);
  beforeFF63 = (ffversion < 63.0);
  beforeFF64 = (ffversion < 64.0);
  beforeFF66 = (ffversion < 66.0);
  beforeFF77 = (ffversion < 77.0);
  beforeFF109 = (ffversion < 109.0);
});

const SaveMinHysteresis = 2000; // Space saves to lower memory consumption
const SaveMinSlowHysteresis = 10000; // Space saves to lower memory consumption, when save is slow (superior to SaveMinHysteresis)
const SaveMaxHysteresis = 25000; // Space saves during massive favicon operations to lower memory consumption
const MaxNoSaveDuration = 300000; // In case of slow save, max 5 minutes for all pending saves to be delayed,
								  // after that do one save to make sure we're not losing too much.
const SidebarScanInterval = 1000; // Every 1 s
//Declared in libstore.js
//const VersionImg16 = "-img16"; // Signal that all favicons are in 16x16 format
//const VersionBNList = "-bnlist"; // Signal that we are in BookmarkNode tree format
//const VersionSpecialFldr = "-spfldr"; // Signal that we are in Special Folder tree format
//const DfltFontSize = 12; // 12px default
//const DfltSpaceSize = 0; // 0px default
//const DfltTextColor = "#222426"; // Default text color
//const DfltBckgndColor = "white"; // Default background color

const CvtCanvas = document.createElement('canvas'); // For image conversion to 16 x 16 and to Base64 URI
CvtCanvas.height = 16;
CvtCanvas.width = 16;
const CvtCtx = CvtCanvas.getContext("2d");
//const Ctx = Canvas.getContext("bitmaprenderer");
//CvtCtx.fillStyle = "white";
CvtCtx.imageSmoothingEnabled = false;
CvtCtx.imageSmoothingQuality = "high";
const CvtImageData = CvtCtx.createImageData(16, 16);
const CvtIDData = CvtImageData.data;
const CvtImage = new Image(16, 16);
CvtImage.onload = convertOnLoad;
CvtImage.onerror = errorCvtOnLoad;
const CvtCanvas2 = document.createElement('canvas'); // For loading a favicon to downscale
const CvtCtx2 = CvtCanvas2.getContext("2d");


/*
 * Global variables, seen by foreground instances (var)
 */
var ready = false; // Set to true when background initialization is done
var platformOs;
let isLinux = false; // To indicate we are under Linux, used for workaround on commands "suggested_key"
//Retrieve Platform
browser.runtime.getPlatformInfo()
.then(function (info) {
  platformOs = info.os;
  if (platformOs == "linux") {
	isLinux = true;
  }
});

//Declared in libstore.js
//var migration_bnlist = false;
//var migration_spfldr = false;
//var savedBkmkUriList; (used in BookmarkNode.js on BN_create())
//var savedBNList;
//var savedBNListBak;
//var savedHNList; 

//Declared in BookmarkNode.js
//var countBookmarks = 0, countFolders = 0, countSeparators = 0, countOddities = 0;
//var mostVisitedBNId, mostVisitedBN, recentTagBNId, recentTagBN, recentBkmkBNId, recentBkmkBN;
//var bsp2TrashFldrBNId, bsp2TrashFldrBN;

var loadDuration, treeLoadDuration, treeBuildDuration, saveDuration;
var isSlowSave = false;
var curBNList = {}; // Current list of BookmarkNode - Saved in storage at each modification
var curHNList; // Current history of HistoryNode - Saved in storage at each modification
var curCreateHistQueue = new CreateHistQueue (); // Current queue of creations waiting resolution
var bypassedFFAPI = false;
var rootBN; // Type is BookmarkNode. This is curBNList[0]


/*
 * Global variables, private to background (let)
 */
let selfName; // Our extension name
let justInstalled; // Signal if we were just installed or this is an update
let isSidebarOpen = {};			// Track state of open sidebars
let sidebarCurId = {};			// Track cursor position of each sidebar to remember it across sidebar close
let sidebarExpMenu = {};		// Track expanded menu state of each sidebar to remember it across sidebar close
let privateSidebarsList = {};	// Track private windows sidebars
let sidebarScanIntervalId = undefined; // To scan open private sidebars ...
//let faviconWorker; // For background retrieval of favicons
let migr16x16Open = true; // Set to false on the first signalMigrate16x16() received
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
  if (options.traceEnabled || force) {
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
 * Save curBNList as well as HistoryList (serialized), including full tree structure at entry 0
 * Includes an hysteresis mechanism to space saves when they are frequent
 *   (typically during favicon fetching).
 * Returns a promise to signal save completion
 */
let saving = false;
let saveQueued = false;
let saveHysteresis = SaveMinHysteresis;
let lastSaveCallTime = undefined;
let lastSaveTime = undefined;
function recallSaveBNList () {
  setTimeout(
	function () {
	  saving = false; // Clear flag, we're not busy anymore
	  if (saveQueued) { // Something more to save, so save now
		saveQueued = false;
		saveBNList();
	  }
	}
	, saveHysteresis
  );
}

let fIndex = 0;
const SaveFIndex = {fIndex: 0};
function endSaveBNList () { // Save finished
  //trace("Saved curBNList");
//  let t2 = new Date ();
//	trace("End of saveBNList. Delay = "+(t2.getTime() - t1.getTime())+" ms", true);
  // Record last slot which was saved
//console.log("saveFIndex: "+fIndex);
  if (options.enableFlipFlop) { // Go to other slot on next save
	fIndex = 1 - fIndex;
  }

  // Introduce an hysteresis before clearing flags
  // and triggering another save.
  recallSaveBNList();

  // One time performance measurement at start
  if (endSaveTime == undefined) {
	endSaveTime = (new Date ()).getTime();
	trace("Save duration: "+(saveDuration = (endSaveTime - endTreeBuildTime))+" ms", true);
	if (saveDuration > SaveMinHysteresis) {
	  isSlowSave = true;
	  trace("isSlowSave: true");
	}

	// Cleanup saved info and release memory, all is now maintained in cur... lists
	savedBkmkUriList = undefined;
	savedBNList = undefined;
	savedBNListBak = undefined;
	savedHNList = undefined;
	savedHNListBak = undefined;
  }
}

function errorSaveBNList (err) { // Error on Save
  let msg = "saveBNList() error when writing to local storage: "+err;
  trace(msg, true);
  console.log(msg);
  recallSaveBNList();
}

const saveObject0 = {savedBNList: undefined, savedHNList: undefined, fTime: undefined, fIndex: 0};
const saveObject1 = {savedBNListBak: undefined, savedHNListBak: undefined, fTimeBak: undefined, fIndex: 1};
let executeSaveTimerID;
function executeSaveBNList () {
  lastSaveTime = (new Date ()).getTime();
  if (executeSaveTimerID != undefined) {
	executeSaveTimerID = undefined;
  }
  try {
	let saveObj;
//	if (options.delayLoad && (savedBNList != undefined)) { // Merge both list when saving to
//														  // keep what was not yet verified
//	  saveObj = Object.assign({}, savedBNList, curBNList);
//	}
//	else {
	saveObj = curBNList;
//    }
	let jsonBN = BN_serialize(saveObj[0]);
	let jsonHN = historyListSerialize(curHNList);
	saveObj = undefined; // Free pointer on object
//console.log("jsonHN.length = "+jsonHN.length);
//console.log("jsonHN = "+jsonHN);
//recallSaveBNList();
//resolve();

	let saveObject;
	if (!options.enableFlipFlop || (fIndex == 0)) {
	  saveObject = saveObject0;
	  saveObject0.savedBNList = jsonBN;
	  saveObject0.savedHNList = jsonHN;
	  saveObject0.fTime = lastSaveTime;
//	  saveObject0.fIndex = 0;
//console.log("savedBNList");
	}
	else {
	  saveObject = saveObject1;
	  saveObject1.savedBNListBak = jsonBN;
	  saveObject1.savedHNListBak = jsonHN;
	  saveObject1.fTimeBak = lastSaveTime;
//	  saveObject1.fIndex = 1;
//console.log("savedBNListBak");
	}
	jsonBN = undefined; // Free pointer on string
	browser.storage.local.set(saveObject)
	.then(endSaveBNList)
	.catch(errorSaveBNList);

	// Free json string and time
	delete saveObject0.savedBNList;
	delete saveObject0.savedHNList;
	delete saveObject0.fTime;
	delete saveObject1.savedBNListBak;
	delete saveObject1.savedHNListBak;
	delete saveObject1.fTimeBak;
  }
  catch (error) { // Most probably out of memory error
					// Calm down, stop the save chain
	console.log("saveBNList() error: "+error);

	// Clear flags, we're not busy anymore
	saving = false;
	saveQueued = false;

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

function saveBNList () {
//trace("saveBNList");

  // Recalculate hysteresis in function of call frequency
  let curTime = (new Date ()).getTime();
  if (lastSaveCallTime != undefined) {
	let delay = curTime - lastSaveCallTime; // In ms
	if (delay < SaveMinHysteresis) { // Doing favicon fetching or doing too often, increase to maximum hysteresis
	  saveHysteresis = SaveMaxHysteresis; 
	}
	else { // Reset to minimum
	  if (isSlowSave) {
		saveHysteresis = SaveMinSlowHysteresis;
	  }
	  else {
		saveHysteresis = SaveMinHysteresis;
	  }
	}
  }
  lastSaveCallTime = curTime;

  // Execute or register save request for later
  if (!saving) { // Avoid doing several saves at same time.
	saving = true;
	if (isSlowSave) { // Delay save to allow reactivity on UI
	  executeSaveTimerID = setTimeout(executeSaveBNList, SaveMinSlowHysteresis);
	}
	else { // Execute immediately
	  executeSaveBNList();
	}
  }
  else { // Already saving .. queue and do only once later when ongoing one 
		 // + hysteresis is finished
	saveQueued = true;
	if (executeSaveTimerID != undefined) { // If slow save and there is a pending delayed save, restart delay
	  									   // to save, to preserve UI responsiveness.
	  									   // Can lose data if user stops FF before save really occurred !!
	  // Protection: do not delay for more than MaxNoSaveDuration (5 minutes)
	  if ((lastSaveTime != undefined) && (curTime - lastSaveTime < MaxNoSaveDuration)) {
		clearTimeout(executeSaveTimerID);
		executeSaveTimerID = setTimeout(executeSaveBNList, SaveMinSlowHysteresis);
	  }
	}
  }
}

/*
 * Called by a sidebar when opening
 * 
 * Return an object with the corresponding saved cursor position (a Bookmark Id String) and expand menu state if any
 */
let showInSidebarWId   = undefined;
let showInSidebarTabId = undefined;
let showInSidebarBnId  = undefined;
function newSidebar (windowId) {
//console.log("Background received newSidebar notification from "+windowId);
  isSidebarOpen[windowId] = true;
  let bnId = sidebarCurId[windowId];
  if (bnId == undefined) { // No value for that window, use last saved value instead
	bnId = options.lastcurbnid;
  }
  // In case it was open by a show bookmark action, and it was not yet ready, process now the show bookmark action
  if ((showInSidebarWId == windowId) && (showInSidebarBnId != undefined)) {
	setTimeout(sendAddonMsgShowBkmk, 50 // Wait 50 ms
			   , showInSidebarWId, showInSidebarTabId, showInSidebarBnId // Parameters of sendAddonMsgShowBkmk()
	);
	showInSidebarWId   = undefined;
	showInSidebarTabId = undefined;
	showInSidebarBnId  = undefined;
  }

  let expMenu = sidebarExpMenu[windowId];
  if (expMenu == undefined) { // No value for that window, use last saved value instead
	expMenu = options.expandMenu;
  }

  return({bnId: bnId, expMenu: expMenu});
}

/*
 * Called by a sidebar when closing
 */
function closeSidebar (windowId) {
//console.log("Background received closeSidebar notification from "+windowId);
  delete isSidebarOpen[windowId];
}

/*
 * Remember current selected bookmark id for each window, and save it to local store for
 * next FF restart.
 */
function saveCurBnId (windowId, bnId) {
  options.lastcurbnid = sidebarCurId[windowId] = bnId;
  browser.storage.local.set({
	lastcurbnid_option: bnId
  });
}

/*
 * Remember current expand menu state for each window, and save it to local store for
 * next FF restart.
 */
function saveExpMenu (windowId, state) {
  options.expandMenu = sidebarExpMenu[windowId] = state;
  browser.storage.local.set({
	expandmenu_option: state
  });
}

/*
 * Verify if private window sidebars are still open. If not, update scanSidebars status
 */
function scanSidebars () {
  let a_winId = Object.keys(privateSidebarsList);
  let len = a_winId.length;
  for (let i=0 ; i<len ; i++) {
	let winId = a_winId[i]; // A String
	let windowId = privateSidebarsList[winId]; // An integer
//console.log("Scanning "+windowId);
	browser.sidebarAction.isOpen(
	  {windowId: windowId}
	).then(
	  function (open) {
//console.log(windowId+" is "+open);
		if (!open) { // Remove from lists of open sidebars
//console.log("Deleting "+windowId);
		  delete privateSidebarsList[windowId];
		  delete isSidebarOpen[windowId];
		  // Do not delete entry in sidebarCurId to keep it across sidebar sessions
		  if (--len <= 0) {
			clearInterval(sidebarScanIntervalId);
			sidebarScanIntervalId = undefined;
		  }
		}
	  }
	).catch( // Asynchronous also, like .then
	  function (err) {
		// window doesn't exist anymore
//console.log("Error name: "+err.name+" Error message: "+err.message);
		if (err.message.includes("Invalid window ID")) {
//console.log("Window doesn't exist anymore, deleting it: "+windowId);
		  delete privateSidebarsList[windowId];
		  delete isSidebarOpen[windowId];
		  // Do not delete entry in sidebarCurId to keep it across sidebar sessions
		  let len = Object.keys(privateSidebarsList).length;
		  if (len == 0) {
			clearInterval(sidebarScanIntervalId);
			sidebarScanIntervalId = undefined;
		  }
		}
	  }
	);
  }
}

/*
 * Insert in a_obj and a_index, ordered by a_index
 * 
 * a_obj = list of already existing objects
 * a_index = corresponding list of their increasing indexes (non continuous)
 * obj = object to insert
 * index = its index
 */
function insertList (a_obj, a_index, obj, index) {
  let len = a_index.length;
  if (len == 0) {
	a_obj.push(obj);
	a_index.push(index);
  }
  else if (len == 1) {
	if (a_index[0] >= index) {
	  a_obj.unshift(obj);
	  a_index.unshift(index);
	}
	else {
	  a_obj.push(obj);
	  a_index.push(index);
	}
  }
  else {
	if (a_index[0] >= index) {
	  a_obj.unshift(obj);
	  a_index.unshift(index);
	}
	else if (a_index[len-1] <= index) {
	  a_obj.push(obj);
	  a_index.push(index);
	}
	else { // Insert between the two by dichotomy
	  let minPos = 0;
	  let maxPos = len-1;
	  let pos;
	  while (maxPos - minPos > 1) {
		pos = (minPos + maxPos) >> 1; // Divide by 2 keeping an integer position => shift left by 1
		if (a_index[pos] > index) {
		  maxPos = pos;
		}
		else {
		  minPos = pos;
		}
	  }
	  // Insert the new element at maxPos (which is just before the maxPos element, and just after
	  // the minPos one)
	  a_obj.splice(maxPos, 0, obj);
	  a_index.splice(maxPos, 0, index);
	}
  }
}

/*
 * Find item in a list given its id.
 * 
 * a_BN = array of BookmarkNode to search
 * BN = BN to search for
 * 
 * Returns: an array [BN, index], index being position in a_BN. Or undefined if not found.
 */
function findBN (a_BN, BN) {
  let a_result; // undefined by default
  let bnId = BN.id;
  let bnTitle = BN.title;
  let bnUrl = BN.url;
  let len;
  if ((a_BN != undefined) && ((len = a_BN.length) > 0)) {
	let j;
	let node, i;
	for (j=0 ; j<len ; j++) {
	  i = a_BN[j];
	  if ((i.id == bnId) && (i.title == bnTitle) && (i.url == bnUrl)) {
		node = i;
		break;
	  }
	}
	if (node != undefined) { // Found it !
	  a_result = [node, j];
	}
  }
  return(a_result);
}

/*
 * Refresh children of node with a new list of BN's, triggering create / delete / moves
 * as needed on display.
 * 
 * BN = BookmarkNode with children to refresh
 * a_BN = array of BN to set as children
 */
function refreshChildren (BN, a_BN) {
  let bnId = BN.id;
  let children = BN.children;
  let a_result;
  let childId;

  // 3 phases =
  //    1. identify elements to delete or in common in BN
  //    2. delete, then reorder remaining common elements as needed
  //    3. insert missing elements from a_BN

  // Phase 1: identify elements to delete or in common in BN
  let list1Del = []; // Will contain elements to delete and their id = [child, childId]
  let list1Common = []; // Will contain the Id of remaining common elements ordered by target position
  let list1Target = []; // List of target positions for element in list1Common
  let len2 = a_BN.length;
  let list2Common = new Array(len2); // Will tell which elements of a_BN are common by setting them
  									 // to something else than undefined
  let j;
  let identical;
  if (children != undefined) {
	let len1 = children.length;
	identical = (len1 == len2); // Identical until a difference is found
	let child;
	for (let i=0 ; i<len1 ; i++) {
	  child = children[i];
	  childId = child.id;
	  a_result = findBN(a_BN, child);
	  if (a_result == undefined) { // Doesn't exist anymore
		list1Del.push([child, childId]);
		identical = false;
	  }
	  else { // Common element between children and a_BN
		j = a_result[1]; // Get new index
		if (j != i)
		  identical = false;
		if (list2Common[j] == true) { // Already seen -> handle case of same element several times in the source list
		  list1Del.push([child, childId]);
		}
		else {
		  list2Common[j] = true;
		  insertList(list1Common, list1Target, childId, j);
		}
	  }
	}
  }
  else {
	identical = false;
  }

//identical = false;
  if (!identical) {
	// Phase 2: delete, then reorder remaining common elements as needed
	let i;
	let len = list1Del.length;
	for (j=0 ; j<len ; j++) {
	  i = list1Del[j];
	  BN_delete(i[0], bnId);
	  // Save new current info
	  saveBNList();

	  // Signal to sidebars to make them remove things from display (must work with Private window sidebars
	  // also, which have their own separate copy of curBNList).
	  sendAddonMsgComplex({
		source: "background",
		content: "bkmkRemoved",
		bnId: i[1]
	  });
	}
	if (list1Common.length > 0) { // At this stage, the number of children is what remains in common
	  // Same size on remaining children and childIds
	  bkmkReorderedHandler(bnId, {childIds: list1Common}, false); // No record in hostory
	}

	// Phase 3: insert missing elements from a_BN
	for (j=0 ; j<len2 ; j++) {
	  i = a_BN[j];
	  if (list2Common[j] == undefined) { // Not in common => add it
		BN_insert(i, BN, j);

		// Save new current info
		saveBNList();
		  
		// Signal to sidebars to make them display it (must work with Private window sidebars
		// also, which have their own separate copy of curBNList).
		sendAddonMsgComplex({
		  source: "background",
		  content: "bkmkCreated",
		  newtree: BN_serialize(i),
		  index: j
		});
	  }
	}
  }
}

/*
 * Refresh / build the list of most visited sites
 * 
 * a_MVU = array of MostVisitedURL object, containing the new items to put under mostVisitedBN
 * 
 * Uses global variable mostVisitedBN
 */
function refreshMostVisited (a_MVU) {
  // Limit it to 10 items
  let len = a_MVU.length;
  if (len > 10) {
	len = a_MVU.length = 10;
  }

  // Convert to a list of special place: BN, all protected
  let listBN = [];
  let BTN;
  let node;
  let curTime = (new Date ()).getTime();
  let i;
  for (let j=0 ; j<len ; j++) {
	i = a_MVU[j];
	BTN = new Object ();
	BTN.dateAdded         = curTime;
	BTN.dateGroupModified = curTime;
	let bnId = BTN.id     = "place:mostVisited_"+j;
	BTN.index             = j;
	BTN.parentId          = mostVisitedBNId;
	BTN.title             = i.title;
	BTN.type              = "bookmark";
//	BTN.unmodifiable      = undefined;
	BTN.url               = i.url;
	node = BN_create(BTN, 2, undefined); // Do not fetch any favicon yet
	if (!options.disableFavicons) { // Try to get the favicon URI if available (and not disabled)
	  let uri = i.favicon;
	  if (uri != undefined) { // Only with FF63+, when the favicon is known by FF
		node.faviconUri = uri;
		node.fetchedUri = true;
		// Convert to 16x16 if needed
		cvt16x16Add(bnId, uri);
	  }
	}
	listBN.push(node);
  }

  // Refresh all children of mostVisitedBN with that list
  if (mostVisitedBN != undefined) { // undefined can happen when mostVisitedBN is deleted and scheduling
									// is made before the node disappeared, but is dispatched after
	refreshChildren(mostVisitedBN, listBN);
	// Now, fetch favicons if needed (but no stats update !)
	scanBNTree(mostVisitedBN, faviconWorkerPostMessage, false);
  }
}

/*
 * Refresh / build the list of recently bookmarked items
 * 
 * a_BTN = array of BookmarkTreeNode, containing the new items to put under recentBkmkBN
 * 
 * Uses global variable recentBkmkBN
 */
function refreshRecentBkmks (a_BTN) {
  // Convert to a list of special place: BN, all protected
  let listBN = [];
  let node, origBN;
  let i;
  let bnId;
  let len = a_BTN.length;
  for (let j=0 ; j<len ; j++) {
	i = a_BTN[j];
	bnId = i.id;
	i.id = "place:" + bnId;
	node = BN_create(i, 2, undefined); // Do not fetch any favicon yet
	// Get favicon of origin BN if existing
	origBN = curBNList[bnId];
	if (origBN != undefined) {
	  node.faviconUri = origBN.faviconUri;
	  node.fetchedUri = origBN.fetchedUri;
	}
	listBN.push(node);
  }

  // Refresh all children of recentBkmkBN with that list
  if (recentBkmkBN != undefined) { // undefined can happen when recentBkmkBN is deleted and scheduling
								   // is made before the node disappeared, but is dispatched after
	refreshChildren(recentBkmkBN, listBN);
	// Now, fetch favicons if needed (but no stats update !)
	scanBNTree(recentBkmkBN, faviconWorkerPostMessage, false);
  }
}

/*
 * Trigger most visited sites refresh 
 */
function triggerRefreshMostVisited () {
  if (mostVisitedBNId != undefined) {
	if (beforeFF63) {
	  browser.topSites.get()
	  .then(refreshMostVisited);
	}
	else { // After FF63, get the favicon data URL which is now made available
	  let maxResults = 10;
	  let url = mostVisitedBN.url;
	  if (url != undefined) {
		let p = url.indexOf("maxResults=");
		if (p > -1) {
		  let l = parseInt(url.slice(p+11), 10);
		  if (l > 0) {
			maxResults = l;
		  }
		}
	  }
	  browser.topSites.get({
		includeFavicon: true,
		limit: maxResults
	  })
	  .then(refreshMostVisited);
	}
  }
}

/*
 * Trigger recent bookmarks refresh 
 */
function triggerRecentRefreshBkmks () {
  if (recentBkmkBNId != undefined) {
	let maxResults = 10;
	let url = recentBkmkBN.url;
	if (url != undefined) {
	  let p = url.indexOf("maxResults=");
	  if (p > -1) {
		let l = parseInt(url.slice(p+11), 10);
		if (l > 0) {
		  maxResults = l;
		}
	  }
	}
	browser.bookmarks.getRecent(maxResults)
	.then(refreshRecentBkmks);
  }
}

/*
 * Sort a bookmark list by name
 * Folders are put at front, then bookmarks
 * Sorting is case insensitive
 * 
 * a_BN = array of BookmarkNodes to sort
 * 
 * Returns the sorted list (array) of BN's
 */
function sortBNList (a_BN) {
  let resultListFldrs = [];
  let tempFldrs = [];
  let resultListBkmks = [];
  let tempBkmks = [];
  let i;
  let len = a_BN.length;
  for (let j=0; j<len ; j++) {
	i = a_BN[j];
	if (i.type == "folder") {
	  insertList(resultListFldrs, tempFldrs, i.id, i.title.toLowerCase());
	}
	else {
	  insertList(resultListBkmks, tempBkmks, i.id, i.title.toLowerCase());
	}
  }
  return(resultListFldrs.concat(resultListBkmks));
}

/*
 * Sort a folder by name
 * Sorting is split between separators
 * Folders are put at front, then bookmarks, in each split
 * Sorting is case insensitive
 * 
 * bnId = Id of bookmark folder to sort
 */
async function sortFolder (bnId) {
  // Get BookmarkNode of folder
  let BN = curBNList[bnId];

  let children = BN.children;
  let len = children.length;
  if ((children != undefined) && (len > 1)) { // Execute the sort
	let resultList = [];
	let chunkNodes = [];
	let j = 0;
	let node;
	let chunkLen;

	// Split list by chunks between separators, and sort each of them
	while (j < len) {
	  node = children[j];
	  if (node.type == "separator") {
		chunkLen = chunkNodes.length;
		if (chunkLen > 0) { // There is a chunk to add
		  if (chunkLen > 1) { // Sort chunk and add
			resultList = resultList.concat(sortBNList(chunkNodes));
		  }
		  else { // Just add the node in chunk
			resultList.push(chunkNodes[0].id);
		  }
		  chunkNodes = []; // Start a new chunk
		}
		resultList.push(node.id); // Add the separator at its place
	  }
	  else { // Add node to current chunk
		chunkNodes.push(node);
	  }
	  j++;
	}
	chunkLen = chunkNodes.length;
	if (chunkLen > 0) { // There remains something to add
	  if (chunkLen > 1) { // Sort chunk and add
		resultList = resultList.concat(sortBNList(chunkNodes));
	  }
	  else { // Just add the node in chunk
		resultList.push(chunkNodes[0].id);
	  }
	}

	// We now have a sorted list, move the bookmark items accordingly
	let moveLoc = new Object ();
	len = resultList.length;
	for (j=0 ; j<len ; j++) {
	  moveLoc.index = j;
	  // Use await, as it seems that if we do not wait for completion of one move
	  // to issue the next move, we end up with some disorder in FF :-(
	  await browser.bookmarks.move(resultList[j], moveLoc);
	}
  }  
}

/*
 * Record a multiple operation in History (called from sidebar or from history window)
 * 
 * action = String, nature of the operation ("create", "create_ft", move", "remove" or "remove_tt")
 *   note: multi "create" is in fact a copy of a list of bookmarks with ids which will be known later.
 * 
 * id_list = Array of String identifying the bookmark Ids subject to the multiple action, undefined in the case
 *           of a multi create
 * newParentId = String, Id of new parent to move into, not meaningful in case of "remove"
 * newIndex = integer position in parent (undefined if at end), not meaningful in case of "remove"
 * 
 * Returns the newly created HistoryNode 
 */
function recordHistoryMulti (action, id_list, newParentId = undefined, newIndex = undefined) {
  let hn = historyListAdd(curHNList, action,
						  true, id_list, undefined, undefined, undefined, undefined, undefined,
						  undefined, undefined, undefined, undefined, undefined,
						  (newParentId == undefined) ? undefined : BN_aPath(newParentId), newParentId, newIndex
						 );
  return(hn);
}

/*
 * Trigger an undo operation if possible (called from sidebar or from history window)
 */
function triggerUndo () {
  executeUndo(curHNList);
}

/*
 * Trigger a redo operation if possible (called from sidebar or from history window)
 */
function triggerRedo () {
  executeRedo(curHNList);
}

/*
 * Copy bookmark contents at the designated place (called from sidebar or from history window)
 * 
 * a_id = array of Strings (bookmark ids)
 * a_BN = array of BookmarkNodes to paste (copy)
 * parentId = String, Id of new parent to paste into
 * index = integer position in parent (undefined if at end)
 */
async function copyBkmk (a_id, a_BN, parentId, index = undefined) {
  // Record a multiple operation if more than one item is in the array
  let len = a_id.length;
  let bn, children;
  let is_multi = (len > 1)
  				 || (((bn = a_BN[0]).type == "folder") && ((children = bn.children) != undefined)
  					 && (children.length > 0)
  					)
  				 ;
  let hn;
  if (is_multi) { // Multiple bookmarks will be created
	// Note: id_list of new bookmarks is still unknown at this stage of creation, see below
	hn = historyListAdd(curHNList, HNACTION_BKMKCREATE,
						true, [], undefined, undefined, undefined, undefined, undefined,
						undefined, undefined, undefined, undefined, undefined,
						BN_aPath(parentId), parentId, index
					   );
	hn.id_list_len = len;
  }
  // Use as source a copy of the source list of BookmarNodes to paste, because in case we are copying inside source,
  // we need to avoid an infinite loop due to the source list being itself modified by the paste. 
  let id_list = await util_copyBkmk(uniqueListCopy(a_BN), parentId, index, hn); // Recursive call on folders

  // Update the (top) created id-list in the HistoryNode, if created
  if (hn != undefined) {
	hn.id_list = id_list;
  }
}

/*
 * Reload bookmarks from FF API for re-synchro (triggered by user, or auto-detected)
 * 
 * is_autoDetected = Boolean, true if this is provoked by BSP2 code, false if demanded by user 
 */
function reloadFFAPI (is_autoDetected) {
  // Make sure completeBookmarks will behave properly on this tree reload
  endLoadTime = (new Date()).getTime();
  savedBNList = curBNList;
  savedHNList = curHNList;
  faviconWorkerPostMessage({data: ["hysteresis"]});
  countBookmarks = countFolders = countSeparators = countOddities = countFetchFav = countNoFavicon = 0;
  // Forget any instance of BSP2 trash, we will rediscover it
  bsp2TrashFldrBNId = undefined;
  bsp2TrashFldrBN = undefined;

  browser.bookmarks.getTree()
  .then(storeAndConvertTree, onRejected)
  .catch( // Asynchronous, like .then
	function (err) {
	  let msg = "Error on processing reloadFFAPI : "+err;
	  console.log(msg);
	  if (err != undefined) {
		let fn = err.fileName;
		if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
		console.log("fileName:   "+fn);
		console.log("lineNumber: "+err.lineNumber);
	  }
	}
  );

  if (is_autoDetected) { // Ask all instances of sidebars to display a modal warning that
						 // bookmark are being reloaded and to wait until then
	sendAddonMessage("notifAutoFFReload");
	// Record auto reload action
	historyListAdd(curHNList, HNACTION_AUTORELOADFFAPI);
  }
  else {
	sendAddonMessage("notifFFReload");
	// Record manual reload action
	historyListAdd(curHNList, HNACTION_RELOADFFAPI);
  }
  // Make sure we save the last known state, including history
  saveBNList();
}

/*
 * Create BSP2 trash folder 
 */
function createBSP2TrashFolder () {
  if (bsp2TrashFldrBNId == undefined) { // Only create once !
	if (beforeFF57) {
	  browser.bookmarks.create(
		{parentId: OtherBookmarks,
		 title: BSP2TrashName
		}
	  );
	}
	else {
	  browser.bookmarks.create(
		{parentId: OtherBookmarks,
		 title: BSP2TrashName,
		 type: "folder"
		}
	  );
	}
  }
  else { // It already exists, simply trim its content
	BN_folderTrim(curBNList[bsp2TrashFldrBNId], options.historyRetention * 24 * 3600000);
  }
}

/*
 * Remove BSP2 trash folder 
 */
async function removeBSP2TrashFolder () {
  if (bsp2TrashFldrBNId != undefined) { // Only remove if present !
	// Make sure the delete is complete before doing a rescan
	await browser.bookmarks.removeTree(bsp2TrashFldrBNId);
	// Do a rescan (but with no stats refresh) to check if there are any other undue instances of BSP2 trash left
	// and remove them if so
	scanBNTree(rootBN, faviconWorkerPostMessage, false);
  }
}

/*
 * Handle responses or errors when talking with sidebars
 * Note that all sidebars (and also the History and the Options page) will receive messages from background,
 * but only the first received response will be handled, and others are ignored.
 */
function handleMsgResponse (message) {
  // Is always called, even if destination didn't specifically reply (then message is undefined)
  if (options.traceEnabled) {
	console.log("Background received a response: <<"+((message != undefined) ? message.content : message)+">>");
  }
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
 * Send show bookmark to one sidebar
 * 
 * wId  = id of window holding the BSP2 sidebar
 * tabd = id of bookmarked tabshowInSidebarTabId
 * bnId = String, id of bookmark
 */
function sendAddonMsgShowBkmk (wId, tabId, bnId) {
  browser.runtime.sendMessage(
	{source: "background",
	 content: "showBookmark",
	 wId: wId,
	 tabId: tabId,
	 bnId: bnId
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
if (options.traceEnabled) {
  console.log("Got message <<"+msg+">> from "+request.source+" in background");
  console.log("  sender.tab: "+sender.tab);
  console.log("  sender.frameId: "+sender.frameId);
  console.log("  sender.id: "+sender.id);
  console.log("  sender.url: "+sender.url);
  console.log("  sender.tlsChannelId: "+sender.tlsChannelId);
}

	if (msg.startsWith("saveCurBnId")) {
	  let windowId = parseInt(request.source.slice(8), 10);
	  saveCurBnId(windowId, request.bnId);
	}
	if (msg.startsWith("saveExpMenu")) {
	  let windowId = parseInt(request.source.slice(8), 10);
	  saveExpMenu(windowId, request.state);
	}
	else if (msg.startsWith("Close:")) { // Private window closing - De-register it
	  									 // In fact, this message never comes :-(
	  									 // So have to poll such pages ...
	  let windowId = parseInt(msg.slice(6), 10);
	  closeSidebar(windowId);
	}
	else if (msg.startsWith("savedOptions")) { // Option page changed something to options, reload them
	  // Look at what changed
	  let pauseFavicons_option_old = options.pauseFavicons;
	  let disableFavicons_option_old = options.disableFavicons;
	  let enableCookies_option_old = options.enableCookies;
	  let enableFlipFlop_option_old = options.enableFlipFlop;
	  let advancedClick_option_old = options.advancedClick;
	  let showPath_option_old = options.showPath;
	  let closeSearch_option_old = options.closeSearch;
	  let openTree_option_old = options.openTree;
	  let noffapisearch_option_old = options.noffapisearch;
	  let searchOnEnter_option_old = options.searchOnEnter;
	  let deactivateSearchList_option_old = options.deactivateSearchList;
	  let reversePath_option_old = options.reversePath;
	  let closeSibblingFolders_option_old = options.closeSibblingFolders;
	  let rememberSizes_option_old = options.rememberSizes;
	  let searchHeight_option_old = options.searchHeight;
	  let setFontSize_option_old = options.setFontSize;
	  let fontSize_option_old = options.fontSize;
	  let setFontBold_option_old = options.setFontBold;
	  let setSpaceSize_option_old = options.setSpaceSize;
	  let spaceSize_option_old = options.spaceSize;
	  let matchTheme_option_old = options.matchTheme;
	  let setColors_option_old = options.setColors;
	  let textColor_option_old = options.textColor;
	  let bckgndColor_option_old = options.bckgndColor;
	  let altFldrImg_option_old = options.altFldrImg;
	  let useAltFldr_option_old = options.useAltFldr;
	  let altNoFavImg_option_old = options.altNoFavImg;
	  let useAltNoFav_option_old = options.useAltNoFav;
	  let trashEnabled_option_old = options.trashEnabled;
	  let trashVisible_option_old = options.trashVisible;
	  let traceEnabled_option_old = options.traceEnabled;
	  refreshOptionsLStore()
	  .then(
		function () {
		  let SFSChanged;
		  let FSChange;
		  let fontSize_option_new;
		  let SSSChanged;
		  let SSChange;
		  let spaceSize_option_new;
		  let actionReRead = false;
		  let actionReload = false;
		  if (pauseFavicons_option_old != options.pauseFavicons) {
			if (options.pauseFavicons) {
			  // Stop queued favicon fetching
			  faviconWorkerPostMessage({data: ["stopfetching"]});
			}
			else {
			  // Rescan tree to trigger fetching favicon, and save it
			  countBookmarks = countFolders = countSeparators = countOddities = countFetchFav = countNoFavicon = 0;
			  scanBNTree(rootBN, faviconWorkerPostMessage);
			}
			// Signal to others the change in option
			actionReRead = true;
		  }
		  if (disableFavicons_option_old != options.disableFavicons) {
			// Stop queued favicon fetching
			faviconWorkerPostMessage({data: ["stopfetching"]});

			// Rescan tree to either clear favicons or trigger fetching them, and save it
			countBookmarks = countFolders = countSeparators = countOddities = countFetchFav = countNoFavicon = 0;
			scanBNTree(rootBN, faviconWorkerPostMessage);
			saveBNList();

			// Change to DFF requires a full reload of all sidebars
			actionReload = true;
		  }
		  SFSChanged = (setFontSize_option_old != options.setFontSize);
		  fontSize_option_new = options.fontSize;
		  FSChange = (SFSChanged &&
					  ((setFontSize_option_old && (fontSize_option_old != DfltFontSize)) // If SFS changed to unset, refresh when previous FS was not the default
						|| (!setFontSize_option_old && (fontSize_option_new != DfltFontSize)) // If SFS changed to set, refresh when new FS is not the default
					  )
					 )
		  			 || (!SFSChanged && setFontSize_option_old && (fontSize_option_old != fontSize_option_new)) // If SFS didn't change and is set, refresh when FS changed
		  			 ;  
		  if (FSChange) {
			// Change to FS requires a full reload of all sidebars
			actionReload = true;
		  }
		  if (setFontBold_option_old != options.setFontBold) {
			// Change to font weight requires a full reload of all sidebars
			actionReload = true;
		  }
		  SSSChanged = (setSpaceSize_option_old != options.setSpaceSize);
		  spaceSize_option_new = options.spaceSize;
		  SSChange = (SSSChanged &&
					  ((setSpaceSize_option_old && (spaceSize_option_old != DfltSpaceSize)) // If SSS changed to unset, refresh when previous SS was not the default
						|| (!setSpaceSize_option_old && (spaceSize_option_new != DfltSpaceSize)) // If SSS changed to set, refresh when new SS is not the default
					  )
					 )
		  			 || (!SSSChanged && setSpaceSize_option_old && (spaceSize_option_old != spaceSize_option_new)) // If SSS didn't change and is set, refresh when SS changed
		  			 ;  
		  if (SSChange) {
			// Change to SS requires a full reload of all sidebars
			actionReload = true;
		  }
		  if (trashEnabled_option_old != options.trashEnabled) {
			// Create or delete the BSP2 trash folder, as required
			if (options.trashEnabled) { // Create BSP2 trash folder, if not already existing (else trim it)
			  createBSP2TrashFolder();
  			}
			else { // Delete BSP2 trash folder and all its content
			  removeBSP2TrashFolder();
			}
			actionReRead = true;
		  }
		  if ((enableCookies_option_old != options.enableCookies)
			  || (enableFlipFlop_option_old != options.enableFlipFlop)
			  || (advancedClick_option_old != options.advancedClick)
			  || (showPath_option_old != options.showPath)
			  || (closeSearch_option_old != options.closeSearch)
			  || (openTree_option_old != options.openTree)
			  || (noffapisearch_option_old != options.noffapisearch)
			  || (searchOnEnter_option_old != options.searchOnEnter)
			  || (deactivateSearchList_option_old != options.deactivateSearchList)
			  || (reversePath_option_old != options.reversePath)
			  || (closeSibblingFolders_option_old != options.closeSibblingFolders)
			  || (rememberSizes_option_old != options.rememberSizes)
			  || (searchHeight_option_old != options.searchHeight)
			  || (trashVisible_option_old != options.trashVisible)
			  || (traceEnabled_option_old != options.traceEnabled)
			  || (matchTheme_option_old != options.matchTheme)
			  || (setColors_option_old != options.setColors)
			  || (options.setColors && ((textColor_option_old != options.textColor)
			   	   						|| (bckgndColor_option_old != options.bckgndColor)
			   	   					   )
				 )
			  || ((options.useAltFldr && (altFldrImg_option_old != options.altFldrImg))
				  || (useAltFldr_option_old != options.useAltFldr)
				 )
			  || ((options.useAltNoFav && (altNoFavImg_option_old != options.altNoFavImg))
				  || (useAltNoFav_option_old != options.useAltNoFav)
			  	 )
			) { // Those options only require a re-read and some minor actions
			actionReRead = true;
		  }
		  if (actionReload) { // Provoke a reload
			sendAddonMessage("reload");
		  }
		  else if (actionReRead) { // Else simply require a re-read
			sendAddonMessage("savedOptions");
		  }
		}
	  )
	  .catch( // Asynchronous, like .then
		function (err) {
		  let msg = "Error on processing addon message : "+err;
		  console.log(msg);
		  if (err != undefined) {
			let fn = err.fileName;
			if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
			console.log("fileName:   "+fn);
			console.log("lineNumber: "+err.lineNumber);
		  }
		}
	  );
	}
	else if (msg.startsWith("savedSearchOptions")) { // Reload them all
	  refreshOptionsLStore()
	  .then(
		function () {
		  // Signal to others the change in option
		  sendAddonMessage("savedSearchOptions");
		}
	  )
	  .catch( // Asynchronous, like .then
		function (err) {
		  let msg = "Error on processing savedSearchOptions : "+err;
		  console.log(msg);
		  if (err != undefined) {
			let fn = err.fileName;
			if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
			console.log("fileName:   "+fn);
			console.log("lineNumber: "+err.lineNumber);
		  }
		}
	  );
	}
	else if (msg.startsWith("refetchFav")) { // Option page "Re-fetch all unsuccessful favicons" button was pressed
	  refetchFav();
	}
	else if (msg.startsWith("reloadFFAPI")) { // Option page "Reload tree from FF API" button was pressed,
	  										  // or an anomaly was detected.
	  reloadFFAPI(msg == "reloadFFAPI_auto");
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
	else if (msg.startsWith("refreshMostVisited")) { // Opening the most visited special folder => refresh it
	  triggerRefreshMostVisited();
	}
	else if (msg.startsWith("refreshRecentBkmks")) { // Opening the most visited special folder => refresh it
	  triggerRecentRefreshBkmks();
	}
	else if (msg.startsWith("sort:")) { // Sort a folder contents by name
	  let BN_id = msg.substring(5); // Get bookmark item Id
	  sortFolder(BN_id);
	}
	else if (msg.startsWith("clearHistory")) { // Clear bookmark history and BSP2 trash, sent from options page
	  historyListClear(curHNList);
	  BN_folderClean(bsp2TrashFldrBN);
	  // Save new current info
	  saveBNList();
	}
	else if (msg.startsWith("saveBNList")) { // Demand from the history window to save curHNList
	  saveBNList();
	}
	else if (msg.startsWith("triggerUndo")) { // Trigger an undo operation if possible
	  triggerUndo();
	}
	else if (msg.startsWith("triggerRedo")) { // Trigger a redo operation if possible
	  triggerRedo();
	}
	else if (msg.startsWith("copyBkmk")) { // Create copies of a list of bookmarks
	  // Rebuild a_BN from a_id
	  let a_id = request.a_id; // An array of Strings is ok in messages
	  let a_BN = [];
	  let len = a_id.length;
	  for (let i=0 ; i<len ; i++) {
		a_BN.push(curBNList[a_id[i]]);
	  }
	  copyBkmk(a_id, a_BN, request.parentId, request.index);
	}

	// Answer
	if (msg.startsWith("New:")) { // New private window sidebar opening - Register it
	  let windowId = parseInt(msg.slice(4), 10);
	  privateSidebarsList[windowId] = windowId;
	  let obj = newSidebar(windowId);
	  // Start private windows sidebar tracking, except if FF56 as we cannot track sidebar status in that version
	  if ((sidebarScanIntervalId == undefined) && !beforeFF57) {
		sidebarScanIntervalId = setInterval(scanSidebars, SidebarScanInterval);
	  }
	  sendResponse(
		{content: "savedUIState",
		 bnId: obj.bnId,
		 expMenu: obj.expMenu
		}
	   );
	}
	else if (msg.startsWith("getCurBNList")) {
	  let json = BN_serialize(curBNList[0]);
	  sendResponse(
		{content: "getCurBNList",
		 json: json,
		 countBookmarks: countBookmarks,
		 countFetchFav: countFetchFav,
		 countNoFavicon: countNoFavicon,
		 countFolders: countFolders,
		 countSeparators: countSeparators,
		 countOddities: countOddities,
		 mostVisitedBNId: mostVisitedBNId,
		 recentTagBNId: recentTagBNId, 
		 recentBkmkBNId: recentBkmkBNId,
		 bsp2TrashFldrBNId: bsp2TrashFldrBNId,
		 canUndo: (curHNList.activeIndex != undefined),
		 canRedo: (curHNList.undoList.length > 0)
		}
	  );
	  json = undefined;
	}
	else if (msg.startsWith("getCurHNList")) {
	  let json = historyListSerialize(curHNList);
	  sendResponse(
		{content: "getCurHNList",
		 json: json
		}
	  );
	  json = undefined;
	}
	else if (msg.startsWith("getStats")) { // Asked to send stats only
	  sendResponse(
		{content: "getStats",
		 countBookmarks: countBookmarks,
		 countFetchFav: countFetchFav,
		 countNoFavicon: countNoFavicon,
		 countFolders: countFolders,
		 countSeparators: countSeparators,
		 countOddities: countOddities
		}
	  );
	}
	else if (ready && msg.startsWith("getBackground")) { // Asked to resend ready message .. if we are ready
	  sendResponse(
		{content: "Ready"		
		}
	  );
	}
	else if (msg.startsWith("recordHistoryMulti")) { // Record a multiple operation in hitory
	  let hn = recordHistoryMulti(request.operation, request.id_list, request.newParentId, request.newIndex);
	  sendResponse(
		{content: "recordHistoryMulti",
		 hnId: hn.id
		}
	  );
	}
	else { // Default response
	  sendResponse(
		{content: "Background response to "+request.source		
		}
	  );
	}
  }
  catch (error) {
	console.log("Error processing message: "+request.content);
	if (error != undefined) {
	  console.log("message:    "+error.message);
	  let fn = error.fileName;
	  if (fn == undefined)   fn = error.filename; // Not constant :-( Some errors have filename, and others have fileName 
	  console.log("fileName:   "+fn);
	  console.log("lineNumber: "+error.lineNumber);
//console.log("   keys: "+Object.keys(error));
//console.log("   values: "+Object.values(error));
	}
  }
}

/*
 * Called by browser action button click (if enabled)
 * tab: a tabs.Tab indicating the tab that was active when the icon was clicked
 */
function buttonClicked (tab) {
//console.log("Background received button click");
  let windowId = tab.windowId;
  // Can't use browser.sidebarAction.isOpen() here, as this is waiting for a Promise,
  // and so when it arrives we are not anymore in the code flow of a user action, so
  // the browser.sidebarAction.close() and browser.sidebarAction.open() are not working :-(
  // => Have to track state through other mechanisms to not rely on Promises ...
  if (isSidebarOpen[windowId] == true) {
//console.log("Sidebar is open. Closing.");
	browser.sidebarAction.close();
  }
  else {
//console.log("Sidebar is closed. Opening.");
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
  console.log("Install event reason: "+details.reason+" - Temporary: "+details.temporary);
  if (details.reason == "install") {
	justInstalled = true;
  }
  else {
	justInstalled = false;
  }
  gis_resolve(justInstalled);
}

/*
 * Serially process list of conversions (to avoid several requests overlapping with each other)
 *
 * Uses global variables cvt16x16ConvertList, cvt16x16Len, cvtUri and destCvtBnId
 */
let cvt16x16ConvertList = []; // A list of [bnId, uriToConvert]
let cvt16x16Len = 0;
let cvtUri;
let destCvtBnId;
function cvt16x16ImgProcess () {
  // Get first item in list and process it
  let item = cvt16x16ConvertList.shift();
  destCvtBnId = item[0]; // Remember it for 16x16 processing to come
  CvtImage.src = cvtUri = item[1]; // Start load and conversion
//trace("launched "+destCvtBnId);
}

/*
 * Add a conversion to the convert process, and start it if not running
 *
 * bnId = String, BookmarkNode id
 * uri = String, uri to convert
 * 
 *  Uses global variables cvt16x16ConvertList and cvt16x16Len
 */
function cvt16x16Add (bnId, uri) {
  cvt16x16ConvertList.push([bnId, uri]);
  cvt16x16Len++;
//trace("cvt16x16Len: "+cvt16x16Len);
  if (cvt16x16Len == 1) { // Convert process was not running
//trace("process start");
	cvt16x16ImgProcess(); // Start it
  }
}

/*
 * Convert and store image in 16x16, triggered by end of CvtImage.src load
 * 
 * Uses global variables cvtUri and destCvtBnId
 */
function convertOnLoad () {
//console.log("finished "+destCvtBnId);
  let nh = CvtImage.naturalHeight;
  let nw = CvtImage.naturalWidth;
  let convertedUri;
//console.log("  nh,nw: "+nh+","+nw);
  if ((nh > 0) && (nw > 0) && ((nh != 16) || (nw != 16))) {
//console.log("converting");
	try {
	  if ((nh > 16) && (nw > 16)) { // Downscale and get URI
//console.log("  downscale");
		// Get ImageData.data of the image
		let srcIDData;
		CvtCanvas2.height = nh;
		CvtCanvas2.width = nw;
		CvtCtx2.drawImage(CvtImage, 0, 0);
		srcIDData = CvtCtx2.getImageData(0, 0, nw, nh).data;

		// Downscale into CvtImageData .. avoid FF canvas native algo, not really good
		downscaleImg(srcIDData, CvtIDData, nh, nw);

		// Put CvtImage into CvtCtx and get base64 uri
		CvtCtx.putImageData(CvtImageData, 0, 0);
		convertedUri = CvtCanvas.toDataURL();
//console.log("  convertedUri: "+convertedUri);
	  }
	  else { // Only get URI
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
	    )
	    .catch(...);
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
//console.log("No rescale: "+nh+","+nw+" for "+CvtImage.src.substr(0,50)+" - "+destCvtBnId);
	convertedUri = cvtUri;
  }

  // Save new favicon if different from previous
//console.log("  converted uri: "+convertedUri);
  let BN = curBNList[destCvtBnId];
  if ((BN != undefined)						// Protection against BN deleted meanwhile ..
	  && (BN.faviconUri != convertedUri)) {
//console.log("  different from previous uri: "+BN.faviconUri);
	BN.faviconUri = convertedUri;
	BN.fetchedUri = true;
	historyListUpdateFaviconUri(curHNList, destCvtBnId, convertedUri);
	saveBNList();

	// Signal to sidebars
	sendAddonMsgFavicon(destCvtBnId, convertedUri);
  }

  // If more to process in the list, continue on it
  if (--cvt16x16Len > 0) {
	cvt16x16ImgProcess();
  }
}

/*
 * Set favicon on bookmark after migrating to 16x16
 */
function setFavicon (bnId, uri) {
//trace("BN.id: "+bnId+" index: "+row.rowIndex+" Row id: "+row.dataset.id);
//console.log("setFavicon for: "+bnId+" uri: "+uri);

  // Special handling for x-icons, which are libraries of icons, not well handled
  // by Canvas 2d context drawImage(), since it takes only the first icon in the library.
  // Verify if this is an x-icon by header .. because the mime type is not always reliable !!
  let newUri = selectXIconImg(uri);
  // If it is an x-icon and there was more than 1, go with selected image, else go with initial uri
  if (newUri == null) {
	newUri = uri;
  }
  // Go with new favicon conversion only if different from previous record
  let BN = curBNList[bnId];
  if (BN == undefined) { // Desynchro !! => reload bookmarks from FF API
	reloadFFAPI(true);
  }
  else {
	let lastUri = BN.faviconUri;
	if (lastUri != newUri) {
//console.log("  different uri: "+newUri);
	  if ((lastUri == "/icons/nofavicontmp.png") && (countFetchFav > 0))
		countFetchFav--;
	  else if ((lastUri == "/icons/nofavicon.png") && (countNoFavicon > 0))
		countNoFavicon--;
	  cvt16x16Add(bnId, newUri);
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
}

/*
 * Set Favicon on screen to waiting its new value
 *
 * bnId is BookmarktreeNode id string
 */
function setWaitingFavicon (bnId) {
//console.log("bnId: "+bnId+" set to waiting");

  let BN = curBNList[bnId];
  let uri = BN.faviconUri;
  if ((uri == "/icons/nofavicontmp.png") && (countFetchFav > 0))
	countFetchFav--;
  else if ((uri == "/icons/nofavicon.png") && (countNoFavicon > 0))
	countNoFavicon--;

  uri = "/icons/waiting.gif";
  BN.faviconUri = uri;
  BN.fetchedUri = false;
  // Keep waiting image in memory only, do not save (it has the temporary one on disk anyway)
  // nor add to history

  // Signal to sidebars
  sendAddonMsgFavicon(bnId, uri);
}

/*
 * Set Favicon on screen to nofavicon.png
 *
 * bnId is BookmarktreeNode id string
 */
function setNoFavicon (bnId) {
  // Save new favicon, if different from previous record
  let BN = curBNList[bnId];
  let uri;
  let increment = 0;
  if (BN.url.toLowerCase().endsWith(".pdf")) { // In case we got a bookmark to PDF without favicon
	uri = "/icons/pdffavicon.png";
  }
  else {
	uri = "/icons/nofavicon.png";
	increment = 1;
  }
  let lastUri = BN.faviconUri;
  if (lastUri != uri) {
	if ((lastUri == "/icons/nofavicontmp.png") && (countFetchFav > 0))
	  countFetchFav--;
	countNoFavicon += increment;
	BN.faviconUri = uri;
	BN.fetchedUri = false;
	historyListUpdateFaviconUri(curHNList, bnId, uri);
	saveBNList();

	// Signal to sidebars
	sendAddonMsgFavicon(bnId, uri);
  }
}

/*
 * Error on loading the image to convert, triggered by error when loading CvtImage.src
 * 
 * Uses global variable destCvtBnId
 */
function errorCvtOnLoad (error) {
  let title = curBNList[destCvtBnId].title;
  console.log("errorCvtOnLoad: "+error.type+" for "+cvtUri.substr(0,50)+" - "+destCvtBnId+" - "+title);
  setNoFavicon(destCvtBnId);

  // If more to process in the list, continue on it
  if (--cvt16x16Len > 0) {
	cvt16x16ImgProcess();
  }
}

/*
 * Favicon background retrieval process (called from favicon.js)
 *
 * e is of type MessageEvent, containing a [bnId, uri]
 */
function asyncFavicon (e) {
  let bnId = e.data[0]; // Id of BookmarkNode
  let uri = e.data[1]; // String
  let BN = curBNList[bnId];
  if (BN == undefined) // The bookmark was deleted meanwhile ... so just skip it, do nothing
	return;

//console.log("Async uri received for BN.id: "+bnId+" url: "+BN.url+" uri: <<"+uri.substr(0,50)+">>");

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

/*
function errorFavicon (e) {
  console.log('There is an error with faviconWorker !'+e.type);
  console.log(Object.keys(e));
  console.log(Object.values(e));
}

function msgerrorFavicon () {
  console.log('There is a message deserialization error with faviconWorker !');
}
*/

/*
 * Trigger re-fetch all unsucessful favicons, that is all the non protected ones which are nofavicon
 */
function refetchFav () {
console.log("Trigerring re-fetch of all unsuccessful favicons");
  scanFavBNTree(rootBN, faviconWorkerPostMessage, setFavicon);
  countNoFavicon = 0;
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
//console.log("Rescaling: "+destImg.src.substr(0,50)+" - "+row.firstElementChild.firstElementChild.title);
			  // Special handling for x-icons, which are libraries of icons, not well handded
			  // by Canvas 2d context drawImage(), since it takes only the first icon in the librrary.
			  // Verify if this is an x-icon by header .. because the mime type is not always reliable !!
			  let uri = destBn.faviconUri;
			  migrUri = selectXIconImg(uri);
			  if (migrUri != null) { // It is an x-ixon and there was more than 1, go with selected image
//console.log("  go with selected uri: "+migrUri);
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
		let BN = curBNList[destBnId];
		BN.faviconUri = migratedUri;
		BN.fetchedUri = true;
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
 * inBSP2TRash (optional) = Boolean, true is inside BSP2 trash, else undefined/false
 * 
 * Return created BookmarkNode tree
 */
//let countDuplicates = 0;
function buildTree (BTN, level, inBSP2Trash = undefined) {
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
  if (inBSP2Trash == true) { // Set flag on the BN + a trashDate corresponding to now
	node.inBSP2Trash = true;
	node.trashDate = (new Date ()).getTime();
  }
  if (BTN_id == bsp2TrashFldrBNId) { // Added BN was recognized as the BSP2 trash
	inBSP2Trash = true; // Propagate corresponding attribute to all children of it
  }

  // If there are children, recursively build them
  if (beforeFF57) {
	if (node.type == "folder") {
	  let btnChildren = BTN.children;
	  if (btnChildren != undefined) {
		let children = node.children;
		let j = 0;
		let index, id;
		let i;
		let len = btnChildren.length;
		for (let k=0 ; k<len ; k++) {
		  i = btnChildren[k];
		  index = i.index; 
		  while (j < index) {
			id = "separator" + countSeparators;
			children[j++] = new BookmarkNode (id, "separator", level+1, BTN_id, 0,
											  ((countSeparators++ == 0) ? true : false)
											 );
		  }
		  children[j++] = buildTree(i, level+1, inBSP2Trash);
		}
	  }
	}
  }
  else {
	if (node.type == "folder") {
	  let btnChildren = BTN.children;
	  if (btnChildren != undefined) {
		let children = node.children; // Array of proper length was created by BN_create
		let len = btnChildren.length;
		for (let j=0 ; j<len ; j++) {
		  children[j] = buildTree(btnChildren[j], level+1, inBSP2Trash);
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
 *       And when using getSubTree(id) to get more on BTN children, since getSubTree() can be
 *       quite long, it frequently happened that children were starting to process while still
 *       processing the parent folder (thanks to the Promise mechanism), and were processed faster than their
 *       parent, so their getSubTree() result arrived before the one of their parent.
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
//let t1 = (new Date()).getTime();
//trace(t1+" Create event on: "+id+" type: "+BTN.type+" parentId: "+parentId+" index: "+index);

  // Create the new BN tree and insert it under its parent + maintain inBSP2Trash and trashDate fields
  let inBSP2Trash = options.trashEnabled && parentBN.inBSP2Trash;
  let BN = buildTree(BTN, parentBN.level+1, inBSP2Trash); // This creates the new nodes
  BN_insert(BN, parentBN, index); // This places them in the tree

  // Create a new HistoryNode for it, and pass it to the CreateHistQueue mechanism for recognition (or not)
  // and proper addition to the HistoryList
/*
  historyListAdd(curHNList, HNACTION_BKMKCREATE,
	  			 false, undefined, id, BTN.type, BN_aPath(parentId), parentId, index,
	  			 BTN.title, BN.faviconUri, BTN.url, inBSP2Trash);
*/
  let HN = new HistoryNode(HNACTION_BKMKCREATE,
  						   false, undefined, id, BTN.type, BN_aPath(parentId), parentId, index,
  						   BTN.title, BN.faviconUri, BTN.url, inBSP2Trash);
  curCreateHistQueue.receivedCreateEvent(id, BN, HN);
   
  // Save new current info
  saveBNList();
  // Refresh BSP2 toolbar icon in active tabs
  refreshActiveTabs(BN, false);

  // If we received the creation of the BSP2 trash folder, then rebuild pointer
  // and tell open sidebars before they are notified of its creation, to recognize it
  if (id == bsp2TrashFldrBNId) {
	bsp2TrashFldrBN = BN;
	// Notify open sidebars of new id
	sendAddonMsgComplex({
	  source: "background",
	  content: "bsp2TrashFldrBNId",
	  bnId: bsp2TrashFldrBNId
	});
  }

  // Signal to sidebars to make them display it (must work with Private window sidebars
  // also, which have their own separate copy of curBNList).
  sendAddonMsgComplex({
	source: "background",
	content: "bkmkCreated",
	newtree: BN_serialize(BN),
	index: index
  });

  // If we receive creation of the Recently bookmarked special folder (typically on restore bookmarks),
  // then rebuild pointer
  // -> Cannot detect it otherwise since FF does not support bookmarks.onImportBegan and onImportEnded
  //    (but Chrome does)
  // Note on complete bookmark restore = the FF process appears to be as follows:
  // - Delete of all bookmark items at level 2, under Bppkùarks Toolbar, Bookkmarks Menu, Other Bookmarks ..
  //   (no delete of lower ones, they get included by the level 2 deleted folders).
  // - Then re-create of all bookmarks one by one. This includes the special folders like Most Visited,
  //   Recent Tags or Recently Bookmarked.
  if (id == recentBkmkBNId) {
	recentBkmkBN = BN;
	// Notify open sidebars of (possibly new) id
	sendAddonMsgComplex({
	  source: "background",
	  content: "recentBkmkBNId",
	  bnId: recentBkmkBNId
	});
  }
  // Refresh list of recent bookmarks (always)
  triggerRecentRefreshBkmks();

  // If we receive creation of the Most recent special folder (typically on restore bookmarks),
  // then rebuild pointer and refresh its content also
  if (id == mostVisitedBNId) {
	mostVisitedBN = BN;
	triggerRefreshMostVisited();
	// Notify open sidebars of (possibly new) id
	sendAddonMsgComplex({
	  source: "background",
	  content: "mostVisitedBNId",
	  bnId: mostVisitedBNId
	});
  }

  // If we receive creation of the Recent tags special folder (typically on restore bookmarks),
  // then rebuild pointer
  if (id == recentTagBNId) {
	recentTagBN = BN;
	// Notify open sidebars of (possibly new) id
	sendAddonMsgComplex({
	  source: "background",
	  content: "recentTagBNId",
	  bnId: recentTagBNId
	});
  }
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
  let parentId = removeInfo.parentId;
//console.log("Remove event on: "+id+" from "+parentId+" title: <<"+removeInfo.node.title+">> type: "+removeInfo.node.type);
  // Remove item and its children from curBNList
  let BN = curBNList[id];
  if (BN == undefined) { // Desynchro !! => reload bookmarks from FF API
	// Record action sent to us at source of detecting the problem
	let btn = removeInfo.node;
	// Try to rebuild some other info
	let parentBN = curBNList[parentId];
	let is_inBSP2Trash = ((parentBN == undefined) ? false : parentBN.inBSP2Trash); // Imperfect ..
	historyListAdd(curHNList, HNACTION_BKMKREMOVE_DESYNC,
				   false, undefined, id, btn.type,
				   (parentBN == undefined) ? undefined : BN_aPath(parentId), parentId, removeInfo.index,
				   btn.title,
				   historyListSearchFaviconUri(curHNList, id, btn), btn.url, is_inBSP2Trash);
	reloadFFAPI(true);
  }
  else {
	// Record action
	let type = BN.type;
	historyListAdd(curHNList, HNACTION_BKMKREMOVE,
				   false, undefined, id, type, BN_aPath(parentId), parentId, removeInfo.index,
				   BN.title, BN.faviconUri, BN.url, BN.inBSP2Trash, BN_serialize(BN),
				   undefined, undefined, undefined, undefined, undefined,
				   (type == "folder") ? BN_childIds(BN) : undefined // To increase chances to find childIds in case of desynchro
				  );
	// Refresh BSP2 toolbar icon in active tabs
	refreshActiveTabs(BN, true);

	BN_delete(BN, parentId);

	// Save new current info
	saveBNList();

	// Signal to sidebars to make them remove things from display (must work with Private window sidebars
	// also, which have their own separate copy of curBNList).
	sendAddonMsgComplex({
	  source: "background",
	  content: "bkmkRemoved",
	  bnId: id
	});

	// Refresh list of recent bookmarks
	triggerRecentRefreshBkmks();
  }
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
  let cTitle = changeInfo.title;
  let cUrl = changeInfo.url;
//trace("Change event on: "+id+" title: <<"+cTitle+">> url: "+cUrl);
  // Retrieve the real BookmarkNode for complete information
  let BN = curBNList[id];

  if (BN == undefined) { // Desynchro !! => reload bookmarks from FF API
	// Retrieve info we do not have anymore
	browser.bookmarks.get(id)
	.then(
	  function (a_BTN) {
		// Record action sent to us at source of detecting the problem
		let BTN = a_BTN[0];
		let parentId = BTN.parentId;
		// Try to rebuild some info
		let parentBN = curBNList[parentId];
		let is_inBSP2Trash = ((parentBN == undefined) ? false : parentBN.inBSP2Trash); // Imperfect ..
		historyListAdd(curHNList, HNACTION_BKMKCHANGE_DESYNC,
					   false, undefined, id, BTN.type,
					   (parentBN == undefined) ? undefined : BN_aPath(parentId), parentId, BTN.index,
					   // Can't know the old title and url values !!! Hopefully, they will be sooner in the past history
					   historyListSearchTitle(curHNList, id),
					   historyListSearchFaviconUri(curHNList, id, BTN),
					   historyListSearchUrl(curHNList, id),
					   is_inBSP2Trash,
					   undefined,
					   undefined, undefined, undefined, cTitle, cUrl);
		reloadFFAPI(true);
	  }
	);
  }
  else {
	let oTitle = BN.title;
	let oUrl = BN.url;
	// Update BookmarkNode contents and fetch new favicon if needed
	if (cTitle != undefined) // Did change
	  BN.title = cTitle;
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
		countNoFavicon++;
	  }
	  else if (options.disableFavicons) {
		BN.faviconUri = undefined;
	  }
	  else {
		// Trigger asynchronous favicon retrieval process in background
		BN.faviconUri = "/icons/nofavicontmp.png";
		countFetchFav++;
		// This is a bookmark, so here no need for cloneBN(), there is no tree below
//		faviconWorker.postMessage(["get2", id, cUrl, options.enableCookies]);
		faviconWorkerPostMessage({data: ["get2", id, cUrl, options.enableCookies]});
	  }
	  BN.fetchedUri = false;
	}

	// Record action
	let type = BN.type;
	let uri = BN.faviconUri;
	let parentId = BN.parentId;
	historyListAdd(curHNList, HNACTION_BKMKCHANGE,
				   false, undefined, id, type, BN_aPath(parentId), parentId, BN_getIndex(BN),
				   oTitle, uri, oUrl, BN.inBSP2Trash, undefined,
				   undefined, undefined, undefined, cTitle, cUrl,
				   (type == "folder") ? BN_childIds(BN) : undefined // To increase chances to find childIds in case of desynchro
				  );
	// Save new values
	saveBNList();
	// Refresh BSP2 toolbar icon in active tabs
	refreshActiveTabs(BN, false);

	// Signal to sidebars to make them change things on display (must work with Private window sidebars
	// also, which have their own separate copy of curBNList).
	sendAddonMsgComplex({
	  source: "background",
	  content: "bkmkChanged",
	  bnId: id,
	  isBookmark: (BN.type == "bookmark"),
	  title: BN.title,
	  url: BN.url,
	  uri: uri
	});
  }
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
  let curParentId = moveInfo.oldParentId;
  let targetParentId = moveInfo.parentId;
  let targetIndex = moveInfo.index;
//trace("Move event on: "+id+" from: <<"+curParentId+", "+moveInfo.oldIndex+">> to: <<"+targetParentId+", "+targetIndex+">>");

  // Retrieve the real BookmarkNode and all its children, and its new parent
  let BN = curBNList[id];
  if (BN == undefined) { // Desynchro !! => reload bookmarks from FF API
	// Retrieve info we do not have anymore
	browser.bookmarks.get(id)
	.then(
	  function (a_BTN) {
		// Record action sent to us at source of detecting the problem
		let BTN = a_BTN[0];
		// Try to rebuild some info
		let curParentBN = curBNList[curParentId];
		let was_inNSP2Trash = ((curParentBN == undefined) ? false : curParentBN.inBSP2Trash); // Imperfect ..
		let targetParentBN = curBNList[targetParentId];
		let is_inBSP2Trash = ((targetParentBN == undefined) ? false : targetParentBN.inBSP2Trash); // Imperfect ..
		historyListAdd(curHNList,
					   ((is_inBSP2Trash && !was_inNSP2Trash)
						? HNACTION_BKMKREMOVETOTRASH_DESYNC
						: ((was_inNSP2Trash && !is_inBSP2Trash)
						   ? HNACTION_BKMKCREATEFROMTRASH_DESYNC
						   : HNACTION_BKMKMOVE_DESYNC // Note: a move inside trash is a move, not moveto/createfrom rtash
						  )
					   ),
					   false, undefined, id, BTN.type,
					   (curParentBN == undefined) ? undefined : BN_aPath(curParentId), curParentId, moveInfo.oldIndex,
					   BTN.title, historyListSearchFaviconUri(curHNList, id, BTN), BTN.url, is_inBSP2Trash, undefined,
					   (targetParentBN == undefined) ? undefined : BN_aPath(targetParentId), targetParentId, targetIndex
					  );
		reloadFFAPI(true);
	  }
	);
  }
  else {
	let targetParentBN = curBNList[targetParentId];

	// Remove item and its children from its current parent, but keep them in list
	// as this is only a move.
	BN_delete(BN, curParentId, false);
	// Then insert it at new place, again not touching the list
	let is_curInBSP2Trash = (BN.inBSP2Trash == true); // Remember current trash state
	let is_tgtInBSP2Trash = (targetParentBN.inBSP2Trash == true);
	// Maintain inBSP2Trash and trashDate fields
	BN_markTrash(BN, is_tgtInBSP2Trash);
	BN_insert(BN, targetParentBN, targetIndex, false);

	// Record action
	let type = BN.type;
	let action = ((is_tgtInBSP2Trash && !is_curInBSP2Trash)
				  ? HNACTION_BKMKREMOVETOTRASH
				  : ((is_curInBSP2Trash && !is_tgtInBSP2Trash)
					? HNACTION_BKMKCREATEFROMTRASH
					: HNACTION_BKMKMOVE // Note: a move inside trash is a move, not moveto/createfrom rtash
				  )
				 );
	historyListAdd(curHNList, action,
				   false, undefined, id, type, BN_aPath(curParentId), curParentId, moveInfo.oldIndex,
				   BN.title, BN.faviconUri, BN.url, BN.inBSP2Trash,  // To increase chances to find last title or url in case of desynchro
				   is_tgtInBSP2Trash ? BN_serialize(BN) : undefined, // In case of later disappearance through BSP2 trash removal ..
				   BN_aPath(targetParentId), targetParentId, targetIndex, undefined, undefined,
				   (type == "folder") ? BN_childIds(BN) : undefined // To increase chances to find childIds in case of desynchro
				  );
	// Save new values
	saveBNList();
	if (is_tgtInBSP2Trash) {
	  // Refresh BSP2 toolbar icon in active tabs
	  refreshActiveTabs(BN, true);
	}

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
}

/*
 * Handle bookmark reordered event
 *
 * id = string. ID of the folder whose children were reordered.
 * reorderInfo = an object containing info about the reordered item.
 *   {childIds: array of string. Array containing the IDs of all the bookmark items in this folder,
 *              in the order they now appear in the UI. 
 *   }
 * recHistory = Boolean, true when called by handler (default value)
 */
function bkmkReorderedHandler (id, reorderInfo, recHistory = true) {
  let childIds = reorderInfo.childIds;
//trace("Reorder event on: "+id);

  // We need the BN to get real info
  let folderBN = curBNList[id];

  if (folderBN == undefined) { // Desynchro !! => reload bookmarks from FF API
	if (recHistory) {
	  // Retrieve info we do not have anymore
	  browser.bookmarks.get(id)
	  .then(
		function (a_BTN) {
		  // Record action sent to us at source of detecting the problem
		  let BTN = a_BTN[0];
		  let parentId = BTN.parentId;
		  // Try to rebuild some info
		  let parentBN = curBNList[parentId];
		  let is_inBSP2Trash = ((parentBN == undefined) ? false : parentBN.inBSP2Trash); // Imperfect ..
		  historyListAdd(curHNList, HNACTION_BKMKMOVE_DESYNC,
			  			 false, undefined, id, "folder",
			  			 (parentBN == undefined) ? undefined : BN_aPath(parentId), parentId, BTN.index,
			  			 BTN.title,
			  			 historyListSearchFaviconUri(curHNList, id, BTN),
			  			 undefined, is_inBSP2Trash, undefined, // This is a folder => no URL
			  			 undefined, undefined, undefined, undefined, undefined,
			  			 // Can't know the old childIds value !!! Hopefully, it will be sooner in the past history
			  			 historyListSearchChildIds(curHNList, id),
			  			 childIds
		  				);
		  reloadFFAPI(true);
		}
	  );
	}
	else {
	  reloadFFAPI(true);
	}
  }
  else {
	// Delete all children of folderBN, if any (no cleanup)
	if (folderBN.children != undefined) {
	  // Create a new array with all children of folderBN in new order
	  let len = childIds.length;
	  let children = folderBN.children = new Array (len); // Start new list from scratch, discarding the old one
	  for (let i=0 ; i<len ; i++) {
		children[i] = curBNList[childIds[i]];
	  }

	  if (recHistory) {
		// Record action
		let parentId = folderBN.parentId;
		historyListAdd(curHNList, HNACTION_BKMKREORDER,
					   false, undefined, id, "folder", BN_aPath(parentId), parentId, BN_getIndex(folderBN),
					   folderBN.title, folderBN.faviconUri, undefined, BN.inBSP2Trash, undefined, // To increase chances to find last title and favicon in history when searching for it
					   undefined, undefined, undefined, undefined, undefined,
					   BN_childIds(folderBN), childIds
					  );
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
  }
}

/*
 * Identify cases where we will get no collectable favicon from a tab faviconUrl
 *
 * faviconUrl: String, URL to favicon
 * tabUrl: String, URL of tab
 *
 * Returns: Boolean, true is not collectable.
 */
function is_notCollectableFaviconFromTab (tabFaviconUrl, tabUrl) {
  // Verify this is a collectable favicon
  let is_nofavicon = (tabFaviconUrl == undefined)
  					 || (tabFaviconUrl.startsWith("chrome://global/skin/icons/")) // Internal icon, we can't fetch it, security error
					 || (tabUrl.startsWith("moz-extension://"))
					 || (tabUrl.startsWith("about:"))
					 || (tabUrl.startsWith("data:"))
					 || (tabUrl.startsWith("file:"))
					 || (tabUrl.startsWith("blob:"))
					 ;
  return(is_nofavicon);
}

/*
 * Set favicon from a collected faviconUrl
 *
 * bnId: String, bookmark Id
 * is_noFavicon: Boolean, indicate a non collectable favicon case
 * faviconUrl: String, URI/URL to favicon
 */
function setCollectedFavicon (bnId, is_nofavicon, faviconUrl) {
// Since a BN create calls favicon refresh worker in background, don't do direct "data:" URLs now,
// leave a chance for it to happen after the favicon fetch by queueing it behind.
/*
  if (faviconUrl.startsWith("data:")) { // Cool, already in good format for us !
	setFavicon(bnId, faviconUrl);
//console.log("Directly set favicon: "+faviconUrl);
  }
  else {
*/
	if (is_nofavicon) {
	  setNoFavicon(bnId);
//console.log("Set no favicon: "+faviconUrl);
	}
	else { // Fetch favicon
	  // Presumably a bookmark, so no need for cloneBTN(), there is no tree below
//	  faviconWorker.postMessage(["iconurl", bnId, tabFaviconUrl, options.enableCookies]);
	  faviconWorkerPostMessage({data: ["iconurl", bnId, faviconUrl, options.enableCookies]});
//console.log("Retrieval demand sent for favicon: "+faviconUrl);
	}
/*
  }
*/
}

/*
 * Find if the URL of a given tab corresponds to a BN tree. Recursve.
 *
 * tab: tabs.Tab
 * BN: BookmarkNode (tree)
 *
 * Returns the first BN corresponding to the URL, or undefined.
 */
function refreshBTNTreeFavicon (BN, tabFaviconUrl, tabUrl, is_refreshFav, is_nofavicon) {
  let foundBN = undefined;
  if (BN.url == tabUrl) {
	if (!BN.inBSP2Trash) { // REturn only when not in trash
	  foundBN = BN;
	}
//console.log("Matching BN.id: "+BN.id+" "+BN.url);
	// Load the favicon as a data: URI
	if (is_refreshFav) {
//console.log("Refreshing its faviconUrl");
	  setCollectedFavicon(BN.id, is_nofavicon, tabFaviconUrl)
	}
  }
  else {
	let children = BN.children;
	if (children != undefined) {
	  let len = children.length;
	  let tmpBN;
	  for (let i=0 ; i<len ; i++) {
		tmpBN = refreshBTNTreeFavicon(children[i], tabFaviconUrl, tabUrl, is_refreshFav, is_nofavicon);
		if ((foundBN == undefined) && (tmpBN != undefined)) {
		  foundBN = tmpBN;
		}
	  }
	}
  }
  return(foundBN);
}
 
/*
 * When a bookmark is created, modified or deleted, update BSP2 icon accordingly in all open FF windows
 *
 * BN: BookmarkNode (can be a tree)
 * is_deleted: Boolean, true is BN was deleted, else false (meaning BN still exists)
 */
let baFoundBN_id = {}; // Global variable set by tabSwitched and tabModified to remember the bookmark found matching current tab.
					   // Uesd bu onShownContextMenuHandler() on context menu on BSP2 toolbar icon.
					   // Indexed by windowId, and contains the BN.id of corresponding active tab in that window 
function refreshActiveTabs (BN, is_deleted) {
  browser.tabs.query({active: true})
  .then(
	function (a_tabs) {
	  let len = a_tabs.length;
	  let tab, tabUrl, tabFaviconUrl, is_refreshFav, is_nofavicon, foundBN;
	  for (let i=0 ; i<len ; i++) {
		tab = a_tabs[i];
		tabUrl = tab.url;
		if ((tabUrl != undefined)
			&& (!tabUrl.startsWith("view-source:"))
		   ) {
		  // Handle specific wyciwyg:// case
		  if (tabUrl.startsWith("wyciwyg://")) { // Cached URL wyciwyg://x/....    Cf. https://en.wikipedia.org/wiki/WYCIWYG
			// Find start of real URL, which is after the first "/" after "wyciwyg://x"
			let pos = tabUrl.indexOf("/", 10) + 1;
			tabUrl = tabUrl.substring(pos);
		  }
		  tabFaviconUrl = tab.favIconUrl;
		  is_refreshFav = !options.disableFavicons		  // Ignore if options.disableFavicons is set
/*						  && !options.pauseFavicons	  // Ignore if options.pauseFavicons is set */
						  && (!is_deleted || options.trashEnabled) // Ignore if really deleting bookmarks
						  && (tabFaviconUrl != undefined) // Need a favicon URI
						  ;
		  is_nofavicon = is_notCollectableFaviconFromTab(tabFaviconUrl, tabUrl);
		  foundBN = refreshBTNTreeFavicon(BN, tabFaviconUrl, tabUrl, is_refreshFav, is_nofavicon);
		  if (foundBN != undefined) {
			if (!is_deleted) {
			  baFoundBN_id[tab.windowId] = foundBN.id;
			  browser.browserAction.setIcon(
				{path: "icons/star2bkmked.png",
				 tabId: tab.id
				}
			  );
			}
			else {
			  baFoundBN_id[tab.windowId] = undefined;
			  browser.browserAction.setIcon(
				{tabId: tab.id
				}
			  );
			}
		  } // Else do not touch BSP2 icon for that tab
		}
	  }
	}
  );
} 

/*
 * Refresh array of BTNs with a tab faviconUrl
 *
 * Returns: String, id of first BookmarkNode in the array matching the URL
 */
function refreshBTNArrayFavicon (a_BTN, len, tabFaviconUrl, tabUrl, is_refreshFav) {
  let foundBN_id = undefined;
  let is_nofavicon = is_notCollectableFaviconFromTab(tabFaviconUrl, tabUrl);
  let bnId;
  let BN;
  for (let i=0 ; i<len ; i++) {
	bnId = a_BTN[i].id;
	BN = curBNList[bnId];
	if (BN == undefined) { // Desynchro !! => reload bookmarks from FF API
	  reloadFFAPI(true);
	  break;
	}
	if (BN.url == tabUrl) { // Protection against too wide result because of Search workaround above
	  if (!BN.inBSP2Trash && (foundBN_id == undefined)) { // Keep only the first one not in trash
		foundBN_id = bnId;
	  }
//console.log("Matching BTN.id: "+bnId+" "+a_BTN[i].url+" foundBN_id: "+foundBN_id);
	  // Load the favicon as a data: URI
	  if (is_refreshFav) {
		setCollectedFavicon(bnId, is_nofavicon, tabFaviconUrl)
	  }
	}
  }
  return(foundBN_id);
}

/*
 * When a tab is switched to, verify its URL and if matching, get its favicon
 *
 * activeInfo. ID and Window of the tab that was switched to.
 */
function tabSwitched (activeInfo) {
  let tabId = activeInfo.tabId;
  let winId = activeInfo.windowId;
/*
  trace('-------------------------------------');
  trace("A tab was switched.\r\n"
	   +"activeInfo.previousTabId: "+activeInfo.previousTabId+"\r\n"
	   +"activeInfo.tabId: "+activeInfo.tabId+"\r\n"
	   +"activeInfo.windowId: "+winId+"\r\n"
	  );
*/
  browser.tabs.get(tabId)
  .then(
	function (tab) {
	  let tabUrl = tab.url;
	  // Verify this is a searchable url - If not, we get exception:
	  //   Type error for parameter query (Value must either: be a string value, or .url must match the format "url")
	  if ((tabUrl != undefined)
		  && (!tabUrl.startsWith("view-source:"))
		) {
		try {
		  // Handle specific wyciwyg:// case
		  if (tabUrl.startsWith("wyciwyg://")) { // Cached URL wyciwyg://x/....    Cf. https://en.wikipedia.org/wiki/WYCIWYG
			// Find start of real URL, which is after the first "/" after "wyciwyg://x"
			let pos = tabUrl.indexOf("/", 10) + 1;
			tabUrl = tabUrl.substring(pos);
		  }
		  // Look for a bookmark matching the url
		  // It seems that parameters can make the search API fail and return 0 results sometimes, so strip them out,
		  // we will really compare on gotten results.
		  let simpleUrl;
		  let paramsPos = tabUrl.indexOf("?");
		  if (paramsPos >= 0) {
			simpleUrl = tabUrl.slice(0, paramsPos);
		  }
		  else {
			simpleUrl = tabUrl;
		  }
//		  browser.bookmarks.search({url: tabUrl})
		  browser.bookmarks.search(decodeURI(simpleUrl)) // Search workaround to avoid exceptions on about:, file: ... URLs, cf. https://bugzilla.mozilla.org/show_bug.cgi?id=1352835
		  .then(
			function (a_BTN) { // An array of BookmarkTreeNode
			  let len = a_BTN.length;
//console.log("A tab was switched to 2 - tabUrl: "+tabUrl);
//console.log("Results: "+len);
			  if (len > 0) { // This could be a bookmarked tab
				// If there is a favicon and we are collecting them, refresh all coorresponding BookmarkNodes with it
				let tabFaviconUrl = tab.favIconUrl;
				let is_refreshFav = !options.disableFavicons		  // Ignore if options.disableFavicons is set
/*									&& !options.pauseFavicons	  // Ignore if options.pauseFaviconsis set */
									&& (tabFaviconUrl != undefined) // Need a favicon URI
									&& (tabUrl != "about:blank")  // Do not refresh about:blank bookmarks
									;
				let foundBN_id = refreshBTNArrayFavicon(a_BTN, len, tabFaviconUrl, tabUrl, is_refreshFav);
  				baFoundBN_id[winId] = foundBN_id; // Forget about previous found one
				// Show a bookmarked BSP2 star for this tab, if we found a corresponding bookmark not in BSP2 trash
				if (foundBN_id != undefined) {
				  browser.browserAction.setIcon(
					{path: "icons/star2bkmked.png",
					 tabId: tabId
					}
				  );
				}
				else { // Reset to unbookmarked BSP2 icon
				  browser.browserAction.setIcon(
					{tabId: tabId
					}
				  );
				}
			  }
			  else { // Reset to unbookmarked BSP2 icon
				baFoundBN_id[winId] = undefined;
				browser.browserAction.setIcon(
				  {tabId: tabId
				  }
				);
			  }
			}
		  );
		} catch (err) {
		  // Reset to unbookmarked BSP2 icon
		  baFoundBN_id[winId] = undefined;
		  browser.browserAction.setIcon(
			{tabId: tabId
			}
		  );

		  let msg = "Error in searching url "+tabUrl+" on tabModified : "+err;
		  console.log(msg);
		  if (err != undefined) {
			let fn = err.fileName;
			if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
			console.log("fileName:   "+fn);
			console.log("lineNumber: "+err.lineNumber);
		  }
		}
	  }
	  else { // Reset to unbookmarked BSP2 icon
		baFoundBN_id[winId] = undefined;
		browser.browserAction.setIcon(
		  {tabId: tabId
		  }
		);
	  }
	}
  );
}

/*
 * When a tab gets new contents, verify its URL and if matching, get its favicon + set BSP2 toolbar icon
 *
 * tabId integer. ID of the tab that was updated.
 * changeInfo object. Contains properties for the tab properties that have changed. See changeInfo below.
 * tab tabs.Tab. The new state of the tab.
 */
function tabModified (tabId, changeInfo, tabInfo) {
  let winId = tabInfo.windowId;
/*
  trace("-------------------------------------");
  trace("A tab was updated.\r\n"
	   +"tabId: "+tabId+"\r\n"
	   +"changeInfo.favIconUrl: "+changeInfo.favIconUrl+"\r\n"
	   +"changeInfo.status: "+changeInfo.status+"\r\n"
	   +"changeInfo.title: "+changeInfo.title+"\r\n"
	   +"changeInfo.url: "+changeInfo.url+"\r\n"
	   +"tabInfo.favIconUrl: "+tabInfo.favIconUrl+"\r\n"
	   +"tabInfo.index: "+tabInfo.index+"\r\n"
	   +"tabInfo.status: "+tabInfo.status+"\r\n"
	   +"tabInfo.title: "+tabInfo.title+"\r\n"
	   +"tabInfo.url: "+tabInfo.url+"\r\n"
	   +"winId: "+winId+"\r\n"
	  );
*/
  if (tabInfo.status == "complete") { // Sometomes we will get one or even two extra message(s) complete/undefined with favicon
									  // after a complete/complete with no favicon ..
//  if ((tabInfo.status == "complete") && (changeInfo.status == "complete")) {
	let tabUrl = tabInfo.url;
//console.log("A tab was updated 1 - tabUrl: "+tabUrl);
	// Verify this is a searchable url - If not, we would get the exception:
	//   Type error for parameter query (Value must either: be a string value, or .url must match the format "url")
	if ((tabUrl != undefined)
		&& (!tabUrl.startsWith("view-source:"))
	   ) {
	  try {
		// Handle specific wyciwyg:// case
		if (tabUrl.startsWith("wyciwyg://")) { // Cached URL wyciwyg://x/....    Cf. https://en.wikipedia.org/wiki/WYCIWYG
		  // Find start of real URL, which is after the first "/" after "wyciwyg://x"
		  let pos = tabUrl.indexOf("/", 10) + 1;
		  tabUrl = tabUrl.substring(pos);
		}
		// Look for a bookmark matching the url
		// It seems that parameters can make the search API fail and return 0 results sometimes, so strip them out,
		// we will really compare on returned results.
		let simpleUrl;
		let paramsPos = tabUrl.indexOf("?");
		if (paramsPos >= 0) {
		  simpleUrl = tabUrl.slice(0, paramsPos);
		}
		else {
		  simpleUrl = tabUrl;
		}
//		browser.bookmarks.search({url: tabUrl})
		browser.bookmarks.search(decodeURI(simpleUrl)) // Search workaround to avoid exceptions on about:, file: ... URLs, cf. https://bugzilla.mozilla.org/show_bug.cgi?id=1352835
		.then(
		  function (a_BTN) { // An array of BookmarkTreeNode
			let len = a_BTN.length;
/*
console.log("-------------------------------------");
console.log("A tab was updated 2 - tabUrl: "+tabUrl);
console.log("Results: "+len);
console.log("tabId: "+tabId+"\r\n"
			+"changeInfo.favIconUrl: "+changeInfo.favIconUrl+"\r\n"
			+"changeInfo.status: "+changeInfo.status+"\r\n"
			+"changeInfo.title: "+changeInfo.title+"\r\n"
			+"changeInfo.url: "+changeInfo.url+"\r\n"
			+"tabInfo.favIconUrl: "+tabInfo.favIconUrl+"\r\n"
			+"tabInfo.index: "+tabInfo.index+"\r\n"
			+"tabInfo.status: "+tabInfo.status+"\r\n"
			+"tabInfo.title: "+tabInfo.title+"\r\n"
			+"tabInfo.url: "+tabInfo.url+"\r\n"
			+"winId: "+winId+"\r\n"
		   );
*/
			if (len > 0) { // This could be a bookmarked tab
			  // If there is a favicon and we are collecting them, refresh all coorresponding BookmarkNodes with it
			  let tabFaviconUrl = tabInfo.favIconUrl;		  
//			  let chgFaviconUrl = changeInfo.favIconUrl;
//			  let chgStatus = changeInfo.status;
			  let is_refreshFav = !options.disableFavicons		  // Ignore if options.disableFavicons is set
/*								  && !options.pauseFavicons		  // Ignore if options.pauseFavicons is set */
								  && (tabFaviconUrl != undefined) // Need a favicon URI
								  && (tabUrl != "about:blank")    // For something else than about:blank, which appears intermitently when reloading a tab
																  // There was no favicon change, just a tab switch OR this is a tab reload with a new URL / favicon
//								  && (((chgFaviconUrl == undefined) && ((chgStatus == undefined) || (chgStatus == "complete")) && (changeInfo.title == undefined) && (changeInfo.url == undefined))
//									  || (chgFaviconUrl == tabFaviconUrl) 
//									 )
								  ;
			  let foundBN_id = refreshBTNArrayFavicon(a_BTN, len, tabFaviconUrl, tabUrl, is_refreshFav);
  			  baFoundBN_id[winId] = foundBN_id; // Forget about previous found one
			  // Show a bookmarked BSP2 star for this tab, if we found a corresponding bookmark not in BSP2 trash
			  if (foundBN_id != undefined) {
				browser.browserAction.setIcon(
				  {path: "icons/star2bkmked.png",
				   tabId: tabId
				  }
				);
			  }
			  else { // Reset to unbookmarked BSP2 icon
				browser.browserAction.setIcon(
				  {tabId: tabId
				  }
				);
			  }
			}
			else { // Reset to unbookmarked BSP2 icon
			  baFoundBN_id[winId] = undefined;
			  browser.browserAction.setIcon(
				{tabId: tabId
				}
			  );
			}
		  }
		);
	  } catch (err) {
		// Reset to unbookmarked BSP2 icon
		baFoundBN_id[winId] = undefined;
		browser.browserAction.setIcon(
		  {tabId: tabId
		  }
		);

		let msg = "Error in searching url "+tabUrl+" on tabModified : "+err;
		console.log(msg);
		if (err != undefined) {
		  let fn = err.fileName;
		  if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
		  console.log("fileName:   "+fn);
		  console.log("lineNumber: "+err.lineNumber);
		}
	  }
	}
	else { // Reset to unbookmarked BSP2 icon
	  baFoundBN_id[winId] = undefined;
	  browser.browserAction.setIcon(
		{tabId: tabId
		}
	  );
	}
  }
}

/*
 * When opening sidebar/popup.html, it gets added to the History.
 * Cf. https://developer.mozilla.org/en-US/Add-ons/WebExtensions/user_interface/Extension_pages
 * Let's delete it.
 */
function onVisited(historyItem) {
//trace("onVisited event: "+historyItem.url);
  let url = historyItem.url;
  if (url.startsWith(PopupURL)) {
	browser.history.deleteUrl({url: url});
  }
}

/*
 * Ask a particular BSP2 sidebar to show a particular bookmark
 * 
 * wId: id of window holding the open BSP2 sidebar
 * tabd: id of bookmarked tab
 * bnId: id of bookmark to show
 */ 
function panelShowBookmark (wId, tabId, bnId) {
//console.log("Showing "+bnId+" in BSP2 sidebar "+wId+" for tab "+tabId);
  if (isSidebarOpen[wId] == true) { // If open and ready, send message to show bnId
	sendAddonMsgShowBkmk(wId, tabId, bnId);
  }
  else { // Else, wait it is fully open when receiving newSidebar() callback above, to send it
	showInSidebarWId   = wId;
	showInSidebarTabId = tabId;
	showInSidebarBnId  = bnId;
  }
}

/*
 * Manage FF context menu integration - onShown event
 * 
 * info = menus.OnClickData object with addition of contexts and menuIds
 * tab = tabs.Tab details of the tab where the click took place (or undefined if none)
 */
let lastMenuBnId = undefined;
function onShownContextMenuHandler (info, tab) {
  let bnId = info.bookmarkId;
  let contexts = info.contexts;
  let is_onBkmk = false;
  let is_onBSP2Icon = false;
//  let is_inSidebar = (info.viewType == "sidebar"); // True if in any sidebar, except in natve Bookmark sidebar
  let len = contexts.length;
  let s;
  for (let i=0 ; i<len ; i++) {
	s = contexts[i];
	if (s == "bookmark") {
	  is_onBkmk = true;
	}
	else if (s == "browser_action") {
	  is_onBSP2Icon = true;
	}
  }
/*
let menuIds = info.menuIds;
console.log("menu shown on <"+bnId+"> with contexts=["+contexts+"] menuIds=["+menuIds+"]"
			+"\n menuItemId="+info.menuItemId+" pageUrl="+info.pageUrl+" targetElementId="+info.targetElementId+" viewType="+info.viewType
			+"\n tab="+(tab != undefined ? tab.id : "undefined")
			+"\n winId="+(tab != undefined ? tab.windowid : "undefined")
		   );
*/

  if (is_onBkmk && (bnId != undefined) && (bnId.length > 0)) {
	// Check if we are in BSP2 sidebar or not
//	let is_inBSP2Sidebar = false;
//	len = menuIds.length;
//	for (let i=0 ; i<len ; i++) {
//	  if (menuIds[i].includes("bsp2")) {
//		is_inBSP2Sidebar = true;
//		break;
//	  }
//	}
//	if (is_inBSP2Sidebar) { // Bookmark context menu inside BSP2 sidebar, make our Path menu invisible
//	  						// Rest of the menu is taken care of by the panel code
//	  hideFFContextMenu();
//	}
//	else { // Show Bookmark context menu outside of our sidebar
//console.log("show path: "+bnId);
	  showFFContextMenu(bnId);
//	}
  }
  else if (is_onBSP2Icon) { // Check if we should enable the "Show bookmark in sidebar.." submenu
    let winId = tab.windowId;
    let foundBN_id = baFoundBN_id[winId];
	if (foundBN_id != undefined) { // Enable the submenu
	  lastMenuBnId = foundBN_id; // Remember corresponding bnId for submenu action
	  enableBAShowBkmk();
	}
	else { // Disable submenu
	  disableBAShowBkmk();
	}
  }
}

/*
 * Manage FF context menu integration - onHidden event
 */ 
function onHiddenContextMenuHandler () {
  // Reset remembered bnId if any
  lastMenuBnId = undefined;
}

/*
 * Manage FF context menu integration - onClicked event
 * 
 * info = menus.OnClickData object
 * tab = tabs.Tab details of the tab where the click took place (or undefined if none)
 */
function onClickedContextMenuHandler (info, tab) {
  let menuItemId = info.menuItemId;
//console.log("menuItemId = "+menuItemId);
  if (menuItemId == SubMenuPathId) {
//console.log("SubMenuPathId clicked");
	let bnId =  info.bookmarkId;
	let BN = curBNList[bnId];
	openPropPopup("prop", bnId, BN_path(BN.parentId), BN.type, BN.title, BN.url);
  }
  else
  if (menuItemId == BAOpenTabId) {
//console.log("BAOpenTabId clicked, tab id = "+tab.id);
	// Open BSP2 in new tab, referred by this tab to come back to it when closing
	openBsp2NewTab(tab);
  }
  else if (menuItemId == BAShowInSidebar) {
//console.log("Show "+lastMenuBnId+" in BSP2 sidebar");
	if (lastMenuBnId != undefined) {
	  let windowId = tab.windowId;
	  // Can't use browser.sidebarAction.isOpen() here, as this is waiting for a Promise,
	  // and so when it arrives we are not anymore in the code flow of a user action, so
	  // the browser.sidebarAction.close() and browser.sidebarAction.open() are not working :-(
	  // => Have to track state through other mechanisms to not rely on Promises ...
	  if (isSidebarOpen[windowId] == true) { // Already open
		panelShowBookmark(windowId, tab.id, lastMenuBnId);
	  }
	  else { // Open the sidebar and send to it the message to display the bookmark 
		browser.sidebarAction.open()
		.then(panelShowBookmark(windowId, tab.id, lastMenuBnId));
	  }
	}
  }
  else if (menuItemId == BAHistory) {
	// Open Bookmark history window
	openBsp2History();
  }
  else if (menuItemId == BAOptionsId) {
	// Open BSP2 options
	browser.runtime.openOptionsPage();
  }
}

/*
 * Complete load of bookmarks table
 */
function completeBookmarks () {
  // Remove the faviconworker delay at start if nothing queued
//faviconWorker.postMessage(["nohysteresis"]);
  faviconWorkerPostMessage({data: ["nohysteresis"]});

  // Align BSP2 trash folder existence with option
  if (options.trashEnabled) { // If it should, create it if not already existing, else trim it
	createBSP2TrashFolder();
  }
  else { // Make sure it is removed
	removeBSP2TrashFolder();
  }

  // Get trimmed history
  if (savedHNList == undefined) {
	curHNList = new HistoryList ();
  }
  else {
	curHNList = savedHNList;
  }

  if (ready) { // If already ready, that means we were reloading the tree from FF API
	// Tell all sidebars to reload
	sendAddonMessage("reload");
  }
  else { // BSP2 start
	// Record start action
	historyListAdd(curHNList, HNACTION_BSP2START);

	// Setup event handlers for bookmark modifications
	browser.bookmarks.onCreated.addListener(bkmkCreatedHandler);
	browser.bookmarks.onRemoved.addListener(bkmkRemovedHandler);
	browser.bookmarks.onChanged.addListener(bkmkChangedHandler);
	browser.bookmarks.onMoved.addListener(bkmkMovedHandler);
	// onChildrenReordered doesn't seem implemented for now ... :-(
	// It appears to use a sequence of Move instead ...
	// See https://bugzilla.mozilla.org/show_bug.cgi?id=1319530 ??
	if (browser.bookmarks.onChildrenReordered != undefined) {
	  browser.bookmarks.onChildrenReordered.addListener(bkmkReorderedHandler);
	}

	// Watch for tabs switches and tabs loading new URL's .. if one matches one of our bookmarks,
	// then get the favicon from that tab when there is one, refresh our bookmarks table and saved storage
	// with it, and set BSP2 toolbar icon.
	browser.tabs.onActivated.addListener(tabSwitched);
	browser.tabs.onUpdated.addListener(tabModified);

	// Make sure sidebar/popup.html does not pollute history
	browser.history.onVisited.addListener(onVisited);

	// Signal we're ready
	ready = true;
	sendAddonMessage("Ready");

	// If we got so far, we can remove the backup version now, the next save will be on primary
	browser.storage.local.remove(["savedBNListBak", "fTimeBak"]);

	// Add BSP2 specific context menu / submenu on bookmarks, on sidebar and on browser action
	if (!beforeFF62) {
	  if (!beforeFF64) {
		createBSP2ContextMenu();
	  }
	  createFFContextMenu(); // Place it after BSP2 internam menu to show that also inside sidebar, but at end
	  createBAContextMenu();

	  // Note: this is called each time the context menu is appearing, not only on bookmarks.
	  //       Note however that it is not called at all when in bookmark sidebar or in library window before FF66
	  browser.menus.onShown.addListener(onShownContextMenuHandler);
	  browser.menus.onHidden.addListener(onHiddenContextMenuHandler);
		  
	  // Act on menu item clicked
	  browser.menus.onClicked.addListener(onClickedContextMenuHandler);
	}
  }

  // Save current info
  saveBNList();

  // If BNList migration was ongoing, complete it
  if (migration_bnlist) {
  	browser.storage.local.remove("savedBkmkUriList");
	structureVersion += VersionBNList;
	browser.storage.local.set({
	 structureVersion: structureVersion
	});
	migration_bnlist = false;
  }
  // If special folder migration was ongoing, complete it
  if (migration_spfldr) {
	structureVersion += VersionSpecialFldr;
	browser.storage.local.set({
	 structureVersion: structureVersion
	});
	migration_spfldr = false;
  }

  // Get latest topsites and recent bookmarks
  triggerRefreshMostVisited();
  triggerRecentRefreshBkmks();
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
  let i;
  let len = a_BTN.length;
  for (let j=0 ; j<len ; j++) {
	i = a_BTN[j];
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
//trace("storeAndConvertTree");
  endTreeLoadTime = (new Date ()).getTime();
  trace("(FF API) Tree load duration: "+(treeLoadDuration = (endTreeLoadTime - endLoadTime))+" ms", true);

  // Build the BookmarkNode tree
  let root = a_BTN[0]; // Id is "root________" and type is "folder"
//trace("Root: <<"+root.id+">>"+"<<"+root.title+">>"+"<<"+root.type+">>");
  rootBN = new BookmarkNode (root.id, "folder", -1, undefined, root.dateAdded, true);
  curBNList[0] = curBNList[root.id] = rootBN;
//  if (options.delayLoad) {
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
  if (child4 == undefined) {
	rootBN.children = [child1, child2, child3];
  }
  else {
	rootBN.children = [child1, child2, child3, child4];
  }
  endTreeBuildTime = (new Date ()).getTime();
  trace("Tree build duration: "+(treeBuildDuration = (endTreeBuildTime - endTreeLoadTime))+" ms", true);

  // Remember most recent and most visisted BookmarkNodes, and then complete things
  if (mostVisitedBNId != undefined)
	mostVisitedBN = curBNList[mostVisitedBNId];
  if (recentTagBNId != undefined)
	recentTagBN = curBNList[recentTagBNId]; 
  if (recentBkmkBNId != undefined)
	recentBkmkBN = curBNList[recentBkmkBNId];
  if (bsp2TrashFldrBNId != undefined)
	bsp2TrashFldrBN = curBNList[bsp2TrashFldrBNId];
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
  try {
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
	if (justInstalled || options.loadffapi || (savedBNList == undefined)) {
	  trace("(Loading from FF API)", true);
	  browser.bookmarks.getTree()
	  .then(storeAndConvertTree, onRejected)
	  .catch( // Asynchronous also, like .then
		function (err) {
		  let msg = "initialize2() error : "+err;
		  console.log(msg);
		  if (err != undefined) {
			let fn = err.fileName;
			if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
			console.log("fileName:   "+fn);
			console.log("lineNumber: "+err.lineNumber);
		  }
		}
	  );
	}
	else { // We got a full Bookmark node saved structure and we are on an add-on update or reload
	  // Use the saved structure as current one
	  curBNList = savedBNList;
	  endTreeLoadTime = (new Date ()).getTime();
	  bypassedFFAPI = true;
	  trace("(Bypass FF API) Tree load duration: "+(treeLoadDuration = (endTreeLoadTime - endLoadTime))+" ms", true);

	  // Scan tree to get stats and if we have still favicons to fetch, trigger that.
	  scanBNTree(rootBN, faviconWorkerPostMessage);
	  endTreeBuildTime = (new Date ()).getTime();
	  trace("Tree build duration: "+(treeBuildDuration = (endTreeBuildTime - endTreeLoadTime))+" ms", true);

	  completeBookmarks();
	}
  } catch (err) {
	let msg = "Error in initialize2() : "+err;
	console.log(msg);
	if (err != undefined) {
	  let fn = err.fileName;
	  if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
	  console.log("fileName:   "+fn);
	  console.log("lineNumber: "+err.lineNumber);
	}
  }
}

/*
 * Called when we receive the installation status
 */
function gotInstallStatus (isInstalled) {
  if (getInstallStatusTimerID != undefined) { // We got the value before timeout
	clearTimeout(getInstallStatusTimerID);
	getInstallStatusTimerID = undefined;
  }
  initialize2();
}

/*
 * Called when we time out on install status
 */
function noInstallStatus () { // Timeout, we will never get the install event, assume justInstalled = false
  console.log("No install event");
  getInstallStatusTimerID = undefined;
  justInstalled = false;
  gis_resolve(justInstalled);
}


/*
 * Main code:
 * ----------
*/

// General add-on events
browser.runtime.onInstalled.addListener(handleInstall);

// Watch for sidebar/options script messages from start
browser.runtime.onMessage.addListener(handleAddonMessage);

// Get our version number and show the browser action button if option is set
browser.management.getSelf()
.then(
  function (extensionInfo) {
	selfName = extensionInfo.name;
	let version = extensionInfo.version;
//	let title1 = selfName;
	let title2 = selfName + "\nv" +version;

	// Disable the toolbar button in FF56, it is useless ..
	if (beforeFF57) {
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
startTime = (new Date ()).getTime();
readFullLStore(false, trace)
.then(
  function () {
	// Shortcut workaround on Linux + set shortcut if different from default and if we are on FF 60 to 65
	browser.commands.getAll()
	.then(
	  function (commands) {
		let len = commands.length;
		let command, shortcut;
		for (let i=0 ; i<len ; i++) {
		  command = commands[i];
		  if (command.name == "_execute_sidebar_action") {
			shortcut = command.shortcut;
			trace("_execute_sidebar_action: "+shortcut, true);
			if (!beforeFF63 && isLinux && (shortcut == "Ctrl+Shift+B")) {
			  // Work around the fact that manifest.json "suggested_key" in "commands" cannot contain "Alt" before FF63
			  // Indeed, default key for Linux is "Ctrl+Alt+B", but this fails on add-on load for FF < 63, so default
			  // in manifest is set to "Ctrl+Shift+B" in Linux.
			  // However, as it conflicts with FF reserved combinations later on, we modify it to "Ctrl+Alt+B" in such cases. 
			  browser.commands.update(
				{name: "_execute_sidebar_action",
				 shortcut: (shortcut = "Ctrl+Alt+B")
				}
			  );
			  trace("Linux => adjusted to: "+shortcut, true);
			}
		  }
		}
	  }	
	)

	// If we got savedBNList, rebuild it
	if (savedBNList != undefined) {
	  let proto = Object.prototype.toString.call(savedBNList).slice(8, -1);
//      trace("proto "+proto, true);
	  if (proto == "String") { // New jsonified method
		trace("jsonified save method", true);
		let json = savedBNList;
		if ((json != "{}") && (json.length < 20)) { // Bad save last time .. look at the other one
		  json = savedBNListBak;
		  if ((json != undefined) && (json != "{}") && (json.length < 20)) { // Not here or bad save again :-(
			json = undefined;
		  }
		}
		// Rebuild the full savedBNList object
		rootBN = BN_deserialize(json);
		if (rootBN == null) { // For some reason, we could not deserialize, so rootBN is null
		  trace("jsonified save was apparently corrupted, got null rootBN - Reloadding tree from FF API", true);
		  savedBNList = undefined;
		}
		else {
		  savedBNList = {};
		  let rc = rebuildBNList(savedBNList, rootBN);
		  if (!rc) { // Got an error somewhere in the jsonified save, reload the full tree from FF
			trace("jsonified save was apparently corrupted, got false from rebuildBNList() - Reloadding tree from FF API", true);
			savedBNList = undefined;
		  }
		}
	  }
	  else { // We got something from the old save format, it has the right structure and does not need rebuild
		rootBN = savedBNList[0]; // Set rootBN properly
	  }
	}
  
	// If we got savedHNList, read and trim it
	if (savedHNList != undefined) {
	  let json = savedHNList;
	  if ((json != "[]") && (json.length < 20)) { // Bad save last time .. we lost the history
		json = undefined;
	  }
	  // Read the full savedHNList object
	  savedHNList = historyListDeserialize(json);
	  if (savedHNList == null) { // For some reason, we could not deserialize
		trace("jsonified save was apparently corrupted, got null savedHNList - Lost history", true);
		savedHNList = undefined;
	  }
	  else {
		historyListTrim(savedHNList, options.historyRetention * 24 * 3600000);
	  }
	}

	trace("structureVersion: "+structureVersion, true);
	trace("options.disableFavicons: "+options.disableFavicons, true);
	trace("options.pauseFavicons: "+options.pauseFavicons, true);
	if (!structureVersion.includes(VersionBNList)) {
	  // Signal to migrate from savedBkmkUriList
	  migration_bnlist = true;
	}
	if (!structureVersion.includes(VersionSpecialFldr)) {
	  // Signal to migrate to Special Folders
	  migration_spfldr = true;
	}

	endLoadTime = (new Date ()).getTime();
	trace("Load local store duration: "+(loadDuration = (endLoadTime - startTime))+" ms", true);

	// Wait for getting the install status
	if (justInstalled != undefined) { // Already received the information
	  initialize2();
	} else { // Wait for it to come, or time out
	  getInstallStatus
	  .then(gotInstallStatus)
	  .catch( // Asynchronous, like .then
		function (err) {
		  let msg = "Error on gotInstallStatus : "+err;
		  console.log(msg);
		  if (err != undefined) {
			let fn = err.fileName;
			if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
			console.log("fileName:   "+fn);
			console.log("lineNumber: "+err.lineNumber);
		  }
		}
	  );
	  // The install status will never come on regular FF start and no addon install, so timeout 50 ms on it
	  getInstallStatusTimerID = setTimeout(noInstallStatus, 50);
	}
  }
)
.catch( // Asynchronous, like .then
  function (err) {
	let msg = "Error on loading from local storage : "+err;
	console.log(msg);
	if (err != undefined) {
	  let fn = err.fileName;
	  if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
	  console.log("fileName:   "+fn);
	  console.log("lineNumber: "+err.lineNumber);
	}
  }
);

/*
let count = 20;
function test() {
  let endLoadTime = (new Date ()).getTime();
  browser.bookmarks.get(Root)
  .then(
    function (a_BTN) {
	  let t2 = (new Date ()).getTime();
	  console.log("Root get duration: "+(t2 - endLoadTime)+" ms");
	  console.log("      Root.id      : "+a_BTN[0].id);
	  console.log("      Root.children: "+a_BTN[0].children);
	  browser.bookmarks.getChildren(Root)
 	  .then(
 	    function (a_BTN1) {
 		  let t3 = (new Date ()).getTime();
 		  console.log("Root getChildren duration: "+(t3 - t2)+" ms");
 		  console.log("      Number of children: "+a_BTN1.length);
 	      browser.bookmarks.getSubTree(Root)
 	      .then(
 	        function (a_BTN2) {
 	    	  let t4 = (new Date ()).getTime();
 	    	  console.log("Root getSubTree duration: "+(t4 - t3)+" ms");
 	    	  console.log("      Root.children: "+a_BTN2[0].children);
 	    	  console.log("      Number of children: "+a_BTN2[0].children.length);
 	  	      browser.bookmarks.getTree()
 	  	      .then(
 	  	        function (a_BTN3) {
 	  	    	  let t5 = (new Date ()).getTime();
 	  	    	  console.log("(Root) getTree duration: "+(t5 - t4)+" ms");
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