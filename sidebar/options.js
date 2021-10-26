'use strict';


//Retrieve Platform and Background page
let p_platform = browser.runtime.getPlatformInfo();
let p_background = browser.runtime.getBackgroundPage();
let p_ffversion = browser.runtime.getBrowserInfo();
let p_getWindowId = browser.windows.getCurrent(
//  {populate: true	
//  }
);
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
const ShowPathInput = document.querySelector("#showpath");
const CloseSearchInput = document.querySelector("#closesearch");
const ImmediateFavDisplayInput = document.querySelector("#immediatefavdisplay");
const LoadFFAPIInput = document.querySelector("#loadffapi");
const ReloadFFAPIButton = document.querySelector("#reloadffapi");
const NoFFAPISearchInput = document.querySelector("#noffapisearch");
const DelayLoadInput = document.querySelector("#delayLoad");
const SearchOnEnterInput = document.querySelector("#searchonenter");
const ReversePathInput = document.querySelector("#reversepath");
const CloseSibblingFoldersInput = document.querySelector("#closesibblingfolders");
const RememberSizesInput = document.querySelector("#remembersizes");
const ResetSizesButton = document.querySelector("#resetsizes");
const SetFontSizeInput = document.querySelector("#setfontsize");
const FontSizeInput = document.querySelector("#fontsize");
const SetSpaceSizeInput = document.querySelector("#setspacesize");
const SpaceSizeInput = document.querySelector("#spacesize");
const MatchThemeInput = document.querySelector("#matchtheme");
const SetColorsInput = document.querySelector("#setcolors");
const TextColorInput = document.querySelector("#textcolor");
const TextColorSpan = document.querySelector("#tcstring");
const BckgndColorInput = document.querySelector("#bckgndcolor");
const BckgndColorSpan = document.querySelector("#bcstring");
const AltFldrFileInput = document.querySelector("#altfldrfile");
const AltFldrImg = document.querySelector("#altfldrimg");
const UseAltFldrInput = document.querySelector("#usealtfldr");
const AltNoFavFileInput = document.querySelector("#altnofavfile");
const AltNoFavImg = document.querySelector("#altnofavimg");
const UseAltNoFavInput = document.querySelector("#usealtnofav");
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
const TrashEnabledInput = document.querySelector("#trashEnabled");
const TrashVisibleInput = document.querySelector("#trashVisible");
const HistoryRetentionInput = document.querySelector("#historyretention");
const HistoryClearButton = document.querySelector("#historyclear"); // Assuming it is an HTMLButtonElement
const TraceEnabledInput = document.querySelector("#traceEnabled");
const ResetMigr16x16Button = document.querySelector("#resetmigr16x16");
//Declared in libstore.js
//const VersionImg16 = "-img16"; // Signal that all favicons are in 16x16 format
//const DfltFontSize = 12; // 12px default
//const DfltSpaceSize = 0; // 0px default
//const DfltTextColor = "#222426"; // Default text color
//const DfltBckgndColor = "white"; // Default background color
//const DfltHistoryRetention = "30"; // 30 days default
//const BSP2TrashName = "BSP2 trash folder for undo of bookmark deletes - DO NOT DELETE !" // Placed under Other bookmarks


/*
 *  Global variables
 */
let backgroundPage;
let platformOs;
let beforeFF57;
let beforeFF60;
let beforeFF63;
let ffversion;
let myWindowId;
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
if (traceEnabled_option) {
  console.log("Background sent a response: <<"+msg+">> received in options");
}
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
	else {
	  FontSizeInput.value = DfltFontSize;
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
	else {
	  SpaceSizeInput.value = DfltSpaceSize;
	}
  }
  else {
	SpaceSizeInput.value = DfltSpaceSize;
  }
  let matchtheme = MatchThemeInput.checked;
  let setcolors = SetColorsInput.checked;
  SetColorsInput.disabled = matchtheme;
  let textColor = DfltTextColor;
  let bckgndColor = DfltBckgndColor;
  if (matchtheme || setcolors) {
	textColor = TextColorInput.value;
	bckgndColor = BckgndColorInput.value;
  }
  else {
	TextColorInput.value = textColor;
	BckgndColorInput.value = bckgndColor;
  }
  TextColorInput.title = textColor;
  TextColorSpan.textContent = colorLabel(textColor);
  BckgndColorInput.title = bckgndColor;
  BckgndColorSpan.textContent = colorLabel(bckgndColor);
  BckgndColorInput.disabled = TextColorInput.disabled = !setcolors || matchtheme;
  let altFldrImgSrc = AltFldrImg.src;
  if ((altFldrImgSrc == "") || (altFldrImgSrc == AltFldrImg.baseURI)) {
	altFldrImgSrc = undefined;
  }
  let useAltFldr = (!UseAltFldrInput.disabled) && UseAltFldrInput.checked;
  let altNoFavImgSrc = AltNoFavImg.src;
  if ((altNoFavImgSrc == "") || (altNoFavImgSrc == AltNoFavImg.baseURI)) {
	altNoFavImgSrc = undefined;
  }
  let useAltNoFav = (!UseAltNoFavInput.disabled) && UseAltNoFavInput.checked;
  let trashEnabled = TrashEnabledInput.checked;
  TrashVisibleInput.disabled = !trashEnabled;
  let historyRetention = DfltHistoryRetention;
  if (HistoryRetentionInput.validity.valid) {
	historyRetention = HistoryRetentionInput.value;
  }
  else {
	HistoryRetentionInput.value = DfltHistoryRetention;
  }

  // Save options
  browser.storage.local.set({
	 pausefavicons_option: PauseFaviconsInput.checked
	,disablefavicons_option: DisableFaviconsInput.checked
	,enablecookies_option: EnableCookiesInput.checked
	,enableflipflop_option: EnableFlipFlop.checked
	,advanced_option: AdvancedClickInput.checked
	,showpath_option: ShowPathInput.checked
	,closesearch_option: CloseSearchInput.checked
	,opentree_option: OpenTreeInput.checked
	,immediatefavdisplay_option: ImmediateFavDisplayInput.checked
	,loadffapi_option: LoadFFAPIInput.checked
	,noffapisearch_option: NoFFAPISearchInput.checked
	,delayLoad_option: DelayLoadInput.checked
	,searchonenter_option: SearchOnEnterInput.checked
	,reversepath_option: ReversePathInput.checked
	,closesibblingfolders_option: CloseSibblingFoldersInput.checked
	,remembersizes_option: RememberSizesInput.checked
	,setfontsize_option: setfontsize
	,fontsize_option: fontSize
	,setspacesize_option: setspacesize
	,spacesize_option: spaceSize
	,matchtheme_option: matchtheme
	,setcolors_option: setcolors
	,textcolor_option: textColor
	,bckgndcolor_option: bckgndColor
	,altfldrimg_option: altFldrImgSrc
	,usealtfldr_option: useAltFldr
	,altnofavimg_option: altNoFavImgSrc
	,usealtnofav_option: useAltNoFav
	,sidebarcommand_option: sidebarCommand
	,trashenabled_option: trashEnabled
	,trashvisible_option: TrashVisibleInput.checked
	,historyretention_option: historyRetention
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
 * Convert a #RRGGBB value to 3 decimal blank separated String
 * 
 * c is a String
 * Returns a String
 */
function cHex2Dec (c) {
  let r = "0x" + c[1] + c[2];
  let g = "0x" + c[3] + c[4];
  let b = "0x" + c[5] + c[6];
  let d = (+r).toString(10) + " " + (+g).toString(10) + " " + (+b).toString(10);
  return(d);
}

/*
 * Generate color span text from hex string
 */
function colorLabel (c) {
  return(" (" + cHex2Dec(c) + ")");
}

/* 
 * Convert a decimal color to a 2 digit hexadecimal value. Support % values
 * 
 * c is a String
 * Returns a String
 */
function cDec2Hex (c) {
  if (c.indexOf("%") > -1) {
	c = Math.round(c.substr(0, c.length - 1) / 100 * 255);
	/* Example: 75% -> 191, because 75/100 = 0.75, * 255 = 191.25 -> 191 */
  }
  let h = (+c).toString(16);
  if (h.length == 1) {
    h = "0" + h;
  }
  return(h);
}

/*
 * Normalize color value to a 7 characters #RRGGBB value
 * Cf. https://css-tricks.com/converting-color-spaces-in-javascript/
 *     https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
 * 
 * color is a String
 * Returns a #RRGGBB String
 */
function normalizeColors (color) {
  let normColor;
  if (color.charAt(0) == '#') {
	if (color.length < 7) { // #RGB form
	  let r = color.charAt(1);
	  let g = color.charAt(2);
	  let b = color.charAt(3);
	  normColor = "#" + r + r + g + g + b + b;
	}
	else { // #RRGGBB form
	  normColor = color;
	}
  }
  else if (color.startsWith("rgb(")) {
	// Choose correct separator
	let sep = (color.indexOf(",") > -1) ? ',' : ' ';
	// Turn "rgb(r,g,b)" into [r,g,b]
	let rgb = color.substr(4).split(")")[0].split(sep);
	normColor = "#" + cDec2Hex(rgb[0]) + cDec2Hex(rgb[1]) + cDec2Hex(rgb[2]);
  }
  else if (color.startsWith("hsl(")) {
	// Choose correct separator
	let sep = (color.indexOf(",") > -1) ? ',' : ' ';
	// Turn "hsl(h,s,l)" into [h,s,l]
	let hsl = color.substr(4).split(")")[0].split(sep);
	let h = hsl[0];
	let s = hsl[1].substr(0, hsl[1].length - 1) / 100;
	let l = hsl[2].substr(0, hsl[2].length - 1) / 100;
	// Strip label in h and convert to degrees (if necessary)
	if (h.indexOf("deg") > -1) {
	  h = h.substr(0,h.length - 3);
	}
	else if (h.indexOf("rad") > -1) {
	  h = Math.round(h.substr(0,h.length - 3) * (180 / Math.PI));
	}
	else if (h.indexOf("turn") > -1) {
	  h = Math.round(h.substr(0,h.length - 4) * 360);
	}
	// Keep hue fraction of 360 if ending up over
	if (h >= 360) {
	  h %= 360;
	}

	// Conversion to RGB begins
	let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = l - c/2;
    let r = 0;
    let g = 0;
    let b = 0;
    if ((0 <= h) && (h < 60)) {
      r = c;
      g = x;
      b = 0;
    }
    else if ((60 <= h) && (h < 120)) {
      r = x;
      g = c;
      b = 0;
    }
    else if ((120 <= h) && (h < 180)) {
      r = 0;
      g = c;
      b = x;
    }
    else if ((180 <= h) && (h < 240)) {
      r = 0;
      g = x;
      b = c;
    }
    else if ((240 <= h) && (h < 300)) {
      r = x;
      g = 0;
      b = c;
    }
    else if ((300 <= h) && (h < 360)) {
      r = c;
      g = 0;
      b = x;
    }

    // Having obtained RGB, convert channels to hex
    r = Math.round((r + m) * 255).toString(16);
    g = Math.round((g + m) * 255).toString(16);
    b = Math.round((b + m) * 255).toString(16);

    // Prepend 0s, if necessary
    if (r.length == 1) {
      r = "0" + r;
    }
    if (g.length == 1) {
      g = "0" + g;
    }
    if (b.length == 1) {
      b = "0" + b;
    }

    normColor = "#" + r + g + b;
  }
  else { // Assume this is a textual name of color, or hope it will handle other cases ...
	// Create fake div
	let fakeDiv = document.createElement("div");
	fakeDiv.style.color = color;
	document.body.appendChild(fakeDiv);

	// Get color of div
	let cs = window.getComputedStyle(fakeDiv);
	normColor = cs.getPropertyValue("color");

	// Remove div after obtaining desired color value
	document.body.removeChild(fakeDiv);
  }

  return(normColor);
}

/*
 * Get colors from current windows theme, and register changes to it
 * 
 * wTheme is a theme.Theme object
 */
function getPanelColors (wTheme) {
  let textColor;
  let bckgndColor;
  let propColors = wTheme.colors;
  if ((propColors == undefined) || (propColors == null)) { // No colors part => reset to default
														   // (can also happen when active theme is default)
	textColor = DfltTextColor;
	bckgndColor = DfltBckgndColor;
  }
  else { // Retrieve the colors
	textColor = propColors.sidebar_text;
	bckgndColor = propColors.sidebar;

	// Convert them to 7 characters #hex values if not in that format
	if (textColor == null) {
	  textColor = DfltTextColor;
	}
	else {
	  textColor = normalizeColors(textColor)
	}
	if (bckgndColor == null) {
	  bckgndColor = DfltBckgndColor;
	}
	else {
	  bckgndColor = normalizeColors(bckgndColor)
	}
  }

  // Register listener
  browser.theme.onUpdated.addListener(themeRefreshedHandler);

  // Set proper values in the corresponding Input objects, and then save 
  TextColorInput.title = TextColorInput.value = textColor;
  TextColorSpan.textContent = colorLabel(textColor);
  BckgndColorInput.title = BckgndColorInput.value = bckgndColor;
  BckgndColorSpan.textContent = colorLabel(bckgndColor);
  saveOptions(undefined);
}

/*
 * Fetch current FF window theme and get colors from it
 */
function fetchTheme () {
  if (MatchThemeInput.checked) {
	browser.theme.getCurrent(myWindowId)
	.then(getPanelColors);
  }
  else {
	// Remove listener
	browser.theme.onUpdated.removeListener(themeRefreshedHandler);
	saveOptions(undefined);
  }
}

/*
 * Handle changes to FF window theme
 */
function themeRefreshedHandler (updateInfo) {
  let wId = updateInfo.windowId;
  if ((wId == undefined) || (wId = myWindowId)) {
	browser.theme.getCurrent(myWindowId)
	.then(getPanelColors);
  }
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

  if (showPath_option_file) {
	ShowPathInput.checked = true;
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

  if (noffapisearch_option_file) {
	NoFFAPISearchInput.checked = true;
  }

  if (delayLoad_option_file) {
	DelayLoadInput.checked = true;
  }

  if (searchOnEnter_option_file) {
	SearchOnEnterInput.checked = true;
  }

  if (reversePath_option_file) {
	ReversePathInput.checked = true;
  }

  if (closeSibblingFolders_option_file) {
	CloseSibblingFoldersInput.checked = true;
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

  let matchtheme = false;
  if (matchTheme_option_file) {
	if (beforeFF57) { // The API is not active before FF57
	  MatchThemeInput.checked = false;
	}
	else {
	  matchtheme = MatchThemeInput.checked = true;
	  fetchTheme(); // Get current colors and set other fields appropriately
	}
  }
  if (beforeFF57) {
	MatchThemeInput.disabled = true;
  }

  let setcolors = false;
  if (setColors_option_file) {
	setcolors = SetColorsInput.checked = true;
  }
  SetColorsInput.disabled = matchtheme;

  if (textColor_option_file != undefined) {
	TextColorInput.title = TextColorInput.value = textColor_option_file;
	TextColorSpan.textContent = colorLabel(textColor_option_file);
  }
  else {
	TextColorInput.title = TextColorInput.value = DfltTextColor;
	TextColorSpan.textContent = colorLabel(DfltTextColor);
  }

  if (bckgndColor_option_file != undefined) {
	BckgndColorInput.title = BckgndColorInput.value = bckgndColor_option_file;
	BckgndColorSpan.textContent = colorLabel(bckgndColor_option_file);
  }
  else {
	BckgndColorInput.title = BckgndColorInput.value = DfltBckgndColor;
	BckgndColorSpan.textContent = colorLabel(DfltBckgndColor);
  }
  BckgndColorInput.disabled = TextColorInput.disabled = !setcolors || matchtheme;

  let useAltFldrDisabled = true;
  if (altFldrImg_option_file != undefined) {
	AltFldrImg.src = altFldrImg_option_file;
	useAltFldrDisabled = UseAltFldrInput.disabled = false;
  }
  if (useAltFldr_option_file != undefined) {
	if (!useAltFldrDisabled) {
	  UseAltFldrInput.checked = useAltFldr_option_file;
	}
  }

  let useAltNoFavDisabled = true;
  if (altNoFavImg_option_file != undefined) {
	AltNoFavImg.src = altNoFavImg_option_file;
	useAltNoFavDisabled = UseAltNoFavInput.disabled = false;
  }
  if (useAltNoFav_option_file != undefined) {
	if (!useAltNoFavDisabled) {
	  UseAltNoFavInput.checked = useAltNoFav_option_file;
	}
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
  
  let trashEnabled = true;
  if (trashEnabled_option_file != undefined) {
	trashEnabled = TrashEnabledInput.checked = trashEnabled_option_file;
  }
  else {
	TrashEnabledInput.checked = true;
  }

  if (trashVisible_option_file != undefined) {
	TrashVisibleInput.checked = trashVisible_option_file;
  }
  else {
	TrashVisibleInput.checked = false;
  }
  TrashVisibleInput.disabled = !trashEnabled;

  if (historyRetention_option_file != undefined) {
	HistoryRetentionInput.value = historyRetention_option_file;
  }
  else {
	HistoryRetentionInput.value = DfltHistoryRetention;
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
  if (FontSizeInput.validity.valid) {
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
  if (SpaceSizeInput.validity.valid) {
	// Save new value
	saveOptions(undefined);
  }
  else {
	console.log("changeSpaceSize: invalid value");
  }
}

/*
 * Change bookamark history retention
 */
function changeHistoryRetention () {
  if (HistoryRetentionInput.validity.valid) {
	// Save new value
	saveOptions(undefined);
  }
  else {
	console.log("changeHistoryRetention: invalid value");
  }
}

/*
 * Clear history action
 */ 
function historyClearHandler (e) {
  // Demand clear to background
  sendAddonMessage("clearHistory");
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
 * Mechanics to load image from specified alternative image files
 */
let cvtUri;
let cvtImg;
let cvtUseInput;
const CvtImage = new Image(16, 16);
CvtImage.onload = convertOnLoad;
CvtImage.onerror = errorCvtOnLoad;

function altFldrImgLoad () { // When loading a new Folder image
  let file = AltFldrFileInput.files[0];
  if (file) {
	let reader = new FileReader();

	// Prepare callback function for conversion and store in local storage when file content is read
	reader.addEventListener(
	  "load",
	  function () {
		cvtImg = AltFldrImg;
		cvtUseInput = UseAltFldrInput;
		// convert image file to data: base64 URI
		CvtImage.src = cvtUri = reader.result;
	  },
	  false
	);

	// Read and then convert
	reader.readAsDataURL(file);
  }
}

function altNoFavImgLoad () { // When loading a new No-favicon image
  let file = AltNoFavFileInput.files[0];
  if (file) {
	let reader = new FileReader();

	// Prepare callback function for conversion and store in local storage when file content is read
	reader.addEventListener(
	  "load",
	  function () {
		cvtImg = AltNoFavImg;
		cvtUseInput = UseAltNoFavInput;
		// convert image file to data: base64 URI
		CvtImage.src = cvtUri = reader.result;
	  },
	  false
	);

	// Read and then convert
	reader.readAsDataURL(file);
  }
}

/*
 * Convert and store image in 16x16, triggered by end of CvtImage.src load
 * 
 * Uses global variable cvtUri
 */
const CvtCanvas = document.createElement('canvas'); // For image conversion to 16 x 16
CvtCanvas.height = 16;
CvtCanvas.width = 16;
const CvtCtx = CvtCanvas.getContext("2d");
CvtCtx.imageSmoothingEnabled = false;
CvtCtx.imageSmoothingQuality = "high";
const CvtImageData = CvtCtx.createImageData(16, 16);
const CvtIDData = CvtImageData.data;
const CvtCanvas2 = document.createElement('canvas'); // For loading a favicon to downscale
const CvtCtx2 = CvtCanvas2.getContext("2d");
function convertOnLoad () {
  let nh = CvtImage.naturalHeight;
  let nw = CvtImage.naturalWidth;
  let convertedUri;
  if ((nh > 0) && (nw > 0) && ((nh != 16) || (nw != 16))) {
	try {
	  if ((nh > 16) && (nw > 16)) { // Only downscaling .. avoid FF canvas native algo, not really good
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
	  }
	  else {
		CvtCtx.clearRect(0, 0, 16, 16);
		CvtCtx.drawImage(CvtImage, 0, 0, 16, 16);
	  }
	  convertedUri = CvtCanvas.toDataURL();
	  cvtImg.src = convertedUri;
	  cvtUseInput.disabled = false;
	}
	catch (error) { // Error on rescale, keep original
	  cvtImg.src = "";
	  cvtImg.alt = "Scaling error";
	  cvtUseInput.disabled = true;
	  cvtUseInput.checked = false;
	}
  }
  else { // Cannot rescale or no need to, keep original
	cvtImg.src = cvtUri;
	cvtUseInput.disabled = false;
  }
  // Store result in local storage
  saveOptions(undefined);
}

/*
 * Error on loading the image to convert, triggered by error when loading CvtImage.src
 */
function errorCvtOnLoad (error) {
  cvtImg.src = "";
  cvtImg.alt = "Error on load";
  cvtUseInput.disabled = true;
  cvtUseInput.checked = false;
  saveOptions(undefined);
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
	cmd2 = "Alt";
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

  // Signal reset to background
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
  ShowPathInput.addEventListener("click", saveOptions);
  CloseSearchInput.addEventListener("click", saveOptions);
  ImmediateFavDisplayInput.addEventListener("click", saveOptions);
  LoadFFAPIInput.addEventListener("click", saveOptions);
  ReloadFFAPIButton.addEventListener("click", reloadFFAPI);
  NoFFAPISearchInput.addEventListener("click", saveOptions);
  DelayLoadInput.addEventListener("click", saveOptions);
  SearchOnEnterInput.addEventListener("click", saveOptions);
  ReversePathInput.addEventListener("click", saveOptions);
  CloseSibblingFoldersInput.addEventListener("click", saveOptions);
  RememberSizesInput.addEventListener("click", saveOptions);
  ResetSizesButton.addEventListener("click", resetSizes);
  SetFontSizeInput.addEventListener("click", saveOptions);
  FontSizeInput.addEventListener("change", changeFontSize);
  SetSpaceSizeInput.addEventListener("click", saveOptions);
  SpaceSizeInput.addEventListener("change", changeSpaceSize);
  MatchThemeInput.addEventListener("click", fetchTheme);
  SetColorsInput.addEventListener("click", saveOptions);
  TextColorInput.addEventListener("change", saveOptions);
  BckgndColorInput.addEventListener("change", saveOptions);
  AltFldrFileInput.addEventListener("change", altFldrImgLoad);
  AltNoFavFileInput.addEventListener("change", altNoFavImgLoad);
  UseAltFldrInput.addEventListener("change", saveOptions);
  UseAltNoFavInput.addEventListener("change", saveOptions);
  Command1Select.addEventListener("change", changeSidebarCommand1);
  Command2Select.addEventListener("change", changeSidebarCommand);
  Command3Select.addEventListener("change", changeSidebarCommand);
  ResetCommandButton.addEventListener("click", resetSidebarCommand);
  TrashEnabledInput.addEventListener("click", saveOptions);
  TrashVisibleInput.addEventListener("click", saveOptions);
  HistoryRetentionInput.addEventListener("change", changeHistoryRetention);
  HistoryClearButton.addEventListener("click", historyClearHandler);
  TraceEnabledInput.addEventListener("click", saveOptions);
  ResetMigr16x16Button.addEventListener("click", resetMigr16x16);
}

/*
 * Initialization phase 0
 */
function initialize () {
  // Start when we have the platform and the background page
  Promise.all([p_platform, p_background, p_ffversion, p_getWindowId, p_commands])
  .then(
	function (a_values) { // An array of one value per Promise is returned
	  p_platform = p_background = p_ffversion = p_getWindowId = p_commands = undefined;

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
	  beforeFF57 = (ffversion < "57.0");
	  beforeFF60 = (ffversion < "60.0");
	  beforeFF63 = (ffversion < "63.0");

	  // Handle myWindowId
	  let windowInfo = a_values[3];
	  myWindowId = windowInfo.id;

	  // Look at current set command
	  let logCommands = a_values[4];
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