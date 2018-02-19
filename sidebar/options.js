'use strict';

/*
 * Constants
 */
const AdvancedClick = document.querySelector("#advanced");
const OpenTree = document.querySelector("#opentree");
const AsyncLoadInput = document.querySelector("#asyncLoad");
const TraceEnabledInput = document.querySelector("#traceEnabled");


/*
 *  Global variables
 */


/*
 * Save options in storage
 */
function saveOptions(e) {
  var checked;
  if (AdvancedClick.checked)   checked = "true";
  else   checked = "false";
  browser.storage.local.set({
	advanced_option: checked
  });

  if (OpenTree.checked)   checked = "true";
  else   checked = "false";
  browser.storage.local.set({
	opentree_option: checked
  });

  if (AsyncLoadInput.checked)   checked = "true";
  else   checked = "false";
  browser.storage.local.set({
	asyncLoad_option: checked
  });

  if (TraceEnabledInput.checked)   checked = "true";
  else   checked = "false";
  browser.storage.local.set({
	traceEnabled_option: checked
  });
}

/*
 * Restore options from storage
 */
function restoreOptions() {
  var gettingItem;
  gettingItem = browser.storage.local.get("advanced_option");
  gettingItem.then((res) => {
    if (res.advanced_option != undefined) {
      // Unchecked by default
      if (res.advanced_option == "true")   AdvancedClick.checked = true;
    }
  });

  gettingItem = browser.storage.local.get("opentree_option");
  gettingItem.then((res) => {
    if (res.opentree_option != undefined) {
      // Unchecked by default
      if (res.opentree_option == "true")   OpenTree.checked = true;
    }
  });

  gettingItem = browser.storage.local.get("asyncLoad_option");
  gettingItem.then((res) => {
    if (res.asyncLoad_option != undefined) {
      // Unchecked by default
      if (res.asyncLoad_option == "true")   AsyncLoadInput.checked = true;
    }
  });

  gettingItem = browser.storage.local.get("traceEnabled_option");
  gettingItem.then((res) => {
    if (res.traceEnabled_option != undefined) {
      // Unchecked by default
      if (res.traceEnabled_option == "true")   TraceEnabledInput.checked = true;
    }
  });
}


/*
 * Main code:
 * ----------
*/
// Get saved or default values in the page 
document.addEventListener('DOMContentLoaded', restoreOptions);

// When there is an update to an option, save the new value
document.querySelector("#advanced").addEventListener("click", saveOptions);
document.querySelector("#opentree").addEventListener("click", saveOptions);
document.querySelector("#asyncLoad").addEventListener("click", saveOptions);
document.querySelector("#traceEnabled").addEventListener("click", saveOptions);