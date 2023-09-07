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
const ExportSettingsButton = document.querySelector("#exportsettings");
const ExportSettingsLink = document.querySelector("#exportsettingslink");
const ImportSettingsButton = document.querySelector("#importsettings");
const ImportSettingsInput = document.querySelector("#importsettingsinput");
const ImportErrorSpan = document.querySelector("#importerrormsg");
const ImportOkSpan = document.querySelector("#importokmsg");
const StatsTextarea = document.querySelector("#stats");
const ActiveFaviconsInput = document.querySelector("#activeff");
const PauseFaviconsInput = document.querySelector("#pauseff");
const DisableFaviconsInput = document.querySelector("#disablefavicons");
const EnableCookiesInput = document.querySelector("#enablecookies");
const RefetchFavButton = document.querySelector("#refetchfav");
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
const DeactivateSearchListInput = document.querySelector("#deactivatesearchlist");
const ReversePathInput = document.querySelector("#reversepath");
const CloseSibblingFoldersInput = document.querySelector("#closesibblingfolders");
const RememberSizesInput = document.querySelector("#remembersizes");
const ResetSizesButton = document.querySelector("#resetsizes");
const SetFontSizeInput = document.querySelector("#setfontsize");
const FontSizeInput = document.querySelector("#fontsize");
const SetFontBoldInput = document.querySelector("#setfontbold");
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
const AddAtFldrEndInput = document.querySelector("#addatend");
const AddAtFldrStartInput = document.querySelector("#addatstart");
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
let beforeFF58;
let beforeFF60;
let beforeFF63;
let beforeFF66;
let ffversion;
let myWindowId;
let sidebarCommand;
let command1;
let command2;
//Declared in libstore.js
//let structureVersion;
let countBookmarks, countFolders, countSeparators, countOddities, countFetchFav, countNoFavicon;


/*
 * Functions
 * ---------
 */

/*
 * Display stats in the statistics textarea
 */
function displayStats () {
  let percent1 = new Number (countFetchFav / countBookmarks * 100);
  let percent2 = new Number (countNoFavicon / countBookmarks * 100);
  StatsTextarea.textContent =    "Bookmarks:             "+countBookmarks;
  StatsTextarea.textContent += "\nFavicons to fetch:     "+countFetchFav+" ("+percent1.toFixed(1)+"%)";
  StatsTextarea.textContent += "\nUnsuccessful favicons: "+countNoFavicon+" ("+percent2.toFixed(1)+"%)";
  StatsTextarea.textContent += "\nFolders:               "+countFolders;
  StatsTextarea.textContent += "\nSeparators:            "+countSeparators;
  StatsTextarea.textContent += "\nOddities:              "+countOddities;
}

/*
 * Handle responses or errors when talking with background
 */
function handleMsgResponse (message) {
  // Is always called, even is destination didn't specifically reply (then message is undefined)
  if (message != undefined) {
	let msg = message.content;
	if (options.traceEnabled) {
	  console.log("Options received a response: <<"+msg+">>");
	}
	if (msg == "getStats") {
	  countBookmarks = message.countBookmarks;
	  countFetchFav = message.countFetchFav;
	  countNoFavicon = message.countNoFavicon;
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
  // Adjust options values and visibility function of others
  let pausefavicons = PauseFaviconsInput.checked;
  let disablefavicons = DisableFaviconsInput.checked;
  if (disablefavicons) {
	EnableCookiesInput.checked = false;
  }
  EnableCookiesInput.disabled = disablefavicons;
  ActiveFaviconsInput.disabled = disablefavicons;
  PauseFaviconsInput.disabled = disablefavicons;
  RefetchFavButton.disabled =  disablefavicons || pausefavicons;
  let closesearch = CloseSearchInput.checked;
  if (closesearch) {
	OpenTreeInput.checked = true;
  }
  OpenTreeInput.disabled = closesearch;
  ReloadFFAPIButton.disabled = LoadFFAPIInput.checked;
  ResetSizesButton.disabled = !(RememberSizesInput.checked);
  let fontSize = DfltFontSize;
  let setfontsize = SetFontSizeInput.checked;
  FontSizeInput.disabled = !(setfontsize);
  if (setfontsize) {
	if (FontSizeInput.validity.valid) {
	  fontSize = FontSizeInput.valueAsNumber;
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
	  spaceSize = SpaceSizeInput.valueAsNumber;
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
	historyRetention = HistoryRetentionInput.valueAsNumber;
  }
  else {
	HistoryRetentionInput.value = DfltHistoryRetention;
  }

  // Save options
  browser.storage.local.set({
	 pausefavicons_option: (options.pauseFavicons = pausefavicons)
	,disablefavicons_option: (options.disableFavicons = disablefavicons)
	,enablecookies_option: (options.enableCookies = EnableCookiesInput.checked)
	,enableflipflop_option: (options.enableFlipFlop = EnableFlipFlop.checked)
	,advanced_option: (options.advancedClick = AdvancedClickInput.checked)
	,showpath_option: (options.showPath = ShowPathInput.checked)
	,closesearch_option: (options.closeSearch = closesearch)
	,opentree_option: (options.openTree = OpenTreeInput.checked)
	,immediatefavdisplay_option: (options.immediateFavDisplay = ImmediateFavDisplayInput.checked)
	,loadffapi_option: (options.loadffapi = LoadFFAPIInput.checked)
	,noffapisearch_option: (options.noffapisearch = NoFFAPISearchInput.checked)
	,delayLoad_option: (options.delayLoad = DelayLoadInput.checked)
	,searchonenter_option: (options.searchOnEnter = SearchOnEnterInput.checked)
	,deactivatesearchlist_option: (options.deactivateSearchList = DeactivateSearchListInput.checked)
	,reversepath_option: (options.reversePath = ReversePathInput.checked)
	,closesibblingfolders_option: (options.closeSibblingFolders = CloseSibblingFoldersInput.checked)
	,remembersizes_option: (options.rememberSizes = RememberSizesInput.checked)
	,setfontsize_option: (options.setFontSize = setfontsize)
	,fontsize_option: (options.fontSize = fontSize)
	,setfontbold_option: (options.setFontBold = SetFontBoldInput.checked)
	,setspacesize_option: (options.setSpaceSize = setspacesize)
	,spacesize_option: (options.spaceSize = spaceSize)
	,matchtheme_option: (options.matchTheme = matchtheme)
	,setcolors_option: (options.setColors = setcolors)
	,textcolor_option: (options.textColor = textColor)
	,bckgndcolor_option: (options.bckgndColor = bckgndColor)
	,altfldrimg_option: (options.altFldrImg = altFldrImgSrc)
	,usealtfldr_option: (options.useAltFldr = useAltFldr)
	,altnofavimg_option: (options.altNoFavImg = altNoFavImgSrc)
	,usealtnofav_option: (options.useAltNoFav = useAltNoFav)
//	,sidebarcommand_option: (options.sidebarCommand = sidebarCommand)
	,appendatfldrend_option: (options.appendAtFldrEnd = AddAtFldrEndInput.checked)
	,trashenabled_option: (options.trashEnabled = trashEnabled)
	,trashvisible_option: (options.trashVisible = TrashVisibleInput.checked)
	,historyretention_option: (options.historyRetention = historyRetention)
	,traceEnabled_option: (options.traceEnabled = TraceEnabledInput.checked)
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
 * Get colors from current windows theme, display them on UI, and register for changes to it
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
  if (options.pauseFavicons) {
	PauseFaviconsInput.checked = true;
	RefetchFavButton.disabled = true;
  }

  if (options.disableFavicons) {
	DisableFaviconsInput.checked = true;
	// Disable options.enableCookies and Favicon fetching mode
	EnableCookiesInput.disabled = true;
	ActiveFaviconsInput.disabled = true;
	PauseFaviconsInput.disabled = true;
	RefetchFavButton.disabled = true;
  }

  if (options.enableCookies) {
	EnableCookiesInput.checked = true;
  }

  if (options.enableFlipFlop) {
	EnableFlipFlop.checked = true;
  }

  if (options.advancedClick) {
	AdvancedClickInput.checked = true;
  }

  if (options.showPath) {
	ShowPathInput.checked = true;
  }

  if (options.closeSearch) {
	CloseSearchInput.checked = true;
	// Disable options.openTree
	OpenTreeInput.disabled = true;
  }

  if (options.openTree) {
  	OpenTreeInput.checked = true;
  }

  if (options.immediateFavDisplay) {
	ImmediateFavDisplayInput.checked = true;
  }

  if (options.loadffapi) {
	LoadFFAPIInput.checked = true;
	ReloadFFAPIButton.disabled = true;
  }

  if (options.noffapisearch) {
	NoFFAPISearchInput.checked = true;
  }

  if (options.delayLoad) {
	DelayLoadInput.checked = true;
  }

  if (options.searchOnEnter) {
	SearchOnEnterInput.checked = true;
  }

  if (options.deactivateSearchList) {
	DeactivateSearchListInput.checked = true;
  }

  if (options.reversePath) {
	ReversePathInput.checked = true;
  }

  if (options.closeSibblingFolders) {
	CloseSibblingFoldersInput.checked = true;
  }

  if (options.rememberSizes) {
	RememberSizesInput.checked = true;
	ResetSizesButton.disabled = false;
  }

  if (options.setFontSize) {
	SetFontSizeInput.checked = true;
	FontSizeInput.disabled = false;
  }
  if (options.fontSize != undefined) {
	FontSizeInput.value = options.fontSize;
  }
  else {
	FontSizeInput.value = DfltFontSize;
  }

  if (options.setFontBold) {
	SetFontBoldInput.checked = true;
  }

  if (options.setSpaceSize) {
	SetSpaceSizeInput.checked = true;
	SpaceSizeInput.disabled = false;
  }
  if (options.spaceSize != undefined) {
	SpaceSizeInput.value = options.spaceSize;
  }
  else {
	SpaceSizeInput.value = DfltSpaceSize;
  }

  let matchtheme = false;
  if (options.matchTheme && !beforeFF58) { // The API is not fully active before FF58
	matchtheme = MatchThemeInput.checked = true;
	fetchTheme(); // Get current colors and set other fields appropriately
  }
  else {
	MatchThemeInput.checked = false;
  }
  if (beforeFF58) {
	MatchThemeInput.disabled = true;
  }

  let setcolors = false;
  if (options.setColors) {
	setcolors = SetColorsInput.checked = true;
  }
  SetColorsInput.disabled = matchtheme;

  if (options.textColor != undefined) {
	TextColorInput.title = TextColorInput.value = options.textColor;
	TextColorSpan.textContent = colorLabel(options.textColor);
  }
  else {
	TextColorInput.title = TextColorInput.value = DfltTextColor;
	TextColorSpan.textContent = colorLabel(DfltTextColor);
  }

  if (options.bckgndColor != undefined) {
	BckgndColorInput.title = BckgndColorInput.value = options.bckgndColor;
	BckgndColorSpan.textContent = colorLabel(options.bckgndColor);
  }
  else {
	BckgndColorInput.title = BckgndColorInput.value = DfltBckgndColor;
	BckgndColorSpan.textContent = colorLabel(DfltBckgndColor);
  }
  BckgndColorInput.disabled = TextColorInput.disabled = !setcolors || matchtheme;

  let useAltFldrDisabled = true;
  if (options.altFldrImg != undefined) {
	AltFldrImg.src = options.altFldrImg;
	useAltFldrDisabled = UseAltFldrInput.disabled = false;
  }
  if (options.useAltFldr != undefined) {
	if (!useAltFldrDisabled) {
	  UseAltFldrInput.checked = options.useAltFldr;
	}
  }

  let useAltNoFavDisabled = true;
  if (options.altNoFavImg != undefined) {
	AltNoFavImg.src = options.altNoFavImg;
	useAltNoFavDisabled = UseAltNoFavInput.disabled = false;
  }
  if (options.useAltNoFav != undefined) {
	if (!useAltNoFavDisabled) {
	  UseAltNoFavInput.checked = options.useAltNoFav;
	}
  }

  // Prepare display of possible drop down values
  if (platformOs == "mac") { // Add support for MacCtrl on Mac on Command1
	let opt = document.createElement("option");
	opt.value = opt.text = "MacCtrl";
	Command1Select.add(opt);
  }
  if (!beforeFF63) {
	Command2Select.add(Opt2);
	Command2Select.add(Opt3);
	if (platformOs == "mac") { // Add support for MacCtrl on Mac on Command2
	  Command2Select.add(Opt4);
	}
  }
  displaySidebarCommand(sidebarCommand);
  // Changing the sidebar command is only supported for FF >= 60
  // And from FF66, we dot not use the options page anymore, users should use the native FF panel
  // in Manage add-ons -> cogwheel -> maange add-on shortcut keys
  if (beforeFF60 || !beforeFF66) {
	// Disable the corresponding Selects and Button below FF60 and above FF65 so that actions cannot trigger
	// but keep the Reset button active as there is no reset to default on the FF shortcut keys management panel.
	Command1Select.disabled = true;
	Command2Select.disabled = true;
	Command3Select.disabled = true;
//	ResetCommandButton.disabled = true;
  }

  if (!options.appendAtFldrEnd) {
	AddAtFldrStartInput.checked = true;
  }

  let trashEnabled = true;
  if (options.trashEnabled != undefined) {
	trashEnabled = TrashEnabledInput.checked = options.trashEnabled;
  }
  else {
	TrashEnabledInput.checked = true;
  }

  if (options.trashVisible != undefined) {
	TrashVisibleInput.checked = options.trashVisible;
  }
  else {
	TrashVisibleInput.checked = false;
  }
  TrashVisibleInput.disabled = !trashEnabled;

  if (options.historyRetention != undefined) {
	HistoryRetentionInput.value = options.historyRetention;
  }
  else {
	HistoryRetentionInput.value = DfltHistoryRetention;
  }

  if (options.traceEnabled) {
	TraceEnabledInput.checked = true;
  }

  if (structureVersion.includes(VersionImg16)) {
	ResetMigr16x16Button.disabled = false;
  }
}

/*
 * Creates a JSON text of the options object, export it as a file blob URL to be downloaded on the UI
 * through a link download dialog  
 */
function exportOptions () {
  let contents = JSON.stringify(options, null, 2);
  ExportSettingsLink.href = URL.createObjectURL(new Blob([contents], {type: 'application/json'}));
  ExportSettingsLink.click();
}

/*
 * Gets the ImportSettingsInput file contents set options from it, and save options to the local store
 * replacing the previous ones.
 */
async function importOptions () {
console.log("here");
  let files = ImportSettingsInput.files;
  if (files.length == 1) {
	let file = files.item(0);
	let contents = await file.text();
	// Get new options, and verify them
	let newOptions = JSON.parse(contents);

	// Verify it, and if all ok, set options, display them, save them and send signal to everybody to reload options
	if ((newOptions != undefined) && ((typeof newOptions) == "object")) {
	  let valid = true;
	  // First, check that all properties are valid options (if non existent option, ignore it by deleting it)
	  for (let o in newOptions) {
		if (newOptions.hasOwnProperty(o)) {
		  if (!OptionsList.hasOwnProperty(o)) { // Not an existing option !
			delete newOptions.o;
		  }
		  else if (!OptionsList[o].verifyValue(newOptions[o])) { // Invalid option type or value !
			valid = false;
			break;
		  }
		}
	  }
	  if (valid) { // Then make sure newOptions has all options in it, or set a default value for missing ones
		for (let o in OptionsList) {
		  if (OptionsList.hasOwnProperty(o)) {
			if (!newOptions.hasOwnProperty(o)) { // Existing option is missing !
			  newOptions[o] = OptionsList[o].getDefault();
			}
		  }
		}

		// All correct now, accept options, display the new values on UI and an OK message, and save options
		options = newOptions;
		restoreOptions();
		ImportOkSpan.hidden = false;
		saveOptions(undefined);
	  }
	  else { // Display an error notification
		ImportErrorSpan.hidden = false;
	  }
	}
  }
}

/*
 * Re-fetch all unsuccessful favicons (= the non protected ones which are nofavicon)
 */
function refetchFav () {
//console.log("Re-fetch all unsuccessful favoicons button pressed");
  // Disable button
  RefetchFavButton.disabled = true;

  // Signal re-fetch to background
  sendAddonMessage("refetchFav");
}

/*
 * Reload bookmark tree from FF API
 */
function reloadFFAPI () {
//console.log("Reload FF API bookmark tree button pressed");
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
	,"historypheight_option"
	,"historywidth_option"
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
	if (res.historyheight_option != undefined) {
	  browser.storage.local.remove("historyheight_option");
	}
	if (res.historywidth_option != undefined) {
	  browser.storage.local.remove("historywidth_option");
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
	countNoFavicon = backgroundPage.countNoFavicon;
	countFolders = backgroundPage.countFolders;
	countSeparators = backgroundPage.countSeparators;
	countOddities = backgroundPage.countOddities;
	displayStats();
  }

  // Watch for export / import buttons
  ExportSettingsButton.addEventListener("click", exportOptions);
  ImportSettingsButton.addEventListener("click", function () {ImportOkSpan.hidden = ImportErrorSpan.hidden = true; ImportSettingsInput.click();});
  ImportSettingsInput.addEventListener("input", importOptions);

  // When there is an update to an option, save the new value
  ActiveFaviconsInput.addEventListener("click", saveOptions);
  PauseFaviconsInput.addEventListener("click", saveOptions);
  DisableFaviconsInput.addEventListener("click", saveOptions);
  EnableCookiesInput.addEventListener("click", saveOptions);
  RefetchFavButton.addEventListener("click", refetchFav);
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
  DeactivateSearchListInput.addEventListener("click", saveOptions);
  ReversePathInput.addEventListener("click", saveOptions);
  CloseSibblingFoldersInput.addEventListener("click", saveOptions);
  RememberSizesInput.addEventListener("click", saveOptions);
  ResetSizesButton.addEventListener("click", resetSizes);
  SetFontSizeInput.addEventListener("click", saveOptions);
  FontSizeInput.addEventListener("change", changeFontSize);
  SetFontBoldInput.addEventListener("click", saveOptions);
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
  AddAtFldrEndInput.addEventListener("click", saveOptions);
  AddAtFldrStartInput.addEventListener("click", saveOptions);
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
	  ffversion = parseFloat(info.version);
	  beforeFF57 = (ffversion < 57.0);
	  beforeFF58 = (ffversion < 58.0);
	  beforeFF60 = (ffversion < 60.0);
	  beforeFF63 = (ffversion < 63.0);
	  beforeFF66 = (ffversion < 66.0);

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