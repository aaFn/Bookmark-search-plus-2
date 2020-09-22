'use strict';


//Retrieve Platform and Background page
let p_platform = browser.runtime.getPlatformInfo();
let p_background = browser.runtime.getBackgroundPage();
//Get Id of the window the sidebar is running in
//Note: there is an instance of sidebar run in each window as it seems
let p_getWindowId = browser.windows.getCurrent(
//  {populate: true	
//  }
);
let p_getTab = browser.tabs.getCurrent();


/* <rant on>
 *     javascript is a crap language .. no easy way to know/specify the type of objects we
 *     manipulate or retrieve, so the methods we call to get or to manipulate contents
 *     of objets are approximative at best, and nearly rely on trial and errors, logging,
 *     and incantations .. with abundant testing.
 *     Browsing docs & API's for hours is the only way to get good information about what can
 *     be done of an "object" .. However, and even with that good basis, we can only guess
 *     and try based on what we want to do, and what we believe we are manipulating.
 *     Then verify with traces what happens is really what we expect / want.
 *     Most of all, a recipe for finding a good way is to copy on what others did, or on the
 *     very good Mozilla's tutorials and doc illustration examples, and to verify that will work
 *     and that this will be efficient :-(
 *
 *     One of the real useful things is https://developer.mozilla.org/en-US/docs/Web/API
 *     and then try to find which "Interface" (closest to object type ..) to use, and
 *     try its attributes and methods with a bit of crossing fingers after reading.
 *
 *     Also, there is the general assumption in javascript that it is single-threaded:
 *     - a given piece of code is always executed atomically until end and never interrupted
 *       by another thread running javascript.
 *     - events are queued, and executed serially in order of occurrence when handling of
 *       previous event is finished.
 *     - hence the "A script is taking too long to run" dialog which many browsers have to
 *       implement, in case some event processing is not yielding back control in due time ..
 *     Therefore, there is no "synchronized" nor "atomic" keyword like in other languages to make
 *     sure that concurrent accesses to an object are serialized and not intermixed, which
 *     could mess up and have unexpected results (yes, I met some ..).
 *     That may be true in today version of the language, but this gives very bad programming habits
 *     to people using javascript. And what about tomorrow ?? (note also that "synchronized" was
 *     reserved in ECMAScript until 5 & 6 ..)
 *
 *     A side consequence is that most browsers wait the current script execution to end
 *     before displaying / refreshing the DOM. So when we have long tasks, we should use Workers
 *       https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
 *     to give chances for the display to update.
 *     These run in another thread (?? well, is that so true in FF ? I wonder), and post event
 *     messages back to the main script, therefore not bogging down display.
 *     Note that Workers are quite limited in what they can access.
 *     At least, good news (not for performances, but for integrity) is that they are passed
 *     values (copies), so there is no access concurrency risk with the main thread or between
 *     themselves when they run "at same time", which would normally occur when no concurrency
 *     protection on objects / data.
 *
 *     All in all, poor way of programming things .. but this is in the air, like a few others
 *     which emerged in parallel and compete brillantly I must say, if not better, on crapiness,
 *     such as perl, python, php (although latest evolutions improve .. good news !!) and their
 *     derivatives.
 *     Such languages claim they ease the programmer life and make things faster, but on the
 *     contrary we end up debugging more than needed our mistakes/bugs which could be simply
 *     avoided by more strict typing, and so it takes longer to get to a robust result at the
 *     end of the day :-((
 *  <rant off>
 *  Mapi !
 */


/*
 * Constants
 */
//Declared in libstore.js
//const VersionImg16 = "-img16"; // Signal that all favicons are in 16x16 format
//const VersionBNList = "-bnlist"; // Signal that we are in BookmarkNode tree format
//const VersionSpecialFldr = "-spfldr"; // Signal that we are in Special Folder tree format
//const DfltFontSize = 12; // 12px default
//const DfltSpaceSize = 0; // 0px default
//const DfltTextColor = "#222426"; // Default text color
//const DfltBckgndColor = "white"; // Default background color


const Migr16x16Timeout = 60000; // Time to wait before triggering 16x16 favicon migration
//With FF64, BuildID is returning a fixed value, and cannot be used anymore ...
//so use browser.runtime.getBrowserInfo() instead.
//const Navigator = window.navigator; // Get version of navigator to detect unavailable features between FF 54 and FF 56
//const BuildID = Navigator.buildID; // BuildID: 20100101 means that we have the websites.resistFingerprinting setting
								   // set .. see https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/privacy/websites
								   // This can happen when the Privacy Settings add-on is used for example ..
								   // See https://addons.mozilla.org/fr/firefox/addon/privacy-settings/ .. good news, this
								   //   add-on requires FF 57 minimum, and that particular setting exist only since FF 58,
								   //   so we cannot have it on FF 56 and it means BeforeFF57 and BeforeFF58 must be false.
//console.log("BuildID: "+BuildID);
//const BeforeFF57 = ((BuildID != "20100101") && (BuildID < "20171112125346"));
//const BeforeFF58 = ((BuildID != "20100101") && (BuildID < "20180118215408"));
let beforeFF57;
let beforeFF58;
let beforeFF64;
let ffversion;
let p_ffversion = browser.runtime.getBrowserInfo();

const Performance = window.performance;
const Body = document.querySelector("#body"); // Assuming it is an HTMLBodyElement
const ResetFiltersButtonInput = document.querySelector("#sresetflt"); // Assuming it is an HTMLButtonElement
const SFiltersImg = document.querySelector("#sfilters"); // Assuming it is an HTMLImgElement
const SFiltersImgStyle = SFiltersImg.style;
const SearchButtonInput = document.querySelector("#sbutton"); // Assuming it is an HTMLButtonElement
const MGlassImg = document.querySelector("#mglass"); // Assuming it is an HTMLImgElement
const MGlassImgStyle = MGlassImg.style;
const SearchTextInput = document.querySelector("#searchtext"); // Assuming it is an HTMLInputElement
const CancelSearchInput = document.querySelector("#cancelsearch"); // Assuming it is an HTMLInputElement
const SearchResult = document.querySelector("#searchresult"); // Assuming it is an HTMLDivElement
const Bookmarks = document.querySelector("#bookmarks"); // Assuming it is an HTMLDivElement
//const ResultsTable = document.querySelector("#searchresult table"); // Assuming it is an HTMLTableElement
//const BookmarksTable = document.querySelector("#bookmarks table"); // Assuming it is an HTMLTableElement
const TracePlace = document.querySelector("#trace");
const WaitingSearch = document.querySelector("#waitingsearch");
const WaitingImg = document.querySelector("#waiting");
const WaitMsg = document.querySelector("#waitmsg");
const MyRBkmkMenu = document.querySelector("#myrbkmkmenu");
const MyRBkmkMenuStyle = MyRBkmkMenu.style;
////const MyRBkmkMenuStyle = document.getElementById("myrbkmkmenu").style;
const MyRShowBkmkMenu = document.querySelector("#myrshowbkmkmenu");
const MyRShowBkmkMenuStyle = MyRShowBkmkMenu.style;
const MyRFldrMenu = document.querySelector("#myrfldrmenu");
const MyRFldrMenuStyle = MyRFldrMenu.style;
const MyRFldrMenuGoParent = document.querySelector("#myrfldrmenugoparent");
const MyBBkmkMenu = document.querySelector("#mybbkmkmenu");
const MyBBkmkMenuStyle = MyBBkmkMenu.style;
const MyBBkmkMenuPaste = document.querySelector("#mybbkmkmenupaste");
const MyBBkmkMenuFavicon = document.querySelector("#mybbkmkmenufavicon");
const MyBResBkmkMenu = document.querySelector("#mybresbkmkmenu");
const MyBResBkmkMenuStyle = MyBResBkmkMenu.style;
const MyBResBkmkMenuPaste = document.querySelector("#mybresbkmkmenupaste");
const MyBResBkmkMenuFavicon = document.querySelector("#mybresbkmkmenufavicon");
const MyBFldrMenu = document.querySelector("#mybfldrmenu");
const MyBFldrMenuStyle = MyBFldrMenu.style;
const MyBFldrMenuPaste = document.querySelector("#mybfldrmenupaste");
const MyBFldrMenuPasteInto = document.querySelector("#mybfldrmenupasteinto");
const MyBResFldrMenu = document.querySelector("#mybresfldrmenu");
const MyBResFldrMenuStyle = MyBResFldrMenu.style;
const MyBResFldrMenuPaste = document.querySelector("#mybresfldrmenupaste");
const MyBResFldrMenuPasteInto = document.querySelector("#mybresfldrmenupasteinto");
const MyBSepMenu = document.querySelector("#mybsepmenu");
const MyBSepMenuStyle = MyBSepMenu.style;
const MyBSepMenuPaste = document.querySelector("#mybsepmenupaste");
const MyBProtMenu = document.querySelector("#mybprotmenu");
const MyBProtMenuStyle = MyBProtMenu.style;
const MyBProtFMenu = document.querySelector("#mybprotfmenu");
const MyBProtFMenuStyle = MyBProtFMenu.style;
const MyBProtFMenuPasteInto = document.querySelector("#mybprotfmenupasteinto");
const MyMGlassMenu = document.querySelector("#mymglassmenu");
const MyMGlassMenuStyle = MyMGlassMenu.style;
const NotifReload = document.querySelector("#notifreload");
const NotifReloadStyle = NotifReload.style;
const NotifAutoReload = document.querySelector("#notifautoreload");
const NotifAutoReloadStyle = NotifAutoReload.style;
const SFieldTitleUrlInput = document.querySelector("#titleurl");
const SFieldTitleOnlyInput = document.querySelector("#titleonly");
const SFieldUrlOnlyInput = document.querySelector("#urlonly");
const SFieldUrlOnlyLabel = document.querySelector("#lblurlonly");
const SScopeAllInput = document.querySelector("#all");
const SScopeSubfolderInput = document.querySelector("#subfolder");
const SMatchWordsInput = document.querySelector("#words");
const SMatchRegexpInput = document.querySelector("#regexp");
const SFilterAllInput = document.querySelector("#fall");
const SFilterFldrOnlyInput = document.querySelector("#ffldronly");
const SFilterBkmkOnlyInput = document.querySelector("#fbkmkonly");

const InputKeyDelay = 500; // Delay in ms from last keystropke to activate / refresh search result
const UpdateSearchDelay = 50; // Delay in ms to trigger an update search
const SBoxEmpty = 0;	// No active search
const SBoxChanging = 1;	// Content of search box is changing
const SBoxExecuted = 2; // Search was launched or is complete
const PopupURL = browser.extension.getURL("sidebar/popup.html");
const SelfURL = browser.extension.getURL("sidebar/panel.html");
const HistoryURL = browser.extension.getURL("sidebar/history.html");
const PopupWidth  = 380;
const PopupHeight = 190;
const DfltMenuSize = 150;
const DfltMenuSizeLinux = 170;
const OpenFolderTimeout = 1000; // Wait time in ms for opening a closed folder, when dragging over it

const Selhighlight = "selbrow"; // selhighlight class name in CSS
const HighlightTextColor = "#222426"; // Text color used when hovering or focusing a cell (or dragging over a folder)
const Reshidden = "reshidden"; // reshidden class name in CSS, to remember a shown row was hidden before show
const BScrollOk = "bscrollok"; // scrollok class name in CSS, to enable Bookmarks scrolling
const BScrollKo = "bscrollko"; // scrollko class name in CSS, to disnable Bookmarks scrolling
const RScrollOk = "rscrollok"; // scrollok class name in CSS, to enable SearchResult scrolling
const RScrollKo = "rscrollko"; // scrollko class name in CSS, to disnable SearchResult scrolling
const HystReEnableScroll = 30; // If we're getting that far inside from the point we disabled scroll, re-enable
const TimeoutReEnableScroll = 600; // Delay in ms from last drag event to re-enable scrolling = bigger than 350 +/- 200
const TimeoutSimulDragover = 350; // Delay in ms from last drag event to simulate a dragover
const EnterEvent = 1;
const OverEvent  = 2;
const LeaveEvent = 3;
const ExitEvent  = 4;

const LevelIncrementPx = 12; // Shift right in pixel from level N to level N+1
//Declared in BookmarkNode.js
//const Root = "root________";
//const PersonalToobar = "toolbar_____";
//const BookmarksMenu =  "menu________";
//const OtherBookmarks = "unfiled_____";
//const MobileBookmarks = "mobile______";
//const TagsFolder = "tags________";
/*
 *******  Prepare standard Folder structure for node cloning
 */
const FolderTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
FolderTempl.classList.add("bkmkitem_f");
FolderTempl.draggable = false; // False by default for <div>
let tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
											  // Not using <img> since with FF65 and later, they
											  // show default box-shadow: inset when the src=
											  // attribute is not specified.
tmpElem1.classList.add("ffavicon");
tmpElem1.draggable = false; // True by default for <img>
FolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
FolderTempl.appendChild(tmpElem1);
/*
 *  Same for result folder
 */
const RFolderTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
RFolderTempl.classList.add("rbkmkitem_f");
RFolderTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("ffavicon");
tmpElem1.draggable = false; // True by default for <img>
RFolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
RFolderTempl.appendChild(tmpElem1);
/*
 *******  Prepare special Folder structure for node cloning
 */
const SFolderTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
SFolderTempl.classList.add("bkmkitem_f");
SFolderTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("img"); // Assuming it is an HTMLImageElement
tmpElem1.classList.add("favicon");
tmpElem1.draggable = false; // True by default for <img>
SFolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
SFolderTempl.appendChild(tmpElem1);
/*
 *  Same for result special folder
 */
const RSFolderTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
RSFolderTempl.classList.add("rbkmkitem_f");
RSFolderTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("img"); // Assuming it is an HTMLImageElement
tmpElem1.classList.add("favicon");
tmpElem1.draggable = false; // True by default for <img>
RSFolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
RSFolderTempl.appendChild(tmpElem1);
/*
 *******  Prepare Separator structure for node cloning
 */
const SeparatorTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
SeparatorTempl.classList.add("bkmkitem_s");
SeparatorTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("favseparator");
tmpElem1.draggable = false; // False by default for <div>
SeparatorTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("favseparatorend");
tmpElem1.draggable = false; // False by default for <div>
SeparatorTempl.appendChild(tmpElem1);
/*
 *******  Prepare Bookmark structure for node cloning
 */
// We can attach an href attribute to <div> !!
// Much better as it avoids any special behavior of <a> on clicks and look/CSS ..
//let anchor = document.createElement("a"); // Assuming it is an HTMLAnchorElement
const BookmarkTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
BookmarkTempl.classList.add("bkmkitem_b");
BookmarkTempl.draggable = false; // False by default for <div> 
tmpElem1 = document.createElement("img"); // Assuming it is an HTMLImageElement
tmpElem1.classList.add("favicon");
// Cannot prepare image as it is taking much time ..
// So set "display: inline-block;" in CSS .favicon to reserve space in advance
//tmpElem1.src = "/icons/nofavicon.png";
tmpElem1.draggable = false; // True by defaul for <img>
BookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
BookmarkTempl.appendChild(tmpElem1);
/*
 *  Same for result bookmark
 */
const RBookmarkTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
RBookmarkTempl.classList.add("rbkmkitem_b");
RBookmarkTempl.draggable = false; // False by default for <div> 
tmpElem1 = document.createElement("img"); // Assuming it is an HTMLImageElement
tmpElem1.classList.add("favicon");
// Cannot prepare image as it is taking much time ..
// So set "display: inline-block;" in CSS .favicon to reserve space in advance
//tmpElem1.src = "/icons/nofavicon.png";
tmpElem1.draggable = false; // True by defaul for <img>
RBookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
RBookmarkTempl.appendChild(tmpElem1);
/*
 *******  Prepare nofavicon Bookmark structure for node cloning
 */
// We can attach an href attribute to <div> !!
// Much better as it avoids any special behavior of <a> on clicks and look/CSS ..
//let anchor = document.createElement("a"); // Assuming it is an HTMLAnchorElement
const NFBookmarkTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
NFBookmarkTempl.classList.add("bkmkitem_b");
NFBookmarkTempl.draggable = false; // False by default for <div> 
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLImageElement
										  // Not using <img> since with FF65 and later, they
										  // show default box-shadow: inset when the src=
										  // attribute is not specified.
tmpElem1.classList.add("nofavicon");
tmpElem1.draggable = false; // True by defaul for <img>
NFBookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
NFBookmarkTempl.appendChild(tmpElem1);
/*
 *  Same for result nofavicon bookmark
 */
// We can attach an href attribute to <div> !!
// Much better as it avoids any special behavior of <a> on clicks and look/CSS ..
//let anchor = document.createElement("a"); // Assuming it is an HTMLAnchorElement
const RNFBookmarkTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
RNFBookmarkTempl.classList.add("rbkmkitem_b");
RNFBookmarkTempl.draggable = false; // False by default for <div> 
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLImageElement
										  // Not using <img> since with FF65 and later, they
										  // show default box-shadow: inset when the src=
										  // attribute is not specified.
tmpElem1.classList.add("nofavicon");
tmpElem1.draggable = false; // True by defaul for <img>
RNFBookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
RNFBookmarkTempl.appendChild(tmpElem1);
tmpElem1 = undefined;


/*
 * Global variables
 */
let selfName; // Our extension name
let backgroundPage;
let backgroundReady = false; // To signal background ready to private windows
let waitingInitBckgnd = false; // To flag we're waiting for background init
//Declared in libstore.js
//var structureVersion = ""; // String signalling which migrations are done / current state
//var migration_img16 = false;

let migrationTimeout = null; // Timer to trigger migration
let platformOs;
let isLinux = false; // To indicate we are under Linux, used for workaround on dragover not firing
                     // continuously under Linux
let myWindowId;
let isInSidebar = false; // To detect if we are open in sidebar or in a tab
let openBookmarksInNewTabs_option = false; // Boolean
let openSearchResultsInNewTabs_option = false; // Boolean
// Declared in libstore.js
//var savedFldrOpenList; // Used to receive the open state saved in storage - Will be deleted at end
let curRowList = {}; // Current map between BN.id and row for each bookmark item
let curResultRowList = {}; // Current map between BTN.id and row for each result item
let curBNList; // Current list of BookmarkNode - Saved in storage at each modification
let rootBN; // Type is BookmarkNode. This is curBNList[0]
let curFldrOpenList = {}; // Current open info for folders - Saved in storage at each modification
let isDisplayComplete = false; // To indicate we are not anymore in initial load/display
//let resultsFragment; // Type is DocumentFragment
//let docFragment; // Type is DocumentFragment
let resultsTable; // Assuming it is an HTMLTableElement
let bookmarksTable; // Assuming it is an HTMLTableElement
let highest_open_level; // Indicator of what to hide / display when initially displaying the table
let inputTimeout = null; // Timeout between keystrokes to trigger bookmarck search from input
let sidebarTextColor = undefined; // Contains text color if we apply a theme's colors
let cellHighlight = null; // Current highlight of a row in source bookmarks = cell
let myMenu_open = false;
let myRBkmkMenu_open = false;
let myRShowBkmkMenu_open = false;
let myRFldrMenu_open = false;
let myBBkmkMenu_open = false;
let myBResBkmkMenu_open = false;
let myBFldrMenu_open = false;
let myBResFldrMenu_open = false;
let myBSepMenu_open = false;
let myBProtMenu_open = false;
let myBProtFMenu_open = false;
let myMGlassMenu_open = false;
let bkmkClipboard = undefined; // Contains the BookmarkNode(s) being copied or cut
let rowClipboard = undefined; // Remains undefined in case of copy, else contains the row(s)
                              // being cut.

// Declared in BookmarkNode.js
//var countBookmarks, countFolders, countSeparators, countOddities, countFetchFav;
//var mostVisitedBNId, mostVisitedBN, recentTagBNId, recentTagBN, recentBkmkBNId, recentBkmkBN;

let startTime, endLoadTime, endGetTreetime, endDisplayTime;
let loadDuration, treeLoadDuration, treeBuildDuration, saveDuration;
let isSlowSave;


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
  if (traceEnabled_option || force) {
    TracePlace.textContent += text + "\r\n";
  }
}

/*
 * Save the folders open state in storage, indexed by their stable bookmark id
 * Returns a promise to signal save completion
 */
function saveFldrOpen () {
  let saveObj;
  saveObj = curFldrOpenList;
  browser.storage.local.set({
	savedFldrOpenList: saveObj
  })
//  .then(
//	  function () {
//      trace("Saved curFldrOpenList");
//  	trace(Object.keys(saveObj));
//      trace(Object.values(saveObj));
//	  }
//  )
  ;
}

/*
 * Append a bookmark inside the search result sidebar table
 *
 * BTN = BookmarkTreeNode or BookmarkNode (a poor man's kind of "polymorphism" in Javascript ..)
 * 
 * Returns: true if the record could be added, or false if a problem occurred
 */
function appendResult (BTN) {
//  trace("Displaying <<"+BTN.id+">><<"+BTN.title+">><<"+BTN.type+">><<"+BTN.url+">>");
  let type = getType(BTN);
  if (((searchFilter_option == "fldr") && (type == "bookmark"))
	  || ((searchFilter_option == "bkmk") && (type == "folder"))
	 ) { // Filter out the result
	return(true);
  }

  let rc = false;
  // Append new bookmark row inside the search results table
  let row = resultsTable.insertRow();
  row.draggable = true; // Adding this, but with no handler, avoids that the anchor inside
  						// can be dragged .. not sure of exactly why, but this is what I observe !
  let BTN_id = row.dataset.id = BTN.id; // Keep unique id of bookmark in the data-id attribute
  let BN = curBNList[BTN_id];
  if ((BN == undefined) && (BTN_id != MobileBookmarks)) { // Desynchro !! => reload bookmarks from FF API
	// Signal reload to background, and then redisplay to all
	sendAddonMessage("reloadFFAPI_auto");
  }
  else {
	curResultRowList[BTN_id] = row;
	// Set cut status of the row (dim it), if corresponding to a cut row
	if ((rowClipboard != undefined) && (BTN_id == bkmkClipboard.id)) {
	  row.classList.add("cut");
	}

	// Add bookmark items in row
	let cell = row.insertCell();
	cell.classList.add("brow");
	cell.draggable = false;
	cell.tabIndex = 0;

	// Append proper contents to the cell:
	// - a <div> of class "rbkmkitem_f", or a <a> of class "rbkmkitem_b",
	//   for respectively folder or bookmark, containing:
	//   - an <img> (class "favicon") and a <span> with text
	//     (set class to "favtext" in javascript to get 3px margin-left, but not in HTML where
	//      it's already done, don't know why).
	if (type == "folder") {				// Folder
	  // Mark that row as folder
	  row.dataset.type = "folder";

	  // Create elements
	  let div2 = document.createElement("div"); // Assuming it is an HTMLDivElement
	  div2.classList.add("rtwistieac");
	  div2.draggable = false; // False by default for <div>
	  cell.appendChild(div2);
	  let fetchedUri;
	  let div3;
	  if (BTN_id == PersonalToobar) {
		fetchedUri = "/icons/toolbarbkmk.png";
		div3 = RSFolderTempl.cloneNode(true);
	  }
	  else if (BTN_id == BookmarksMenu) {
		fetchedUri = "/icons/menubkmk.png";
		div3 = RSFolderTempl.cloneNode(true);
	  }
	  else if (BTN_id == OtherBookmarks) {
		fetchedUri = "/icons/otherbkmk.png";
		div3 = RSFolderTempl.cloneNode(true);
	  }
	  else {
		div3 = RFolderTempl.cloneNode(true);
	  }
//	  let div3 = document.createElement("div"); // Assuming it is an HTMLDivElement
//	  div3.classList.add("bkmkitem_f");
//	  div3.draggable = false;
//	  cell.appendChild(div3);

//	  let img = document.createElement("img"); // Assuming it is an HTMLImageElement
//	  img.classList.add("favicon");
//	  if (BTN_id == PersonalToobar)   img.src = "/icons/toolbarbkmk.png";
//	  else if (BTN_id == BookmarksMenu)   img.src = "/icons/menubkmk.png";
//	  else if (BTN_id == OtherBookmarks)   img.src = "/icons/otherbkmk.png";
//	  else   img.src = "/icons/folder.png";
//	  img.draggable = false;
//	  div3.appendChild(img);
	  let span;
	  if (fetchedUri != undefined) {
		let img = div3.firstElementChild;
		img.src = fetchedUri;
		span = img.nextElementSibling;
	  }
	  else {
		span = div3.firstElementChild.nextElementSibling;
	  }

//	  let span = document.createElement("span"); // Assuming it is an HTMLSpanElement
//	  span.classList.add("favtext");
	  let title = BTN.title;
	  if (showPath_option) {
		div3.title = BN_path(BTN.parentId);
	  }
	  else {
		div3.title = title;
	  }
	  span.textContent = title;
//	  span.draggable = false;
//	  div3.appendChild(span);
	  cell.appendChild(div3);
	}
	else {								// "bookmark"
	  // Mark that row as bookmark
	  row.dataset.type = "bookmark";

	  // Create elements
	  let url = BTN.url;
	  if (url == undefined) {
		url = "<undefined!>";
	  }
	  let title = BTN.title;
	  let anchor;
	  let span;
	  // Retrieve current uri or set to nofavicon.png by default
	  let uri = BN.faviconUri;
	  if (disableFavicons_option || (uri == undefined)) { // Clone with nofavicon image background
		anchor = RNFBookmarkTempl.cloneNode(true);
		span = anchor.firstElementChild.nextElementSibling;
	  }
	  else { // clone normal one, we will fill the image later
		anchor = RBookmarkTempl.cloneNode(true);
		let img = anchor.firstElementChild;
		img.src = uri;
		span = img.nextElementSibling;
	  }
	  if (!url.startsWith("place:")) {
		anchor.href = url;
	  }
//	  let isSpecial = url.startsWith("place:");
//	  let anchor;
//	  if (isSpecial) {
//		anchor = document.createElement("div"); // Assuming it is an HTMLDivElement
//	  }
//	  else {
	  // We can attach an href attribute to <div> !!
	  // Much better as it avoids any special behavior of <a> on clicks and look/CSS ..
	  //anchor = document.createElement("a"); // Assuming it is an HTMLAnchorElement
//	  anchor = document.createElement("div"); // Assuming it is an HTMLDivElement
//	  anchor.href = url;
//	}
//	anchor.classList.add("rbkmkitem_b");
	  if (showPath_option) {
		anchor.title = BN_path(BTN.parentId);
		if (title == "") {
		  title = suggestDisplayTitle(url);
		}
		span.textContent = title;
	  }
	  else {
		if (title == "") {
		  anchor.title = url;
		  span.textContent = suggestDisplayTitle(url);
		}
		else {
		  anchor.title = title+"\n"+url;
		  span.textContent = title;
		}
	  }
//	  anchor.draggable = false;
	  anchor.style.marginLeft = "16px";

	  cell.appendChild(anchor);
	}
	rc = true;
  }
  return(rc);
}

/*
 * Remove highlight from a cell, if there is one
 */
function clearCellHighlight () {
  if (cellHighlight != null) {
	cellHighlight.classList.replace(Selhighlight, "brow");
	if (cellHighlight.classList.contains(Reshidden))
	  cellHighlight.classList.remove(Reshidden);
	cellHighlight = null;
  }
}

/*
 * Set cell highlight, remember current selected bnId for next FF or sidebar reopen
 * 
 * cell = .brow cell to set. Preserve the Reshidden flag if this is not changing cellHighlight.
 */
function setCellHighlight (cell) {
  if (cell != cellHighlight) {
	clearCellHighlight();
	cellHighlight = cell;
	cellHighlight.classList.replace("brow", Selhighlight);
  }

  let bnId = cell.parentElement.dataset.id;
  if (backgroundPage == undefined) {
	sendAddonMsgCurBnId(bnId);
  }
  else {
	backgroundPage.saveCurBnId(myWindowId, bnId);
  }
}

/*
 * Call to refresh cut status of any result in a bookmark search, if there is one active.
 * 
 * btnId = String, id of BookmarkTreeNode id string with modified cut status
 * status = Boolean, if true set cut status on (dim), else set it off
 */
function refreshCutSearch (btnId, status) {
  if (SearchTextInput.value.length > 0) { // Refresh only if a search is active
	let row = curResultRowList[btnId];
	if (row != undefined) { // There is a result in search pane corresponding to that BTN
	  // Update only the row, do not change anything else
	  if (status) {
		row.classList.add("cut");
	  }
	  else {
		row.classList.remove("cut");
	  }
	}
  }
}

/*
 * Call to refresh favicon of any result corresponding to a modified BTN in a bookmark search,
 * if there is one active.
 * 
 * btnId = Id of modified BookmarkTreeNode id string
 * uri = new URI for the favicon
 */
function refreshFaviconSearch (btnId, uri) {
  if (SearchTextInput.value.length > 0) { // Refresh only if a search is active
	let row = curResultRowList[btnId];
	if (row != undefined) { // There is a result in search pane corresponding to that BTN
	  // Update only the row, do not change anything else
	  let img = row.firstElementChild.firstElementChild.firstElementChild;
	  img.src = uri;
	}
  }
}

/*
 * Turn the Cancel search button on, and show search pane
 */
let sboxState = SBoxEmpty;	// No active search
function enableCancelSearch () {
  CancelSearchInput.src = "/icons/cancel.png";
  CancelSearchInput.disabled = false;
  sboxState = SBoxExecuted;	// Search was launched or is complete
  SearchResult.hidden = false;
}

/*
 * Turn the Cancel search button off, and hide seach pane
 */
function disableCancelSearch () {
  CancelSearchInput.src = "/icons/empty.png";
  CancelSearchInput.disabled = true;
  sboxState = SBoxEmpty;	// No active search
  SearchResult.hidden = true;
}

/*
 * Turn the execute search button on
 */
function enableExecuteSearch () {
  CancelSearchInput.src = "/icons/enter.png";
  CancelSearchInput.disabled = false;
  sboxState = SBoxChanging;	// Content of search box is changing
}

/*
 * Display results table, and stop the waiting icon
 * 
 * a_BTN: Array ot BTNs (or of BNs in some cases)
 */
function displayResults (a_BTN) {
  // Discard previous results table if any
  // Can happen if we have slow searches, and several have been "queued" in series all happening
  // after last updateSearch() disptach ..
  if (resultsTable != null) {
	SearchResult.removeChild(resultsTable);
	resultsTable = null;
	curResultRowList = {};
//	resultsFragment = null;

	// If a row cell was highlighted, do not highlight it anymore
//	clearCellHighlight();
  }

  // Create search results table
//  resultsFragment = document.createDocumentFragment();
  resultsTable = document.createElement("table");
  SearchResult.appendChild(resultsTable); // Display the search results table + reflow
//  resultsFragment.appendChild(resultsTable);

  let len = a_BTN.length;
//trace("Results: "+len);
  if (len > 0) {
	let i;
	for (let j=0 ; j<len; j++) {
	  i = a_BTN[j];
	  let url = i.url;
//trace("Matching BTN.id: "+i.id+" "+i.title+" "+url);
	  if ((url == undefined)           // folder (or separator ...)
		  || !url.startsWith("place:") // "place:" results behave strangely .. (they have no title !!)
	     ) {
		// Append to the search result table
		if ((i.type != "separator") && (i.id != TagsFolder)) { // Do not display separators nor Tags folder in search results
		  if (!appendResult(i)) {
			break; // Break loop in case of error
		  }
		}
	  }
	}
  }
  // Stop waiting icon and display the search result table
  WaitingSearch.hidden = true;
//  SearchResult.appendChild(resultsFragment); // Display the search results table + reflow
}

/*
 * Execute / update a bookmark search and display result
 */
function updateSearch () {
  // Triggered by timeout (or Enter key), so now clear the id
  inputTimeout = null;

  // Get search string
  let value = SearchTextInput.value;

  // Do not trigger any search if the input box is empty
  // Can happen in rare cases where we would hit the cancel button, and updateSearch() is dispatched
  // before the event dispatch to manageSearchTextHandler() and so before it could clear the timeout.
  if (value.length > 0) { // Launch search only if there is something to search for
	// Activate search mode and Cancel search button if not already
	if (sboxState != SBoxExecuted) {
	  enableCancelSearch();
	}
	if (resultsTable != null) { // Discard previous results table if there is one
	  SearchResult.removeChild(resultsTable);
	  resultsTable = null;
	  curResultRowList = {};
//	  resultsFragment = null;

	  // If a row cell was highlighted, do not highlight it anymore
//	  clearCellHighlight();
	}

	// Display waiting for results icon
	WaitingSearch.hidden = false;

	// Look for bookmarks matching the search text in their contents (title, url .. etc ..)
	let searching;
	if ((searchField_option == "both") && (searchScope_option == "all") && (searchMatch_option == "words")) {
	  searching = browser.bookmarks.search(value);
	}
	else {
	  searching = new Promise ( // Do it asynchronously as that can take time ...
		(resolve) => {
		  let a_matchStr;
		  let matchRegExp;
		  let isRegExp, isTitleSearch, isUrlSearch;
		  let a_BN;

		  if (searchField_option == "both") {
			isTitleSearch = isUrlSearch = true;
		  }
		  else if (searchField_option == "title") {
			isTitleSearch = true;
			isUrlSearch = false;
		  }
		  else {
			isTitleSearch = false; 
			isUrlSearch = true;
		  }

		  if (searchMatch_option == "words") { // Build array of words to match
			isRegExp = false;
			a_matchStr = strLowerNormalize(value).split(" ");
		  }
		  else {
			isRegExp = true;
			try {
			  matchRegExp = new RegExp (strNormalize(value), "i"); // Do normalized insensitive case matching
			}
			catch (e) { // If malformed regexp, do not continue, match nothing
			  a_BN = [];
			}
		  }

		  if (a_BN == undefined) { // No error detected, execute search
			if (searchScope_option == "all") { // Use the List form
			  a_BN = searchCurBNList(a_matchStr, matchRegExp, isRegExp, isTitleSearch, isUrlSearch);
			}
			  else { // Use the recursive form
			  let BN;
			  if ((cellHighlight == undefined) || (cellHighlight == null)) { // Start from Root
				BN = rootBN;
			  }
			  else { // Retrieve BN of highlighted cell
				let bnId = cellHighlight.parentElement.dataset.id;
				BN = curBNList[bnId];
				// Protection
				if (BN == undefined) {
				  BN = rootBN;
				}
			  }
			  a_BN = searchBNRecur(BN, a_matchStr, matchRegExp, isRegExp, isTitleSearch, isUrlSearch);
			}
		  }

		  resolve(a_BN);
		}
	  );
	}
	searching.then(
	  function (a_BTN) { // An array of BookmarkTreeNode or of BookmarkNode (a poor man's kind of "polymorphism" in Javascript ..)
		// Create the search results table only if a search is still active.
		// Can happen when browser.bookmarks.search() is very long, like higher than InputKeyDelay,
		// and we have cleared the input box / cancelled the search in between.
		if (SearchTextInput.value.length > 0) { // Display results only if there is something to search for
		  displayResults(a_BTN);
		}
	  }
	);
  }
}

/*
 * Call to update a bookmark search and display result, if there is one active
 */
function triggerUpdate () {
  if (SearchTextInput.value.length > 0) { // Refresh only if a search is active
	// Clear input timeout if there was one active, to replace it by new (maybe faster) one
	// This allows to integrate together multiple events, like remove of a folder and its subtree
	if (inputTimeout != null) {
	  clearTimeout(inputTimeout);
	}
	// Schedule a new one
	inputTimeout = setTimeout(updateSearch, UpdateSearchDelay);
  }
}

/*
 * Reset bookmarks tree to its intended visibility state
 * which means hide all that is under a closed (.twistieac) folder
 */
function resetTreeVisiblity () {
  let row = bookmarksTable.rows[0]; // Start at first row in table (which btw cannot be hidden)
  let level;
  while (row != null) {
	// We are on an intended to be visible row,
	row.hidden = false;
	// Check if this is a folder and if meant to be open
	if ((row.dataset.type == "folder") // This is a folder, check its intended state
		&& (row.firstElementChild.firstElementChild.classList
			   .contains("twistieac"))
	   ) {
	  // It is closed, then all its children are hidden ..
	  level = parseInt(row.dataset.level, 10);
	  while ((row = row.nextElementSibling) != null) {
		if (parseInt(row.dataset.level, 10) <= level)
		  break; // Stop when lower or same level
		row.hidden = true;
	  }
	}
	else   row = row.nextElementSibling;
  }
}

/*
 * Manage searches in the Searchbox:
 * - handle visibility and state (enabled / disabled) of the text cancel button
 * - handle appearance of a search result area, and display search results, after a timeout
 * - handle reset of timeout each time new key is pressed
 */
function manageSearchTextHandler () {
  let value = SearchTextInput.value;

  // Clear input timeout if there was one active
  if (inputTimeout != null) {
	clearTimeout(inputTimeout);
  }

  /*
   * Set the cancel text image, and enable or disable it based on:
   * - 0 character = no image, disabled
   * - 1 or more character(s) = set the cancel image, enable the button
   */
  if (value.length > 0) {
	if (!searchOnEnter_option) { // Auto trigger search when no more key typed in
	  // Set timeout before triggering / updating search mode
	  inputTimeout = setTimeout(updateSearch, InputKeyDelay);
	}
	enableExecuteSearch();
  }
  else { // Clear search mode
	inputTimeout = null; // We just cleared any last timeout, so set to null
	disableCancelSearch();

	// Discard the results table if any
	if (resultsTable != null) {
	  SearchResult.removeChild(resultsTable);
	  resultsTable = null;
//	  resultsFragment = null;
	  curResultRowList = {};
	}

	// If a row was highlighted, do not highlight it anymore
//	clearCellHighlight();

	// Restore bookmarks tree to its initial visibility state
	resetTreeVisiblity();

	// Remember search pane height if needed
	let sh = SearchResult.style.height; 
	if (sh != "") { // The search result pane size is different
	  				// from its default value set in the CSS
	  				// which is 20% (as seen in Computed Style)
	  if (rememberSizes_option) {
		if (searchHeight_option != sh) { // Save only if different from already saved
		  searchHeight_option = sh;
		  browser.storage.local.set({
			searchheight_option: sh
		  });
		}
	  }
	}
  }
}

/*
 * Clear the contents of the Search text box
 */
function clearSearchTextHandler () {
  clearMenu(); // Clear any open menu
  SearchTextInput.disabled = false; // If it was disabled, re-enable it (happens on "Show bookmark in sidebar")
  SearchTextInput.value = ""; // Empty the input box

  // Fire event on searchText to handle things properly
  let event = new InputEvent ("input");
  SearchTextInput.dispatchEvent(event);
  SearchTextInput.focus(); // Keep focus on it ...
}

/*
 * Execute or clear the contents of the Search text box, depending on state of the button
 */
function cancelSearchTextHandler () {
  if (sboxState == SBoxChanging) {
	clearMenu(); // Clear any open menu
	triggerUpdate();
  }
  else {
	clearSearchTextHandler();
  }
}

/*
 * Right click on Cancel search button
 */
/* function contextSearchTextHandler () {
  trace("contextSearchTextHandler");
}
*/

/*
 * Handle search options
 */
function setSearchOptions () {
  let cn;
  let buttonTitleFields, buttonTitleScope, buttonTitleMatch, buttonTitleFilter;
  if (searchMatch_option == "regexp") {
	cn = "sr" + searchField_option;
	SMatchRegexpInput.checked = true;
	buttonTitleMatch = "Use regex";
  }
  else {
	cn = "sw" + searchField_option;
	SMatchWordsInput.checked = true;
  }
  if (searchFilter_option == "all") {
	SFilterAllInput.checked = true;
	SFieldUrlOnlyInput.disabled = SFieldUrlOnlyLabel.disabled = false;
  }
  else if (searchFilter_option == "fldr") {
	SFilterFldrOnlyInput.checked = true;
	SFieldUrlOnlyInput.disabled = true; // Disable search on URL
	buttonTitleFilter = "Show folders only";
  }
  else {
	SFilterBkmkOnlyInput.checked = true;
	SFieldUrlOnlyInput.disabled = SFieldUrlOnlyLabel.disabled = false;
	buttonTitleFilter = "Show bookmarks only";
  }
  cn +=  " sfilter"+searchFilter_option;
  SearchButtonInput.className = cn;
  if (searchScope_option == "all") {
	MGlassImgStyle.backgroundImage = 'url("/icons/search.png"';
	SScopeAllInput.checked = true;
  }
  else {
	MGlassImgStyle.backgroundImage = 'url("/icons/searchsub.png"';
	SScopeSubfolderInput.checked = true;
	buttonTitleScope = "Inside current folder";
  }

  if (searchField_option == "both") {
	SFieldTitleUrlInput.checked = true;
  }
  else if (searchField_option == "title") {
	SFieldTitleOnlyInput.checked = true;
	buttonTitleFields = "Search title only";
  }
  else {
	SFieldUrlOnlyInput.checked = true;
	buttonTitleFields = "Search URL only";
  }

  // Set hover text on button
  let buttonTitle;
  if (buttonTitleFields != undefined) {
	buttonTitle = buttonTitleFields;
  }
  if (buttonTitleScope != undefined) {
	if (buttonTitle == undefined) {
	  buttonTitle = buttonTitleScope;
	}
	else {
	  buttonTitle += "\n"+buttonTitleScope;
	}
  }
  if (buttonTitleMatch != undefined) {
	if (buttonTitle == undefined) {
	  buttonTitle = buttonTitleMatch;
	}
	else {
	  buttonTitle += "\n"+buttonTitleMatch;
	}
  }
  if (buttonTitleFilter != undefined) {
	if (buttonTitle == undefined) {
	  buttonTitle = buttonTitleFilter;
	}
	else {
	  buttonTitle += "\n"+buttonTitleFilter;
	}
  }
  if (buttonTitle == undefined) {
	buttonTitle = "Filters: none\nPress button to modify";
	ResetFiltersButtonInput.disabled = true;
	SFiltersImgStyle.backgroundImage = 'url("/icons/resetfiltersdis.png"';
  }
  else {
	ResetFiltersButtonInput.disabled = false;
	SFiltersImgStyle.backgroundImage = 'url("/icons/resetfiltersen.png"';
  }
  SearchButtonInput.title = buttonTitle;


  // Redo any ongoing search
  triggerUpdate();
}

function saveSearchOptions () {
  searchField_option_file = searchField_option;
  searchScope_option_file = searchScope_option;
  searchMatch_option_file = searchMatch_option;
  searchFilter_option_file = searchFilter_option;
  browser.storage.local.set({
	 searchfield_option: searchField_option,
	 searchscope_option: searchScope_option,
	 searchmatch_option: searchMatch_option,
	 searchfilter_option: searchFilter_option
  })
  .then(
	function () {
	  // Signal change to search options to all
	  sendAddonMessage("savedSearchOptions");
	}
  );
}

function resetSearchHandler () {
  searchField_option = "both";
  searchScope_option = "all";
  searchMatch_option = "words";
  searchFilter_option = "all";
  saveSearchOptions();
}

function setSFieldTitleUrlHandler () {
  searchField_option = "both";
  saveSearchOptions();
}

function setSFieldTitleOnlyHandler () {
  searchField_option = "title";
  saveSearchOptions();
}

function setSFieldUrlOnlyHandler () {
  searchField_option = "url";
  saveSearchOptions();
}

function setSScopeAllHandler () {
  searchScope_option = "all";
  saveSearchOptions();
}

function setSScopeSubfolderHandler () {
  searchScope_option = "subfolder";
  saveSearchOptions();
}

function setSMatchWordsHandler () {
  searchMatch_option = "words";
  saveSearchOptions();
}

function setSMatchRegexpHandler () {
  searchMatch_option = "regexp";
  saveSearchOptions();
}

function setSFilterAllHandler () {
  searchFilter_option = "all";
  saveSearchOptions();
}

function setSFilterFldrOnlyHandler () {
  searchFilter_option = "fldr";
  searchField_option = "title"; // Force title, searchng on URL for a folder makes no sense
  saveSearchOptions();
}

function setSFilterBkmkOnlyHandler () {
  searchFilter_option = "bkmk";
  saveSearchOptions();
}

/*
 * Trigger 16x16 migration in background
 */
let migr16x16ConvertList = [];
let migr16x16Len = 0;
function trigMigrate16x16 () {
  if (backgroundPage == undefined) {
	sendAddonMsgMigr16x16(migr16x16ConvertList, migr16x16Len);
  }
  else {
	backgroundPage.signalMigrate16x16(migr16x16ConvertList, migr16x16Len);
  }
}

/*
 * Add an icon to migration list if needed
 */
function migr16x16OnLoad () {
  this.onload = undefined; // Do not trigger again
  let nw = this.naturalWidth;
  let nh = this.naturalHeight;

  let row = this.parentElement.parentElement.parentElement;
  let id = row.dataset.id;
  if ((nh == 0) || (nw == 0)) { // Abnormal size ?
	let uri = this.src;
	if (!uri.startsWith("data:image/svg+xml")) { // SVG can have no natural size ..
	  count0x0Favicons++;
	  trace("Favicon with abnormal size: "+nh+","+nw+" id: "+id+" uri: "+this.src+" title: "+this.parentElement.title, true);
	}
  }
  else if ((nh != 16) || (nw != 16)) {
//    console.log("Have to rescale: "+nh+","+nw+" for "+this.src.substr(0,50)+" - "+row.firstElementChild.firstElementChild.title);
    migr16x16Len = migr16x16ConvertList.push(id);

    // Set or reset timer to trigger migration
    if (migrationTimeout != null) {
      clearTimeout(migrationTimeout);
    }
    migrationTimeout = setTimeout(trigMigrate16x16, Migr16x16Timeout);
  }
}

/*
 * Insert a bookmark inside the sidebar table at given position (so just before
 * the row at that position).
 *
 * BN = BookmarkNode
 * index (optional) = insert position, or append at end if -1
 * children (optional) = used only in delayload_option mode, where we already looked at children
 *
 * Returns: the inserted row (an HTMLTableRowElement).
 *
 * Uses and maintain global variable highest_open_level.
 * It has to be set appropriately before an insert (or append), to determine the row visibility.
 * It is maintained by the function for sequential calls at initial display time, but when
 * inserting a bookmark later in the middle, the calling code has to set it appropriately.
 */
function insertBookmarkBN (BN, index = -1, children = undefined) {
//let t1 = new Date();
//trace(t1.getTime()+" Displaying <<"+BN.id+">><<"+BN.title+">><<"+BN.type+">><<"+BN.url+">> at level: "+level+" highest_open_level: "+highest_open_level+" and index: "+index);
//console.log("BN: "+BN.id+" type: "+BN.type+" dateAdded: "+BN.dateAdded+" dateGroupModified: "+BN.dateGroupModified);

  // Insert new row at given place, or append a new row, inside the bookmarks table
  let row = bookmarksTable.insertRow(index);

  // Refresh highest_open_level if we finished one or more levels which were open
  let level = row.dataset.level = BN.level; // Keep level of bookmark in the data-level attribute
  if (level < highest_open_level)   highest_open_level = level;
  else if (level > highest_open_level) { // If not in an open part, hide the row
	row.hidden = true; 
  }
  row.draggable = true; // Always .. and we will use dataset.protect to forbid move
  						// of special elements.
  						// Note: it is false by default for <tr>
  row.dataset.protect = BN.protect;

  let BN_id = row.dataset.id = BN.id; // Keep unique id of bookmark in the data-id attribute
  curRowList[BN_id] = row;

  // Add bookmark items in row
  let cell = row.insertCell();
  cell.classList.add("brow");
  cell.tabIndex = 0;
//  cell.draggable = false; // False by default for <td>

  // Append proper contents to the cell:
  // - if folder, a <div> of class "twistiena", "twistieac" or twistieao", depending
  //   if there are no children, if closed or open, with a margin-left corresponding
  //   to the level
  // - a <div> of class "bkmkitem_s" or "bkmkitem_f", or a <a> of class "bkmkitem_b",
  //   for respectively separator, folder or bookmark, with a margin-left corresponding
  //   to the level + 16 if not "bkmkitem_f", containing:
  //   - if separator, a <div> of class "favseparator"
  //   - if folder or bookmark, an <img> (class "favicon") and a <span> with text
  //     (set class to "favtext" in javascript to get 3px margin-left, but not in HTML where
  //      it's already done, don't know why).
  let type = row.dataset.type = BN.type;
  if (type == "folder") {				// Folder
	// Retrieve saved state or set open by default
	let is_open = undefined;
	if (savedFldrOpenList != undefined) {
	  is_open = savedFldrOpenList[BN_id];
	}
	else {
	  // Verify if we already know about it
	  is_open = curFldrOpenList[BN_id];
	}
	if (is_open == undefined) { // Folder closed by default when no info
	  is_open = curFldrOpenList[BN_id] = false;
	}
	else   curFldrOpenList[BN_id] = is_open;

	// Update indicator of highest open level .. only if open and in an open part
	if (is_open && (highest_open_level == level))
	  highest_open_level = level + 1;

	// Create elements
	let div2 = document.createElement("div"); // Assuming it is an HTMLDivElement
	// Look at children to set the twistie
//	if (!delayLoad_option)
	  children = BN.children;
	if ((children == undefined) || (children.length == 0))
	  div2.classList.add("twistiena");
	else
	  div2.classList.add(is_open ? "twistieao" : "twistieac");
	div2.draggable = false; // False by default for <div>
	if (level > 0) {
	  div2.style.marginLeft = (LevelIncrementPx * level)+"px";
	}
	cell.appendChild(div2);

	let div3;
	let span;
	if (BN.fetchedUri) { // Special folder
	  div3 = SFolderTempl.cloneNode(true);
	  let img = div3.firstElementChild;
	  img.src = BN.faviconUri;
	  span = img.nextElementSibling;
	}
	else {
	  div3 = FolderTempl.cloneNode(true);
	  span = div3.firstElementChild.nextElementSibling;
	}
	span.textContent = div3.title = BN.title;
	cell.appendChild(div3);
  }
  else if (type == "separator") {		// Separator
	// Create elements
	let div2 = SeparatorTempl.cloneNode(true);
	if (level > 0) {
	  div2.style.marginLeft = (LevelIncrementPx * level + 16)+"px";
	}
	cell.appendChild(div2);
  }
  else {								// Presumably a Bookmark
	// Create elements
	let url = BN.url;
	let title = BN.title;
	// We can attach an href attribute to <div> !!
	// Much better as it avoids any special behavior of <a> on clicks and look/CSS ..
	let anchor;
	if (disableFavicons_option) { // Clone with nofavicon image background
	  anchor = NFBookmarkTempl.cloneNode(true);
	}
	else { // Clone normal one, we will fill the image later
	  anchor = BookmarkTempl.cloneNode(true);
	}
	if (!url.startsWith("place:")) {
	  anchor.href = url;
	}
	if (level > 0) {
	  anchor.style.marginLeft = (LevelIncrementPx * level + 16)+"px";
	}

	let span;
	if (BN.fetchedUri && (migration_img16)) { // Catch end of image load if we have to migrate
	  let img = anchor.firstElementChild;
	  img.onload = migr16x16OnLoad;
	  if (immediateFavDisplay_option) {
		let uri = BN.faviconUri;
		img.src = (uri == undefined ? "/icons/nofavicon.png" : uri);
	  }
	  span = img.nextElementSibling;
	}
	else {
	  if (immediateFavDisplay_option
		  || isDisplayComplete			// Do not defer once initial load/display is complete
	     ) {
		let img = anchor.firstElementChild;
		let uri = BN.faviconUri;
		img.src = (uri == undefined ? "/icons/nofavicon.png" : uri);
		span = img.nextElementSibling;
	  }
	  else {
		span = anchor.firstElementChild.nextElementSibling;
	  }
	}

	if (title == "") {
	  anchor.title = url;
	  span.textContent = suggestDisplayTitle(url);
	}
	else {
	  anchor.title = title+"\n"+url;
	  span.textContent = title;
	}
	cell.appendChild(anchor);
  }

  return(row);
}

/*
 * Insert one or more (if folder) bookmarks in the displayed table
 *
 * BN = BookmarkNode. Information about the new bookmark item (and its children if folder)
 * parentRow = HTMLTableRowElement of the parent (when known)
 * parentLevel = integer, parent level (when known)
 * parentOpen = Boolean, whether the parent is intended to be open or not (when known)
 * 
 * Relies on a global variable insertRowIndex to be set by the caller, and maintains it
 *    = integer, position in bookmarksTable where to insert. (This is because there is
 *      no "pass by reference" in javascript ... only pass by value :-( )
 *
 * Returns the last inserted row
 */
let insertRowIndex;
function insertBkmks (BN, parentRow, parentLevel = undefined, parentOpen = undefined) {
  // Retrieve parent in the bookmarks table if not supplied
  if (parentLevel == undefined) { // Retrieve infos
	// There must be a parent .. root is never created
	// Assumption is also that "toolbar_____", "menu________", "unfiled_____"
	// and "mobile______" are never created either, and everything
	// falls under one of them (at least ..).

	// Retrieve level of parent, and open information
	parentLevel = BN.level - 1;
	parentOpen = curFldrOpenList[BN.parentId];

	// Update parent twistiexx class if we insert under an empty folder
	// Note: this only happens when we don't know the parent ...
	let twistie = parentRow.firstElementChild.firstElementChild;
	if (twistie.classList.contains("twistiena")) { // It was empty
	  if (parentOpen) {
		twistie.classList.replace("twistiena", "twistieao");
	  }
	  else {
		twistie.classList.replace("twistiena", "twistieac");
	  }
	}
  }

  // Verify what should be the visibility status of the inserted row
  if (parentRow.hidden) { // Parent is not visible, so this row shouldn't be either
	highest_open_level = 0; // Min possible, to make it simple ..
  }
  else { // Parent is visible, child visiblity depends on its open state ..
	if (parentOpen)
	  highest_open_level = parentLevel + 1; // Will be visible
	else { // Parent is closed, but lets verify if its contents is open because of a search ..
	  	   // If so, then the insert should be immediately visible.
	  let nextRow = parentRow.nextElementSibling;
	  if (nextRow != null) {
		let nextLevel = parseInt(nextRow.dataset.level, 10);
		if ((nextLevel == parentLevel+1) && !nextRow.hidden) {
		  highest_open_level = nextLevel; // Will be visible
		}
		else {
		  highest_open_level = parentLevel; // Will be hidden
		}
	  }
	  else { // We reached the end of bookmarks table, no children
		highest_open_level = parentLevel; // Will be hidden
	  }
	}
  }

  // Insert the new bookmark at its place
  let row;
  if (insertRowIndex == bookmarksTable.rows.length) {
	row = insertBookmarkBN(BN); // Append row
	insertRowIndex++;
  }
  else { 
	row = insertBookmarkBN(BN, insertRowIndex++);
  }

  // If BN is a folder, proceed with inserting its children if any (= case of Move or Sort)
  if (BN.type == "folder") {
	let children = BN.children;
	let len;
	if ((children != undefined) && ((len = children.length) > 0)) {
	  let childRow;
	  let is_open = curFldrOpenList[BN.id]; // Retrieve our intended open state
	  for (let i=0 ; i<len ; i++) {
		childRow = insertBkmks(children[i], row, parentLevel+1, is_open);
	  }
	  row = childRow; // Get last inserted in row, for return()
	}
  }

  return(row);
}

/*
 * Handle bookmark creation event
 *
 * BN = new BookmarkNode subtree which is added
 * index = insertion point under parent
 */
function bkmkCreated (BN, index) {
//trace(t1.getTime()+" Create event on: "+BN.id+" type: "+BN.type+" parentId: "+BN.parentId+" index: "+index);
  if (!isDisplayComplete) // If we get an event while not yet ready, ignore
	return;

  let parentId = BN.parentId;
  let parentBN = curBNList[parentId];
  if (backgroundPage == undefined) { // Redo insertion in our own copy of curBNList

	// Insert the new BN tree under its parent
	BN_insert(BN, parentBN, index);
  }

  // Find insertion point, setting it in global variable insertRowIndex
  // We need to retrieve the insertion point the hard way if we do not want to call
  // getSubtree() which is very very long ...
  let row;
  let parentRow = curRowList[parentId];
  // Introduce robustness in case the BN tree is empty and index is not 0, as that seems to occur some times
  let children = parentBN.children;
  if ((index == 0) || (children == undefined)) { // Insert just after parent row
	// Note that this also takes care of the case where parent had so far no child
	insertRowIndex = parentRow.rowIndex + 1; // Can be at end of bookmarks table
  }
  else { // Insert just after previous row
		 // ASSUMPTION (true so far): when multiple moves / creates to same parent, like in multi-select move
	 	 //            or reorder or ..., items are sent to us in increasing row/index order, so previous
    	 //            rows to current item under process are always already at the right place.
		 // Note that in such multi operations, things have been all processed in background first for the copy,
		 //       so the BN tree is not anymore in sync with display.
	let previousBN = BN_lastDescendant(children[index-1]);
	row = curRowList[previousBN.id];
	insertRowIndex = row.rowIndex + 1; // Can be at end of bookmarks table
  }

  // We got the insertion point, proceed to insertion
  row = insertBkmks(BN, parentRow);

  // Save new current info and refresh search
  let type = BN.type;
  if (type != "separator") {
	if (type == "folder") {
	  saveFldrOpen(); // If real folder creation, there is no children (yet)
	}

	// Call refresh search if there is one active
	triggerUpdate();
  }
}

/*
 * Delete rows from the table and from cur lists (and all descendants if it is a folder),
 * maintaining the twistie class of the parent folder if it becomes empty because of the delete.
 *
 * row = row to delete in table (and its children if folder)
 * cleanup = Boolean, if true, delete entry from cur<xxx>List, else leave it (like for a move
 *           or sort).
 *
 * Returns the row which took its place

 * Also modifies the global variable isOtherThanSeparatorRemoved, setting it to true if anything
 * else than a separator (= a bookmark or folder) is removed.
 */
let isOtherThanSeparatorRemoved;
function removeBkmks (row, cleanup) {
  isOtherThanSeparatorRemoved = false;

  // Remove item from display, and from the appropriate lists
  let BN_id = row.dataset.id;
  let nextRow = row.nextElementSibling;
  // Remember current level
  let level = parseInt(row.dataset.level, 10);
  // Remember previous row before deleting this one, for handling parent twistie later
  let previousRow = row.previousElementSibling;

  let rowIndex = row.rowIndex;
  if (cellHighlight == row.firstElementChild) {
	// Clear cellHighlight if that is the deleted row to avoid
	// problems later when moving selection
	cellHighlight = null;
  }
  if (row.dataset.type == "folder") {
	isOtherThanSeparatorRemoved = true;

	// Delete node and cleanup if needed
	if (cleanup) {
	  delete curFldrOpenList[BN_id];
	  delete curRowList[BN_id];
	}
	bookmarksTable.deleteRow(rowIndex);

	// Delete children if any
	while ((nextRow != null) && (parseInt(nextRow.dataset.level, 10) > level)) {
	  if (cleanup) {
		BN_id = nextRow.dataset.id;
		if (nextRow.dataset.type == "folder") {
		  delete curFldrOpenList[BN_id];
		}
		delete curRowList[BN_id];
	  }

	  // rowIndex is constant since nextRow took the place
	  nextRow = nextRow.nextElementSibling; // Do it before delete to not get a null ..
	  bookmarksTable.deleteRow(rowIndex);
	}
  }
  else {
	if (row.dataset.type == "bookmark")
	  isOtherThanSeparatorRemoved = true;

	// Delete node and cleanup if needed
	if (cleanup) {
	  delete curRowList[BN_id];
	}
	bookmarksTable.deleteRow(rowIndex);
  }

  // Update parent folder to twistiena class and closed if it has no more chidren
  // This is true if the previous row is a folder of level-1,
  // and if next row is null or is of level-1 or less
  if ((previousRow != null) // Being null should not occur, but just in case ...
	  && (previousRow.dataset.type == "folder")
	  && (parseInt(previousRow.dataset.level, 10) == level-1)
	  && ((nextRow == null) || (parseInt(nextRow.dataset.level, 10) < level))
     ) {
	let twistie = previousRow.firstElementChild.firstElementChild;
	if (twistie.classList.contains("twistieao")) { // It was open
	  twistie.classList.replace("twistieao", "twistiena");
	  curFldrOpenList[previousRow.dataset.id] = false;
	  saveFldrOpen();
	}
	else {
	  twistie.classList.replace("twistieac", "twistiena");
	}
  }

  return(nextRow);
}


/*
 * Handle bookmark deletion event
 *
 * bnId = id of BookmarkNode subtree to remove.
 */
function bkmkRemoved (bnId) {
//  trace("Remove event on: "+id+" title: <<"+removeInfo.node.title+">> type: "+removeInfo.node.type);
  if (!isDisplayComplete) // If we get an event while not yet ready, ignore
	return;

  // Retrieve removed subtree
  let BN = curBNList[bnId]; 
  if (backgroundPage == undefined) { // Redo deletion in our own copy of curBNList
	// Remove item and its children from curBNList
	BN_delete(BN);
  }

  // Retrieve position of removed item in the bookmarks table
  let row = curRowList[bnId];

  // Remove item and its children from display, and from the appropriate display lists
  // The returned value is the row which took its place in the table (or none if at end).
  row = removeBkmks(row, true);

  // Save new current info
  // A folder delete can presumably delete bookmarks, and a bookmark delete can
  // also change the open state of its parent if it was the only children in there,
  // so save at all times.
  saveFldrOpen();

  // Call refresh search if there is one active
  if (isOtherThanSeparatorRemoved) { // Global variable set by removeBkmks()
	triggerUpdate();
  }
}

/*
 * Handle bookmark changed event
 *
 * bnId = string. ID of the item that was changed.
 * isBookmark = boolean, true if the changed item is a bookmark, else false
 * title = string. Latest title value (changed or not)
 * url = string. Latest url value (changed or not)
 * uri = string. Latest faviconUri value (changed or not)
 */
function bkmkChanged (bnId, isBookmark, title, url, uri) {
//  trace("Change event on: "+id+" title: <<"+changeInfo.title+">> url: "+changeInfo.url);
  if (!isDisplayComplete) // If we get an event while not yet ready, ignore
	return;

  if (backgroundPage == undefined) { // Redo change in our own copy of curBNList
	// Retrieve changed item
	let BN = curBNList[bnId]; 
	// Change item
	BN.title = title;
	if (isBookmark) {
	  BN.url = url;
	  BN.faviconUri = uri;
	}
  }

  // Retrieve changed item in the bookmarks table
  let row = curRowList[bnId];

  // Update display
  let item = row.firstElementChild.firstElementChild;
  if (isBookmark) { // item is a .bkmkitem_b <div>
    // item.title mixes both, so is always updated
    // Update all
    let span = item.firstElementChild.nextElementSibling;
    if (title == "") {
      item.title = url;
      span.textContent = suggestDisplayTitle(url);
    }
    else {
      item.title = title+"\n"+url;
      span.textContent = title;
    }
    let isSpecial = url.startsWith("place:");
    if (isSpecial) {
      if (item.hasAttribute("href")) { // It was not special before .. remove the href
    	item.removeAttribute("href");
      }
    }
    else { // Set the new href value
      item.href = url;
    }

    let img = item.firstElementChild; // Assuming it is an HTMLImageElement
    img.src = uri;
  }
  else { // Can only be a folder, per spec of the event, not a separator
         // => item is a ".twistie.." <div>
	// Get to the <span> in .bkmkmitem_f <div>
	let span = item.nextElementSibling.firstElementChild.nextElementSibling;
	span.textContent = title;
  }

  // Trigger an update as results can change, if there is a search active
  // Note: a separator is never modified, so that can only be a bookmark or folder.
  triggerUpdate();
}

/*
 * Handle bookmark moved event
 *
 * bnId = string. ID of the item that was moved.
 * curParentId = string. ID of the current parent folder.
 * targetParentId = string. ID of the new parent folder.
 * targetIndex = integer. The new index of this item in its parent.
 */
function bkmkMoved (bnId, curParentId, targetParentId, targetIndex) {
//console.log("Move event on: "+bnId+" from: <<"+curParentId+">> to: <<"+targetParentId+", "+targetIndex+">>");
  if (!isDisplayComplete) // If we get an event while not yet ready, ignore
	return;

  // Retrieve the real BookmarkNode and all its children, and its new parent
  let BN = curBNList[bnId];
  let targetParentBN = curBNList[targetParentId];
  if (backgroundPage == undefined) { // Redo change in our own copy of curBNList
	// Remove item and its children from its current parent, but keep them in list
	// as this is only a move.
	BN_delete(BN, curParentId, false);
	// Then insert it at new place, again not touching the list
	BN_insert(BN, targetParentBN, targetIndex, false);
  }

  // Get move description in current (= old) reference
  let movedRow = curRowList[bnId];
  let curRowIndex = movedRow.rowIndex;
  let targetParentRow = curRowList[targetParentId];
  let targetCurIndex = targetIndex;

  // Find insertion point, in current (= old) reference
  let targetCurRowIndex;
  let targetRow;
  // Introduce robustness in case the BN tree is empty and index is not 0, as that seems to occur some times
  let children = targetParentBN.children;
  if ((targetCurIndex == 0) || (children == undefined)) { // Insert just after parent row
	// Note that this also takes care of the case where parent had so far no child
	targetCurRowIndex = targetParentRow.rowIndex + 1;
	targetRow = targetParentRow.nextElementSibling; // Can be null if we move at end
  }
  else { // Insert just after previous row
		 // ASSUMPTION (true so far): when multiple moves / creates to same parent, like in multi-select move
		 //            or reorder or ..., items are sent to us in increasing row/index order, so previous
		 //            rows to current item under process are always already at the right place.
		 // Note that in such multi operations, things have been all processed in background first or the copy,
		 //       so the BN tree is not any more in sync with display.
	let previousBN = BN_lastDescendant(children[targetCurIndex-1]);
	targetRow = curRowList[previousBN.id];
	targetCurRowIndex = targetRow.rowIndex + 1; // Can be at end of bookmarks table
	targetRow = targetRow.nextElementSibling; // Can be null if we move at end
  }

  // We got the move point in targetRow (null if at end), and its position in
  // targetCurRowIndex, proceed to move
//console.log("curRowIndex: "+curRowIndex+" targetCurRowIndex: "+targetCurRowIndex);

  // Remove item and its children from display, but keep them in their cur lists
  // as this is only a move.
  // The returned value is the row which took its place in the table (or null if
  // removed at end).
  let deletePos = removeBkmks(movedRow, false);

  // Insert the item at its new place (with its children) using global variable insertRowIndex
  // and get the last inserted row in return.
  if (curRowIndex == targetCurRowIndex) { // targetRow has disappeared, it was the moved row
	// We are then visually inserting where it was deleted
	if (deletePos == null) { // This is the end of the bookmark table
	  insertRowIndex = bookmarksTable.rows.length;
	}
	else {
	  insertRowIndex = deletePos.rowIndex;
	}
  }
  else {
	if (targetRow == null) // Moving at end of bookmarks table
	  insertRowIndex = bookmarksTable.rows.length;
	else   insertRowIndex = targetRow.rowIndex; // Get the updated row index of target
  }
  insertBkmks(BN, targetParentRow);

  // State of parent folders may change, so save folder open state
  saveFldrOpen();

  if (showPath_option) {
	// Trigger an update as results can change, if there is a search active
	triggerUpdate();
  }
}

/*
 * Handle bookmark reordered event
 *
 * bnId = string. ID of the folder whose children were reordered.
 * reorderInfo = an object containing info about the reordered item.
 *   {childIds: array of string. Array containing the IDs of all the bookmark items in this folder,
 *              in the order they now appear in the UI. 
 *   }
 */
function bkmkReordered (bnId, reorderInfo) {
//  trace("Reorder event on: "+id);
  if (!isDisplayComplete) // If we get an event while not yet ready, ignore
	return;

  // We need the BN to get real info
  let folderBN = curBNList[bnId];
  let children = folderBN.children;
  if (children != undefined) {
	let childIds = reorderInfo.childIds;
	let len = childIds.length;
	if (backgroundPage == undefined) { // Redo change in our own copy of curBNList
	  // Create a new array with all children of folderBN in new order
	  children = folderBN.children = new Array (len); // Start new list from scratch, discarding the old one
	  for (let i=0 ; i<len ; i++) {
		children[i] = curBNList[childIds[i]];
	  }
	}

	// Delete all children of folderBN on display, if any (no cleanup)
	let folderRow = curRowList[bnId];
	let rowIndex = folderRow.rowIndex + 1;
	let level = folderBN.level;
	let nextRow = folderRow.nextElementSibling;
	while ((nextRow != null) && (parseInt(nextRow.dataset.level, 10) > level)) {
	  // rowIndex is constant since the next row takes the place each time
	  nextRow = nextRow.nextElementSibling; // Do it before delete to not get a null ..
	  bookmarksTable.deleteRow(rowIndex);
	}

	// And reinsert all children of folderBN in new order
	let is_open = curFldrOpenList[bnId]; // Retrieve our intended open state
	insertRowIndex = rowIndex;
	for (let i=0 ; i<len ; i++) {
	  insertBkmks(curBNList[childIds[i]], folderRow, level, is_open);
	}
  }

  // No folder state changed, so nothing to save

  if (showPath_option) {
	// Trigger an update as results can change, if there is a search active
	triggerUpdate();
  }
}

/*
 * Show a bookmark row, making it visible if hidden (but not opening its parent then)
 * 
 * srcRow is an HTMLTableRowElement
 */
function showRow (srcRow) {
  let srcHidden = srcRow.hidden;
  if (srcHidden) {
	// Unhide up to first ancestor already visible. Be careful to unhide only those
	// items under same parent of higher level parents, but not intermediate items inside
	// other folders on the path to the first open ancestor => strictly increasing level
	// sequence.
	let srcLevel = parseInt(srcRow.dataset.level, 10);
	let level = srcLevel;
	let row;
	let rowLevel;
	let twistie;
	let BN_id;
	(row = srcRow).hidden = false;
	while ((row = row.previousElementSibling).hidden) {
	  rowLevel = parseInt(row.dataset.level, 10);
	  if (rowLevel == level) {
		row.hidden = false;
	  }
	  else if (rowLevel < level) { // Cranking up one level in the tree
		level = rowLevel;
		row.hidden = false;
		// That can only be a folder, but that doesn't hurt to check
		// Open it if openTree_option is active
		if (openTree_option && (row.dataset.type == "folder")) { // Set it to open state
		  twistie = row.firstElementChild.firstElementChild;
		  if (twistie.classList.contains("twistieac")) { // Open twistie
			twistie.classList.replace("twistieac", "twistieao");
			BN_id = row.dataset.id;
			curFldrOpenList[BN_id] = true;
		  }
		}
	  }
	}

	// Retrieve the level of that first already visible parent
	// Note that if row was null, then the loop would have stopped on the first row of the table.
	// However,  this is a SNO (Should Not Occur) since the first row can never be hidden,
	// so no test for that condition ..
	let last_open_level = parseInt(row.dataset.level, 10);

	// Open it if openTree_option is active
	if (openTree_option && (row.dataset.type == "folder")) { // Set it to open state
	  twistie = row.firstElementChild.firstElementChild;
	  if (twistie.classList.contains("twistieac")) { // Open twistie
		twistie.classList.replace("twistieac", "twistieao");
		BN_id = row.dataset.id;
		curFldrOpenList[BN_id] = true;
	  }
	}
  
	// And now, unhide down all hidden elements after the shown item, until we find a
	// level < last_open_level or we reach end of table. Do that only on elements which are
	// at the same level than an ancestor we had to open => strictly increasing level sequence.
	row = srcRow;
	level = srcLevel;
	while (((row = row.nextElementSibling) != null)
		   && row.hidden
		   && ((rowLevel = parseInt(row.dataset.level, 10)) >= last_open_level)
		  ) {
	  if (rowLevel == level) {
		row.hidden = false;
	  }
	  else if (rowLevel < level) {
		level = rowLevel;
		row.hidden = false;
	  }
	}
  }

  // Highlight the source cell + scroll it into view
  setCellHighlight(srcRow.firstElementChild);
  // BUG: "smooth" has a bug when the viewport content is modified, it points at the origin position before modification
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1139745
  // So using "auto" instead of "smooth", which appears to work all time .. even if less nice
  //
  // To reproduce = scroll to bottom of tree, make a search on an item which is hidden while it has to significantly
  // expand, and click on the result ==> the smooth scroll up is much insufficient, and doesn't being the element into view,
  // which can be found much further up :-(
  if (beforeFF58) { // block: "center" is supported only from FF58
	srcRow.scrollIntoView({behavior: "auto"});
  }
  else {
	srcRow.scrollIntoView({behavior: "auto", block: "center", inline: "nearest"});
  }
}

/*
 * Go to a specific bookmark Id and highlight it.
 * If undefined or hidden, or doesn't exist anymore, go at top row, which cannot be hidden.
 * 
 * bnId is a String. If undefined or "undefined", does nothing
 */
function goBkmkItem (bnId) {
  let row;
  if ((bnId != undefined) && (bnId != "undefined")) {
	row = curRowList[bnId];
	if ((row == undefined) || row.hidden) {
	  row = bookmarksTable.rows[0];
	}
  }
  else {
	row = bookmarksTable.rows[0];
  }
  showRow(row);
}

/*
 * Go to parent folder of row (can be both a result or a bookmark pane row)
 * 
 * row is an HTMLTableRowElement
 */
function goParent (row) {
  // Find parent folder
  let BN_id = row.dataset.id;
  let BN = curBNList[BN_id]; // Get BookmarkNode
  let parentBN_id = BN.parentId;
  let parentRow = curRowList[parentBN_id]; // Get parent row
  showRow(parentRow);
}

/*
 * Close current folder and recursive children folders of current row
 * 
 * bnId is a String unique id of the folder bookmark item
 * row is the current HTMLTableRowElement
 */
function collapseAll (bnId, row) {
  let level = parseInt(row.dataset.level, 10);

  // Close and hide all children
  // Close twistie
  let twistie = row.firstElementChild.firstElementChild;
  twistie.classList.replace("twistieao", "twistieac");
  curFldrOpenList[bnId] = false;

  let cur_level, prev_level;
  let prev_row;
  prev_level = level + 1;
  while ((row = (prev_row = row).nextElementSibling) != null) {
	if ((cur_level = parseInt(row.dataset.level, 10)) <= level)
	  break; // Stop when lower or same level
	if (cur_level > prev_level) { // We just crossed a folder in previous row ..
	  // Check if it was open or not
	  twistie = prev_row.firstElementChild.firstElementChild;
	  if (twistie.classList.replace("twistieao", "twistieac")) { // We just closed the sub-folder
		bnId = prev_row.dataset.id;
		curFldrOpenList[bnId] = false;
	  }
	}
	prev_level = cur_level;
	row.hidden = true;
  }
  saveFldrOpen();
}

/*
 * Open current folder and recursive children folders of current row
 * 
 * bnId is a String unique id of the folder bookmark item
 * row is the current HTMLTableRowElement
 */
function expandAll (bnId, row) {
  let level = parseInt(row.dataset.level, 10);

  // Open and unhide all children
  // If we're opening the most visited or recent bookmarks special folders, call for a refresh
  if (bnId == mostVisitedBNId) {
	sendAddonMessage("refreshMostVisited");
  }
  else if (bnId == recentBkmkBNId) {
	sendAddonMessage("refreshRecentBkmks");
  } 

  // Open twistie
  let twistie = row.firstElementChild.firstElementChild;
  twistie.classList.replace("twistieac", "twistieao");
  curFldrOpenList[bnId] = true;

  let cur_level, prev_level;
  let prev_row;
  prev_level = level + 1;
  while ((row = (prev_row = row).nextElementSibling) != null) {
	if ((cur_level = parseInt(row.dataset.level, 10)) <= level)
	  break; // Stop when lower or same level
	if (cur_level > prev_level) { // We just crossed a folder in previous row ..
	  // Check if it was open or not
	  twistie = prev_row.firstElementChild.firstElementChild;
	  if (twistie.classList.replace("twistieac", "twistieao")) { // We just opened the sub-folder
		bnId = prev_row.dataset.id;
		curFldrOpenList[bnId] = true;

		// If we're opening the most visited or recent bookmarks special folders, call for a refresh
		if (bnId == mostVisitedBNId) {
		  sendAddonMessage("refreshMostVisited");
		}
		else if (bnId == recentBkmkBNId) {
		  sendAddonMessage("refreshRecentBkmks");
		} 
	  }
	}
	prev_level = cur_level;
	row.hidden = false;
  }
  saveFldrOpen();
}

/*
 * Open parents of .reshidden row
 * 
 * row is an HTMLTableRowElement
 * 
 * Relies on Global variable firstVisibleParentRow, set by handleResultClick when highlighting
 * the source row of selected result, or by checkVisibility.
 */
let firstVisibleParentRow;
function openResParents (row) {
  // Open up to first ancestor already visible as set by handleResultClick.
  // We open only ancestors => strictly increasing level sequence.
  let level = parseInt(firstVisibleParentRow.dataset.level, 10);
  let BN_id = row.dataset.id;
  let BN = curBNList[BN_id]; // Get BookmarkNode
  let twistie;
  do { // Open parent of current BN if not already open
	BN_id = BN.parentId;
	BN = curBNList[BN_id]; // Get BookmarkNode of parent
	row = curRowList[BN_id]; // Get parent row

	// That can only be a folder, but that doesn't hurt to check
    if (row.dataset.type == "folder") { // Set it to open state
      twistie = row.firstElementChild.firstElementChild;
      if (twistie.classList.contains("twistieac")) { // Open twistie
    	twistie.classList.replace("twistieac", "twistieao");
        curFldrOpenList[BN_id] = true;
      }
    }
  } while (BN.level > level); // The last ancestor is necessarily closed .. so do it also
  
  // Save new open state
  saveFldrOpen();

  // Remove the .reshidden class now that parents are open
  cellHighlight.classList.remove(Reshidden);
}

/*
 * Verify visiblity of a BookmarkNode
 *
 * BN_id is a String.
 * 
 * Return true if BN is visible, else false and set the global variable firstVisibleParentRow
 * to the lowest visible ancestor, from root.
 */
function isVisible (BN_id) {
  let visible;

  // Get to parent row and check it
  let BN = curBNList[BN_id];
  let parentBN_id = BN.parentId;
  if (parentBN_id == Root) {
	// Root, which is not displayed, is always considered visible and open,
    // since all its children folders are shown (= top level system folders).
	// So we are visible.
	visible = true;
  }
  else {
	let parentVisible = isVisible(parentBN_id);

	// If parent is not visible, we are not ...
	if (!parentVisible) {
	  visible = false;
	}
	else { // Parent is visible
	  // We are visible only if parent is open
	  visible = curFldrOpenList[parentBN_id];
	  // If we are not visible, we are the first one invisible since pour parent is visible,
	  // so set firstVisibleParentRow to parent row
	  firstVisibleParentRow = curRowList[parentBN_id];
	}
  }

  return (visible);
}

/*
 * Handle clicks on results = show source row in bookmarks tree
 *
 * resultRow is an HTMLTableRowElement in the result pane
 */
function handleResultClick (resultRow) {
  // Retrieve bookmark information in the result row (BN.id)
  let resultBN_id = resultRow.dataset.id;

  // If there was a previous highlighted row cell, go back to normal
//  clearCellHighlight();

  // Verify the current visiblity of the row before potentially modifying its parent state
  // if the openTree_option is set !
  // If it is hidden (one of its parents is closed), we'll need to display the special
  // "Open parents" action on context menu.
  // Be careful that srcHidden is not reliable .. in case we already showed a result under
  // same parent, then the row is already set to visible with that attribute, so have to check
  // curFldrOpenList[].
  // Also, if we already showed a result under an ancestor, the firstVisibleParentRow
  // cannot be derived from the "opening" code itself.
  // So we have to check visibility systematically.
  let wasRowVisible = isVisible(resultBN_id);

  // Make the source row of result visible if hidden
  let srcRow = curRowList[resultBN_id];
  if (srcRow != undefined) { // Protect against unlisted bookmarks, like "Tous les marques-pages"
							 // which do not appear in getTree(), but appear in search() !!
//trace("Row: "+srcRow+" resultBN_id: "+resultBN_id+" index: "+srcRow.rowIndex);
	showRow(srcRow);

	if (!wasRowVisible) {
	  // If we have the openTree_option active, then we necessarily changed some folder state
	  // => save it.
	  if (openTree_option) {
		saveFldrOpen();
	  }
	  else { // Else show special action on context menu
		cellHighlight.classList.add(Reshidden); // Show special menu
	  }
	}
  }
}

/*
 * Handle clicks on folders - Change twistie and visibility of children (recursively)
 *
 * twistie is an HTLMDivElement
 */
function handleFolderClick (twistie) {
  // Retrieve bookmark information in the row (BN.id and level)
  let row = twistie.parentElement.parentElement;
  let BN_id = row.dataset.id;
  let level = parseInt(row.dataset.level, 10);
//  trace("Row: "+row+" level: "+level);

  if (twistie.classList.contains("twistieao")) { // Hide all children (having level > row level)
	// Close twistie
	twistie.classList.replace("twistieao", "twistieac");
	curFldrOpenList[BN_id] = false;
	saveFldrOpen();
    // Hide higher level rows
	while ((row = row.nextElementSibling) != null) {
	  if (parseInt(row.dataset.level, 10) <= level)
		break; // Stop when lower or same level
	  row.hidden = true;
	}
  }
  else { // Open and unhide all direct children, plus only those under open sub-folders
	// If we're opening the most visited or recent bookmarks special folders, call for a refresh
	if (BN_id == mostVisitedBNId) {
	  sendAddonMessage("refreshMostVisited");
	}
	else if (BN_id == recentBkmkBNId) {
	  sendAddonMessage("refreshRecentBkmks");
	} 

	// If option set, go backwards until parent folder to close all other open folders at same level
	let prev_row = row;
	let prev_level;
	let prev_twistie;
	let is_open;
	let bnId;
	if (closeSibblingFolders_option) {
	  while ((prev_row = prev_row.previousElementSibling) != null) {
		prev_level = parseInt(prev_row.dataset.level, 10);
		if (prev_level < level) { // Reached parent, stop
		  break;
		}
		else if (prev_level == level) { // If folder at same level with an open twistie, close it 
		  // Check if this is an open folder row
		  prev_twistie = prev_row.firstElementChild.firstElementChild;
		  is_open = prev_twistie.classList.contains("twistieao");
		  if (is_open) { // Yes, close it
			prev_twistie.classList.replace("twistieao", "twistieac");
			bnId = prev_row.dataset.id;
			curFldrOpenList[bnId] = false;
			saveFldrOpen();
		  }
		}
		else { // Higher level, hide
		  prev_row.hidden = true;
		}
	  }
	}
	
	// Open twistie
	twistie.classList.replace("twistieac", "twistieao");
	curFldrOpenList[BN_id] = true;
	saveFldrOpen();

	// Unhide everything at higher level below it, when visible
	let last_open_level, cur_level;
	last_open_level = prev_level = level + 1;
	while ((row = (prev_row = row).nextElementSibling) != null) {
	  if ((cur_level = parseInt(row.dataset.level, 10)) <= level)
		break; // Stop when lower or same level
	  if (cur_level > prev_level) { // We just crossed a folder in previous row ..
		// Check if it was open or not
		twistie = prev_row.firstElementChild.firstElementChild;
		is_open = twistie.classList.contains("twistieao");

		// Make the new level visible only if the previous one was visible
		if (is_open && (last_open_level == cur_level - 1))
		  last_open_level = cur_level;
	  }
	  prev_level = cur_level;

	  // Crank up last_open_level if we finished one or more levels which were open
	  if (cur_level < last_open_level)
		last_open_level = cur_level;

	  // Row is not visible below last open level
	  row.hidden = (cur_level > last_open_level);
	}

	// If option set, go until end or lower level to close all other open folders at same level
	if (closeSibblingFolders_option && (row != null) && (cur_level == level)) { // There are sibbling rows
	  // Check if current row is an open folder
	  twistie = row.firstElementChild.firstElementChild;
	  is_open = twistie.classList.contains("twistieao");
	  if (is_open) { // Yes, close it
		twistie.classList.replace("twistieao", "twistieac");
		bnId = row.dataset.id;
		curFldrOpenList[bnId] = false;
		saveFldrOpen();
	  }
	  while ((row = row.nextElementSibling) != null) { // Go with next ones
		cur_level = parseInt(row.dataset.level, 10);
		if (cur_level < level) { // Reached an ancestor sibling, stop
		  break;
		}
		else if (cur_level == level) { // If folder at same level with an open twistie, close it 
		  // Check if this is an open folder row
		  twistie = row.firstElementChild.firstElementChild;
		  is_open = twistie.classList.contains("twistieao");
		  if (is_open) { // Yes, close it
			twistie.classList.replace("twistieao", "twistieac");
			bnId = row.dataset.id;
			curFldrOpenList[bnId] = false;
			saveFldrOpen();
		  }
		}
		else { // Higher level, hide
		  row.hidden = true;
		}
	  }
	}
  }
}

/*
 * Receive event from left clicks on results table
 *
 * e is of type MouseEvent (click)
 */
function resultsMouseHandler (e) {
  let target = e.target; // Type depends ..
  let className = target.className;
//  trace("Result click event: "+e.type+" button: "+e.button+" shift: "+e.shiftKey+" target: "+target+" class: "+className);
  if ((className != undefined)
	  && (className.length > 0)) {
//  if (resultsTable.rows.length > 0) {

	// The click target is one of .brow cell,
	// .bkmkitem_x div or anchor, .favicon img or .favttext span
	// Handle click, and go to the parent row
	if (className.includes("fav")) { // <div>, <img> or <span> -> got to .bkmkitem_x
	  								 // when advanced or Alt key, else go to .brow
	  if (advancedClick_option || e.altKey) {
		target = target.parentElement;
	  }
	  else {
		target = target.parentElement.parentElement;
	  }
	}
	else if (className.startsWith("rbkmkitem_")) { // If Alt key or advanced, open in current tab
	  											  // else just show -> go to .brow
	  if (!advancedClick_option && !e.altKey) {
		target = target.parentElement;
	  }
	}
	else if (e.altKey) { //  Presumably .brow, if Alt key, force open in current tab if bookmark
	  if (target.parentElement.dataset.type == "bookmark") {
		target = target.firstElementChild;
	  }
	}
	className = target.className;

	let showRow = true;
	if (className == "rbkmkitem_b") { // An HTMLDivElement
	  e.preventDefault(); // We do not want the left click to open in a new tab ..
	  					  // but in the active tab
	  let href = target.href;
	  if ((href != undefined) && (href.length > 0)) {
		// Respect the about:config browser.search.openintab setting setting
		if (openSearchResultsInNewTabs_option) { // If option set, open in new tab at end
		  browser.tabs.create({url: href});
		}
		else if (e.ctrlKey) { // Open in new tab, referred by this tab to come back to it when closing
		  // Get current active tab as opener id to come back to it when closing the new tab
		  if (beforeFF57)
			browser.tabs.create({url: href});
		  else {
			browser.tabs.query({windowId: myWindowId, active: true})
			.then (
			  function (a_tabs) {
				browser.tabs.create({url: href, openerTabId: a_tabs[0].id});
			  }
			);
		  }
		}
		else if (e.shiftKey) { // Open in new window
		  browser.windows.create({url: href});
		}
		else { // Open in current tab
		  browser.tabs.update({url: href});
		  showRow = false; // Do not show row, we already got an action
		}
	  }
	  // Now go to row
	  target = target.parentElement.parentElement;
	}
	else if ((className == "rbkmkitem_f") || (className == "rtwistieac")) {
	  // Go to row
	  target = target.parentElement.parentElement;
	}
	else { // Presumably the .brow cell
	  // Go to row
	  target = target.parentElement;
	}

	// Make the source object visible .. and scroll to it, except when Shift, Ctrl or Alt are pressed,
	// and when not on favtext / favicon in advanced mode
	if (showRow && !e.shiftKey && !e.ctrlKey && !e.altKey) {
	  handleResultClick(target);
	}

	// If close search option is set, close search pane now
	if (closeSearch_option) {
	  clearSearchTextHandler();
	}
  }
  e.stopPropagation(); // Prevent handlers up the DOM chain on same event
}

/*
 * Receive event from left clicks on bookmarks table
 *
 * e is of type MouseEvent (click)
 */
function bkmkMouseHandler (e) {
  let target = e.target; // Type depends ..
  let className = target.className;
//console.log("Bookmark click event: "+e.type+" button: "+e.button+" shift: "+e.shiftKey+" target: "+target+" class: "+className);

  // The click target is one of .brow/.selbrow cell, .twistiexx img (if folder),
  // .bkmkitem_x div, .favseparator/.favseparatorend div, .favicon or .favttext
  // Act only if the user clicked on .twistieax img, .bkmkitem_x, .favicon or .favtext
  // If favicon or favtext, get parent instead to handle click
  let twistie;
  if (className.includes("fav")) {
	target = target.parentElement;
	className = target.className;
  }
  else if (e.altKey) { // If Alt is pressed on bookmark, open in current tab wherever we click
	if ((className.includes("brow"))
		&& (target.parentElement.dataset.type == "bookmark")) {
	  target = target.firstElementChild;
	  className = target.className;
	}
  }
  if (className == "bkmkitem_b") { // An HTMLDivElement
	e.preventDefault(); // We do not want the left click to open in a new tab ..
						// but in the active tab
	let href = target.href;
	if ((href != undefined) && (href.length > 0)) {
	  // Respect the about:config browser.tabs.loadBookmarksInTabs setting
	  if (openBookmarksInNewTabs_option) { // If option set, open in new tab
		browser.tabs.create({url: href});
	  }
	  else if (e.ctrlKey) { // Open in new tab, referred by this tab to come back to it when closing
		// Get current active tab as opener id to come back to it when closing the new tab
		if (beforeFF57)
		  browser.tabs.create({url: href});
		else {
		  browser.tabs.query({windowId: myWindowId, active: true})
		  .then (
			function (a_tabs) {
			  browser.tabs.create({url: href, openerTabId: a_tabs[0].id});
			}
		  );
		}
	  }
	  else if (e.shiftKey) { // Open in new window
		browser.windows.create({url: href});
	  }
	  else { // Open in current tab
		browser.tabs.update({url: href});
	  }
	}
  }
  // If folder bkmkitem with active twistie, handle folder click
  else if (className == "bkmkitem_f") {
	if (traceEnabled_option && e.altKey) {
	  let bnId = target.parentElement.parentElement.dataset.id;
	  if ((bnId == mostVisitedBNId) || (bnId == recentTagBNId) || (bnId == recentBkmkBNId)) {
		// Special trick .. if traces are enabled, authorize this .. with href = "" or SelfURL, it will
		// load the add-on itself in the window tab.
		// Also available now on the magnifier glass button menu 
		// Very useful to use the inpector on it, as we cannot inspect inside the add-on sidebar ..
		let href = SelfURL;
		// Open in new tab, referred by this tab to come back to it when closing
		// Get current active tab as opener id to come back to it when closing the new tab
		browser.tabs.query({windowId: myWindowId, active: true})
		.then (
		  function (a_tabs) {
			if (beforeFF57)
			  browser.tabs.create({url: href});
			else
			  browser.tabs.create({url: href, openerTabId: a_tabs[0].id});
		  }
		);
	  }
	}
	if ((twistie = target.previousElementSibling).className.startsWith("twistiea")) {
	  handleFolderClick(twistie);
	}
  }
  // If active twistie (folder with children), also go for folder action
  else if (className.startsWith("twistiea")) { // "twistieao" or "twistieac"
	handleFolderClick(target);
  }

  // Highlight bookmark
  let cell;
  if (className.includes("brow")) {
	cell = target;
  }
  else {
	cell = target.parentElement;
  }
  setCellHighlight(cell);
  e.stopPropagation(); // Prevent handlers up the DOM chain on same event
}

/*
 * Receive event from aux clicks on results table - When on bookmark item, this opens the bookmark in a new tab
 *
 * e is of type MouseEvent (click)
 */
function resultsAuxHandler (e) {
  let target = e.target; // Type depends ..
  let cell;
  let className = target.className;
//  trace("Result aux event: "+e.type+" button: "+e.button+" shift: "+e.shiftKey+" phase: "+e.eventPhase+" target: "+target+" class: "+className);
  // Be careful, button 2 (contextmenu) also ends up here :-(
  if ((e.button == 1)
	  && (className != undefined)
	  && (className.length > 0)) {
	// The click target is one of .brow cell,
	// .bkmkitem_x div or anchor, .favicon img or .favttext span
	// Handle click, and go to the parent row
	if (className.includes("fav")) { // <div>, <img> or <span>
	  target = target.parentElement;
	  className = target.className;
	}
	else if (className.includes("brow")) {
	  if (target.parentElement.dataset.type == "bookmark") {
		target = target.firstElementChild;
		className = target.className;
	  }
	}
	if (className == "bkmkitem_b") { // An HTMLAnchorElement
	  e.preventDefault(); // We prevent default behavior and handle ourselves ..
	  let href = target.href;
	  if ((href != undefined) && (href.length > 0)) {
		// Get current active tab as opener id to come back to it when closing the new tab
		browser.tabs.query({windowId: myWindowId, active: true})
		.then (
		  function (a_tabs) {
			if (beforeFF57)
			  browser.tabs.create({url: href});
			else
			  browser.tabs.create({url: href, openerTabId: a_tabs[0].id});
		  }
		);
	  }

	  target = (cell = target.parentElement).parentElement;
	}
	else if (className == "bkmkitem_f") {
	  target = (cell = target.parentElement).parentElement;
	}
	else { // Presumably the .brow cell
	  target = (cell = target).parentElement;
	}

	// Make the source object visible .. and scroll to it
//	handleResultClick(target);

	// If close search option is set, close search pane now
	if (closeSearch_option) {
	  clearSearchTextHandler();
	}
	else {
	  // Highlight result item
	  cell.focus();
	}
  }
  e.stopPropagation(); // Prevent handlers up the DOM chain on same event
}

/*
 * Receive event from aux clicks on bookmarks table - When on bookmark item, this opens the bookmark in a new tab
 *
 * e is of type MouseEvent (click)
 */
function bkmkAuxHandler (e) {
  let target = e.target; // Type depends ..
  let className = target.className;
//console.log("Bookmark aux event: "+e.type+" button: "+e.button+" shift: "+e.shiftKey+" phase: "+e.eventPhase+" target: "+target+" class: "+className);

  // Be careful, button 2 (contextmenu) also ends up here :-(
  if (e.button == 1) {
	// The click target is one of .brow cell, .twistiexx img (if folder),
	// .bkmkitem_x div or anchor, .favseparator div, .favicon or .favttext
	// Act only if the user clicked on .twistieax img, .bkmkitem_x, .favicon or .favtext
	// If favicon or favtext, get parent instead to handle click
	if (className.includes("fav")) {
	  target = target.parentElement;
	  className = target.className;
	}
	else if ((className.includes("brow"))
			 && (target.parentElement.dataset.type == "bookmark")
			) {
	  target = target.firstElementChild;
	  className = target.className;
	}
	if (className == "bkmkitem_b") { // An HTMLAnchorElement
	  e.preventDefault(); // We prevent default behavior and handle ourselves ..
	  let href = target.href;
	  if ((href != undefined) && (href.length > 0)) {
		// Get current active tab as opener id to come back to it when closing the new tab
		browser.tabs.query({windowId: myWindowId, active: true})
		.then (
		  function (a_tabs) {
			if (beforeFF57)
			  browser.tabs.create({url: href});
			else
			  browser.tabs.create({url: href, openerTabId: a_tabs[0].id});
		  }
		);
	  }
	}

	// Highlight bookmark item
	let cell;
	if (className.includes("brow")) {
	  cell = target;
	}
	else {
	  cell = target.parentElement;
	}
	setCellHighlight(cell);
	cell.focus();
  }
  e.stopPropagation(); // Prevent handlers up the DOM chain on same event
}

/*
 * Display menu, at a point fully visible in the viewport
 * 
 * menu: an Element
 * posY: integer, initial position Y
 * posX: integer, initial position X
 */
function drawMenu (menu, posY, posX) {
  // Get menu dimensions
  let menuRect = menu.getBoundingClientRect();
  let height = menuRect.height;
  let width = menuRect.width;

  // Calculate proper position for full visibility, default being posY, posX
  let wh = window.innerHeight - 3;
  let ww = window.innerWidth - 3;
  if (posY + height > wh)
	if (posY >= height)   posY -= height;
	else {
	  posY = wh - height;
	  if (posY < 0)   posY = 10; // As high as possible, with an arbitrary small space above
	}
  if (posX + width > ww)
	if (posX >= width)   posX -= width;
	else {
	  posX = ww - width;
	  if (posX < 0)   posX = 10; // As left as possible, with an arbitrary small space before
	}

  // Display the context menu at calculated position
  menu.style.top = posY + "px";
  menu.style.left = posX + "px";
  menu.style.visibility = "visible";
}

/*
 * Clear any menu, if drawn
 * 
 * Returns true if at least one menu was closed
 */
function clearMenu () {
  let menuClosed = false;

  if (myRBkmkMenu_open) {
	menuClosed = true;
    MyRBkmkMenuStyle.visibility = "hidden";
    myRBkmkMenu_open = false;
  }

  if (myRShowBkmkMenu_open) {
	menuClosed = true;
	MyRShowBkmkMenuStyle.visibility = "hidden";
	myRShowBkmkMenu_open = false;
  }

  if (myRFldrMenu_open) {
	menuClosed = true;
    MyRFldrMenuStyle.visibility = "hidden";
    myRFldrMenu_open = false;
  }

  if (myBBkmkMenu_open) {
	menuClosed = true;
    MyBBkmkMenuStyle.visibility = "hidden";
    myBBkmkMenu_open = false;
  }

  if (myBResBkmkMenu_open) {
	menuClosed = true;
    MyBResBkmkMenuStyle.visibility = "hidden";
    myBResBkmkMenu_open = false;
  }

  if (myBFldrMenu_open) {
	menuClosed = true;
    MyBFldrMenuStyle.visibility = "hidden";
    myBFldrMenu_open = false;
  }

  if (myBResFldrMenu_open) {
	menuClosed = true;
    MyBResFldrMenuStyle.visibility = "hidden";
    myBResFldrMenu_open = false;
  }

  if (myBSepMenu_open) {
	menuClosed = true;
    MyBSepMenuStyle.visibility = "hidden";
    myBSepMenu_open = false;
  }

  if (myBProtMenu_open) {
	menuClosed = true;
    MyBProtMenuStyle.visibility = "hidden";
    myBProtMenu_open = false;
  }

  if (myBProtFMenu_open) {
	menuClosed = true;
    MyBProtFMenuStyle.visibility = "hidden";
    myBProtFMenu_open = false;
  }

  if (myMGlassMenu_open) {
	menuClosed = true;
	MyMGlassMenuStyle.visibility = "hidden";
    myMGlassMenu_open = false;
  }

  myMenu_open = false;
  return(menuClosed);
}

/*
 * Receive event from right clicks on results table, and display context menu
 * 
 * e is of type MouseEvent (contextmenu)
 */
function resultsContextHandler (e) {
  let target = e.target; // Type depends ..
//console.log("Result context event: "+e.type+" target: "+target+" class: "+target.classList);

  // If there is a previous menu, clear it
  clearMenu();

  let isShowMenu = !advancedClick_option; // If not advanced, always "Show bookmark" by default
  if ((target.className != undefined)
	  && (target.className.length > 0)) {
	// Go up to the row level, and store the rowIndex and type in the menu as data- attribute
	let className = target.className;
	let row;
	let cell;
	if(className.includes("fav")) {
	  row = (cell = target.parentElement.parentElement).parentElement;
	}
	else if (className.startsWith("bkmkitem_") || (className == "twistieac")) {
	  row = (cell = target.parentElement).parentElement;
	}
	else { // .brow
	  row = (cell = target).parentElement;
	  if (advancedClick_option)
	  isShowMenu = true;
	}

	// Make the source object visible .. and scroll to it
//    handleResultClick(row);
	// Highlight the result item
	cell.focus();

	// Determine proper menu from type, signal it is open,
	// and store the rowIndex in it as data-index attribute
	let type = row.dataset.type;
	let rowIndex = row.rowIndex;
	let menu;
//trace("Row: "+row+" rowIndex: "+rowIndex+" type: "+type);
	if (beforeFF64) { // Use our built-in menus
	  if (type == "bookmark") {
		if (isShowMenu) {
		  myMenu_open = myRShowBkmkMenu_open = true;
		  menu = MyRShowBkmkMenu;
		}
		else {
		  myMenu_open = myRBkmkMenu_open = true;
		  menu = MyRBkmkMenu;
		}
	  }
	  else { // Menu for "folder"
		myMenu_open = myRFldrMenu_open = true;
		menu = MyRFldrMenu;

		// Disable "Go parent folder" if this is one of the top level folders (i.e. parent is root, not visible)
		let BN_id = row.dataset.id;
		if ((BN_id == PersonalToobar) || (BN_id == BookmarksMenu) || (BN_id == OtherBookmarks) || (BN_id == MobileBookmarks)) {
		  if (MyRFldrMenuGoParent.className == "menugoparent")
			MyRFldrMenuGoParent.className = "menudisabled";
		}
		else {
		  if (MyRFldrMenuGoParent.className == "menudisabled")
			MyRFldrMenuGoParent.className = "menugoparent";
		}
	  }

	  menu.dataset.index = rowIndex;

	  // Display the context menu function of click position
	  e.preventDefault();
	  drawMenu(menu, e.clientY, e.clientX);
	}
	else { // Use integrated FF context menu function -> the background task will build its contents
	  let goparentEnabled = true;
	  let BN_id = row.dataset.id;
	  if (type == "bookmark") {
		if (isShowMenu) {
		  menu = Menu_rshowbkmk;
		}
		else {
		  menu = Menu_rbkmk;
		}
	  }
	  else { // Menu for "folder"
		menu = Menu_rfldr;

		// Disable "Go parent folder" if this is one of the top level folders (i.e. parent is root, not visible)
		if ((BN_id == PersonalToobar) || (BN_id == BookmarksMenu) || (BN_id == OtherBookmarks) || (BN_id == MobileBookmarks)) {
		  goparentEnabled = false;
		}
	  }

	  updateBSP2ContextMenu(menu, false, goparentEnabled);
	  myMenu_open = true; // Remember that this instance opened the menu when processing the onClicked event
	  browser.menus.overrideContext({
		context: "bookmark",
		bookmarkId: BN_id
	  });
	}
  }
  e.stopPropagation(); // Prevent handlers up the DOM chain on same event
}

/*
 * Receive event from right clicks on bookmarks table, and display context menu
 * 
 * e is of type MouseEvent (contextmenu)
 */
let noPasteMinRowIndex = -1;
let noPasteMaxRowIndex = -1;
function bkmkContextHandler (e) {
  let target = e.target; // Type depends ..
//console.log("Bookmark context event: "+e.type+" target: "+target+" class: "+target.classList);

  // Go up to the row level
  let className = target.className;
  let row;
  if(className.includes("fav")) {
	row = target.parentElement.parentElement.parentElement;
  }
  else if (className.startsWith("bkmkitem_") || className.startsWith("twistie")) {
	row = target.parentElement.parentElement;
  }
  else { // .brow
	row = target.parentElement;
  }

  // Highlight bookmark item
  let cell = row.firstElementChild;
  setCellHighlight(cell);
  cell.focus();

  // If there is a previous menu, clear it
  clearMenu();

  // Determine proper menu from type, signal it is open,
  // and store the rowIndex in it as data-index attribute
  // If the clipboard is not empty, show "Paste"
  let type = row.dataset.type;
  let rowIndex = row.rowIndex;
  let menu;
//trace("Row: "+row+" rowIndex: "+rowIndex+" type: "+type);
  if (beforeFF64) { // Use our built-in menus
	if (type == "bookmark") {
	  if (row.dataset.protect == "true") { // Protected row
		menu = MyBProtMenu;
		myMenu_open = myBProtMenu_open = true;
	  }
	  else { // Non protected row
		// Check if we are on an highlighted result row which is hidden
		if (!openTree_option && row.firstElementChild.classList.contains(Reshidden)) {
		  menu = MyBResBkmkMenu;
		  if ((bkmkClipboard != undefined)
			  && ((rowIndex <= noPasteMinRowIndex) || (rowIndex > noPasteMaxRowIndex))) {
			if (MyBResBkmkMenuPaste.className == "menudisabled")
			  MyBResBkmkMenuPaste.className = "menupaste";
		  }
		  else {
			if (MyBResBkmkMenuPaste.className == "menupaste")
			  MyBResBkmkMenuPaste.className = "menudisabled";
		  }
		  if (disableFavicons_option) {
			MyBResBkmkMenuFavicon.className = "menudisabled";
		  }
		  else {
			MyBResBkmkMenuFavicon.className = "menurefreshfav";
		  }
		  myMenu_open = myBResBkmkMenu_open = true;
		}
		else {
		  menu = MyBBkmkMenu;
		  if ((bkmkClipboard != undefined)
			  && ((rowIndex <= noPasteMinRowIndex) || (rowIndex > noPasteMaxRowIndex))) {
			if (MyBBkmkMenuPaste.className == "menudisabled")
			  MyBBkmkMenuPaste.className = "menupaste";
		  }
		  else {
			if (MyBBkmkMenuPaste.className == "menupaste")
			  MyBBkmkMenuPaste.className = "menudisabled";
		  }
		  if (disableFavicons_option) {
			MyBBkmkMenuFavicon.className = "menudisabled";
		  }
		  else {
			MyBBkmkMenuFavicon.className = "menurefreshfav";
		  }
		  myMenu_open = myBBkmkMenu_open = true;
		}
	  }
	}
	else if (type == "folder") {
	  if (row.dataset.protect == "true") { // Protected row
		menu = MyBProtFMenu;
		if ((bkmkClipboard != undefined)
			&& ((rowIndex < noPasteMinRowIndex) || (rowIndex > noPasteMaxRowIndex))) {
		  if (MyBProtFMenuPasteInto.className == "menudisabled")
			MyBProtFMenuPasteInto.className = "menupasteinto";
		}
		else {
		  if (MyBProtFMenuPasteInto.className == "menupasteinto")
			MyBProtFMenuPasteInto.className = "menudisabled";
		}
		myMenu_open = myBProtFMenu_open = true;
	  }
	  else { // Non protected row
		// Check if we are on an highlighted result row which is hidden
		if (!openTree_option && row.firstElementChild.classList.contains(Reshidden)) {
		  menu = MyBResFldrMenu;
		  if ((bkmkClipboard != undefined)
			  && ((rowIndex < noPasteMinRowIndex) || (rowIndex > noPasteMaxRowIndex))) {
			if (MyBResFldrMenuPaste.className == "menudisabled")
			  MyBResFldrMenuPaste.className = "menupaste";
			if (MyBResFldrMenuPasteInto.className == "menudisabled")
			  MyBResFldrMenuPasteInto.className = "menupasteinto";
		  }
		  else {
			if (MyBResFldrMenuPaste.className == "menupaste")
			  MyBResFldrMenuPaste.className = "menudisabled";
			if (MyBResFldrMenuPasteInto.className == "menupasteinto")
			  MyBResFldrMenuPasteInto.className = "menudisabled";
		  }
		  myMenu_open = myBResFldrMenu_open = true;
		}
		else {
		  menu = MyBFldrMenu;
		  if ((bkmkClipboard != undefined)
			  && ((rowIndex < noPasteMinRowIndex) || (rowIndex > noPasteMaxRowIndex))) {
			if (MyBFldrMenuPaste.className == "menudisabled")
			  MyBFldrMenuPaste.className = "menupaste";
			if (MyBFldrMenuPasteInto.className == "menudisabled")
			  MyBFldrMenuPasteInto.className = "menupasteinto";
		  }
		  else {
			if (MyBFldrMenuPaste.className == "menupaste")
			  MyBFldrMenuPaste.className = "menudisabled";
			if (MyBFldrMenuPasteInto.className == "menupasteinto")
			  MyBFldrMenuPasteInto.className = "menudisabled";
		  }
		  myMenu_open = myBFldrMenu_open = true;
		}
	  }
	}
	else if (type == "separator") {
	  if (row.dataset.protect != "true") { // Non protected row
		menu = MyBSepMenu;
		if ((bkmkClipboard != undefined)
			&& ((rowIndex < noPasteMinRowIndex) || (rowIndex > noPasteMaxRowIndex))) {
		  if (MyBSepMenuPaste.className == "menudisabled")
			MyBSepMenuPaste.className = "menupaste";
		}
		else {
		  if (MyBSepMenuPaste.className == "menupaste")
			MyBSepMenuPaste.className = "menudisabled";
		}
		myMenu_open = myBSepMenu_open = true;
	  }
	}

	if (menu != undefined) {
	  menu.dataset.index = rowIndex;

	  // Display the context menu function of click position
	  drawMenu(menu, e.clientY, e.clientX);
	}
	e.preventDefault();
  }
  else { // Use integrated FF context menu function -> the background task will build its contents
	let pasteEnabled = false;
	if (type == "bookmark") {
	  if (row.dataset.protect == "true") { // Protected row
		menu = Menu_bprot;
	  }
	  else { // Non protected row
		// Check if we are on an highlighted result row which is hidden
		if (!openTree_option && row.firstElementChild.classList.contains(Reshidden)) {
		  menu = Menu_bresbkmk;
		  if ((bkmkClipboard != undefined)
			  && ((rowIndex <= noPasteMinRowIndex) || (rowIndex > noPasteMaxRowIndex))) {
			pasteEnabled = true;
		  }
		  if (disableFavicons_option) {
			MyBResBkmkMenuFavicon.className = "menudisabled";
		  }
		}
		else {
		  menu = Menu_bbkmk;
		  if ((bkmkClipboard != undefined)
			  && ((rowIndex <= noPasteMinRowIndex) || (rowIndex > noPasteMaxRowIndex))) {
			pasteEnabled = true;
		  }
		  if (disableFavicons_option) {
			MyBBkmkMenuFavicon.className = "menudisabled";
		  }
		}
	  }
	}
	else if (type == "folder") {
	  if (row.dataset.protect == "true") { // Protected row
		menu = Menu_bprotf;
		if ((bkmkClipboard != undefined)
			&& ((rowIndex < noPasteMinRowIndex) || (rowIndex > noPasteMaxRowIndex))) {
		  pasteEnabled = true;
		}
	  }
	  else { // Non protected row
		// Check if we are on an highlighted result row which is hidden
		if (!openTree_option && row.firstElementChild.classList.contains(Reshidden)) {
		  menu = Menu_bresfldr;
		  if ((bkmkClipboard != undefined)
			  && ((rowIndex < noPasteMinRowIndex) || (rowIndex > noPasteMaxRowIndex))) {
			pasteEnabled = true;
		  }
		}
		else {
		  menu = Menu_bfldr;
		  if ((bkmkClipboard != undefined)
			  && ((rowIndex < noPasteMinRowIndex) || (rowIndex > noPasteMaxRowIndex))) {
			pasteEnabled = true;
		  }
		}
	  }
	}
	else if (type == "separator") {
	  if (row.dataset.protect == "true") { // Protected row
		e.preventDefault(); // No menu on protected separators
//		menu = Menu_bprots;
	  }
	  else { // Non protected row
		menu = Menu_bsep;
		if ((bkmkClipboard != undefined)
			&& ((rowIndex < noPasteMinRowIndex) || (rowIndex > noPasteMaxRowIndex))) {
		  pasteEnabled = true;
		}
	  }
	}

	if (menu != undefined) {
	  updateBSP2ContextMenu(menu, pasteEnabled);
	  myMenu_open = true; // Remember that this instance opened the menu when processing the onClicked event
	  browser.menus.overrideContext({
		context: "bookmark",
		bookmarkId: row.dataset.id
	  });
	}
  }
  e.stopPropagation(); // Prevent handlers up the DOM chain on same event
}

/*
 * Receive event from scrolls on bookmarks table
 *
 * e is of type MouseEvent (click)
 */
let isBkmkItemDragged = false;
let isBkmkScrollInhibited = false;
let isBkmkScrollReactivated = false;
let isBkmkDragActive = false;
let refBkmkScrollLeft = -1;
let refBkmkScrollTop = -1;
let refBkmkClientX = -1;
let refBkmkClientY = -1;
let curBkmkScreenX;
let curBkmkScreenY;
let curBkmkClientX;
let curBkmkClientY;
let bkmkDragTimerID;
/*
 * Enable scrolling 
 */
function enableBkmkScroll () {
  Bookmarks.classList.replace(BScrollKo, BScrollOk);
  refBkmkClientX = refBkmkClientY = -1;
  isBkmkScrollInhibited = false;
}

function bkmkScrollHandler (e) {
//let target = e.target; // Type depends ..
//let className = target.className;
//console.log("Bookmark scroll event: "+e.type+" layerX: "+e.layerX+" layerY: "+e.layerY+" pageX: "+e.pageX+" pageY: "+e.pageY+" target: "+target+" class: "+className);
  // If not dragging a bookmark item, and scroll was not reactivated
  // then disable scroll
  if (isBkmkDragActive && !isBkmkItemDragged && !isBkmkScrollReactivated && !isBkmkScrollInhibited) {
	Bookmarks.classList.replace(BScrollOk, BScrollKo);
	isBkmkScrollInhibited = true;
	// Reset position to reference
	Bookmarks.scrollLeft = refBkmkScrollLeft;
	Bookmarks.scrollTop = refBkmkScrollTop;
	// Update reference point
	refBkmkClientX = curBkmkClientX;
	refBkmkClientY = curBkmkClientY;
  }
}

/*
 * Under Linux, receive event that mouse is getting out of Bookmarks by using
 * a trick of adding a top border of 1px to Bookmarks, above the scrolling part.
 * Else, since dragover is not repeated when the mouse is still, there was a case
 * where no dragleave or dragexit event was received when the mouse was going out
 * by the top, and so no way to know that to re-enable scrolling !
 * Note: mousexxx and pointerxxx events are not reaching the object when there is
 * a drag on it (I guess the drag implementation does a pointrId capture ...).
 * 
 * The specific case was when the mouse was entering slowly and pointing exactly at
 * top of Bookmarks <div>, trigerring a dragenter and a dragover, then a scroll (so disable),
 * but no more dragover, and when going out by 1px above Bookmarks, no dragleave or
 * dragexit is sent !!
 * The 1px border-top workaround does the trick, as it creates an area where there is
 * no scroll bar which is getting those events. 
 */
let bkmkDragoverSimulTimerID;
function bkmkMouseEnterHandler (e) {
//console.log("mouseenter!");
}

function bkmkMouseLeaveHandler (e) {
//console.log("mouseleave!");
  if (bkmkDragoverSimulTimerID != undefined) {
	clearTimeout(bkmkDragoverSimulTimerID);
	bkmkDragoverSimulTimerID = undefined;
  }
}

/*
 * Under Linux, simulate a dragover event as workaround for them not firing continuously
 */
let curBkmkTarget, curBkmkDt;
function simulBkmkDragover () {
//console.log("fire!");
  bkmkDragoverSimulTimerID = undefined;
  let event = new DragEvent ("dragover",
    {screenX: curBkmkScreenX,
	 screenY: curBkmkScreenY,
	 clientX: curBkmkClientX,
	 clientY: curBkmkClientY,
	 dataTransfer: curBkmkDt,
	 view: window,
     bubbles: true,
     cancelable: true
    }
  );
  curBkmkTarget.dispatchEvent(event); // Fire it on last dragover target
}

/*
 * Function to re-enable scrolling on timeout after last drag event
 */
function bkmkDragTimeout () {
//console.log("timeout!");
  isBkmkDragActive = false;
  refBkmkScrollLeft = refBkmkScrollTop = -1;
  bkmkDragTimerID = undefined;
  if (isBkmkScrollReactivated) {
	isBkmkScrollReactivated = false;
  }
  else {
	enableBkmkScroll();
  }
}

/*
 * Handle drag scrolling inhibition on Bookmarks table 
 */
function handleBkmkDragScroll (eventId, e) {
  curBkmkScreenX = e.screenX;
  curBkmkScreenY = e.screenY;
  curBkmkClientX = e.clientX;
  curBkmkClientY = e.clientY;
//console.log("event: "+eventId+" clientX: "+curBkmkClientX+" clientY: "+curBkmkClientY);
  // If starting a drag, remember current scroll position as reference
  if (!isBkmkDragActive) {
	// Remember current scroll position as reference
	refBkmkScrollLeft = Bookmarks.scrollLeft;
	refBkmkScrollTop = Bookmarks.scrollTop;
	// Remember reference point
	refBkmkClientX = curBkmkClientX;
	refBkmkClientY = curBkmkClientY;
	isBkmkDragActive = true;
  }
  if (bkmkDragTimerID != undefined) {
	clearTimeout(bkmkDragTimerID);
  }
  // Set a timer to detect when out of the Sidebar and re-enable scrolling when there is no more drag event
  bkmkDragTimerID = setTimeout(bkmkDragTimeout, TimeoutReEnableScroll);
  // Take care of simulated dragover under Linux
  if (bkmkDragoverSimulTimerID != undefined) {
	clearTimeout(bkmkDragoverSimulTimerID);
	bkmkDragoverSimulTimerID = undefined;
  }
  if (isLinux && (eventId == OverEvent)) { // Under Linux, fire regular dragover events as workaround,
										   // until mouseout or next drag event 
	bkmkDragoverSimulTimerID = setTimeout(simulBkmkDragover, TimeoutSimulDragover);
  }
  // If scroll was inhibited and we are far enough from the reference point, re-enable it.
  if ((Math.abs(curBkmkClientX - refBkmkClientX) > HystReEnableScroll)
	  || (Math.abs(curBkmkClientY - refBkmkClientY) > HystReEnableScroll)) {
	isBkmkScrollReactivated = true;
	if (isBkmkScrollInhibited) {
	  enableBkmkScroll();
	}
  }
}

/*
 * We received a drop event, reset everything 
 */
function resetBkmkDragScroll () {
  isBkmkDragActive = false;
  refBkmkScrollLeft = refBkmkScrollTop = -1;
  if (bkmkDragTimerID != undefined) {
	clearTimeout(bkmkDragTimerID);
	bkmkDragTimerID = undefined; // Do not restart a timer
  }
  if (bkmkDragoverSimulTimerID != undefined) {
	clearTimeout(bkmkDragoverSimulTimerID);
	bkmkDragoverSimulTimerID = undefined;
  }
  if (isBkmkScrollInhibited) {
	enableBkmkScroll();
  }
  isBkmkScrollReactivated = false;
}

/*
 * Receive event from scrolls on results table
 *
 * e is of type MouseEvent (click)
 */
let isRsltItemDragged = false;
let isRsltScrollInhibited = false;
let isRsltDragActive = false;
let refRsltScrollLeft = -1;
let refRsltScrollTop = -1;
let curRsltScreenX;
let curRsltScreenY;
let curRsltClientX;
let curRsltClientY;
let rsltDragTimerID;
/*
 * Enable results scrolling 
 */
function enableRsltScroll () {
  SearchResult.classList.replace(RScrollKo, RScrollOk);
  isRsltScrollInhibited = false;
}

/*
 * Disable results scrolling 
 */
function disableRsltScroll () {
  SearchResult.classList.replace(RScrollOk, RScrollKo);
  isRsltScrollInhibited = true;
}

function rsltScrollHandler (e) {
//let target = e.target; // Type depends ..
//let className = target.className;
//console.log("Results scroll event: "+e.type+" layerX: "+e.layerX+" layerY: "+e.layerY+" pageX: "+e.pageX+" pageY: "+e.pageY+" target: "+target+" class: "+className);
  // If not dragging a result item, and scroll was not reactivated
  // then disable scroll
  if (isRsltDragActive && !isRsltScrollInhibited) {
	disableRsltScroll();
	// Reset position to reference
	SearchResult.scrollLeft = refRsltScrollLeft;
	SearchResult.scrollTop = refRsltScrollTop;
  }
}

/*
 * Same trick as for Bookmarks ..
 */
let rsltDragoverSimulTimerID;
function rsltMouseEnterHandler (e) {
//console.log("rslt mouseenter!");
}

function rsltMouseLeaveHandler (e) {
//console.log("rslt mouseleave!");
  if (rsltDragoverSimulTimerID != undefined) {
	clearTimeout(rsltDragoverSimulTimerID);
	rsltDragoverSimulTimerID = undefined;
  }
}

/*
 * Under Linux, simulate a dragover event as workaround for them not firing continuously
 */
let curRsltTarget, curRsltDt;
function simulRsltDragover () {
//console.log("rslt fire!");
  rsltDragoverSimulTimerID = undefined;
  let event = new DragEvent ("dragover",
    {screenX: curRsltScreenX,
	 screenY: curRsltScreenY,
	 clientX: curRsltClientX,
	 clientY: curRsltClientY,
	 dataTransfer: curRsltDt,
	 view: window,
     bubbles: true,
     cancelable: true
    }
  );
  curRsltTarget.dispatchEvent(event); // Fire it on last dragover target
}

/*
 * Function to re-enable scrolling on timeout after last drag event
 */
function rsltDragTimeout () {
//console.log("rslt timeout!");
  if (!isRsltItemDragged) {
	isRsltDragActive = false;
	refRsltScrollLeft = refRsltScrollTop = -1;
	rsltDragTimerID = undefined;
	enableRsltScroll();
  }
}

/*
 * Handle drag scrolling inhibition on Bookmarks table 
 */
function handleRsltDragScroll (eventId, e) {
  curRsltScreenX = e.screenX;
  curRsltScreenY = e.screenY;
  curRsltClientX = e.clientX;
  curRsltClientY = e.clientY;
//console.log("rslt event: "+eventId+" clientX: "+curRsltClientX+" clientY: "+curRsltClientY);
  // If starting a drag, remember current scroll position as reference
  if (!isRsltDragActive) {
	// Remember current scroll position as reference
	refRsltScrollLeft = SearchResult.scrollLeft;
	refRsltScrollTop = SearchResult.scrollTop;
	isRsltDragActive = true;
  }
  // Set a timer to detect when out of the Sidebar and re-enable scrolling when there is no more drag event
  if (rsltDragTimerID != undefined) {
	clearTimeout(rsltDragTimerID);
  }
  rsltDragTimerID = setTimeout(rsltDragTimeout, TimeoutReEnableScroll);
  // Take care of simulated dragover under Linux
  if (rsltDragoverSimulTimerID != undefined) {
	clearTimeout(rsltDragoverSimulTimerID);
	rsltDragoverSimulTimerID = undefined;
  }
  if (isLinux && (eventId == OverEvent)) { // Under Linux, fire regular dragover events as workaround,
										   // until mouseout or next drag event 
	rsltDragoverSimulTimerID = setTimeout(simulRsltDragover, TimeoutSimulDragover);
  }
}

/*
 * Setup drag operation and contents
 */
function setDragTransfer (BN_id, rowDragged, dt) {
  // Get dragged BN
  let BNDragged = curBNList[BN_id];

  // Set the event dataTransfer
  // For a bookmark:	application/x-bookmark and text/x-moz-place,text/x-moz-url,text/plain,text/html
  // For a folder:		application/x-bookmark and text/x-moz-place-container,text/x-moz-url,text/plain,text/html
  // For a separator:	application/x-bookmark and text/x-moz-place-separator,text/plain,text/html

  // Data for BSP2 bookmark object
  dt.setData("application/x-bookmark", BN_id);

  // application/x-bookmark is for BSP2 internal drag & drops.
  // Rest is:
  // text/x-moz-place<-xxx>:
  // Native Bookmark data like  {"title":"Nouveau dossier","id":2238,"itemGuid":"VQ8ulNGyfXk0","instanceId":"jvwImUhXA2rV","parent":2099,"parentGuid":"CLSASmpIpBmQ",
  // 							 "dateAdded":1536393478662000,"lastModified":1536393478662000,"type":"text/x-moz-place-container"}
  //							{"title":"_  New bookmark","id":2350,"itemGuid":"JE2j0D-5tnpT","instanceId":"jvwImUhXA2rV","parent":2028,"parentGuid":"XmOZ-HAGbfEM",
  //							 "dateAdded":1550944109935000,"lastModified":1551218607521000,"type":"text/x-moz-place","uri":"about:blank"}
  //							{"title":"","id":2239,"itemGuid":"gORenOTsYJdk","instanceId":"jvwImUhXA2rV","parent":2028,"parentGuid":"XmOZ-HAGbfEM",
  //							 "dateAdded":1536396421579000,"lastModified":1551022707690000,"type":"text/x-moz-place-separator"}
  // text/plain:
  // Native Bookmark data like  New folder3\nabout:blank\n--------------------\nabout:blank
  //							about:blank
  //							--------------------
  // text/html:
  // Native Bookmark data like  <DL><DT>New folder3</DT><DD><A HREF="about:blank">New bookmark5</A></DD><DD><HR></DD><DD><A HREF="about:blank">New bookmark4</A></DD></DL>
  //							<A HREF="about:blank">_  New bookmark</A>
  //							<HR>
  //
  // Note: there is also this one, not used by BSP2 currently:
  // text/x-moz-url:
  // Native Bookmark data like  about:blank\nNew bookmark5\nabout:blank\nNew bookmark4
  //							about:blank\n_  New bookmark
  let type = BNDragged.type;
  let isFolder = (type == "folder");
  let json;
  if (isFolder) {
	json = JSON.stringify(
	  {title: BNDragged.title,
	   itemGuid: BN_id,
	   parentGuid: BNDragged.parentId,
	   dateAdded: BNDragged.dateAdded,
	   lastModified: BNDragged.lastModified,
	   type: "text/x-moz-place-container"
	  }
	);
  }
  else if (type == "separator") {
	json = JSON.stringify(
	  {title: "",
	   itemGuid: BN_id,
	   parentGuid: BNDragged.parentId,
	   dateAdded: BNDragged.dateAdded,
	   lastModified: BNDragged.lastModified,
	   type: "text/x-moz-place-separator"
	  }
	);
  }
  else { // Bookmark
	json = JSON.stringify(
	  {title: BNDragged.title,
	   itemGuid: BN_id,
	   parentGuid: BNDragged.parentId,
	   dateAdded: BNDragged.dateAdded,
	   lastModified: BNDragged.lastModified,
	   type: "text/x-moz-place",
	   uri: BNDragged.url
	  }
	);
  }
  dt.setData("text/x-moz-place", json);
//  let xmozurl;
  let plain = BN_toPlain(BNDragged);
  dt.setData("text/plain", plain);
  let html = BN_toHTML(BNDragged);
  dt.setData("text/html", html);
  dt.effectAllowed = "move";

  // Set drop forbidden zone
  let rowIndex = rowDragged.rowIndex;
  if (isFolder) {
	noDropMinRowIndex = rowIndex;
	// Find last child / grand child of BN (itself if no child)
	let lastBN = BN_lastDescendant(BNDragged);
	let row = curRowList[lastBN.id];
	noDropMaxRowIndex = row.rowIndex; // Can be at end of bookmarks table
  }
  else {
	noDropMinRowIndex = noDropMaxRowIndex = rowIndex;
  }
}

/*
 * Drag start event handler, on the bookmarks table
 * 
 * e = DragEvent
 * 
 * Sets global variables rowDragged (HTMLRowElmeent) and BNDragged (BookmarkNode),
 * as well as the index min/max range indicating the no drop zone.
 */
let noDropMinRowIndex = -1;
let noDropMaxRowIndex = -1;
function bkmkDragStartHandler (e) {
  let rowDragged = e.target; // Should always be a [object HTMLTableRowElement] by construction
//console.log("Drag start event: "+e.type+" target: "+rowDragged+" class: "+rowDragged.classList);
//console.log("Draggable: "+rowDragged.draggable+" Protected: "+rowDragged.dataset.protect);
  let BN_id = rowDragged.dataset.id;
//console.log("BN_id: "+BN_id);
  if (rowDragged.dataset.protect != "true") {
	isBkmkItemDragged = true; // Signal we are dragging an internal item to prevent scrolling
	let dt = e.dataTransfer;
	setDragTransfer(BN_id, rowDragged, dt);
  }
}

/*
 * Drag end event handler. This is on the element which was in Drag start = HTMLTableRowElement
 * 
 * e = DragEvent
 */
function bkmkDragEndHandler (e) {
  // Signal we stopped dragging an internal item
  isBkmkItemDragged = false;
  isBkmkDragActive = false;
  refBkmkScrollLeft = refBkmkScrollTop = -1;

//  let target = e.target;
//console.log("Drag end event: "+e.type+" target: "+target+" class: "+target.classList);
  noDropMinRowIndex = noDropMaxRowIndex = -1;
}

/*
 * Drag start event handler, on the search result table
 * 
 * e = DragEvent
 * 
 * Sets global variables rowDragged (HTMLRowElmeent) and BNDragged (BookmarkNode),
 * as well as the index min/max range indicating the no drop zone.
 */
function resultsDragStartHandler (e) {
  // Inhibit result pane scrolling
  disableRsltScroll();
  isRsltItemDragged = true; // Signal we are dragging an internal item

  let rowDragged = e.target; // Should always be a [object HTMLTableRowElement] by construction
//console.log("Drag start event: "+e.type+" target: "+rowDragged+" class: "+rowDragged.classList);
//console.log("Draggable: "+rowDragged.draggable+" Protected: "+rowDragged.dataset.protect);

  // Go to the original row, this will be the one really dragged
  let BN_id = rowDragged.dataset.id;
//console.log("BN_id: "+BN_id);
  rowDragged = curRowList[BN_id];
  if (rowDragged.dataset.protect != "true") {
	let dt = e.dataTransfer;
	setDragTransfer(BN_id, rowDragged, dt);
  }
}

/*
 * Drag end event handler. This is on the element which was in Drag start = HTMLTableRowElement
 * 
 * e = DragEvent
 */
function resultsDragEndHandler (e) {
  // Enable result pane scrolling again
  enableRsltScroll();
  isRsltItemDragged = false; // Signal we stopped dragging an internal item
  // If any bookmark was dragged to the bookmark pane, this is finished
  isBkmkDragActive = false;
  refBkmkScrollLeft = refBkmkScrollTop = -1;

//let target = e.target;
//console.log("Drag end event: "+e.type+" target: "+target+" class: "+target.classList);
  noDropMinRowIndex = noDropMaxRowIndex = -1;
}

/*
 * Drag enter event handler, on results table
 * 
 * e = DragEvent
 */
function rsltDragEnterHandler (e) {
  let dt = e.dataTransfer;
//let target = e.target;
//console.log("Reslt drag enter event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
  // Handle drag scrolling inhibition
  handleRsltDragScroll(EnterEvent, e);
  dt.dropEffect = "none"; // Signal drop not allowed
}

/*
 * Drag over event handler
 * 
 * e = DragEvent
 */
function rsltDragOverHandler (e) {
  let dt = e.dataTransfer;
  let target = e.target;
  if (isLinux) {
	curRsltTarget = target;
	curRsltDt = dt;
  }
//console.log("Rslt drag over event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
  // Handle drag scrolling inhibition
  handleRsltDragScroll(OverEvent, e);
  dt.dropEffect = "none"; // Signal drop not allowed
}

/*
 * Drag leave event handler
 * 
 * e = DragEvent
 */
function rsltDragLeaveHandler (e) {
  let dt = e.dataTransfer;
//let target = e.target;
//console.log("Rslt drag leave event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
  // Handle drag scrolling inhibition
  handleRsltDragScroll(LeaveEvent, e);
  dt.dropEffect = "none"; // Signal drop not allowed
}

/*
 * Drag exit event handler
 * 
 * e = DragEvent
 */
function rsltDragExitHandler (e) {
  let dt = e.dataTransfer;
//let target = e.target;
//console.log("Rslt drag exit event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
  // Handle drag scrolling inhibition
  handleRsltDragScroll(ExitEvent, e);
  dt.dropEffect = "none"; // Signal drop not allowed
}

/*
 * Check if we support drag and drop of the source element
 * 
 * dt = DataTransfer
 * 
 * Return Boolean = true if supported, else false
 */
function checkDragType (dt) {
  let isSupported = false;

  // When the dragged element is one of our bookmarks its dt.types will be
  //   dt.types        : application/x-bookmark,[text/uri-list,]text/plain
  // When it is a native Bookmark, it will be
  //   dt.types        : text/x-moz-place
  //		with data like: {"title":"Nouveau dossier","id":2238,"itemGuid":"VQ8ulNGyfXk0","instanceId":"jvwImUhXA2rV","parent":2099,"parentGuid":"CLSASmpIpBmQ",
  //                         "dateAdded":1536393478662000,"lastModified":1536393478662000,"type":"text/x-moz-place-container"}
  //						{"title":"_  New bookmark","id":2350,"itemGuid":"JE2j0D-5tnpT","instanceId":"jvwImUhXA2rV","parent":2028,"parentGuid":"XmOZ-HAGbfEM",
  //						 "dateAdded":1550944109935000,"lastModified":1551218607521000,"type":"text/x-moz-place","uri":"about:blank"}
  //						{"title":"","id":2239,"itemGuid":"gORenOTsYJdk","instanceId":"jvwImUhXA2rV","parent":2028,"parentGuid":"XmOZ-HAGbfEM",
  //						 "dateAdded":1536396421579000,"lastModified":1551022707690000,"type":"text/x-moz-place-separator"}
  // When it is a tab, it will be
  //   dt.types        : text/x-moz-text-internal
  // When it is the (i) in the location bar
  //   dt.types        : text/x-moz-url,text/uri-list,text/plain,text/html
  // When it is the URL address in the location bar
  //   dt.types        : text/x-moz-url,text/plain,text/html
  // When it is a link in the HTML page:
  //   dt.types        : text/x-moz-url,text/x-moz-url-data,text/x-moz-url-desc,text/uri-list,text/_moz_htmlcontext,text/_moz_htmlinfo,text/html,text/plain
  // When it ia a selected text in HTML page:
  //   dt.types        : text/_moz_htmlcontext,text/_moz_htmlinfo,text/html,text/plain
  if (dt.types.includes("application/x-bookmark")
	  || dt.types.includes("text/x-moz-place")
	  || dt.types.includes("text/x-moz-text-internal")
	  || dt.types.includes("text/uri-list")
	  || dt.types.includes("text/x-moz-url")
	 ) {
	isSupported = true;
  }

  return(isSupported);
}

/*
 * Fast string compare function without paring to int ..
 */
function isStringA_le_B (a, b) {
  let la = a.length;
  let lb = b.length;
  return(((la < lb) || ((la == lb) && (a <= b))));
}

/*
 * Get row from the current target
 * 
 * target = object under mouse pointer
 * 
 * Return HTMLTableRowElement
 * Also sets the global variables bkmkitem_x to the piece to highlight for insertion
 * and the Booleans isBkmkitem_f, isFolderClosed and isFolderEmpty.
 */
let bkmkitem_x;
let isBkmkitem_f;
let isFolderClosed;
let isFolderEmpty;
let isProtected;
let isTopItem;
function getDragToRow (target) {
  let classList = target.classList;
  let className = target.className;
  let row;
  let nextRow;
  let level;

  if (classList == undefined) { // Apparently drag enter events can be on the text inside Span..
	row = (bkmkitem_x = target.parentElement.parentElement).parentElement.parentElement;
	isProtected = (row.dataset.protect == "true");
	isTopItem = ((level = row.dataset.level) == "0");
	isBkmkitem_f = (row.dataset.type == "folder");
	if (isBkmkitem_f) {
      if (bkmkitem_x.previousElementSibling.classList.contains("twistieac"))
		isFolderClosed = true;
	  else   isFolderClosed = false;
      nextRow = row.nextElementSibling;
      isFolderEmpty = (nextRow == undefined) || isStringA_le_B(nextRow.dataset.level, level);
	}
  }
  else if (className.includes("fav")) {
	row = (bkmkitem_x = target.parentElement).parentElement.parentElement;
	isProtected = (row.dataset.protect == "true");
	isTopItem = ((level = row.dataset.level) == "0");
	isBkmkitem_f = (row.dataset.type == "folder");
	if (isBkmkitem_f) {
	  if (bkmkitem_x.previousElementSibling.classList.contains("twistieac"))
		isFolderClosed = true;
	  else   isFolderClosed = false;
      nextRow = row.nextElementSibling;
      isFolderEmpty = (nextRow == undefined) || isStringA_le_B(nextRow.dataset.level, level);
	}
  }
  else if (classList.contains("bkmkitem_f")) {
	row = (bkmkitem_x = target).parentElement.parentElement;
	isProtected = (row.dataset.protect == "true");
	isTopItem = ((level = row.dataset.level) == "0");
	isBkmkitem_f = true;
    if (bkmkitem_x.previousElementSibling.classList.contains("twistieac"))
	  isFolderClosed = true;
	else   isFolderClosed = false;
    nextRow = row.nextElementSibling;
    isFolderEmpty = (nextRow == undefined) || isStringA_le_B(nextRow.dataset.level, level);
  }
  else if (className.startsWith("bkmkitem_")) {
	row = (bkmkitem_x = target).parentElement.parentElement;
	isProtected = (row.dataset.protect == "true");
	isTopItem = (row.dataset.level == "0");
	isBkmkitem_f = false;
  }
  else if (className.startsWith("twistie")) {
	row = target.parentElement.parentElement;
	isProtected = (row.dataset.protect == "true");
	isTopItem = ((level = row.dataset.level) == "0");
	bkmkitem_x = target.nextElementSibling;
	isBkmkitem_f = true;
    if (classList.contains("twistieac"))
	  isFolderClosed = true;
	else   isFolderClosed = false;
    nextRow = row.nextElementSibling;
    isFolderEmpty = (nextRow == undefined) || isStringA_le_B(nextRow.dataset.level, level);
  }
  else if (className.includes("brow")) {
	row = target.parentElement;
	isProtected = (row.dataset.protect == "true");
	isTopItem = ((level = row.dataset.level) == "0");
	bkmkitem_x = target.firstElementChild;
	if (bkmkitem_x.className.startsWith("twistie")) {
      isBkmkitem_f = true;
      if (bkmkitem_x.classList.contains("twistieac"))
  	    isFolderClosed = true;
  	  else   isFolderClosed = false;
      bkmkitem_x = bkmkitem_x.nextElementSibling;
      nextRow = row.nextElementSibling;
      isFolderEmpty = (nextRow == undefined) || isStringA_le_B(nextRow.dataset.level, level);
	}
	else   isBkmkitem_f = false;
  }

//console.log("className: "+className+" isBkmkitem_f: "+isBkmkitem_f);
  return(row);
}

/*
 * Function to handle a timeout on dragging over a closed folder, to open it 
 */
let openFolderTimerID = null;
function openFolderTimeoutHandler () {
  openFolderTimerID = null;
//console.log("Open folder event");
  // Fire event on bkmkitem_x
  let event = new MouseEvent ("click",
	  						  {view: window,
							   bubbles: true,
							   cancelable: true
	  						  }
  );
  bkmkitem_x.dispatchEvent(event);
}

/*
 * Remove insert point on prevBkmkitem_x
 * 
 * e = DragEvent
 * 
 * Cancels any folder closed timer
 */
let prevBkmkitem_x = null;
let prevInsertPos = undefined;
function highlightRemove (e) {
  if (openFolderTimerID != null) { // Cancel timeout
	clearTimeout(openFolderTimerID);
	openFolderTimerID = null;
  }

  // Reset style
  if (prevBkmkitem_x != null) {
	let style = prevBkmkitem_x.style;
	style.borderTopColor = "";
	style.background = "";
	if (sidebarTextColor != undefined) {
	  style.color = "";
	}
	style.borderBottomColor = "";

	// No more previous values
	prevBkmkitem_x = null;
	prevInsertPos = undefined;
  }
}

/*
 * Highlight the insert point on bkmkitem_x, clearing prevBkmkitem_x if not already done
 * 
 * e = DragEvent
 * 
 * Return -1, 0 or +1 to indicate if before, on or after bkmkitem_x
 * Also activates a timer so that when staying on a closed folder for more than 1s, then
 * we open it.
 */
function highlightInsert (e) {
  let bkmkRect = bkmkitem_x.getBoundingClientRect();
  let style;
//console.log("x: "+bkmkRect.x+" y: "+bkmkRect.y+" left: "+bkmkRect.left+" top: "+bkmkRect.top+" right: "+bkmkRect.right+" bottom: "+bkmkRect.bottom+" width: "+bkmkRect.width+" height: "+bkmkRect.height)
//console.log("clientX: "+e.clientX+" clientY: "+e.clientY+" offsetX: "+e.offsetX+" offsetY: "+e.offsetY+" pageX: "+e.pageX+" pageY: "+e.pageY+" screenX: "+e.screenX+" screenY: "+e.screenY)
  let insertPos;
  let y = e.clientY; 

  if (isBkmkitem_f) { // We can drop both before/after and inside a folder
	if (!isProtected				// Cannot insert before a protected (= top) folder
		&& (y <= bkmkRect.top + bkmkRect.height / 4)) {
	  insertPos = -1;
	  // If changed from previous, update style (avoid to overload for nothing ..)
	  if ((prevBkmkitem_x != bkmkitem_x) || (prevInsertPos != insertPos)) {
		if (prevBkmkitem_x != null) { // Previous highlight was not removed, a leave or exit event is missing ..
		  highlightRemove(undefined);
		}
		style = (prevBkmkitem_x = bkmkitem_x).style;
		prevInsertPos = insertPos;
		style.borderTopColor = "#0065B7";
		style.background = "";
		if (sidebarTextColor != undefined) {
		  style.color = sidebarTextColor;
		}
		style.borderBottomColor = "";
	  }
	  if (openFolderTimerID != null) { // Cancel timeout
		clearTimeout(openFolderTimerID);
		openFolderTimerID = null;
	  }
	}
	else if (!isProtected				// Cannot insert after a protected (= top) folder
			 && (y >= bkmkRect.bottom - bkmkRect.height / 4)
			 && (isFolderClosed || isFolderEmpty) // Do not propose the insert next sibling on an open and non empty folder
			) {
	  insertPos = 1;
	  // If changed from previous, update style (avoid to overload for nothing ..)
	  if ((prevBkmkitem_x != bkmkitem_x) || (prevInsertPos != insertPos)) {
		if (prevBkmkitem_x != null) { // Previous highlight was not removed, a leave or exit event is missing ..
		  highlightRemove(undefined);
		}
		style = (prevBkmkitem_x = bkmkitem_x).style;
		prevInsertPos = insertPos;
		style.borderTopColor = "";
		style.background = "";
		if (sidebarTextColor != undefined) {
		  style.color = sidebarTextColor;
		}
		style.borderBottomColor = "#0065B7";
	  }
	  if (openFolderTimerID != null) { // Cancel timeout
		clearTimeout(openFolderTimerID);
		openFolderTimerID = null;
	  }
	}
	else {				// Inside a folder
	  insertPos = 0;
	  // If changed from previous, update style (avoid to overload for nothing ..)
	  if ((prevBkmkitem_x != bkmkitem_x) || (prevInsertPos != insertPos)) {
		if (prevBkmkitem_x != null) { // Previous highlight was not removed, a leave or exit event is missing ..
		  highlightRemove(undefined);
		}
		style = (prevBkmkitem_x = bkmkitem_x).style;
		prevInsertPos = insertPos;
		style.borderTopColor = "";
		style.background = "#CDE8FF";
		if (sidebarTextColor != undefined) {
		  style.color = HighlightTextColor;
		}
		style.borderBottomColor = "";
	  }
	  if (isFolderClosed){
		if (openFolderTimerID == null) { // Set timeout
		  openFolderTimerID = setTimeout(openFolderTimeoutHandler, OpenFolderTimeout);
		}
	  }
	  else {
		if (openFolderTimerID != null) { // Cancel timeout
		  clearTimeout(openFolderTimerID);
		  openFolderTimerID = null;
		}
	  }
	}
  }		// Not a folder, we can only drop before or after
  else {
	if (y <= bkmkRect.top + bkmkRect.height / 2) {
	  insertPos = -1;
	  // If changed from previous, update style (avoid to overload for nothing ..)
	  if ((prevBkmkitem_x != bkmkitem_x) || (prevInsertPos != insertPos)) {
		if (prevBkmkitem_x != null) { // Previous highlight was not removed, a leave or exit event is missing ..
		  highlightRemove(undefined);
		}
		style = (prevBkmkitem_x = bkmkitem_x).style;
		prevInsertPos = insertPos;
		style.borderTopColor = "#0065B7";
		style.borderBottomColor = "";
	  }
	}
	else {
	  insertPos = 1;
	  // If changed from previous, update style (avoid to overload for nothing ..)
	  if ((prevBkmkitem_x != bkmkitem_x) || (prevInsertPos != insertPos)) {
		if (prevBkmkitem_x != null) { // Previous highlight was not removed, a leave or exit event is missing ..
		  highlightRemove(undefined);
		}
		style = (prevBkmkitem_x = bkmkitem_x).style;
		prevInsertPos = insertPos;
		style.borderTopColor = "";
		style.borderBottomColor = "#0065B7";
	  }
	}
	if (openFolderTimerID != null) { // Cancel timeout
	  clearTimeout(openFolderTimerID);
	  openFolderTimerID = null;
	}
  }
//console.log("insertPos: "+insertPos);
  return(insertPos);
}

/*
 * Drag enter event handler, on bookmark table
 * 
 * e = DragEvent
 */
function bkmkDragEnterHandler (e) {
  let target = e.target;
  let dt = e.dataTransfer;
//console.log("Drag enter event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
  // Handle drag scrolling inhibition
  handleBkmkDragScroll(EnterEvent, e);
  if (checkDragType(dt)
	  && ((target.className == undefined)  // When on Text, className and classList are undefined.
		  || (target.className.length > 0) // For some reason, when the mouse is over the lifts,
		  								   // an HTMLDivElement is returned which is none of what
		  								   // is inside BookmarksTree :-(
	     )
    ) {
	// Get the enclosing row and bkmkitem_x inside it which we will highlight
	let row = getDragToRow(target);
//console.log("Enter row: "+row+" class: "+row.classList+" BN_id: "+row.dataset.id);
//console.log("Bkmkitem_x: "+bkmkitem_x+" class: "+bkmkitem_x.classList);
	if (row == undefined) { // We are on the scrollbars for example
	  dt.dropEffect = "none"; // Signal drop not allowed
	}
	else {
	  let index = row.rowIndex;
	  if ((index >= noDropMinRowIndex) && (index <= noDropMaxRowIndex)
		  || (isProtected && !isTopItem) // Protection, can't drop on non top draggable elements = specials
	     ) {
		dt.dropEffect = "none"; // Signal drop not allowed
	  }
	  else {
		e.preventDefault(); // Allow drop
		highlightInsert(e);
	  }
	}
  }
  else {
	dt.dropEffect = "none"; // Signal drop not allowed
  }
}

/*
 * Drag over event handler
 * 
 * e = DragEvent
 */
function bkmkDragOverHandler (e) {
  let target = e.target;
  let dt = e.dataTransfer;
  if (isLinux) {
	curBkmkTarget = target;
	curBkmkDt = dt;
  }
//console.log("Drag over event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
  // Handle drag scrolling inhibition
  handleBkmkDragScroll(OverEvent, e);
  if (checkDragType(dt)
	  && ((target.className == undefined)  // When on Text, className and classList are undefined.
		  || (target.className.length > 0) // For some reason, when the mouse is over the lifts,
		  								   // an HTMLDivElement is returned which is none of what
		  								   // is inside BookmarksTree :-(
	     )
  	 ) {
	// Get the enclosing row
	let row = getDragToRow(target);
//console.log("Over row: "+row+" class: "+row.classList+" BN_id: "+row.dataset.id);
//console.log("Bkmkitem_x: "+bkmkitem_x+" class: "+bkmkitem_x.classList);
	if (row == undefined) { // We are on the scrollbars for example
	  dt.dropEffect = "none"; // Signal drop not allowed
	}
	else {
	  let index = row.rowIndex;
	  if ((index >= noDropMinRowIndex) && (index <= noDropMaxRowIndex)
		  || (isProtected && !isTopItem) // Protection, can't drop on non top draggable elements = specials
	     ) {
		dt.dropEffect = "none"; // Signal drop not allowed
	  }
	  else {
		e.preventDefault(); // Allow drop
		highlightInsert(e);
	  }
	}
  }
  else {
	dt.dropEffect = "none"; // Signal drop not allowed
  }
}

/*
 * Drag leave event handler
 * 
 * e = DragEvent
 */
function bkmkDragLeaveHandler (e) {
  let target = e.target;
  let dt = e.dataTransfer;
//console.log("Drag leave event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
  // Handle drag scrolling inhibition
  handleBkmkDragScroll(LeaveEvent, e);
  let targetType = Object.prototype.toString.call(target).slice(8, -1);
  if (checkDragType(dt)
	  && (targetType != "HTMLDocument") // When we drop on a dropEffect=none zone (drop not fired)
	  && ((target.className == undefined)  // When on Text, className and classList are undefined.
		  || (target.className.length > 0) // For some reason, when the mouse is over the lifts,
		  								   // an HTMLDivElement is returned which is none of what
		  								   // is inside BookmarksTree :-(
	     )
    ) {
	// Get the enclosing row
	let row = getDragToRow(target);
//console.log("Leave row: "+row+" class: "+row.classList+" BN_id: "+row.dataset.id);
	if (row == undefined) { // We are on the scrollbars for example
	  dt.dropEffect = "none"; // Signal drop not allowed
	}
	else {
	  let index = row.rowIndex;
	  if (((index < noDropMinRowIndex) || (index > noDropMaxRowIndex))
		  && (!isProtected || isTopItem) // Protection, can't drop on non top draggable elements = specials
	     ) {
		highlightRemove(e);
	  }
	}
  }
}

/*
 * Drag exit event handler
 * 
 * e = DragEvent
 */
function bkmkDragExitHandler (e) {
  let target = e.target;
  let dt = e.dataTransfer;
//console.log("Drag exit event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
  // Handle drag scrolling inhibition
  handleBkmkDragScroll(ExitEvent, e);
  let targetType = Object.prototype.toString.call(target).slice(8, -1);
  if (checkDragType(dt)
	  && (targetType != "HTMLDocument") // When we drop on a dropEffect=none zone (drop not fired)
	  && ((target.className == undefined)  // When on Text, className and classList are undefined.
		  || (target.className.length > 0) // For some reason, when the mouse is over the lifts,
		  								   // an HTMLDivElement is returned which is none of what
		  								   // is inside BookmarksTree :-(
	     )
    ) {
	// Get the enclosing row
	let row = getDragToRow(target);
//console.log("Exit row: "+row+" class: "+row.classList+" BN_id: "+row.dataset.id);
	if (row == undefined) { // We are on the scrollbars for example
	  dt.dropEffect = "none"; // Signal drop not allowed
	}
	else {
	  let index = row.rowIndex;
	  if (((index < noDropMinRowIndex) || (index > noDropMaxRowIndex))
		  && (!isProtected || isTopItem) // Protection, can't drop on non top draggable elements = specials
	     ) {
		highlightRemove(e);
	  }
	}
  }
}

/*
 * Drag drop event handler
 * 
 * e = DragEvent
 */
function bkmkDropHandler (e) {
  e.preventDefault(); // Prevent browser to interpret the drop by itself (like open a page for a URL/bookmark drop)
  let target = e.target;
  let dt = e.dataTransfer;
//console.log("Drag drop event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList+" ctrlKey: "+e.ctrlKey);
/*
console.log("dt.dropEffect   : "+dt.dropEffect);
console.log("dt.effectAllowed: "+dt.effectAllowed);
console.log("dt.items        : "+dt.items);
console.log("dt.types        : "+dt.types);
*/
  // Stop scrolling inhibition
  resetBkmkDragScroll();
  if (checkDragType(dt)
	  && ((target.className == undefined)  // When on Text, className and classList are undefined.
		  || (target.className.length > 0) // For some reason, when the mouse is over the lifts,
		  								   // an HTMLDivElement is returned which is none of what
		  								   // is inside BookmarksTree :-(
	     )
     ) {
	// Get the enclosing row
	let row = getDragToRow(target);
//console.log("Drop on row: "+row+" class: "+row.classList+" BN_id: "+row.dataset.id);

	// Can't happen when in a dropEffect=none zone .. but in case, let's protect against it
	let index = row.rowIndex;
	if ((index < noDropMinRowIndex) || (index > noDropMaxRowIndex)) {
	  // Highlight one last time to make sure we get latest insert position, then remove highlight
	  let insertPos = highlightInsert(e);
	  highlightRemove(e);

	  // Now, get target BookmarkNode
	  let BN_id = row.dataset.id;
	  let BN = curBNList[BN_id];

	  // Get data to drop, and insert / move it 
	  // When the dragged element is one of our bookmarks its dt.types will be
	  //   dt.types        : application/x-bookmark,text/x-moz-place<-xxx>, [text/uri-list,] text/plain, text/html
	  // When it is a native bookmark, it will be
	  //   dt.types        : text/x-moz-place<-xxx>
	  // When it is a native tab, it will be
	  //   dt.types        : text/x-moz-text-internal
	  // When it is a link in an HTML page, or in the address bar:
	  //   dt.types        : text/x-moz-url,text/x-moz-url-data,text/x-moz-url-desc,text/uri-list,text/_moz_htmlcontext,text/_moz_htmlinfo,text/html,text/plain

	  // Handle multiple items drag -- GECKO SPECIFIC !! -- No more supported as of FF71, didn't find an alternative yet :-(
	  let mozItemCount = dt.mozItemCount;
	  let itemCount;
	  if (mozItemCount != undefined) {
		itemCount = mozItemCount;
	  }
	  else {
		itemCount = 1;
	  }
	  let types;
	  let type;

/*
let typesLength;
let data;
console.log("-------------------");
console.log("InsertPos: "+insertPos);
console.log("Items length : "+dt.items.length);
for (let i=0 ; i<dt.items.length; i++) {
  console.log("... items["+i+"].kind = "+dt.items[i].kind + "; type = "+dt.items[i].type);
}
console.log("mozItemCount : "+mozItemCount);
console.log("itemCount    : "+itemCount);
for (let i=0 ; i<itemCount ; i++) {
  if (i == 0) {
	types = dt.types;
  }
  else {
	// Convert from a DOMStringList to an Array of DOMString
	types = Array.from(dt.mozTypesAt(i));
//	let list = Array.from(dt.mozTypesAt(i));
//	let len = list.length;
//	types = new Array (len);
//	for (let i=0 ; i<len ; i++) {
//	  types[i] = list.item(i);
//	}
  }
  console.log("Types length : "+types.length);
  for (let j=0 ; j<types.length; j++) {
	type = types[j];
	console.log("... types["+i+", "+j+"] = "+type);
	if (i == 0) {
	  data = dt.getData(type);
	}
	else {
	  data = dt.mozGetDataAt(type, i);
	}
	console.log("...... data["+i+", "+type+"] = <<"+data+">>");
  }
}
*/

	  let bnIndex = BN_getIndex(BN);
	  if (insertPos == 1) { // Create just after target row
		bnIndex++;
	  }
	  for (let i=itemCount-1 ; i>=0 ; i--) { // Do it for each dragged item, reverse order as always inserting at same index
		if (i == 0) {
		  types = dt.types;
		}
		else {
//		  types = dt.mozTypesAt(i);
		  types = Array.from(dt.mozTypesAt(i));
		}
		if (types.includes(type = "application/x-bookmark")	 // Move or copy the dragged bookmark
			|| types.includes(type = "text/x-moz-place") 	 // Dragging a native Bookmark to us
		   ) {
		  let draggedBN_id;
		  if (i == 0) {
			draggedBN_id = dt.getData(type);
		  }
		  else {
			draggedBN_id = dt.mozGetDataAt(type, i);
		  }
		  if (type == "text/x-moz-place") {
			// data is like {"title":"Nouveau dossier","id":2238,"itemGuid":"VQ8ulNGyfXk0","instanceId":"jvwImUhXA2rV","parent":2099,"parentGuid":"CLSASmpIpBmQ",
		    //               "dateAdded":1536393478662000,"lastModified":1536393478662000,"type":"text/x-moz-place-container"}
		    //				{"title":"_  New bookmark","id":2350,"itemGuid":"JE2j0D-5tnpT","instanceId":"jvwImUhXA2rV","parent":2028,"parentGuid":"XmOZ-HAGbfEM",
		    //				 "dateAdded":1550944109935000,"lastModified":1551218607521000,"type":"text/x-moz-place","uri":"about:blank"}
		    //				{"title":"","id":2239,"itemGuid":"gORenOTsYJdk","instanceId":"jvwImUhXA2rV","parent":2028,"parentGuid":"XmOZ-HAGbfEM",
		    //				 "dateAdded":1536396421579000,"lastModified":1551022707690000,"type":"text/x-moz-place-separator"}
			let bookmark = JSON.parse(draggedBN_id);
			draggedBN_id = bookmark.itemGuid;
		  }
		  let BNDragged = curBNList[draggedBN_id];
		  let rowDragged = curRowList[draggedBN_id];

		  if (insertPos == 0) { // Drop to a folder, add at end
			if (e.ctrlKey) { // Copy
			  pasteBkmk(BNDragged, BN);
			}
			else { // Move
			  browser.bookmarks.move(draggedBN_id,
				  					 {parentId: BN_id
				  					 }
			  );
			}
		  }
		  else { // Drop before of after a bookmark item
			if (e.ctrlKey) { // Copy
			  // Retrieve parent of that bookmark item as we have to insert just before that BN
			  let parentBN = curBNList[BN.parentId];
			  pasteBkmk(BNDragged, parentBN, bnIndex);
			}
			else { // Move
			  // Do nothing if we insert just after rowDragged and same parent == no move !
			  if ((BNDragged.parentId != BN.parentId)
				  || ((insertPos == -1) && (index != rowDragged.rowIndex+1))
				  || ((insertPos == 1) && (index != rowDragged.rowIndex-1))
			     ) {
				// Be careful (not documented ...), if the bookmark is moved after itself
				// under the same parent, the insertion index is to be numbered without it
				// => decrease target index by 1 (basically, the index is used after delete ..)
				let adjust = 0;
				if ((BNDragged.parentId == BN.parentId) // Same parent, so moving inside parent
					&& (BN_getIndex(BNDragged) < bnIndex)
				   ) {
				  adjust = -1;
				}
				browser.bookmarks.move(rowDragged.dataset.id,
									   {parentId: BN.parentId,
				  						index: bnIndex + adjust
									   }
				);
			  }
			}
		  }
		}
		else if (types.includes(type = "text/x-moz-text-internal")) { // Dragging a tab to us
		  let url;
		  if (i == 0) {
			url = dt.getData(type);
		  }
		  else {
			url = dt.mozGetDataAt(type, i);
		  }
		  // If this is an "about:reader?url=" URL, cannot use the matching pattern form as it does not find "about:" tabs
		  // Trying a work around using "active" tabs .. seems to work and return only 1 tab ..
		  // => Maybe I should switch to it for any kind of URL ?
		  let isAboutReaderUrl = url.startsWith("about:reader?url=");
		  let gettingTabs;
		  if (isAboutReaderUrl) { // Remember the initial form, and decode the url for retrieval
			gettingTabs = browser.tabs.query({windowId: myWindowId, active: true});
		  }
		  else {
			// browser.tabs.query() only uses special a limited pattern matching form ..
			// So lets remove the parts it cannot support .. at the risk of getting several tabs, so need to triage later
			let urlObj = new URL (url);
			let protocol = urlObj.protocol;
//			let host = urlObj.host;
			let hostname = urlObj.hostname;
//			let port = urlObj.port;
			let pathname = urlObj.pathname;
			let search = urlObj.search;
//			let hash = urlObj.hash;
			let urlSearch = protocol + "//" + hostname + pathname + search;
//console.log("Query tab for url: "+url+" urlSearch: "+urlSearch);
			// Get tab corresponding to url
			gettingTabs = browser.tabs.query({windowId: myWindowId, url: urlSearch});
		  }
		  gettingTabs.then (
			function (a_tabs) {
			  // In case of multiple tabs because of the shortened url .. retrieve the good one
			  let len = a_tabs.length;
//console.log("tabs length: "+len);
			  let droppedTab;
			  if (len > 1) {
				let i;
				for (let j=0 ; j<len ; j++) {
				  if ((i = a_tabs[j]).url == url) {
					droppedTab = i;
					break;
				  }
				}
			  }
			  else {
				droppedTab = a_tabs[0];
			  }
			  // Create new bookmark at insertion point
			  uglyHackTabFavIconUrl = droppedTab.favIconUrl;
			  let title = droppedTab.title;
//let url = droppedTab.url;
			  let creating;
			  if (insertPos == 0) { // Drop to a folder, add at end
				if (beforeFF57) {
				  creating = browser.bookmarks.create(
					{parentId: BN_id,
					 title: title,
					 url: url
					}
				  );
				}
				else {
				  creating = browser.bookmarks.create(
					{parentId: BN_id,
					 title: title,
					 type: "bookmark",
					 url: url
					}
				  );
				}
			  }
			  else { // Drop before of after a bookmark item
				if (beforeFF57) {
				  creating = browser.bookmarks.create(
					{index: bnIndex,
					 parentId: BN.parentId,
					 title: title,
					 url: url
					}
				  );
				}
				else {
				  creating = browser.bookmarks.create(
					{index: bnIndex,
					 parentId: BN.parentId,
					 title: title,
					 type: "bookmark",
					 url: url
					}
				  );
				}
			  }
			  if (e.altKey == true) { // If Alt key was pressed when dropping, then open the Properties window
				creating.then(createBookmark);
			  }
			}
		  );
		}
		else if (types.includes(type = "text/uri-list")		// Dragging a page link or (i) in the location bar to us
				 || types.includes(type = "text/x-moz-url")	// Dragging the location bar URL address
			    ) {
		  let url;
		  let title;
		  let titleType = "text/x-moz-url-desc";
		  if (i == 0) {
			url = dt.getData(type);
			title = dt.getData(titleType);
			if (title.length == 0) {
			  title = dt.getData("text/x-moz-url");
			}
		  }
		  else {
			url = dt.mozGetDataAt(type, i);
			title = dt.mozGetDataAt(titleType, i);
			if (title.length == 0) {
			  title = dt.mozGetDataAt("text/x-moz-url", i);
			}
		  }
		  let splitIndex = url.indexOf("\n"); // Remove any "\n" and following part if there is in URL 
		  if (splitIndex > 0) {
			url = url.slice(0, splitIndex);
		  }
		  if (title.length == 0) { // If title is empty, use the URL as title
			title = url;
		  }
		  else { // If there is an "\n", keep the part after
			splitIndex = title.indexOf("\n");
			title = title.slice(splitIndex+1);
		  }

		  // Create new bookmark at insertion point
		  let creating;
		  if (insertPos == 0) { // Drop to a folder, add at end
			if (beforeFF57) {
			  creating = browser.bookmarks.create(
				{parentId: BN_id,
				 title: title,
				 url: url
				}
			  );
			}
			else {
			  creating = browser.bookmarks.create(
				{parentId: BN_id,
				 title: title,
				 type: "bookmark",
				 url: url
				}
			  );
			}
		  }
		  else { // Drop before of after a bookmark item
			if (beforeFF57) {
			  creating = browser.bookmarks.create(
				{index: bnIndex,
				 parentId: BN.parentId,
				 title: title,
				 url: url
				}
			  );
			}
			else {
			  creating = browser.bookmarks.create(
				{index: bnIndex,
				 parentId: BN.parentId,
				 title: title,
				 type: "bookmark",
				 url: url
				}
			  );
			}
		  }
		  if (e.altKey == true) { // If Alt key was pressed when dropping, then open the Properties window
			creating.then(createBookmark);
		  }
		}
	  }
	}
  }
}

/*
 * Paste bookmark contents (recursively because can only create one by one) at the
 * designated place.
 * 
 * BN = BookmarkNode to paste - If it is undefined, it signals last sibling reached at
 *      current recursion level.
 * newParentBN = BookmarkNode of new parent to paste into
 * index = integer position in parent
 * recurLevel (optional, default 0) = relative recursion level to initial paste - used to detect
 *                                    when to end
 * 
 * Relies on stackBN, stackNewBN and stackIndex global arrays to execute the recursion without
 * synchronous returns.
 */
let stackBN;
let stackNewBN;
let stackIndex
function pasteBkmk (BN, newParentBN, index = undefined, recurLevel = 0) {
//  let t1 = new Date();
//  trace(t1.getTime()+" Paste BN: "+BN+" Parent: "+newParentBN+" index: "+index+" recur: "+recurLevel);
  if (BN != undefined) { // Initial call or recursive call
	if (recurLevel == 0) { // First and only node at top
	  stackBN = [];
	  stackNewBN = [];
	  stackIndex = [];
	}
	// If index is undefined, we are pasting into a folder => at end
	let creating;
	let type = BN.type;
	let url = BN.url;
	if (index == undefined) {
	  // Create BTN at end of parent folder
	  if (beforeFF57) {
		if (type == "separator") { // Cannot create separators in FF 56
		  creating = new Promise (
			(resolve, reject) => {
			  resolve(); // Send promise for anybody waiting ..
			}
		  );
		}
		else {
		  creating = browser.bookmarks.create(
			{parentId: newParentBN.id,
			 title: BN.title,
			 url: url
			}
		  );
		}
	  }
	  else {
		creating = browser.bookmarks.create(
		  {parentId: newParentBN.id,
		   title: BN.title,
		   type: type,
		   url: url
		  }
		);
	  }
	}
	else {
	  // Create BTN at designated place
	  if (beforeFF57) {
		if (type == "separator") { // Cannot create separators in FF 56
		  creating = new Promise (
			(resolve, reject) => {
			  resolve(); // Send promise for anybody waiting ..
			}
		  );
		}
		else {
		  creating = browser.bookmarks.create(
			{index: index,
			 parentId: newParentBN.id,
			 title: BN.title,
			 url: url
			}
		  );
		}
	  }
	  else {
		creating = browser.bookmarks.create(
		  {index: index,
		   parentId: newParentBN.id,
		   title: BN.title,
		   type: type,
		   url: url
		  }
		);
	  }
	}
	creating.then(
	  function (newBTN) { // Created BookmarkTreeNode
//let t2 = new Date();
//trace(t2.getTime()+" Paste node creation delay: "+(t2.getTime() - t1.getTime()));
		let children = BN.children;
		if ((children != undefined) && (children.length > 0)) { // There are children to copy ...
		  stackBN.push(BN); // Remember it for when we go up from depth first exploration
		  stackNewBN.push(newParentBN);
		  stackIndex.push(index);
		  let newBN = curBNList[newBTN.id]; // We are supposing the creation cycle was complete
		  									// and a BN was created for this new node
		  if (newBN == undefined)
			deadbeef = null; // Scream if not !!
		  pasteBkmk(children[0], newBN, 0, recurLevel+1);
		}
		else if (recurLevel > 0) { // There can be siblings to copy also at that recursion level
		  let parentBN = stackBN[stackBN.length-1];
		  children = parentBN.children;
		  if (++index < children.length) { // There are siblings ..
			pasteBkmk(children[index], newParentBN, index, recurLevel);
		  }
		  else if (recurLevel > 1) { // It was the last child of its parent,
									 // and parent may have more siblings to explore
			// Go back one level and get next sibling of parent
			pasteBkmk(undefined, undefined, undefined, recurLevel-1);
		  }
		}
	  }
	);
  }
  else { // Return from lower level recursion
		 // Note that if we get here, recurLevel >= 1 by construction
	BN = stackBN.pop();
	let parentBN = stackBN[stackBN.length-1];
	newParentBN = stackNewBN.pop();
	index = stackIndex.pop();

	// See if there are siblings at that level
	let children = parentBN.children;
	if (++index < children.length) { // There are siblings ..
	  pasteBkmk(children[index], newParentBN, index, recurLevel);
	}
	else if (recurLevel > 1) { // It was the last child of its parent,
	  						   // and parent may have more siblings to explore
	  // Go back one level and get next sibling of parent
	  pasteBkmk(undefined, undefined, undefined, recurLevel-1);
	}
  }
}

/*
 * Move bookmark at the designated place.
 * 
 * BN = BookmarkNode to move
 * newParentBN = BookmarkNode of new parent to paste into
 * newIndex = integer position in parent
 * 
 * Return true if moved, else false. 
 */
function moveBkmk (BN, newParentBN, newIndex = undefined) {
//  trace("Move BN: "+BN.id+" Parent: "+newParentBN.id+" index: "+newIndex);
  if (newIndex == undefined) { // Cut and pasting into a folder, at end
	// Move BTN at end of folder
	browser.bookmarks.move(
	  BN.id,
	  {parentId: newParentBN.id
	  }
	);
  }
  else {
    // If designated place is under same parent and after, some special handling ..
    if (BN.parentId == newParentBN.id) {
	  // If moved after, need to decrease index by 1 to represent position without moved item ..
	  // This is not documented properly on https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/bookmarks/move
      let index = BN_getIndex(BN);
	  if (newIndex > index)   newIndex--;
	  if (newIndex == index) { // No move
	    return;
	  }
    }
	// Move BTN at designated place
	browser.bookmarks.move(
	  BN.id,
	  {parentId: newParentBN.id,
	   index: newIndex
	  }
	);
  }
}

/*
 * Retrieve rowIndex for an action in a context menu
 * 
 * item is an HTMLDivElement or and HTMLElement (<b>) in a menu
 * 
 * Returns the rowIndex
 */
function getMenuRowIndex (item) {
  let menu = item.parentElement;
  return(parseInt(menu.dataset.index, 10));
}

/*
 * Retrieve row for an action in a context menu
 * 
 * item is an HTMLDivElement or an HTMLElement (<b>) in a menu
 * 
 * Returns the row in context
 */
function getMenuRow (item) {
  let menu = item.parentElement;
  let rowIndex = parseInt(menu.dataset.index, 10);
  let row;
  if (menu.id.startsWith("myr")) { // A results table menu
	row = resultsTable.rows[rowIndex];
  }
  else { // A bookmarks table menu
	row = bookmarksTable.rows[rowIndex]; 
  }

  return(row);
}

/*
 * Open bookmark Property popup with given title
 * 
 * propType = "new" or "prop", to indicate creation of a new item, or editing its properties
 * BN_id = String identifying the bookmark item to edit
 */
function openPropPopup (popupType, BN_id, path, type, title, url) {
  // Open popup on bookmark item
  let titlePreface;
  let popupUrl;
//  let popupURL = browser.extension.getURL("sidebar/popup.html");
  // Did not find a good way to get a modal dialog so far :-(
  // 1) let sign = prompt("What's your sign?");
  //    creates a modal inside the sidebar, half hidden if the sidebar is not large enough. 
  // 2) It appears window.open works outside of the .then, but not inside !!
  //    I do not understand why ..
  //    window.open(popupURL, "_blank", "dialog,modal,height=200,width=200");
  //    Anyway, "modal" is ignored, and I can't figure how to get the UniversalBrowserWrite privilege so far .. :-(
  // So using browser.windows instead, which is not modal, and which is resizeable.
  if (type == "folder") {
	let winType;
	if (popupType == "new") {
	  winType = "newfldr";
	  titlePreface = "New folder";
	}
	else {
	  winType = "propfldr";
	  titlePreface = "Properties of « "+title+" »";
	}
	popupUrl = PopupURL+"?type="+winType+"&id="+BN_id+"&path="+encodeURIComponent(path)+"&title="+encodeURIComponent(title)+"&url=null";
  }
  else { // Bookmark
	let winType;
	if (popupType == "new") {
	  winType = "newbkmk";
	  titlePreface = "New bookmark";
	}
	else {
	  winType = "propbkmk";
	  titlePreface = "Properties of « "+title+" »";
	}
	popupUrl = PopupURL+"?type="+winType+"&id="+BN_id+"&path="+encodeURIComponent(path)+"&title="+encodeURIComponent(title)+"&url="+encodeURIComponent(url);
  }
  popupUrl = encodeURI(popupUrl);
  let gettingItem = browser.storage.local.get(
	{popuptop_option: 300,
	 popupleft_option: 300
	}
  );
  gettingItem.then((res) => {
	// Open popup window where it was last. If it was in another screen than
	// our current screen, then center it.
	// This avoids having the popup out of screen and unreachable, in case
	// the previous screen went off, or display resolution changed.
	let top = res.popuptop_option;
	let left = res.popupleft_option;
//console.log("openPropPopup() - top="+top+" left="+left);
	let scr = window.screen;
	let adjust = false;
	// Also, protect if possible against privacy.resistFingerprinting which does not return the screen size,
	// but the sidebar size instead !! :-(
	let al = scr.availLeft;
	let aw = scr.availWidth;
	if ((PopupWidth < aw) // If wider than the reported screen width, do not adjust
		&& ((left < al) || (left >= al + aw))
	   ) {
	  adjust = true;
	  left = al + Math.floor((aw - PopupWidth) / 2);
	}
	let at = scr.availTop;
	let ah = scr.availHeight;
	if ((PopupHeight < ah) // If higher than the reported screen height, do not adjust
		&& ((top < at) || (top >= at + ah))
	   ) {
	  adjust = true;
	  top = at + Math.floor((ah - PopupHeight) / 2);
	}
	if (adjust) { // Save new position values
	  browser.storage.local.set({
		popuptop_option: top,
		popupleft_option: left
	  });
//console.log("openPropPopup() - had to adjust position top="+top+" left="+left);
	}
  
	browser.windows.create(
	  {titlePreface: titlePreface,
	   type: "popup",
//		 type: "detached_panel",
	   // Using a trick with URL parameters to tell the window which type
	   // it is, which bookmark id, .. etc .. since titlePreface doesn't appear to work
	   // and there appears to be no way to pass parameters to the popup by the call. 
	   url: popupUrl,
//----- Workaround for top and left position parameters being ignored for panels and bug on popups (since panel is an alias for popup) -----
// Cf. https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/windows/create
//     https://bugzilla.mozilla.org/show_bug.cgi?id=1271047
//Make the start size as small as possible so that it briefly flashes in its initial
//position in the least conspicuous way.
//Note: 1,1 does not work, this sets the window in a state reduced to the bar, and no
//internal resize seems to work after that.
//Also tried to start minimized, but the window pops in a big size first before being minimized,
//even less pretty.			   .
//=> .. FF does not seem very clean on all this .. :-( 
//       height: PopupHeight,
//       width: PopupWidth,
	   height: 40,
	   width: 40,
//	     left: left,
//		 top: top,
//----- End of position ignored workaround -----
	   allowScriptsToClose: true
	  }
	);
  });
}

/*
 * Upon Bookmark creation menu event, open Window to let the user enter values in fields
 * 
 * BTN is of type BookmarkTreeNode (promise from browser.bookmarks.create())
 */
function createBookmark (BTN) {
  // Truncate title to just before "?" if it has one
  let title = BTN.title;
  let paramPos = title.indexOf("?");
  if (paramPos != -1) {
	title = title.slice(0, paramPos);
  }
  let path = BN_path(BTN.parentId);
  openPropPopup("new", BTN.id, path, BTN.type, title, BTN.url);

  // Don't call refresh search, it is already called through bkmkCreatedHandler
}

/*
 * Upon Folder creation menu event, open Window to let the user enter values in fields
 * 
 * BTN is of type BookmarkTreeNode (promise from browser.bookmarks.create())
 */
function createFolder (BTN) {
  let path = BN_path(BTN.parentId);
  openPropPopup("new", BTN.id, path, BTN.type, BTN.title, undefined);

  // Don't call refresh search, it is already called through bkmkCreatedHandler
}

/*
 * Receive event from keyboard anywhere in the sidebar panel, and also handle
 * menu actions
 * 
 * e is of type KeyboardEvent
 */
function keyHandler (e) {
  let target = e.target; // Type depends ..
  let classList = target.classList;
  let key = e.key;
//console.log("Key event: "+e.type+" key: "+key+" char: "+e.char+" target: "+target+" classList: "+classList);

  let isResultRow = classList.contains("brow"); // Note: classList is an Array, not a string => exact match
  if (key == "Escape") {
	// Clear any menu when Esc is pressed
	let menuClosed = clearMenu();

	// Clear searchbox input and any search result when Esc is pressed within it
	if (((target.id == "searchtext") || !menuClosed)
	    && (SearchTextInput.value.length > 0)) {
	  clearSearchTextHandler();
	}
  }
  else if (target.id == "searchtext") {
	if (key == "Enter") { // Enter in search input box should execute new search or go to first search result if any
	  if (sboxState == SBoxChanging) { // If new content in search box, execute search in parallel
		triggerUpdate();
	  }
	  else if (resultsTable != undefined) {
		// Get to first row if there is one
		let len = resultsTable.rows.length;
		if (len > 0) {
		  let firstRow = resultsTable.rows[0];
		  let cell = firstRow.firstElementChild;
		  cell.focus();
		}
	  }
	  e.preventDefault();
	}
  }
  else if (classList.contains(Selhighlight) || isResultRow) { // Keyboard actions on an highlighted (=> focused) cell
	let row = target.parentElement;

	if (key == "ArrowDown") {
	  if (!myMenu_open) {
		// Find next visible row and highlight it
		let nextRow = row;
		while (((nextRow = nextRow.nextElementSibling) != null) && (nextRow.hidden));
		if (nextRow != null) { // We got one
		  let cell = nextRow.firstElementChild;
		  if (!isResultRow) {
			setCellHighlight(cell);
		  }
		  cell.focus();
		}
	  }
	  e.preventDefault();
	}
	else if (key == "ArrowUp") {
	  if (!myMenu_open) {
		// Find previous visible row and highlight it
		let previousRow = row;
		while (((previousRow = previousRow.previousElementSibling) != null) && (previousRow.hidden));
		if (previousRow != null) { // We got one
		  let cell = previousRow.firstElementChild;
		  if (!isResultRow) {
			setCellHighlight(cell);
		  }
		  cell.focus();
		}
	  }
	  e.preventDefault();
	}
	else if (key == "PageDown") {
	  if (!myMenu_open) {
		// Find bottom of bounding parent (it can change with window size or search panel presence,
		// so recalculate each time
		let ch, maxBottom;
		if (isResultRow) {
		  ch = SearchResult.clientHeight;
		  maxBottom = SearchResult.offsetTop + ch;
		}
		else {
		  ch = Bookmarks.clientHeight;
		  maxBottom = Bookmarks.offsetTop + ch;
		}

		// Get bottom and height of selected object
		var rect = row.getBoundingClientRect();
		let bottom = rect.bottom;
		let rowHeight = rect.height;

		// If there are more rows visible below, go to last one visible
		let nbItems = Math.round(maxBottom - bottom) / rowHeight; // bottom can be a float sometimes
		let intItems;
		if (nbItems >= 1) {
		  // Not at bottom of "viewport", go to the most bottom visible one
		  // Can be a non integer, so round down, and then go down by this number of visible items or end of rows
		  intItems = Math.floor(nbItems);
		  }
		else {
		  // Scroll by the number of elements of a "page", max
		  intItems = Math.floor(ch / rowHeight);
		}
		let nextRow = row;
		let temp;
		do {
		  temp = nextRow;
		  while (((temp = temp.nextElementSibling) != null) && (temp.hidden));
		  if (temp == null) // Reached end
			break;
		  nextRow = temp;
		} while (--intItems > 0);
		if (nextRow != row) { // We got one
		  let cell = nextRow.firstElementChild;
		  if (!isResultRow) {
			setCellHighlight(cell);
		  }
		  cell.focus();
		}
	  }
	  e.preventDefault();
	}
	else if (key == "PageUp") {
	  if (!myMenu_open) {
		// Find top of bounding parent (it can change with window size or search panel presence,
		// so recalculate each time
		let ch, minTop;
		if (isResultRow) {
		  ch = SearchResult.clientHeight;
		  minTop = SearchResult.offsetTop;
		}
		else {
		  ch = Bookmarks.clientHeight;
		  minTop = Bookmarks.offsetTop;
		}

		// Get top and height of selected object
		var rect = row.getBoundingClientRect();
		let top = rect.top;
		let rowHeight = rect.height;

		// If there are more rows visible above, go to first one visible
		let nbItems = Math.round(top - minTop) / rowHeight; // top can be a float sometimes
		let intItems;
		if (nbItems >= 1) {
		  // Not at top of "viewport", go to the most top visible one
		  // Can be a non integer, so round down, and then go down by this number of visible items or end of rows
		  intItems = Math.floor(nbItems);
		  }
		else {
		  // Scroll by the number of elements of a "page", max
		  intItems = Math.floor(ch / rowHeight);
		}
		let previousRow = row;
		let temp;
		do {
		  temp = previousRow;
		  while (((temp = temp.previousElementSibling) != null) && (temp.hidden));
		  if (temp == null) // Reached end
			break;
		  previousRow = temp;
		} while (--intItems > 0);
		if (previousRow != row) { // We got one
		  let cell = previousRow.firstElementChild;
		  if (!isResultRow) {
			setCellHighlight(cell);
		  }
		  cell.focus();
		}
	  }
	  e.preventDefault();
	}
	else if (key == "End") {
	  if (!myMenu_open) {
		// Find last visible row and highlight it
		let len;
		let lastRow;
		if (isResultRow) {
		  len = resultsTable.rows.length; // Start from end of table
		  lastRow = resultsTable.rows[len-1];
		}
		else {
		  len = bookmarksTable.rows.length; // Start from end of table
		  lastRow = bookmarksTable.rows[len-1];
		  if (lastRow.hidden)
			while ((lastRow = lastRow.previousElementSibling).hidden);
		}
		let cell = lastRow.firstElementChild;
		if (!isResultRow) {
		  setCellHighlight(cell);
		}
		cell.focus();
	  }
	  e.preventDefault();
	}
	else if (key == "Home") {
	  if (!myMenu_open) {
		// Find next visible row and highlight it
		let firstRow;
		if (isResultRow) {
		  firstRow = resultsTable.rows[0]; // Always visible
		}
		else {
		  firstRow = bookmarksTable.rows[0]; // Always visible
		}
		let cell = firstRow.firstElementChild;
		if (!isResultRow) {
		  setCellHighlight(cell);
		}
		cell.focus();
	  }
	  e.preventDefault();
	}
	else if (!isResultRow && (key == "ArrowLeft")) {
	  if (!myMenu_open) {
		// If on an open folder, close it, else go to parent folder (if not root)
		let type = row.dataset.type;
		let twistie = target.firstElementChild;
		if (e.shiftKey) { // Collapse it (even if already closed)
		  collapseAll(row.dataset.id, row);
		}
		else if ((type == "folder") && (twistie.className.includes("twistieao"))) { // This is an open folder
		  // Close it
		  handleFolderClick(twistie);
		}
		else {
		  let bnId = row.dataset.id;
		  let BN = curBNList[bnId];
		  bnId = BN.parentId;
		  if (bnId != Root) {
			row = curRowList[bnId];
			let cell = row.firstElementChild;
			setCellHighlight(cell);
			cell.focus();
		  }
		}
	  }
	  e.preventDefault();
	}
	else if (!isResultRow && (key == "ArrowRight")) {
	  if (!myMenu_open) {
		// If on a closed folder, open it, or if on an open folder, go to first child if any, else do nothing
		let type = row.dataset.type;
		if (type == "folder") {
		  let twistie = target.firstElementChild;
		  if (e.shiftKey) { // Expand it (even if already open)
			expandAll(row.dataset.id, row);
		  }
		  else if (twistie.className.includes("twistieac")) { // Closed folder
			// Open it
			handleFolderClick(twistie);
		  }
		  else if (twistie.className.includes("twistieao")) { // Open folder
			// Go to first element in it if any
			let bnId = row.dataset.id;
			let BN = curBNList[bnId];
			let children = BN.children;
			if ((children != undefined) && (children.length > 0)) {
			  bnId = children[0].id;
			  row = curRowList[bnId];
			  let cell = row.firstElementChild;
			  setCellHighlight(cell);
			  cell.focus();
			}
		  }
		}
	  }
	  e.preventDefault();
	}
	else if (!isResultRow && (key == "Delete")) {
	  if (!myMenu_open) {
		if (row.dataset.protect != "true") { // Non protected row
		  // Delete bookmark item in that row
		  let BTN_id = row.dataset.id;
		  browser.bookmarks.removeTree(BTN_id);
		}
	  }
	  e.preventDefault();
	}
	else if (key == "Enter") {
	  if (!myMenu_open) {
		let type = row.dataset.type;
		if (isResultRow && !e.ctrlKey && !e.shiftKey && !e.altKey) { // Show original bookmark item
		  handleResultClick(row);
		}
		else if (type == "bookmark") { // Bookmark default action
		  let bkmkitem = target.firstElementChild;
		  let href = bkmkitem.href;
		  if ((href != undefined) && (href.length > 0)) {
			// Respect the about:config browser.tabs.loadBookmarksInTabs setting
			if (openBookmarksInNewTabs_option) { // If option set, open in new tab
			  browser.tabs.create({url: href});
			}
			else if (e.ctrlKey) { // Open in new tab, referred by this tab to come back to it when closing
			  // Get current active tab as opener id to come back to it when closing the new tab
			  browser.tabs.query({windowId: myWindowId, active: true})
			  .then (
				function (a_tabs) {
				  if (beforeFF57)
					browser.tabs.create({url: href});
				  else
					browser.tabs.create({url: href, openerTabId: a_tabs[0].id});
				}
			  );
			}
			else if (e.shiftKey) { // Open in new window
			  browser.windows.create({url: href});
			}
			else {
			  browser.tabs.update({url: href});
			}
		  }
		}
		else if (!isResultRow && (type == "folder")) { // Folder default action
		  let twistie = target.firstElementChild;
		  if (twistie.className.startsWith("twistiea")) {
			handleFolderClick(twistie);
		  }
		}
	  }
	  e.preventDefault();
	}
	else if ((key == "F2") && !isResultRow) {
console.log("edit");
	  let type = row.dataset.type;
console.log("type: "+type);
	  let span;
	  if (type == "folder") {
		span = target.firstElementChild.nextElementSibling.firstElementChild.nextElementSibling;
	  }
	  else if (type == "bookmark") {
		span = target.firstElementChild.firstElementChild.nextElementSibling;
	  }
	  console.log("target: "+target);
	  console.log("span: "+span);
	  span.contentEditable = true;
	  span.focus();
	  e.preventDefault();
	}
  }
//  else {
//	SearchTextInput.focus(); // Focus on search box when a key is typed ...
//  }
}

/*
 * Handle show action on context menu
 * 
 * resultRow = HTMLTableRowElement in the results pane on which the context menu was open
 */
function menuShow (resultRow) {
  // Make the source object visible .. and scroll to it
  handleResultClick(resultRow);

  // If close search option is set, close search pane now
  if (closeSearch_option) {
	clearSearchTextHandler();
  }
}

/*
 * Handle open action on context menu
 * 
 * row = HTMLTableRowElement in the bookmarks or results pane on which the context menu was open
 * mode = integer, described by constants below
 */
const INTAB = 0;
const NEWTAB = 1;
const NEWWIN = 2;
const NEWPRIVWIN = 3;
function menuOpen (row, mode) {
  // Get anchor href
  let href = row.firstElementChild.firstElementChild.href;
  if ((href != undefined) && (href.length > 0)) {
	switch (mode) {
	  case INTAB:
		browser.tabs.update({url: href});
		break;
	  case NEWTAB:
		if (beforeFF57)
		  browser.tabs.create({url: href});
		else {
		  // Get current active tab as opener id to come back to it when closing the new tab
		  browser.tabs.query({windowId: myWindowId, active: true})
		  .then (
			function (a_tabs) {
			  browser.tabs.create({url: href, openerTabId: a_tabs[0].id});
			}
		  );
		}
		break;
	  case NEWWIN:
		// The second method disables any sidebar as it seems ... so can't use it
		browser.windows.create({url: href});
//		  window.open(href, "_blank", "menubar,toolbar,location,scrollbars");
		break;
	  case NEWPRIVWIN:
		// The second method disables any sidebar as it seems ... so can't use it
		browser.windows.create({url: href, incognito: true});
		break;
	}
  }
}

/*
 * Handle open all in tabs action on context menu
 * 
 * BN_id = String identifying the bookmark folder for which to open all direct children
 */
function menuOpenAllInTabs (BN_id) {
  let BN = curBNList[BN_id];
  let children = BN.children;
  let len;
  let node;

  if ((children != undefined) && ((len = children.length) > 0)) {
	if (beforeFF57)
	  for (let i=len-1 ; i>=0 ; i--) {
		node = children[i];
		if (node.type == "bookmark") {
		  browser.tabs.create({url: node.url});
		}
	  }
	else {
	  // Get current active tab as opener id to come back to it when closing the new tab
	  browser.tabs.query({windowId: myWindowId, active: true})
	  .then (
		function (a_tabs) {
		  for (let i=len-1 ; i>=0 ; i--) {
			node = children[i];
			if (node.type == "bookmark") {
			  browser.tabs.create({url: node.url, openerTabId: a_tabs[0].id});
			}
		  }
		}
	  );
	}
  }
}

/*
 * Handle new bookmark item action on context menu
 * 
 * BN_id = String identifying the bookmark item before which or inside which to insert
 * bkmkType = integer, described by constants below
 */
const NEWB = 0;
const NEWF = 1;
const NEWS = 2;
function menuNewBkmkItem (BN_id, bkmkType) {
  let BN = curBNList[BN_id];

  // Create new bookmark just before if BN is a separator or a bookmark,
  // or append inside if BN is a folder.
  let BN_type = BN.type;
  if (beforeFF57) {
	switch (bkmkType) {
	  case NEWB:
	  	if (BN_type == "folder") {
		  browser.bookmarks.create(
			{parentId: BN_id,
			 title: "New bookmark",
			 url: "about:blank"
			}
		  )
		  .then(createBookmark);
	  	}
		else {
		  browser.bookmarks.create(
			{index: BN_getIndex(BN),
			 parentId: BN.parentId,
			 title: "New bookmark",
			 url: "about:blank"
			}
		  )
		  .then(createBookmark);
		}
	  	break;
	  case NEWF:
		if (BN_type == "folder") {
		  browser.bookmarks.create(
			{parentId: BN_id,
			 title: "New folder"
			}
		  )
		  .then(createFolder);
	  	}
		else {
		  browser.bookmarks.create(
			{index: BN_getIndex(BN),
			 parentId: BN.parentId,
			 title: "New folder"
			}
		  )
		  .then(createFolder);
		}
		break;
	  case NEWS:
		let msg = "Creating separators is not supported in WebExtension API before FF 57 !"; 
		trace(msg);
		console.log(msg);
		break;
	}
  }
  else { // Post FF 57
	switch (bkmkType) {
	  case NEWB:
		if (BN_type == "folder") {
		  browser.bookmarks.create(
			{parentId: BN_id,
			 title: "New bookmark",
			 type: "bookmark",
			 url: "about:blank"
			}
		  )
		  .then(createBookmark);
		}
		else {
		  browser.bookmarks.create(
			{index: BN_getIndex(BN),
			 parentId: BN.parentId,
			 title: "New bookmark",
			 type: "bookmark",
			 url: "about:blank"
			}
		  )
		  .then(createBookmark);
		}
		break;
	  case NEWF:
		if (BN_type == "folder") {
		  browser.bookmarks.create(
			{parentId: BN_id,
			 title: "New folder",
			 type: "folder"
			}
		  )
		  .then(createFolder);
		}
		else {
		  browser.bookmarks.create(
			{index: BN_getIndex(BN),
			 parentId: BN.parentId,
			 title: "New folder",
			 type: "folder"
			}
		  )
		  .then(createFolder);
		}
		break;
	  case NEWS:
		if (BN_type == "folder") {
		  browser.bookmarks.create(
			{parentId: BN_id,
			 type: "separator"
			}
		  );
		}
		else {
		  browser.bookmarks.create(
			{index: BN_getIndex(BN),
			 parentId: BN.parentId,
			 type: "separator"
			}
		  );
		} 
		break;
	}
  }
}

/*
 * Handle cut bookmark item action on context menu
 * 
 * BN_id = String identifying the bookmark item to cut
 * row = bookmarks table row which contains it
 */
function menuCutBkmkItem (BN_id, row) {
  // Cancel previous cut if any
  if (rowClipboard != undefined) {
	rowClipboard.classList.remove("cut");
	refreshCutSearch(bkmkClipboard.id, false);
	noPasteMinRowIndex = noPasteMaxRowIndex = -1;
  }

  // Retrieve bookmark item in that row and its contents
  bkmkClipboard = curBNList[BN_id]; // We are going to move, so clip the real one
  rowClipboard = row; // Signal new cut
  // Just dim the row being cut, do not remove it now
  rowClipboard.classList.add("cut");
  refreshCutSearch(BN_id, true);
/*
  trace("clipboard: "+bkmkClipboard.id+" "+bkmkClipboard.title+" "+bkmkClipboard.type+" "+bkmkClipboard.index+" "+bkmkClipboard.children+" "+bkmkClipboard.url);
  if (bkmkClipboard.children != undefined)
	for (let i of bkmkClipboard.children) {
	  trace("clipboard: "+i.id+" "+i.title+" "+i.type+" "+i.index+" "+i.children+" "+i.url);
	}
*/
  if (bkmkClipboard.type == "folder") { // If folder, set the no paste zone
  	noPasteMinRowIndex = row.rowIndex;
	// Find last child / grand child of bkmkClipboard (itself if no child)
	let lastBN = BN_lastDescendant(bkmkClipboard);
	row = curRowList[lastBN.id];
	noPasteMaxRowIndex = row.rowIndex; // Can be at end of bookmarks table
  }
  else {
	noPasteMinRowIndex = noPasteMaxRowIndex = -1;
  }
}

/*
 * Handle copy bookmark item action on context menu
 * 
 * BN_id = String identifying the bookmark item to copy
 */
function menuCopyBkmkItem (BN_id) {
  // Cancel previous cut if any
  if (rowClipboard != undefined) {
	rowClipboard.classList.remove("cut");
	refreshCutSearch(bkmkClipboard.id, false);
	noPasteMinRowIndex = noPasteMaxRowIndex = -1;
  }

  // Retrieve bookmark item in that row and its contents
  bkmkClipboard = BN_copy(curBNList[BN_id]); // Get a copy ! Let's not reinject the node itself
  rowClipboard = undefined; // Not a cut
}

/*
 * Handle bookmark clipboard paste action on context menu
 * 
 * BN_id = String identifying the bookmark item to paste to
 * is_pasteInto = Boolean, false if paste before, and true if paste into (only on folders)
 */
function menuPasteBkmkItem (BN_id, is_pasteInto) {
  let insertBN = curBNList[BN_id];

  if (rowClipboard == undefined) { // This is a copy operation
	if (is_pasteInto) { // Paste clipboard contents at end of insertBN folder
	  pasteBkmk(bkmkClipboard, insertBN);
	}
	else { // Paste clipboard contents at insertBN.index (then just before insertBN) under its parent
	  pasteBkmk(bkmkClipboard, curBNList[insertBN.parentId], BN_getIndex(insertBN));
	}
	bkmkClipboard = undefined; // Empty bkmkClipboard

	// Refresh search is handled thought bkmkCreatedHandler(), do not call it
  }
  else { // This is a move operation
	rowClipboard.classList.remove("cut"); // In case it stays at the same place = no move
	refreshCutSearch(bkmkClipboard.id, false);
	noPasteMinRowIndex = noPasteMaxRowIndex = -1;
	if (is_pasteInto) { // Move clipboard contents at end of insertBN folder
	  moveBkmk(bkmkClipboard, insertBN);
	}
	else { // Move clipboard contents at insertBN.index (then just before insertBN) under its parent
	  moveBkmk(bkmkClipboard, curBNList[insertBN.parentId], BN_getIndex(insertBN));
	}
    bkmkClipboard = undefined; // Empty bkmkClipboard
    rowClipboard = undefined;
  }
}

/*
 * Handle refresh favicon action on context menu
 * 
 * BN_id = String identifying the bookmark item to refresh
 */
function menuRefreshFav (BN_id) {
  let BN = curBNList[BN_id];

  // Trigger asynchronous favicon retrieval process
  let url = BN.url;
  if ((url != undefined)
   	  && !url.startsWith("about:")) { // about: is protected - security error .. => no fetch
   	// This is a bookmark, so here no need for cloneBN(), there is no tree below
//    faviconWorker.postMessage(["get2", BN_id, url, true]);
	let postMsg = ["get2", BN_id, url, true];
	if (backgroundPage == undefined) {
	  sendAddonMsgGetFavicon(postMsg);
	}
	else {
	  backgroundPage.faviconWorkerPostMessage({data: postMsg});
	}
  }
}

/*
 * Handle edit properties action on context menu
 * 
 * BN_id = String identifying the bookmark item to edit
 */
function menuProp (BN_id) {
  let BN = curBNList[BN_id];

  // Open popup on bookmark item
  let path = BN_path(BN.parentId);
  openPropPopup("prop", BN_id, path, BN.type, BN.title, BN.url);
}

/*
 * Receive event from clicks anywhere in the sidebar panel, and also handle
 * menu actions
 * 
 * e is of type MouseEvent (click, but apparently is also called with right and aux clicks .. 
 *   still saying "click" in e.type .. wonder why .. but e.button is correct
 *   => use this for clearing menus when appropriate)
 *
 * Use global variable mousedownTarget to detect a bug in Linux on contextmenu events resulting
 * in the click event target always equal to body ..
 * 
 */
let mousedownTarget;
function clickHandler (e) {
  let target = e.target; // Type depends ..
  if (mousedownTarget != target) { // Fight against Linux bug on click after contextmenu event with FF66 ..
	target = mousedownTarget; // Restore the normal target it should have ...
  }
  if ((target.nodeName == "INPUT") || (target.nodeName == "LABEL")) { // If Radio input in menu, get to englobing <div>
	target = target.parentElement
  }
  let classList = target.classList;
//console.log("General click event: "+e.type+" button: "+e.button+" target: "+target+" target.nodeName: "+target.nodeName+" class: "+classList);

  if (!classList.contains("menudisabled")) { // Click on a disabled menu element
											 // won't have any action
											 // and won't make the menu disappear
	let menuAction = false;  
    // If a menu action is clicked, handle it
	if (classList.contains("menushow")) { // Show source item in bookmarks table
	  									  // This can only happen in the results table
	  menuAction = true;
	  // Retrieve parent context menu, the rowIndex and row on which it is
	  menuShow(resultsTable.rows[getMenuRowIndex(target)]);
	}
	else if (classList.contains("menuopen")) { // Open bookmark in active tab
	  menuAction = true;
	  // Retrieve parent context menu, the rowIndex and row on which it is
	  menuOpen(getMenuRow(target), INTAB);
	}
	else if (classList.contains("menuopentab")) { // Open bookmark in a new tab
	  menuAction = true;
	  // Retrieve parent context menu, the rowIndex and row on which it is
	  menuOpen(getMenuRow(target), NEWTAB);
	}
	else if (classList.contains("menuopenwin")) { // Open bookmark in a new Window
	  menuAction = true;
	  // Retrieve parent context menu, the rowIndex and row on which it is
	  menuOpen(getMenuRow(target), NEWWIN);
	}
	else if (classList.contains("menuopenpriv")) { // Open bookmark in a new private Window
	  menuAction = true;
	  // Retrieve parent context menu, the rowIndex and row on which it is
	  menuOpen(getMenuRow(target), NEWPRIVWIN);
	}
	else if (classList.contains("menuopenall")) { // Open all bookmark of a folder in new tabs
	  menuAction = true;
	  // Retrieve parent context menu, the rowIndex and row on which it is
	  let row = getMenuRow(target);
	  // Retrieve bookmark item in that row
	  menuOpenAllInTabs(row.dataset.id);
	}
	else if (classList.contains("menuopentree")) { // Open parent(s) of selected .reshidden row
	  menuAction = true;
	  // Retrieve parent context menu, the rowIndex and row on which it is
	  openResParents(getMenuRow(target));
	}
	else if (classList.contains("menugoparent")) { // Jump to parent folder
	  menuAction = true;
	  // Retrieve parent context menu, the rowIndex and row on which it is
	  goParent(getMenuRow(target));
	}
	else if (classList.contains("menunewb")) { // Create a new bookmark
	  // Can only be on bookmarks table row
	  menuAction = true;
	  let row = bookmarksTable.rows[getMenuRowIndex(target)];
	  // Retrieve bookmark item in that row
	  menuNewBkmkItem(row.dataset.id, NEWB);
	}
	else if (classList.contains("menunewf")) { // Create a new folder
	  // Can only be on bookmarks table row
	  menuAction = true;
	  let row = bookmarksTable.rows[getMenuRowIndex(target)];
	  // Retrieve bookmark item in that row
	  menuNewBkmkItem(row.dataset.id, NEWF);
	}
	else if (classList.contains("menunews")) { // Create a new separator
	  // Can only be on bookmarks table row
	  menuAction = true;
	  let row = bookmarksTable.rows[getMenuRowIndex(target)];
	  // Retrieve bookmark item in that row
	  menuNewBkmkItem(row.dataset.id, NEWS);
	}
	else if (classList.contains("menucut")) { // Cut a bookmark item into bkmkClipboard
	  // Retrieve parent context menu, the rowIndex and row on which it is
	  menuAction = true;
	  let menu = target.parentElement;
	  let rowIndex = parseInt(menu.dataset.index, 10);
	  let row;
	  let BN_id;
	  if (menu.id.startsWith("myr")) { // A results table menu
		row = resultsTable.rows[rowIndex];
		BN_id = row.dataset.id;
		// Change to the original row
		row = curRowList[BN_id];
	  }
	  else { // A bookmarks table menu
		row = bookmarksTable.rows[rowIndex]; 
		BN_id = row.dataset.id;
	  }
	  menuCutBkmkItem(BN_id, row);
	}
	else if (classList.contains("menucopy")) { // Copy a bookmark item into bkmkClipboard
	  // Retrieve parent context menu, and the rowIndex on which it is
	  menuAction = true;
	  let menu = target.parentElement;
	  let rowIndex = parseInt(menu.dataset.index, 10);
	  let row;
	  let BN_id;
	  if (menu.id.startsWith("myr")) { // A results table menu
		row = resultsTable.rows[rowIndex];
		BN_id = row.dataset.id;
	  }
	  else { // A bookmarks table menu
		row = bookmarksTable.rows[rowIndex]; 
		BN_id = row.dataset.id;
	  }
	  menuCopyBkmkItem(BN_id);
	}
	else if (classList.contains("menupaste")) { // Paste bkmkClipboard contents before the row
	  											// Clear bkmkClipboard after that, as we want
	  											// to paste only once.
	  // Can only happen on bookmarks table row, retrieve the rowIndex from the menu
	  menuAction = true;
	  let row = bookmarksTable.rows[getMenuRowIndex(target)];
	  // Retrieve bookmark item in that row
	  menuPasteBkmkItem(row.dataset.id, false);
	}
	else if (classList.contains("menupasteinto")) { // Paste bkmkClipboard contents in folder
	  												// Clear bkmkClipboard after that, as we want
	  												// to paste only once.
      // Can only happen on bookmarks table folder rows, retrieve the rowIndex from the menu
	  menuAction = true;
	  let row = bookmarksTable.rows[getMenuRowIndex(target)];
      // Retrieve bookmark item in that row
	  menuPasteBkmkItem(row.dataset.id, true);
    }
	else if (classList.contains("menudel")) { // Delete a bookmark item
	  // Can only happen on bookmarks table row, retrieve the rowIndex from the menu
	  menuAction = true;
	  let row = bookmarksTable.rows[getMenuRowIndex(target)];
	  // Delete bookmark item in that row
	  browser.bookmarks.removeTree(row.dataset.id);
	}
	else if (classList.contains("menusort")) { // Sort folder contents by name
	  // Can only be on a folder and a bookmarks table row
	  menuAction = true;
	  let row = bookmarksTable.rows[getMenuRowIndex(target)];
	  // Retrieve bookmark item in that row
	  // Send commmand to sort the folder to Background task
	  sendAddonMessage("sort:"+row.dataset.id);
	}
	else if (classList.contains("menurefreshfav")) { // Refresh favicon
      // Can only happen on bookmarks table bookmark row, retrieve the rowIndex from the menu
	  menuAction = true;
	  let row = bookmarksTable.rows[getMenuRowIndex(target)];
	  // Refresh favicon of that bookmark item
	  menuRefreshFav(row.dataset.id);
	}
	else if (classList.contains("menuprop")) { // Edit properties of an existing bookmark
	  // Retrieve parent context menu, and the rowIndex on which it is
	  menuAction = true;
	  let menu = target.parentElement;
	  let rowIndex = parseInt(menu.dataset.index, 10);
	  let row;
	  if (menu.id.startsWith("myr")) { // A results table menu
		row = resultsTable.rows[rowIndex];
	  }
	  else { // A bookmarks table menu
		row = bookmarksTable.rows[rowIndex]; 
	  }
	  // Edit bookmark item in that row
	  menuProp(row.dataset.id);
	}
	else if (classList.contains("menuopenbsp2")) { // Open BSP2 in a new tab, full view
	  menuAction = true;
	  let href = SelfURL;
	  // Open in new tab, referred by this tab to come back to it when closing
	  // Get current active tab as opener id to come back to it when closing the new tab
	  browser.tabs.query({windowId: myWindowId, active: true})
	  .then (
		function (a_tabs) {
		  if (beforeFF57)
			browser.tabs.create({url: href});
		  else
			browser.tabs.create({url: href, openerTabId: a_tabs[0].id});
		}
	  );
	}
	else if (classList.contains("menuhistory")) { // Open Bookmark history window
	  menuAction = true;
	  let href = HistoryURL;
	  // Open in new window, like Properties popup
	  // Open popup window where it was last. If it was in another screen than
	  // our current screen, then center it.
	  // This avoids having the popup out of screen and unreachable, in case
	  // the previous screen went off, or display resolution changed.
/*
	  let top = res.historytop_option;
	  let left = res.historyleft_option;
	  let scr = window.screen;
	  let adjust = false;
	  if ((left < scr.availLeft) || (left >= scr.availLeft + scr.availWidth)) {
		adjust = true;
		left = scr.availLeft + Math.floor((scr.availWidth - PopupWidth) / 2);
	  }
	  if ((top < scr.availTop) || (top >= scr.availTop + scr.availHeight)) {
		adjust = true;
		top = scr.availTop + Math.floor((scr.availHeight - PopupHeight) / 2);
	  }
	  if (adjust) { // Save new values
		browser.storage.local.set({
		  historytop_option: top,
		  historyleft_option: left
		});
	  }
*/
	  // Open Bookmark history window if not already open, else just focus on it
	  browser.windows.getAll({populate: true, windowTypes: ["popup"]})
	  .then(
		function (a_Windowinfo) {
		  let wi, openedWi;
		  let wTitle = "("+selfName+") - Bookmark history -";
		  for (wi of a_Windowinfo) {
			if (wi.title.includes(wTitle)) {
			  openedWi = wi; 
			}
		  }
		  if (openedWi != undefined) {
			browser.windows.update(openedWi.id, {focused: true});
		  }
		  else {
			browser.windows.create(
			  {titlePreface: "Bookmark history",
			   type: "popup",
			   url: href,
			   //----- Workaround for top and left position parameters being ignored for panels -----
			   //Cf. https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/windows/create
			   //Make the start size as small as possible so that it briefly flashes in its initial
			   //position in the least conspicuous way.
			   //Note: 1,1 does not work, this sets the window in a state reduced to the bar, and no
			   //internal resize seems to work after that.
			   //Also tried to start minimized, but the window pops in a big size first before being minimized,
			   //even less pretty.			   .
			   //=> .. FF does not seem very clean on all this .. :-( 
//			   height: PopupHeight,
//			   width: PopupWidth,
			   height: 800,
			   width: 800,
//			   left: left,
//			   top: top,
			   //----- End of position ignored workaround -----
			   allowScriptsToClose: true
			  }
			);
		  }
		}
	  );
	}
	else if (classList.contains("menusfboth")) { // Search options
	  menuAction = true;
	  setSFieldTitleUrlHandler();
	}
	else if (classList.contains("menusftitle")) { // Search options
	  menuAction = true;
	  setSFieldTitleOnlyHandler();
	}
	else if (classList.contains("menusfurl") && (!SFieldUrlOnlyInput.disabled)) { // Search options
	  menuAction = true;
	  setSFieldUrlOnlyHandler();
	}
	else if (classList.contains("menussall")) { // Search options
	  menuAction = true;
	  setSScopeAllHandler();
	}
	else if (classList.contains("menusssubfolder")) { // Search options
	  menuAction = true;
	  setSScopeSubfolderHandler();
	}
	else if (classList.contains("menusmwords")) { // Search options
	  menuAction = true;
	  setSMatchWordsHandler();
	}
	else if (classList.contains("menusmregexp")) { // Search options
	  menuAction = true;
	  setSMatchRegexpHandler();
	}
	else if (classList.contains("menusfall")) { // Search options
	  menuAction = true;
	  setSFilterAllHandler();
	}
	else if (classList.contains("menusffldr")) { // Search options
	  menuAction = true;
	  setSFilterFldrOnlyHandler();
	}
	else if (classList.contains("menusfbkmk")) { // Search options
	  menuAction = true;
	  setSFilterBkmkOnlyHandler();
	}

	// Clear open menus on left or middle click, or on right click but only on (a menu action
	// or outside bookmarks or results).
	// Indeed, sometimes, the "click" Handler is called after the "context" Handler
	// instead of before, and so we do not want to close what we just opened :-( (in Linux at least)
	let targetType = Object.prototype.toString.call(target).slice(8, -1);
//console.log("targetType: "+targetType+" classList: "+classList+" classList.length: "+classList.length);
	if (menuAction || (classList == undefined) || (classList.length == 0)
		|| (targetType == "HTMLBodyElement") || (targetType == "HTMLInputElement") || (targetType == "HTMLTextAreaElement")
	   ) {
	  clearMenu();
	}
  }
}

/*
 * Manage FF context menu integration - onClicked event
 * 
 * info = Object
 */
function onClickedContextMenuHandler (info, tab) {
  let bnId = info.bookmarkId;
//console.log("menu item clicked on <"+bnId+"> with contexts="+info.contexts+" menuIds="+info.menuIds+" menuItemId="+info.menuItemId+" pageUrl="+info.pageUrl+" targetElementId="+info.targetElementId+" viewType="+info.viewType+" tab="+tab);
  if (myMenu_open // This sidebar instance is the one which opened the context menu
	  && ((info.viewType == "sidebar") || (info.viewType == "tab")) // Context menu inside of sidebar or insde BSP2 in a tab
	  && (bnId != undefined) && (bnId.length > 0)
	 ) {
	// Retrieve the clicked menu action
	let menuItemId = info.menuItemId;
	let pos = menuItemId.indexOf("-");
	let menuAction = menuItemId.substring(0, pos);
	switch (menuAction) {
	  case "bsp2show":
		// Retrieve the row on which it is
		menuShow(curResultRowList[bnId]);
		break;
	  case "bsp2open":
		// Retrieve the row on which it is
		menuOpen(curRowList[bnId], INTAB);
		break;
	  case "bsp2opentab":
		// Retrieve the row on which it is
		menuOpen(curRowList[bnId], NEWTAB);
		break;
	  case "bsp2openwin":
		// Retrieve the row on which it is
		menuOpen(curRowList[bnId], NEWWIN);
		break;
	  case "bsp2openpriv":
		// Retrieve the row on which it is
		menuOpen(curRowList[bnId], NEWPRIVWIN);
		break;
	  case "bsp2openall":
		// Retrieve the folder row on which it is
		menuOpenAllInTabs(bnId);
		break;
	  case "bsp2opentree":
		// Retrieve the .reshidden row on which it is
		openResParents(curRowList[bnId]);
		break;
	  case "bsp2goparent":
		// Retrieve the row on which it is
		goParent(curRowList[bnId]);
		break;
	  case "bsp2newb":
		menuNewBkmkItem(bnId, NEWB);
		break;
	  case "bsp2newf":
		menuNewBkmkItem(bnId, NEWF);
		break;
	  case "bsp2news":
		menuNewBkmkItem(bnId, NEWS);
		break;
	  case "bsp2cut":
		menuCutBkmkItem(bnId, curRowList[bnId]);
		break;
	  case "bsp2copy":
		menuCopyBkmkItem(bnId);
		break;
	  case "bsp2paste":
		menuPasteBkmkItem(bnId, false);
		break;
	  case "bsp2pasteinto":
		menuPasteBkmkItem(bnId, true);
		break;
	  case "bsp2del":
		browser.bookmarks.removeTree(bnId);
		break;
	  case "bsp2sort":
		sendAddonMessage("sort:"+bnId);
		break;
	  case "bsp2refreshfav":
		menuRefreshFav(bnId);
		break;
	  case "bsp2collapseall":
		collapseAll(bnId, curRowList[bnId]);
		break;
	  case "bsp2expandall":
		expandAll(bnId, curRowList[bnId]);
		break;
	  case "bsp2prop":
		menuProp(bnId);
		break;
	}
  }
}

/*
 * Manage FF context menu integration - onHidden event
 */
function onHiddenContextMenuHandler () {
  myMenu_open = false; // This sidebar instance menu closed, do not interpret onClicked events anymore
}

/*
 * Reset all filters
 */
function resetFiltersButtonHandler (e) {
  e.stopImmediatePropagation();
  e.preventDefault();
  clearMenu(); // Clear any open menu
  resetSearchHandler();
}

/*
 * Context menu on Magnifier glass
 */
function searchButtonHandler (e) {
  e.stopImmediatePropagation();
  e.preventDefault();
/*
  let button = e.button;
  let target = e.target;
  let classList = target.classList;
  console.log("noDefaultAction event: "+e.type+" button: "+button+" phase: "+e.eventPhase+" target: "+target+" class: "+target.classList);
*/
  clearMenu(); // Clear any open menu

//console.log("Magnifier glass context menu");
  myMenu_open = myMGlassMenu_open = true;
  drawMenu(MyMGlassMenu, e.clientY, e.clientX);
}

/*
 * Prevent default context menus or aux actions except in a few places
 * Called twice when context click = once with contextmenu + once with auxclick event
 * Called once on auxclick
 * Called all the times with mousedown events, whatever button.
 */
function noDefaultAction (e) {
  let target = e.target; // Type depends ..
  let eventType = e.type;
//console.log("noDefaultAction event: "+eventType+" button: "+e.button+" phase: "+e.eventPhase+" target: "+target+"target.nodeName: "+target.nodeName+" class: "+target.classList);

  // To fight a bug on Linux on context menu = it appears that the click event on a contextmenu event (button 2)
  // has now with FF66 its target set to the top body element, whatever element it is on.
  // So let's remember the target at mousedown time, so that things can be ignored if the target on click
  // event has changed and is different from what it was at mousedown time.
  if (eventType == "mousedown") {
	mousedownTarget = target;
	// Close any open menu if we are not in a menu ..
	if (!target.className.includes("menu")) {
	  clearMenu();
	}
  }

  if ((e.button == 1) || (e.button == 2)) {
	// Prevent default context menu except in the search box and in the trace box
	let targetObjectType = Object.prototype.toString.call(target).slice(8, -1);
	if ((targetObjectType != "HTMLInputElement")
		&& (targetObjectType != "HTMLTextAreaElement")
	   ) {
	  e.preventDefault();
//	  e.stopPropagation();
//	  e.stopImmediatePropagation();
	}
  }
}

/*
 * Handle responses or errors when talking with background
 */
let f_initializeNext;
function handleMsgResponse (message) {
  // Is always called, even is destination didn't specifically reply (then message is undefined)
  if (message != undefined) {
	let msg = message.content;
//console.log("Background sent a response: <<"+msg+">> received in sidebar:"+myWindowId);
	if (msg == "savedCurBnId") { // Restore last saved cursor position
	  goBkmkItem(message.bnId);
	}
	else if (msg == "getCurBNList") { // Received curBNList content
	  curBNList = message.json;
	  countBookmarks = message.countBookmarks;
	  countFetchFav = message.countFetchFav;
	  countFolders = message.countFolders;
	  countSeparators = message.countSeparators;
	  countOddities = message.countOddities;
	  mostVisitedBNId = message.mostVisitedBNId;
	  recentTagBNId = message.recentTagBNId; 
	  recentBkmkBNId = message.recentBkmkBNId;

	  f_initializeNext();
	}
	else if (msg == "Ready") {
	  backgroundReady = true; // Signal background ready for private windows for asking curBNList
	  if (waitingInitBckgnd) { // We were waiting for it to continue
//console.log("Background is Ready 3");
		f_initializeNext();
	  }
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
	{source: "sidebar:"+myWindowId,
	 content: msg
	}
  ).then(handleMsgResponse, handleMsgError);
}

/*
 * Send current selected bookmark Id to Background (when we are a private window)
 * 
 * bnId = String
 */
function sendAddonMsgCurBnId (bnId) {
  browser.runtime.sendMessage(
	{source: "sidebar:"+myWindowId,
	 content: "saveCurBnId",
	 bnId: bnId
	}
  ).then(handleMsgResponse, handleMsgError);
}

/*
 * Send list of favicon for 16x16 migration to Background (when we are a private window)
 * 
 * migr16x16ConvertList = Array of bnId's to convert
 * migr16x16Len = size of array
 */
function sendAddonMsgMigr16x16 (migr16x16ConvertList, migr16x16Len) {
  browser.runtime.sendMessage(
	{source: "sidebar:"+myWindowId,
	 content: "signalMigrate16x16",
	 list: migr16x16ConvertList,
	 len: migr16x16Len
	}
  ).then(handleMsgResponse, handleMsgError);
}

/*
 * Send a fetch favicon command to Background (when we are a private window)
 * 
 * a_msg = an array ["<cmd>", bnId, url, enableCookies_option]
 */
function sendAddonMsgGetFavicon (a_msg) {
  browser.runtime.sendMessage(
	{source: "sidebar:"+myWindowId,
	 content: "getFavicon",
	 postMsg: a_msg
	}
  ).then(handleMsgResponse, handleMsgError);
}

/*
 * Get and handle messages from background script
 */
function handleAddonMessage (request, sender, sendResponse) {
  try{ // Use a try catch structure, as any exception will be caught as an error response to calling part
	let source = request.source;
	if (source == "background") { // Ignore message from other sidebars
	  // When coming from background:
	  //   sender.url: moz-extension://28a2a188-53d6-4f91-8974-07cd0d612f9e/_generated_background_page.html
	  // When coming from sidebar:
	  //   sender.url: moz-extension://28a2a188-53d6-4f91-8974-07cd0d612f9e/sidebar/panel.html
	  let msg = request.content;
//console.log("Got message <<"+msg+">> from "+request.source+" in "+myWindowId);
//console.log("  sender.tab: "+sender.tab);
//console.log("  sender.frameId: "+sender.frameId);
//console.log("  sender.id: "+sender.id);
//console.log("  sender.url: "+sender.url);
//console.log("  sender.tlsChannelId: "+sender.tlsChannelId);

	  if (msg == "Ready") { // Background initialization is ready
		backgroundReady = true; // Signal background ready for private windows for asking curBNList
		if (waitingInitBckgnd) { // We were waiting for it to continue
//console.log("Background is Ready 2");
		  f_initializeNext();
		}
	  }
	  else if (msg.startsWith("savedOptions")) { // Option page changed something to options, reload them
		// Look at what changed
//		let enableCookies_option_old = enableCookies_option;
//		let enableFlipFlop_option_old = enableFlipFlop_option;
		let advancedClick_option_old = advancedClick_option;
		let showPath_option_old = showPath_option;
//		let closeSearch_option_old = closeSearch_option;
//		let openTree_option_old = openTree_option;
		let matchTheme_option_old = matchTheme_option;
		let setColors_option_old = setColors_option;
		let textColor_option_old = textColor_option;
		let bckgndColor_option_old = bckgndColor_option;
		let closeSibblingFolders_option_old = closeSibblingFolders_option;
		let altFldrImg_option_old = altFldrImg_option;
		let useAltFldr_option_old = useAltFldr_option;
		let traceEnabled_option_old = traceEnabled_option;

		// Function to process option changes
		function changedOptions () {
		  // If advanced click option changed, update rbkmitem_b class cursor
		  if (advancedClick_option_old != advancedClick_option) {
			setRBkmkItemBCursor(advancedClick_option);
		  }
		  // If a show path option changed, update any open search result 
		  if ((showPath_option_old != showPath_option)
			  || (showPath_option && (reversePath_option_old != reversePath_option))
			 ) {
			// Trigger an update as results can change, if there is a search active
			triggerUpdate();
		  }
		  // If match FF theme option changed
		  if (matchTheme_option_old != matchTheme_option) {
			if (matchTheme_option) {
			  // Align colors with window theme 
			  browser.theme.getCurrent(myWindowId)
			  .then(setPanelColors);

			  // Register listener
			  browser.theme.onUpdated.addListener(themeRefreshedHandler);
			}
			else {
			  resetPanelColors();

			  // Remove listener
			  browser.theme.onUpdated.removeListener(themeRefreshedHandler);
			}
		  }
		  // If set colors option changed, or if one of the colors changed while that option is set
		  if (setColors_option_old != setColors_option
			  || (setColors_option && ((textColor_option_old != textColor_option)
				  					   || (bckgndColor_option_old = bckgndColor_option)
				   					  )
				 )
			 ) {
			if (setColors_option) {
			  // Align colors with chosen ones 
			  setPanelColorsTB(textColor_option, bckgndColor_option);
			}
			else { // Cannot change while machTheme option is set, so no theme to match, reset ..
			  resetPanelColors();
			}
		  }
		  // If folder image options changed
		  if ((useAltFldr_option && (altFldrImg_option_old != altFldrImg_option))
			  || (useAltFldr_option_old != useAltFldr_option)
		     ) {
			setPanelFolderImg(useAltFldr_option, altFldrImg_option);
		  }
		  // If trace option changed
		  if (traceEnabled_option_old != traceEnabled_option) {
			TracePlace.hidden = !traceEnabled_option;
		  }
		}

		// Refresh options
		if ((backgroundPage == undefined) || (backgroundPage.ready == undefined)) { // Load by ourselves
		  refreshOptionsLStore()
		  .then(changedOptions)
		  .catch( // Asynchronous, like .then
			function (err) {
			  let msg = "Error on processing changedOptions : "+err;
			  console.log(msg);
			  if (err != undefined) {
				console.log("fileName:   "+err.fileName);
				console.log("lineNumber: "+err.lineNumber);
			  }
			}
		  );
		}
		else { // Bacground page is accessible, all was loaded inside it, so get from there
		  refreshOptionsBgnd(backgroundPage);
		  changedOptions();
		}
	  }
	  else if (msg.startsWith("savedSearchOptions")) { // Reload and process search options
		// Refresh options
		if ((backgroundPage == undefined) || (backgroundPage.ready == undefined)) { // Load by ourselves
		  refreshOptionsLStore()
		  .then(setSearchOptions)
		  .catch( // Asynchronous, like .then
			function (err) {
			  let msg = "Error on processing changedOptions : "+err;
			  console.log(msg);
			  if (err != undefined) {
				console.log("fileName:   "+err.fileName);
				console.log("lineNumber: "+err.lineNumber);
			  }
			}
		  );
		}
		else { // Bacground page is accessible, all was loaded inside it, so get from there
		  refreshOptionsBgnd(backgroundPage);
		  setSearchOptions();
		}
	  }
	  else if (msg.startsWith("resetSizes")) { // Option page reset sizes button was pressed
		// Reset of search pane height
		SearchResult.style.height = "";
	  }
	  else if (msg.startsWith("notifFFReload")) { // Signal we are manually reloading bookmarks, preventing all interaction until reload
		NotifReloadStyle.visibility = "visible";
	  }
	  else if (msg.startsWith("notifAutoFFReload")) { // Signal we are reloading bookmarks, preventing all interaction until reload
		NotifAutoReloadStyle.visibility = "visible";
	  }
	  else if (msg.startsWith("reload")) { // Reload ourselves
		window.location.reload();
	  }
	  else if (msg.startsWith("asyncFavicon")) { // Got a favicon uri to display
		let bnId = request.bnId;
		let uri = request.uri;
		if (backgroundPage == undefined) { // If we are a private window, we have our own copy of curBNList
		  // Maintain it up to date
		  curBNList[bnId].faviconUri = uri;
		}

		// Set image
		let row = curRowList[bnId]; // Retrieve row holding the icon
//trace("BN.id: "+bnId+" index: "+row.rowIndex+" Row id: "+row.dataset.id+" uri: "+uri);
		if (row != undefined) { // May happen on most visited and recent bookmarks when they are not yet ready
		  let img = row.firstElementChild.firstElementChild.firstElementChild;
		  img.src = uri;
		}
//		else {
//consolde.log("null row for: "+bnId);
//		}

		// Call refresh search if there is one active to update any result with that BTN
		refreshFaviconSearch(bnId, uri);
	  }
	  else if (msg.startsWith("showBookmark")) { // Demand to show a bookmark originating from BSP2 icon context menu
		let wId = request.wId;
		let tabId = request.tabId;
		let bnId = request.bnId;
		if (myWindowId == wId) { // This is for us
//console.log("Received message in "+wId+" to show "+bnId+" for tab "+tabId);
		  // Use the search mode to allow coming back to normal view after show
		  // This consists in disabling the searchbox and putting some text in it to reflect the action,
		  // then execute a search and show for bnId
		  SearchTextInput.disabled = true;
		  SearchTextInput.value = "<show bookmark for tab "+tabId+">";
		  enableCancelSearch();
		  let bn = curBNList[bnId]; // We are protected already, by checking bnId before sending the message
		  displayResults([bn]);
		  let row = curRowList[bnId];
		  showRow(row);
		}
	  }
	  else if (msg.startsWith("bkmkCreated")) { // Got a BN subtree to add to display
		bkmkCreated(BN_deserialize(request.newtree), request.index);
	  }
	  else if (msg.startsWith("bkmkRemoved")) {
		bkmkRemoved(request.bnId);
	  }
	  else if (msg.startsWith("bkmkChanged")) {
		bkmkChanged(request.bnId, request.isBookmark, request.title, request.url, request.uri);
	  }
	  else if (msg.startsWith("bkmkMoved")) {
		bkmkMoved(request.bnId, request.curParentId, request.targetParentId, request.targetIndex);
	  }
	  else if (msg.startsWith("bkmkReordered")) {
		bkmkReordered(request.bnId, request.reorderInfo);
	  }
	}

	// Answer
	sendResponse(
	  {content: "Sidebar:"+myWindowId+" response to "+request.source		
	  }
	);
  }
  catch (error) {
	console.log("Error processing message: "+request.content);
	if (error != undefined) {
	  console.log("message:    "+error.message);
	  console.log("fileName:   "+error.fileName);
	  console.log("lineNumber: "+error.lineNumber);
	}
  }
}

/*
 * Fire when the sidebar is closed
 */
function closeHandler (e) {
//  console.log("Sidebar close: "+e.type);

  // If running in sidebar, signal to background page we are going off
  if (isInSidebar) {
	if (backgroundPage != undefined) {
	  backgroundPage.closeSidebar(myWindowId);
	}
	else {
	  sendAddonMessage("Close:"+myWindowId);
	}
  }
}

/*
 * Fire when we lose keyboard focus
 * Used to close any context menu when open
 */
function onBlur (aEvent) {
  clearMenu();
}

/*
 * Fire when there is a mouse wheel event
 * Used to disable zooming with Ctrl+mouse wheel
 */
function onWheel (aEvent) {
  if (aEvent.ctrlKey && !aEvent.altKey && !aEvent.metaKey && !aEvent.shiftKey) {
	aEvent.preventDefault();
  }
}

/*
 * A "Promise-ified" sleep based on setTimeout ..
 */
function sleep (ms) {
  return new Promise (resolve => setTimeout(resolve, ms));
}

/*
 * Finish the initial display of favicons in background after display of bookmark tree
 */
const Fluidity = 40;
const Bunch = 250;
let bunchCount = 0;
let tt1, tt2;
async function completeFavicons (BN = undefined) {
  let children;
  if (BN == undefined) { // We are at start
	let t1 = new Date ();
	tt1 = Performance.now();
	children = rootBN.children;
	let len = children.length;
	for (let i=0 ; i<len ; i++) {
	  await completeFavicons(children[i]);
	}
	let t2 = new Date ();
	trace("Favicon display duration: "+(t2.getTime() - t1.getTime())+" ms", true);
  }
  else if ((BN.type == "folder") && ((children = BN.children) != undefined)) {
	// If there are children, recursively explore them
	let len = children.length;
	for (let i=0 ; i<len ; i++) {
	  await completeFavicons(children[i]);
	}
  }
  else if (BN.type == "bookmark") {
	// Give a chance to other events every Bunch
	if (++bunchCount > Bunch) {
	  // Impose a minimum count, and then
	  // give a chance to other events every Fluidity ms (40 ms = 25 times per second)
	  tt2 = Performance.now();
	  if (tt2 - tt1 >= Fluidity) {
		bunchCount = 0;
		tt1 = tt2;
		await sleep(0);
	  }
	}

	// Display the favicon
	let row = curRowList[BN.id];
	if (row != undefined) { // undefined may happen with most visited sites and recent bookmarks at add-on start
	  let img = row.firstElementChild.firstElementChild.firstElementChild;
	  img.src = BN.faviconUri;
	}
  }
}

/*
 * Complete the initial display of bookmarks table
 */
function completeDisplay () {
  savedFldrOpenList = undefined;
  isDisplayComplete = true;
  WaitingImg.hidden = true; // Stop displaying the waiting glass
//  if (delayLoad_option)
//	Bookmarks.appendChild(docFragment); // Display the table of bookmarks + reflow
  endDisplayTime = new Date ();
  trace("Display duration: "+(endDisplayTime.getTime() - endGetTreetime.getTime())+" ms", true);
  trace("Total duration: "+(endDisplayTime.getTime() - startTime.getTime())+" ms", true);

  // Finish displaying favicons asynchronously
  if (!disableFavicons_option && !immediateFavDisplay_option) {
	setTimeout(completeFavicons, 0);
  }

  // If 16x16 migration is planned but nothing scheduled yet, do it
  if (migration_img16 && (migrationTimeout == null)) {
	migrationTimeout = setTimeout(trigMigrate16x16, Migr16x16Timeout);
  }


  // Setup mouse handlers for bookmarks and results
  SearchResult.addEventListener("click", resultsMouseHandler);
  Bookmarks.addEventListener("click", bkmkMouseHandler);
  SearchResult.addEventListener("contextmenu", resultsContextHandler);
  Bookmarks.addEventListener("contextmenu", bkmkContextHandler);
  SearchResult.addEventListener("auxclick", resultsAuxHandler);
  Bookmarks.addEventListener("auxclick", bkmkAuxHandler);
  SearchResult.addEventListener("scroll", rsltScrollHandler);
  Bookmarks.addEventListener("scroll", bkmkScrollHandler);
  if (isLinux) {
	Bookmarks.addEventListener("dragenter", bkmkMouseEnterHandler, true);
	Bookmarks.addEventListener("dragexit", bkmkMouseLeaveHandler, true);
	Bookmarks.addEventListener("dragleave", bkmkMouseLeaveHandler, true);
	SearchResult.addEventListener("dragenter", rsltMouseEnterHandler, true);
	SearchResult.addEventListener("dragexit", rsltMouseLeaveHandler, true);
	SearchResult.addEventListener("dragleave", rsltMouseLeaveHandler, true);
  }

  // Setup mouse handlers for search buttons
  ResetFiltersButtonInput.addEventListener("click", resetFiltersButtonHandler);
  SearchButtonInput.addEventListener("click", searchButtonHandler);
  SearchButtonInput.addEventListener("contextmenu", searchButtonHandler);

  // General event handlers for a click anywhere in the document .. used to clear menus
  // and prevent default menus
  addEventListener("keydown", keyHandler);
  addEventListener("click", clickHandler);
  addEventListener("mousedown", noDefaultAction);
  addEventListener("contextmenu", noDefaultAction);
  addEventListener("auxclick", noDefaultAction);
  addEventListener("blur", onBlur);
  addEventListener('wheel', onWheel, {capture: true}); // To disable zooming

  if (!beforeFF64) { // Handle integrated FF menu items on sidebar
	browser.menus.onClicked.addListener(onClickedContextMenuHandler);
	browser.menus.onHidden.addListener(onHiddenContextMenuHandler);
  }

  // Detect when sidebar is closed
//  addEventListener("beforeunload", closeHandler);
//  addEventListener("pagehide", closeHandler);
  addEventListener("unload", closeHandler);
//  window.onclose = closeHandler;

  // Event handlers for drag & drop
  Bookmarks.addEventListener("dragstart", bkmkDragStartHandler);
  Bookmarks.addEventListener("dragend", bkmkDragEndHandler);
  SearchResult.addEventListener("dragstart", resultsDragStartHandler);
  SearchResult.addEventListener("dragend", resultsDragEndHandler);
  Bookmarks.addEventListener("dragenter", bkmkDragEnterHandler);
  Bookmarks.addEventListener("dragover", bkmkDragOverHandler);
  Bookmarks.addEventListener("dragleave", bkmkDragLeaveHandler);
  Bookmarks.addEventListener("dragexit", bkmkDragExitHandler);
  Bookmarks.addEventListener("drop", bkmkDropHandler);
  SearchResult.addEventListener("dragenter", rsltDragEnterHandler);
  SearchResult.addEventListener("dragover", rsltDragOverHandler);
  SearchResult.addEventListener("dragleave", rsltDragLeaveHandler);
  SearchResult.addEventListener("dragexit", rsltDragExitHandler);

  let computedStyle = window.getComputedStyle(MyBProtMenu, null);
  trace("fontFamily = '"+computedStyle["fontFamily"]+"'", true);
  trace("fontSize   = '"+computedStyle["fontSize"]+"'", true);
//  for (let prop in computedStyle) {
//    trace(prop+" = '"+computedStyle[prop]+"'");
//  }

  // If we are running in the sidebar, signal to background page we are here,
  // and show laat selected bookmark if any
  if (isInSidebar) {
	if (backgroundPage == undefined) {
	  sendAddonMessage("New:"+myWindowId);
	}
	else {
	  // Trace stats
	  trace("Stats:\r\n------", true);
	  trace("Bookmarks:         "+countBookmarks, true);
	  trace("Favicons to fetch: "+countFetchFav, true);
	  trace("Folders:           "+countFolders, true);
	  trace("Separators:        "+countSeparators, true);
	  trace("Oddities:          "+countOddities, true);
	  trace("--------------------", true);

	  let bnId = backgroundPage.newSidebar(myWindowId);
	  goBkmkItem(bnId);
	}
  }

  // Focus on searchtext input at initial load
//  window.focus();
//  SearchTextInput.focus();
}

/*
 * Recursively display depth first a BookmarNode tree
 *
 * BN = BookmarkNode
 */
function displayTreeBN (BN) {
  insertBookmarkBN(BN);

  // If there are children, recursively display them
  let children;
  if ((BN.type == "folder") && ((children = BN.children) != undefined)) {
	let len = children.length;
	for (let i=0 ; i<len ; i++) {
	  displayTreeBN(children[i]);
	}
  }
}

/*
 * Recursively explore depth first a bookmark and its children if open/visible, else enqueue
 * width first for future display.
 *
 * BTN = BookmarkTreeNode
 * level = integer, the tree depth
 * 
 * Queues to global variable delayedBookmarksQueue.
 * 
 * Note: make this an async function as we do not want any disorder ...
 */
/*
let delayedBookmarksQueue = [];
async function exploreWidth (BTN, level) {
//  trace("BTN.id: "+BTN.id+" type: "+BTN.type);
  // If folder, get children first to know the type of twisitie to set ..
  if (getType(BTN) == "folder") {
//    trace(BTN.id+" children: "+BTN.children, true);
	let t1 = new Date();
	let children = await browser.bookmarks.getChildren(BTN.id);
	let t2 = new Date();
	trace(BTN.id+" children load duration: "+(t2.getTime() - t1.getTime())+" ms", true);
	trace("      Number of children nodes: "+children.length, true);
	insertBookmark(BTN, level, -1, children);

	// If folder is open, get children now, else enqueue for later
	if (curFldrOpenList[BTN.id]) {
      // Recursively display children
      for (let i of children) {
    	// Need to await as an async function is returning a Promise by definition
        await exploreWidth(i, level+1);
      }
    }
	else {
	  delayedBookmarksQueue.push([level, BTN]);
	}
  }
  else {
	insertBookmark(BTN, level);
  }
}
*/

/*
 * Search for and recursively display depth first a bookmark of a given id in the array
 * as long as visible/open, then switch to width first
 *
 * a_BTN = array of BookmarkTreeNode
 * id = string, the node id looked for
 * level = integer, the tree depth
 */
/*
async function delayLoadBkmkId (a_BTN, id, level) {
  for (let i of a_BTN) {
    if (i.id == id) {
      await exploreWidth(i, level);
      break;
    }
  }
}
*/

/*
 * Callback for about:config browser.tabs.loadBookmarksInTabs setting
 */
function openBookmarksInNewTabs_change (value) {
  openBookmarksInNewTabs_option = value.value;
//  console.log("openBookmarksInNewTabs_option: "+openBookmarksInNewTabs_option);
}

/*
 * Callback for about:config browser.search.openintab setting
 */
function openSearchResultsInNewTabs_change (value) {
  openSearchResultsInNewTabs_option = value.value;
//  console.log("openSearchResultsInNewTabs_option: "+openSearchResultsInNewTabs_option);
}

/*
 * Set font size for the page
 * 
 * fs = Integer, size in px
 */
function setPageFontSize (fs) {
  let fontSize = fs + "px";  
  Body.style.fontSize = fontSize;
  SearchTextInput.style.fontSize = fontSize;
}

/*
 * Set menus size
 * 
 * ms = Integer, size in px
 */
function setMenuSize (ms) {
  let menuSize = ms + "px";  
  MyRBkmkMenuStyle.width = menuSize;
  MyRShowBkmkMenuStyle.width = menuSize;
  MyRFldrMenuStyle.width = menuSize;
  MyBBkmkMenuStyle.width = menuSize;
  MyBResBkmkMenuStyle.width = menuSize;
  MyBFldrMenuStyle.width = menuSize;
  MyBResFldrMenuStyle.width = menuSize;
  MyBSepMenuStyle.width = menuSize;
  MyBProtMenuStyle.width = menuSize;
  MyBProtFMenuStyle.width = menuSize;
}

/*
 * Get a particular CSSStyleRule from a CSSRuleList
 * 
 * cssRules = CSSRuleList to get a CSSStyleRule from
 * selectorText = String, name of wanted CSSStyleRule
 * 
 * Returns the wanted CSSStyleRule
 */
function getStyleRule (cssRules, selectorText) {
  let len = cssRules.length;
  let i;
  for (let j=0 ; j<len ; j++) {
	i = cssRules[j];
	if (i.selectorText == selectorText) {
	  return(i);
	}
  }
}

/*
 * Set cssRule .rbkmkitem_b cursor to default or pointer depending on click mode
 * 
 *  is_advanced = Boolean
 */
function setRBkmkItemBCursor (is_advanced) {
  // Retrieve the CSS rules to modify
  let a_ss = document.styleSheets;
  let ss = a_ss[0];
  let cssRules = ss.cssRules;
  let cssStyleRule;
  let style;

  cssStyleRule = getStyleRule(cssRules, ".rbkmkitem_b");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("cursor", (is_advanced ? "pointer" : "default"));
}

/*
 * Set cssRules background colors to a given value
 * 
 * prop = a String holding color value to apply. If null or undefined, goes back to default
 */
function setBackgroundColors (cssRules, prop) {
  let cssStyleRule;
  let style;

  if ((prop == undefined) || (prop == null)) {
	prop = "white";
  }

  cssStyleRule = getStyleRule(cssRules, "html, body");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("background-color", prop);

  cssStyleRule = getStyleRule(cssRules, "#bookmarks");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("border-top-color", prop);

  cssStyleRule = getStyleRule(cssRules, ".brow");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("background-color", prop);
  style.setProperty("border-color", prop);
}

/*
 * Set cssRules text colors to a given value
 * 
 * prop = a String holding color value to apply. If null or undefined, goes back to default
 */
function setTextColors (cssRules, prop) {
  let cssStyleRule;
  let style;

  if ((prop != undefined) && (prop != null)) {
	sidebarTextColor = prop;

	cssStyleRule = getStyleRule(cssRules, "html, body");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("color", prop);

	cssStyleRule = getStyleRule(cssRules, ".favseparator");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("border-bottom-color", prop);

	// Force a visible text color when highlighting a cell (= default FF value in nm/default theme mode)
	cssStyleRule = getStyleRule(cssRules, ".selbrow");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("color", HighlightTextColor);

	cssStyleRule = getStyleRule(cssRules, ".brow:hover, .selbrow:hover");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("color", HighlightTextColor);

	cssStyleRule = getStyleRule(cssRules, ".brow:focus, .selbrow:focus");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("color", HighlightTextColor);
  }
  else {
	sidebarTextColor = undefined;

	cssStyleRule = getStyleRule(cssRules, "html, body");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.removeProperty("color");

	// Force a visible text color when highlighting a cell (= default FF value in nm/default theme mode)
	cssStyleRule = getStyleRule(cssRules, ".selbrow");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.removeProperty("color");

	cssStyleRule = getStyleRule(cssRules, ".brow:hover, .selbrow:hover");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.removeProperty("color");

	cssStyleRule = getStyleRule(cssRules, ".brow:focus, .selbrow:focus");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.removeProperty("color");

	cssStyleRule = getStyleRule(cssRules, ".favseparator");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("border-bottom-color", HighlightTextColor);
  }
}

/*
 * Set back panel colors to default
 */
function resetPanelColors () {
  // Retrieve the CSS rules to modify
  let a_ss = document.styleSheets;
  let ss = a_ss[0];
  let cssRules = ss.cssRules;

  setBackgroundColors(cssRules, undefined);
  setTextColors(cssRules, undefined);
}

/*
 * Initialization colors with those of the current windows theme
 * 
 * wTheme is a theme.Theme object
 */
function setPanelColors (wTheme) {
  let propColors = wTheme.colors;
  if ((propColors == undefined) || (propColors == null)) { // No colors part => reset to default
														   // (can also happen when active theme is default)
	resetPanelColors();
  }
  else {
	// Retrieve the CSS rules to modify
	let a_ss = document.styleSheets;
	let ss = a_ss[0];
	let cssRules = ss.cssRules;

	setBackgroundColors(cssRules, propColors.sidebar);
	setTextColors(cssRules, propColors.sidebar_text);
  }
}

/*
 * Initialization colors with specified ones
 * 
 * tc and bc are String
 */
function setPanelColorsTB (tc, bc) {
  // Retrieve the CSS rules to modify
  let a_ss = document.styleSheets;
  let ss = a_ss[0];
  let cssRules = ss.cssRules;

  setBackgroundColors(cssRules, bc);
  setTextColors(cssRules, tc);
}

/*
 * Handle changes to FF window theme
 */
function themeRefreshedHandler (updateInfo) {
  let wId = updateInfo.windowId;
  if ((wId == undefined) || (wId = myWindowId)) {
	browser.theme.getCurrent(myWindowId)
	.then(setPanelColors);
  }
}

/*
 * Set folder image as per options
 */
function setPanelFolderImg (useAltFldr_option, altFldrImg_option) {
  // Retrieve the CSS rules to modify
  let a_ss = document.styleSheets;
  let ss = a_ss[0];
  let cssRules = ss.cssRules;
  let cssStyleRule;
  let style;

  cssStyleRule = getStyleRule(cssRules, ".ffavicon");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("background-image", (useAltFldr_option ? "url(\""+altFldrImg_option+"\")"
	  													   : "url(\"/icons/folder.png\")"
	  									)
	  			   );
}

/*
 * Set UI overall fonts, sizes, spacing ..
 */
function setupUI () {
  // Set pointer on result bookmark items according to Click mode setting
  setRBkmkItemBCursor(advancedClick_option);

  // Set font size, and menus size accordingly
  let fs;
  if (setFontSize_option && (fontSize_option != undefined)) {
	fs = fontSize_option;
  }
  else {
	fs = DfltFontSize;
  }
  // Some variations depending on platform
  // Font "caption" turns to:
  // Windows 10 -> font: 12px "Segoe UI";
  // Windows 7  -> font: 12px serif; However 12px "Segoe UI" seems to work also, so forcing it
  // Linux      -> font: 13px "Sans"; Using a size of "12px", better
  // Mac        -> font: 13px "-apple-system"; Using a size of "12px", better
  trace("PlatformOs: "+platformOs, true);
  if (platformOs == "win") {
	trace("Setting Windows variations", true);
	Body.classList.replace("fontdflt", "fontwin");
	SearchTextInput.classList.replace("fontdflt", "fontwin");
	if (fs != DfltFontSize) {
	  setPageFontSize(fs);
	  let ms = Math.floor((DfltMenuSize - 20) * fs / DfltFontSize) + 20;
	  if (fs < 12)
	  	ms += 10 * fs / DfltFontSize;
	  setMenuSize(ms);
	}
  }
  else if (platformOs == "linux") {
	trace("Setting Linux variations", true);
	isLinux = true;
	setPageFontSize(fs);
	let ms = Math.floor((DfltMenuSizeLinux - 20) * fs / DfltFontSize) + 20;
	if (fs < 12)
	  ms += 5 * fs / DfltFontSize;
	setMenuSize(ms);
  }
  else if (platformOs == "mac") {
	trace("Setting Mac variations", true);
	setPageFontSize(fs);
	if (fs != DfltFontSize) {
	  let ms = Math.floor(DfltMenuSize * fs / DfltFontSize);
	  if (fs < 12)
	  	ms += 5 * fs / DfltFontSize;
	  setMenuSize(ms);
	}
  }

  // Set spacing between bookmark items
  if (setSpaceSize_option && (spaceSize_option != undefined)) {
	let padding = spaceSize_option / 2;

	// Retrieve the CSS rules to modify
	let a_ss = document.styleSheets;
	let ss = a_ss[0];
	let cssRules = ss.cssRules;
	let cssStyleRule;
	let style;

	cssStyleRule = getStyleRule(cssRules, ".bkmkitem_b");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("padding-top", padding+"px");
	style.setProperty("padding-bottom", padding+"px");

	cssStyleRule = getStyleRule(cssRules, ".bkmkitem_f");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("padding-top", padding+"px");
	style.setProperty("padding-bottom", padding+"px");

	cssStyleRule = getStyleRule(cssRules, ".bkmkitem_s");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("padding-top", padding+"px");
	style.setProperty("padding-bottom", padding+"px");
  }

  // Align colors with window theme
  if (matchTheme_option) {
	browser.theme.getCurrent(myWindowId)
	.then(setPanelColors);

	// Register listener
	browser.theme.onUpdated.addListener(themeRefreshedHandler);
  }
  else { // If set colors option is set, align colors with specified values
	if (setColors_option) {
	  // Align colors with chosen ones 
	  setPanelColorsTB(textColor_option, bckgndColor_option);
	}
  }

  // Set folder image as per options
  if (useAltFldr_option) {
	setPanelFolderImg(true, altFldrImg_option);
  }
}

/*
 * Initialization phase 2: we loaded all, either locally (private browsing),
 * either through background + local.
 * Finalize getting the tree and then display it.
 */
function initialize2 () {
  waitingInitBckgnd = false; // not waiting anymore

  // Get data from appropriate source
  if (backgroundPage == undefined) { // We just received a json-ified BookmarkNode tree in curBNList from Background msg
	rootBN = BN_deserialize(curBNList);
	curBNList = {};
	rebuildBNList(curBNList, rootBN);
	if (mostVisitedBNId != undefined)
	  mostVisitedBN = curBNList[mostVisitedBNId];
	if (recentTagBNId != undefined)
	  recentTagBN = curBNList[recentTagBNId]; 
	if (recentBkmkBNId != undefined)
	  recentBkmkBN = curBNList[recentBkmkBNId];
  }
  else { // Get values directly from background which is now ready
	// Get stats
	loadDuration = backgroundPage.loadDuration;
	trace("Background load local store duration: "+loadDuration+" ms", true);
	treeLoadDuration = backgroundPage.treeLoadDuration;
	if (backgroundPage.bypassedFFAPI) {
	  trace("Background bypassed FF API for tree load", true);
	}
	trace("Background tree load duration: "+treeLoadDuration+" ms", true);
	treeBuildDuration = backgroundPage.treeBuildDuration;
	trace("Background tree build duration: "+treeBuildDuration+" ms", true);
	saveDuration = backgroundPage.saveDuration;
	isSlowSave = backgroundPage.isSlowSave;
	trace("Background save duration: "+saveDuration+" ms", true);
	trace("isSlowSave: "+isSlowSave, true);
	countBookmarks = backgroundPage.countBookmarks;
	countFetchFav = backgroundPage.countFetchFav;
	countFolders = backgroundPage.countFolders;
	countSeparators = backgroundPage.countSeparators;
	countOddities = backgroundPage.countOddities;
	mostVisitedBNId = backgroundPage.mostVisitedBNId;
	mostVisitedBN = backgroundPage.mostVisitedBN;
	recentTagBNId = backgroundPage.recentTagBNId;
	recentTagBN = backgroundPage.recentTagBN; 
	recentBkmkBNId = backgroundPage.recentBkmkBNId;
	recentBkmkBN = backgroundPage.recentBkmkBN;

	// Get options and curBNList / rootBN
	refreshOptionsBgnd(backgroundPage);
	TracePlace.hidden = !traceEnabled_option;

	curBNList = backgroundPage.curBNList;
	rootBN = backgroundPage.rootBN;
  }
  endGetTreetime = new Date ();
  trace("Get tree duration: "+(endGetTreetime.getTime() - endLoadTime.getTime())+" ms", true);

  // Set the scene ..
  setupUI();
  setSearchOptions();

  if (searchHeight_option != undefined) { // Set current saved size 
	SearchResult.style.height = searchHeight_option; 
	// Note: to reset the height to CSS default ("20%"), just set
	//  SearchResult.style.height = "";
	//  let computedStyle = window.getComputedStyle(SearchResult, null);
	//  console.log("computed height: "+computedStyle["height"]);
	// will show "20%"
  }
//	else {
//	  // Reset of search pane height
//	  SearchResult.style.height = "";
//	}

  trace("structureVersion: "+structureVersion, true);
  trace("disableFavicons_option: "+disableFavicons_option, true);
  trace("pauseFavicons_option: "+pauseFavicons_option, true);
  if (!structureVersion.includes(VersionImg16)) {
	// Remember to trigger img16 migration later
	migration_img16 = true;
  }

  // Catch changes to the search box contents
  // (including when we clear its contents programmatically ..)
  SearchTextInput.addEventListener("input", manageSearchTextHandler);

  // Catch clicks on the Cancel search button
  CancelSearchInput.addEventListener("click", cancelSearchTextHandler);
//    CancelSearchInput.addEventListener("contextmenu", contextSearchTextHandler);

  // Display the bookmarks tree inside the sidebar table
  // Create a Document Fragment to go faster (work is in memory only, no reflow.
  // It will get appended at end, when last bookmark item is created
  // Well, as a matter of fact, this is slightly longer by 10% ... I guess because doing it
  //  while not yet displaying ...
  WaitMsg.textContent = "Prepare tree display..";
//  docFragment = document.createDocumentFragment();
  bookmarksTable = document.createElement("table");
//  docFragment.appendChild(bookmarksTable);
  Bookmarks.appendChild(bookmarksTable);

  highest_open_level = 0;
  let children = rootBN.children;
  let len = children.length;
  for (let i=0 ; i<len ; i++) {
	displayTreeBN(children[i]);
  }
  completeDisplay();

  // Display our version number
/*
  browser.management.getSelf()
  .then(
	function (extensionInfo) {
	  selfName = extensionInfo.name;
	  let version = extensionInfo.version;
	  trace("BSP2 version: "+version, true);
//	  let title1 = selfName + " v" +version;
	  let title2 = selfName + "\nv" +version;
	  // Not needed to set the sidebar title, it is set by default
//	  if (isInSidebar) {
//		browser.sidebarAction.setTitle(
//		  {title: selfName
//		  }
//		);
//	  }
//	  MGlassImg.title = title2;
	  SearchButtonInput.title = title2;
	}
  );
*/
}

/*
 * Initialization phase 1 for private windows = get CurBNList from background
 * and then link to initialization phase 2
 */
function initializePriv () {
  f_initializeNext = initialize2;
  sendAddonMessage("getCurBNList");
}

/*
 * Display wait message on screen
 * 
 * text = message to display
 * force = display even if trace not enabled
 */
function waitMsg (text) {
  WaitMsg.textContent = text;
}

/*
 * Initialization phase 0
 */
function initialize () {
  if (beforeFF57) {
//    trace("FF before 57.0: "+BuildID, true);
    trace("FF before 57.0: "+ffversion, true);
  }

  // Watch for background script messages
  browser.runtime.onMessage.addListener(handleAddonMessage);

  startTime = new Date();
  if (backgroundPage == undefined) { // Private window, load by ourselves, except SavedBNList
	waitMsg("Load saved state..");
	let p = readFullLStore(true, waitMsg);
	Promise.all([p_getWindowId, p]) // Make sure we get myWindowId as we can directly call a function using it
	.then(
	  function (a_values) { // An array of one value per Promise is returned
		// Handle myWindowId
		let windowInfo = a_values[0];
		myWindowId = windowInfo.id;

		// Process read values from Store (they are already in Global variables from libstore.js)
		endLoadTime = new Date();
		trace("Load local store duration (full): "+(loadDuration = (endLoadTime.getTime() - startTime.getTime()))+" ms", true);
		TracePlace.hidden = !traceEnabled_option;

		if (backgroundReady) {
//console.log("Background is Ready 2");
		  initializePriv();
		  WaitMsg.textContent = "Load from background..";
		}
		else {
//console.log("Waiting on Background 2");
		  f_initializeNext = initializePriv;
		  waitingInitBckgnd = true;
		  WaitMsg.textContent = "Wait background load..";
		  // In case Background is already ready, but we missed the signalling message because
		  // we started after it was sent, provoke its resend ..
		  sendAddonMessage("getBackground");
		}
	  }
	)
	.catch( // Asynchronous, like .then
	  function (err) {
		let msg = "Error on loading from local storage 1 : "+err;
		trace(msg, true);
	  }
	);
  }
  else { // Background page is accessible, all is loaded inside it, so we will get from there
	// Only load folders state
	WaitMsg.textContent = "Load saved state..";
	let p = readFoldersLStore(waitMsg);
	Promise.all([p_getWindowId, p]) // Make sure we get myWindowId as we can directly call a function using it
	.then(
	  function (a_values) { // An array of one value per Promise is returned
		// Handle myWindowId
		let windowInfo = a_values[0];
		myWindowId = windowInfo.id;

		// Process read values from Store (they are already in Global variables from libstore.js)
		endLoadTime = new Date();
		trace("Load local store duration (folders only): "+(loadDuration = (endLoadTime.getTime() - startTime.getTime()))+" ms", true);

		if (backgroundPage.ready) {
//		  console.log("Background is Ready 1");
		  initialize2();
		}
		else { // Wait for Background to complete initialization
//		  console.log("Waiting on Background 1");
		  f_initializeNext = initialize2;
		  waitingInitBckgnd = true;
		  WaitMsg.textContent = "Wait background load..";
		}
	  }
	)
	.catch( // Asynchronous, like .then
	  function (err) {
		let msg = "Error on loading from local storage 2 : "+err;
		trace(msg, true);
	  }
	);
  }

  let bSettings = browser.browserSettings;
  if (bSettings != undefined) {
	// Get about:config browser.tabs.loadBookmarksInTabs setting
	let openBookmarksInNewTabs_setting = bSettings.openBookmarksInNewTabs;
	if (openBookmarksInNewTabs_setting != undefined) {
// Not supported in FF (yet ?)
//	  openBookmarksInNewTabs_setting.onChange.addListener(openBookmarksInNewTabs_change);
	  openBookmarksInNewTabs_setting.get({})
	  .then(openBookmarksInNewTabs_change);
	}
	// Get about:config browser.search.openintab setting
	let openSearchResultsInNewTabs_setting = bSettings.openSearchResultsInNewTabs;
	if (openSearchResultsInNewTabs_setting != undefined) {
// Not supported in FF (yet ?)
//	  openSearchResultsInNewTabs_setting.onChange.addListener(openSearchResultsInNewTabs_change);
	  openSearchResultsInNewTabs_setting.get({})
	  .then(openSearchResultsInNewTabs_change);
	}
  }
}


/*
 * Main code:
 * ----------
*/
// Start when we have the platform, the background page, FF version and tab info
Promise.all([p_platform, p_background, p_ffversion, p_getTab])
.then(
  function (a_values) { // An array of one value per Promise is returned
	p_platform = p_background = p_ffversion = p_getTab = undefined;

	// Rerieve values in the same order
	platformOs = a_values[0].os; // info object
	let page = a_values[1];
	let info = a_values[2];
	let tabInfo = a_values[3];
	beforeFF57 = ((ffversion = info.version) < "57.0");
	beforeFF58 = (ffversion < "58.0");
	beforeFF64 = (ffversion < "64.0");

	// In a private browsing window (incognito), this will be null
	if (page != null) { // Not in a private browsing window
	  backgroundPage = page;
	}
	else { // In a private browsing window
	  trace("In private browsing window", true);
	}

	// In a sidebar, this will be undefined
	if (tabInfo == undefined) { // If undefined, we are running in sidebar, not in a tab
//console.log("is in sidebar");
	  isInSidebar = true;
	}

	initialize();
  }
);