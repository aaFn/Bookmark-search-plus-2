'use strict';


//Retrieve Platform and Background page
let p_platform = browser.runtime.getPlatformInfo();
let p_background = browser.runtime.getBackgroundPage();
let p_ffversion = browser.runtime.getBrowserInfo();
let p_commands = browser.commands.getAll();

/*
 * Constants
 */
const Body = document.querySelector("#body"); // Assuming it is an HTMLBodyElement
const StatsTextarea = document.querySelector("#stats");
const ActiveFaviconsInput = document.querySelector("#activeff");
const PauseFaviconsInput = document.querySelector("#pauseff");
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
const ReversePathInput = document.querySelector("#reversepath");
const RememberSizesInput = document.querySelector("#remembersizes");
const ResetSizesButton = document.querySelector("#resetsizes");
const SetFontSizeInput = document.querySelector("#setfontsize");
const FontSizeInput = document.querySelector("#fontsize");
const SetSpaceSizeInput = document.querySelector("#setspacesize");
const SpaceSizeInput = document.querySelector("#spacesize");
const Command1Select = document.querySelector("#command1");
const Command2Select = document.querySelector("#command2");
const Opt2 = document.createElement("option");
Opt2.value = Opt2.text = "Ctrl";
const Opt3 = document.createElement("option");
Opt3.value = Opt3.text = "Alt";
const Opt4 = document.createElement("option");
Opt4.value = Opt4.text = "MacCtrl";
const Command3Select = document.querySelector("#command3");
const ResetCommandButton = document.querySelector("#resetcommand");
const TraceEnabledInput = document.querySelector("#traceEnabled");
const ResetMigr16x16Button = document.querySelector("#resetmigr16x16");
//Declared in libstore.js
//const VersionImg16 = "-img16"; // Signal that all favicons are in 16x16 format
//const DfltFontSize = 12; // 12px default
//const DfltSpaceSize = 0; // 0px default


/*
 *  Global variables
 */
let backgroundPage;
let platformOs;
let beforeFF60;
let beforeFF63;
let ffversion;
let sidebarCommand;
let command1;
let command2;
//Declared in libstore.js
//let structureVersion;
let countBookmarks, countFolders, countSeparators, countOddities, countFetchFav;


/*
 * Functions
 * ---------
 */

/*
 * Display stats in the statistics textarea
 */
function displayStats () {
  let percent = new Number (countFetchFav/countBookmarks * 100);
  StatsTextarea.textContent =    "Bookmarks:            "+countBookmarks;
  StatsTextarea.textContent += "\nFavicons to fetch:    "+countFetchFav+" ("+percent.toFixed(1)+"%)";
  StatsTextarea.textContent += "\nFolders:              "+countFolders;
  StatsTextarea.textContent += "\nSeparators:           "+countSeparators;
  StatsTextarea.textContent += "\nOddities:             "+countOddities;
}

/*
 * Handle responses or errors when talking with background
 */
function handleMsgResponse (message) {
  // Is always called, even is destination didn't specifically reply (then message is undefined)
  if (message != undefined) {
	let msg = message.content;
//    console.log("Background sent a response: <<"+msg+">> received in options");
    if (msg == "getStats") {
      countBookmarks = message.countBookmarks;
      countFetchFav = message.countFetchFav;
      countFolders = message.countFolders;
      countSeparators = message.countSeparators;
      countOddities = message.countOddities;
      displayStats();
    }
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
 * Display in the select boxes the proper values for Sidebar Command
 * 
 * cmd: String
 */
function displaySidebarCommand (cmd) {
  let cmds = cmd.split("+");
  command1 = Command1Select.value = cmds[0];

  // Refresh command2 content function of command1
  // 0 - "none"
  // 1 - "Shift"
  // 2 - "Ctrl" if >= FF63
  // 3 - "Alt" if >= FF63
  // 4 - "MacCtrl" if >= FF63 and Mac
  if (command1 == "Ctrl") {
	Command2Select.remove(2);
  }
  else if (command1 == "Alt") {
	Command2Select.remove(3);
  }
  else if (command1 == "MacCtrl") {
	Command2Select.remove(4);
  }

  if (cmds.length == 2) {
	command2 = Command2Select.value = "none";
	Command3Select.value = cmds[1];
  }
  else {
	command2 = Command2Select.value = cmds[1];
	Command3Select.value = cmds[2];
  }
}

/*
 * Save options in storage
 */
function saveOptions (e) {
  // Adjust options visibility function of others
  EnableCookiesInput.disabled = DisableFaviconsInput.checked;
  ActiveFaviconsInput.disabled = DisableFaviconsInput.checked;
  PauseFaviconsInput.disabled = DisableFaviconsInput.checked;
  OpenTreeInput.disabled = CloseSearchInput.checked;
  ReloadFFAPIButton.disabled = LoadFFAPIInput.checked;
  ResetSizesButton.disabled = !(RememberSizesInput.checked);
  let fontSize = DfltFontSize;
  let setfontsize = SetFontSizeInput.checked;
  FontSizeInput.disabled = !(setfontsize);
  if (setfontsize) {
	if (FontSizeInput.validity.valid) {
	  fontSize = FontSizeInput.value;
	}
  }
  else {
	FontSizeInput.value = DfltFontSize;
  }
  let spaceSize = DfltSpaceSize;
  let setspacesize = SetSpaceSizeInput.checked;
  SpaceSizeInput.disabled = !(setspacesize);
  if (setspacesize) {
	if (SpaceSizeInput.validity.valid) {
	  spaceSize = SpaceSizeInput.value;
	}
  }
  else {
	SpaceSizeInput.value = DfltSpaceSize;
  }

  // Save options
  browser.storage.local.set({
	 pausefavicons_option: PauseFaviconsInput.checked
	,disablefavicons_option: DisableFaviconsInput.checked
	,enablecookies_option: EnableCookiesInput.checked
	,enableflipflop_option: EnableFlipFlop.checked
	,advanced_option: AdvancedClickInput.checked
	,closesearch_option: CloseSearchInput.checked
	,opentree_option: OpenTreeInput.checked
	,immediatefavdisplay_option: ImmediateFavDisplayInput.checked
	,loadffapi_option: LoadFFAPIInput.checked
	,delayLoad_option: DelayLoadInput.checked
	,reversepath_option: ReversePathInput.checked
	,remembersizes_option: RememberSizesInput.checked
	,setfontsize_option: setfontsize
	,fontsize_option: fontSize
	,setspacesize_option: setspacesize
	,spacesize_option: spaceSize
	,sidebarcommand_option: sidebarCommand
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
  if (pauseFavicons_option_file) {
	PauseFaviconsInput.checked = true;
  }

  if (disableFavicons_option_file) {
	DisableFaviconsInput.checked = true;
	// Disable enableCookies_option and Favicon fetching mode
	EnableCookiesInput.disabled = true;
	ActiveFaviconsInput.disabled = true;
	PauseFaviconsInput.disabled = true;
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

  if (reversePath_option_file) {
	ReversePathInput.checked = true;
  }

  if (rememberSizes_option_file) {
	RememberSizesInput.checked = true;
	ResetSizesButton.disabled = false;
  }

  if (setFontSize_option_file) {
	SetFontSizeInput.checked = true;
	FontSizeInput.disabled = false;
  }

  if (fontSize_option_file != undefined) {
	FontSizeInput.value = fontSize_option_file;
  }
  else {
	FontSizeInput.value = DfltFontSize;
  }
  if (setSpaceSize_option_file) {
	SetSpaceSizeInput.checked = true;
	SpaceSizeInput.disabled = false;
  }

  if (spaceSize_option_file != undefined) {
	SpaceSizeInput.value = spaceSize_option_file;
  }
  else {
	SpaceSizeInput.value = DfltSpaceSize;
  }
  if (sidebarCommand_option_file != undefined) {
	sidebarCommand = sidebarCommand_option_file;
	if (!beforeFF60) {
	  browser.commands.update(
		{name: "_execute_sidebar_action",
		 shortcut: sidebarCommand
		}
	  );
	}
  }
  if (platformOs == "mac") { // Add support for MacCtrl on Mac
	let opt = document.createElement("option");
	opt.value = opt.text = "MacCtrl";
	Command1Select.add(opt);
  }
  if (!beforeFF63) {
	Command2Select.add(Opt2);
	Command2Select.add(Opt3);
	if (platformOs == "mac") { // Add support for MacCtrl on Mac
	  Command2Select.add(Opt4);
	}
  }
  displaySidebarCommand(sidebarCommand);
  if (beforeFF60) { // Changing the sidebar command is only supported for FF >= 60
	// Disable the corresponding Selects and Button below FF60 so that actions cannot trigger
	Command1Select.disabled = true;
	Command2Select.disabled = true;
	Command3Select.disabled = true;
	ResetCommandButton.disabled = true;
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
 * Change size of characters
 */
function changeFontSize () {
//  console.log("changeFontSize: value sent");
  if (FontSizeInput.validity.valid) {
	let fontSize = FontSizeInput.value;
//	console.log("changeFontSize: value "+fontSize);

	// Save new value
	saveOptions(undefined);
  }
  else {
	console.log("changeFontSize: invalid value");
  }
}

/*
 * Change spacing
 */
function changeSpaceSize () {
//  console.log("changeSpaceSize: value sent");
  if (SpaceSizeInput.validity.valid) {
	let spaceSize = SpaceSizeInput.value;
//	console.log("changeSpaceSize: value "+spaceSize);

	// Save new value
	saveOptions(undefined);
  }
  else {
	console.log("changeSpaceSize: invalid value");
  }
}

/*
 * Set new sidebar command, and save option
 */
function changeSidebarCommand () {
  command2 = Command2Select.value;
  if (command2 == "none") {
	sidebarCommand = command1 + "+" + Command3Select.value;
  }
  else {
	sidebarCommand = command1 + "+" + command2 + "+" + Command3Select.value;
  }
  browser.commands.update(
	{name: "_execute_sidebar_action",
	 shortcut: sidebarCommand
	}
  );

  saveOptions();
}

/*
 * Adapt contents of command2 function of command1, and save option
 */
function changeSidebarCommand1 () {
  let cmd1 = Command1Select.value;

  // If new value changed, then modify content of command2
  // 0 - "none"
  // 1 - "Shift"
  // 2 - "Ctrl" if >= FF63
  // 3 - "Alt" if >= FF63
  // 4 - "MacCtrl" if >= FF63 and Mac
  if (cmd1 != command1) {
	// Restore old command1 in list
	if (command1 == "Ctrl") {
	  Command2Select.add(Opt2, 2);
	}
	else if (command1 == "Alt") {
	  Command2Select.add(Opt3, 3);
	}
	else if (command1 == "MacCtrl") {
	  Command2Select.add(Opt4, 4);
	}
	// Remove new command1 from list
	if (cmd1 == command2) { // Going to disappear, select none instead
	  command2 = Command2Select.value = "none";
	} 
	if (cmd1 == "Ctrl") {
	  Command2Select.remove(2);
	}
	else if (cmd1 == "Alt") {
	  Command2Select.remove(3);
	}
	else if (cmd1 == "MacCtrl") {
	  Command2Select.remove(4);
	}
  	command1 = cmd1;

  	// Set new command and save options
  	changeSidebarCommand();
  }
}

/*
 * Reset sidebar command to platform default
 */
function resetSidebarCommand () {
  let cmd1, cmd2, cmd3;
  if (platformOs == "win") {
	cmd1 = "Ctrl";
	cmd2 = "none";
	cmd3 = "Q";
  }
  else if (platformOs == "linux") {
	cmd1 = "Ctrl";
	cmd2 = "Shift";
	cmd3 = "B";
  }
  else if (platformOs == "mac") {
	cmd1 = "Alt";
	cmd2 = "none";
	cmd3 = "B";
  }

  // If new value changed, then modify content of command2
  // 0 - "none"
  // 1 - "Shift"
  // 2 - "Ctrl" if >= FF63
  // 3 - "Alt" if >= FF63
  // 4 - "MacCtrl" if >= FF63 and Mac
  if (cmd1 != command1) {
	// Restore old command1 in list
	if (command1 == "Ctrl") {
	  Command2Select.add(Opt2, 2);
	}
	else if (command1 == "Alt") {
	  Command2Select.add(Opt3, 3);
	}
	else if (command1 == "MacCtrl") {
	  Command2Select.add(Opt4, 4);
	}
	// Remove new command1 from list
	if (cmd1 == command2) { // Going to disappear, select none instead
	  command2 = Command2Select.value = "none";
	} 
	if (cmd1 == "Ctrl") {
	  Command2Select.remove(2);
	}
	else if (cmd1 == "Alt") {
	  Command2Select.remove(3);
	}
	else if (cmd1 == "MacCtrl") {
	  Command2Select.remove(4);
	}
  	command1 = 	Command1Select.value = cmd1;
  }

  if (cmd2 != command2) {
	command2 = Command2Select.value = cmd2;
  }

  Command3Select.value = cmd3;

  // Set command for add-on
  if (command2 == "none") {
	sidebarCommand = command1 + "+" + cmd3;
  }
  else {
	sidebarCommand = command1 + "+" + command2 + "+" + cmd3;
  }
  browser.commands.update(
	{name: "_execute_sidebar_action",
	 shortcut: sidebarCommand
	}
  );
  
  // Save options with reset value
  saveOptions();
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
	sendAddonMessage("getStats");
  }
  else { // Background page is accessible, all was loaded inside it, so get from there
	refreshOptionsBgnd(backgroundPage);
	restoreOptions();
	countBookmarks = backgroundPage.countBookmarks;
	countFetchFav = backgroundPage.countFetchFav;
	countFolders = backgroundPage.countFolders;
	countSeparators = backgroundPage.countSeparators;
	countOddities = backgroundPage.countOddities;
	displayStats();
  }
  
  // When there is an update to an option, save the new value
  ActiveFaviconsInput.addEventListener("click", saveOptions);
  PauseFaviconsInput.addEventListener("click", saveOptions);
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
  ReversePathInput.addEventListener("click", saveOptions);
  RememberSizesInput.addEventListener("click", saveOptions);
  ResetSizesButton.addEventListener("click", resetSizes);
  SetFontSizeInput.addEventListener("click", saveOptions);
  FontSizeInput.addEventListener("change", changeFontSize);
  SetSpaceSizeInput.addEventListener("click", saveOptions);
  SpaceSizeInput.addEventListener("change", changeSpaceSize);
  Command1Select.addEventListener("change", changeSidebarCommand1);
  Command2Select.addEventListener("change", changeSidebarCommand);
  Command3Select.addEventListener("change", changeSidebarCommand);
  ResetCommandButton.addEventListener("click", resetSidebarCommand);
  TraceEnabledInput.addEventListener("click", saveOptions);
  ResetMigr16x16Button.addEventListener("click", resetMigr16x16);
}

/*
 * Initialization phase 0
 */
function initialize () {
  // Start when we have the platform and the background page
  Promise.all([p_platform, p_background, p_ffversion, p_commands])
  .then(
	function (a_values) { // An array of one value per Promise is returned
	  p_platform = p_background = p_commands = undefined;

	  // Retrieve values in the same order
	  platformOs = a_values[0].os; // info object
	  let page = a_values[1];

	  // In a private browsing window (incognito), this will be null 
	  if (page != null) { // Not in a private browsing window
		backgroundPage = page;
	  }

	  // Check FF version
	  let info = a_values[2];
	  ffversion = info.version;
	  beforeFF60 = (ffversion < "60.0");
	  beforeFF63 = (ffversion < "63.0");

	  // Look at current set command
	  let logCommands = a_values[3];
	  let len = logCommands.length;
	  let cmd;
	  for (let i=0 ; i<len ; i++) {
		if ((cmd = logCommands[i]).name == "_execute_sidebar_action") {
		  sidebarCommand = cmd.shortcut;
		}
	  }

	  initialize2();
	}
  );
}


/*
 * Main code:
 * ----------
*/

// Get saved or default values in the page 
document.addEventListener('DOMContentLoaded', initialize);