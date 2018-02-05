'use strict';

/*
 * Constants
 */
const AsyncLoadInput = document.querySelector("#asyncLoad");
const TraceEnabledInput = document.querySelector("#traceEnabled");


/*
 *  Global variables
 */


/*
 * Save options in storage
 */
function saveOptions(e) {
  var checked1;
  if (AsyncLoadInput.checked)   checked1 = "true";
  else   checked1 = "false";
  browser.storage.local.set({
	asyncLoad_option: checked1
  });

  var checked2;
  if (TraceEnabledInput.checked)   checked2 = "true";
  else   checked2 = "false";
  browser.storage.local.set({
	traceEnabled_option: checked2
  });
}

/*
 * Restore options from storage
 */
function restoreOptions() {
  var gettingItem1 = browser.storage.local.get("asyncLoad_option");
  gettingItem1.then((res) => {
    if (res.asyncLoad_option != undefined) {
      if (res.asyncLoad_option == "true")   AsyncLoadInput.checked = true;
    }
  });

  var gettingItem2 = browser.storage.local.get("traceEnabled_option");
  gettingItem2.then((res) => {
    if (res.traceEnabled_option != undefined) {
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
document.querySelector("#asyncLoad").addEventListener("click", saveOptions);
document.querySelector("#traceEnabled").addEventListener("click", saveOptions);