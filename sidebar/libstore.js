'use strict';


/*
 * Constants
 */
const VersionImg16 = "-img16"; // Signal that all favicons are in 16x16 format
const VersionBNList = "-bnlist"; // Signal that we are in BookmarkNode tree format
const VersionSpecialFldr = "-spfldr"; // Signal that we are in Special Folder tree format
const DfltFontSize = 12; // 12px default
const DfltSpaceSize = 0; // 0px default
const DfltTextColor = "#222426"; // Default text color
const DfltBckgndColor = "#ffffff"; // Default background color
const DfltHistoryRetention = 30; // 30 days default - Align trash retention on it also

const OptionsList = { // OptionDesc (storeName, type, dflt)
	pauseFavicons: new OptionDesc ("pausefavicons_option", "Boolean", false),
	disableFavicons: new OptionDesc ("disablefavicons_option", "Boolean", false),
	enableCookies: new OptionDesc ("enablecookies_option", "Boolean", false),
	enableFlipFlop: new OptionDesc ("enableflipflop_option", "Boolean", false),
	advancedClick: new OptionDesc ("advanced_option", "Boolean", false),
	showPath: new OptionDesc ("showpath_option", "Boolean", false),
	closeSearch: new OptionDesc ("closesearch_option", "Boolean", false),
	openTree: new OptionDesc ("opentree_option", "Boolean", false),
	immediateFavDisplay: new OptionDesc ("immediatefavdisplay_option", "Boolean", false),
	loadffapi: new OptionDesc ("loadffapi_option", "Boolean", false),
	noffapisearch: new OptionDesc ("noffapisearch_option", "Boolean", false),
	delayLoad: new OptionDesc ("delayLoad_option", "Boolean", false),
	searchOnEnter: new OptionDesc ("searchonenter_option", "Boolean", false),
	deactivateSearchList: new OptionDesc ("deactivatesearchlist_option", "Boolean", false),
	reversePath: new OptionDesc ("reversepath_option", "Boolean", false),
	closeSibblingFolders: new OptionDesc ("closesibblingfolders_option", "Boolean", false),
	rememberSizes: new OptionDesc ("remembersizes_option", "Boolean", false),
	searchHeight: new OptionDesc ("searchheight_option", "Integer", undefined),
	popupHTop: new OptionDesc ("popuptop_option", "Integer", undefined),
	popupLeft: new OptionDesc ("popupleft_option", "Integer", undefined),
	popupHeight: new OptionDesc ("popupheight_option", "Integer", undefined),
	popupWidth: new OptionDesc ("popupwidth_option", "Integer", undefined),
	historyTop: new OptionDesc ("historytop_option", "Integer", undefined),
	historyLeft: new OptionDesc ("historyleft_option", "Integer", undefined),
	historyHeight: new OptionDesc ("historyheight_option", "Integer", undefined),
	historyWidth: new OptionDesc ("historywidth_option", "Integer", undefined),
	setFontSize: new OptionDesc ("setfontsize_option", "Boolean", false),
	fontSize: new OptionDesc ("fontsize_option", "Integer", DfltFontSize),
	setFontBold: new OptionDesc ("setfontbold_option", "Boolean", false),
	setSpaceSize: new OptionDesc ("setspacesize_option", "Boolean", false),
	spaceSize: new OptionDesc ("spacesize_option", "Integer", DfltSpaceSize),
	matchTheme: new OptionDesc ("matchtheme_option", "Boolean", true),
	setColors: new OptionDesc ("setcolors_option", "Boolean", false),
	textColor: new OptionDesc ("textcolor_option", "DOMString", DfltTextColor),
	bckgndColor: new OptionDesc ("bckgndcolor_option", "DOMString", DfltBckgndColor),
	altFldrImg: new OptionDesc ("altfldrimg_option", "DataURI", undefined), // String "data:<URI>"
	useAltFldr: new OptionDesc ("usealtfldr_option", "Boolean", false),
	altNoFavImg: new OptionDesc ("altnofavimg_option", "DataURI", undefined), // String "data:<URI>"
	useAltNoFav: new OptionDesc ("usealtnofav_option", "Boolean", false),
	lastcurbnid: new OptionDesc ("lastcurbnid_option", "String", undefined),
	expandMenu: new OptionDesc ("expandmenu_option", "Boolean", false),
	sidebarCommand: new OptionDesc ("sidebarcommand_option", "String", undefined, true), // DEPRECATED
	appendAtFldrEnd: new OptionDesc ("appendatfldrend_option", "Boolean", true),
	searchField: new OptionDesc ("searchfield_option", "String", "both"),
	searchScope: new OptionDesc ("searchscope_option", "String", "all"),
	searchMatch: new OptionDesc ("searchmatch_option", "String", "words"),
	searchFilter: new OptionDesc ("searchfilter_option", "String", "all"),
	trashEnabled: new OptionDesc ("trashenabled_option", "Boolean", true),
	trashVisible: new OptionDesc ("trashvisible_option", "Boolean", false),
	historyDispURList: new OptionDesc ("historydispurlist_option", "Boolean", true), // Used to group undo/redo as sublist under related bookmark action - true by default
	historyRetention: new OptionDesc ("historyretention_option", "Integer", DfltHistoryRetention),
	traceEnabled: new OptionDesc ("traceEnabled_option", "Boolean", false)
};

/*
 * Global variables, seen by other instances (var)
 */
var options = {}; // Object with each property having a value

var savedBkmkUriList; // Used to receive the favicon uri saved in storage - Will be deleted at end
var savedBNList; // Used to receive the BookmarkNodes saved in storage - Will be deleted at end
var savedBNListBak; // Used to receive the second BookmarkNodes saved in storage if any - Will be deleted at end
var savedHNList; // Used to receive the HistoryNodes saved in storage - Will be deleted at end
var savedHNListBak; // Used to receive the second HistoryNodes saved in storage if any - Will be deleted at end
var structureVersion = ""; // String signalling which migrations are done / current state

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
 * Clean a set of options to a consistent state, setting options implied by others
 * 
 * options: an options Object
 */
function cleanupOptions (options) {
	if (options.disableFavicons) { // Force options.enableCookies to false
		options.enableCookies = false;
	}
	if (options.closeSearch) { // Force options.openTree
		options.openTree = true;
	}
	options.delayLoad = false; // Disabled for now
	if (!options.rememberSizes) {
		// Remove the remembered sizes when they exist
		browser.storage.local.remove("searchheight_option");
		browser.storage.local.remove("popupheight_option");
		browser.storage.local.remove("popupwidth_option");
		browser.storage.local.remove("historyheight_option");
		browser.storage.local.remove("historywidth_option");
	}
	if (!options.setFontSize) { // Reset to default size value
		options.fontSize = DfltFontSize;
	}
	if (!options.setSpaceSize) { // Reset to default space value
		options.spaceSize = DfltSpaceSize;
	}

	// Old format error, convert to Integer format
	if ((typeof options.fontSize) == "string") {
		options.fontSize = parseInt(options.fontSize, 10);
	}
	if ((typeof options.spaceSize) == "string") {
		options.spaceSize = parseInt(options.spaceSize, 10);
	}
	if ((typeof options.historyRetention) == "string") {
		options.historyRetention = parseInt(options.historyRetention, 10);
	}
}

/*
 * Refresh options from Background page
 * 
 * backgroundPage is the Background page object 
 */
function refreshOptionsBgnd(backgroundPage) {
	Object.assign(options, backgroundPage.options);

	structureVersion = backgroundPage.structureVersion;
}

/*
 * Refresh options global variable from Local store
 * 
 * Returns a promise to wait on
 */
function refreshOptionsLStore() {
	let a_option_specs = [];
	for (let o in OptionsList) {
		if (OptionsList.hasOwnProperty(o)) {
			a_option_specs.push(OptionsList[o].storeName);
		}
	}
	
	let p = new Promise(
		(resolve, reject) => {
			let gettingItem = browser.storage.local.get(
				a_option_specs
			);
			gettingItem.then((res) => {
				let option, value;
				for (let o in OptionsList) {
					if (OptionsList.hasOwnProperty(o)) {
						option = OptionsList[o];
						value = option.readValue(res);
						// Delete this option from local store if deprecated
						if (option.isDeprecated()) {
							if (value != undefined) {
								browser.storage.local.remove([option.storeName]);
							}
						}
						else {
							options[o] = value;
						}
					}
				}
				cleanupOptions(options);
				resolve(); // Send promise for anybody waiting ..
			})
			.catch( // Asynchronous, like .then
				function(err) {
					let msg = "libstore error on loading from local storage 1 : " + err;
					console.log(msg);
					if (err != undefined) {
						let fn = err.fileName;
						if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
						console.log("fileName:   "+fn);
						console.log("lineNumber: " + err.lineNumber);
					}

					reject(); // Send promise for anybody waiting ..
				}
			);
		}
	);

	// Return Promise
	return (p);
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
function readFoldersLStore(waitMsg) {
	let p = new Promise(
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
				function(err) {
					let msg = "libstore error on loading from local storage 2 : " + err;
					console.log(msg);
					if (err != undefined) {
						let fn = err.fileName;
						if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
						console.log("fileName:   "+fn);
						console.log("lineNumber: " + err.lineNumber);
					}

					reject(); // Send promise for anybody waiting ..
				}
			);
		}
	);

	// Return Promise
	return (p);
}

/*
 * Build request to read Full LStore
 * 
 * isSidebar is a Boolean, true when calling from sidebar (to get open folders state)
 *   and false when calling from background (to get savedBNList / savedBkmkUriList).
 *
 * Returns a promise to wait on
 */
function launchReadFullLStore(isSidebar) {
	let a_option_specs = [];
	for (let o in OptionsList) {
		if (OptionsList.hasOwnProperty(o)) {
			a_option_specs.push(OptionsList[o].storeName);
		}
	}
	if (isSidebar) {
		a_option_specs.push("savedFldrOpenList");
	}
	else {
		a_option_specs.push("fIndex");
		a_option_specs.push("fTime");
		a_option_specs.push("fTimeBak");
		a_option_specs.push("savedBNList");
		a_option_specs.push("savedBNListBak");
		a_option_specs.push("savedBkmkUriList");
//		a_option_specs.push("savedBkmkUriList2");
//		a_option_specs.push("savedBkmkUriList3");
		a_option_specs.push("savedHNList");
		a_option_specs.push("savedHNListBak");
	}
		a_option_specs.push("structureVersion");

	let gettingItem = browser.storage.local.get(a_option_specs);
	return (gettingItem);
}

/*
 * Read result obtained from local store, and set proper options
 * 
 * res is the result of local store read tryReadFullLStore()
 * isSidebar is a Boolean, true when calling from sidebar (to get open folders state)
 *   and false when calling from background (to get savedBNList / savedBkmkUriList).
 * waitMsg is a callback function to display current read status
 *   waitMsg(String text, Boolean force)
 *   	text = message to display
 *   	force = display even if trace not enabled
 *
 * Set options global variable accordingly.
 */
function readFullOptions(res, isSidebar, waitMsg) {
	waitMsg("Read options..");
	for (let o in OptionsList) {
		if (OptionsList.hasOwnProperty(o)) {
			options[o] = OptionsList[o].readValue(res);
		}
	}
	let option, value;
	for (let o in OptionsList) {
		if (OptionsList.hasOwnProperty(o)) {
			option = OptionsList[o];
			value = option.readValue(res);
			// Delete this option from local store if deprecated
			if (option.isDeprecated()) {
				if (value != undefined) {
					browser.storage.local.remove([option.storeName]);
				}
			}
			else {
				options[o] = value;
			}
		}
	}
	cleanupOptions(options);

	// If sidebar, read folders state, else read saved Bookmark Node or uri structure
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

		// Get saved tree / favicons and history of bookmark modifications
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
				if ((value = res.savedHNList) != undefined) {
					savedHNList = value;
					if ((value = res.savedHNListBak) != undefined) {
						savedHNListBak = value;
					}
				}
				else if ((value = res.savedHNListBak) != undefined) {
					// If primary was empty, take backup
					savedHNList = value;
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
				if ((value = res.savedHNListBak) != undefined) {
					savedHNList = value;
					if ((value = res.savedHNList) != undefined) {
						savedHNListBak = value;
					}
				}
				else if ((value = res.savedHNList) != undefined) {
					// If backup was empty, attempt primary .. we never know
					savedHNList = value;
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
			if ((value = res.savedHNList) != undefined) {
				savedHNList = value;
			}
			else if ((value = res.savedHNListBak) != undefined) {
				// If primary was empty, attempt backup .. we never know
				savedHNList = value;
			}
		}
		//console.log("res.savedBkmkUriList2: "+res.savedBkmkUriList2);
		if ((value = res.savedBkmkUriList) != undefined) { // Old format ... we will need to migrate
			//	  if ((value = res.savedBkmkUriList2) != undefined) {
			//	  if ((value = res.savedBkmkUriList3) != undefined) {
			if (options.disableFavicons) {
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
}

/*
 *  Reads and retry if failing and not exceeded retry count
 * 
 */
const readRetryTimeout = 50; // Milliseconnds
function retryReadFullLStore(resolve, reject, retries, isSidebar, waitMsg) {
	retries--;
	launchReadFullLStore(isSidebar)
		.then((res) => {
			readFullOptions(res, isSidebar, waitMsg);
			resolve(); // Send promise for anybody waiting ..
		})
		.catch( // Asynchronous, like .then
			function(err) {
				let msg = "libstore error on loading from local storage 3 : " + err + " (retries left: " + retries + ")";
				console.log(msg);
				if (err != undefined) {
					let fn = err.fileName;
					if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
					console.log("fileName:   "+fn);
					console.log("lineNumber: " + err.lineNumber);
				}

				if (retries > 0) {
					// Retry read after timeout
					setTimeout(retryReadFullLStore,	readRetryTimeout
							   , resolve, reject, retries, isSidebar, waitMsg // Parameters of retryReadFullLStore()
					);
				}
				else {
					// We couldn't read the local store after all retries - It is probably corrupted
					if (retries == 0) {	// Let's clear the local storage to attempt a start with default values
						console.log("Attempting to clear local storage, which will reset all values to default !");
						browser.storage.local.clear()
						.then(
							() => {
								setTimeout(retryReadFullLStore,	readRetryTimeout
										   , resolve, reject, retries, isSidebar, waitMsg // Parameters of retryReadFullLStore()
								);
						})
						.catch( // Asynchronous, like .then
							function(err) {
								let msg = "Clear of  local storage failed : " + err + " - ending there :-(";
								console.log(msg);
								reject(); // Send promise for anybody waiting ..
							}
						);
					}
					else {
						console.log("This was the ultimate try, after succesful clear of local storage - ending there :-(");
						reject(); // Send promise for anybody waiting ..
					}
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
function readFullLStore(isSidebar, waitMsg) {
	let p = new Promise(
		(resolve, reject) => {
			retryReadFullLStore(resolve, reject, 10, isSidebar, waitMsg); // 10 retries - After which a clear local storage will be attempted
		}
	);

	// Return Promise
	return (p);
}