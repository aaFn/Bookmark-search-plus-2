'use strict';


/*
 * Constants
 */
const Body = document.querySelector("#body"); // Assuming it is an HTMLBodyElement
const DisableFaviconsInput = document.querySelector("#disablefavicons");
const EnableCookiesInput = document.querySelector("#enablecookies");
const EnableFlipFlop = document.querySelector("#enableflipflop");
const SimpleClickInput = document.querySelector("#simple");
const AdvancedClickInput = document.querySelector("#advanced");
const OpenTreeInput = document.querySelector("#opentree");
const CloseSearchInput = document.querySelector("#closesearch");
const ImmediateFavDisplayInput = document.querySelector("#immediatefavdisplay");
const LoadFFAPIInput = document.querySelector("#loadffapi");
const ReloadFFAPIButton = document.querySelector("#reloadffapi");
const DelayLoadInput = document.querySelector("#delayLoad");
const RememberSizesInput = document.querySelector("#remembersizes");
const ResetSizesButton = document.querySelector("#resetsizes");
const TraceEnabledInput = document.querySelector("#traceEnabled");
const ResetMigr16x16Button = document.querySelector("#resetmigr16x16");
//Declared in libstore.js
//const VersionImg16 = "-img16"; // Signal that all favicons are in 16x16 format


/*
 *  Global variables
 */
//Get background page asap
let bPagePromise = browser.runtime.getBackgroundPage();
let backgroundPage;
let platformOs;
//Declared in libstore.js
//let structureVersion;


/*
 * Functions
 * ---------
 */

/*
 * Handle responses or errors when talking with background
 */
function handleMsgResponse (message) {
  // Is always called, even is destination didn't specifically reply (then message is undefined)
  if (message != undefined) {
//    console.log("Background sent a response: <<"+message.content+">> received in options");
  }
}

function handleMsgError (error) {
  console.log("Error: "+error);
}

/*
 * Send msg to background
 */
function sendAddonMessage (msg) {
  browser.runtime.sendMessage(
	{source: "options",
	 content: msg
	}
  ).then(handleMsgResponse, handleMsgError);
}

/*
 * Save options in storage
 */
function saveOptions (e) {
  // Adjust options visibility function of others
  EnableCookiesInput.disabled = DisableFaviconsInput.checked;
  OpenTreeInput.disabled = CloseSearchInput.checked;
  ReloadFFAPIButton.disabled = LoadFFAPIInput.checked;
  ResetSizesButton.disabled = !(RememberSizesInput.checked);

  // Save options
  browser.storage.local.set({
	 disablefavicons_option: DisableFaviconsInput.checked
	,enablecookies_option: EnableCookiesInput.checked
	,enableflipflop_option: EnableFlipFlop.checked
	,advanced_option: AdvancedClickInput.checked
	,closesearch_option: CloseSearchInput.checked
	,opentree_option: OpenTreeInput.checked
	,immediatefavdisplay_option: ImmediateFavDisplayInput.checked
	,loadffapi_option: LoadFFAPIInput.checked
	,delayLoad_option: DelayLoadInput.checked
	,remembersizes_option: RememberSizesInput.checked
	,traceEnabled_option: TraceEnabledInput.checked
  })
  .then(
	function () {
	  // Signal change to options to all
	  sendAddonMessage("savedOptions");
	}
  );
}

/*
 * Restore options on Options page at page load time
 */
function restoreOptions () {
  if (disableFavicons_option_file) {
	DisableFaviconsInput.checked = true;
	// Disable enableCookies_option
	EnableCookiesInput.disabled = true;
  }

  if (enableCookies_option_file) {
	EnableCookiesInput.checked = true;
  }

  if (enableFlipFlop_option_file) {
	EnableFlipFlop.checked = true;
  }

  if (advancedClick_option_file) {
	AdvancedClickInput.checked = true;
  }

  if (closeSearch_option_file) {
	CloseSearchInput.checked = true;
	// Disable openTree_option
	OpenTreeInput.disabled = true;
  }

  if (openTree_option_file) {
  	OpenTreeInput.checked = true;
  }

  if (immediateFavDisplay_option_file) {
	ImmediateFavDisplayInput.checked = true;
  }

  if (loadffapi_option_file) {
	LoadFFAPIInput.checked = true;
	ReloadFFAPIButton.disabled = true;
  }

  if (delayLoad_option_file) {
	DelayLoadInput.checked = true;
  }

  if (rememberSizes_option_file) {
	RememberSizesInput.checked = true;
	ResetSizesButton.disabled = false;
  }

  if (traceEnabled_option_file) {
	TraceEnabledInput.checked = true;
  }

  if (structureVersion.includes(VersionImg16)) {
	ResetMigr16x16Button.disabled = false;
  }
}

/*
 * Reload bookmark tree from FF API
 */
function reloadFFAPI () {
//  console.log("Reload FF API bookmark tree button pressed");
  // Disable button
  ReloadFFAPIButton.disabled = true;

  // Signal reload to background, and then redisplay to all
  sendAddonMessage("reloadFFAPI");
}

/*
 * Remove saved sizes from storage to reset them
 */
function resetSizes  () {
//  console.log("Reset button pressed");
  let gettingItem = browser.storage.local.get([
	"searchheight_option"
	,"popupheight_option"
	,"popupwidth_option"
  ]);
  gettingItem.then((res) => {
    if (res.searchheight_option != undefined) {
      browser.storage.local.remove("searchheight_option");
    }
    if (res.popupheight_option != undefined) {
      browser.storage.local.remove("popupheight_option");
    }
    if (res.popupwidth_option != undefined) {
      browser.storage.local.remove("popupwidth_option");
    }

    // Signal reset to all
  	sendAddonMessage("resetSizes");
  });
}

/*
 * Remove 16x16 migration complete flag
 */
function resetMigr16x16 () {
//  console.log("16x16 migration reset button pressed");
  let pos = structureVersion.indexOf(VersionImg16);
  if (pos != -1) { // Remove the flag
	structureVersion = structureVersion.slice(0, pos)
	                   + structureVersion.slice(pos + VersionImg16.length);
//    console.log("structureVersion: <<"+structureVersion+">>");

    browser.storage.local.set({
  	  structureVersion: structureVersion
    });
  }

  // Disable button
  ResetMigr16x16Button.disabled = true;

  // Signal reset to nackground
  sendAddonMessage("resetMigr16x16");
}

/*
 * Initialization phase 2
 */
function initialize2 () {
  // Some variations depending on platform
  if (platformOs == "win") {
	Body.classList.replace("fontdflt", "fontwin");
  }
  else if (platformOs == "linux") {
    Body.style.fontSize = "12px";
  }
  else if (platformOs == "mac") {
    Body.style.fontSize = "12px";
  }

  // Get options and populate Options page Input elements
  if ((backgroundPage == undefined) || (backgroundPage.ready == undefined)) { // Load by ourselves
	refreshOptionsLStore()
	.then(restoreOptions);
  }
  else { // Bacground page is accessible, all was loaded inside it, so get from there
	refreshOptionsBgnd(backgroundPage);
	restoreOptions();
  }

  // When there is an update to an option, save the new value
  DisableFaviconsInput.addEventListener("click", saveOptions);
  EnableCookiesInput.addEventListener("click", saveOptions);
  EnableFlipFlop.addEventListener("click", saveOptions);
  SimpleClickInput.addEventListener("click", saveOptions);
  AdvancedClickInput.addEventListener("click", saveOptions);
  OpenTreeInput.addEventListener("click", saveOptions);
  CloseSearchInput.addEventListener("click", saveOptions);
  ImmediateFavDisplayInput.addEventListener("click", saveOptions);
  LoadFFAPIInput.addEventListener("click", saveOptions);
  ReloadFFAPIButton.addEventListener("click", reloadFFAPI);
  DelayLoadInput.addEventListener("click", saveOptions);
  RememberSizesInput.addEventListener("click", saveOptions);
  ResetSizesButton.addEventListener("click", resetSizes);
  TraceEnabledInput.addEventListener("click", saveOptions);
  ResetMigr16x16Button.addEventListener("click", resetMigr16x16);
}

/*
 * Initialization phase 0
 */
function initialize () {
  bPagePromise.then(
	function (page) {
	  bPagePromise = undefined;
	  // In a private browsing window (incognito), this will be null 
	  if (page != null) { // Not in a private browsing window
		backgroundPage = page;

		// Retrieve main infos and options already gathered by Background page
		platformOs = backgroundPage.platformOs;
		initialize2();
	  }
	  else { // In a private browsing window
		//Retrieve Platform
		browser.runtime.getPlatformInfo().then(function(info){
		  platformOs = info.os;
		  initialize2();
		});
	  }
	},
	function (error) {
	  bPagePromise = undefined;
	  msg = "Options: Can't access background page: "+error;
	  console.log(msg);
	  trace(msg, true);

	  //Retrieve Platform
	  browser.runtime.getPlatformInfo().then(function(info){
		platformOs = info.os;
		initialize2();
	  });
	}
  );
}


/*
 * Main code:
 * ----------
*/

// Get saved or default values in the page 
document.addEventListener('DOMContentLoaded', initialize);