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
const DelayLoadInput = document.querySelector("#delayLoad");
const RememberSizesInput = document.querySelector("#remembersizes");
const ResetSizesButton = document.querySelector("#resetsizes");
const TraceEnabledInput = document.querySelector("#traceEnabled");
const ResetMigr16x16Button = document.querySelector("#resetmigr16x16");
const VersionImg16 = "-img16"; // Signal that all favicons are in 16x16 format


/*
 *  Global variables
 */
let platformOs;
let structureVersion;


/*
 * Functions
 * ---------
 */

/*
 * Save options in storage
 */
function saveOptions (e) {
  if (DisableFaviconsInput.checked) {
   	EnableCookiesInput.disabled = true;
  }
  else {
   	EnableCookiesInput.disabled = false;
  }
  if (RememberSizesInput.checked) {
    ResetSizesButton.disabled = false;
  }
  else {
    ResetSizesButton.disabled = true;
  }

  browser.storage.local.set({
	 disablefavicons_option: DisableFaviconsInput.checked
	,enablecookies_option: EnableCookiesInput.checked
	,enableflipflop_option: EnableFlipFlop.checked
	,advanced_option: AdvancedClickInput.checked
	,opentree_option: OpenTreeInput.checked
	,closesearch_option: CloseSearchInput.checked
	,immediatefavdisplay_option: ImmediateFavDisplayInput.checked
	,delayLoad_option: DelayLoadInput.checked
	,remembersizes_option: RememberSizesInput.checked
	,traceEnabled_option: TraceEnabledInput.checked
  });
}

/*
 * Restore options from storage
 */
function restoreOptions () {
  let gettingItem = browser.storage.local.get([
	 "disablefavicons_option"
	,"enablecookies_option"
	,"enableflipflop_option"
    ,"advanced_option"
    ,"opentree_option"
    ,"closesearch_option"
    ,"immediatefavdisplay_option"
    ,"delayLoad_option"
	,"remembersizes_option"
    ,"traceEnabled_option"
    ,"structureVersion"
]);
  gettingItem.then((res) => {
	let value;
    if ((value = res.disablefavicons_option) != undefined) {
      // Unchecked by default
      // Cleaning of local store old version .. delete on long term (2.0.30+)
      if (value == "true") {
        value = true;
        browser.storage.local.set({disablefavicons_option: true});
  	  }
      if (value) {
    	DisableFaviconsInput.checked = true;
    	EnableCookiesInput.disabled = true;
      }
      else {
      	EnableCookiesInput.disabled = false;
      }
    }

    if ((value = res.enablecookies_option) != undefined) {
      // Unchecked by default
      // Cleaning of local store old version .. delete on long term (2.0.30+)
      if (value == "true") {
        value = true;
        browser.storage.local.set({enablecookies_option: true});
      }
      if (value)   EnableCookiesInput.checked = true;
    }

    if ((value = res.enableflipflop_option) != undefined) {
        // Unchecked by default
        if (value)   EnableFlipFlop.checked = true;
      }

    if ((value = res.advanced_option) != undefined) {
      // Simple checked by default
      // Cleaning of local store old version .. delete on long term (2.0.30+)
      if (value == "true") {
        value = true;
        browser.storage.local.set({advanced_option: true});
      }
      if (value)   AdvancedClickInput.checked = true;
      else   SimpleClickInput.checked = true;
    }

    if ((value = res.opentree_option) != undefined) {
      // Unchecked by default
      // Cleaning of local store old version .. delete on long term (2.0.30+)
      if (value == "true") {
        value = true;
        browser.storage.local.set({opentree_option: true});
      }
      if (value)   OpenTreeInput.checked = true;
    }

    if ((value = res.closesearch_option) != undefined) {
      // Unchecked by default
      // Cleaning of local store old version .. delete on long term (2.0.30+)
      if (value == "true") {
        value = true;
        browser.storage.local.set({closesearch_option: true});
      }
      if (value)   CloseSearchInput.checked = true;
    }

    if ((value = res.immediatefavdisplay_option) != undefined) {
        // Unchecked by default
        if (value)   ImmediateFavDisplayInput.checked = true;
      }

    if ((value = res.delayLoad_option) != undefined) {
      // Unchecked by default
      // Cleaning of local store old version .. delete on long term (2.0.30+)
      if (value == "true") {
        value = true;
        browser.storage.local.set({delayLoad_option: true});
      }
value = false; // Disabled option for now
      if (value)   DelayLoadInput.checked = true;
    }

    if ((value = res.remembersizes_option) != undefined) {
      // Unchecked by default
      // Cleaning of local store old version .. delete on long term (2.0.30+)
      if (value == "true") {
        value = true;
        browser.storage.local.set({remembersizes_option: true});
      }
      if (value) {
        RememberSizesInput.checked = true;
        ResetSizesButton.disabled = false;
      }
      else {
        ResetSizesButton.disabled = true;
      }
    }

    if ((value = res.traceEnabled_option) != undefined) {
      // Unchecked by default
      // Cleaning of local store old version .. delete on long term (2.0.30+)
      if (value == "true") {
        value = true;
        browser.storage.local.set({traceEnabled_option: true});
      }
      if (value)   TraceEnabledInput.checked = true;
    }

    // Get migrations state / current state
    if ((value = res.structureVersion) != undefined) {
   	  structureVersion = value;

   	  if (structureVersion.includes(VersionImg16)) {
   		ResetMigr16x16Button.disabled = false;
   	  }
    }
    else { // Doesn't exist yet
      structureVersion = "";
    }
  });



  // Temporary code to cleanup old option, to be removed in a future version 
  gettingItem = browser.storage.local.get("asyncLoad_option");
  gettingItem.then((res) => {
    if (res.asyncLoad_option != undefined) {
      browser.storage.local.remove("asyncLoad_option");
    }
  });
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
  });
}

/*
 * Remove 16x16 migration complete flag
 */
function resetMigr16x16  () {
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
}


/*
 * Main code:
 * ----------
*/
// Get saved or default values in the page 
document.addEventListener('DOMContentLoaded', restoreOptions);

//Retrieve Platform
browser.runtime.getPlatformInfo().then(function(info){
  platformOs = info.os;

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

  // When there is an update to an option, save the new value
  DisableFaviconsInput.addEventListener("click", saveOptions);
  EnableCookiesInput.addEventListener("click", saveOptions);
  EnableFlipFlop.addEventListener("click", saveOptions);
  SimpleClickInput.addEventListener("click", saveOptions);
  AdvancedClickInput.addEventListener("click", saveOptions);
  OpenTreeInput.addEventListener("click", saveOptions);
  CloseSearchInput.addEventListener("click", saveOptions);
  ImmediateFavDisplayInput.addEventListener("click", saveOptions);
  DelayLoadInput.addEventListener("click", saveOptions);
  RememberSizesInput.addEventListener("click", saveOptions);
  ResetSizesButton.addEventListener("click", resetSizes);
  TraceEnabledInput.addEventListener("click", saveOptions);
  ResetMigr16x16Button.addEventListener("click", resetMigr16x16);
});