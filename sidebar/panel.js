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
let beforeFF63;
let beforeFF64;
let beforeFF109;
let ffversion;
let p_ffversion = browser.runtime.getBrowserInfo();

const Performance = window.performance;
const Body = document.querySelector("#body"); // Assuming it is an HTMLBodyElement
const SearchBox = document.querySelector("#searchbox"); // Assuming it is an HTMLDivElement
const SearchBoxStyle = SearchBox.style;
const ButtonContainer = document.querySelector("#buttoncontainer"); // Assuming it is an HTMLDivElement
const ButtonContainerStyle = ButtonContainer.style;
const ExpandMenuButtonInput = document.querySelector("#expmenu"); // Assuming it is an HTMLButtonElement
const TwistMenuImg = document.querySelector("#twistmenu"); // Assuming it is an HTMLDivElement
const ResetFiltersButtonInput = document.querySelector("#sresetflt"); // Assuming it is an HTMLButtonElement
const ResetFiltersButtonInputStyle = ResetFiltersButtonInput.style;
const SearchButtonInput = document.querySelector("#sbutton"); // Assuming it is an HTMLButtonElement
const MGlassImg = document.querySelector("#mglass"); // Assuming it is an HTMLDivElement
const MGlassImgStyle = MGlassImg.style;
const SearchTextInput = document.querySelector("#searchtext"); // Assuming it is an HTMLInputElement
const SearchDatalist = document.querySelector("#searchlist"); // Assuming it is an HTMLDataListElement
const SearchListMax = 5; // Must be >= 3
const CancelSearchInput = document.querySelector("#cancelsearch"); // Assuming it is an HTMLInputElement
const ExpandedMenu = document.querySelector("#secondrow"); // Assuming it is an HTMLDivElement
const ExpandedMenuStyle = ExpandedMenu.style;
const UndoButtonInput = document.querySelector("#butundo"); // Assuming it is an HTMLButtonElement
const RedoButtonInput = document.querySelector("#butredo"); // Assuming it is an HTMLButtonElement
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
const MyRFldrMenuCut = document.querySelector("#myrfldrmenucut");
const MyRFldrMenuCopy = document.querySelector("#myrfldrmenucopy");
const MyRFldrMenuDel = document.querySelector("#myrfldrmenudel");
const MyRMultMenu = document.querySelector("#myrmultmenu");
const MyRMultMenuStyle = MyRMultMenu.style;
const MyRMultMenuOpenTab = document.querySelector("#myrmultmenuopentab");
const MyRMultMenuOpenWin = document.querySelector("#myrmultmenuopenwin");
const MyRMultMenuOpenPriv = document.querySelector("#myrmultmenuopenpriv");
const MyRMultMenuCut = document.querySelector("#myrmultmenucut");
const MyRMultMenuCopy = document.querySelector("#myrmultmenucopy");
const MyRMultMenuDel = document.querySelector("#myrmultmenudel");
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
const MyBMultMenu = document.querySelector("#mybmultmenu");
const MyBMultMenuStyle = MyBMultMenu.style;
const MyBMultMenuOpenTab = document.querySelector("#mybmultmenuopentab");
const MyBMultMenuOpenWin = document.querySelector("#mybmultmenuopenwin");
const MyBMultMenuOpenPriv = document.querySelector("#mybmultmenuopenpriv");
const MyBMultMenuCut = document.querySelector("#mybmultmenucut");
const MyBMultMenuCopy = document.querySelector("#mybmultmenucopy");
const MyBMultMenuDel = document.querySelector("#mybmultmenudel");
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
const SScopeFolderonlyInput = document.querySelector("#folderonly");
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
const DfltMenuSize = 150;
const DfltMenuSizeLinux = 170;
const OpenFolderTimeout = 1000; // Wait time in ms for opening a closed folder, when dragging over it

const SelectHighlight = "selbrow"; // Bookmark select highlight class name in CSS
const RSelectHighlight = "rselbrow"; // Result bookmark select highlight class name in CSS
const CursorHighlight = "curbrow"; // cursor highlight class name in CSS
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
//tmpElem1.classList.add("twistieac");
tmpElem1.draggable = false; // False by default for <div>
FolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
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
tmpElem1.classList.add("rtwistieac");
tmpElem1.draggable = false; // False by default for <div>
RFolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("ffavicon");
tmpElem1.draggable = false; // True by default for <img>
RFolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
RFolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("rfavpath");
tmpElem1.draggable = false; // False by default for <span>
RFolderTempl.appendChild(tmpElem1);
/*
 *******  Prepare special Folder structure for node cloning
 */
const SFolderTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
SFolderTempl.classList.add("bkmkitem_f");
SFolderTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
//tmpElem1.classList.add("twistieac");
tmpElem1.draggable = false; // False by default for <div>
SFolderTempl.appendChild(tmpElem1);
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
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("rtwistieac");
tmpElem1.draggable = false; // False by default for <div>
RSFolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("img"); // Assuming it is an HTMLImageElement
tmpElem1.classList.add("favicon");
tmpElem1.draggable = false; // True by default for <img>
RSFolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
RSFolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("rfavpath");
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
// Avoid preparing image as it is taking much time ..
// So set "display: inline-block;" in CSS .favicon instead, to reserve space in advance
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
// Avoid preparing image as it is taking much time ..
// So set "display: inline-block;" in CSS .favicon instead, to reserve space in advance
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
let isMacOS = false; // To indicate we are under MacOS, used for properly detecting the Cmd key
					 // which is Ctrl in Windows/Linux (Apple always want to do it their way, don't they ?)
let myWindowId;
let isInSidebar = false; // To detect if we are open in sidebar or in a tab
let openBookmarksInNewTabs_option = false; // Boolean
let openSearchResultsInNewTabs_option = false; // Boolean
// Declared in libstore.js
//var savedFldrOpenList; // Used to receive the open state saved in storage - Will be deleted at end
let curRowList = {}; // Current map between HN index in history list and its row for display
					 // Index is the entry number when normal node, or the string "entry+pos" for a node inside a multi record
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
let myMenu_open = false; // Indicate that our context menu is open
let isResultMenu = false; // Indicate if current open context menu is in result pane or not 
let myRBkmkMenu_open = false;
let myRShowBkmkMenu_open = false;
let myRFldrMenu_open = false;
let myRMultMenu_open = false;
let myBBkmkMenu_open = false;
let myBResBkmkMenu_open = false;
let myBFldrMenu_open = false;
let myBResFldrMenu_open = false;
let myBSepMenu_open = false;
let myBMultMenu_open = false;
let myBProtMenu_open = false;
let myBProtFMenu_open = false;
let myMGlassMenu_open = false;
let cursor = { // Cursor Object
  cell: null, // Current cursor on a row in bookmarks panel = cell, null if none selected
  bnId: undefined // BN Id of bookmark under cursor in bookmarks panel
};
let selection = { // Selection Object
  selectHighlight: SelectHighlight, // Class used for marking selection
  lastCell: null, // Last bookmark cell on which a "click" (select or clear) operation was applied
  is_select: true, // true if last action is a select operation, false if it is an unselect/clear
  selectCells: [], // List (ordered) of selected cell(s), [] if empty
  selectIds: [] // List (ordered) of selected Bookmark Id(s), [] if empty
};
let rcursor = { // Results cursor Object
  cell: null, // Current cursor on a row in bookmarks panel = cell, null if none selected
  bnId: undefined // BN Id of bookmark under cursor in bookmarks panel
};
let rselection = { // Results selection Object
  selectHighlight: RSelectHighlight, // Class used for marking selection
  lastCell: null, // Last bookmark cell on which a "click" (select or clear) operation was applied
  is_select: true, // true if last action is a select operation, false if it is an unselect/clear
  selectCells: [], // List (ordered) of selected result cell(s), [] if empty
  selectIds: [] // List (ordered) of selected result Bookmark Id(s), [] if empty
};
let selHighlightRule = "."+SelectHighlight; // Corresponding CSS rule name
let rselHighlightRule = "."+RSelectHighlight; // Corresponding CSS rule name
let bkmkClipboardIds = []; // Unique list of copied or cut Bookmark Id(s), [] if empty
let bkmkClipboard = []; // Unique list of copied or cut BookmarkNode(s), [] if empty
let isClipboardOpCut = undefined; // Boolean, false if copy operation ongoing, true if cut, undefined if empty clipboard
let bkmkDragIds = []; // Unique list of dragged Bookmark Id(s), [] if empty
let bkmkDrag = []; // Unique list of dragged BookmarkNode(s), [] if empty
let expMenu = false; // Current state of the expanded menu (true = expanded)
let canUndo = false; // To enable or disable the undo button on the expanded menu
let canRedo = false; // To enable or disable the redo button on the expanded menu
let initCanUndo; // To hold initial status of undo button received from background page
let initCanRedo; // To hold initial status of redo button received from background page

// Declared in BookmarkNode.js
//var countBookmarks, countFolders, countSeparators, countOddities, countFetchFav, countNofavicon;
//var mostVisitedBNId, recentTagBNId, recentBkmkBNId;
//var bsp2TrashFldrBNId;


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
  if (options.traceEnabled || force) {
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
 * BN = BookmarkNode
 */
function appendResult (BN) {
//trace("Displaying <<"+BN.id+">><<"+BN.title+">><<"+BN.type+">><<"+BN.url+">>");
  let type = BN.type;
  if (((options.searchFilter == "fldr") && (type == "bookmark"))
	  || ((options.searchFilter == "bkmk") && (type == "folder"))
	 ) { // Filter out the result, but continue with next ones
	return;
  }

  // Append new bookmark row inside the search results table
  let row = resultsTable.insertRow();
  row.draggable = true; // Adding this, but with no handler, avoids that the anchor inside
  						// can be dragged .. not sure of exactly why, but this is what I observe !
  let BN_id = row.dataset.id = BN.id; // Keep unique id of bookmark in the data-id attribute
  row.dataset.rslt = "true"; // Mark that this is a result row for easy identification
  curResultRowList[BN_id] = row;
  // Set cut status of the row (dim it), if corresponding to a cut row
  if ((isClipboardOpCut == true) && (bkmkClipboardIds[BN_id] != undefined)) {
	row.classList.add("cut");
  }

  // Add bookmark items in row
  let cell = row.insertCell();
  cell.classList.add("brow");
  cell.draggable = false;
  cell.tabIndex = 0;

  // Append proper contents to the cell:
  // - a <div> of class "rbkmkitem_f" or "rbkmkitem_b",
  //   for respectively folder or bookmark, containing:
  //   - a <div> (class "rtwistiexx") if a folder
  //   - an <div>, or <img> if special folder, (class "favicon")
  //   - and a <span> with text (class "favtext")
  //   - for folder results, additionally, a <span> with path to the folder (class "rfavpath") 
  if (type == "folder") {				// Folder
	// Mark that row as folder
	row.dataset.type = "folder";

	// Create elements
	let div2;
	let span;
	let pathspan;
	if (BN.fetchedUri) { // Special bookmark folder with special favicon
	  div2 = RSFolderTempl.cloneNode(true);
	  let img = div2.firstElementChild.nextElementSibling;
	  img.src = BN.faviconUri;
	  span = img.nextElementSibling;
	}
	else {
	  div2 = RFolderTempl.cloneNode(true);
	  span = div2.firstElementChild.nextElementSibling.nextElementSibling;
	}
	if (BN.inBSP2Trash) { // Set to italics
	  span.style.fontStyle = "italic";
	}
	let title = BN.title;
	span.textContent = title;
//	span.draggable = false;

	pathspan = span.nextElementSibling;
	let p = pathspan.textContent = BN_path(BN.parentId);
//	pathspan.draggable = false;

	if (options.showPath) {
	  div2.title = p;
	}
	else {
	  div2.title = title;
	}
	cell.appendChild(div2);
  }
  else {								// "bookmark"
	// Mark that row as bookmark
	row.dataset.type = "bookmark";

	// Create elements
	let url = BN.url;
	if (url == undefined) {
	  url = "<undefined!>";
	}
	let title = BN.title;
	let anchor;
	let span;
	// Retrieve current uri or set to nofavicon.png by default
	let uri = BN.faviconUri;
	if ((uri == undefined) || (uri == "/icons/nofavicon.png")) { // Clone with nofavicon image background
	  anchor = RNFBookmarkTempl.cloneNode(true);
	  span = anchor.firstElementChild.nextElementSibling;
	}
	else { // Clone normal one, and fill image
	  anchor = RBookmarkTempl.cloneNode(true);
	  let img = anchor.firstElementChild;
	  img.src = uri;
	  span = img.nextElementSibling;
	}
	if (BN.inBSP2Trash) { // Set to italics
	  span.style.fontStyle = "italic";
	}
	if (!url.startsWith("place:")) {
	  anchor.href = url;
	}
	if (options.showPath) {
	  anchor.title = BN_path(BN.parentId);
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
//	anchor.draggable = false;
	anchor.style.marginLeft = "16px";

	cell.appendChild(anchor);
  }
}

/*
 * Remove cursor and selection, if there are.
 *
 * cursor = Object describing cursor to manipulate
 * selection = Object describing the selection to manipulate
 */
function cancelCursorSelection (cursor, selection) {
  // Clear cursor
  let cellCursor = cursor.cell;
  if (cellCursor != null) {
	if (cellCursor.classList.contains(Reshidden)) {
	  cellCursor.classList.remove(Reshidden);
	}
	cellCursor.classList.remove(CursorHighlight);
  }
  // Clear selection
  let cells = selection.selectCells;
  let len = cells.length;
  if (len > 0) {
	let selectHighlight = selection.selectHighlight;
	for (let i=0 ; i<len ; i++) {
	  cells[i].classList.replace(selectHighlight, "brow");
	}
	cells.length = 0;
	selection.selectIds.length = 0;

	// Clear last select operation
	selection.lastCell = null;
	selection.is_select = true;
  }
}

/*
 * Manage selection and cursor on a cell action/move, as well as selection list of bookmark items
 * In details, move cursor to new cell, remember current cursor bnId for next FF or sidebar reopen,
 * set cell highlighting, manage selection lists.
 *
 * cell = .brow cell to set. Preserve the Reshidden flag if cellCursor is not changing.
 * cursor = Object describing cursor to manipulate
 * selection = Object describing the selection to manipulate
 * is_click = Boolean, if true, tells that a "click" (typically blank or mouse click) action was made
 * is_keep = Boolean, if true, tells that this is keeping last selection and adding to it (typically Ctrl key)
 * is_range = Boolean, if true, tells that this is not just a point click, but a range click from last "click" operation (typically Shift key)
 */
function addCellCursorSelection (cell, cursor, selection, is_click = true, is_keep = false, is_range = false) {
  // If range, impose no click, except when lastCell is null (this allows to modify current range extent with mouse, like on keyboard)
  // If no range and no keep, impose click (can happen on keyboard, but means nothing)
  let lastCell = selection.lastCell;
  if (is_range) {
	is_click = (lastCell == null);
  }
  else {
	is_click = is_click || !is_keep; // "||=" operator is not supported in all FF versions
  }

  // Move cursor if not already on cell
  let row = cell.parentElement;
  let bnId = row.dataset.id;
  let cellCursor = cursor.cell;
  if (cell != cellCursor) {
	if (cellCursor != null) {
	  cellCursor.classList.remove(CursorHighlight);
	}
	// Set cursor
	cursor.cell = cell;
	cell.classList.add(CursorHighlight);
	cursor.bnId = bnId;
	// Save cursor position
	if (backgroundPage == undefined) {
	  sendAddonMsgCurBnId(bnId);
	}
	else {
	  backgroundPage.saveCurBnId(myWindowId, bnId);
	}
  }

  // Manage current selection state if any
  let cells = selection.selectCells;
  let selectHighlight = selection.selectHighlight;
  let len = cells.length;
  if (!is_keep && (len > 0)) { // Do not keep => clear current selection
	for (let i=0 ; i<len ; i++) {
	  cells[i].classList.replace(selectHighlight, "brow");
	}
	len = cells.length = 0;
	selection.selectIds.length = 0;
  }

  // Manage selection operation, and last position
  let is_select;
  if (is_click) {
	lastCell = selection.lastCell = cell;
	if (is_keep) {
	  // Refresh is_select function of cell state
	  is_select = !cell.classList.contains(selectHighlight);
	}
	else {
	  is_select = true;
	}
	selection.is_select = is_select;
  }
  else {
	is_select = selection.is_select;
  }

  // Manage selection with regards to cell, with selection operation (select or unselect)
  if (is_click || is_range) {
	// Select or unselect all visible rows between lastCell and cell
	let end = lastCell.parentElement;
	if (row.rowIndex > end.rowIndex) {
	  let tmp = row;
	  row = end;
	  end = tmp;
	}
	let ids = selection.selectIds;
	while (true) { // Dirty trick to avoid testing twice (= inside the loop and at end) as we can't use > or <
	  if (!row.hidden) {
		cell = row.firstElementChild;
		let i = cells.indexOf(cell);
		if (is_select) {
		  cell.classList.add(selectHighlight);
		  if (i < 0) {
			cells.push(cell);
			ids.push(row.dataset.id);
		  }
		}
		else {
		  cell.classList.remove(selectHighlight);
		  if (i >= 0) {
			cells.splice(i, 1);
			ids.splice(i, 1);
		  }
		}
	  }
	  if (row == end) {
		break;
	  }
	  row = row.nextElementSibling;
	}
  }
}

/*
 * Verify if a selection contains one or more folders
 * 
 * selection = Object describing the selection to check
 * 
 * Returns true if yes, else false.
 */
function checkFolderInSelection (selection) {
  let containsFolder = false;

  let cells = selection.selectCells;
  let len = cells.length;
  let type;
  for (let i=0 ; i<len ; i++) {
	type = cells[i].parentElement.dataset.type;
	if (type == "folder") {
	  containsFolder = true;
	  break;
	}
  }

  return(containsFolder);
}

/*
 * Verify if a selection contains one or more protected bookmark or folders
 * 
 * selection = Object describing the selection to check
 * 
 * Returns true if yes, else false.
 */
function checkProtectedInSelection (selection) {
  let containsProtected = false;

  let ids = selection.selectIds;
  let len = ids.length;
  let BN, is_protected;
  for (let i=0 ; i<len ; i++) {
	BN = curBNList[ids[i]];
	is_protected = BN.protect;
	if (is_protected) {
	  containsProtected = true;
	  break;
	}
  }

  return(containsProtected);
}

/*
 * Call to refresh cut status of bookmark rows in a bookmark search, if there is one active
 * 
 * a_bnId = list of BookmarkNodes Ids on which to modify cut status
 * status = Boolean, if true set cut status on (dim), else set it off
 */
function refreshCutSearch (a_bnId, status) {
  if (SearchTextInput.value.length > 0) { // Refresh only if a search is active
	let row;
	let len = a_bnId.length;
	for (let i=0 ; i<len ; i++) {
	  row = curResultRowList[a_bnId[i]];
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
}

/*
 * Call to refresh cut status of  bookmark rows in bookmark panel
 * 
 * a_bnId = list of BookmarkNodes Ids on which to modify cut status
 * status = Boolean, if true set cut status on (dim), else set it off
 */
function refreshCutPanel (a_bnId, status) {
  let row;
  let len = a_bnId.length;
  for (let i=0 ; i<len ; i++) {
	row = curRowList[a_bnId[i]];
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
	  let bkmkitem = row.firstElementChild.firstElementChild;
	  let oldImg = bkmkitem.firstElementChild;
	  let cn = oldImg.className;
	  if (uri == "/icons/nofavicon.png") {
		if ((cn == undefined) || !cn.includes("nofavicon")) { // Change to nofavicon only if not already a nofavicon
		  let tmpElem = document.createElement("div");
		  tmpElem.classList.add("nofavicon");
		  tmpElem.draggable = false; // True by default for <img>
		  bkmkitem.replaceChild(tmpElem, oldImg);
		}
	  }
	  else {
		if ((cn != undefined) && cn.includes("nofavicon")) { // Change type from <div> to <img> if it was a nofavicon
		  let tmpElem = document.createElement("img"); // Assuming it is an HTMLImageElement
		  tmpElem.classList.add("favicon");
		  tmpElem.draggable = false; // True by default for <img>
		  tmpElem.src = uri;
		  bkmkitem.replaceChild(tmpElem, oldImg);
		}
		else {
		  oldImg.src = uri;
		}
	  }
	}
  }
}

/*
 * Turn the Cancel search button on, and show search pane
 */
let sboxState = SBoxEmpty;	// No active search
function enableCancelSearch () {
  CancelSearchInput.src = "/icons/butcancel.png";
  CancelSearchInput.disabled = false;
  sboxState = SBoxExecuted;	// Search was launched or is complete
  SearchResult.hidden = false;
}

/*
 * Turn the Cancel search button off, and hide seach pane
 */
function disableCancelSearch () {
  CancelSearchInput.src = "/icons/butempty.png";
  CancelSearchInput.disabled = true;
  sboxState = SBoxEmpty;	// No active search
  SearchResult.hidden = true;
}

/*
 * Turn the execute search button on
 */
function enableExecuteSearch () {
  CancelSearchInput.src = "/icons/butenter.png";
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
  // after last updateSearch() dispatch ..
  if (resultsTable != null) {
	SearchResult.removeChild(resultsTable);
	resultsTable = null;
	curResultRowList = {};
//	resultsFragment = null;

	// If a row cell was highlighted, do not highlight it anymore
//	clearCellHighlight(rcursor, rlastSelOp, rselection.selectIds);
	cancelCursorSelection(rcursor, rselection);
  }

  // Create search results table
//  resultsFragment = document.createDocumentFragment();
  resultsTable = document.createElement("table");
  resultsTable.id = "resultstable";
  SearchResult.appendChild(resultsTable); // Display the search results table + reflow
//  resultsFragment.appendChild(resultsTable);

  let len = a_BTN.length;
//trace("Results: "+len);
  // Close search history immediately when there are too few results, as it is hiding them
  if ((len <= 3) && (searchlistTimeoutId != undefined)) {
	clearTimeout(searchlistTimeoutId);
	closeSearchList();
  }
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
		let BTN_id = i.id;
		if ((i.type != "separator") && (BTN_id != TagsFolder) && (BTN_id != MobileBookmarks)) { // Do not display separators nor Tags nor MobileBookmarks folders in search results
		  let BN = curBNList[BTN_id];
		  if (BN == undefined) { // Desynchro !! => reload bookmarks from FF API
			// Signal reload to background, and then redisplay to all
			sendAddonMessage("reloadFFAPI_auto");
			break; // Break loop in case of error
		  }
		  if ((options.trashEnabled && options.trashVisible) || (BN.inBSP2Trash != true)) { // Don't display BSP2 trash folder results except on debug
			appendResult(BN);
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
 * Close the search history list
 */
let searchlistTimeoutId;
function closeSearchList () {
  searchlistTimeoutId == undefined;
  SearchTextInput.blur(); // This closes the search list
  SearchTextInput.focus(); // Give back focus to be able to type again
  let l = SearchTextInput.value.length; // Focus is selecting all text in the input => de-select to type at end ...
  SearchTextInput.setSelectionRange(l, l);
}

/*
 * Update search history list - Keep only last SearchListMax searches, ordered by most recent.
 * Merge entries to most specific ones to not keep a flurry of things like e, ee, eee (so keep only eee).
 */
function updateSearchList (text) {
  let searchOpt = SearchDatalist.options;
  let len = searchOpt.length;
  // Find if text is already in history
  let i;
  let option;
  let value;
  for (i=0 ; i<len ; i++) {
	if (text.includes(value = (option = searchOpt[i]).value)
		|| value.includes(text))
	  break;
  }
  if (i >= len) { // Not found, add it
	if (len < SearchListMax) { // Simply append at front
	  option = document.createElement("option");
	  option.value = text;
	  SearchDatalist.prepend(option);
	}
	else { // Shift values down to make room at top
	  option = searchOpt[SearchListMax-1];
	  let prev;
	  for (i=SearchListMax-2 ; i>=0 ; i--) {
		option.value = (prev = searchOpt[i]).value;
		option = prev;
	  }
	  option.value = text;
	}
  }
  else { // Found, keep the most specific one
	if (text.length > value.length) {
	  option.value = text;
	}
  }
  // Program the search list (suggestion dropdown) closure
  searchlistTimeoutId = setTimeout(closeSearchList, 3000);
}

/*
 * Execute / update a bookmark search and display result
 * 
 * is_updateSearchList = Boolean, if true, provoke an update of the search list of terms
 */
function updateSearch (is_updateSearchList = false) {
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
	// Update search history list if demanded, and if not disabled
	if (!options.deactivateSearchList && is_updateSearchList) {
	  updateSearchList(value);
	}

	// Discard previous results table if there is one
	if (resultsTable != null) {
	  SearchResult.removeChild(resultsTable);
	  resultsTable = null;
	  curResultRowList = {};
//	  resultsFragment = null;

	  // If a row cell was highlighted, do not highlight it anymore
//	  clearCellHighlight(rcursor, rlastSelOp, rselection.selectIds);
	  cancelCursorSelection(rcursor, rselection);
	}

	// Display waiting for results icon
	WaitingSearch.hidden = false;

	// Look for bookmarks matching the search text in their contents (title, url .. etc ..)
	let searching;
	if (!options.noffapisearch
		&& (options.searchField == "both") && (options.searchScope == "all") && (options.searchMatch == "words")) {
//console.log("Using FF Search API");
	  // It seems that parameters can make the search API fail and return 0 results sometimes, so strip them out,
	  // there will be too much result maybe, but at least some results !
	  let simpleUrl;
	  let paramsPos = value.indexOf("?");
	  if (paramsPos >= 0) {
		simpleUrl = value.slice(0, paramsPos);
	  }
	  else {
		simpleUrl = value;
	  }
	  searching = browser.bookmarks.search(decodeURI(simpleUrl));
	}
	else {
//console.log("Using BSP2 internal search algorithm");
	  searching = new Promise ( // Do it asynchronously as that can take time ...
		(resolve) => {
		  let a_matchStr;
		  let matchRegExp;
		  let isRegExp, isTitleSearch, isUrlSearch;
		  let a_BN;

		  if (options.searchField == "both") {
			isTitleSearch = isUrlSearch = true;
		  }
		  else if (options.searchField == "title") {
			isTitleSearch = true;
			isUrlSearch = false;
		  }
		  else {
			isTitleSearch = false; 
			isUrlSearch = true;
		  }

		  if (options.searchMatch == "words") { // Build array of words to match
			isRegExp = false;
			a_matchStr = strLowerNormalize(value).split(" "); // Ignore case and diacritics
		  }
		  else {
			isRegExp = true;
			try {
			  matchRegExp = new RegExp (strNormalize(value), "i"); // Ignore case and diacritics
			}
			catch (e) { // If malformed regexp, do not continue, match nothing
			  a_BN = [];
			}
		  }

		  if (a_BN == undefined) { // No error detected, execute search
			if (options.searchScope == "all") { // Use the List form
			  a_BN = searchCurBNList(a_matchStr, matchRegExp, isRegExp, isTitleSearch, isUrlSearch);
			}
			else { // Use the recursive form
			  let BN;
			  if (cursor.cell == null) { // Start from Root
				BN = rootBN;
			  }
			  else { // Retrieve BN of cell in cursor
				BN = curBNList[cursor.bnId];
				// Protection
				if (BN == undefined) {
				  BN = rootBN;
				}
			  }
			  a_BN = searchBNRecur(BN, a_matchStr, matchRegExp, isRegExp, isTitleSearch, isUrlSearch,
								   (options.searchScope == "subfolder") // Go down to subfolders, or only current folder ?
								  );
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
 * 
 * is_updateSearchList = Boolean, if true, provoke an update of the search list of terms
 */
function triggerUpdate (is_updateSearchList = false) {
  if (SearchTextInput.value.length > 0) { // Refresh only if a search is active
	// Clear input timeout if there was one active, to replace it by new (maybe faster) one
	// This allows to integrate together multiple events without intermediate displays,
	// like remove of a folder and its subtree
	if (inputTimeout != null) {
	  clearTimeout(inputTimeout);
	}
	// Schedule a new one
	inputTimeout = setTimeout(updateSearch, UpdateSearchDelay
							  , is_updateSearchList // Parameter of updateSearch()
							 );
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
		&& (row.firstElementChild.firstElementChild.firstElementChild.classList
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
 * Select all text in searchtext if there is, for easy replace
 */
function selectSearchTextHandler () {
  SearchTextInput.select();
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
	if (!options.searchOnEnter) { // Auto trigger search when no more key typed in
	  // Set timeout before triggering / updating search mode
	  inputTimeout = setTimeout(updateSearch, InputKeyDelay
	  							, true // Parameter of updateSearch()
	  						   );
	}
	enableExecuteSearch();
  }
  else { // Clear search mode
	inputTimeout = null; // We just cleared any last timeout, so set to null

	// Remember search pane height if needed, before closing it
	let sh = SearchResult.style.height; 
	if (sh != "") { // The search result pane size is different
	  				// from its default value set in the CSS
	  				// which is 20% (as seen in Computed Style)
	  if (options.rememberSizes) {
		if (options.searchHeight != sh) { // Save only if different from already saved
		  options.searchHeight = sh;
		  browser.storage.local.set({
			searchheight_option: sh
		  })
		  .then(
			function () {
			  // Signal change to all
			  sendAddonMessage("savedOptions");
			}
		  );
		}
	  }
	}
	disableCancelSearch();

	// Discard the results table if any
	if (resultsTable != null) {
	  SearchResult.removeChild(resultsTable);
	  resultsTable = null;
//	  resultsFragment = null;
	  curResultRowList = {};
	}

	// If a row was highlighted, do not highlight it anymore
//	clearCellHighlight(rcursor, rlastSelOp, rselection.selectIds);
	cancelCursorSelection(rcursor, rselection);

	// Restore bookmarks tree to its initial visibility state
	resetTreeVisiblity();
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
 * Disable or enable the expanded menu
 * 
 * state: Boolean, true if menu is expanded
 */
function setExpMenu (state) {
  if (state != expMenu) {
	expMenu = state;
	if (expMenu) {
	  TwistMenuImg.className = "expmenuo";
	  ExpandedMenuStyle.top = "0px";
	  SearchBoxStyle.height = "42px";
	}
	else {
	  TwistMenuImg.className = "expmenuc";
	  ExpandedMenuStyle.top = "-20px";
	  SearchBoxStyle.height = "22px";
	}
	// Save expand menu state
	if (backgroundPage == undefined) {
	  sendAddonMsgExpMenu(state);
	}
	else {
	  backgroundPage.saveExpMenu(myWindowId, state);
	}
  }
}

/*
 * Handle search options
 */
function setSearchOptions () {
  let cn;
  let buttonTitleFields, buttonTitleScope, buttonTitleMatch, buttonTitleFilter;
  if (options.searchMatch == "regexp") {
	cn = "sr" + options.searchField;
	SMatchRegexpInput.checked = true;
	buttonTitleMatch = "Use regex";
  }
  else {
	cn = "sw" + options.searchField;
	SMatchWordsInput.checked = true;
  }
  if (options.searchFilter == "all") {
	SFilterAllInput.checked = true;
	SFieldUrlOnlyInput.disabled = SFieldUrlOnlyLabel.disabled = false;
  }
  else if (options.searchFilter == "fldr") {
	SFilterFldrOnlyInput.checked = true;
	SFieldUrlOnlyInput.disabled = true; // Disable search on URL
	buttonTitleFilter = SFilterFldrOnlyInput.nextSibling.nextSibling.textContent;
  }
  else {
	SFilterBkmkOnlyInput.checked = true;
	SFieldUrlOnlyInput.disabled = SFieldUrlOnlyLabel.disabled = false;
	buttonTitleFilter = SFilterBkmkOnlyInput.nextSibling.nextSibling.textContent;
  }
  cn +=  " sfilter"+options.searchFilter;
  SearchButtonInput.className = cn;
  if (options.searchScope == "all") {
	MGlassImgStyle.backgroundImage = 'url("/icons/butsearch.png"';
	SScopeAllInput.checked = true;
  }
  else if (options.searchScope == "subfolder") {
	MGlassImgStyle.backgroundImage = 'url("/icons/butsearchsub.png"';
	SScopeSubfolderInput.checked = true;
	buttonTitleScope = SScopeSubfolderInput.nextSibling.nextSibling.textContent;
  }
  else {
	MGlassImgStyle.backgroundImage = 'url("/icons/butsearchfldnosub.png"';
	SScopeFolderonlyInput.checked = true;
	buttonTitleScope = SScopeFolderonlyInput.nextSibling.nextSibling.textContent;
  }

  if (options.searchField == "both") {
	SFieldTitleUrlInput.checked = true;
  }
  else if (options.searchField == "title") {
	SFieldTitleOnlyInput.checked = true;
	buttonTitleFields = SFieldTitleOnlyInput.nextSibling.nextSibling.textContent;
  }
  else {
	SFieldUrlOnlyInput.checked = true;
	buttonTitleFields = SFieldUrlOnlyInput.nextSibling.nextSibling.textContent;
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
//	ResetFiltersButtonInput.hidden = true;
	ResetFiltersButtonInputStyle.left = "-21px";
	ButtonContainerStyle.width = "11px";
  }
  else {
	ResetFiltersButtonInput.disabled = false;
//	ResetFiltersButtonInput.hidden = false;
	ResetFiltersButtonInputStyle.left = "0px";
	ButtonContainerStyle.width = "32px";
  }
  SearchButtonInput.title = buttonTitle;


  // Redo any ongoing search
  triggerUpdate();
}

function saveSearchOptions () {
  browser.storage.local.set({
	searchfield_option: options.searchField,
	searchscope_option: options.searchScope,
	searchmatch_option: options.searchMatch,
	searchfilter_option: options.searchFilter
  })
  .then(
	function () {
	  // Signal change to search options to all
	  sendAddonMessage("savedSearchOptions");
	}
  );
}

function resetSearchHandler () {
  options.searchField  = "both";
  options.searchScope  = "all";
  options.searchMatch  = "words";
  options.searchFilter = "all";
  saveSearchOptions();
}

function setSFieldTitleUrlHandler () {
  options.searchField = "both";
  saveSearchOptions();
}

function setSFieldTitleOnlyHandler () {
  options.searchField = "title";
  saveSearchOptions();
}

function setSFieldUrlOnlyHandler () {
  options.searchField = "url";
  saveSearchOptions();
}

function setSScopeAllHandler () {
  options.searchScope = "all";
  saveSearchOptions();
}

function setSScopeSubfolderHandler () {
  options.searchScope = "subfolder";
  saveSearchOptions();
}

function setSScopeFolderonlyHandler () {
  options.searchScope = "folderonly";
  saveSearchOptions();
}

function setSMatchWordsHandler () {
  options.searchMatch = "words";
  saveSearchOptions();
}

function setSMatchRegexpHandler () {
  options.searchMatch = "regexp";
  saveSearchOptions();
}

function setSFilterAllHandler () {
  options.searchFilter = "all";
  saveSearchOptions();
}

function setSFilterFldrOnlyHandler () {
  options.searchFilter = "fldr";
  options.searchField  = "title"; // Force title, searchng on URL for a folder makes no sense
  saveSearchOptions();
}

function setSFilterBkmkOnlyHandler () {
  options.searchFilter = "bkmk";
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
  migration_img16 = false; // No need to migrate existing favicons anymore, only new ones will come now
}

/*
 * Add an existing favicon to migration list if needed = we can verify the size only when the image is loaded
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
//console.log("Have to rescale: "+nh+","+nw+" for "+this.src.substr(0,50)+" - "+row.firstElementChild.firstElementChild.title);
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
 * children (optional) = used only in options.delayload mode, where we already looked at children
 *
 * Returns: the inserted row (an HTMLTableRowElement).
 *
 * Uses and maintain global variable highest_open_level.
 * It has to be set appropriately before an insert (or append), to determine the row visibility.
 * It is maintained by the function for sequential calls at initial display time, but when
 * inserting a bookmark later in the middle, the calling code has to set it appropriately.
 */
function insertBookmarkBN (BN, index = -1, children = undefined) {
//let t1 = (new Date ()).getTime();
//trace(t1+" Displaying <<"+BN.id+">><<"+BN.title+">><<"+BN.type+">><<"+BN.url+">> at level: "+level+" highest_open_level: "+highest_open_level+" and index: "+index);
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
  // - if folder, a <div> of class "bkmkitem_f" with a margin-left corresponding to the level
  //   or of class "bkmkitem_s" or "bkmkitem_b", for respectively separator or bookmark,
  //   with a margin-left corresponding to the level + 16
  //   containing:
  //   - if folder, a <div> of class "twistiena", "twistieac" or twistieao", depending if there
  //     are no children, if closed or open, 
  //   - if separator, a <div> of class "favseparator"
  //   - if folder or bookmark, an <img> (class "favicon"), or <div> if normal folder,  and a
  //     <span> with text (class "favtext")
  let type = row.dataset.type = BN.type;
  if (type == "folder") {				// Folder
	// Retrieve saved state or set open by default
	let is_open;
	if (savedFldrOpenList != undefined) { // Initial display
	  is_open = curFldrOpenList[BN_id] = savedFldrOpenList[BN_id];
	}
	else {
	  is_open = curFldrOpenList[BN_id];
	}
	if (is_open == undefined) { // Folder closed by default when no info
	  is_open = curFldrOpenList[BN_id] = false;
	}

	// Update indicator of highest open level .. only if open and in an open part
	if (is_open && (highest_open_level == level))
	  highest_open_level = level + 1;

	// Create elements
	let div2;
	let twistie;
	let span;
	if (BN.fetchedUri) { // Special folder, load image now, there are not a big number of them
	  div2 = SFolderTempl.cloneNode(true);
	  let img = (twistie = div2.firstElementChild).nextElementSibling;
	  img.src = BN.faviconUri;
	  span = img.nextElementSibling;
	}
	else {
	  div2 = FolderTempl.cloneNode(true);
	  span = (twistie = div2.firstElementChild).nextElementSibling.nextElementSibling;
	}
	if (BN.inBSP2Trash) { // Set to italics
	  span.style.fontStyle = "italic";
	}
	// Look at children to set the twistie
//	if (!options.delayLoad)
	  children = BN.children;
	if ((children == undefined) || (children.length == 0))
	  twistie.classList.add("twistiena");
	else
	  twistie.classList.add(is_open ? "twistieao" : "twistieac");
	if (level > 0) {
	  div2.style.marginLeft = (LevelIncrementPx * level)+"px";
	}
	cell.appendChild(div2);

	span.textContent = div2.title = BN.title;
	cell.appendChild(div2);
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
	let anchor;
	let span;
	let uri = BN.faviconUri;
	if ((uri == undefined) || (uri == "/icons/nofavicon.png")) { // Clone with nofavicon image background
	  anchor = NFBookmarkTempl.cloneNode(true);
	  span = anchor.firstElementChild.nextElementSibling;
	}
	else { // Clone normal one, we will fill the image later
	  let img;
	  anchor = BookmarkTempl.cloneNode(true);
	  if (migration_img16 && BN.fetchedUri) { // Catch end of image load if we have to migrate
		img = anchor.firstElementChild;
		img.onload = migr16x16OnLoad;
		span = img.nextElementSibling;
	  }
	  if (options.immediateFavDisplay
		  || isDisplayComplete			// Do not defer once initial load/display is complete
		 ) {
		if (img == undefined) {
		  img = anchor.firstElementChild;
		  span = img.nextElementSibling;
		}
		img.src = uri;
	  }
	  if (img == undefined) {
		span = anchor.firstElementChild.nextElementSibling;
	  }
	}
	if (BN.inBSP2Trash) { // Set to italics
	  span.style.fontStyle = "italic";
	}
	// We can attach an href attribute to <div> !!
	// Much better as it avoids any special behavior of <a> on clicks and look/CSS ..
	if (!url.startsWith("place:")) {
	  anchor.href = url;
	}
	if (level > 0) {
	  anchor.style.marginLeft = (LevelIncrementPx * level + 16)+"px";
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
 */
let insertRowIndex;
function insertBkmks (BN, parentRow, parentLevel = undefined, parentOpen = undefined) {
  if ((options.trashEnabled && options.trashVisible) || (BN.inBSP2Trash != true)) { // Don't display BNs in BSP2 trash, except on debug
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
	  let twistie = parentRow.firstElementChild.firstElementChild.firstElementChild;
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
	let bnId = BN.id;
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
		let is_open = curFldrOpenList[bnId]; // Retrieve our intended open state
		for (let i=0 ; i<len ; i++) {
		  insertBkmks(children[i], row, parentLevel+1, is_open);
		}
	  }
	}
  }
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
  // Note: only do it when the parent is really visible, that is when the parent is not BSP2 trash, or not in
  //       the BSP2 trash, or when BSP2 trash is visible
  if (!parentBN.inBSP2Trash || options.trashVisible) {
	// We need to retrieve the insertion point the hard way if we do not want to call
	// getSubtree() which is very very long ...
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
	  let previousSibblingBN = children[index-1];
	  if (previousSibblingBN.inBSP2Trash && !options.trashVisible) { // Protect against inserting just after BSP2 trash when not visible
		if (index < 2) {
		  insertRowIndex = parentRow.rowIndex + 1;
		}
		else {
		  let previousBN = BN_lastDescendant(children[index-2]);
		  let row = curRowList[previousBN.id];
		  insertRowIndex = row.rowIndex + 1; // Can be at end of bookmarks table
		}
	  }
	  else {
		let previousBN = BN_lastDescendant(previousSibblingBN);
		let row = curRowList[previousBN.id];
		insertRowIndex = row.rowIndex + 1; // Can be at end of bookmarks table
	  }
	}

	// We got the insertion point, proceed to insertion
	insertBkmks(BN, parentRow);

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
  if (cursor.cell == row.firstElementChild) {
	// Clear cursor if that is the deleted row to avoid
	// problems later when moving cursor
//	clearCellHighlight(cursor, lastSelOp, selection.selectIds);
	cancelCursorSelection(cursor, selection);
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
	let twistie = previousRow.firstElementChild.firstElementChild.firstElementChild;
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
//console.log("Remove event on: "+bnId);
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

  if (row != undefined) { // If non existing, do not try to remove
						  // Can happen for example on restore bookmarks, on our special "place:xxx"
						  // BNs unders the special most recent or most visited folders, or when a
						  // bookmark under non visible BSP2 trash is removed by an undo/redo of past
						  // when BSP2 was visible, or from a non-BSP2 bookmark management mean
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

  if (row != undefined) { // If non existing, do not try to remove
						  // Can happen for example on restore bookmarks, on our special "place:xxx"
						  // BNs unders the special most recent or most visited folders, or when a
						  // bookmark under non visible BSP2 trash is changed by an undo/redo of past
						  // when BSP2 was visible, or from a non-BSP2 bookmark management mean 
	// Update display
	let item = row.firstElementChild.firstElementChild;
	if (isBookmark) { // item is a .bkmkitem_b <div>
      // item.title mixes both, so is always updated
      // Update all
	  let img = item.firstElementChild; // Assuming it is an HTMLImageElement
	  img.src = uri;
	  let span = img.nextElementSibling;
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
	}
	else { // Can only be a folder, per spec of the event, not a separator
		   // => item is a ".bkmkmitem_f" <div>
	  // Get to the <span> in it
	  let span = item.firstElementChild.nextElementSibling.nextElementSibling;
	  span.textContent = title;
	}

	// Trigger an update as results can change, if there is a search active
	// Note: a separator is never modified, so that can only be a bookmark or folder.
	triggerUpdate();
  }
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
  // Remember current trash state (from curParentId BN, since BN was already modified - except in private page)
  let curInBSP2Trash = curBNList[curParentId].inBSP2Trash;
  let targetParentBN = curBNList[targetParentId];
  let tgtInBSP2Trash = targetParentBN.inBSP2Trash;
  if (backgroundPage == undefined) { // Redo change in our own copy of curBNList
	// Remove item and its children from its current parent, but keep them in list
	// as this is only a move.
	BN_delete(BN, curParentId, false);
	// Then insert it at new place, again not touching the list
	if (options.trashEnabled) { // Maintain inBSP2Trash and trashDate fields
	  BN_markTrash(BN, tgtInBSP2Trash);
	}
	BN_insert(BN, targetParentBN, targetIndex, false);
  }

  let is_actionVisible = false;
  // Get move description in current (= old) reference
  if ((tgtInBSP2Trash == true) && !options.trashVisible) { // Simply remove source row, there is no visible target where to insert
	if (curInBSP2Trash != true) { // If source is also in trash, nothing wisible to do ..
	  let movedRow = curRowList[bnId];
	  is_actionVisible = true;
	  removeBkmks(movedRow, true); // remove from cur lists, as there is no visible targets
	}
  }
  else if ((curInBSP2Trash == true) && !options.trashVisible) { // Simply insert tartget row, there is no wisible source to remove from
	let targetParentRow = curRowList[targetParentId];

	// Find insertion point, in current (= old) reference
	let targetRow;
	// Introduce robustness in case the BN tree is empty and index is not 0, as that seems to occur some times
	let children = targetParentBN.children;
	if ((targetIndex == 0) || (children == undefined)) { // Insert just after parent row
	  // Note that this also takes care of the case where parent had so far no child
	  targetRow = targetParentRow.nextElementSibling; // Can be null if we move at end
	}
	else { // Insert just after previous row
		   // ASSUMPTION (true so far): when multiple moves / creates to same parent, like in multi-select move
		   //            or reorder or ..., items are sent to us in increasing row/index order, so previous
		   //            rows to current item under process are always already at the right place.
		   // Note that in such multi operations, things have been all processed in background first or the copy,
		   //       so the BN tree is not any more in sync with display.
	  let previousSibblingBN = children[targetIndex-1];
	  if (previousSibblingBN.inBSP2Trash && !options.trashVisible) { // Protect against inserting just after BSP2 trash when not visible
		if (targetIndex < 2) {
		  targetRow = targetParentRow.nextElementSibling; // Can be null if we move at end
		}
		else {
		  let previousBN = BN_lastDescendant(children[targetIndex-2]);
		  targetRow = curRowList[previousBN.id].nextElementSibling; // Can be null if we move at end
		}
	  }
	  else {
		let previousBN = BN_lastDescendant(previousSibblingBN);
		targetRow = curRowList[previousBN.id].nextElementSibling; // Can be null if we move at end
	  }
	}

	// We got the insert point in targetRow (null if at end), proceed to move
	// Insert the item at its new place (with its children) using global variable insertRowIndex
	// and get the last inserted row in return.
	if (targetRow == null) // Moving at end of bookmarks table
	  insertRowIndex = bookmarksTable.rows.length;
	else   insertRowIndex = targetRow.rowIndex; // Get the updated row index of target
	is_actionVisible = true;
	insertBkmks(BN, targetParentRow);
  }
  else { // Normal case
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
	  let previousSibblingBN = children[targetIndex-1];
	  if (previousSibblingBN.inBSP2Trash && !options.trashVisible) { // Protect against inserting just after BSP2 trash when not visible
		if (targetIndex <= children.length) { // Remember that the child was already added in the BN tree in the background task
		  targetCurRowIndex = targetParentRow.rowIndex + 1;
		  targetRow = targetParentRow.nextElementSibling; // Can be null if we move at end
		}
		else {
		  let previousBN = BN_lastDescendant(children[targetIndex-2]);
		  targetRow = curRowList[previousBN.id];
		  targetCurRowIndex = targetRow.rowIndex + 1; // Can be at end of bookmarks table
		  targetRow = targetRow.nextElementSibling; // Can be null if we move at end
		}
	  }
	  else {
		let previousBN = BN_lastDescendant(previousSibblingBN);
		targetRow = curRowList[previousBN.id];
		targetCurRowIndex = targetRow.rowIndex + 1; // Can be at end of bookmarks table
		targetRow = targetRow.nextElementSibling; // Can be null if we move at end
	  }
	}

	// We got the move point in targetRow (null if at end), and its position in
	// targetCurRowIndex, proceed to move
//console.log("curRowIndex: "+curRowIndex+" targetCurRowIndex: "+targetCurRowIndex);

	// Remove item and its children from display, but keep them in their cur lists
	// as this is only a move.
	// The returned value is the row which took its place in the table (or null if
	// removed at end).
	is_actionVisible = true;
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
  }

  if (is_actionVisible) {
	// State of parent folders may change, so save folder open state
	saveFldrOpen();

	if (options.showPath || options.trashEnabled) {
	  // Trigger an update as results can change, if there is a search active
	  triggerUpdate();
	}
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

	// Don't do anything on screen if inside non-visible BSP2 trash
	if (!folderBN.inBSP2Trash || options.trashVisible) {
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

	  // No folder state changed, so nothing to save

	  if (options.showPath) {
		// Trigger an update as results can change, if there is a search active
		triggerUpdate();
	  }
	}
  }
}

/*
 * Verify visiblity of a BookmarkNode
 *
 * BN_id is a String.
 * 
 * Return true if BN is visible because all its ancestors are open, else false
 * Set the global variable firstVisibleParentRow to the lowest visible ancestor, from root.
 * Also set the global variable firstUnhiddenParentRow to the lowest unhidden ancestor (can
 * be different - and necessarily lower - if upper parts were already unhidden by a previous showRow()),
 * and the global variable hiddenParentRowsPath to the list (Array) of hidden parents above BN. 
 */
let firstUnhiddenParentRow, hiddenParentRowsPath;
function isVisible (BN_id) {
  let visible;

  // Get to parent row and check it
  let BN = curBNList[BN_id];
  let parentBN_id = BN.parentId;
  if (parentBN_id == Root) {
	// Root, which is not displayed, is always considered visible and open,
    // since all its children folders are shown (= top level system folders).
	// So we are visible, and there is no parent row.
	visible = true;
	firstUnhiddenParentRow = firstVisibleParentRow = undefined;
	hiddenParentRowsPath = [];
  }
  else {
	let parentVisible = isVisible(parentBN_id);

	// If parent is not visible, we are not ...
	if (!parentVisible) {
	  visible = false;
	  // Do not update firstVisibleParentRow anymore, but continue on firstUnhiddenParentRow as appropriate,
	  // and grow hiddenParentRowsPath.
	  let parentRow = curRowList[parentBN_id];
	  if (parentRow.hidden) {
		hiddenParentRowsPath.push(parentRow);
	  }
	  else {
		firstUnhiddenParentRow = parentRow;
	  }
	}
	else { // Parent is visible (and necessarily unhidden)
	  firstUnhiddenParentRow = firstVisibleParentRow = curRowList[parentBN_id];
	  // We are visible only if parent is open
	  visible = curFldrOpenList[parentBN_id];
	}
  }

  return (visible);
}

/*
 * Show a bookmark row, making it visible if hidden (but not opening its parent then).
 * Also sets the cursor on that row / cell.
 * 
 * srcBnId is a String (BookmarkNode id)
 * srcRow is an HTMLTableRowElement
 *
 * Returns if row was visible or not (true / false)
 */
function showRow (srcBnId, srcRow) {
  let wasRowVisible = isVisible(srcBnId); // Also sets firstUnhiddenParentRow and hiddenParentRowsPath
  let srcHidden = srcRow.hidden;
  if (srcHidden) {
	// Start from first unhidden ancestor already visible
	// Open it if options.openTree is active
	let BN_id;
	let twistie;
	if (options.openTree) { // Set it to open state
	  twistie = firstUnhiddenParentRow.firstElementChild.firstElementChild.firstElementChild;
	  // First unhidden means all under it is hidden so it is necessarily closed => Open twistie
	  twistie.classList.replace("twistieac", "twistieao");
	  BN_id = firstUnhiddenParentRow.dataset.id;
	  curFldrOpenList[BN_id] = true;
	}
	// Now unhide all children under it, plus all folders which are already open or on the path
	// to the row to show, and their children.
	let topLevel = parseInt(firstUnhiddenParentRow.dataset.level, 10);
	let row = firstUnhiddenParentRow.nextElementSibling;
	let level;
	while ((row != null)
		   && row.hidden
		   && ((level = parseInt(row.dataset.level, 10)) > topLevel)
		  ) {
	  // We are on an intended to be unhidden row
	  row.hidden = false;
	  // Check if this is a folder and if open, or meant to be open because on the path to srcBnId
	  if ((row.dataset.type == "folder")
		  && (row.firstElementChild.firstElementChild.firstElementChild.classList.contains("twistieac"))
		 ) { // This is a closed folder, check its intended state
		if (hiddenParentRowsPath.indexOf(row) == -1) {
		  // Should stay closed, then all its children stay hidden ..
		  while ((row = row.nextElementSibling) != null) {
			if (parseInt(row.dataset.level, 10) <= level)
			  break; // Stop when lower or same level
		  }
		}
		else { // It is on path to srcBnId, we need to unhide its children
		  if (options.openTree) { // If option is true, set it to open state
			twistie = row.firstElementChild.firstElementChild.firstElementChild;
			twistie.classList.replace("twistieac", "twistieao");
			BN_id = row.dataset.id;
			curFldrOpenList[BN_id] = true;
		  }
		  row = row.nextElementSibling;
	    }
	  }
	  else   row = row.nextElementSibling;
	}
  }

  // Set/move cursor on the source cell + highlight it
//  setCellHighlight(cursor, lastSelOp, srcRow.firstElementChild, selection.selectIds);
  addCellCursorSelection(srcRow.firstElementChild, cursor, selection);
  // Get row into view
  // Bug: "smooth" has a bug when the viewport content is modified, it points at the origin position before modification
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

  return(wasRowVisible);
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
	  bnId = row.dataset.id;
	}
  }
  else {
	row = bookmarksTable.rows[0];
	bnId = row.dataset.id;
  }
  showRow(bnId, row); // We checked it was not hidden, so no modification to any folder state to save
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
  let wasRowVisible = showRow(parentBN_id, parentRow);
  if (!wasRowVisible) {
	// If we have the options.openTree active, then we necessarily changed some folder state
	// => save it.
	if (options.openTree) {
	  saveFldrOpen();
	}
	else { // Else show special action on context menu
	  cursor.cell.classList.add(Reshidden); // Show special menu to open parent folders
	}
  }
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
  let twistie = row.firstElementChild.firstElementChild.firstElementChild;
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
	  twistie = prev_row.firstElementChild.firstElementChild.firstElementChild;
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
  let twistie = row.firstElementChild.firstElementChild.firstElementChild;
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
	  twistie = prev_row.firstElementChild.firstElementChild.firstElementChild;
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
  // Note that if this action is triggered, row was not visible, so firstVisibleParentRow is defined
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
	  twistie = row.firstElementChild.firstElementChild.firstElementChild;
	  if (twistie.classList.contains("twistieac")) { // Open twistie
		twistie.classList.replace("twistieac", "twistieao");
		curFldrOpenList[BN_id] = true;
	  }
	}
  } while (BN.level > level); // The last ancestor is necessarily closed .. so do it also
  
  // Save new open state
  saveFldrOpen();

  // Remove the .reshidden class now that parents are open
  cursor.cell.classList.remove(Reshidden);
}

/*
 * Handle clicks on results = show source row in bookmarks tree, and special menu to open
 * parents if options.openTree is not set.
 *
 * resultBN_id is the id of the bookmark item to show
 */
function handleResultClick (resultBN_id) {
  let srcRow = curRowList[resultBN_id];
  if (srcRow != undefined) { // Protect against unlisted bookmarks, like "Tous les marques-pages"
							 // which do not appear in getTree(), but appear in search() !!
//trace("Row: "+srcRow+" resultBN_id: "+resultBN_id+" index: "+srcRow.rowIndex);
	// Make the source row of result visible if hidden
	// Verify the current visiblity of the row before potentially modifying its parent state.
	// If it is hidden (one of its parents is closed), we'll need to display the special
	// "Open parents" action on context menu (only if options.openTree is not set).
	// Be careful that srcHidden is not reliable .. in case we already showed a result under
	// same parent, then the row is already set to visible with that attribute, so have to check
	// curFldrOpenList[] instead, which is done by showRow().
	let wasRowVisible = showRow(resultBN_id, srcRow);
	if (!wasRowVisible) {
	  // If we have the options.openTree active, then we necessarily changed some folder state
	  // => save it.
	  if (options.openTree) {
		saveFldrOpen();
	  }
	  else { // Else show special action on context menu
		cursor.cell.classList.add(Reshidden); // Show special menu to open parent folders
	  }
	}
  }
}

/*
 * Handle clicks on folders - Change twistie and visibility of children (recursively)
 *
 * twistie is an HTLMDivElement
 * is_forceNoClose is a Boolean, true will ignore the closeSibblingFolders option
 */
function handleFolderClick (twistie, is_forceNoClose = false) {
  // Retrieve bookmark information in the row (BN.id and level)
  let row = twistie.parentElement.parentElement.parentElement;
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
	let is_closeSibblingFolders = options.closeSibblingFolders && !is_forceNoClose;
	let prev_row = row;
	let prev_level;
	let prev_twistie;
	let is_open;
	let bnId;
	if (is_closeSibblingFolders) {
	  while ((prev_row = prev_row.previousElementSibling) != null) {
		prev_level = parseInt(prev_row.dataset.level, 10);
		if (prev_level < level) { // Reached parent, stop
		  break;
		}
		else if (prev_level == level) { // If folder at same level with an open twistie, close it 
		  // Check if this is an open folder row
		  prev_twistie = prev_row.firstElementChild.firstElementChild.firstElementChild;
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
		twistie = prev_row.firstElementChild.firstElementChild.firstElementChild;
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
	if (is_closeSibblingFolders && (row != null) && (cur_level == level)) { // There are sibbling rows
	  // Check if current row is an open folder
	  twistie = row.firstElementChild.firstElementChild.firstElementChild;
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
		  twistie = row.firstElementChild.firstElementChild.firstElementChild;
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
 * Receive mouse down event on results table
 * Note that buttons 1 (middle click) and 2 (right click) also go here
 *
 * e is of type MouseEvent (click)
 */
function resultsMouseDownHandler (e) {
  let target = e.target; // Type depends ..
  let className = target.className;
//console.log("Result mouse down event: "+e.type+" button: "+e.button+" shift: "+e.shiftKey+" target: "+target+" class: "+className);
  if ((className != undefined) && (className.length > 0)) {
	// The click target is one of .brow cell,
	// .rbkmkitem_x div, .rtwistieac div, favicon img or .favttext span
	// Find cell, for selection
	let cell;
	if (className.includes("fav") || className.startsWith("rtwistie")) {
	  cell = target.parentElement.parentElement;
	}
	else if (className.startsWith("rbkmkitem_")) {
	  cell = target.parentElement;
	}
	else if (className.includes("brow")) {
	  cell = target;
	}

	// Select result item if recognized
	// , and if not already selected=> keep bigger multi-items selection area if right click inside it 
	if (cell != undefined) {
	  let button = e.button;
	  // Do nothing on selection if this is a right click inside a selection range
	  if ((button != 2) || !cell.classList.contains(rselection.selectHighlight)) {
//		setCellHighlight(rcursor, rlastSelOp, cell, rselection.selectIds);
		if (button == 1) { // If middle click, simple select, no multi-select
		  addCellCursorSelection(cell, rcursor, rselection);
		}
		else {
		  let is_ctrlKey = (isMacOS ? e.metaKey : e.ctrlKey);
		  addCellCursorSelection(cell, rcursor, rselection, true, is_ctrlKey, e.shiftKey);
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
//console.log("Result click event: "+e.type+" button: "+e.button+" shift: "+e.shiftKey+" target: "+target+" class: "+className);
  if ((className != undefined) && (className.length > 0)) {
	// The click target is one of .brow cell,
	// .rbkmkitem_x div, .twistieac div, favicon img or .favttext span
	// Handle click, and go to the parent row
	let row;
	if (className.includes("fav") || className.startsWith("rtwistie")) {
      // Go to .bkmkitem_x when advanced or Alt key, else go to .brow
	  if (options.advancedClick || e.altKey) {
		row = (target = target.parentElement).parentElement.parentElement;
	  }
	  else { // Go to .brow
		row = (target = target.parentElement.parentElement).parentElement;
	  }
	  className = target.className;
	}
	else if (className.startsWith("rbkmkitem_")) {
	  let cell;
	  row = (cell = target.parentElement).parentElement;
	  // If Alt key or advanced, open in current tab (remain on current target), else show => go to .brow
	  if (!options.advancedClick && !e.altKey) {
		target = cell;
		className = target.className;
	  }
	}
	else { // .brow, cannot be scrollbars when left mouse click
	  row = target.parentElement;
	  if (e.altKey) { // .brow, if Alt key, force open in current tab if bookmark
		if (target.parentElement.dataset.type == "bookmark") {
		  target = target.firstElementChild;
		  className = target.className;
		}
	  }
	}

	let showSrcRow = true;
	let is_ctrlKey = (isMacOS ? e.metaKey : e.ctrlKey);
	if (className == "rbkmkitem_b") { // An HTMLDivElement
	  e.preventDefault(); // We do not want the left click to open in a new tab ..
	  					  // but in the active tab
	  let href = target.href;
	  if ((href != undefined) && (href.length > 0)) {
		// Respect the about:config browser.search.openintab setting setting
		if (openSearchResultsInNewTabs_option) { // If option set, open in new tab at end
		  browser.tabs.create({url: href});
		}
		else if (is_ctrlKey) { // Open in new tab, referred by this tab to come back to it when closing
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
		else { // Open in current tab, except if we are running BSP2 inside a tab and Alt is not pressed
		  if (isInSidebar || e.altKey) {
			browser.tabs.update({url: href});
		  }
		  showSrcRow = false; // Do not show row, we already got an action
		}
	  }
	}

	// Make the source object visible .. and scroll to it, except when Shift, Ctrl or Alt are pressed,
	// and when not on favtext / favicon in advanced mode
	let resultBN_id = row.dataset.id;
	if (showSrcRow && !e.shiftKey && !is_ctrlKey && !e.altKey) {
	  // Retrieve bookmark information in the result row (BN.id)
	  // Then show it
	  handleResultClick(resultBN_id);

	  // If close search option is set, close search pane now
	  if (options.closeSearch) {
		clearSearchTextHandler();
	  }
	}
  }
  e.stopPropagation(); // Prevent handlers up the DOM chain on same event
}

/*
 * Receive mouse down event on bookmarks table.
 * Note that buttons 1 (middle click) and 2 (right click) also go here
 *
 * e is of type MouseEvent (click)
 */
function bkmkMouseDownHandler (e) {
  let target = e.target; // Type depends ..
  let className = target.className;
//console.log("Bookmark mouse down event: "+e.type+" button: "+e.button+" shift: "+e.shiftKey+" target: "+target+" class: "+className);
  if ((className != undefined) && (className.length > 0)) {
	// Find cell, for selection
	let cell;
	if (className.includes("fav") || className.startsWith("twistie")) {
	  cell = target.parentElement.parentElement;
	}
	else if (className.startsWith("bkmkitem_")) {
	  cell = target.parentElement;
	}
	else if (className.includes("brow")) {
	  cell = target;
	}

	// Select bookmark item if recognized
	if (cell != undefined) {
	  let is_shiftKey = e.shiftKey;
	  let is_ctrlKey = (isMacOS ? e.metaKey : e.ctrlKey);
	  let button = e.button;
	  // Do not modify selection if click is inside, and if this is a right click
	  //  or if this is a left click with no modifier (to allow for dragging the selection)
	  if ((button == 1)
		  || !cell.classList.contains(selection.selectHighlight)
		  || ((button != 2) && (is_ctrlKey || is_shiftKey))
		 ) {
//		setCellHighlight(rcursor, lastSelOp, cell, selection.selectIds);
		if (button == 1) { // If middle click, simple select, no multi-select
		  addCellCursorSelection(cell, cursor, selection);
		}
		else {
		  addCellCursorSelection(cell, cursor, selection, true, is_ctrlKey, is_shiftKey);
		}
	  }
	}
  }
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

  // The click target is one of .brow/.selbrow cell, .bkmkitem_x div,
  // .twistiexx img (if folder), .favseparator/.favseparatorend div, .favicon or .favttext
  // Act only if the user clicked on .bkmkitem_x, .twistieax, .favicon or .favtext
  // If twistie, favicon or favtext, get parent instead (which is a .bkmkitem_x div)
  // to handle click
  // Cannot be scrollbars when left mouse click
  let cell;
  let is_altKey = e.altKey;
  if (className.includes("fav") || className.startsWith("twistie")) {
	target = target.parentElement;
	cell = target.parentElement;
	className = target.className;
  }
  else if (className.startsWith("bkmkitem_")) {
	cell = target.parentElement;
  }
  else if (className.includes("brow")) {
	cell = target;
	// If Alt is pressed on bookmark, open in current tab wherever we click, so retarget to the .bkmkitem_x div 
	if (is_altKey && (target.parentElement.dataset.type == "bookmark")) {
	  target = target.firstElementChild;
	  className = target.className;
	}
  }

  // Action only if on a valid element
  if (cell != undefined) {
	// Adjust selection to a simple select if we are inside one and there is no modifier
	let is_shiftKey = e.shiftKey;
	let is_ctrlKey = (isMacOS ? e.metaKey : e.ctrlKey);
	let action;

	// Do action corresponding to click and modifiers
	if (className == "bkmkitem_b") { // An HTMLDivElement
	  e.preventDefault(); // We do not want the left click to open in a new tab ..
						  // but in the active tab
	  let href = target.href;
	  if ((href != undefined) && (href.length > 0)) {
		// Respect the about:config browser.tabs.loadBookmarksInTabs setting
		if (openBookmarksInNewTabs_option) { // If option set, open in new tab at end
		  browser.tabs.create({url: href});
		}
		else if (is_ctrlKey) { // Open in new tab, referred by this tab to come back to it when closing
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
		else if (is_shiftKey) { // Open in new window
		  browser.windows.create({url: href});
		}
		else { // Open in current tab, except if we are running BSP2 inside a tab and Alt is not pressed
		  if (isInSidebar || is_altKey) {
			browser.tabs.update({url: href});
		  }
		}
		action = true;
	  }
	}
	// If folder bkmkitem with active twistie, handle folder click
	else if (className == "bkmkitem_f") {
	  if (options.traceEnabled && is_altKey) {
		let bnId = cell.parentElement.dataset.id;
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
		action = true;
	  }
	  // If active twistie (folder with children), go for folder action
	  let twistie = target.firstElementChild;
	  if (twistie.className.startsWith("twistiea")) {
		handleFolderClick(twistie, is_shiftKey);
		action = true;
	  }
	}

	if (action ||
		(cell.classList.contains(selection.selectHighlight) && !is_ctrlKey && !is_shiftKey)
	   ) {
	  addCellCursorSelection(cell, cursor, selection);
	}
  }
  e.stopPropagation(); // Prevent handlers up the DOM chain on same event
}

/*
 * Receive event from aux clicks on results table - When on bookmark item, this opens the bookmark in a new tab
 *
 * e is of type MouseEvent (click)
 */
function resultsAuxHandler (e) {
  let target = e.target; // Type depends ..
  let className = target.className;
//console.log("Result aux event: "+e.type+" button: "+e.button+" shift: "+e.shiftKey+" phase: "+e.eventPhase+" target: "+target+" class: "+className);
  // Be careful, button 2 (contextmenu) also ends up here :-(
  if ((e.button == 1)
	  && (className != undefined)
	  && (className.length > 0)) {
	// The click target is one of .brow cell,
	// .rbkmkitem_x div or anchor, .favicon img or .favttext span
	// Handle click, and go to the parent row
	let row;
	if (className.includes("fav") || className.startsWith("rtwistie")) {
	  row = (target = target.parentElement).parentElement.parentElement;
	  className = target.className;
	}
	else if (className.startsWith("rbkmkitem_")) {
	  row = target.parentElement.parentElement;
	}
	else { // .brow
	  row = target.parentElement;
	  if (row.dataset.type == "bookmark") {
		target = target.firstElementChild;
		className = target.className;
	  }
	}
	if (className == "rbkmkitem_b") { // An HTMLAnchorElement
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
	// The click target is one of .brow cell, .bkmkitem_x div,
	// .favseparator div, .twistiexx div (if folder), .favicon or .favttext
	// Act only if the user clicked on .bkmkitem_x, .twistieax img, favicon or .favtext
	// If favicon or favtext, get parent instead to handle click
	if (className.includes("fav") || className.startsWith("twistie")) {
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
  let mstyle = menu.style;
  mstyle.top = posY + "px";
  mstyle.left = posX + "px";
  mstyle.visibility = "visible";
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
  else if (myRShowBkmkMenu_open) {
	menuClosed = true;
	MyRShowBkmkMenuStyle.visibility = "hidden";
	myRShowBkmkMenu_open = false;
  }
  else if (myRFldrMenu_open) {
	menuClosed = true;
	MyRFldrMenuStyle.visibility = "hidden";
	myRFldrMenu_open = false;
  }
  else if (myRMultMenu_open) {
	menuClosed = true;
	MyRMultMenuStyle.visibility = "hidden";
	myRMultMenu_open = false;
  }
  else if (myBBkmkMenu_open) {
	menuClosed = true;
	MyBBkmkMenuStyle.visibility = "hidden";
	myBBkmkMenu_open = false;
  }
  else if (myBResBkmkMenu_open) {
	menuClosed = true;
	MyBResBkmkMenuStyle.visibility = "hidden";
	myBResBkmkMenu_open = false;
  }
  else if (myBFldrMenu_open) {
	menuClosed = true;
	MyBFldrMenuStyle.visibility = "hidden";
	myBFldrMenu_open = false;
  }
  else if (myBResFldrMenu_open) {
	menuClosed = true;
	MyBResFldrMenuStyle.visibility = "hidden";
	myBResFldrMenu_open = false;
  }
  else if (myBSepMenu_open) {
	menuClosed = true;
	MyBSepMenuStyle.visibility = "hidden";
	myBSepMenu_open = false;
  }
  else if (myBMultMenu_open) {
	menuClosed = true;
	MyBMultMenuStyle.visibility = "hidden";
	myBMultMenu_open = false;
  }
  else if (myBProtMenu_open) {
	menuClosed = true;
	MyBProtMenuStyle.visibility = "hidden";
	myBProtMenu_open = false;
  }
  else if (myBProtFMenu_open) {
	menuClosed = true;
	MyBProtFMenuStyle.visibility = "hidden";
	myBProtFMenu_open = false;
  }
  else if (myMGlassMenu_open) {
	menuClosed = true;
	MyMGlassMenuStyle.visibility = "hidden";
	myMGlassMenu_open = false;
  }

  myMenu_open = isResultMenu = false;
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

  let isShowBkmkMenu = !options.advancedClick; // If not advanced, always "Show bookmark" by default
  let className = target.className;
  if ((className != undefined)
	  && (target.className.length > 0)) {
	// Go up to the row level, and store the rowIndex and type in the menu as data- attribute
	let row;
	let cell;
	if (className.includes("fav") || className.startsWith("rtwistie")) {
	  row = (cell = target.parentElement.parentElement).parentElement;
	}
	else if (className.startsWith("rbkmkitem_")) {
	  row = (cell = target.parentElement).parentElement;
	}
	else { // .brow
	  row = (cell = target).parentElement;
	  if (options.advancedClick)
		isShowBkmkMenu = true; // When clicking outside the span, alway show the simple mode menu--
	}

/*
	// Retrieve bookmark information in the result row (BN.id)
	// Then show it
	handleResultClick(resultBN_id);
*/

	// Highlight the result item
	cell.focus();

	// Determine proper menu from type, signal it is open,
	// and store the rowIndex in it as data-index attribute
	let type = row.dataset.type;
	let rowIndex = row.rowIndex;
	let menu;
//trace("Row: "+row+" rowIndex: "+rowIndex+" type: "+type);
	if (beforeFF64) { // Use our built-in menus
	  if (rselection.selectIds.length > 1) { // Menu for multiple selection
		if (checkFolderInSelection(rselection)) {
		  if (MyRMultMenuOpenTab.className == "menuopentab")
			MyRMultMenuOpenTab.className = "menudisabled";
		  if (MyRMultMenuOpenWin.className == "menuopenwin")
			MyRMultMenuOpenWin.className = "menudisabled";
		  if (MyRMultMenuOpenPriv.className == "menuopenpriv")
			MyRMultMenuOpenPriv.className = "menudisabled";
		}
		else {
		  if (MyRMultMenuOpenTab.className == "menudisabled")
			MyRMultMenuOpenTab.className = "menuopentab";
		  if (MyRMultMenuOpenWin.className == "menudisabled")
			MyRMultMenuOpenWin.className = "menuopenwin";
		  if (MyRMultMenuOpenPriv.className == "menudisabled")
			MyRMultMenuOpenPriv.className = "menuopenpriv";
		}
		if (checkProtectedInSelection(rselection)) {
		  if (MyRMultMenuCut.className == "menucut")
			MyRMultMenuCut.className = "menudisabled";
		  if (MyRMultMenuCopy.className == "menucopy")
			MyRMultMenuCopy.className = "menudisabled";
		  if (MyRMultMenuDel.className == "menudel")
			MyRMultMenuDel.className = "menudisabled";
		}
		else {
		  if (MyRMultMenuCut.className == "menudisabled")
			MyRMultMenuCut.className = "menucut";
		  if (MyRMultMenuCopy.className == "menudisabled")
			MyRMultMenuCopy.className = "menucopy";
		  if (MyRMultMenuDel.className == "menudisabled")
			MyRMultMenuDel.className = "menudel";
		}
		myMenu_open = isResultMenu = myRMultMenu_open = true;
		menu = MyRMultMenu;
	  }
	  else if (type == "bookmark") { // Menu for single bookmark
		if (isShowBkmkMenu) {
		  myMenu_open = isResultMenu = myRShowBkmkMenu_open = true;
		  menu = MyRShowBkmkMenu;
		}
		else {
		  myMenu_open = isResultMenu = myRBkmkMenu_open = true;
		  menu = MyRBkmkMenu;
		}
	  }
	  else { // Menu for single folder
		myMenu_open = isResultMenu = myRFldrMenu_open = true;
		menu = MyRFldrMenu;

		// Disable "Go parent folder" if this is one of the top level folders (i.e. parent is root, not visible)
		let BN_id = row.dataset.id;
		if ((BN_id == PersonalToobar) || (BN_id == BookmarksMenu) || (BN_id == OtherBookmarks) || (BN_id == MobileBookmarks)) {
		  if (MyRFldrMenuGoParent.className == "menugoparent")
			MyRFldrMenuGoParent.className = "menudisabled";
		  if (MyRFldrMenuCut.className == "menucut")
			MyRFldrMenuCut.className = "menudisabled";
		  if (MyRFldrMenuCopy.className == "menucopy")
			MyRFldrMenuCopy.className = "menudisabled";
		  if (MyRFldrMenuDel.className == "menudel")
			MyRFldrMenuDel.className = "menudisabled";
		}
		else {
		  if (MyRFldrMenuGoParent.className == "menudisabled")
			MyRFldrMenuGoParent.className = "menugoparent";
		  if (MyRFldrMenuCut.className == "menudisabled")
			MyRFldrMenuCut.className = "menucut";
		  if (MyRFldrMenuCopy.className == "menudisabled")
			MyRFldrMenuCopy.className = "menucopy";
		  if (MyRFldrMenuDel.className == "menudisabled")
			MyRFldrMenuDel.className = "menudel";
		}
	  }

	  menu.dataset.index = rowIndex;

	  // Display the context menu function of click position
	  e.preventDefault();
	  drawMenu(menu, e.clientY, e.clientX);
	}
	else { // Use integrated FF context menu function -> the background task will build its contents
	  let bn_id = row.dataset.id;
	  if (type == "bookmark") {
		if (isShowBkmkMenu) {
		  menu = Menu_rshowbkmk;
		}
		else {
		  menu = Menu_rbkmk;
		}
	  }
	  else { // Menu for "folder"
		// Disable "Go parent folder" if this is one of the top level folders (i.e. parent is root, not visible)
		if ((bn_id == PersonalToobar) || (bn_id == BookmarksMenu) || (bn_id == OtherBookmarks) || (bn_id == MobileBookmarks)) {
		  menu = Menu_rprotf;
		}
		else {
		  menu = Menu_rfldr;
		}
	  }

	  updateBSP2ContextMenu(menu, false, (rselection.selectIds.length > 1), checkFolderInSelection(rselection),
							checkProtectedInSelection(rselection));
	  myMenu_open = isResultMenu = true; // Remember that this instance opened the menu when processing the onClicked event
	  browser.menus.overrideContext({
		context: "bookmark",
		bookmarkId: bn_id
	  });
	}
  }
  e.stopPropagation(); // Prevent handlers up the DOM chain on same event
}

/*
 * Check whether a rowIndex is within a zone or not
 * 
 * rowIndex is index of row to check
 * a_zone is an array of zones (zone = [min index, max index], itself an array)
 *
 * Returns Boolean: true = is within zone.
 */
function isInZone (rowIndex, a_zone) {
  let len = a_zone.length;
  let is_inZone = false;
  let zone;
  for (let i=0; i<len ; i++) {
	zone = a_zone[i];
	if ((rowIndex >= zone[0]) && (rowIndex <= zone[1])) {
	  is_inZone = true;
	  break;
	}
  }
  return (is_inZone);
}

/*
 * Receive event from right clicks on bookmarks table, and display context menu
 * 
 * e is of type MouseEvent (contextmenu)
 */
let noPasteZone = new ZoneDesc ();
function bkmkContextHandler (e) {
  let target = e.target; // Type depends ..
//console.log("Bookmark context event: "+e.type+" target: "+target+" class: "+target.classList);

  if (target.id == "bookmarks") { // If click outside the bookmarksTable, ignore
	e.preventDefault();
  }
  else {
	// Go up to the row level
	let className = target.className;
	let row;
	let cell;
	if (className.includes("fav") || className.startsWith("twistie")) {
	  row = (cell = target.parentElement.parentElement).parentElement;
	}
	else if (className.startsWith("bkmkitem_")) {
	  row = (cell = target.parentElement).parentElement;
	}
	else { // .brow
	  row = (cell = target).parentElement;
	}

	// Highlight bookmark item
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
	  if (selection.selectIds.length > 1) { // Menu for multiple selection
		if (checkFolderInSelection(selection)) {
		  if (MyBMultMenuOpenTab.className == "menuopentab")
			MyBMultMenuOpenTab.className = "menudisabled";
		  if (MyBMultMenuOpenWin.className == "menuopenwin")
			MyBMultMenuOpenWin.className = "menudisabled";
		  if (MyBMultMenuOpenPriv.className == "menuopenpriv")
			MyBMultMenuOpenPriv.className = "menudisabled";
		}
		else {
		  if (MyBMultMenuOpenTab.className == "menudisabled")
			MyBMultMenuOpenTab.className = "menuopentab";
		  if (MyBMultMenuOpenWin.className == "menudisabled")
			MyBMultMenuOpenWin.className = "menuopenwin";
		  if (MyBMultMenuOpenPriv.className == "menudisabled")
			MyBMultMenuOpenPriv.className = "menuopenpriv";
		}
		if (checkProtectedInSelection(selection)) {
		  if (MyBMultMenuCut.className == "menucut")
			MyBMultMenuCut.className = "menudisabled";
		  if (MyBMultMenuCopy.className == "menucopy")
			MyBMultMenuCopy.className = "menudisabled";
		  if (MyBMultMenuDel.className == "menudel")
			MyBMultMenuDel.className = "menudisabled";
		}
		else {
		  if (MyBMultMenuCut.className == "menudisabled")
			MyBMultMenuCut.className = "menucut";
		  if (MyBMultMenuCopy.className == "menudisabled")
			MyBMultMenuCopy.className = "menucopy";
		  if (MyBMultMenuDel.className == "menudisabled")
			MyBMultMenuDel.className = "menudel";
		}
		myMenu_open = myBMultMenu_open = true;
		menu = MyBMultMenu;
	  }
	  else if (type == "bookmark") { // Menu for single bookmark
		if (row.dataset.protect == "true") { // Protected row
		  menu = MyBProtMenu;
		  myMenu_open = myBProtMenu_open = true;
		}
		else { // Non protected row
		  // Check if we are on an highlighted result row which is hidden
		  if (!options.openTree && row.firstElementChild.classList.contains(Reshidden)) {
			menu = MyBResBkmkMenu;
			if ((bkmkClipboard.length > 0) && !noPasteZone.isInZone(rowIndex)) {
			  if (MyBResBkmkMenuPaste.className == "menudisabled")
				MyBResBkmkMenuPaste.className = "menupaste";
			}
			else {
			  if (MyBResBkmkMenuPaste.className == "menupaste")
				MyBResBkmkMenuPaste.className = "menudisabled";
			}
			if (options.disableFavicons) {
			  if (MyBResBkmkMenuFavicon.className == "menurefreshfav")
				MyBResBkmkMenuFavicon.className = "menudisabled";
			}
			else {
			  if (MyBResBkmkMenuFavicon.className == "menudisabled")
				MyBResBkmkMenuFavicon.className = "menurefreshfav";
			}
			myMenu_open = myBResBkmkMenu_open = true;
		  }
		  else {
			menu = MyBBkmkMenu;
			if ((bkmkClipboard.length > 0) && !noPasteZone.isInZone(rowIndex)) {
			  if (MyBBkmkMenuPaste.className == "menudisabled")
				MyBBkmkMenuPaste.className = "menupaste";
			}
			else {
			  if (MyBBkmkMenuPaste.className == "menupaste")
				MyBBkmkMenuPaste.className = "menudisabled";
			}
			if (options.disableFavicons) {
			  if (MyBBkmkMenuFavicon.className == "menurefreshfav")
				MyBBkmkMenuFavicon.className = "menudisabled";
			}
			else {
			  if (MyBBkmkMenuFavicon.className == "menudisabled")
				MyBBkmkMenuFavicon.className = "menurefreshfav";
			}
			myMenu_open = myBBkmkMenu_open = true;
		  }
		}
	  }
	  else if (type == "folder") { // Menu for single folder
		if (row.dataset.protect == "true") { // Protected row
		  menu = MyBProtFMenu;
		  // Disable paste into if this is the "Most visited .." or one of the "Recent .." folders
		  let bn_id = row.dataset.id;
		  if ((bkmkClipboard.length > 0) && !noPasteZone.isInZone(rowIndex)
			  && (bn_id != mostVisitedBNId) && (bn_id != recentTagBNId) && (bn_id != recentBkmkBNId)
			 ) {
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
		  if (!options.openTree && row.firstElementChild.classList.contains(Reshidden)) {
			menu = MyBResFldrMenu;
			if ((bkmkClipboard.length > 0) && !noPasteZone.isInZone(rowIndex)) {
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
			if ((bkmkClipboard.length > 0) && !noPasteZone.isInZone(rowIndex)) {
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
	  else { // Menu for single separator
		if (row.dataset.protect != "true") { // Non protected row
		  menu = MyBSepMenu;
		  if ((bkmkClipboard.length > 0) && !noPasteZone.isInZone(rowIndex)) {
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
	  let sortVisible = false;
	  if (type == "bookmark") {
		if (row.dataset.protect == "true") { // Protected row
		  menu = Menu_bprot;
		}
		else { // Non protected row
		  pasteEnabled = ((bkmkClipboard.length > 0) && !noPasteZone.isInZone(rowIndex));
		  // Check if we are on an highlighted result row which is hidden
		  if (!options.openTree && row.firstElementChild.classList.contains(Reshidden)) {
			menu = Menu_bresbkmk;
		  }
		  else {
			menu = Menu_bbkmk;
		  }
		}
	  }
	  else if (type == "folder") {
		pasteEnabled = ((bkmkClipboard.length > 0) && !noPasteZone.isInZone(rowIndex));
		if (row.dataset.protect == "true") { // Protected row
		  menu = Menu_bprotf;
		  // Disable paste into if this is the "Most visited .." or one of the "Recent .." folders
		  let bn_id = row.dataset.id;
		  if ((bn_id == mostVisitedBNId) || (bn_id == recentTagBNId) || (bn_id == recentBkmkBNId)) {
			pasteEnabled = false;
		  }
		  // Authorize sort on top level protected folders
		  if ((bn_id == PersonalToobar) || (bn_id == BookmarksMenu) || (bn_id == OtherBookmarks) || (bn_id == MobileBookmarks)) {
			sortVisible = true;
		  }
		}
		else { // Non protected row
		  // Check if we are on an highlighted result row which is hidden
		  if (!options.openTree && row.firstElementChild.classList.contains(Reshidden)) {
			menu = Menu_bresfldr;
		  }
		  else {
			menu = Menu_bfldr;
		  }
		}
	  }
	  else { // Separator
		if (row.dataset.protect == "true") { // Protected row
		  e.preventDefault(); // No menu on protected separators
//		  menu = Menu_bprots;
		}
		else { // Non protected row
		  pasteEnabled = ((bkmkClipboard.length > 0) && !noPasteZone.isInZone(rowIndex));
		  menu = Menu_bsep;
		}
	  }

	  if (menu != undefined) {
		updateBSP2ContextMenu(menu, pasteEnabled, (selection.selectIds.length > 1), checkFolderInSelection(selection),
							  checkProtectedInSelection(selection), !options.disableFavicons, sortVisible);
		myMenu_open = true; // Remember that this instance opened the menu when processing the onClicked event
		// Open menu
		browser.menus.overrideContext({
		  context: "bookmark",
		  bookmarkId: row.dataset.id
		});
	  }
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
 *
 * selection = selection Object
 * dt = event DataTransfer object to set
 *
 * Sets global variable dtSignature
 */
let noDropZone; // ZoneDexc to identify where we cannot drop a BSP2 or native bookmark drag
let dtSignature; // Used to verify if a drag operation is always the same, to calculate no drop zone only once
				 // (both isBkmkItemDragged and isRsltItemDragged are false when not an internal drag)
function setDragTransfer (selection, dt) {
  // Get unique list of dragged BNs (none including another)
  let BN, BNDragged;
  let bnId, bnIdDragged;
  bkmkDragIds = [];
  bkmkDrag = [];
  let selectIds = selection.selectIds;
  let len = selectIds.length;
  for (let i=0 ; i<len ; i++) {
	bnId = selectIds[i];
	BN = curBNList[bnId];
	if (BNDragged == undefined) { // text/x-moz-place<-xxx> can (for now) only hold one bookmark = first one  
	  BNDragged = BN;
	  bnIdDragged = bnId;
	}
	uniqueListAddBN(bnId, BN, bkmkDragIds, bkmkDrag);
  }
  // Set no drop zone on those BNs
  noDropZone = new ZoneDesc ();
  len = bkmkDragIds.length;
  for (let i=0 ; i<len ; i++) {
	zoneAddBN(noDropZone, bkmkDragIds[i], bkmkDrag[i]);
  }

  // Build dataTransfer in the event
  // For a bookmark:	application/x-bookmark and text/x-moz-place,text/x-moz-url,text/plain,text/html
  // For a folder:		application/x-bookmark and text/x-moz-place-container,text/x-moz-url,text/plain,text/html
  // For a separator:	application/x-bookmark and text/x-moz-place-separator,text/plain,text/html

  // Data for BSP2 bookmark object = unique list (Array) of bookmark ids
  // application/x-bookmark is for BSP2 internal drag & drops.
  let json = JSON.stringify(bkmkDragIds);
  dt.setData("application/x-bookmark", dtSignature = json);
//console.log("selectIds: "+selectIds);
//console.log("bkmkDragIds: "+bkmkDragIds);
//console.log("dtSignature: "+dtSignature);

  // Rest is:
  // text/x-moz-place<-xxx> (native Bookmark sidebar):
  // Native Bookmark data like  {"title":"Nouveau dossier","id":2238,"itemGuid":"VQ8ulNGyfXk0","instanceId":"jvwImUhXA2rV","parent":2099,"parentGuid":"CLSASmpIpBmQ",
  // 							 "dateAdded":1536393478662000,"lastModified":1536393478662000,"type":"text/x-moz-place-container"}
  //							{"title":"_  New bookmark","id":2350,"itemGuid":"JE2j0D-5tnpT","instanceId":"jvwImUhXA2rV","parent":2028,"parentGuid":"XmOZ-HAGbfEM",
  //							 "dateAdded":1550944109935000,"lastModified":1551218607521000,"type":"text/x-moz-place","uri":"about:blank"}
  //							{"title":"","id":2239,"itemGuid":"gORenOTsYJdk","instanceId":"jvwImUhXA2rV","parent":2028,"parentGuid":"XmOZ-HAGbfEM",
  //							 "dateAdded":1536396421579000,"lastModified":1551022707690000,"type":"text/x-moz-place-separator"}
  // text/plain:
  // Native Bookmark data like  New folder3
  //								about:blank
  //								--------------------
  //							about:blank
  //							--------------------
  // text/html:
  // Native Bookmark data like  <DL><DT>New folder3</DT><DD><A HREF="about:blank">New bookmark5</A></DD><DD><HR></DD><DD><A HREF="about:blank">New bookmark4</A></DD></DL>
  //							<BR/><A HREF="about:blank">_  New bookmark</A>
  //							<BR/><HR>
  //
  // text/x-moz-url: documented in https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsITransferable
  //	a text string containing the URL, a newline (\n), then the title of the page
  //		about:blank\nNew bookmark44
  //	NOTE: no support for folders nor separator, no support for multiple bookmarks

  // Data for native bookmark object = first bookmark only for now
  let type = BNDragged.type;
  let isFolder = (type == "folder");
  if (isFolder) {
	json = JSON.stringify(
	  {title: BNDragged.title,
	   itemGuid: bnIdDragged,
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
	   itemGuid: bnIdDragged,
	   parentGuid: BNDragged.parentId,
	   dateAdded: BNDragged.dateAdded,
	   lastModified: BNDragged.lastModified,
	   type: "text/x-moz-place-separator"
	  }
	);
  }
  else { // Bookmark
	let title = BNDragged.title;
	let url = BNDragged.url;
	json = JSON.stringify(
	  {title: title,
	   itemGuid: bnIdDragged,
	   parentGuid: BNDragged.parentId,
	   dateAdded: BNDragged.dateAdded,
	   lastModified: BNDragged.lastModified,
	   type: "text/x-moz-place",
	   uri: url
	  }
	);
	// Shortcut URLs dragged to system can only be for bookmarks
	let shortcutUrl = url+"\n"+title;
	dt.setData("text/x-moz-url", shortcutUrl);
  }
  dt.setData("text/x-moz-place", json);

  // Data for plain text and HTML
  len = bkmkDrag.length;
  let plain = "";
  let html = "";
  let plain_sep = ""; 
  let html_sep = "";
//  let xmozurl;
  for (let i=0 ; i<len ; i++) {
	BN = bkmkDrag[i];
	plain += plain_sep + BN_toPlain(BN); 
	html += html_sep + BN_toHTML(BN);
	if (i == 0) { // Separator for next objects
	  plain_sep = "\n"; 
 	  html_sep = "<BR/>";
	}
  }
  dt.setData("text/plain", plain);
  dt.setData("text/html", html);
  dt.effectAllowed = "copyMove";
}

/*
 * Drag start event handler, on the bookmarks table
 * 
 * e = DragEvent
 * 
 * Sets global variables noDropZone, isBkmkItemDragged and dtSignature
 */
function bkmkDragStartHandler (e) {
  let rowDragged = e.target; // Should always be a [object HTMLTableRowElement] by construction
//console.log("Drag start event: "+e.type+" target: "+rowDragged+" class: "+rowDragged.classList);
//console.log("Draggable: "+rowDragged.draggable+" Protected: "+rowDragged.dataset.protect);
//console.log("BN_id: "+rowDragged.dataset.id);
  if (rowDragged.dataset.protect != "true") {
	isBkmkItemDragged = true; // Signal we are dragging an internal item to prevent scrolling
	setDragTransfer(selection, e.dataTransfer); // This sets dtSignature
  }
}

/*
 * Drag end event handler. This is on the element which was in Drag start = HTMLTableRowElement
 * 
 * e = DragEvent
 *
 * Sets global variables noDropZone and isBkmkItemDragged
 */
function bkmkDragEndHandler (e) {
  // Signal we stopped dragging an internal item
  isBkmkItemDragged = false;
  isBkmkDragActive = false;
  refBkmkScrollLeft = refBkmkScrollTop = -1;

//let target = e.target;
//console.log("Drag end event: "+e.type+" target: "+target+" class: "+target.classList);
  dtSignature = undefined; // Forget dragged signature
  noDropZone = undefined;
}

/*
 * Drag start event handler, on the search result table
 * 
 * e = DragEvent
 * 
 * Sets global variables noDropZone, isRsltItemDragged and dtSignature
 */
function resultsDragStartHandler (e) {
  // Inhibit result pane scrolling
  disableRsltScroll();
  let rowDragged = e.target; // Should always be a [object HTMLTableRowElement] by construction
//console.log("Drag start event: "+e.type+" target: "+rowDragged+" class: "+rowDragged.classList);
//console.log("Draggable: "+rowDragged.draggable+" Protected: "+rowDragged.dataset.protect);
//console.log("BN_id: "+rowDragged.dataset.id);
  if (rowDragged.dataset.protect != "true") {
	isRsltItemDragged = true; // Signal we are dragging an internal item
	setDragTransfer(rselection, e.dataTransfer); // This sets dtSignature
  }
}

/*
 * Drag end event handler. This is on the element which was in Drag start = HTMLTableRowElement
 * 
 * e = DragEvent
 *
 * Sets global variables noDropZone and isRsltItemDragged
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
  dtSignature = undefined; // Forget dragged signature
  noDropZone = undefined;
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
 * Trace dt content for debug
 * 
 * dt = DataTransfer
 */
function traceDt (dt) {
  console.log("-------------------");
  console.log("Items length : "+dt.items.length);
  for (let i=0 ; i<dt.items.length; i++) {
	console.log("... items["+i+"].kind = "+dt.items[i].kind + "; type = "+dt.items[i].type);
  }
  let itemCount;
  let mozItemCount = dt.mozItemCount;
  if (mozItemCount != undefined) {
	itemCount = mozItemCount;
  }
  else {
	itemCount = 1;
  }
  console.log("mozItemCount : "+mozItemCount);
  console.log("itemCount    : "+itemCount);
  let types;
  let type;
  let data;
  let files, file;
  let len_t, len_f;
  for (let i=0 ; i<itemCount ; i++) {
	if (i == 0) {
	  types = dt.types;
	}
	else {
	  // Convert from a DOMStringList to an Array of DOMString
	  types = dt.mozTypesAt(i);
	}
	len_t = types.length;
	console.log("Types["+i+"] length : "+len_t);
	for (let j=0 ; j<len_t; j++) {
	  type = types[j];
	  console.log("... types["+i+", "+j+"] = "+type);
	  files = dt.files;
	  len_f = files.length;
	  console.log("...... files.length = "+len_f);
	  if ((type == "application/x-moz-file") || (type == "Files")) {
		if (j == 0) { // Do it only once, as not indexed by type
		  for (let k=0 ; k<len_f; k++) {
			file = files.item(k);
			if (file == null) {
			  console.log("...... files["+i+", "+k+"] is null ");
			}
			else {
			  console.log("...... files["+i+", 0, "+k+"].name = "+file.name);
			  console.log("...... files["+i+", 0, "+k+"].size = "+file.size);
			  console.log("...... files["+i+", 0, "+k+"].type = "+file.type);
			  console.log("...... files["+i+", 0, "+k+"].webkitRelativePath = "+file.webkitRelativePath);
			}
		  }
		}
	  }
	  else {
		if (i == 0) {
		  data = dt.getData(type);
		}
		else {
		  data = dt.mozGetDataAt(type, i);
		}
		console.log("...... data["+i+", "+type+"] = <<"+data+">>");
	  }
	}
  }
}

/*
 * Check if we support drag and drop of the source element
 * 
 * dt = DataTransfer
 * 
 * Return Boolean = true if supported, else false
 * Updates dtSignature, bkmkDragIds, bkmkDrag and noDropZone when not an internal drag (both isBkmkItemDragged and isRsltItemDragged false)
 */
function checkDragType (dt) {
  // When the dragged element is one of our BSP2 bookmarks ,its dt.types will be
  //   dt.types        : application/x-bookmark,[text/uri-list,]text/plain
  // When it is a native FF Bookmark, it will be
  //   dt.types        : text/x-moz-place
  //		with data like: {"title":"Nouveau dossier","id":2238,"itemGuid":"VQ8ulNGyfXk0","instanceId":"jvwImUhXA2rV","parent":2099,"parentGuid":"CLSASmpIpBmQ",
  //                         "dateAdded":1536393478662000,"lastModified":1536393478662000,"type":"text/x-moz-place-container"}
  //						{"title":"_  New bookmark","id":2350,"itemGuid":"JE2j0D-5tnpT","instanceId":"jvwImUhXA2rV","parent":2028,"parentGuid":"XmOZ-HAGbfEM",
  //						 "dateAdded":1550944109935000,"lastModified":1551218607521000,"type":"text/x-moz-place","uri":"about:blank"}
  //						{"title":"","id":2239,"itemGuid":"gORenOTsYJdk","instanceId":"jvwImUhXA2rV","parent":2028,"parentGuid":"XmOZ-HAGbfEM",
  //						 "dateAdded":1536396421579000,"lastModified":1551022707690000,"type":"text/x-moz-place-separator"}
  //        Note that drag and drops from FF History sidebar also have this type, but they have "id":-1 and "itemGuid":"" -> no corresponding bookmark
  //						{"title":"Suggestion","id":-1,"itemGuid":"","instanceId":"Fb4st0KZ4ASX","type":"text/x-moz-place","uri":"https://github.com/aaFn/Bookmark-search-plus-2/issues/237"}
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
  // When it is a Windows Explorer bookmark (.URL file):
  //   dt.types		   : application/x-moz-file, Files
  //		with bookmark name in files[index].name (minus .URL)
  //		and content in file: 	[InternetShortcut]
  //								URL=https://microsoftnews.msn.com/en-us/news/elections-2020?ocid=msedgdhp
  // When it is a Linux x-desktop link (.desktop file):
  //   dt.types		   : application/x-moz-file, Files
  //		with bookmark name in files[index].name (minus .desktop)
  //		and content in file: 	[Desktop Entry]
  //								Encoding=UTF-8
  //								Name=Link to Overview - xxx
  //								Type=Link
  //								URL=https://xxx
  //								Icon=mate-fs-bookmark
  // When it is a Linux x-desktop link (.webloc file):
  //   dt.types		   : application/x-moz-file, Files
  //		with bookmark name in files[index].name (minus .webloc)
  //		and content in file: 	<?xml version="1.0" encoding="UTF-8"?>
  //								<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  //								<plist version="1.0">
  //								<dict>
  //									<key>URL</key>
  //									<string>https://support.mozilla.org/en-US/products/firefox</string>
  //								</dict>
  //								</plist>
//traceDt(dt);
  let isSupported;
  let format, data;
  let types = dt.types;
  if (types.includes(format = "application/x-bookmark")) { // BSP2 drag
	// If not internal drag ()can be another BSP2 panel instance), update bkmkDragIds, bkmkDrag and noDropZone if needed
	// (trigerred by different dtSignature)
	if (!isBkmkItemDragged && !isRsltItemDragged && (dtSignature != (data = dt.getData(format)))) {
//console.log("dtSignature: "+dtSignature+" - data: "+data);
	  dtSignature = data;
	  // Data for a BSP2 bookmark drag = unique list (Array) of bookmark ids
	  bkmkDragIds = JSON.parse(data);
	  // Build bkmkDrag and noDropzone
	  bkmkDrag = [];
	  noDropZone = new ZoneDesc ();
	  let BN;
	  let bnId;
	  let len = bkmkDragIds.length;
	  for (let i=0 ; i<len ; i++) {
		BN = curBNList[bnId = bkmkDragIds[i]];
		bkmkDrag.push(BN);
		zoneAddBN(noDropZone, bnId, BN);
	  }
	}
	isSupported = true;
  }
  else if (types.includes(format = "text/x-moz-place")) { // Native FF Bookmark sidebar drag, of FF History drag
	// Cannot be an internal drag, build signature to compare with stored one (only manipulate as String to be quick)
	// Handle multiple items drag -- GECKO SPECIFIC !! -- No more supported as of FF71, didn't find an alternative yet :-(
	let itemCount;
	let mozItemCount = dt.mozItemCount;
	if (mozItemCount != undefined) {
	  itemCount = mozItemCount;
	}
	else {
	  itemCount = 1;
	}
	// Note: FF native bookmark sidebar doesn't set getData() until the drop is effective,
	// so we cannot build and check the noDropZone until last moment :-( !!
	if (itemCount == 1) {
	  data = "[" + dt.getData(format) + "]";
	}
	else {
	  data = "[";
	  for (let i=0 ; i<itemCount ; i++) { // Get each dragged item
		if (i>0)   data += ",";
		data +=	dt.mozGetDataAt(format, i);
	  }
	  data += "]";
	}
	// If different dtSignature, update bkmkDragIds, bkmkDrag and noDropZone 
	if (dtSignature != data) {
//console.log("dtSignature: "+dtSignature+" - data: "+data);
	  dtSignature = data;

	  let a_bookmark = JSON.parse(data);
	  // Build bkmkDragIds and bkmkDrag as unique lists
	  let bnId;
	  let j;
	  let BN;
	  bkmkDragIds = [];
	  bkmkDrag = [];
	  let len = a_bookmark.length;
	  for (let i=0 ; i<len ; i++) {
		bnId = (j = a_bookmark[i]).itemGuid;
		if (bnId == "") { // FF Histoy drag (presumably)
//						{"title":"Suggestion","id":-1,"itemGuid":"","instanceId":"Fb4st0KZ4ASX","type":"text/x-moz-place","uri":"https://github.com/aaFn/Bookmark-search-plus-2/issues/237"}
  		  bkmkDrag.push({title: j.title, url: j.uri});
		}
		else { // FF native sidebar Bookmark drag (presumably)
		  BN = curBNList[bnId];
		  if ((BN == undefined) && (bnId != MobileBookmarks)) { // Desynchro !! => reload bookmarks from FF API
			// Signal reload to background, and then redisplay to all
			sendAddonMessage("reloadFFAPI_auto");
		  }
		  else {
			uniqueListAddBN(bnId, BN, bkmkDragIds, bkmkDrag);
		  }
		}
	  }
	  // Set no drop zone
	  noDropZone = new ZoneDesc ();
	  len = bkmkDragIds.length;
	  for (let i=0 ; i<len ; i++) {
		zoneAddBN(noDropZone, bkmkDragIds[i], bkmkDrag[i]);
	  }
	}
	isSupported = true;
  }
  else if (types.includes("text/x-moz-text-internal")
		   || types.includes("text/uri-list")
		   || types.includes("text/x-moz-url")
		  ) { // Other type of drag
	isSupported = true;
  }
  else if (dt.types.includes(format = "application/x-moz-file")
		  ) { // Drag from windows explorer
	let data = format + "-" + dt.files.length;
	if (dtSignature != data) {
//console.log("dtSignature: "+dtSignature+" - data: "+data);
	  dtSignature = data;
//traceDt(dt);
	}
	isSupported = true;
  }  else {
	isSupported = false;	
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
	  if (bkmkitem_x.firstElementChild.classList.contains("twistieac"))
		isFolderClosed = true;
	  else   isFolderClosed = false;
	  nextRow = row.nextElementSibling;
	  isFolderEmpty = (nextRow == undefined) || isStringA_le_B(nextRow.dataset.level, level);
	}
  }
  else if (className.includes("fav") || className.startsWith("twistie")) {
	row = (bkmkitem_x = target.parentElement).parentElement.parentElement;
	isProtected = (row.dataset.protect == "true");
	isTopItem = ((level = row.dataset.level) == "0");
	isBkmkitem_f = (row.dataset.type == "folder");
	if (isBkmkitem_f) {
	  if (bkmkitem_x.firstElementChild.classList.contains("twistieac"))
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
	if (bkmkitem_x.firstElementChild.classList.contains("twistieac"))
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
  else if (className.includes("brow")) {
	row = target.parentElement;
	bkmkitem_x = target.firstElementChild;
	isProtected = (row.dataset.protect == "true");
	isTopItem = ((level = row.dataset.level) == "0");
	isBkmkitem_f = (row.dataset.type == "folder");
	if (isBkmkitem_f) {
	  if (bkmkitem_x.firstElementChild.classList.contains("twistieac"))
		isFolderClosed = true;
	  else   isFolderClosed = false;
	  nextRow = row.nextElementSibling;
	  isFolderEmpty = (nextRow == undefined) || isStringA_le_B(nextRow.dataset.level, level);
	}
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
  if (((target.className == undefined)  // When on Text, className and classList are undefined.
	   || (target.className.length > 0)
	  )
	  && checkDragType(dt)
    ) {
	// Get the enclosing row and bkmkitem_x inside it which we will highlight
	// Note: when the mouse is over the lifts, an HTMLDivElement is returned
	let row = getDragToRow(target);
//console.log("Enter row: "+row+" class: "+row.classList+" BN_id: "+row.dataset.id);
//console.log("Bkmkitem_x: "+bkmkitem_x+" class: "+bkmkitem_x.classList);
	if (row == undefined) { // We are on the scrollbars for example
	  highlightRemove(e);
	  dt.dropEffect = "none"; // Signal drop not allowed
	}
	else {
	  let is_ctrlKey = (isMacOS ? e.metaKey : e.ctrlKey);
	  if ((!is_ctrlKey && (noDropZone != undefined) && noDropZone.isInZone(row.rowIndex))
		  || (isProtected && !isTopItem) // Protection, can't drop on non top draggable elements = specials
	     ) {
		highlightRemove(e);
		dt.dropEffect = "none"; // Signal drop not allowed
	  }
	  else {
		e.preventDefault(); // Allow drop
		highlightInsert(e);
		if (isBkmkItemDragged) { // For internal drags, take Ctrl key into account to change visual feedback
		  dt.dropEffect = (is_ctrlKey ? "copy" : "move");
		}
	  }
	}
  }
  else {
	highlightRemove(e);
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
  if (((target.className == undefined)  // When on Text, className and classList are undefined.
	   || (target.className.length > 0)
	  )
	  && checkDragType(dt)
    ) {
	// Get the enclosing row
	// Note: when the mouse is over the lifts, an HTMLDivElement is returned
	let row = getDragToRow(target);
//console.log("Over row: "+row+" class: "+row.classList+" BN_id: "+row.dataset.id);
//console.log("Bkmkitem_x: "+bkmkitem_x+" class: "+bkmkitem_x.classList);
	if (row == undefined) { // We are on the scrollbars for example
	  highlightRemove(e);
	  dt.dropEffect = "none"; // Signal drop not allowed
	}
	else {
	  let is_ctrlKey = (isMacOS ? e.metaKey : e.ctrlKey);
	  if ((!is_ctrlKey && (noDropZone != undefined) && noDropZone.isInZone(row.rowIndex))
		  || (isProtected && !isTopItem) // Protection, can't drop on non top draggable elements = specials
	     ) {
		highlightRemove(e);
		dt.dropEffect = "none"; // Signal drop not allowed
	  }
	  else {
		e.preventDefault(); // Allow drop
		highlightInsert(e);
		if (isBkmkItemDragged) { // For internal drags, take Ctrl key into account to change visual feedback
		  dt.dropEffect = (is_ctrlKey ? "copy" : "move");
		}
	  }
	}
  }
  else {
	highlightRemove(e);
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
  if ((targetType != "HTMLDocument") // When we drop on a dropEffect=none zone (drop not fired, but leave or exit)
	  && ((target.className == undefined)  // When on Text, className and classList are undefined.
	 	  || (target.className.length > 0)
		 )
	  && checkDragType(dt)
    ) {
	// Get the enclosing row
	// Note: when the mouse is over the lifts, an HTMLDivElement is returned
	let row = getDragToRow(target);
//console.log("Leave row: "+row+" class: "+row.classList+" BN_id: "+row.dataset.id);
	if (row == undefined) { // We are on the scrollbars for example
	  dt.dropEffect = "none"; // Signal drop not allowed
	}
	else {
	  if (isBkmkItemDragged) { // For internal drags, take Ctrl key into account to change visual feedback
		let is_ctrlKey = (isMacOS ? e.metaKey : e.ctrlKey);
		dt.dropEffect = (is_ctrlKey ? "copy" : "move");
	  }
	}
  }
  else {
	dt.dropEffect = "none"; // Signal drop not allowed
  }
  highlightRemove(e);
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
  if ((targetType != "HTMLDocument") // When we drop on a dropEffect=none zone (drop not fired, but leave or exit)
	  && ((target.className == undefined)  // When on Text, className and classList are undefined.
	 	  || (target.className.length > 0)
		 )
	  && checkDragType(dt)
    ) {
	// Get the enclosing row
	// Note: when the mouse is over the lifts, an HTMLDivElement is returned
	let row = getDragToRow(target);
//console.log("Exit row: "+row+" class: "+row.classList+" BN_id: "+row.dataset.id);
	if (row == undefined) { // We are on the scrollbars for example
	  dt.dropEffect = "none"; // Signal drop not allowed
	}
	else {
	  if (isBkmkItemDragged) { // For internal drags, take Ctrl key into account to change visual feedback
		let is_ctrlKey = (isMacOS ? e.metaKey : e.ctrlKey);
		dt.dropEffect = (is_ctrlKey ? "copy" : "move");
	  }
	}
  }
  else {
	dt.dropEffect = "none"; // Signal drop not allowed
  }
  highlightRemove(e);
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
  openPropPopup("new", BTN.id, path, BTN.type, title, BTN.url, BTN.dateAdded);

  // Don't call refresh search, it is already called through bkmkCreatedHandler
}

/*
 * Upon Folder creation menu event, open Window to let the user enter values in fields
 * 
 * BTN is of type BookmarkTreeNode (promise from browser.bookmarks.create())
 */
function createFolder (BTN) {
  let path = BN_path(BTN.parentId);
  openPropPopup("new", BTN.id, path, BTN.type, BTN.title, undefined, BTN.dateAdded);

  // Don't call refresh search, it is already called through bkmkCreatedHandler
}

/*
 * Drag drop event handler
 * 
 * e = DragEvent
 */
const PatternTYPE = /type\s*=\s*(.+)/i;
const PatternNAME = /name\s*=\s*(.+)/i;
const PatternURL = /url\s*=\s*(.+)/i;
const PatternMacOSURL = /\<string\>s*(.+)s*\<\/string\>/i;
async function bkmkDropHandler (e) {
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
  if (((target.className == undefined)  // When on Text, className and classList are undefined.
	   || (target.className.length > 0)
	  )
	  && checkDragType(dt)
    ) {
	// Highlight one last time to make sure we get latest insert position, then remove highlight,
	// in particular to handle case of FF native bookmark sidebar originated drag, droppping inside
	// noDropZone which is only active at the moment of Drop because it doesn't give the dragged data
	// before :-( !
	let insertPos = highlightInsert(e);
	highlightRemove(e);

	// Get the enclosing row
	// Note: when the mouse is over the lifts, an HTMLDivElement is returned
	let row = getDragToRow(target);
//console.log("Drop on row: "+row+" class: "+row.classList+" BN_id: "+row.dataset.id);
//traceDt(dt);

	// Can't happen when in a dropEffect=none zone .. but in case, let's protect against it
	let is_ctrlKey = (isMacOS ? e.metaKey : e.ctrlKey); // When Ctrl is pressed, this is a copy, no protection
	if (is_ctrlKey || (noDropZone == undefined) || !noDropZone.isInZone(row.rowIndex)) {
	  // Drop allowed, forget dragged signature
	  dtSignature = undefined;
	  // Now, get target BookmarkNode
	  let BN_id = row.dataset.id;
	  let BN = curBNList[BN_id];
	  let is_infolder = (insertPos == 0);
	  let bnIndex;
	  if (is_infolder) { // If drop to a folder, apply the option of insert at start or append at end
		if (!options.appendAtFldrEnd) {
		  bnIndex = 0; // At start)
		}  
	  }
	  else  { // If not drop to a folder, insert before or after BN
		bnIndex = BN_getIndex(BN);
		if (insertPos == 1) { // Create just after target row
		  bnIndex++;
		}
	  }

	  // Get data to drop, and insert / move it 
	  // When the dragged element is one of our bookmarks its dt.types will be
	  //   dt.types        : application/x-bookmark,text/x-moz-place<-xxx>, [text/uri-list,] text/plain, text/html
	  // When it is a native bookmark, it will be
	  //   dt.types        : text/x-moz-place<-xxx>
	  // When it is a native tab, it will be
	  //   dt.types        : text/x-moz-text-internal
	  // When it is a link in an HTML page, or in the address bar:
	  //   dt.types        : text/x-moz-url,text/x-moz-url-data,text/x-moz-url-desc,text/uri-list,text/_moz_htmlcontext,text/_moz_htmlinfo,text/html,text/plain
	  let types = dt.types;
	  let type;
	  let is_altKey = e.altKey;
	  if (types.includes(type = "application/x-bookmark")	// Move or copy the dragged bookmark
		  || types.includes(type = "text/x-moz-place")		// Dragging a native Bookmark to us, or an FF History entry
		 ) {
		if (bkmkDragIds.length == 0) { // FF History drag
		  let tgtBN_id = (is_infolder ? BN_id : BN.parentId);
		  let len = bkmkDrag.length;
		  let j;
		  let creating;
		  for (let i=0 ; i<len ; i++) {
			// Create new bookmark item and open properties if Alt key is pressed at same time than drop
			j = bkmkDrag[i];
			creating = createBkmkItem(tgtBN_id, bnIndex, j.title, j.url, "bookmark");
			if (is_altKey) { // Open the Properties window after creation to edit new bookmark item
			  creating.then(createBookmark);
			}
		  }
		}
		else { // BSP2 bookmark or FF native sideba bookmark drag
		  if (is_ctrlKey) { // Copy
			copyBkmk(bkmkDragIds, bkmkDrag, (is_infolder ? BN_id : BN.parentId), bnIndex);
		  }
		  else { // Move
			moveBkmk(bkmkDragIds, bkmkDrag, (is_infolder ? BN_id : BN.parentId), bnIndex);
		  }
		}
	  }
	  else if (types.includes(type = "text/x-moz-text-internal")) { // Dragging one or multiple tabs to us
		let gettingTabs;
		// Handle multiple items drag -- GECKO SPECIFIC !! -- No more supported as of FF71
		// Workaround: use highlighted tabs in the query, as it seems we can retrieve  all the tabs being dragged
		// in returned a_tabs
		// Use lastFocusedWindow: true instead of windowId: myWindowId, to allow dragging from other FF windows
		gettingTabs = browser.tabs.query({lastFocusedWindow: true, highlighted: true});
		gettingTabs.then(
		  function (a_tabs) {
			// Create all highlighted (= supposed dragged) tabs, in reverse order to keep current position
			// Note: working even when appending at end of folder .. it seems like when queueing multiple requests
			//       to the API, this is transforming to the last known index in folder at time of queueing (bug ?)
			let droppedTab;
			let tgtBN_id = (is_infolder ? BN_id : BN.parentId);
			let len = a_tabs.length;
//console.log("tabs length: "+len);
			for (let i=len-1 ; i>=0 ; i--) {
			  droppedTab =  a_tabs[i];
			  // Create new bookmark at insertion point
			  let title = droppedTab.title;
			  let url = droppedTab.url;
			  // Create new bookmark item and open properties if Alt key is pressed at same time than drop
			  let creating = createBkmkItem(tgtBN_id, bnIndex, title, url, "bookmark");
			  if (is_altKey) { // Open the Properties window after creation to edit new bookmark item
				creating.then(createBookmark);
			  }
			}
		  }
		);
/*
		let url;
		let itemCount;
		let mozItemCount = dt.mozItemCount;
		if (mozItemCount != undefined) {
		  itemCount = mozItemCount;
		}
		else {
		  itemCount = 1;
		}
		for (let i=itemCount-1 ; i>=0 ; i--) { // Do it for each dragged item, reverse order to always insert at same index
		  if (i == 0) {
			url = dt.getData(type);
		  }
		  else {
			url = dt.mozGetDataAt(type, i);
		  }
		  // If this is an "about:reader?url=" URL, cannot use the matching pattern form as it does not find "about:" tabs
		  // Trying a work around using "highlighted" tabs .. seems to work and to return all selected tabs under drag ..
		  // => Switching to that trick for any dragged tab, with any kind of URL
		  let urlSearch;
		  if (url.startsWith("about:reader?url=")) { // Remember the initial form, and decode the url for retrieval
			urlSearch = decodeURIComponent(url.substr(17)); // Does not work ! Matching on URL must be full URL from start
		  }
		  else {
			// browser.tabs.query() only uses special a limited pattern matching form ..
			// So remove the parts it cannot support .. at the risk of getting several tabs, to triage later
			let urlObj = new URL (url);
			let protocol = urlObj.protocol;
//			let host = urlObj.host;
			let hostname = urlObj.hostname;
//			let port = urlObj.port;
			let pathname = urlObj.pathname;
			let search = urlObj.search;
//			let hash = urlObj.hash;
			urlSearch = protocol + "//" + hostname + pathname + search;
		  }
		  // Get all tabs corresponding to url
console.log("Query tab for url: "+url+" urlSearch: "+urlSearch);
//		  gettingTabs = browser.tabs.query({windowId: myWindowId, url: urlSearch});
		  // Use lastFocusedWindow: true instead of windowId: myWindowId, to allow dragging from other FF windows
		  gettingTabs = browser.tabs.query({lastFocusedWindow: true, highlighted: true});
		  gettingTabs.then(
			function (a_tabs) {
			  let len = a_tabs.length;
console.log("tabs length: "+len);
			  // In case of multiple tabs because of the shortened url .. retrieve the good one
			  let droppedTab;
			  if (len > 1) {
				let k;
				for (let j=0 ; j<len ; j++) {
				  if ((k = a_tabs[j]).url == url) {
					droppedTab = k;
					break;
				  }
				}
			  }
			  else {
				droppedTab = a_tabs[0];
			  }
			  // Create new bookmark at insertion point
			  let title = droppedTab.title;
			  url = droppedTab.url;
			  // Create new bookmark item and open properties if Alt key is pressed at same time than drop
			  createBkmkItem((is_infolder ? BN_id : BN.parentId), bnIndex, title, url, "bookmark", e.altKey);
			}
		  );
		}
*/
	  }
	  else if (types.includes(type = "application/x-moz-file")) {	// Dragging one or more bookmark from Windows Explorer
		let files = dt.files;
		let file;
		let tgtBN_id = (is_infolder ? BN_id : BN.parentId);
		// Create all dragged URL shortcuts in reverse order to keep current position
		// Note: working even when appending at end of folder .. it seems like when queueing multiple requests
		//       to the API, this is transforming to the last known index in folder at time of queueing (bug ?)
		let len = files.length;
//console.log("...... files.length = "+len);
		let BTN;
		for (let i=0 ; i<len ; i++) { // We will use await to guarantee order of creation
		  file = files.item(i);
		  if (file != null) {
			let name = file.name;
//console.log("...... files["+i+"].name = "+name);
//console.log("...... files["+i+"].size = "+file.size);
//console.log("...... files["+i+"].type = "+file.type);
			let lowerName = name.toLowerCase();
			// Verify this a URL file, and get its title
			let pos;
			if ((pos = lowerName.lastIndexOf(".url")) > 0) { // This should be a Windows Explorer URL shortcurt
			  let title = name.slice(0, pos);
//console.log("...... URL title = "+title);
			  // Get content of the URL file
			  let text = await file.text();
//console.log("...... URL file content = "+text);
			  if (text.startsWith("[InternetShortcut]")) { // Yes, this is a Windows Explorer URL shortcurt
				let a_url = text.match(PatternURL);
				// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match
				// for format of the return value of match()
				// Get the address 
				let url = a_url[1]; // 0 is the full matched string, 1 is the first () group matched
//console.log("...... URL address = "+url);
				// Create new bookmark item and open properties if Alt key is pressed at same time than drop
				if (bnIndex == undefined) {
				  BTN = await createBkmkItem_async(tgtBN_id, undefined, title, url, "bookmark");
				}
				else {
				  BTN = await createBkmkItem_async(tgtBN_id, bnIndex++, title, url, "bookmark");
				}
				if (is_altKey) { // Open the Properties window after creation to edit new bookmark item
				  createBookmark(BTN);
				}
			  }
			}
//			else if (file.type == "application/x-desktop") { // This should be a Linux link
			else if ((pos = lowerName.lastIndexOf(".desktop")) > 0) { // This should be a Linux link
			  let title = name.slice(0, pos);
//console.log("...... URL title = "+title);
			  // Get content of the link file
			  let text = await file.text();
//console.log("...... Link file content = "+text);
			  if (text.startsWith("[Desktop Entry]")) { // Looks like it so far
				let a_url = text.match(PatternTYPE);
				if (a_url[1] == "Link") { // Yes, this is a Linux link
//				  a_url = text.match(PatternNAME);
//				  let title = a_url[1];
//console.log("...... URL title = "+title);
				  a_url = text.match(PatternURL);
				  let url = a_url[1];
//console.log("...... URL address = "+url);
				  // Create new bookmark item and open properties if Alt key is pressed at same time than drop
				  if (bnIndex == undefined) {
					BTN = await createBkmkItem_async(tgtBN_id, undefined, title, url, "bookmark");
				  }
				  else {
					BTN = await createBkmkItem_async(tgtBN_id, bnIndex++, title, url, "bookmark");
				  }
				  if (is_altKey) { // Open the Properties window after creation to edit new bookmark item
					createBookmark(BTN);
				  }
				}
			  }
			}
			else if ((pos = lowerName.lastIndexOf(".webloc")) > 0) { // This should be a MacOS URL shortcurt
			  let title = name.slice(0, pos);
//console.log("...... URL title = "+title);
			  // Get content of the URL file
			  let text = await file.text();
//console.log("...... URL file content = "+text);
			  if (text.toLowerCase().includes("<key>url</key>")) { // Yes, this is a MacOS URL shortcurt
				let a_url = text.match(PatternMacOSURL);
				// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match
				// for format of the return value of match()
				// Get the address 
				let url = a_url[1]; // 0 is the full matched string, 1 is the first () group matched
//console.log("...... URL address = "+url);
				// Create new bookmark item and open properties if Alt key is pressed at same time than drop
				if (bnIndex == undefined) {
				  BTN = await createBkmkItem_async(tgtBN_id, undefined, title, url, "bookmark");
				}
				else {
				  BTN = await createBkmkItem_async(tgtBN_id, bnIndex++, title, url, "bookmark");
				}
				if (is_altKey) { // Open the Properties window after creation to edit new bookmark item
				  createBookmark(BTN);
				}
			  }
			}
		  }
		}
	  }
	  else if (types.includes(type = "text/uri-list")		// Dragging a page link or (i) in the location bar to us
			   || types.includes(type = "text/x-moz-url")	// Dragging the location bar URL address
			  ) {
		let url = dt.getData(type);
		// Try the URL description type
		let title = dt.getData("text/x-moz-url-desc").trim();
		let splitIndex = title.indexOf("\n"); // Remove any "\n" and following part if there is in title 
		if (splitIndex > 0) {
		  title = title.slice(0, splitIndex);
		}

		// Get URL
		splitIndex = url.indexOf("\n"); // Remove any "\n" and following part if there is in URL
		if (splitIndex > 0) {
		  url = url.slice(0, splitIndex);
		}
		if (url.startsWith("https://www.google.com/url?")) { // Handle Google search result drag = simplify it
		  splitIndex = url.indexOf("&url="); // Remove any "&url=" and parts before
		  if (splitIndex > 0) {
			url = url.slice(splitIndex+5);
			splitIndex = url.indexOf("&"); // Remove any following "&" and parts after, to keep only the real URL
			if (splitIndex > 0) {
			  url = url.slice(0, splitIndex);
			}
			// Decode the URL
			url = decodeURIComponent(url);
		  }
		}

		// Adjust title if empty
		if (title.length == 0) { // If title is empty, try the URL content (e.g. location bar drag & drop)
		  title = dt.getData("text/x-moz-url");
		}
		if (title.length == 0) { // If title is still empty, use the URL as title
		  title = url;
		}
		else { // If there is an "\n", keep the part after (can only be for "text/x-moz-url", e.g. location bar drag & drop)
		  splitIndex = title.indexOf("\n");
		  title = title.slice(splitIndex+1);
		}
		// Create new bookmark item and open properties if Alt key is pressed at same time than drop
		let creating = createBkmkItem((is_infolder ? BN_id : BN.parentId), bnIndex, title, url, "bookmark");
		if (is_altKey) { // Open the Properties window after creation to edit new bookmark item
		  creating.then(createBookmark);
		}
	  }
	  e.preventDefault(); // We accepted the drop
	}
	else {
	  dt.dropEffect = "none"; // Signal drop not allowed (if it has any cancellation effect ..)
	}
  }
  else {
	dt.dropEffect = "none"; // Signal drop not allowed (if it has any cancellation effect ..)
  }
}

/*
 * Copy bookmark contents at the designated place.
 * 
 * a_id = array of Strings (bookmark ids)
 * a_BN = array of BookmarkNodes to paste (copy)
 * parentId = String, Id of new parent to paste into
 * index = integer position in parent (undefined if at end)
 */
async function copyBkmk (a_id, a_BN, parentId, index = undefined) {
  if (backgroundPage == undefined) {
	try {
	  let message = await browser.runtime.sendMessage(
			{source: "sidebar:"+myWindowId,
			 content: "copyBkmk",
			 a_id: a_id, // Only send a_HN, a_µBN will be rebuilt on the background side
			 parentId: parentId,
			 index: index
			}
		  );
	  handleMsgResponse(message);
	}
	catch (error) {
	  handleMsgError(error);
	}
  }
  else {
	await backgroundPage.copyBkmk(a_id, a_BN, parentId, index);
  }
}

/*
 * Move bookmark(s) at the designated place.
 * 
 * a_id = array of Strings (bookmark ids)
 * a_BN = Array of BookmarkNodes to move (=> need to remain synchronous to keep order)
 * newParentId = String, Id of new parent to move into
 * newIndex = integer position in parent (undefined if at end)
 * 
 * Return true if moved, else false. 
 */
async function moveBkmk (a_id, a_BN, newParentId, newIndex = undefined) {
  let len = a_BN.length;
  // Record a multiple operation if more than one item is in the array
  if (len > 1) {
	let newParentBN = curBNList[newParentId];
	// Note if going to trash
	let is_removetotrash = (newParentBN.inBSP2Trash == true);
	// If trash is enabled, check if all moved items are from trash
	let is_createFromTrash = options.trashEnabled;
	let i = len - 1;
	while (is_createFromTrash && (i >= 0)) {
	  if (a_BN[i--].inBSP2Trash != true) {
		is_createFromTrash = false;
	  }
	}
	await recordHistoryMulti(((is_removetotrash && !is_createFromTrash)
							  ? HNACTION_BKMKREMOVETOTRASH							// Moving to trash, even from trash
							  : ((is_createFromTrash && !is_removetotrash)
								 ? HNACTION_BKMKCREATEFROMTRASH
								 : HNACTION_BKMKMOVE				// Moving outside of trash, from trash or from outside
								)
							 ),
							 a_id, newParentId, newIndex
							);
  }

  await util_moveBkmk(a_BN, newParentId, newIndex);
}

/*
 * Remove bookmarks (with handling of BSP2 trash, if enabled)
 * 
 * a_id = array of Strings (bookmark ids)
 * a_BN = Array of BookmarkNodes to delete
 */
async function delBkmk (a_id, a_BN) {
  let len = a_BN.length;
  // Record a multiple operation if more than one item is in the array
  let is_trashEnabled = options.trashEnabled;
  if (len > 1) {
	// If trash is enabled, check if all removed items are from trash
	let is_fullRemove = is_trashEnabled;
	let i = len - 1;
	while (is_fullRemove && (i >= 0)) {
	  if (a_BN[i--].inBSP2Trash != true) {
		is_fullRemove = false;
	  }
	}
	if (is_trashEnabled && !is_fullRemove) {
	  await recordHistoryMulti(HNACTION_BKMKREMOVETOTRASH, a_id, bsp2TrashFldrBNId); // Moving to trash
	}
	else {
	  await recordHistoryMulti(HNACTION_BKMKREMOVE, a_id); // Full remove
	}
  }

  await util_delBkmk(a_BN, is_trashEnabled);
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
 * Clear searchStr on SearchTimeout ms after receiving last alphanumeric character
 * 
 * e is of type KeyboardEvent
 */
let searchStr = ""; // Used to search next matching bookmark item
let searchTimerID = null; // Timer for resetting searchStr
const SearchTimeout = 500; // Timeout to reset searchStr, in ms
function searchTimeoutHandler () {
  searchTimerID = null;
  searchStr = "";
}

/*
 * Receive event from keyboard anywhere in the sidebar panel, and also handle
 * menu actions
 * 
 * e is of type KeyboardEvent
 */
const PatternAlphanumeric = /\w/; // [A-Za-z0-9_]
function keyHandler (e) {
  let target = e.target; // Type depends ..
  let classList = target.classList;
  let key = e.key;
  let normKey;
  let is_shiftKey = e.shiftKey;
  let is_ctrlKey = (isMacOS ? e.metaKey : e.ctrlKey);
//console.log("Key event: "+e.type+" key: "+key+" char: "+e.char+" target: "+target+" classList: "+classList);

  let row = target.parentElement;
  let isResultRow = (row.dataset.rslt == "true");
  if (key == "Escape") {
	// Clear any menu when Esc is pressed
	let menuClosed = clearMenu();

	// Clear searchbox input and any search result when Esc is pressed within it
	let searchCleared = false;
	if (((target.id == "searchtext") || !menuClosed)
		&& (SearchTextInput.value.length > 0)
	   ) {
	  clearSearchTextHandler();
	  searchCleared = true;
	}

	if (menuClosed || searchCleared) { // We used up the key, don't pass it for further processing
	  e.preventDefault();
	}
  }
  else if (target.id == "searchtext") {
	if (key == "Enter") { // Enter in search input box should execute new search or go to first search result if any
	  if (sboxState == SBoxChanging) { // If new content in search box, execute search in parallel
		triggerUpdate(true);
	  }
	  else if (resultsTable != undefined) {
		// Get to first row if there is one
		let len = resultsTable.rows.length;
		if (len > 0) {
		  let firstRow = resultsTable.rows[0];
		  let cell = firstRow.firstElementChild;
		  cell.focus();
//		  setCellHighlight(rcursor, rlastSelOp, cell, rselection.selectIds);
		  addCellCursorSelection(cell, rcursor, rselection);
		}
	  }
	  e.preventDefault(); // Don't pass the key event for further processing
	}
  }
  else if (classList.contains(CursorHighlight)) { // Keyboard actions on cursor (=> focused) cell
	let keyProcessed = false;
	if (key == "ArrowDown") {
	  if (!myMenu_open) {
		// Find next visible row and highlight it
		let nextRow = row;
		while (((nextRow = nextRow.nextElementSibling) != null) && (nextRow.hidden));
		if (nextRow != null) { // We got one
		  let cell = nextRow.firstElementChild;
		  if (isResultRow) { // Set result cursor and selection if in search panel
//			setCellHighlight(rcursor, rlastSelOp, cell, rselection.selectIds);
			addCellCursorSelection(cell, rcursor, rselection, false, is_ctrlKey, is_shiftKey);
		  }
		  else { // Set cursor and selection in main panel
//			setCellHighlight(cursor, lastSelOp, cell, selection.selectIds);
			addCellCursorSelection(cell, cursor, selection, false, is_ctrlKey, is_shiftKey);
		  }
		  cell.focus();
		}
		keyProcessed = true;
	  }
	}
	else if (key == "ArrowUp") {
	  if (!myMenu_open) {
		// Find previous visible row and highlight it
		let previousRow = row;
		while (((previousRow = previousRow.previousElementSibling) != null) && (previousRow.hidden));
		if (previousRow != null) { // We got one
		  let cell = previousRow.firstElementChild;
		  if (isResultRow) { // Set result cursor and selection if in search panel
//			setCellHighlight(rcursor, rlastSelOp, cell, rselection.selectIds);
			addCellCursorSelection(cell, rcursor, rselection, false, is_ctrlKey, is_shiftKey);
		  }
		  else { // Set cursor and selection in main panel
//			setCellHighlight(cursor, lastSelOp, cell, selection.selectIds);
			addCellCursorSelection(cell, cursor, selection, false, is_ctrlKey, e.shiftKey);
		  }
		  cell.focus();
		}
		keyProcessed = true;
	  }
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
		  if (isResultRow) { // Set result cursor and selection if in search panel
//			setCellHighlight(rcursor, rlastSelOp, cell, rselection.selectIds);
			addCellCursorSelection(cell, rcursor, rselection, false, is_ctrlKey, is_shiftKey);
		  }
		  else { // Set cursor and selection in main panel
//			setCellHighlight(cursor, lastSelOp, cell, selection.selectIds);
			addCellCursorSelection(cell, cursor, selection, false, is_ctrlKey, is_shiftKey);
		  }
		  cell.focus();
		}
		keyProcessed = true;
	  }
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
		  if (isResultRow) { // Set result cursor and selection if in search panel
//			setCellHighlight(rcursor, rlastSelOp, cell, rselection.selectIds);
			addCellCursorSelection(cell, rcursor, rselection, false, is_ctrlKey, is_shiftKey);
		  }
		  else { // Set cursor and selection in main panel
//			setCellHighlight(cursor, lastSelOp, cell, selection.selectIds);
			addCellCursorSelection(cell, cursor, selection, false, is_ctrlKey, is_shiftKey);
		  }
		  cell.focus();
		}
		keyProcessed = true;
	  }
	}
	else if (key == "End") {
	  if (!myMenu_open) {
		// Find last visible row and highlight it
		let len;
		let lastRow;
		let cell;
		if (isResultRow) {
		  len = resultsTable.rows.length; // Start from end of table
		  lastRow = resultsTable.rows[len-1];
		  cell = lastRow.firstElementChild;
		  // Set result cursor and selection
//		  setCellHighlight(rcursor, rlastSelOp, cell, rselection.selectIds);
		  addCellCursorSelection(cell, rcursor, rselection, false, is_ctrlKey, is_shiftKey);
		}
		else {
		  len = bookmarksTable.rows.length; // Start from end of table
		  lastRow = bookmarksTable.rows[len-1];
		  if (lastRow.hidden) {
			while ((lastRow = lastRow.previousElementSibling).hidden);
		  }
		  cell = lastRow.firstElementChild;
		  // Set cursor and selection in main panel
//		  setCellHighlight(cursor, lastSelOp, cell, selection.selectIds);
		  addCellCursorSelection(cell, cursor, selection, false, is_ctrlKey, is_shiftKey);
		}
		cell.focus();
		keyProcessed = true;
	  }
	}
	else if (key == "Home") {
	  if (!myMenu_open) {
		// Find next visible row and highlight it
		let firstRow;
		let cell;
		if (isResultRow) {
		  firstRow = resultsTable.rows[0]; // Always visible
		  cell = firstRow.firstElementChild;
		  // Set result cursor and selection
//		  setCellHighlight(rcursor, rlastSelOp, cell, rselection.selectIds);
		  addCellCursorSelection(cell, rcursor, rselection, false, is_ctrlKey, is_shiftKey);
		}
		else {
		  firstRow = bookmarksTable.rows[0]; // Always visible
		  cell = firstRow.firstElementChild;
		  // Set cursor and selection in main panel
//		  setCellHighlight(cursor, rlastSelOp, cell, selection.selectIds);
		  addCellCursorSelection(cell, cursor, selection, false, is_ctrlKey, is_shiftKey);
		}
		cell.focus();
		keyProcessed = true;
	  }
	}
	else if (!isResultRow && (key == "ArrowLeft")) {
	  if (!myMenu_open) {
		// If on an open folder, close it, else go to parent folder (if not root)
		let type = row.dataset.type;
		let twistie = target.firstElementChild.firstElementChild;
		if (is_shiftKey) { // Collapse it (even if already closed)
		  collapseAll(row.dataset.id, row);
		}
		else if ((type == "folder") && (twistie.className.includes("twistieao"))) { // This is an open folder
		  // Close it
		  handleFolderClick(twistie);
		}
		else { // Go to parent if not root
		  let bnId = row.dataset.id;
		  let BN = curBNList[bnId];
		  bnId = BN.parentId;
		  if (bnId != Root) {
			row = curRowList[bnId];
			let cell = row.firstElementChild;
//			setCellHighlight(cursor, lastSelOp, cell, selection.selectIds);
			addCellCursorSelection(cell, cursor, selection, false, is_ctrlKey, is_shiftKey);
			cell.focus();
		  }
		}
		keyProcessed = true;
	  }
	}
	else if (!isResultRow && (key == "ArrowRight")) {
	  if (!myMenu_open) {
		// If on a closed folder, open it, or if on an open folder, go to first child if any, else do nothing
		let type = row.dataset.type;
		if (type == "folder") {
		  let twistie = target.firstElementChild.firstElementChild;
		  if (is_shiftKey) { // Expand it (even if already open)
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
//			  setCellHighlight(cursor, lastSelOp, cell, selection.selectIds);
			  addCellCursorSelection(cell, cursor, selection, false, is_ctrlKey, is_shiftKey);
			  cell.focus();
			}
		  }
		}
		keyProcessed = true;
	  }
	}
	else if (key == " ") { // Toggle selection if is_ctrlKey or is_range
	  if (!myMenu_open) {
		let cell = row.firstElementChild;
		if (isResultRow) { // Set result cursor and selection if in search panel
//		  setCellHighlight(rcursor, rlastSelOp, cell, rselection.selectIds);
		  addCellCursorSelection(cell, rcursor, rselection, true, is_ctrlKey, is_shiftKey);
		}
		else { // Set cursor and selection in main panel
//		  setCellHighlight(cursor, lastSelOp, cell, selection.selectIds);
		  addCellCursorSelection(cell, cursor, selection, true, is_ctrlKey, is_shiftKey);
		}
		keyProcessed = true;
	  }
	}
	else if (key == "Delete") {
	  if (!myMenu_open
		  && (row.dataset.protect != "true") // Non protected row
		 ) {
		// Find next visible row to highlight it
		let nextRow = row;
		while (((nextRow = nextRow.nextElementSibling) != null) && (nextRow.hidden))
		  ;
		if (nextRow == null) { // Try row before instead
		  // Find previous visible row to highlight it
		  let nextRow = row;
		  while (((nextRow = nextRow.previousElementSibling) != null) && (nextRow.hidden))
			;
		}

		// Delete bookmark item(s) in selection, and highlight / select new row
		let sel = isResultRow ? rselection : selection;
		menuDelBkmkItem(sel);
		// Set cursor and selection
		if (nextRow != null) { // We got one
		  let cell = nextRow.firstElementChild;
		  // Set cursor and selection
//		  setCellHighlight(cursor, lastSelOp, cell, selection.selectIds);
		  addCellCursorSelection(cell, cursor, sel);
		  cell.focus();
		}
		keyProcessed = true;
	  }
	}
	else if (key == "Enter") {
	  if (!myMenu_open) {
		let type = row.dataset.type;
		if (isResultRow && !is_ctrlKey && !is_shiftKey && !e.altKey) { // Show original bookmark item
		  // Retrieve bookmark information in the result row (BN.id)
		  let resultBN_id = row.dataset.id;
		  // Then show it
		  handleResultClick(resultBN_id);
		}
		else if (type == "bookmark") { // Bookmark default action
		  let bkmkitem = target.firstElementChild;
		  let href = bkmkitem.href;
		  if ((href != undefined) && (href.length > 0)) {
			// Respect the about:config browser.tabs.loadBookmarksInTabs setting
			if (openBookmarksInNewTabs_option) { // If option set, open in new tab
			  browser.tabs.create({url: href});
			}
			else if (is_ctrlKey) { // Open in new tab, referred by this tab to come back to it when closing
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
			else if (is_shiftKey) { // Open in new window
			  browser.windows.create({url: href});
			}
			else { // Open in current tab, except if we are running BSP2 inside a tab and Alt is not pressed
			  if (isInSidebar || e.altKey) {
				browser.tabs.update({url: href});
			  }
			}
		  }
		}
		else if (!isResultRow && (type == "folder")) { // Folder default action
		  let twistie = target.firstElementChild.firstElementChild;
		  if (twistie.className.startsWith("twistiea")) {
			handleFolderClick(twistie, is_shiftKey);
		  }
		}
		keyProcessed = true;
	  }
	}
	else if ((key.toLowerCase() == "c") && is_ctrlKey) { // Copy
	  if (!myMenu_open) {
		menuCopyBkmkItem(isResultRow ? rselection : selection);
		keyProcessed = true;
	  }
	}
	else if ((key.toLowerCase() == "x") && is_ctrlKey) { // Cut
	  if (!myMenu_open) {
		menuCutBkmkItem(isResultRow ? rselection : selection);
		keyProcessed = true;
	  }
	}
	else if ((key.toLowerCase() == "v") && is_ctrlKey) { // Paste
	  if (!myMenu_open) {
		let rowIndex = row.rowIndex;
		if (!myMenu_open && !isResultRow && (bkmkClipboard.length > 0)	// Paste only if there is something to paste
			&& !noPasteZone.isInZone(rowIndex)							// Do not paste in the no paste zone
		   ) {
		  let BN_id = row.dataset.id;
		  let type = row.dataset.type;
		  menuPasteBkmkItem(BN_id, (type == "folder")); // If folder, paste into it
		}
		keyProcessed = true;
	  }
	}
	else if ((key.toLowerCase() == "z") && is_ctrlKey) { // Undo
	  if (!myMenu_open) {
		triggerUndo();
		keyProcessed = true;
	  }
	}
	else if ((key.toLowerCase() == "y") && is_ctrlKey) { // Redo
	  if (!myMenu_open) {
		triggerRedo();
		keyProcessed = true;
	  }
	}
	else if (!e.altKey && !e.ctrlKey && !e.metaKey && !is_shiftKey && (key.length == 1) // Do test both ctrl and meta keys
			 && (normKey = strLowerNormalize(key)).match(PatternAlphanumeric)
			 && !myMenu_open
			) { // An alphanumeric key, accummulate and use to jump to next matching bookmark item
	  // Stop the search timeout
	  clearTimeout(searchTimerID);
//console.log("key = \'"+key+"\' - normKey = \'"+normKey+"\' - searchStr = \'"+searchStr+"\'");
	  let nextRow;
	  if (searchStr.length == 0) { // If first typed char, start on next record
		searchStr = normKey; // Case & diacritics insensitive compare
		nextRow = row.nextElementSibling;
	  }
	  else { // Else, give a chance to current row
		searchStr += normKey; // Case & diacritics insensitive compare
		nextRow = row;
	  }
	  // Search next bookmark item matching searchStr (or do not move if none)
	  let cell;
	  let type;
	  let found;
	  do {
		if (nextRow == null) { // Wrap at start
		  if (isResultRow) {
			nextRow = resultsTable.rows[0]; // Note: always visible
		  }
		  else {
			nextRow = bookmarksTable.rows[0]; // Note: always visible
		  }
		}
		if (!(nextRow.hidden) && ((type = nextRow.dataset.type) != "separator")) {
		  // Compare with searchStr
		  cell = nextRow.firstElementChild;
		  let span;
		  if (type == "folder") {
			span = cell.firstElementChild.firstElementChild.nextElementSibling.nextElementSibling;
		  }
		  else {
			span = cell.firstElementChild.firstElementChild.nextElementSibling;
		  }
		  found = (strLowerNormalize(span.textContent).startsWith(searchStr));
		}
		nextRow = nextRow.nextElementSibling;
		if (nextRow == row) { // Nothing found, let's not loop infinitely
		  break;
		}
	  }
	  while (!found);
	  if (found) {
		if (isResultRow) { // Set result cursor and selection if in search panel
//		  setCellHighlight(rcursor, rlastSelOp, cell, rselection.selectIds);
		  addCellCursorSelection(cell, rcursor, rselection);
		}
		else { // Set cursor and selection in main panel
//		  setCellHighlight(cursor, lastSelOp, cell, selection.selectIds);
		  addCellCursorSelection(cell, cursor, selection);
		}
		cell.focus();
	  }
	  // Rearm the search timeout
	  searchTimerID = setTimeout(searchTimeoutHandler, SearchTimeout); //
	  keyProcessed = true;
	}
/*
	else if ((key == "F2") && !isResultRow) { // Attempt at in-place edit
console.log("edit");
	  let type = row.dataset.type;
console.log("type: "+type);
	  let span;
	  if (type == "folder") {
		span = target.firstElementChild.firstElementChild.nextElementSibling.nextElementSibling;
	  }
	  else if (type == "bookmark") {
		span = target.firstElementChild.firstElementChild.nextElementSibling;
	  }
console.log("target: "+target);
console.log("span: "+span);
	  span.contentEditable = true;
	  span.focus();
	  keyProcessed = true;
	}
*/
	if (keyProcessed) { // We used up the key, don't pass it to FF for further processing
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
 * resultBN_id = id of bookmark to show in main pane
 */
function menuShow (resultBN_id) {
  // Make the source object visible .. and scroll to it
  handleResultClick(resultBN_id);

  // If close search option is set, close search pane now
  if (options.closeSearch) {
	clearSearchTextHandler();
  }
}

/*
 * Handle open action on context menu
 * 
 * selection = selection Object
 * mode = integer, described by constants below
 */
const INTAB = 0;
const NEWTAB = 1;
const NEWWIN = 2;
const NEWPRIVWIN = 3;
async function menuOpen (selection, mode) {
  // Get the list of selected cells, and go through it
  let cells = selection.selectCells;
  let len = cells.length;
  let href, a_url, l;
  switch (mode) {
	case INTAB:
	  for (let i=0 ; i<len ; i++) {
		// Get anchor href
		href = cells[i].firstElementChild.href;
		if ((href != undefined) && (href.length > 0)) {
		  browser.tabs.update({url: href});
		}
	  }
	  break;
	case NEWTAB:
	  let openerTabId;
	  if (!beforeFF57) {
		// Get current active tab as opener id to come back to it when closing the new tab
		let a_tabs = await browser.tabs.query({windowId: myWindowId, active: true});
		openerTabId = a_tabs[0].id;
	  }
	  for (let i=0 ; i<len ; i++) {
		// Get anchor href
		href = cells[i].firstElementChild.href;
		if ((href != undefined) && (href.length > 0)) {
		  if (beforeFF57)
			browser.tabs.create({url: href});
		  else
			browser.tabs.create({url: href, openerTabId: openerTabId});
		}
	  }
	  break;
	case NEWWIN:
	  a_url = [];
	  for (let i=0 ; i<len ; i++) {
		// Get anchor href
		href = cells[i].firstElementChild.href;
		if ((href != undefined) && (href.length > 0)) {
		  l = a_url.push(href);
		}
	  }
	  // The second method disables any sidebar as it seems ... so can't use it
	  if (l != undefined)
		browser.windows.create({url: a_url});
//	  window.open(href, "_blank", "menubar,toolbar,location,scrollbars");
	  break;
	case NEWPRIVWIN:
	  a_url = [];
	  for (let i=0 ; i<len ; i++) {
		// Get anchor href
		href = cells[i].firstElementChild.href;
		if ((href != undefined) && (href.length > 0)) {
		  l = a_url.push(href);
		}
	  }
	  // The second method disables any sidebar as it seems ... so can't use it
	  if (l != undefined)
		browser.windows.create({url: a_url, incognito: true});
	  break;
  }
}

/*
 * Handle open all in tabs action on context menu
 * 
 * BN_id = String identifying the bookmark folder for which to open all direct children
 * is_shiftKey = Boolean, true is Shift is pressed at same time then clicking (means open in new window)
 */
function menuOpenAllInTabs (BN_id, is_shiftKey) {
  let BN = curBNList[BN_id];
  let children = BN.children;
  let len;
  let node;

  if ((children != undefined) && ((len = children.length) > 0)) {
	if (is_shiftKey) { // Open in a new window
	  let a_url = [];
	  let l = 0;
	  for (let i=len-1 ; i>=0 ; i--) {
		node = children[i];
		if (node.type == "bookmark") {
		  l = a_url.push(node.url);
		}
	  }
	  if (l > 0) {
		browser.windows.create({url: a_url});
	  }
	}
	else { // Open in new tabs in same window
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
}

/*
 * Handle new bookmark item action on context menu
 * 
 * tgtBN_id = String identifying the bookmark item before which or inside which to insert
 * bkmkType = integer, described by constants below
 * is_openProp = boolean, true if we have to open the Property window
 */
const NEWB       = 0;
const NEWF       = 1;
const NEWS       = 2;
const NEWBCURTAB = 3;
function menuNewBkmkItem (tgtBN_id, bkmkType, is_openProp = true) {
  let tgtBN = curBNList[tgtBN_id];

  // Create new bookmark just before if BN is a separator or a bookmark,
  // or append inside if BN is a folder.
  let tgtBN_type = tgtBN.type;
  if (beforeFF57 && (bkmkType == NEWS)) {
	let msg = "Creating separators is not supported in WebExtension API before FF 57 !"; 
	trace(msg);
	console.log(msg);
  }
  else {
	let creating;
	switch (bkmkType) {
	  case NEWB:
		if (tgtBN_type == "folder") {
		  creating = createBkmkItem(tgtBN_id, (options.appendAtFldrEnd ? undefined : 0), "New bookmark", "about:blank", "bookmark");
		}
		else {
		  creating = createBkmkItem(tgtBN.parentId, BN_getIndex(tgtBN), "New bookmark", "about:blank", "bookmark");
		}
		if (is_openProp) { // Open the Properties window after creation to edit new bookmark item
		  creating.then(createBookmark);
		}
		break;
	  case NEWF:
		if (tgtBN_type == "folder") {
		  creating = createBkmkItem(tgtBN_id, (options.appendAtFldrEnd ? undefined : 0), "New folder", undefined, "folder");
		}
		else {
		  creating = createBkmkItem(tgtBN.parentId, BN_getIndex(tgtBN), "New folder", undefined, "folder");
		}
		if (is_openProp) { // Open the Properties window after creation to edit new bookmark item
		  creating.then(createFolder);
		}
		break;
	  case NEWS:
		if (tgtBN_type == "folder") {
		  createBkmkItem(tgtBN_id, (options.appendAtFldrEnd ? undefined : 0), undefined, undefined, "separator");
		}
		else {
		  createBkmkItem(tgtBN.parentId, BN_getIndex(tgtBN), undefined, undefined, "separator");
		}
		break;
	  case NEWBCURTAB:
		browser.tabs.query({windowId: myWindowId, active: true})
		.then (
		  function (a_tabs) {
			let tab = a_tabs[0];
//console.log(tab.title+" - "+tab.url);
			if (tgtBN_type == "folder") {
			  creating = createBkmkItem(tgtBN_id, (options.appendAtFldrEnd ? undefined : 0), tab.title, tab.url, "bookmark");
			}
			else {
			  creating = createBkmkItem(tgtBN.parentId, BN_getIndex(tgtBN), tab.title, tab.url, "bookmark");
			}
			if (is_openProp) { // Open the Properties window after creation to edit new bookmark item
			  creating.then(createBookmark);
			}
		  }
		);
		break;
	}
  }
}

/*
 * Fill system clpboard with copied data
 * 
 * a_BN = array of BookmarkNodes to place in system clipboard
 *
 */
function writeSystemClipboard (a_BN) {
  if (!beforeFF63) {
	// Plain text only today
	let len = a_BN.length;
	let plain = "";
	let plain_sep = "";
	let BN; 
	for (let i=0 ; i<len ; i++) {
	  BN = a_BN[i];
	  plain += plain_sep + BN_toPlain(BN); 
	  if (i == 0) { // Separator for next objects
		plain_sep = "\n"; 
	  }
	}
	navigator.clipboard.writeText(plain)
	.then(function() {
	  /* clipboard successfully set */
//console.log("clipboard successfully set");
	}, function() {
	  /* clipboard write failed */
console.log("clipboard write failed");
	});
  }
}

/*
 * Handle cut bookmark item action to clipboard on context menu or shortcut key
 * 
 * selection = selection Object
 *
 * Sets global variables bkmkClipboardIds, bkmkClipboard, noPasteZone, isClipboardOpCut
 */
function menuCutBkmkItem (selection) {
  // Cancel previous cut and clipboard if any
  if (isClipboardOpCut == true) {
	refreshCutPanel(bkmkClipboardIds, false);
	refreshCutSearch(bkmkClipboardIds, false);
	noPasteZone.clear();
  }
  bkmkClipboardIds.length = bkmkClipboard.length = 0;

  // Filter to keep only unique bookmark items (none including another)
  let selectIds = selection.selectIds;
  let len = selectIds.length;
  let bnId;
  for (let i=0 ; i<len ; i++) {
	bnId = selectIds[i];
	let BN = curBNList[bnId];
	if (!BN.protect) { 
	  // We are going to move, so clip the real ones
	  uniqueListAddBN(bnId, BN, bkmkClipboardIds, bkmkClipboard);
	}
  }

  // Set the no paste zone
  len = bkmkClipboardIds.length;
  for (let i=0 ; i<len ; i++) {
	zoneAddBN(noPasteZone, bkmkClipboardIds[i], bkmkClipboard[i]);
  }
  isClipboardOpCut = true;
  // Dim the row(s) being cut, do not remove it/them now
  refreshCutPanel(bkmkClipboardIds, true);
  refreshCutSearch(bkmkClipboardIds, true);

  // Fill system clipboard with copied data
  writeSystemClipboard(bkmkClipboard);
}

/*
 * Handle copy bookmark item action to clipboard on context menu or shortcut key
 * 
 * selection = selection Object
 *
 * Sets global variables bkmkClipboardIds, bkmkClipboard, noPasteZone, isClipboardOpCut
 */
function menuCopyBkmkItem (selection) {
  // Cancel previous cut and clipboard if any
  if (isClipboardOpCut == true) {
	refreshCutPanel(bkmkClipboardIds, false);
	refreshCutSearch(bkmkClipboardIds, false);
	noPasteZone.clear();
  }
  bkmkClipboardIds.length = bkmkClipboard.length = 0;
  isClipboardOpCut = false; // Not a cut

  // Filter to keep only unique bookmark items (none including another)
  let selectIds = selection.selectIds;
  let len = selectIds.length;
  let bnId;
  for (let i=0 ; i<len ; i++) {
	bnId = selectIds[i];
	let BN = curBNList[bnId];
	if (!BN.protect) { 
	  uniqueListAddBN(bnId, BN, bkmkClipboardIds, bkmkClipboard);
	}
  }

  // Fill system clipboard with copied data
  writeSystemClipboard(bkmkClipboard);
}

/*
 * Handle bookmark clipboard paste action on context menu
 * 
 * BN_id = String identifying the bookmark item to paste bkmkClipboard to
 * is_pasteInto = Boolean, false if paste before, and true if paste into (only on folders)
 *
 * Uses / modifies global variables bkmkClipboardIds, bkmkClipboard, noPasteZone, isClipboardOpCut
 */
function menuPasteBkmkItem (BN_id, is_pasteInto) {
  let BN = curBNList[BN_id];
  let bnIndex;
  if (is_pasteInto) { // If paste to a folder, apply the option of insert at start or append at end
	if (!options.appendAtFldrEnd) {
	  bnIndex = 0; // At start)
	}  
  }
  else { // If not paste to a folder, insert before BN
	bnIndex = BN_getIndex(BN);
  }

  if (isClipboardOpCut == true) { // This is a move operation
	// Clear the cut flag everywhere
	refreshCutPanel(bkmkClipboardIds, false);
	refreshCutSearch(bkmkClipboardIds, false);
	noPasteZone.clear();
	moveBkmk(bkmkClipboardIds, bkmkClipboard, (is_pasteInto ? BN_id : BN.parentId), bnIndex);
  }
  else { // This is a copy operation
	copyBkmk(bkmkClipboardIds, bkmkClipboard, (is_pasteInto ? BN_id : BN.parentId), bnIndex);
	// Refresh search is handled thought bkmkCreatedHandler(), do not call it
  }

  // Empty the clipboard variables by pointing at a new empty array
  // (previous array object still in memory, until fully processed by one of the called async functions)
  bkmkClipboardIds = [];
  bkmkClipboard = [];
  isClipboardOpCut = undefined;
}

/*
 * Handle delete bookmark item action on context menu or shortcut key
 * 
 * selection = selection Object
 * 
 * Modifies global variables bkmkClipboardIds, bkmkClipboard, noPasteZone, isClipboardOpCut
 */
function menuDelBkmkItem (selection) {
  // Cancel previous cut and clipboard if any
  if (isClipboardOpCut == true) {
	refreshCutPanel(bkmkClipboardIds, false);
	refreshCutSearch(bkmkClipboardIds, false);
	noPasteZone.clear();
  }
  bkmkClipboardIds.length = bkmkClipboard.length = 0;
  isClipboardOpCut = undefined;

  // Filter to keep only unique bookmark items (none including another)
  let selectIds = selection.selectIds;
  let len = selectIds.length;
  let bnId;
  let a_id = [];
  let a_BN = [];
  for (let i=0 ; i<len ; i++) {
	bnId = selectIds[i];
	let BN = curBNList[bnId];
	if (!BN.protect) { 
	  // We are going to delete, so clip the real ones
	  uniqueListAddBN(bnId, BN, a_id, a_BN);
	}
  }

  delBkmk(a_id, a_BN);
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
	  && !url.startsWith("file:")	  // file: has no favicon => no fetch
	  && !url.startsWith("about:")) { // about: is protected - security error .. => no fetch
   	// This is a bookmark, so here no need for cloneBN(), there is no tree below
//    faviconWorker.postMessage(["get2", BN_id, url, options.enableCookies]);
	let postMsg = ["get2", BN_id, url, options.enableCookies];
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
  openPropPopup("prop", BN_id, path, BN.type, BN.title, BN.url, BN.dateAdded);
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
 * in the click event target always equal to Body ..
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
	  let row = resultsTable.rows[getMenuRowIndex(target)];
	  menuShow(row.dataset.id);
	}
	else if (classList.contains("menuopen")) { // Open bookmark in active tab
	  menuAction = true;
	  // Retrieve parent context menu, the rowIndex and row on which it is
	  menuOpen(isResultMenu ? rselection : selection, INTAB);
	}
	else if (classList.contains("menuopentab")) { // Open bookmark in a new tab
	  menuAction = true;
	  // Retrieve parent context menu, the rowIndex and row on which it is
	  menuOpen(isResultMenu ? rselection : selection, NEWTAB);
	}
	else if (classList.contains("menuopenwin")) { // Open bookmark in a new Window
	  menuAction = true;
	  // Retrieve parent context menu, the rowIndex and row on which it is
	  menuOpen(isResultMenu ? rselection : selection, NEWWIN);
	}
	else if (classList.contains("menuopenpriv")) { // Open bookmark in a new private Window
	  menuAction = true;
	  // Retrieve parent context menu, the rowIndex and row on which it is
	  menuOpen(isResultMenu ? rselection : selection, NEWPRIVWIN);
	}
	else if (classList.contains("menuopenall")) { // Open all bookmark of a folder in new tabs
	  menuAction = true;
	  // Retrieve parent context menu, the rowIndex and row on which it is
	  let row = getMenuRow(target);
	  // Retrieve bookmark item in that row, and open all bookmarks in folder
	  let is_shiftKey = e.shiftKey;
	  menuOpenAllInTabs(row.dataset.id, is_shiftKey);
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
	else if (classList.contains("menunewbtab")) { // Bookmark current tab here
	  // Can only be on bookmarks table row
	  menuAction = true;
	  let row = bookmarksTable.rows[getMenuRowIndex(target)];
	  // Retrieve bookmark item in that row
	  menuNewBkmkItem(row.dataset.id, NEWBCURTAB, e.ctrlKey);
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
	  menuCutBkmkItem(isResultMenu ? rselection : selection);
	}
	else if (classList.contains("menucopy")) { // Copy a bookmark item into bkmkClipboard
	  // Retrieve parent context menu, and the rowIndex on which it is
	  menuAction = true;
	  menuCopyBkmkItem(isResultMenu ? rselection : selection);
	}
	else if (classList.contains("menupaste")) { // Paste bkmkClipboard contents before the row
	  											// Clear bkmkClipboard after that, as we want
	  											// to paste only once.
	  // Can only happen on bookmarks table row, retrieve the rowIndex from the menu
	  menuAction = true;
	  let row = bookmarksTable.rows[getMenuRowIndex(target)];
	  // Paste before bookmark item in that row
	  menuPasteBkmkItem(row.dataset.id, false);
	}
	else if (classList.contains("menupasteinto")) { // Paste bkmkClipboard contents in folder
	  												// Clear bkmkClipboard after that, as we want
	  												// to paste only once.
      // Can only happen on bookmarks table folder rows, retrieve the rowIndex from the menu
	  menuAction = true;
	  let row = bookmarksTable.rows[getMenuRowIndex(target)];
      // Paste inside bookmark item in that row
	  menuPasteBkmkItem(row.dataset.id, true);
    }
	else if (classList.contains("menudel")) { // Delete a bookmark item
	  // Can only happen on bookmarks table row, retrieve the rowIndex from the menu
	  menuAction = true;
	  // Delete selected bookmark item(s)
	  menuDelBkmkItem(isResultMenu ? rselection : selection);
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
	  if (isResultMenu) { // A results table menu
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
	  // Open BSP2 in new tab, referred by this tab to come back to it when closing
	  // Get current active tab as opener id to come back to it when closing the new tab
	  browser.tabs.query({windowId: myWindowId, active: true})
	  .then (
		function (a_tabs) {
		  openBsp2NewTab(a_tabs[0]);
		}
	  );
	}
	else if (classList.contains("menuhistory")) { // Open Bookmark history window
	  menuAction = true;
	  openBsp2History();
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
	else if (classList.contains("menussfolderonly")) { // Search options
	  menuAction = true;
	  setSScopeFolderonlyHandler();
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
		// Show bookmark item in main pane
		menuShow(bnId);
		break;
	  case "bsp2open":
		// Open in tab
		menuOpen(isResultMenu ? rselection : selection, INTAB);
		break;
	  case "bsp2opentab":
		// Open in new tab
		menuOpen(isResultMenu ? rselection : selection, NEWTAB);
		break;
	  case "bsp2openwin":
		// Open in new window
		menuOpen(isResultMenu ? rselection : selection, NEWWIN);
		break;
	  case "bsp2openpriv":
		// Open in private window
		menuOpen(isResultMenu ? rselection : selection, NEWPRIVWIN);
		break;
	  case "bsp2openall":
		// Open all bookmarks in folder
	    let is_shiftKey = (info.modifiers.indexOf("Shift") != -1);
		menuOpenAllInTabs(bnId, is_shiftKey);
		break;
	  case "bsp2opentree":
		// Open parent folder of the .reshidden row
		openResParents(curRowList[bnId]);
		break;
	  case "bsp2goparent":
		// Show parent of the row
		goParent(curRowList[bnId]);
		break;
	  case "bsp2newbtab":
		// Bookmark current tab here
		menuNewBkmkItem(bnId, NEWBCURTAB, (info.modifiers.indexOf("Ctrl") >= 0));
		break;
	  case "bsp2newb":
		// New bookmark
		menuNewBkmkItem(bnId, NEWB);
		break;
	  case "bsp2newf":
		// New folder
		menuNewBkmkItem(bnId, NEWF);
		break;
	  case "bsp2news":
		// New separator
		menuNewBkmkItem(bnId, NEWS);
		break;
	  case "bsp2cut":
		// Cut selection to clipboard
		menuCutBkmkItem(isResultMenu ? rselection : selection);
		break;
	  case "bsp2copy":
		// Copy selection to clipboard
		menuCopyBkmkItem(isResultMenu ? rselection : selection);
		break;
	  case "bsp2paste":
		// Paste clipboard before current bookmark
		menuPasteBkmkItem(bnId, false);
		break;
	  case "bsp2pasteinto":
		// Paste clipboard into current folder
		menuPasteBkmkItem(bnId, true);
		break;
	  case "bsp2del":
		// Delete selected bookmark item(s)
		menuDelBkmkItem(isResultMenu ? rselection : selection);
		break;
	  case "bsp2sort":
		// Sort folder content
		sendAddonMessage("sort:"+bnId);
		break;
	  case "bsp2refreshfav":
		// Refresh favicon
		menuRefreshFav(bnId);
		break;
	  case "bsp2collapseall":
		// Close folder and all subfolders
		collapseAll(bnId, curRowList[bnId]);
		break;
	  case "bsp2expandall":
		// Open folder and all subfolders
		expandAll(bnId, curRowList[bnId]);
		break;
	  case "bsp2prop":
		// Show properties
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
 * Chenge state the the expaned menu
 */
function switchExpMenu (e) {
  setExpMenu(!expMenu);
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
 * Auxclick on Magnifier glass (only act on middle button click = button 1)
 * = switch through Show all/folders only/bookmarks only
 */
function searchButtonSwitchMode (e) {
//console.log("searchButtonHandler event: "+e.type+" button: "+e.button+" phase: "+e.eventPhase);
  if (e.button == 1) {
	switch (options.searchFilter) {
	  case "all":
		setSFilterFldrOnlyHandler();
	    break;
	  case "fldr":
		options.searchField = "both"; // Reset which parts a search is made on to title + url
		setSFilterBkmkOnlyHandler();
		break;
	  case "bkmk":
		setSFilterAllHandler();
		break;
	}
  }
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
console.log("searchButtonHandler event: "+e.type+" button: "+button+" phase: "+e.eventPhase+" target: "+target+" class: "+target.classList);
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
  // Is always called, even if destination didn't specifically reply (then message is undefined)
  if (message != undefined) {
	let msg = message.content;
	if (options.traceEnabled) {
	  console.log("Sidebar "+myWindowId+" received a response: <<"+msg+">>");
	}
	if (msg == "savedUIState") { // Restore last saved cursor position and last exapnd menu state
	  goBkmkItem(message.bnId);
	  setExpMenu(message.expMenu);
	}
	else if (msg == "getCurBNList") { // Received curBNList content
	  curBNList = message.json;
	  countBookmarks = message.countBookmarks;
	  countFetchFav = message.countFetchFav;
	  countNoFavicon = message.countNoFavicon;
	  countFolders = message.countFolders;
	  countSeparators = message.countSeparators;
	  countOddities = message.countOddities;
	  mostVisitedBNId = message.mostVisitedBNId;
	  recentTagBNId = message.recentTagBNId; 
	  recentBkmkBNId = message.recentBkmkBNId;
	  bsp2TrashFldrBNId = message.bsp2TrashFldrBNId;
	  initCanUndo = message.canUndo;
	  initCanRedo = message.canRedo;

	  f_initializeNext(); // initialize2()
	}
	else if (msg == "Ready") {
	  backgroundReady = true; // Signal background ready for private windows for asking curBNList
	  if (waitingInitBckgnd) { // We were waiting for it to continue
if (options.traceEnabled) {
  console.log("Background is Ready 3");
}
		f_initializeNext(); // initializePriv()
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
 * Send current expand menu state Background (when we are a private window)
 * 
 * state = Boolean
 */
function sendAddonMsgExpMenu (state) {
  browser.runtime.sendMessage(
	{source: "sidebar:"+myWindowId,
	 content: "saveExpMenu",
	 state: state
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
 * a_msg = an array ["<cmd>", bnId, url, options.enableCookies]
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
 * Record a multi operation in history (going through Background messaging when we are a private window)
 * Waits for the response (or error) before returning.
 * 
 * op = String, nature of the operation ("create", "create_ft", "move", "remove" or "remove_tt")
 *   note: multi "create" is in fact a copy of a list of bookmarks with ids which will be known later.
 * 
 * id_list = Array of String identifying the bookmark Ids subject to the multiple action, undefined in the case
 *           of a multi create
 * newParentId = String, Id of new parent to move into, not meaningful in case of "remove"
 * newIndex = integer position in parent (undefined if at end), not meaningful in case of "remove"
 * 
 * Returns the id of the newly created HistoryNode 
 */
async function recordHistoryMulti (op, id_list, newParentId = undefined, newIndex = undefined) {
  let hnId;
  if (backgroundPage == undefined) {
	try {
	  let message = await browser.runtime.sendMessage(
			{source: "sidebar:"+myWindowId,
			 content: "recordHistoryMulti",
			 operation: op,
			 id_list: id_list,
			 newParentId: newParentId,
			 newIndex: newIndex
			}
		  );
	  hnId = message.hnId;
	  handleMsgResponse(message);
	}
	catch (error) {
	  handleMsgError(error);
	}
  }
  else {
	let hn = backgroundPage.recordHistoryMulti(op, id_list, newParentId, newIndex);
	hnId = hn.id;
  }

  return(hnId);
}

/*
 * Trigger an undo operation if possible
 */
async function triggerUndo () {
  if (backgroundPage == undefined) {
	try {
	  let message = await browser.runtime.sendMessage(
			{source: "sidebar:"+myWindowId,
			 content: "triggerUndo"
			}
		  );
	  handleMsgResponse(message);
	}
	catch (error) {
	  handleMsgError(error);
	}
  }
  else {
	backgroundPage.triggerUndo();
  }
}

/*
 * Trigger a redo operation if possible
 */
async function triggerRedo () {
  if (backgroundPage == undefined) {
	try {
	  let message = await browser.runtime.sendMessage(
			{source: "sidebar:"+myWindowId,
			 content: "triggerRedo"
			}
		  );
	  handleMsgResponse(message);
	}
	catch (error) {
	  handleMsgError(error);
	}
  }
  else {
	backgroundPage.triggerRedo();
  }
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
	  if (options.traceEnabled) {
		console.log("Got message <<"+msg+">> from "+request.source+" in Sidebar "+myWindowId);
		console.log("  sender.tab: "+sender.tab);
		console.log("  sender.frameId: "+sender.frameId);
		console.log("  sender.id: "+sender.id);
		console.log("  sender.url: "+sender.url);
		console.log("  sender.tlsChannelId: "+sender.tlsChannelId);
	  }

	  if (msg == "Ready") { // Background initialization is ready
		backgroundReady = true; // Signal background ready for private windows for asking curBNList
		if (waitingInitBckgnd) { // We were waiting for it to continue
		  if (options.traceEnabled) {
			console.log("Background is Ready 2");
		  }
		  f_initializeNext();
		}
	  }
	  else if (msg.startsWith("savedOptions")) { // Option page changed something to options, reload them
		// Look at what changed
//		let enableCookies_option_old = options.enableCookies;
//		let enableFlipFlop_option_old = options.enableFlipFlop;
		let advancedClick_option_old = options.advancedClick;
		let showPath_option_old = options.showPath;
//		let closeSearch_option_old = options.closeSearch;
//		let noffapisearch_option_old = options.noffapisearch;
		let reversePath_option_old = options.reversePath;
		let rememberSizes_option_old = options.rememberSizes;
		let searchHeight_option_old = options.searchHeight;
//		let openTree_option_old = options.openTree;
		let matchTheme_option_old = options.matchTheme;
		let setColors_option_old = options.setColors;
		let textColor_option_old = options.textColorn;
		let bckgndColor_option_old = options.bckgndColor;
//		let closeSibblingFolders_option_old = options.closeSibblingFolders;
		let altFldrImg_option_old = options.altFldrImg;
		let useAltFldr_option_old = options.useAltFldr;
		let altNoFavImg_option_old = options.altNoFavImg;
		let useAltNoFav_option_old = options.useAltNoFav;
		let trashVisible_option_old = options.trashVisible;
		let traceEnabled_option_old = options.traceEnabled;

		// Function to process option changes
		function changedOptions () {
		  // If advanced click option changed, update rbkmitem_b class cursor
		  if (advancedClick_option_old != options.advancedClick) {
			setRBkmkItemBCursor(options.advancedClick);
		  }
		  // If a show path option changed, update any open search result 
		  if ((showPath_option_old != options.showPath)
			  || (reversePath_option_old != options.reversePath)
			 ) {
			// Trigger an update as results can change, if there is a search active
			triggerUpdate();
		  }
		  if ((rememberSizes_option_old != options.rememberSizes)
			  && (options.rememberSizes == false)) {
			// To reset the height to CSS default ("20%"), just set
			SearchResult.style.height = "";
		  }
		  if (searchHeight_option_old != options.searchHeight) {
			SearchResult.style.height = options.searchHeight; 
		  }
		  // If match FF theme option changed
		  if (matchTheme_option_old != options.matchTheme) {
			if (options.matchTheme) {
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
		  if (setColors_option_old != options.setColors
			  || (options.setColors && ((textColor_option_old != options.textColor)
									   || (bckgndColor_option_old != options.bckgndColor)
				 					  )
				 )
			 ) {
			if (options.setColors) {
			  // Align colors with chosen ones 
			  setPanelColorsTB(options.textColor, options.bckgndColor);
			}
			else { // Cannot change while machTheme option is set, so no theme to match, reset ..
			  resetPanelColors();
			}
		  }
		  // If folder image options changed
		  if ((options.useAltFldr && (altFldrImg_option_old != options.altFldrImg))
			  || (useAltFldr_option_old != options.useAltFldr)
			 ) {
			setPanelFolderImg(options.useAltFldr, options.altFldrImg);
		  }
		  // If no-favicon image options changed
		  if ((options.useAltNoFav && (altNoFavImg_option_old != options.altNoFavImg))
			  || (useAltNoFav_option_old != options.useAltNoFav)
			 ) {
			setPanelNoFaviconImg(options.useAltNoFav, options.altNoFavImg);
		  }
		  // If BSP2 trash folder visibility changed
		  if (trashVisible_option_old != options.trashVisible) {
			if (options.trashVisible) { // Insert BSP2 trash foder and all its children, with handling of parent twistie
			  // Get parent of BSP2 Trash folder BN
			  let BN = curBNList[bsp2TrashFldrBNId];
			  let parentId = BN.parentId;
			  let parentBN = curBNList[parentId];
			  let parentRow = curRowList[parentId];

			  // Retrieve row position where to insert.
			  // Introduce robustness in case the BN tree is empty and index is not 0, as that seems to occur some times
			  let children = parentBN.children;
			  let index = BN_getIndex(BN, parentBN);
  			  if ((index == 0) || (children == undefined)) { // Insert just after parent row
				// Note that this also takes care of the case where parent had so far no child
				insertRowIndex = parentRow.rowIndex + 1; // Can be at end of bookmarks table
			  }
			  else { // Insert just after previous row
				let previousBN = BN_lastDescendant(children[index-1]);
				let row = curRowList[previousBN.id];
				insertRowIndex = row.rowIndex + 1; // Can be at end of bookmarks table
			  }

			  // We got the insertion point, proceed to insertion
			  insertBkmks(BN, parentRow);
			}
			else { // Delete all BSP2 trash folder and its children, if any (with cleanup and handling od parent twistie)
			  removeBkmks(curRowList[bsp2TrashFldrBNId], true);
			}

			// Trigger an update as results can change, if there is a search active
			triggerUpdate();
		  }
		  // If trace option changed
		  if (traceEnabled_option_old != options.traceEnabled) {
			TracePlace.hidden = !options.traceEnabled;
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
				let fn = err.fileName;
				if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
				console.log("fileName:   "+fn);
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
				let fn = err.fileName;
				if (fn == undefined)   fn = err.filename; // Not constant :-( Some errors have filename, and others have fileName 
				console.log("fileName:   "+fn);
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
		if (backgroundPage == undefined) { // If we are in a private window, we have our own copy of curBNList
		  // Maintain it up to date
		  curBNList[bnId].faviconUri = uri;
		}

		// Set image
		let row = curRowList[bnId]; // Retrieve row holding the icon
//trace("BN.id: "+bnId+" index: "+row.rowIndex+" Row id: "+row.dataset.id+" uri: "+uri);
		if (row != undefined) { // May happen on most visited and recent bookmarks when they are not yet ready
		  let bkmkitem = row.firstElementChild.firstElementChild;
		  let oldImg = bkmkitem.firstElementChild;
		  let cn = oldImg.className;
		  if (uri == "/icons/nofavicon.png") {
			if ((cn == undefined) || !cn.includes("nofavicon")) { // Change to nofavicon only if not already a nofavicon
			  let tmpElem = document.createElement("div");
			  tmpElem.classList.add("nofavicon");
			  tmpElem.draggable = false; // True by default for <img>
			  bkmkitem.replaceChild(tmpElem, oldImg);
			}
		  }
		  else {
			if ((cn != undefined) && cn.includes("nofavicon")) { // Change type from <div> to <img> if it was a nofavicon
			  let tmpElem = document.createElement("img"); // Assuming it is an HTMLImageElement
			  tmpElem.classList.add("favicon");
			  tmpElem.draggable = false; // True by default for <img>
			  tmpElem.src = uri;
			  bkmkitem.replaceChild(tmpElem, oldImg);
			}
			else {
			  oldImg.src = uri;
			}
		  }
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
console.log("Received message in "+wId+" to show "+bnId+" for tab "+tabId);
		  // Use the search mode to allow coming back to normal view after show
		  // This consists in disabling the searchbox and putting some text in it to reflect the action,
		  // then execute a search and show for bnId
		  SearchTextInput.disabled = true;
		  SearchTextInput.value = "<show bookmark for tab "+tabId+">";
		  enableCancelSearch();
		  let bn = curBNList[bnId]; // We are protected already, by checking bnId before sending the message
		  displayResults([bn]);
		  let row = curRowList[bnId];
		  let wasRowVisible = showRow(bnId, row);
		  if (!wasRowVisible) {
			// If we have the options.openTree active, then we necessarily changed some folder state
			// => save it.
			if (options.openTree) {
			  saveFldrOpen();
			}
			else { // Else show special action on context menu
			  cursor.cell.classList.add(Reshidden); // Show special menu to open parent folders
			}
		  }
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
	  else if (msg.startsWith("recentBkmkBNId")) { // Recreated (typically on restore bookmarks), so note the id
		recentBkmkBNId = request.bnId;
	  }
	  else if (msg.startsWith("mostVisitedBNId")) { // Recreated (typically on restore bookmarks), so note the id
		mostVisitedBNId = request.bnId;
	  }
	  else if (msg.startsWith("recentTagBNId")) { // Recreated (typically on restore bookmarks), so note the id
		recentTagBNId = request.bnId;
	  }
	  else if (msg.startsWith("bsp2TrashFldrBNId")) { // Recreated, so note the id
		bsp2TrashFldrBNId = request.bnId;
	  }
	  else if (msg.startsWith("hnListAdd")) { // We are getting an update on undo / redo buttons
		// Update undo/redo buttons if any change
		setUndoRedoButtons(request.canUndo, request.canRedo);
	  }

	  // Answer (only to background task, to not perturbate dialog between another sidebar or add-on window, and background)
	  sendResponse(
		{content: "Sidebar:"+myWindowId+" response to "+request.source		
		}
	  );
	}
  }
  catch (error) {
	console.log("Error processing message: "+request.content);
	if (error != undefined) {
	  console.log("message:    "+error.message);
	  let fn = error.fileName;
	  if (fn == undefined)   fn = error.filename; // Not constant :-( Some errors have filename, and others have fileName 
	  console.log("fileName:   "+fn);
	  console.log("lineNumber: "+error.lineNumber);
	}
  }
}

/*
 * Fire when the sidebar is closed
 */
function closeHandler (e) {
//console.log("Sidebar close: "+e.type);

  // If running in sidebar, signal to background page we are going off
  if (isInSidebar) {
	if (backgroundPage != undefined) {
	  try {
		backgroundPage.closeSidebar(myWindowId);
	  }
	  catch (e) {
		sendAddonMessage("Close:"+myWindowId);
	  }
	}
	else {
	  sendAddonMessage("Close:"+myWindowId);
	}
  }
}

/*
 * Fire when we lose keyboard focus
 * Used to close any context menu when open, and to change the SelectHighlight background color to inactive
 */
function onBlur (aEvent) {
  clearMenu();
}

/*
 * Fire when the results panel loses focus
 * Used to change the SelectHighlight background color to inactive
 */
function resultsFocusout (aEvent) {
  // Retrieve the CSS rules to modify
  let a_ss = document.styleSheets;
  let ss = a_ss[0];
  let cssRules = ss.cssRules;
  setSelectHighlight(cssRules, rselHighlightRule, false);
}

/*
 * Fire when we gain focus somewhere in the results panel
 * Used to change the SelectHighlight background color to active
 */
function resultsFocusin (aEvent) {
  // Retrieve the CSS rules to modify
  let a_ss = document.styleSheets;
  let ss = a_ss[0];
  let cssRules = ss.cssRules;
  setSelectHighlight(cssRules, rselHighlightRule, true);
}

/*
 * Fire when the bookmarks panel loses focus
 * Used to change the SelectHighlight background color to inactive
 */
function bookmarksFocusout (aEvent) {
  // Retrieve the CSS rules to modify
  let a_ss = document.styleSheets;
  let ss = a_ss[0];
  let cssRules = ss.cssRules;
  setSelectHighlight(cssRules, selHighlightRule, false);
}

/*
 * Fire when we gain focus somewhere in the bookmarks panel
 * Used to change the SelectHighlight background color to active
 */
function bookmarksFocusin (aEvent) {
  // Retrieve the CSS rules to modify
  let a_ss = document.styleSheets;
  let ss = a_ss[0];
  let cssRules = ss.cssRules;
  setSelectHighlight(cssRules, selHighlightRule, true);
}

/*
 * Fire when there is a mouse wheel event
 * Used to disable zooming with Ctrl+mouse wheel
 */
function onWheel (aEvent) {
  let is_ctrlKey;
  let is_metaKey;
  if (isMacOS) {
	is_ctrlKey = aEvent.metaKey;
	is_metaKey = aEvent.ctrlKey;
  }
  else {
	is_ctrlKey = aEvent.ctrlKey;
	is_metaKey = aEvent.metaKey;
  }
  if (is_ctrlKey && !aEvent.altKey && !is_metaKey && !aEvent.shiftKey) {
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
	let t1 = (new Date ()).getTime();
	tt1 = Performance.now();
	children = rootBN.children;
	let len = children.length;
	for (let i=0 ; i<len ; i++) {
	  await completeFavicons(children[i]);
	}
	let t2 = (new Date ()).getTime();
	trace("Favicon display duration: "+(t2 - t1)+" ms", true);
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
	  let uri = BN.faviconUri;
//	  if ((uri != undefined) && (uri != "/icons/nofavicon.png")) {
	  if (BN.fetchedUri || (uri != "/icons/nofavicon.png")) {
		img.src = uri;
	  }
	}
  }
}

/*
 * Handle window size to remove scrollbars when the width is tiny (<= 20 px)
 */
let compStyles = window.getComputedStyle(Body);
function windowSizeHandler() {
  let realWidth = compStyles.getPropertyValue('width');
  realWidth = realWidth.substring(0, realWidth.length-2);
//console.log("width : "+window.width);
//console.log("computed width : "+realWidth);
  if (!isBkmkScrollInhibited && !isRsltScrollInhibited) { // Don't act when scrolling is inhibited by drag & drop handlers'
	if (realWidth <= 40) { // Tiny => disable scroll bars
//console.log("here");
	  SearchResult.classList.replace(RScrollOk, RScrollKo);
	  Bookmarks.classList.replace(BScrollOk, BScrollKo);
	}
	else { // Re-establish scrollbars if they were disabled
	  SearchResult.classList.replace(RScrollKo, RScrollOk);
	  Bookmarks.classList.replace(BScrollKo, BScrollOk);
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
//  if (options.delayLoad)
//	Bookmarks.appendChild(docFragment); // Display the table of bookmarks + reflow
  endDisplayTime = (new Date ()).getTime();
  trace("Display duration: "+(endDisplayTime - endGetTreetime)+" ms", true);
  trace("Total duration: "+(endDisplayTime - startTime)+" ms", true);

  // Finish displaying favicons asynchronously
  if (!options.disableFavicons && !options.immediateFavDisplay) {
	setTimeout(completeFavicons, 0);
  }

  // If 16x16 migration is planned but nothing scheduled yet, do it
  if (migration_img16 && (migrationTimeout == null)) {
	migrationTimeout = setTimeout(trigMigrate16x16, Migr16x16Timeout);
  }


  // Setup mouse handlers for bookmarks and results
  SearchResult.addEventListener("mousedown", resultsMouseDownHandler);
  Bookmarks.addEventListener("mousedown", bkmkMouseDownHandler);
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
  ExpandMenuButtonInput.addEventListener("click", switchExpMenu);
  ExpandMenuButtonInput.addEventListener("contextmenu", switchExpMenu);
  ExpandMenuButtonInput.addEventListener("auxclick", switchExpMenu);
  ResetFiltersButtonInput.addEventListener("click", resetFiltersButtonHandler);
  ResetFiltersButtonInput.addEventListener("contextmenu", resetFiltersButtonHandler);
  ResetFiltersButtonInput.addEventListener("auxclick", resetFiltersButtonHandler);
  SearchButtonInput.addEventListener("click", searchButtonHandler);
  SearchButtonInput.addEventListener("contextmenu", searchButtonHandler);
  SearchButtonInput.addEventListener("auxclick", searchButtonSwitchMode);

  // General event handlers for a click anywhere in the document .. used to clear menus
  // and prevent default menus
  addEventListener("keydown", keyHandler);
  addEventListener("click", clickHandler);
  addEventListener("mousedown", noDefaultAction);
  addEventListener("contextmenu", noDefaultAction);
  addEventListener("auxclick", noDefaultAction);
  addEventListener("blur", onBlur);
  Bookmarks.addEventListener("focusout", bookmarksFocusout);
  SearchResult.addEventListener("focusout", resultsFocusout);
  Bookmarks.addEventListener("focusin", bookmarksFocusin);
  SearchResult.addEventListener("focusin", resultsFocusin);
  addEventListener('wheel', onWheel, {capture: true, passive: false}); // To disable zooming
  addEventListener('resize', windowSizeHandler);

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
	  trace("Bookmarks:             "+countBookmarks, true);
	  trace("Favicons to fetch:     "+countFetchFav, true);
	  trace("Unsuccessful favicons: "+countNoFavicon, true);
	  trace("Folders:               "+countFolders, true);
	  trace("Separators:            "+countSeparators, true);
	  trace("Oddities:              "+countOddities, true);
	  trace("--------------------", true);

	  let obj = backgroundPage.newSidebar(myWindowId);
	  goBkmkItem(obj.bnId);
	  setExpMenu(obj.expMenu);
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
  if ((options.trashEnabled && options.trashVisible)
	  || (BN.inBSP2Trash != true)
	 ) { // Don't display BNs in BSP2 trash, except on debug
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
	let t1 = (new Date ()).getTime();
	let children = await browser.bookmarks.getChildren(BTN.id);
	let t2 = (new Date ()).getTime();
	trace(BTN.id+" children load duration: "+(t2 - t1)+" ms", true);
	trace("      Number of children nodes: "+children.length, true);
	insertBookmark(BTN, level, -1, children);

	// If folder is open, get children now, else enqueue for later
	if (curFldrOpenList[BTN.id]) {
      // Recursively display children
	  let len = children.length;
	  let j;
      for (let i=0 ; i<len ; i++) {
		j = children[i];
    	// Need to await as an async function is returning a Promise by definition
        await exploreWidth(j, level+1);
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
  let len = a_BTN.length;
  let j
  for (let i=0 ; i<len ; i++) {
	j = a_BTN[i];
    if (j.id == id) {
      await exploreWidth(j, level);
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
//console.log("openBookmarksInNewTabs_option: "+openBookmarksInNewTabs_option);
}

/*
 * Callback for about:config browser.search.openintab setting
 */
function openSearchResultsInNewTabs_change (value) {
  openSearchResultsInNewTabs_option = value.value;
//console.log("openSearchResultsInNewTabs_option: "+openSearchResultsInNewTabs_option);
}

/*
 * Set font to bold or normal
 * 
 * is_bold = Boolean
 */
function setPageFontWeight (is_bold) {
  let w = (is_bold ? "bold" : "normal");
  Body.style.fontWeight = w;
  SearchTextInput.style.fontWeight = w;
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
 * Change a SelectHighlight rule to active or inactive
 */
function setSelectHighlight (cssRules, rule, is_active) {
  let cssStyleRule;
  let style;

  let prop;
  if (is_active) {
	prop = "#CDE8FF";
  }
  else {
	prop = "#D9D9D9";
  }

  cssStyleRule = getStyleRule(cssRules, rule);
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("background-color", prop);
  style.setProperty("border-color", prop);
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

	cssStyleRule = getStyleRule(cssRules, ".brow:hover, .selbrow:hover, .rselbrow:hover");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("color", HighlightTextColor);

	cssStyleRule = getStyleRule(cssRules, ".brow:focus, .selbrow:focus, .rselbrow:focus");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("color", HighlightTextColor);
  }
  else {
	sidebarTextColor = undefined;

	cssStyleRule = getStyleRule(cssRules, "html, body");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.removeProperty("color");

	cssStyleRule = getStyleRule(cssRules, ".favseparator");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("border-bottom-color", HighlightTextColor);

	// Force a visible text color when highlighting a cell (= default FF value in nm/default theme mode)
	cssStyleRule = getStyleRule(cssRules, ".selbrow");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.removeProperty("color");

	cssStyleRule = getStyleRule(cssRules, ".brow:hover, .selbrow:hover, .rselbrow:hover");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.removeProperty("color");

	cssStyleRule = getStyleRule(cssRules, ".brow:focus, .selbrow:focus, .rselbrow:focus");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.removeProperty("color");
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
 * Set no-favicon image as per options
 */
function setPanelNoFaviconImg (useAltNoFav_option, altNoFavImg_option) {
  // Retrieve the CSS rules to modify
  let a_ss = document.styleSheets;
  let ss = a_ss[0];
  let cssRules = ss.cssRules;
  let cssStyleRule;
  let style;

  cssStyleRule = getStyleRule(cssRules, ".nofavicon");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("background-image", (useAltNoFav_option ? "url(\""+altNoFavImg_option+"\")"
															: "url(\"/icons/nofavicon.png\")"
										)
				   );
}

/*
 * Set undo and redo buttons disabled or enabled state
 * 
 * undo = Boolean; true for enabled, false for disabled
 * redo = Boolean; true for enabled, false for disabled
 */
function setUndoRedoButtons (undo, redo) {
  if (undo != canUndo) {
	UndoButtonInput.disabled = !undo;
	canUndo = undo;
  }
  if (redo != canRedo) {
	RedoButtonInput.disabled = !redo;
	canRedo = redo;
  }
}

/*
 * Set UI overall fonts, sizes, spacing ..
 */
function setupUI () {
  // Set pointer on result bookmark items according to Click mode setting
  setRBkmkItemBCursor(options.advancedClick);

  // Set font size, and menus size accordingly
  let fs;
  if (options.setFontSize && (options.fontSize != undefined)) {
	fs = options.fontSize;
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
	isMacOS = true;
	setPageFontSize(fs);
	if (fs != DfltFontSize) {
	  let ms = Math.floor(DfltMenuSize * fs / DfltFontSize);
	  if (fs < 12)
	  	ms += 5 * fs / DfltFontSize;
	  setMenuSize(ms);
	}
  }

  // Set bold fonts if optoin is set
  if (options.setFontBold) {
	setPageFontWeight(true);
  }

  // Set spacing between bookmark items
  if (options.setSpaceSize && (options.spaceSize != undefined)) {
	let padding = options.spaceSize / 2;

	// Retrieve the CSS rules to modify
	let a_ss = document.styleSheets;
	let ss = a_ss[0];
	let cssRules = ss.cssRules;
	let cssStyleRule;
	let style;

	cssStyleRule = getStyleRule(cssRules, ".bkmkitem_b, .bkmkitem_f");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("padding-top", padding+"px");
	style.setProperty("padding-bottom", padding+"px");

	cssStyleRule = getStyleRule(cssRules, ".bkmkitem_s");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("padding-top", padding+"px");
	style.setProperty("padding-bottom", padding+"px");

	cssStyleRule = getStyleRule(cssRules, ".rbkmkitem_b");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("padding-top", padding+"px");
	style.setProperty("padding-bottom", padding+"px");

	cssStyleRule = getStyleRule(cssRules, ".rbkmkitem_f");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("padding-top", padding+"px");
	style.setProperty("padding-bottom", padding+"px");
  }

  // Align colors with window theme
  if (options.matchTheme) {
	browser.theme.getCurrent(myWindowId)
	.then(setPanelColors);

	// Register listener
	browser.theme.onUpdated.addListener(themeRefreshedHandler);
  }
  else { // If set colors option is set, align colors with specified values
	if (options.setColors) {
	  // Align colors with chosen ones 
	  setPanelColorsTB(options.textColor, options.bckgndColor);
	}
  }

  // Set folder image as per options
  if (options.useAltFldr) {
	setPanelFolderImg(true, options.altFldrImg);
  }

  // Set no-favicon image as per options
  if (options.useAltNoFav) {
	setPanelNoFaviconImg(true, options.altNoFavImg);
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
	countNoFavicon = backgroundPage.countNoFavicon;
	countFolders = backgroundPage.countFolders;
	countSeparators = backgroundPage.countSeparators;
	countOddities = backgroundPage.countOddities;
	mostVisitedBNId = backgroundPage.mostVisitedBNId;
	recentTagBNId = backgroundPage.recentTagBNId;
	recentBkmkBNId = backgroundPage.recentBkmkBNId;
	bsp2TrashFldrBNId = backgroundPage.bsp2TrashFldrBNId;
	initCanUndo = (backgroundPage.curHNList.activeIndex != undefined);
	initCanRedo = (backgroundPage.curHNList.undoList.length > 0);

	// Get options and curBNList / rootBN
	refreshOptionsBgnd(backgroundPage);
	TracePlace.hidden = !options.traceEnabled;

	curBNList = backgroundPage.curBNList;
	rootBN = backgroundPage.rootBN;
  }
  endGetTreetime = (new Date ()).getTime();
  trace("Get tree duration: "+(endGetTreetime - endLoadTime)+" ms", true);

  // Set the scene ..
  setupUI();
  setSearchOptions();
  setUndoRedoButtons(initCanUndo, initCanRedo);
  setExpMenu(options.expandMenu);

  if (options.searchHeight != undefined) { // Set current saved size 
	SearchResult.style.height = options.searchHeight; 
	// Note: to reset the height to CSS default ("20%"), just set
	//  SearchResult.style.height = "";
	//  let computedStyle = window.getComputedStyle(SearchResult, null);
//console.log("computed height: "+computedStyle["height"]);
	// will show "20%"
  }
//	else {
//	  // Reset of search pane height
//	  SearchResult.style.height = "";
//	}

  trace("structureVersion: "+structureVersion, true);
  trace("options.disableFavicons: "+options.disableFavicons, true);
  trace("options.pauseFavicons: "+options.pauseFavicons, true);
  if (!structureVersion.includes(VersionImg16)) {
	// Remember to trigger img16 migration later
	migration_img16 = true;
  }

  // Catch changes to the search box contents
  // (including when we clear its contents programmatically ..)
  SearchTextInput.addEventListener("input", manageSearchTextHandler);
  // On searchbox gaining focus, select all text inside if there is to allow replace
  SearchTextInput.addEventListener("focus", selectSearchTextHandler);

  // Catch clicks on the Cancel search button
  CancelSearchInput.addEventListener("click", cancelSearchTextHandler);
//    CancelSearchInput.addEventListener("contextmenu", contextSearchTextHandler);

  // Handle undo/redo buttons
  UndoButtonInput.addEventListener("click", triggerUndo);
  RedoButtonInput.addEventListener("click", triggerRedo);

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

  // Get our self name
  browser.management.getSelf()
  .then(
	function (extensionInfo) {
	  selfName = extensionInfo.name;
/*
	  // Display our version number
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
*/
	}
  );
}

/*
 * Initialization phase 1 for private windows = when background is ready, get CurBNList from background
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

  startTime = (new Date ()).getTime();
  if (backgroundPage == undefined) { // Private window, load by ourselves, except SavedBNList
	waitMsg("Load saved state..");
	let p = readFullLStore(true, waitMsg);
	Promise.all([p_getWindowId, p]) // Make sure we get myWindowId as we can directly call a function using it
	.then(
	  function (a_values) { // An array of one value per Promise is returned
		p_getWindowId = p = undefined; // Free memory held by these global variables

		// Handle myWindowId
		let windowInfo = a_values[0];
		myWindowId = windowInfo.id;

		// It appears that the sidebar is running even in popup windows where it is not visible !!
		// So even in the Property popup and in the History popup ..
		// If we are in something else than a "normal" window, let's not continue, but close ourselves instead
		let winType = windowInfo.type;
		if (winType != "normal") {
		  // Well, we cannot close ourselves here, because "close()" can only be called in a user action context
		  // So let "die" smoothly then ..
//		  browser.sidebarAction.close()
//		  .then(function () {console.log("closed")})
//		  .catch(function (err) {console.log("Error name: "+err.name+" Error message: "+err.message);})
//		  ;
//console.log("Terminating BSP2 sidebar execution in private window "+myWindowId+' windowInfo.type='+winType);
		}
		else {
//console.log("sidebar is open in private window "+myWindowId+' windowInfo.type='+winType);

		  // Process read values from Store (they are already in Global variables from libstore.js)
		  endLoadTime = (new Date ()).getTime();
		  trace("Load local store duration (full): "+(loadDuration = (endLoadTime - startTime))+" ms", true);
		  TracePlace.hidden = !options.traceEnabled;

		  if (backgroundReady) {
			if (options.traceEnabled) {
			  console.log("Background is Ready 2");
			}
			initializePriv();
			WaitMsg.textContent = "Load from background..";
		  }
		  else {
			if (options.traceEnabled) {
			  console.log("Waiting on Background 2");
			}
			f_initializeNext = initializePriv;
			waitingInitBckgnd = true;
			WaitMsg.textContent = "Wait background load..";
			// In case Background is already ready, but we missed the signalling message because
		 	// we started after it was sent, provoke its resend ..
			sendAddonMessage("getBackground");
		  }
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
		p_getWindowId = p = undefined; // Free memory held by these global variables

		// Handle myWindowId
		let windowInfo = a_values[0];
		myWindowId = windowInfo.id;

		// It appears that the sidebar is running even in popup windows where it is not visible !!
		// So even in the Property popup and in the History popup ..
		// If we are in something else than a "normal" window, let's not continue, but close ourselves instead
		let winType = windowInfo.type;
		if (winType != "normal") {
		  // Well, we cannot close ourselves here, because "close()" can only be called in a user action context
		  // So let "die" smoothly then ..
//		  browser.sidebarAction.close()
//		  .then(function () {console.log("closed")})
//		  .catch(function (err) {console.log("Error name: "+err.name+" Error message: "+err.message);})
//		  ;
//console.log("Terminating BSP2 sidebar execution in window "+myWindowId+' windowInfo.type='+winType);
		}
		else {
//console.log("sidebar is open in window "+myWindowId+' windowInfo.type='+winType);

		  // Process read values from Store (they are already in Global variables from libstore.js)
		  endLoadTime = (new Date ()).getTime();
		  trace("Load local store duration (folders only): "+(loadDuration = (endLoadTime - startTime))+" ms", true);

		  if (backgroundPage.ready) {
if (options.traceEnabled) {
  console.log("Background is Ready 1");
}
			initialize2();
		  }
		  else { // Wait for Background to complete initialization
if (options.traceEnabled) {
  console.log("Waiting on Background 1");
}
			f_initializeNext = initialize2;
			waitingInitBckgnd = true;
			WaitMsg.textContent = "Wait background load..";
		  }
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
	p_platform = p_background = p_ffversion = p_getTab = undefined; // Free memory held by these global variables

	// Rerieve values in the same order
	platformOs = a_values[0].os; // info object
	let page = a_values[1];
	let info = a_values[2];
	let tabInfo = a_values[3];
	beforeFF57 = ((ffversion = parseFloat(info.version)) < 57.0);
	beforeFF58 = (ffversion < 58.0);
	beforeFF63 = (ffversion < 63.0);
	beforeFF64 = (ffversion < 64.0);
	beforeFF109 = (ffversion < 109.0);

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