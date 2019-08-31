'use strict';


/*
 * Constants
 */
const VersionImg16 = "-img16"; // Signal that all favicons are in 16x16 format
const VersionBNList = "-bnlist"; // Signal that we are in BookmarkNode tree format
const VersionSpecialFldr = "-spfldr"; // Signal that we are in Special Folder tree format
const DfltFontSize = 12; // 12px default
const DfltSpaceSize = 0; // 0px default


/*
 * Global variables, seen by other instances (var)
 */
var pauseFavicons_option; // Boolean
var disableFavicons_option; // Boolean
var enableCookies_option; // Boolean
var enableFlipFlop_option; // Boolean
var advancedClick_option; // Boolean
var closeSearch_option; // Boolean
var openTree_option; // Boolean
var immediateFavDisplay_option; // Boolean
var loadffapi_option; // Boolean
var delayLoad_option; // Boolean
var reversePath_option; // Boolean
var rememberSizes_option; // Boolean
var searchHeight_option; // Integer
var setFontSize_option; // Boolean
var fontSize_option; // Integer
var setSpaceSize_option; // Boolean
var spaceSize_option; // Integer
var lastcurbnid_option; // String
var sidebarCommand_option; // String
var traceEnabled_option; // Boolean
var searchField_option; // String
var searchScope_option; // String
var searchMatch_option; // String
var savedBkmkUriList; // Used to receive the favicon uri saved in storage - Will be deleted at end
var savedBNList; // Used to receive the BookmarkNodes saved in storage - Will be deleted at end
var savedBNListBak; // Used to receive the second BookmarkNodes saved in storage if any - Will be deleted at end
var structureVersion = ""; // String signalling which migrations are done / current state
var pauseFavicons_option_file; // Boolean
var disableFavicons_option_file; // Boolean
var enableCookies_option_file; // Boolean
var enableFlipFlop_option_file; // Boolean
var advancedClick_option_file; // Boolean
var closeSearch_option_file; // Boolean
var openTree_option_file; // Boolean
var immediateFavDisplay_option_file; // Boolean
var loadffapi_option_file; // Boolean
var delayLoad_option_file; // Boolean
var reversePath_option_file; // Boolean
var rememberSizes_option_file; // Boolean
var searchHeight_option_file; // Integer
var setFontSize_option_file; // Boolean
var fontSize_option_file; // Integer
var setSpaceSize_option_file; // Boolean
var spaceSize_option_file; // Integer
var lastcurbnid_option_file; // String
var sidebarCommand_option_file; // String
var traceEnabled_option_file; // Boolean
var searchField_option_file; // String
var searchScope_option_file; // String
var searchMatch_option_file; // String
var migration_img16 = false;
var migration_bnlist = false;
var migration_spfldr = false;


/*
 * Global variables, private to including page (let)
 */
let savedfIndex, savedfTime, savedfTimeBak; // Use to receive information about what was last saved
let savedFldrOpenList; // Used to receive the open state saved in storage - Will be deleted at end


/*
 * Functions
 * ---------
 */

/*
 * Refresh options from Background page
 * 
 * backgroundPage is the Background page object 
 */
function refreshOptionsBgnd (backgroundPage) {
  pauseFavicons_option_file = backgroundPage.pauseFavicons_option_file;
  pauseFavicons_option = backgroundPage.pauseFavicons_option;
  disableFavicons_option_file = backgroundPage.disableFavicons_option_file;
  disableFavicons_option = backgroundPage.disableFavicons_option;
  enableCookies_option_file = backgroundPage.enableCookies_option_file;
  if (disableFavicons_option) { // Force enableCookies_option to false
	enableCookies_option = false;
  }
  else {
    enableCookies_option = backgroundPage.enableCookies_option;
  }
  enableFlipFlop_option_file = backgroundPage.enableFlipFlop_option_file;
  enableFlipFlop_option = backgroundPage.enableFlipFlop_option;
  advancedClick_option_file = backgroundPage.advancedClick_option_file;
  advancedClick_option = backgroundPage.advancedClick_option;
  closeSearch_option_file = backgroundPage.closeSearch_option_file;
  closeSearch_option = backgroundPage.closeSearch_option;
  openTree_option_file = backgroundPage.openTree_option_file;
  if (closeSearch_option) { // Force openTree_option
 	openTree_option = true;
  }
  else {
    openTree_option = backgroundPage.openTree_option;
  }
  immediateFavDisplay_option_file = backgroundPage.immediateFavDisplay_option_file;
  immediateFavDisplay_option = backgroundPage.immediateFavDisplay_option;
  loadffapi_option_file = backgroundPage.loadffapi_option_file;
  loadffapi_option = backgroundPage.loadffapi_option;
  delayLoad_option_file = backgroundPage.delayLoad_option_file;
  delayLoad_option = backgroundPage.delayLoad_option;
delayLoad_option = false; // Disabled for now
  reversePath_option_file = backgroundPage.reversePath_option_file;
  reversePath_option = backgroundPage.reversePath_option;
  rememberSizes_option_file = backgroundPage.rememberSizes_option_file;
  rememberSizes_option = backgroundPage.rememberSizes_option;
  searchHeight_option = backgroundPage.searchHeight_option;
  setFontSize_option_file = backgroundPage.setFontSize_option_file;
  setFontSize_option = backgroundPage.setFontSize_option;
  fontSize_option_file = backgroundPage.fontSize_option_file;
  fontSize_option = backgroundPage.fontSize_option;
  setSpaceSize_option_file = backgroundPage.setSpaceSize_option_file;
  setSpaceSize_option = backgroundPage.setSpaceSize_option;
  spaceSize_option_file = backgroundPage.spaceSize_option_file;
  spaceSize_option = backgroundPage.spaceSize_option;
  lastcurbnid_option_file = backgroundPage.lastcurbnid_option_file;
  lastcurbnid_option = backgroundPage.lastcurbnid_option;
  sidebarCommand_option_file = backgroundPage.sidebarCommand_option_file;
  sidebarCommand_option = backgroundPage.sidebarCommand_option;
  traceEnabled_option_file = backgroundPage.traceEnabled_option_file;
  traceEnabled_option = backgroundPage.traceEnabled_option;
  searchField_option_file = backgroundPage.searchField_option_file;
  searchField_option = backgroundPage.searchField_option;
  searchScope_option_file = backgroundPage.searchScope_option_file;
  searchScope_option = backgroundPage.searchScope_option;
  searchMatch_option_file = backgroundPage.searchMatch_option_file;
  searchMatch_option = backgroundPage.searchMatch_option;
  structureVersion = backgroundPage.structureVersion;
}

/*
 * Refresh options from Local store
 * 
 * Returns a promise to wait on
 */
function refreshOptionsLStore () {
  let p = new Promise  (
    (resolve, reject) => {
   	  let gettingItem = browser.storage.local.get(
   	   	["pausefavicons_option"
   	   	,"disablefavicons_option"
   	    ,"enablecookies_option"
   	    ,"enableflipflop_option"
   	    ,"advanced_option"
   	    ,"closesearch_option"
   	    ,"opentree_option"
   	    ,"immediatefavdisplay_option"
   	    ,"loadffapi_option"
   	    ,"delayLoad_option"
   	    ,"reversepath_option"
   	    ,"remembersizes_option"
   	    ,"searchheight_option"
   	    ,"popupheight_option"
   	    ,"popupwidth_option"
   	    ,"setfontsize_option"
   	    ,"fontsize_option"
   	    ,"setspacesize_option"
   	    ,"spacesize_option"
   	    ,"lastcurbnid_option"
   	    ,"sidebarcommand_option"
   	    ,"searchfield_option"
   	    ,"searchscope_option"
   	    ,"searchmatch_option"
   	    ,"traceEnabled_option"
   	    ]
   	  );
   	  gettingItem.then((res) => {
   		// -- Read PFF option..
   		if ((pauseFavicons_option_file = res.pausefavicons_option) != undefined) {
   		  pauseFavicons_option = pauseFavicons_option_file;
   		}
   		else {
   		  pauseFavicons_option = false;
   		}
   		// -- Read DFF option..
   		if ((disableFavicons_option_file = res.disablefavicons_option) != undefined) {
   		  disableFavicons_option = disableFavicons_option_file;
   		}
   		else {
   		  disableFavicons_option = false;
   		}
		// -- Read EC option..
   		if ((enableCookies_option_file = res.enablecookies_option) != undefined) {
   		  if (disableFavicons_option) { // Force enableCookies_option to false
   			enableCookies_option = false;
   		  }
   		  else {
   			enableCookies_option = enableCookies_option_file;
   		  }
   		}
   		else {
   		  enableCookies_option = false;
   		}
 		// -- Read EFF option..
   		if ((enableFlipFlop_option_file = res.enableflipflop_option) != undefined) {
   		  enableFlipFlop_option = enableFlipFlop_option_file;
   		}
   		else {
   		  enableFlipFlop_option = false;
     	}
   		// -- Read advanced option..
   		if ((advancedClick_option_file = res.advanced_option) != undefined) {
   		  advancedClick_option = advancedClick_option_file;
   		}
   		else {
   		  advancedClick_option = false;
       	}
	  	// -- Read CS option..
   		if ((closeSearch_option_file = res.closesearch_option) != undefined) {
   		  closeSearch_option = closeSearch_option_file;
   		}
   		else {
   		  closeSearch_option = false;
        }
   		// -- Read OT option..
   		if ((openTree_option_file = res.opentree_option) != undefined) {
   		  if (closeSearch_option) { // Force openTree_option
   			openTree_option = true;
   		  }
   		  else {
   			openTree_option = openTree_option_file;
   		  }
   		}
   		else {
   		  openTree_option = false;
        }
   		// -- Read IFD option..
   		if ((immediateFavDisplay_option_file = res.immediatefavdisplay_option) != undefined) {
   		  immediateFavDisplay_option = immediateFavDisplay_option_file;
   		}
   		else {
   		  immediateFavDisplay_option = false;
        }
   		// -- Read LFFA option..
   		if ((loadffapi_option_file = res.loadffapi_option) != undefined) {
   		  loadffapi_option = loadffapi_option_file;
   		}
   		else {
   		  loadffapi_option = false;
        }
   		// -- Read DL option..
   		if ((delayLoad_option_file = res.delayLoad_option) != undefined) {
   		  delayLoad_option = delayLoad_option_file;
   		}
   		else {
   		  delayLoad_option = false;
        }
delayLoad_option = false; // Disabled for now
		// .. Read RP option..
		if ((reversePath_option_file = res.reversepath_option) != undefined) {
		  reversePath_option = reversePath_option_file;
		}
		else {
		  reversePath_option = false;
		}
     	// -- Read RS options..
   		if ((rememberSizes_option_file = res.remembersizes_option) != undefined) {
   		  rememberSizes_option = rememberSizes_option_file;
   		}
   		else {
   		  rememberSizes_option = false;
        }
   		// -- Get search pane height and set the pane properly
   		if ((searchHeight_option_file = res.searchheight_option) != undefined) {
   		  if (rememberSizes_option) {
   			searchHeight_option = searchHeight_option_file; // Remember the current saved size
   		  }
   		  else { // Do not remember
   			searchHeight_option = undefined;
   			// Remove the remembered sizes when they exist
   			browser.storage.local.remove("searchheight_option");
   		  }
   		}
   		else {
   		  searchHeight_option = undefined;
		}
   		if (!rememberSizes_option && (res.popupheight_option != undefined)) {
   		  browser.storage.local.remove("popupheight_option");
   		}
   		if (!rememberSizes_option && (res.popupwidth_option != undefined)) {
   		  browser.storage.local.remove("popupwidth_option");
   		}
   		// -- Read SFS option..
   		if ((setFontSize_option_file = res.setfontsize_option) != undefined) {
   		  setFontSize_option = setFontSize_option_file;
   		}
   		else {
   		  setFontSize_option = false;
        }
   		// -- Read FS option..
   		if ((fontSize_option_file = res.fontsize_option) != undefined) {
   		  if (setFontSize_option) {
   			fontSize_option = fontSize_option_file;
   		  }
   		  else { // Do not remember
   			fontSize_option = undefined;
   			// Remove the remembered sizes when they exist
   			browser.storage.local.remove("fontsize_option");
   		  }
   		}
   		else {
   		  fontSize_option = undefined;
   		}
   		// -- Read SSS option..
   		if ((setSpaceSize_option_file = res.setspacesize_option) != undefined) {
   		  setSpaceSize_option = setSpaceSize_option_file;
   		}
   		else {
   		  setSpaceSize_option = false;
        }
   		// -- Read SSz option..
   		if ((spaceSize_option_file = res.spacesize_option) != undefined) {
   		  if (setSpaceSize_option) {
   			spaceSize_option = spaceSize_option_file;
   		  }
   		  else { // Do not remember
   			spaceSize_option = undefined;
   			// Remove the remembered sizes when they exist
   			browser.storage.local.remove("spacesize_option");
   		  }
   		}
   		else {
   		  spaceSize_option = undefined;
   		}
   		// Read LCB option..
   		if ((lastcurbnid_option_file = res.lastcurbnid_option) != undefined) {
   		lastcurbnid_option = lastcurbnid_option_file;
   		}
   		else {
   		  lastcurbnid_option = undefined;
   		}
 		// -- Read SC option..
 		if ((sidebarCommand_option_file = res.sidebarcommand_option) != undefined) {
 		 sidebarCommand_option = sidebarCommand_option_file;
 		}
 		else {
 		 sidebarCommand_option = undefined;
 		}

   		// -- Read SF option..
   		if ((searchField_option_file = res.searchfield_option) != undefined) {
   		  searchField_option = searchField_option_file;
   		}
   		else {
   		  searchField_option = "both";
        }

   		// -- Read SS option..
   		if ((searchScope_option_file = res.searchscope_option) != undefined) {
   		  searchScope_option = searchScope_option_file;
   		}
   		else {
   		  searchScope_option = "all";
        }

   		// -- Read trace option..
   		if ((traceEnabled_option_file = res.traceEnabled_option) != undefined) {
   		  traceEnabled_option = traceEnabled_option_file;
   		}
   		else {
   		  traceEnabled_option = false;
        }

   		// -- Read SM option..
   		if ((searchMatch_option_file = res.searchmatch_option) != undefined) {
   		  searchMatch_option = searchMatch_option_file;
   		}
   		else {
   		  searchMatch_option = "words";
        }

   	    resolve(); // Send promise for anybody waiting ..
   	  })
   	  .catch( // Asynchronous, like .then
   		function (err) {
   		  let msg = "libstore error on loading from local storage 1 : "+err;
   		  console.log(msg);
		  if (err != undefined) {
			console.log("lineNumber: "+err.lineNumber);
			console.log("fileName:   "+err.fileName);
		  }

   	      reject(); // Send promise for anybody waiting ..
   		}
   	  );
    }
  );

  // Return Promise
  return(p);
}

/*
 * Read folders state from Local store
 * 
 * waitMsg if supplied is a callback function to display current read status
 *   waitMsg(String text, Boolean force)
 *   	text = message to display
 *   	force = display even if trace not enabled
 *   
 * Returns a promise to wait on
 */
function readFoldersLStore (waitMsg) {
  let p = new Promise  (
    (resolve, reject) => {
   	  let gettingItem = browser.storage.local.get(
  	    ["savedFldrOpenList"
  	    ]
  	  );
   	  gettingItem.then((res) => {
   		let value;

   		waitMsg("Read folders state..");
   		if ((value = res.savedFldrOpenList) != undefined) {
   		  savedFldrOpenList = value;
   		}

        resolve(); // Send promise for anybody waiting ..
   	  })
   	  .catch( // Asynchronous, like .then
   		function (err) {
   		  let msg = "libstore error on loading from local storage 2 : "+err;
   		  console.log(msg);
		  if (err != undefined) {
			console.log("lineNumber: "+err.lineNumber);
			console.log("fileName:   "+err.fileName);
		  }

   	      reject(); // Send promise for anybody waiting ..
   		}
   	  );
    }
  );

  // Return Promise
  return(p);
}

/*
 * Build request to read Full LStore
 * 
 * isSidebar is a Boolean, true when calling from sidebar (to get open folders state)
 *   and false when calling from background (to get savedBNList / savedBkmkUriList).
 *
 * Returns a promise to wait on
 */
function launchReadFullLStore (isSidebar) {
  let gettingItem;
  if (isSidebar) {
	gettingItem = browser.storage.local.get(
	  ["pausefavicons_option"
	   ,"disablefavicons_option"
	   ,"enablecookies_option"
	   ,"enableflipflop_option"
	   ,"advanced_option"
	   ,"closesearch_option"
	   ,"opentree_option"
	   ,"immediatefavdisplay_option"
	   ,"loadffapi_option"
	   ,"delayLoad_option"
	   ,"reversepath_option"
	   ,"remembersizes_option"
	   ,"searchheight_option"
	   ,"popupheight_option"
	   ,"popupwidth_option"
	   ,"setfontsize_option"
	   ,"fontsize_option"
	   ,"setspacesize_option"
	   ,"spacesize_option"
	   ,"lastcurbnid_option"
	   ,"sidebarcommand_option"
	   ,"searchfield_option"
	   ,"searchscope_option"
	   ,"searchmatch_option"
	   ,"traceEnabled_option"
	   ,"savedFldrOpenList"
	   ,"structureVersion"
	  ]
	);
  }
  else { // Background task call
	gettingItem = browser.storage.local.get(
	  ["pausefavicons_option"
	   ,"disablefavicons_option"
	   ,"enablecookies_option"
	   ,"enableflipflop_option"
	   ,"advanced_option"
	   ,"closesearch_option"
	   ,"opentree_option"
	   ,"immediatefavdisplay_option"
	   ,"loadffapi_option"
	   ,"delayLoad_option"
	   ,"reversepath_option"
	   ,"remembersizes_option"
	   ,"searchheight_option"
	   ,"popupheight_option"
	   ,"popupwidth_option"
	   ,"setfontsize_option"
	   ,"fontsize_option"
	   ,"setspacesize_option"
	   ,"spacesize_option"
	   ,"lastcurbnid_option"
	   ,"sidebarcommand_option"
	   ,"searchfield_option"
	   ,"searchscope_option"
	   ,"searchmatch_option"
	   ,"traceEnabled_option"
	   ,"fIndex"
	   ,"fTime"
	   ,"fTimeBak"
	   ,"savedBNList"
	   ,"savedBNListBak"
	   ,"savedBkmkUriList"
//	   ,"savedBkmkUriList2"
//	   ,"savedBkmkUriList3"
	   ,"structureVersion"
	  ]
	);
  }
  return(gettingItem);
}

/*
 * Read result and set proper options
 * 
 * res is the result of local store read tryReadFullLStore()
 * isSidebar is a Boolean, true when calling from sidebar (to get open folders state)
 *   and false when calling from background (to get savedBNList / savedBkmkUriList).
 * waitMsg is a callback function to display current read status
 *   waitMsg(String text, Boolean force)
 *   	text = message to display
 *   	force = display even if trace not enabled
 *
 * Set global variables accordingly.
 */
function readFullOptions (res, isSidebar, waitMsg) {
  waitMsg("Read PFF option..");
  if ((pauseFavicons_option_file = res.pausefavicons_option) != undefined) {
	pauseFavicons_option = pauseFavicons_option_file;
  }
  else {
	pauseFavicons_option = false;
  }
  waitMsg("Read DFF option..");
  if ((disableFavicons_option_file = res.disablefavicons_option) != undefined) {
	disableFavicons_option = disableFavicons_option_file;
	// Cleaning of local store old version .. delete on long term (2.0.30+)
	if (disableFavicons_option_file == "true") {
	  disableFavicons_option = true;
	  browser.storage.local.set({disablefavicons_option: true});
	}
  }
  else {
	disableFavicons_option = false;
  }
//disableFavicons_option = true;
  waitMsg("Read EC option..");
  if ((enableCookies_option_file = res.enablecookies_option) != undefined) {
	if (disableFavicons_option) { // Force enableCookies_option to false
	  enableCookies_option = false;
	}
	else {
	  enableCookies_option = enableCookies_option_file;
	}
	// Cleaning of local store old version .. delete on long term (2.0.30+)
	if (enableCookies_option_file == "true") {
	  enableCookies_option = true;
	  browser.storage.local.set({enablecookies_option: true});
	}
  }
  else {
	enableCookies_option = false;
  }
  waitMsg("Read EFF option..");
  if ((enableFlipFlop_option_file = res.enableflipflop_option) != undefined) {
	enableFlipFlop_option = enableFlipFlop_option_file;
  }
  else {
	enableFlipFlop_option = false;
  }
  waitMsg("Read advanced option..");
  if ((advancedClick_option_file = res.advanced_option) != undefined) {
	advancedClick_option = advancedClick_option_file;
	// Cleaning of local store old version .. delete on long term (2.0.30+)
	if (advancedClick_option == "true") {
	  advancedClick_option = true;
	  browser.storage.local.set({advanced_option: true});
	}
  }
  else {
	advancedClick_option = false;
  }
  waitMsg("Read CS option..");
  if ((closeSearch_option_file = res.closesearch_option) != undefined) {
	closeSearch_option = closeSearch_option_file;
	// Cleaning of local store old version .. delete on long term (2.0.30+)
	if (closeSearch_option == "true") {
	  closeSearch_option = true;
	  browser.storage.local.set({closesearch_option: true});
	}
  }
  else {
	closeSearch_option = false;
  }
  waitMsg("Read OT option..");
  if ((openTree_option_file = res.opentree_option) != undefined) {
	if (closeSearch_option) { // Force openTree_option
	  openTree_option = true;
	}
	else {
	  openTree_option = openTree_option_file;
	}
	// Cleaning of local store old version .. delete on long term (2.0.30+)
	if (openTree_option == "true") {
	  openTree_option = true;
	  browser.storage.local.set({opentree_option: true});
	}
  }
  else {
	openTree_option = false;
  }
  waitMsg("Read IFD option..");
  if ((immediateFavDisplay_option_file = res.immediatefavdisplay_option) != undefined) {
	immediateFavDisplay_option = immediateFavDisplay_option_file;
  }
  else {
	immediateFavDisplay_option = false;
  }
  waitMsg("Read LFFA option..");
  if ((loadffapi_option_file = res.loadffapi_option) != undefined) {
	loadffapi_option = loadffapi_option_file;
  }
  else {
	loadffapi_option = false;
  }
  waitMsg("Read DL option..");
  if ((delayLoad_option_file = res.delayLoad_option) != undefined) {
	delayLoad_option = delayLoad_option_file;
	// Cleaning of local store old version .. delete on long term (2.0.30+)
	if (delayLoad_option == "true") {
	  delayLoad_option = true;
	  browser.storage.local.set({delayLoad_option: true});
	}
  }
  else {
	delayLoad_option = false;
  }
delayLoad_option = false; // Disabled for now
  waitMsg("Read RP option..");
  if ((reversePath_option_file = res.reversepath_option) != undefined) {
	reversePath_option = reversePath_option_file;
  }
  else {
	reversePath_option = false;
  }
  waitMsg("Read RS options..");
  if ((rememberSizes_option_file = res.remembersizes_option) != undefined) {
	rememberSizes_option = rememberSizes_option_file;
	// Cleaning of local store old version .. delete on long term (2.0.30+)
	if (rememberSizes_option == "true") {
	  rememberSizes_option = true;
	  browser.storage.local.set({remembersizes_option: true});
	}
  }
  else {
	rememberSizes_option = false;
  }
  if ((searchHeight_option_file = res.searchheight_option) != undefined) {
	if (rememberSizes_option) {
	  searchHeight_option = searchHeight_option_file; // Remember the current saved size
	}
	else { // Do not remember
	  searchHeight_option = undefined;
	  // Remove the remembered sizes when they exist
	  browser.storage.local.remove("searchheight_option");
	}
  }
  else {
	searchHeight_option = undefined;
  }
  if (!rememberSizes_option && (res.popupheight_option != undefined)) {
	browser.storage.local.remove("popupheight_option");
  }
  if (!rememberSizes_option && (res.popupwidth_option != undefined)) {
	browser.storage.local.remove("popupwidth_option");
  }
  waitMsg("Read SFS option..");
  if ((setFontSize_option_file = res.setfontsize_option) != undefined) {
	setFontSize_option = setFontSize_option_file;
  }
  else {
	setFontSize_option = false;
  }
  waitMsg("Read FS option..");
  if ((fontSize_option_file = res.fontsize_option) != undefined) {
	if (setFontSize_option) {
	  fontSize_option = fontSize_option_file;
	}
	else { // Do not remember
	  fontSize_option = undefined;
	  // Remove the remembered sizes when they exist
	  browser.storage.local.remove("fontsize_option");
	}
  }
  else {
	fontSize_option = undefined;
  }
  waitMsg("Read SSS option..");
  if ((setSpaceSize_option_file = res.setspacesize_option) != undefined) {
	setSpaceSize_option = setSpaceSize_option_file;
  }
  else {
	setSpaceSize_option = false;
  }
  waitMsg("Read SSz option..");
  if ((spaceSize_option_file = res.spacesize_option) != undefined) {
	if (setSpaceSize_option) {
	  spaceSize_option = spaceSize_option_file;
	}
	else { // Do not remember
	  spaceSize_option = undefined;
	  // Remove the remembered sizes when they exist
	  browser.storage.local.remove("spacesize_option");
	}
  }
  else {
	spaceSize_option = undefined;
  }
  waitMsg("Read LCB option..");
  if ((lastcurbnid_option_file = res.lastcurbnid_option) != undefined) {
	lastcurbnid_option = lastcurbnid_option_file;
  }
  else {
	lastcurbnid_option = undefined;
  }
  waitMsg("Read SC option..");
  if ((sidebarCommand_option_file = res.sidebarcommand_option) != undefined) {
	sidebarCommand_option = sidebarCommand_option_file;
  }
  else {
	sidebarCommand_option = undefined;
  }

  waitMsg("Read SF option..");
  if ((searchField_option_file = res.searchfield_option) != undefined) {
	searchField_option = searchField_option_file;
  }
  else {
	searchField_option = "both";
  }

  waitMsg("Read SS option..");
  if ((searchScope_option_file = res.searchscope_option) != undefined) {
	searchScope_option = searchScope_option_file;
  }
  else {
	searchScope_option = "all";
  }

  waitMsg("Read SM option..");
  if ((searchMatch_option_file = res.searchmatch_option) != undefined) {
	searchMatch_option = searchMatch_option_file;
  }
  else {
	searchMatch_option = "words";
  }

  waitMsg("Read trace option..");
  if ((traceEnabled_option_file = res.traceEnabled_option) != undefined) {
	traceEnabled_option = traceEnabled_option_file;
	// Cleaning of local store old version .. delete on long term (2.0.30+)
	if (traceEnabled_option == "true") {
	  traceEnabled_option = true;
	  browser.storage.local.set({traceEnabled_option: true});
	}
  }
  else {
	traceEnabled_option = false;
  }

  // If sidebar, read folders state, else read saved Bookmark Node or uri structure
  let value;
  if (isSidebar) {
	waitMsg("Read folders state..");
	if ((value = res.savedFldrOpenList) != undefined) {
	  savedFldrOpenList = value;
	}
  }
  else {
	waitMsg("Read saved tree info..");
	if ((value = res.fIndex) != undefined) {
	  savedfIndex = value;
	}
	if ((value = res.fTime) != undefined) {
	  savedfTime = value;
	}
	if ((value = res.fTimeBak) != undefined) {
	  savedfTimeBak = value;
	}

	// Get saved tree / favicons
	waitMsg("Read saved tree..");
	if (savedfTimeBak != undefined) {
	  if ((savedfTime != undefined) && (savedfTime > savedfTimeBak)) {
		// Both exist and primary is fresher than backup
		if ((value = res.savedBNList) != undefined) {
		  savedBNList = value;
		  if ((value = res.savedBNListBak) != undefined) {
			savedBNListBak = value;
		  }
		}
		else if ((value = res.savedBNListBak) != undefined) {
		  // If primary was empty, take backup
		  savedBNList = value;
		}
	  }
	  else { // Backup fresher than primary, or no primary
		if ((value = res.savedBNListBak) != undefined) {
		  savedBNList = value;
		  if ((value = res.savedBNList) != undefined) {
			savedBNListBak = value;
		  }
		}
		else if ((value = res.savedBNList) != undefined) {
		  // If backup was empty, attempt primary .. we never know
		  savedBNList = value;
		}
	  }
	}
	else { // No secondary
	  if ((value = res.savedBNList) != undefined) {
		savedBNList = value;
	  }
	  else if ((value = res.savedBNListBak) != undefined) {
		// If primary was empty, attempt backup .. we never know
		savedBNList = value;
	  }
	}
//console.log("res.savedBkmkUriList2: "+res.savedBkmkUriList2);
	if ((value = res.savedBkmkUriList) != undefined) {
//	  if ((value = res.savedBkmkUriList2) != undefined) {
//	  if ((value = res.savedBkmkUriList3) != undefined) {
	  if (disableFavicons_option) {
		browser.storage.local.remove("savedBkmkUriList");
	  }
	  else {
		savedBkmkUriList = value;
	  }
	}
  }

  waitMsg("Read migration state..");
  // Get migrations state / current state
  if ((value = res.structureVersion) != undefined) {
	structureVersion = value;
  }
  else { // Doesn't exist yet
	// If savedBkmkUriList is undefined, nothing to convert nor migrate to BNList,
	// so consider the img16 and BNList states ok
	if (savedBkmkUriList == undefined) {
	  structureVersion += VersionImg16 + VersionBNList + VersionSpecialFldr;
	}
	browser.storage.local.set({
	  structureVersion: structureVersion
	});
  }
  res = undefined; // Free memory


  // Temporary code to cleanup old option, to be removed in a future version 
  browser.storage.local.get("asyncLoad_option")
  .then((res) => {
	if (res.asyncLoad_option != undefined) {
	  browser.storage.local.remove("asyncLoad_option");
	}
  });
}

/*
 *  Reads and retry if failing and not exceeded retry count
 * 
 */
const readRetryTimeout = 50; // Milliseconnds
function retryReadFullLStore (resolve, reject, retries, isSidebar, waitMsg) {
  retries--;
  launchReadFullLStore(isSidebar)
  .then((res) => {
	readFullOptions(res, isSidebar, waitMsg);

	resolve(); // Send promise for anybody waiting ..
  })
  .catch( // Asynchronous, like .then
	function (err) {
	  let msg = "libstore error on loading from local storage 3 : "+err+" (retries left: "+retries+")";
	  console.log(msg);
	  if (err != undefined) {
		console.log("lineNumber: "+err.lineNumber);
		console.log("fileName:   "+err.fileName);
	  }

	  if (retries > 0) {
		setTimeout(
		  retryReadFullLStore(resolve, reject, retries, isSidebar, waitMsg), // Retry read
		  readRetryTimeout
		);
	  }
	  else {
		reject(); // Send promise for anybody waiting ..
	  }
	}
  );
}

/*
 * Read all from Local store for Background or Sidebar, with some retries as it seems under Linux
 * it can fail at FF start sometimes since FF is using Indexed DB's :-(
 * 
 * isSidebar is a Boolean, true when calling from sidebar (to get open folders state)
 *   and false when calling from background (to get savedBNList / savedBkmkUriList).
 * waitMsg is a callback function to display current read status
 *   waitMsg(String text, Boolean force)
 *   	text = message to display
 *   	force = display even if trace not enabled
 *   
 * Returns a promise to wait on
 */
function readFullLStore (isSidebar, waitMsg) {
  let retries = 3;
  let p = new Promise  (
    (resolve, reject) => {
      retryReadFullLStore(resolve, reject, 10, isSidebar, waitMsg); // 10 retries
    }
  );

  // Return Promise
  return(p);
}