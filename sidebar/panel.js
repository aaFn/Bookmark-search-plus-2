'use strict';

/* <rant on>
 *       javascript is a crap language .. no easy way to know/specify the type of objects we
 *       manipulate or retrieve, so the methods we call to get or to manipulate contents
 *       of objets are approximative at best, and nearly rely on black art ..
 *       Browsing docs & API's for hours is the only way to get good information about what can
 *       be done of an object .. However, and even with that good basis, we can only guess
 *       and try based on what we want to do, and what we believe we are manipulating ..
 *       and verify with traces this is really what we expect, and doing what we want.
 *       Most of all, recipe is to copy on what others did or on the very good Mozilla's tutorials
 *       and doc illustration examples, and hope that will work and that this will be efficient :-(
 *
 *       One of the real useful thing is https://developer.mozilla.org/en-US/docs/Web/API
 *       and then try to guess what "Interface" (closest to object type ..) will really
 *       apply, then try its attributes and methods crossing fingers ..
 *       .. really crap language and poor way of doing things :-((
 *
 *       Also, there is the general assumption in javascript that it is single-threaded:
 *       - given piece of code is always executed atomically until end and never interrupted
 *         by another thread running javaScript.
 *       - events are queued, and executed serially in order of occurrence when handling of
 *         previous event is finished.
 *       - hence the "a script is taking too long to run" dialog which many browser have to
 *         implement, in case processing of an event is not yielding control in some due time ..
 *       Therefore, there is no "synchronized" or "atomic" keyword like in other languages to make
 *       sure that concurrent accesses to an object are serialized and not intermixed, which
 *       could mess up and have unexpected results.
 *       That may be true today, but this gives very bad habits to people using javascript, and
 *       what about tomorrow ?? (note also that "synchronized" was reserved in ECMAScript
 *       until 5 & 6 ..)
 *
 *       A side consequence is that most browsers wait the current script execution to end
 *       before displaying / refreshing the DOM.
 *       So when we have long tasks, we should use Workers
 *         https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
 *       so that they run in another thread, and post event messages back for display
 *       to the main script, therefore not bogging down display.
 *       Workers are quite limited in what they can access.
 *       Good news is that they are passed values (copies), so there is no access concurrency
 *       risk with the main thread ot between themselves when they run.
 *  <rant off>
 *  Mapi !
 */


/*
 * Constants
 */
//Declared in libstore.js
//const VersionImg16 = "-img16"; // Signal that all favicons are in 16x16 format
//const VersionBNList = "-bnlist"; // Signal that we are in BookmarkNode tree format
const Migr16x16Timeout = 60000; // Time to wait before triggering 16x16 favicon migration
const Navigator = window.navigator; // Get version of navigator to detect unavailable features between FF 54 and FF 56
const BuildID = Navigator.buildID; // BuildID: 20100101 means that we have the websites.resistFingerprinting setting
                                   // set .. see https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/privacy/websites
                                   // This can happen when the Privacy Settings add-on is used for example ..
                                   // See https://addons.mozilla.org/fr/firefox/addon/privacy-settings/ .. good news, this
                                   //   add-on requires FF 57 minimum, and that particular setting exist only since FF 58,
                                   //   so we cannot have it on FF 56 and it means BeforeFF57 and BeforeFF58 must be false.
//console.log("BuildID: "+BuildID);
const BeforeFF57 = ((BuildID != "20100101") && (BuildID < "20171112125346"));
const BeforeFF58 = ((BuildID != "20100101") && (BuildID < "20180118215408"));
const Performance = window.performance;
const Body = document.querySelector("#body"); // Assuming it is an HTMLBodyElement
const MGlassImg = document.querySelector("#mglass"); // Assuming it is an HTMLImgElement
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
const InputKeyDelay = 500; // Delay in ms from last keystropke to activate / refresh search result
const PopupURL = browser.extension.getURL("sidebar/popup.html");
const PopupWidth  = 375;
const PopupHeight = 150;
const OpenFolderTimeout = 1000; // Wait time in ms for opening a closed folder, when dragging over it

const Selhighlight = "selbrow"; // selhighlight class name in CSS
const Reshidden = "reshidden"; // reshidden class name in CSS, to remember a shown row was hidden

const LevelIncrementPx = 12; // Shift right in pixel from levle N to level N+1
//Declared in BookmarkNode.js
//const Root = "root________";
//const PersonalToobar = "toolbar_____";
//const BookmarksMenu =  "menu________";
//const OtherBookmarks = "unfiled_____";
//const MobileBookmarks = "mobile______";
/*
 *  Prepare standard Folder structure for node cloning
 */
const FolderTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
FolderTempl.classList.add("bkmkitem_f");
FolderTempl.draggable = false; // False by default for <div>
let tmpElem1 = document.createElement("img"); // Assuming it is an HTMLImageElement
tmpElem1.classList.add("ffavicon");
tmpElem1.draggable = false; // True by default for <img>
FolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
FolderTempl.appendChild(tmpElem1);
/*
 *  Prepare special Folder structure for node cloning
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
 *  Prepare Separator structure for node cloning
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
 *  Prepare Bookmark structure for node cloning
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
 *  Prepare nofavicon Bookmark structure for node cloning
 */
// We can attach an href attribute to <div> !!
// Much better as it avoids any special behavior of <a> on clicks and look/CSS ..
//let anchor = document.createElement("a"); // Assuming it is an HTMLAnchorElement
const NFBookmarkTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
NFBookmarkTempl.classList.add("bkmkitem_b");
NFBookmarkTempl.draggable = false; // False by default for <div> 
tmpElem1 = document.createElement("img"); // Assuming it is an HTMLImageElement
tmpElem1.classList.add("nofavicon");
tmpElem1.draggable = false; // True by defaul for <img>
NFBookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
NFBookmarkTempl.appendChild(tmpElem1);
tmpElem1 = undefined;


/*
 * Global variables
 */
let backgroundPage;
let backgroundReady = false; // To signal background ready to private windows
let waitingInitBckgnd = false; // To flag we're waiting for background init
//Declared in libstore.js
//let structureVersion = ""; // String signalling which migrations are done / current state
let migration_img16 = false;
let migrationTimeout = null; // Timer to trigger migration
let platformOs;
let p_GetWindowId; // Promise on getting myWindowId
let myWindowId;
let openBookmarksInNewTabs_option = false; // Boolean
let openSearchResultsInNewTabs_option = false; // Boolean
// Declared in libstore.js
//let savedBkmkUriList; // Used to receive the favicon uri saved in storage - Will be deleted at end
//let savedBNList; // Used to receive the BookmarkNodes saved in storage - Will be deleted at end
//let savedFldrOpenList; // Used to receive the open state saved in storage - Will be deleted at end
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
let inputTimeout = null; // Timeout between keystrokes to trigger bookmarck search from inpu
let cellHighlight = null; // Current highlight of a row in source bookmarks = cell
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
let bkmkClipboard = undefined; // Contains the bookmark node(s) being copied or cut
let rowClipboard = undefined; // Remains undefined in case of copy, else contains the row(s)
                              // being cut.

// Declared in BookmarkNode.js
//var countBookmarks, countFolders, countSeparators, countOddities;
let startTime, endLoadTime, endGetTreetime, endDisplayTime;
let loadDuration, treeLoadDuration, treeBuildDuration, saveDuration;


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
  let p = new Promise (
    (resolve, reject) => {
      let saveObj;
      saveObj = curFldrOpenList;
      browser.storage.local.set({
        savedFldrOpenList: saveObj
      })
      .then(
	    function () {
//          trace("Saved curFldrOpenList");
//          trace(Object.keys(saveObj));
//          trace(Object.values(saveObj));
          resolve();
        }
      );
    }
  );

  return(p); // Return promise
}

/*
 * Estimate a bookmark title for display from the URL, similar to how FF works, when there is no title
 * From pull request submitted by jun1x
 *   https://github.com/aaFn/Bookmark-search-plus-2/pull/45
 *   https://github.com/aaFn/Bookmark-search-plus-2/pull/45/commits/1b9a4169a84123681de1729564907b23db0537cf
 * 
 * url = String, URL of the bookmark item
 * 
 * Returns a String = suggested title to display for the bookamark
 */
function suggestDisplayTitle(url) {
  let title;

  // Try constructing the title using the URI
  try {
	let urlObj = new URL (url);
	let host = urlObj.host;
	let pathname = urlObj.pathname;
	let search = urlObj.search;
	let hash = urlObj.hash;
      
	// If fileName is empty, use path to distinguish labels
	title = decodeURI(host + pathname + search + hash);
  } 
  catch (e) {
	// Use (no title) for non-valid/standard URIs
	title = "(no title)"; // TODO : move to _locales/en/messages.json
  }

  return(title);
}

/*
 * Append a bookmark inside the search result sidebar table
 *
 * BTN = BookmarkTreeNode
 */
function appendResult (BTN) {
//  trace("Displaying <<"+BTN.id+">><<"+BTN.title+">><<"+BTN.type+">><<"+BTN.url+">>");

  // Append new bookmark row inside the search results table
  let row = resultsTable.insertRow();
  row.draggable = true; // Adding this, but with no handler, avoids that the anchor inside
                        // can be dragged .. not sure of exactly why, but this is what I observe !
  let BTN_id = row.dataset.id = BTN.id; // Keep unique id of bookmark in the data-id attribute
  curResultRowList[BTN_id] = row;

  // Add bookmark items in row
  let cell = row.insertCell();
  cell.classList.add("brow");
  cell.draggable = false;
  cell.tabIndex = 0;

  // Append proper contents to the cell:
  // - a <div> of class "bkmkitem_f", or a <a> of class "bkmkitem_b",
  //   for respectively folder or bookmark, containing:
  //   - an <img> (class "favicon") and a <span> with text
  //     (set class to "favtext" in javascript to get 3px margin-left, but not in HTML where
  //      it's already done, don't know why).
  let type = getType(BTN);
  if (type == "folder") {               // Folder
    // Mark that row as folder
    row.dataset.type = "folder";

    // Create elements
    let fetchedUri;
    let div3;
    if (BTN_id == PersonalToobar) {
      fetchedUri = "/icons/toolbarbkmk.png";
      div3 = SFolderTempl.cloneNode(true);
    }
    else if (BTN_id == BookmarksMenu) {
      fetchedUri = "/icons/menubkmk.png";
      div3 = SFolderTempl.cloneNode(true);
    }
    else if (BTN_id == OtherBookmarks) {
      fetchedUri = "/icons/otherbkmk.png";
      div3 = SFolderTempl.cloneNode(true);
    }
    else {
      div3 = FolderTempl.cloneNode(true);
    }
//    let div3 = document.createElement("div"); // Assuming it is an HTMLDivElement
//    div3.classList.add("bkmkitem_f");
//    div3.draggable = false;
//    cell.appendChild(div3);

//    let img = document.createElement("img"); // Assuming it is an HTMLImageElement
//    img.classList.add("favicon");
//    if (BTN_id == PersonalToobar)   img.src = "/icons/toolbarbkmk.png";
//    else if (BTN_id == BookmarksMenu)   img.src = "/icons/menubkmk.png";
//    else if (BTN_id == OtherBookmarks)   img.src = "/icons/otherbkmk.png";
//    else   img.src = "/icons/folder.png";
//    img.draggable = false;
//    div3.appendChild(img);
    let span;
    if (fetchedUri != undefined) {
      let img = div3.firstElementChild;
      img.src = fetchedUri;
      span = img.nextElementSibling;
    }
    else {
      span = div3.firstElementChild.nextElementSibling;
    }

//    let span = document.createElement("span"); // Assuming it is an HTMLSpanElement
//    span.classList.add("favtext");
    span.textContent = BTN.title;
//    span.draggable = false;
//    div3.appendChild(span);
    cell.appendChild(div3);
  }
  else {                                    // "bookmark"
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
    let uri = curBNList[BTN_id].faviconUri;
    if (disableFavicons_option || (uri == undefined)) { // Clone with nofavicon image background
      anchor = NFBookmarkTempl.cloneNode(true);
      span = anchor.firstElementChild.nextElementSibling;
    }
    else { // clone normal one, we will fill the image later
      anchor = BookmarkTempl.cloneNode(true);
      let img = anchor.firstElementChild;
      img.src = uri;
      span = img.nextElementSibling;
    }
    if (!url.startsWith("place:")) {
      anchor.href = url;
    }
//    let isSpecial = url.startsWith("place:");
//    let anchor;
//    if (isSpecial) {
//      anchor = document.createElement("div"); // Assuming it is an HTMLDivElement
//    }
//    else {
      // We can attach an href attribute to <div> !!
      // Much better as it avoids any special behavior of <a> on clicks and look/CSS ..
      //anchor = document.createElement("a"); // Assuming it is an HTMLAnchorElement
//      anchor = document.createElement("div"); // Assuming it is an HTMLDivElement
//      anchor.href = url;
//    }
//    anchor.classList.add("bkmkitem_b");
    if (title == "") {
      anchor.title = url;
      span.textContent = suggestDisplayTitle(url);
    }
    else {
      anchor.title = title+"\n"+url;
      span.textContent = title;
    }
//    anchor.draggable = false;
    anchor.style.marginLeft = "16px";
//    cell.appendChild(anchor);

//    let img = document.createElement("img"); // Assuming it is an HTMLImageElement
//    img.classList.add("favicon");

    // Retrieve current uri or set to nofavicon.png by default
//    let uri = curBNList[BTN_id].faviconUri;
//    if (uri == undefined) {
//      uri = "/icons/nofavicontmp.png";
//    }
//    img.src = uri;
//    img.draggable = false;
//    anchor.appendChild(img);

//    let span = document.createElement("span"); // Assuming it is an HTMLSpanElement
//    span.classList.add("favtext");
//    span.draggable = false;
//    anchor.appendChild(span);
    cell.appendChild(anchor);
  }
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
 * Set cell highlight
 * 
 * cell = .brow cell to set. Preserve the Reshidden flag if this is not changing cellHighlight.
 */
function setCellHighlight (cell) {
  if (cell != cellHighlight) {
    clearCellHighlight();
    cellHighlight = cell;
    cellHighlight.classList.replace("brow", Selhighlight);
  }
}
/*
 * Execute / update a bookmark search and display result
 */
function updateSearch () {
  // Triggered by timeout, so now clear the id
  inputTimeout = null;

  // Get search string
  let value = SearchTextInput.value;

  // Activate search mode if not already on
  if (CancelSearchInput.disabled) {
    CancelSearchInput.src = "/icons/cancel.png";
    CancelSearchInput.disabled = false;
    SearchResult.hidden = false;
    WaitingSearch.hidden = false;
  }
  else { // Else discard previous results table
    SearchResult.removeChild(resultsTable);
    resultsTable = null;
    curResultRowList = {};

//    resultsFragment = null;

    // If a row cell was highlighted, do not highlight it anymore
//    clearCellHighlight();
  }

  // Look for bookmarks matching the search text in their contents (title, url .. etc ..)
  let searching = browser.bookmarks.search(value)
  .then(
    function (a_BTN) { // An array of BookmarkTreeNode
      // Create the search results table
//      resultsFragment = document.createDocumentFragment();
      resultsTable = document.createElement("table");
      SearchResult.appendChild(resultsTable); // Display the search results table + reflow
//      resultsFragment.appendChild(resultsTable);

//      trace("Results: "+a_BTN.length);
      if (a_BTN.length > 0) {
        for (let i of a_BTN) {
          let url = i.url;
//          trace("Matching BTN.id: "+i.id+" "+i.title+" "+url);
          if ((url == undefined)           // folder
              || !url.startsWith("place:") // "place:" results behave strangely ..
                                           // (they have no title !!)
             ) {
            // Append to the search result table
            appendResult(i);
          }
        }
      }
      // Display the search result table
      WaitingSearch.hidden = true;
//      SearchResult.appendChild(resultsFragment); // Display the search results table + reflow
    }
  );
}

/*
 * Call to update a bookmark search and display result, if there is one active
 */
function triggerUpdate () {
  if (SearchTextInput.value.length > 0) { // Refresh only if a search is active
    if (inputTimeout == null) { // If not null, a setTimeout is active and so is going to call
	                            // updateSearch() anyway ..
      // Else, schedule a new one (this allows to integrate together multiple events,
      // like remove of a folder and its subtree)
      inputTimeout = setTimeout(updateSearch, InputKeyDelay);
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
 * Reset bookmarks tree to its intended visiblity state
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
//  trace("manageSearchTextHandler");
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
    // Set timeout before trigerring / updating search mode
    inputTimeout = setTimeout(updateSearch, InputKeyDelay);
  } else { // Clear search mode
    CancelSearchInput.src = "/icons/empty.png";
    CancelSearchInput.disabled = true;
    SearchResult.hidden = true;

    // Discard the results table
    SearchResult.removeChild(resultsTable);
    resultsTable = null;
//    resultsFragment = null;
    curResultRowList = {};

    // If a row was highlighted, do not highlight it anymore
//    clearCellHighlight();

    // Restore bookmarks tree to its initial visiblity state
    resetTreeVisiblity();

    // Remember search pane height if needed
    let sh = SearchResult.style.height; 
    if (sh != "") { // The search result pane size is different
    	            // from its default value set in the CSS
    	            // which is 20% (as seen in Computed Style)
      if (rememberSizes_option) {
    	if (searchHeight != sh) { // Save only if different from already saved
    	  searchHeight = sh;
    	  browser.storage.local.set({
    	    searchheight_option: sh
    	  });
    	}
      }
    }
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
 * Clear the contents of the Search text box
 */
function clearSearchTextHandler () {
//  trace("manageSearchTextHandler");
  SearchTextInput.value = "";

  // Fire event on searchText
  let event = new InputEvent ("input");
  SearchTextInput.dispatchEvent(event);
  SearchTextInput.focus(); // Keep focus on it ...
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
//  let t1 = new Date();
//  trace(t1.getTime()+" Displaying <<"+BN.id+">><<"+BN.title+">><<"+BN.type+">><<"+BN.url+">> at level: "+level+" highest_open_level: "+highest_open_level+" and index: "+index);
//  console.log("BN: "+BN.id+" type: "+BN.type+" dateAdded: "+BN.dateAdded+" dateGroupModified: "+BN.dateGroupModified);

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
  if (type == "folder") {               // Folder
    // Retrieve saved state or set open by default
	let open = undefined;
    if (savedFldrOpenList != undefined) {
      open = savedFldrOpenList[BN_id];
    }
    else {
      // Verify if we already know about it
      open = curFldrOpenList[BN_id];
    }
    if (open == undefined) { // Folder closed by default when no info
      open = curFldrOpenList[BN_id] = false;
    }
    else   curFldrOpenList[BN_id] = open;

    // Update indicator of highest open level .. only if open and in an open part
    if (open && (highest_open_level == level))
      highest_open_level = level + 1;

    // Create elements
    let div2 = document.createElement("div"); // Assuming it is an HTMLDivElement
    // Look at children to set the twistie
//    if (!delayLoad_option)
      children = BN.children;
    if ((children == undefined) || (children.length == 0))
      div2.classList.add("twistiena");
    else   div2.classList.add(open ? "twistieao" : "twistieac");
    div2.draggable = false; // False by default for <div>
    if (level > 0) {
      div2.style.marginLeft = (LevelIncrementPx * level)+"px";
    }
    cell.appendChild(div2);

//    let div3 = document.createElement("div"); // Assuming it is an HTMLDivElement
    let fetchedUri = BN.fetchedUri;
    let div3;
    if (fetchedUri) {
      div3 = SFolderTempl.cloneNode(true);
    }
    else {
      div3 = FolderTempl.cloneNode(true);
    }
//    div3.classList.add("bkmkitem_f");
    let title = BN.title;
    div3.title = title;
//    div3.draggable = false; // False by default for <div>
//    cell.appendChild(div3);

//    let img = document.createElement("img"); // Assuming it is an HTMLImageElement
//    img.classList.add("favicon");
//    img.src = BN.faviconUri;
//    img.draggable = false; // True by default for <img>
//    div3.appendChild(img);

    let span;
    if (fetchedUri) {
      let img = div3.firstElementChild;
      img.src = BN.faviconUri;
      span = img.nextElementSibling;
    }
    else {
      span = div3.firstElementChild.nextElementSibling;
    }

//    let span = document.createElement("span"); // Assuming it is an HTMLSpanElement
//    span.classList.add("favtext");
    span.textContent = title;
//    span.draggable = false; // False by default for <span>
//    div3.appendChild(span);
    cell.appendChild(div3);
  }
  else if (type == "separator") {       // Separator
    // Create elements
//    let div2 = document.createElement("div"); // Assuming it is an HTMLDivElement
	let div2 = SeparatorTempl.cloneNode(true);
//    div2.classList.add("bkmkitem_s");
//    div2.draggable = false; // False by default for <div>
    if (level > 0) {
      div2.style.marginLeft = (LevelIncrementPx * level + 16)+"px";
    }
    cell.appendChild(div2);

//    let div3 = document.createElement("div"); // Assuming it is an HTMLDivElement
//    div3.classList.add("favseparator");
//    div3.draggable = false; // False by default for <div>
//    div2.appendChild(div3);

//    let div4 = document.createElement("div"); // Assuming it is an HTMLDivElement
//    div4.classList.add("favseparatorend");
//    div4.draggable = false; // False by default for <div>
//    div2.appendChild(div4);
  }
  else {       // Presumably a Bookmark
    // Create elements
    let url = BN.url;
    let title = BN.title;
    // We can attach an href attribute to <div> !!
    // Much better as it avoids any special behavior of <a> on clicks and look/CSS ..
    //let anchor = document.createElement("a"); // Assuming it is an HTMLAnchorElement
//    let anchor = document.createElement("div"); // Assuming it is an HTMLDivElement
    let anchor;
    if (disableFavicons_option) { // Clone with nofavicon image background
      anchor = NFBookmarkTempl.cloneNode(true);
    }
    else { // clone normal one, we will fill the image later
      anchor = BookmarkTempl.cloneNode(true);
    }
    if (!url.startsWith("place:")) {
      anchor.href = url;
    }
//    anchor.classList.add("bkmkitem_b");
//    anchor.draggable = false; // False by default for <div> 
    if (level > 0) {
      anchor.style.marginLeft = (LevelIncrementPx * level + 16)+"px";
    }
//    cell.appendChild(anchor);

//    let img = document.createElement("img"); // Assuming it is an HTMLImageElement
//    img.classList.add("favicon");
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
//    let uri = BN.faviconUri;
//    img.src = (uri == undefined ? "/icons/nofavicon.png" : uri);
//    img.draggable = false; // True by defaul for <img>
//    anchor.appendChild(img);

//    let span = document.createElement("span"); // Assuming it is an HTMLSpanElement
//    span.classList.add("favtext");
    if (title == "") {
      anchor.title = url;
      span.textContent = suggestDisplayTitle(url);
    }
    else {
      anchor.title = title+"\n"+url;
      span.textContent = title;
    }
//    span.draggable = false; // False by default for <span>
//    anchor.appendChild(span);
    cell.appendChild(anchor);
  }

  return(row);
}

/*
 * Insert one or more (if folder) bookmarks in the existing table
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
    if ((children != undefined) && (children.length > 0)) {
      let childRow;
      let open = curFldrOpenList[BN.id]; // Retrieve our intended open state
      for (let i of children) {
        childRow = insertBkmks(i, row, parentLevel+1, open);
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
  let parentId = BN.parentId;
  let parentBN = curBNList[parentId];
  if (backgroundPage == undefined) { // Redo insertion in our own copy of curBNList
//	  trace(t1.getTime()+" Create event on: "+BN.id+" type: "+BN.type+" parentId: "+parentId+" index: "+index);

	// Insert the new BN tree under its parent
	BN_insert(BN, parentBN, index);
  }

  // Find insertion point, setting it in global variable insertRowIndex
  // We need to retrieve the insertion point the hard way if we do not want to call
  // getSubtree() which is very very long ...
  let row;
  let parentRow = curRowList[parentId];
  if (index == 0) { // Insert just after parent row
	// Note that this also takes care of the case where parent had so far no child
	insertRowIndex = parentRow.rowIndex + 1; // Can be at end of bookmarks table
  }
  else {
	let children = parentBN.children;
	let len = children.length - 1; // Be careful that we already inserted BN there ..
	if (index < len) { // Easy case, we insert just before next sibling
	  let nextBN = children[index+1]; // index is us ...
	  row = curRowList[nextBN.id];
	  // Cannot be undefined, except rare case under FF56, where we are discovering 2 or more separators
	  // in a row and they were already added in the BN tree by the background task, but not yes on display
	  if (row == undefined) { // Then act as insert as last child of its parent, having already children
		let previousBN = BN_lastDescendant(children[index-1]);
		row = curRowList[previousBN.id];
		insertRowIndex = row.rowIndex + 1; // Can be at end of bookmarks table
	  }
	  else {
		insertRowIndex = row.rowIndex;
	  }
	}
	else { // Harder case, we are inserting as last child of its parent, having already children
	  // Find last child / grand child under that previous sibling, and insert just after
	  let previousBN = BN_lastDescendant(children[index-1]);
	  row = curRowList[previousBN.id];
	  insertRowIndex = row.rowIndex + 1; // Can be at end of bookmarks table
	}
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
 * title = string. Latest title value (chnaged or not)
 * url = string. Latest url value (chnaged or not)
 * uri = string. Latest faviconUri value (chnaged or not)
 */
function bkmkChanged (bnId, isBookmark, title, url, uri) {
//  trace("Change event on: "+id+" title: <<"+changeInfo.title+">> url: "+changeInfo.url);
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
//trace("Move event on: "+id+" from: <<"+moveInfo.oldParentId+", "+moveInfo.oldIndex+">> to: <<"+moveInfo.parentId+", "+moveInfo.index+">>");

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
  if (targetCurIndex == 0) { // Insert just after parent row
	// Note that this also takes care of the case where parent had so far no child
	targetCurRowIndex = targetParentRow.rowIndex + 1;
	targetRow = targetParentRow.nextElementSibling; // Can be null if we move at end
  }
  else {
	let children = targetParentBN.children;
	let len = children.length - 1; // Be careful that we already inserted us there ..
	if (targetCurIndex < len) { // Easy case, we insert just before next sibling
	  let nextBN = children[targetCurIndex+1]; // targetCurIndex is us ...
	  targetRow = curRowList[nextBN.id];
	  // Cannot be undefined, except rare case under FF56, where we are discovering 2 or more separators
	  // in a row and they were already added in the BN tree by the background task, but not yes on display
	  if (targetRow == undefined) { // Then act as insert as last child of its parent, having already children
		let previousBN = BN_lastDescendant(children[targetCurIndex-1]);
		targetRow = curRowList[previousBN.id];
		targetCurRowIndex = targetRow.rowIndex + 1; // Can be at end of bookmarks table
		targetRow = targetRow.nextElementSibling; // Can be null if we move at end
	  }
	  else {
		targetCurRowIndex = targetRow.rowIndex;
	  }
	}
	else { // Harder case, we are inserting as last child of its parent, having already children
	  // Find last child / grand child under that previous sibling, and insert just after
	  let previousBN = BN_lastDescendant(children[targetCurIndex-1]);
	  targetRow = curRowList[previousBN.id];
	  targetCurRowIndex = targetRow.rowIndex + 1; // Can be at end of bookmarks table
	  targetRow = targetRow.nextElementSibling; // Can be null if we move at end
	}
  }

  // We got the move point in targetRow (null if at end), and its position in
  // targetOldRowIndex, proceed to move
//  trace("oldRowIndex: "+oldRowIndex+" targetOldRowIndex: "+targetOldRowIndex);

  // Remove item and its children from display, but keep them in their cur lists
  // as this is only a move.
  // The returned value is the row which took its place in the table (or null if
  // removed at end).
  let deletePos = removeBkmks(movedRow, false);

  // Insert the item at its new place (with its children) using global variable insertRowIndex
  // and get the last inserted row in return.
  if (curRowIndex == targetCurRowIndex) { // targetRow has disappeared, it was the moved row
    // We are then visually inserting where it was deleted
    insertRowIndex = deletePos.rowIndex;
  }
  else {
   	if (targetRow == null) // Moving at end of bookmarks table
   	  insertRowIndex = bookmarksTable.rows.length;
   	else   insertRowIndex = targetRow.rowIndex; // Get the updated row index of target
  }
  let insertPos = insertBkmks(BN, targetParentRow);

  // State of parent folders may change, so save folder open state
  saveFldrOpen();
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

  // We need the BN to get real info
  let folderBN = curBNList[bnId];
  let children = folderBN.children;
  if (children != undefined) {
	if (backgroundPage == undefined) { // Redo change in our own copy of curBNList
	  // Create a new array with all children of folderBN in new order
	  let len = children.length;
	  children = folderBN.children = new Array (len); // Start new list from scratch, discarding the old one
	  let j = 0;
	  for (let i of reorderInfo) {
		children[j++] = curBNList[i];
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
   	let open = curFldrOpenList[bnId]; // Retrieve our intended open state
   	insertRowIndex = rowIndex;
   	let childBN;
   	for (let i of reorderInfo) {
   	  childBN = curBNList[i];
   	  insertBkmks(childBN, folderRow, level+1, open);
   	}
  }

  // No folder state changed, so nothing to save
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
  let parentVisible, parentOpen;
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

  // Make the source row of result visible if hidden
  let srcRow = curRowList[resultBN_id];
  if (srcRow != undefined) { // Protect against unlisted bookmarks, like "Tous les marques-pages"
	                         // which do not appear in getTree(), but appear in search() !!
    
//    trace("Row: "+rcRow+" resultBN_id: "+resultBN_id+" index: "+srcRow.rowIndex);
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
        else if (rowLevel < level) {
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
    if (BeforeFF58) { // block: "center" is supported only from FF68
      srcRow.scrollIntoView({behavior: "smooth"});
    }
    else {
      srcRow.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
    }

    // If row is normally hidden (one of its parents is closed), remember it for special menu
    // (Open parents)
    // Be careful that srcHidden is not reliable .. in case we already showed a result under
    // same parent, then the row was already visible ..
    // Also, if we already showed a result under an ancestor, the firstVisibleParentRow
    // cannot be derived from the above "opening" code ..
    // So we have to check visibility systematically.
    if (!isVisible(resultBN_id)) {
	  cellHighlight.classList.add(Reshidden);
      // If we have the openTree_option active, then we necessarily changed some folder state
	  // => save it.
      if (openTree_option) {
	    saveFldrOpen();
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

    while ((row = row.nextElementSibling) != null) {
      if (parseInt(row.dataset.level, 10) <= level)
        break; // Stop when lower or same level
      row.hidden = true;
    }
  }
  else { // Open and unhide all direct children, plus only those under open sub-folders
    let last_open_level, cur_level, prev_level;
    let prev_row;

    // Open twistie
    twistie.classList.replace("twistieac", "twistieao");
    curFldrOpenList[BN_id] = true;
    saveFldrOpen();

    last_open_level = prev_level = level + 1;
    while ((row = (prev_row = row).nextElementSibling) != null) {
      if ((cur_level = parseInt(row.dataset.level, 10)) <= level)
          break; // Stop when lower or same level
//      trace("Row: "+row+" cur_level: "+cur_level+" prev_level: "+prev_level);
      if (cur_level > prev_level) { // We just crossed a folder in previous row ..
        // Check if it was open or not
        twistie = prev_row.firstElementChild.firstElementChild;
        open = twistie.classList.contains("twistieao");
//        trace("Row: "+row+" cur_level: "+cur_level+" prev_level: "+prev_level+" twistie: "+twistie.classList+" open:"+open);

        // Make the new level visible only if the previous one was visible
        if (open && (last_open_level == cur_level - 1))
          last_open_level = cur_level;
      }
      prev_level = cur_level;

      // Crank up last_open_level if we finished one or more levels which were open
      if (cur_level < last_open_level)   last_open_level = cur_level;

      // Row is not visible below last open level
      row.hidden = (cur_level > last_open_level);
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
    else if (className.startsWith("bkmkitem_")) { // If Alt key or advanced, open in current tab
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

    if (className == "bkmkitem_b") { // An HTMLDivElement
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
		  browser.tabs.query({windowId: myWindowId, active: true})
		  .then (
		    function (a_tabs) {
		      if (BeforeFF57)
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
	  // Now go to row
      target = target.parentElement.parentElement;
    }
    else if (className == "bkmkitem_f") {
  	  // Go to row
	  target = target.parentElement.parentElement;
	}
    else { // Presumably the .brow cell
  	  // Go to row
      target = target.parentElement;
    }

    // Make the source object visible .. and scroll to it
    handleResultClick(target);

    // If close search option is set, close search pane now
    if (closeSearch_option) {
  	  clearSearchTextHandler();
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
//  trace("Bookmark click event: "+e.type+" button: "+e.button+" shift: "+e.shiftKey+" target: "+target+" class: "+className);

  // The click target is one of .brow cell, .twistiexx img (if folder),
  // .bkmkitem_x div, .favseparator div, .favicon or .favttext
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
	if (((href != undefined) && ((href.length > 0))
		|| traceEnabled_option)) { // Special trick .. if traces are
		                           // enabled, authorize this .. with href == "", it will
                                   // load the add-on itself in the window !
                                   // Very useful to use the inpector on it,
                                   // as we cannot have le inspector inside the sidebar ..
      if(href == undefined)   href="";
      // Respect the about:config browser.tabs.loadBookmarksInTabs setting
      if (openBookmarksInNewTabs_option) { // If option set, open in new tab
	    browser.tabs.create({url: href});
      }
	  else if (e.ctrlKey) { // Open in new tab, referred by this tab to come back to it when closing
		// Get current active tab as opener id to come back to it when closing the new tab
		browser.tabs.query({windowId: myWindowId, active: true})
		.then (
		  function (a_tabs) {
		    if (BeforeFF57)
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
  // If folder bkmkitem with active twistie, handle folder click
  else if (className == "bkmkitem_f") {
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
}

/*
 * Receive event from aux clicks on results table - When on bookmark item, this opens the bookmark in a new tab
 *
 * e is of type MouseEvent (click)
 */
function resultsAuxHandler (e) {
  let target = e.target; // Type depends ..
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
        	if (BeforeFF57)
   		      browser.tabs.create({url: href});
          	else
		      browser.tabs.create({url: href, openerTabId: a_tabs[0].id});
		  }
	    );
	  }

      target = target.parentElement.parentElement;
    }
    else if (className == "bkmkitem_f") {
	  target = target.parentElement.parentElement;
	}
    else { // Presumably the .brow cell
      target = target.parentElement;
    }

    // Make the source object visible .. and scroll to it
    handleResultClick(target);

    // If close search option is set, close search pane now
    if (closeSearch_option) {
  	  clearSearchTextHandler();
    }
  }
}

/*
 * Receive event from aux clicks on bookmarks table - When on bookmark item, this opens the bookmark in a new tab
 *
 * e is of type MouseEvent (click)
 */
function bkmkAuxHandler (e) {
  let target = e.target; // Type depends ..
  let className = target.className;
//  trace("Bookmark aux event: "+e.type+" button: "+e.button+" shift: "+e.shiftKey+" phase: "+e.eventPhase+" target: "+target+" class: "+className);

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
	         && (target.parentElement.dataset.type == "bookmark")) {
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
        	if (BeforeFF57)
   		      browser.tabs.create({url: href});
          	else
		      browser.tabs.create({url: href, openerTabId: a_tabs[0].id});
		  }
	    );
	  }
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
  }
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

  return(menuClosed);
}

/*
 * Receive event from right clicks on results table, and display context menu
 * 
 * e is of type MouseEvent (contextmenu)
 */
function resultsContextHandler (e) {
  let target = e.target; // Type depends ..
//  trace("Result context event: "+e.type+" target: "+target+" class: "+target.classList);

  // If there is a previous menu, clear it
  clearMenu();

  let isShowMenu = !advancedClick_option; // If not advanced, always "Show bookmark" by default
  if ((target.className != undefined)
	  && (target.className.length > 0)) {
    // Go up to the row level, and store the rowIndex and type in the menu as data- attribute
    let className = target.className;
    let row;
    if(className.includes("fav")) {
	  row = target.parentElement.parentElement.parentElement;
    }
    else if (className.startsWith("bkmkitem_")) {
	  row = target.parentElement.parentElement;
    }
    else { // .brow
	  row = target.parentElement;
	  if (advancedClick_option)
	  isShowMenu = true;
    }

    // Make the source object visible .. and scroll to it
    handleResultClick(row);

    // Determine proper menu from type, signal it is open,
    // and store the rowIndex in it as data-index attribute
    let type = row.dataset.type;
    let rowIndex = row.rowIndex;
//    trace("Row: "+row+" rowIndex: "+rowIndex+" type: "+type);
    if (type == "bookmark") {
      let menu;
      if (isShowMenu) {
        myRShowBkmkMenu_open = true;
        MyRShowBkmkMenu.dataset.index = rowIndex;
        menu = MyRShowBkmkMenu;
      }
      else {
        myRBkmkMenu_open = true;
        MyRBkmkMenu.dataset.index = rowIndex;
        menu = MyRBkmkMenu;
      }

      // Display the context menu function of click position
      drawMenu(menu, e.clientY, e.clientX);
    }
    else { // Menu for "folder"
      myRFldrMenu_open = true;
      MyRFldrMenu.dataset.index = rowIndex;

      // Display the context menu function of click position
      drawMenu(MyRFldrMenu, e.clientY, e.clientX);
    }
  }
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
//  trace("Bookmark context event: "+e.type+" target: "+target+" class: "+target.classList);

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

  // Highlight bookmark
  let cell = row.firstElementChild;
  setCellHighlight(cell);

  // If there is a previous menu, clear it
  clearMenu();

  // Determine proper menu from type, signal it is open,
  // and store the rowIndex in it as data-index attribute
  // If the clipboard is not empty, show "Paste"
  let type = row.dataset.type;
  let rowIndex = row.rowIndex;
  let menu;
//  trace("Row: "+row+" rowIndex: "+rowIndex+" type: "+type);
  if (type == "bookmark") {
	if (row.dataset.protect == "true") { // Protected row
	  menu = MyBProtMenu;
      myBProtMenu_open = true;
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
        myBResBkmkMenu_open = true;
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
        myBBkmkMenu_open = true;
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
      myBProtFMenu_open = true;
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
        myBResFldrMenu_open = true;
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
        myBFldrMenu_open = true;
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
      myBSepMenu_open = true;
	}
  }

  if (menu != undefined) {
    menu.dataset.index = rowIndex;

    // Display the context menu function of click position
    e.preventDefault();
    drawMenu(menu, e.clientY, e.clientX);
  }
}

/*
 * Drag start event handler
 * 
 * e = DragEvent
 * 
 * Sets global variables rowDragged (HTMLRowElmeent) and BNDragged (BookmarkNode),
 * as well as the index min/max range indicating the no drop zone.
 */
let rowDragged;
let BNDragged;
let noDropMinRowIndex = -1;
let noDropMaxRowIndex = -1;
function bkmkDragStartHandler (e) {
  rowDragged = e.target; // Should always be a [object HTMLTableRowElement] by construction
//  trace("Drag start event: "+e.type+" target: "+rowDragged+" class: "+rowDragged.classList);
//  trace("Draggable: "+rowDragged.draggable+" Protected: "+rowDragged.dataset.protect);
  if (rowDragged.dataset.protect != "true") {
    let BN_id = rowDragged.dataset.id;
//    trace("BN_id: "+BN_id);
    // Now, get dragged BN (promise)
    BNDragged = curBNList[BN_id];

    // Get some text decribing what we are moving
    let type = BNDragged.type;
    let text;
    let isBookmark;
    let isFolder = (type == "folder");
    if (isFolder || (type == "separator")) {
      isBookmark = false;
      text = type;
    }
    else { // Bookmark
      isBookmark = true;
      text = BNDragged.url;
    }
//    trace("Type: "+type+" text: "+text+" isBookmark: "+isBookmark);

    // Set the event dataTransfer
    let dt = e.dataTransfer;
    dt.setData("application/x-bookmark", BN_id);
    if (isBookmark)
      dt.setData("text/uri-list", text);
    dt.setData("text/plain", text);
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
}

/*
 * Drag end event handler. This is on the element which was in Drag start = HTMLTableRowElement
 * 
 * e = DragEvent
 */
function bkmkDragEndHandler (e) {
  let target = e.target;
  let dt = e.dataTransfer;
//  trace("Drag end event: "+e.type+" target: "+target+" class: "+target.classList);
}

/*
 * Check if we support darg and drop of the source element
 * 
 * dt = DataTransfer
 * 
 * Return Boolean = true if supported, else false
 */
function checkDragType (dt) {
  let isSupported = false;

  // When the dragged element is one of our bookmarks its dt.types will be
  //   dt.types        : application/x-bookmark,[text/uri-list,]text/plain
  // When it is a tab, it will be
  //   dt.types        : text/x-moz-text-internal
  // When it is the (i) in the location bar
  //   dt.types        : text/x-moz-url,text/uri-list,text/plain,text/html
  // When it is a link in the HTML page:
  //   dt.types        : text/x-moz-url,text/x-moz-url-data,text/x-moz-url-desc,text/uri-list,text/_moz_htmlcontext,text/_moz_htmlinfo,text/html,text/plain
  // When it ia a selected text in HTML page:
  //   dt.types        : text/_moz_htmlcontext,text/_moz_htmlinfo,text/html,text/plain
  if (dt.types.includes("application/x-bookmark")
	  || dt.types.includes("text/x-moz-text-internal")
	  || dt.types.includes("text/uri-list")
	 ) {
	isSupported = true;
  }

  return(isSupported);
}

/*
 * Get row from the current target
 * 
 * target = object under mouse cursor
 * 
 * Return HTMLTableRowElement
 * Also sets the global variables bkmkitem_x to the piece to highlight for insertion
 * and the Booleans isBkmkitem_f and isFolderClosed
 */
let bkmkitem_x;
let isBkmkitem_f;
let isFolderClosed;
let isProtected;
function getDragToRow (target) {
  let classList = target.classList;
  let className = target.className;
  let row;

  if (classList == undefined) { // Apparently drag enter events can be on the text inside Span..
	row = (bkmkitem_x = target.parentElement.parentElement).parentElement.parentElement;
	isProtected = (row.dataset.protect == "true");
	isBkmkitem_f = (row.dataset.type == "folder");
	if (isBkmkitem_f) {
      if (bkmkitem_x.previousElementSibling.classList.contains("twistieac"))
		isFolderClosed = true;
	  else   isFolderClosed = false;
	}
  }
  else if (className.includes("fav")) {
	row = (bkmkitem_x = target.parentElement).parentElement.parentElement;
	isProtected = (row.dataset.protect == "true");
	isBkmkitem_f = (row.dataset.type == "folder");
	if (isBkmkitem_f) {
	  if (bkmkitem_x.previousElementSibling.classList.contains("twistieac"))
		isFolderClosed = true;
	  else   isFolderClosed = false;
	}
  }
  else if (classList.contains("bkmkitem_f")) {
	row = (bkmkitem_x = target).parentElement.parentElement;
	isProtected = (row.dataset.protect == "true");
	isBkmkitem_f = true;
    if (bkmkitem_x.previousElementSibling.classList.contains("twistieac"))
	  isFolderClosed = true;
	else   isFolderClosed = false;
  }
  else if (className.startsWith("bkmkitem_")) {
	row = (bkmkitem_x = target).parentElement.parentElement;
	isProtected = (row.dataset.protect == "true");
	isBkmkitem_f = false;
  }
  else if (className.startsWith("twistie")) {
	row = target.parentElement.parentElement;
	isProtected = (row.dataset.protect == "true");
	bkmkitem_x = target.nextElementSibling;
	isBkmkitem_f = true;
    if (classList.contains("twistieac"))
	  isFolderClosed = true;
	else   isFolderClosed = false;
  }
  else if (className.includes("brow")) {
	row = target.parentElement;
	isProtected = (row.dataset.protect == "true");
	bkmkitem_x = target.firstElementChild;
	if (bkmkitem_x.className.startsWith("twistie")) {
      if (bkmkitem_x.classList.contains("twistieac"))
  	    isFolderClosed = true;
  	  else   isFolderClosed = false;
      bkmkitem_x = bkmkitem_x.nextElementSibling;
      isBkmkitem_f = true;
	}
	else   isBkmkitem_f = false;
  }

//  trace("className: "+className+" isBkmkitem_f: "+isBkmkitem_f);
  return(row);
}

/*
 * Function to handle a timeout on dragging over a closed folder, to open it 
 */
let openFolderTimerID = null;
function openFolderTimeoutHandler () {
  openFolderTimerID = null;
//  trace("Open folder event");
  // Fire event on bkmkitem_x
  let event = new MouseEvent ("click",
		                      {view: window,
	                           bubbles: true,
	                           cancelable: true
	                          }
  );
  let ret = bkmkitem_x.dispatchEvent(event);
//  trace("ret: "+ret);
}

/*
 * Highlight the insert point on bkmkitem_x
 * 
 * e = DragEvent
 * 
 * Return -1, 0 or +1 to indicate if before, on or after bkmkitem_x
 * Also activates a timer so that when staying on a closed folder for more than 1s, then
 * we open it.
 */
let prevBkmkitem_x = null;
let prevInsertPos = undefined;
function highlightInsert (e) {
  let bkmkRect = bkmkitem_x.getBoundingClientRect();
  let style;
//  trace("x: "+bkmkRect.x+" y: "+bkmkRect.y+" left: "+bkmkRect.left+" top: "+bkmkRect.top+" right: "+bkmkRect.right+" bottom: "+bkmkRect.bottom+" width: "+bkmkRect.width+" height: "+bkmkRect.height)
//  trace("clientX: "+e.clientX+" clientY: "+e.clientY+" offsetX: "+e.offsetX+" offsetY: "+e.offsetY+" pageX: "+e.pageX+" pageY: "+e.pageY+" screenX: "+e.screenX+" screenY: "+e.screenY)
  let insertPos;
  let y = e.clientY; 

  if (isBkmkitem_f) { // We can drop inside a folder
	if (!isProtected            // Cannot insert before or after a protected (= top) folder
	    && (y <= bkmkRect.top + bkmkRect.height / 4)) {
      if (openFolderTimerID != null) { // Cancel timeout
		clearTimeout(openFolderTimerID);
		openFolderTimerID = null;
	  }
      insertPos = -1;
      // If changed from previous, update style (avoid to overload for nothing ..)
      if ((prevBkmkitem_x != bkmkitem_x) || (prevInsertPos != insertPos)) {
    	style = (prevBkmkitem_x = bkmkitem_x).style;
    	prevInsertPos = insertPos;
        style.borderTop = "1px solid #0065B7";
//        style.borderTop = "1px solid #7BC3FF";
        style.background = "";
        style.borderBottomWidth = "0";
      }
	}
	else if (!isProtected            // Cannot insert before or after a protected (= top) folder 
	         && (y >= bkmkRect.bottom - bkmkRect.height / 4)) {
	  if (openFolderTimerID != null) { // Cancel timeout
		clearTimeout(openFolderTimerID);
		openFolderTimerID = null;
	  }
      insertPos = 1;
      // If changed from previous, update style (avoid to overload for nothing ..)
      if ((prevBkmkitem_x != bkmkitem_x) || (prevInsertPos != insertPos)) {
    	style = (prevBkmkitem_x = bkmkitem_x).style;
    	prevInsertPos = insertPos;
        style.borderTopWidth = "0";
        style.background = "";
        style.borderBottom = "1px solid #0065B7";
//        style.borderBottom = "1px solid #7BC3FF";
      }
	}
	else {
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
      insertPos = 0;
      // If changed from previous, update style (avoid to overload for nothing ..)
      if ((prevBkmkitem_x != bkmkitem_x) || (prevInsertPos != insertPos)) {
    	style = (prevBkmkitem_x = bkmkitem_x).style;
    	prevInsertPos = insertPos;
        style.borderTopWidth = "0";
        style.background = "#CDE8FF";
        style.borderBottomWidth = "0";
      }
	}
  }
  else {
	if (openFolderTimerID != null) { // Cancel timeout
      clearTimeout(openFolderTimerID);
	  openFolderTimerID = null;
	}
	if (y <= bkmkRect.top + bkmkRect.height / 2) {
      insertPos = -1;
      // If changed from previous, update style (avoid to overload for nothing ..)
      if ((prevBkmkitem_x != bkmkitem_x) || (prevInsertPos != insertPos)) {
    	style = (prevBkmkitem_x = bkmkitem_x).style;
    	prevInsertPos = insertPos;
        style.borderTop = "1px solid #0065B7";
//        style.borderTop = "1px solid #7BC3FF";
        style.borderBottomWidth = "0";
      }
	}
	else {
	  insertPos = 1;
      // If changed from previous, update style (avoid to overload for nothing ..)
      if ((prevBkmkitem_x != bkmkitem_x) || (prevInsertPos != insertPos)) {
    	style = (prevBkmkitem_x = bkmkitem_x).style;
    	prevInsertPos = insertPos;
        style.borderTopWidth = "0";
        style.borderBottom = "1px solid #0065B7";
//        style.borderBottom = "1px solid #7BC3FF"; //
      }
	}
  }
//  trace("insertPos: "+insertPos);
  return(insertPos);
}

/*
 * Remove insert point on bkmkitem_x
 * 
 * e = DragEvent
 * 
 * Cancels any folder closed timer
 */
function highlightRemove (e) {
  if (openFolderTimerID != null) { // Cancel timeout
	clearTimeout(openFolderTimerID);
	openFolderTimerID = null;
  }

  // No more previous values
  prevBkmkitem_x = null;
  prevInsertPos = undefined;

  // Reset style
  let style = bkmkitem_x.style;
  style.borderTopWidth = "0";
  style.background = "";
  style.borderBottomWidth = "0";
}

/*
 * Drag enter event handler
 * 
 * e = DragEvent
 */
function bkmkDragEnterHandler (e) {
  let target = e.target;
  let dt = e.dataTransfer;
//  trace("Drag enter event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
  if (checkDragType(dt)
	  && ((target.className == undefined)  // When on Text, className and classList are undefined.
	      || (target.className.length > 0) // For some reason, when the mouse is over the lifts,
	                                       // an HTMLDivElement is returned which is none of what
	                                       // is inside BookmarksTree :-(
	     )
	 ) {
    // Get the enclosing row and bkmkitem_x inside it which we will highlight
    let row = getDragToRow(target);
//    trace("Enter row: "+row+" class: "+row.classList+" BN_id: "+row.dataset.id);
//    trace("Bkmkitem_x: "+bkmkitem_x+" class: "+bkmkitem_x.classList);
    let index = row.rowIndex;
    if ((index >= noDropMinRowIndex) && (index <= noDropMaxRowIndex)
    	|| (isProtected && !isBkmkitem_f) // Protection, can't drop on non top draggable elements = specials
       ) {
      dt.dropEffect = "none"; // Signal drop not allowed
    }
    else {
      e.preventDefault(); // Allow drop
      highlightInsert(e);
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
//  trace("Drag over event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
  if (checkDragType(dt)
	  && ((target.className == undefined)  // When on Text, className and classList are undefined.
	      || (target.className.length > 0) // For some reason, when the mouse is over the lifts,
	                                       // an HTMLDivElement is returned which is none of what
	                                       // is inside BookmarksTree :-(
	     )
	 ) {
    // Get the enclosing row
    let row = getDragToRow(target);
//    trace("Over row: "+row+" class: "+row.classList+" BN_id: "+row.dataset.id);
//    trace("Bkmkitem_x: "+bkmkitem_x+" class: "+bkmkitem_x.classList);
    let index = row.rowIndex;
    if ((index >= noDropMinRowIndex) && (index <= noDropMaxRowIndex)
       	|| (isProtected && !isBkmkitem_f) // Protection, can't drop on non top draggable elements = specials
       ) {
      dt.dropEffect = "none"; // Signal drop not allowed
    }
    else {
      e.preventDefault(); // Allow drop
      highlightInsert(e);
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
//  trace("Drag leave event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
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
//    trace("Leave row: "+row+" class: "+row.classList+" BN_id: "+row.dataset.id);
    let index = row.rowIndex;
    if (((index < noDropMinRowIndex) || (index > noDropMaxRowIndex))
        && (!isProtected || isBkmkitem_f) // Protection, can't drop on non top draggable elements = specials
       ) {
	  highlightRemove(e);
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
//  trace("Drag exit event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
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
//    trace("Exit row: "+row+" class: "+row.classList+" BN_id: "+row.dataset.id);
    let index = row.rowIndex;
    if (((index < noDropMinRowIndex) || (index > noDropMaxRowIndex))
        && (!isProtected || isBkmkitem_f) // Protection, can't drop on non top draggable elements = specials
       ) {
      highlightRemove(e);
    }
  }
}

/*
 * Drag drop event handler
 * 
 * e = DragEvent
 */
function bkmkDropHandler (e) {
  let target = e.target;
  let dt = e.dataTransfer;
//  trace("Drag drop event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
/*  trace("dt.dropEffect   : "+dt.dropEffect);
  trace("dt.effectAllowed: "+dt.effectAllowed);
  trace("dt.items        : "+dt.items);
  trace("dt.types        : "+dt.types);
*/
  if (checkDragType(dt)
	  && ((target.className == undefined)  // When on Text, className and classList are undefined.
	      || (target.className.length > 0) // For some reason, when the mouse is over the lifts,
	                                       // an HTMLDivElement is returned which is none of what
	                                       // is inside BookmarksTree :-(
	     )
	 ) {
    // Get the enclosing row
    let row = getDragToRow(target);
//    trace("Drop on row: "+row+" class: "+row.classList+" BN_id: "+row.dataset.id);

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
	  //   dt.types        : application/x-bookmark,[text/uri-list,]text/plain
	  // When it is a tab, it will be
	  //   dt.types        : text/x-moz-text-internal
	  // When it is a link in the HTML page:
	  //   dt.types        : text/x-moz-url,text/x-moz-url-data,text/x-moz-url-desc,text/uri-list,text/_moz_htmlcontext,text/_moz_htmlinfo,text/html,text/plain
	  let data;
	  if (dt.types.includes("application/x-bookmark")) {
	    data = dt.getData("application/x-bookmark");
	  }
	  else if (dt.types.includes("text/x-moz-text-internal")) {
	    data = dt.getData("text/x-moz-text-internal");
	  }
	  else if (dt.types.includes("text/uri-list")) {
	    data = dt.getData("text/uri-list");
	  }

/*	    let dataType = Object.prototype.toString.call(data).slice(8, -1);
	  trace("InsertPos: "+insertPos);
	  trace("Items dataType : "+dataType);
	  trace("Items data     : "+data);
	  trace("Items length   : "+dt.items.length);
	  for (let i=0 ; i<dt.items.length; i++) {
	    trace("... items["+i+"].kind = "+dt.items[i].kind + "; type = "+dt.items[i].type);
	  }
	  trace("Types length   : "+dt.types.length);
	  for (let i=0 ; i<dt.types.length; i++) {
	    let type = dt.types[i];
	    trace("... types["+i+"] = "+type);
	    data = dt.getData(type);
	    trace("... data["+type+"] = <<"+data+">>");
	  }
*/

	  if (dt.types.includes("application/x-bookmark")) { // Move the dragged bookmark
	   	if (insertPos == 0) { // Drop to a folder, add at end
	      browser.bookmarks.move(rowDragged.dataset.id,
		                         {parentId: BN_id
		                         }
	      );
	    }
	    else if (insertPos == -1) { // Move just before target row
	      // Do nothing if we insert just after rowDragged and same parent == no move !
	      if ((index != rowDragged.rowIndex+1)
	    	  || (BNDragged.parentId != BN.parentId)) {
	    	// Be careful (not documented ...), if the bookmark is moved after itself
	    	// under the same parent, the insertion index is to be numbered without it
	    	// => decrease target index by 1 (basically, the index is used after delete ..)
	    	let adjust = 0;
	    	let bnIndex = BN_getIndex(BN);
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
    	else { // Move just after target row
    	  // Do nothing if we insert just before rowDragged and same parent == no move !
    	  if ((index != rowDragged.rowIndex-1)
    		  || (BNDragged.parentId != BN.parentId)) {
    		// Be careful (not documented ...), if the bookmark is moved after itself
    		// under the same parent, the insertion index is to be numbered without it
    		// => decrease target index by 1 (basically, the index is used after delete ..)
    		let adjust = 0;
	    	let bnIndex = BN_getIndex(BN);
    		if ((BNDragged.parentId == BN.parentId) // Same parent, so moving inside parent
	    		&& (BN_getIndex(BNDragged) < bnIndex)
	    	   ) {
	    	  adjust = -1;
	    	}
	    	browser.bookmarks.move(rowDragged.dataset.id,
	    		                   {parentId: BN.parentId,
	    	                        index: bnIndex+1 + adjust
	    		                   }
	    	);
	      }
	    }
	  }
	  else if (dt.types.includes("text/x-moz-text-internal")) { // Dragging a tab to us
	    let url = dt.getData("text/x-moz-text-internal");
        // Bug in browser.tabs.query() !
	    // When there is a # in the url, it finds the open tab but returns an empty array :-(
	    // So lets remove the # part ..
	    let posDash = url.indexOf("#");
	    if (posDash != -1) {
	      url = url.slice(0, posDash);
	    }
//	      trace("Query tab for url: "+url)
	    // Get tab corresponding to url
	    browser.tabs.query({windowId: myWindowId, url: url})
	    .then (
	      function (a_tabs) {
//            trace("tabs length: "+a_tabs.length);
	       	let droppedTab = a_tabs[0]; // One URL => 1 tab, or only take first one
	       	                            // if multiple matches
	       	// Create new bookmark at insertion point
	       	uglyHackTabFavIconUrl = droppedTab.favIconUrl;
	       	let title = droppedTab.title;
	       	let url = droppedTab.url;
		   	if (insertPos == 0) { // Drop to a folder, add at end
		      if (BeforeFF57) {
		   	    browser.bookmarks.create(
				  {parentId: BN_id,
				   title: title,
				   url: url
				  }
			    );
		      }
		      else {
		        browser.bookmarks.create(
				  {parentId: BN_id,
				   title: title,
				   type: "bookmark",
				   url: url
				  }
			    );
		      }
			}
			else {
			  let index = BN_getIndex(BN);
			  if (insertPos == 1) { // Create just after target row
			   	index++;
			  }
		      if (BeforeFF57) {
			    browser.bookmarks.create(
				  {index: index,
				   parentId: BN.parentId,
				   title: title,
				   url: url
				  }
			    );
		      }
		      else {
			    browser.bookmarks.create(
			   	  {index: index,
				   parentId: BN.parentId,
				   title: title,
				   type: "bookmark",
				   url: url
				  }
			    );
		      }
			}
		  }
	    );
	  }
	  else if (dt.types.includes("text/uri-list")) { // Dragging a page link to us
	    let url = dt.getData("text/uri-list");
	    let title = dt.getData("text/x-moz-url-desc");
	    if (title.length == 0) {
	      title = dt.getData("text/x-moz-url");
	      if (title.length == 0) {
	    	title = url;
	      }
	      else {
	    	let splitIndex = title.indexOf("\n");
	    	title = title.slice(splitIndex+1);
	      }
	    }

	    // Create new bookmark at insertion point
	   	if (insertPos == 0) { // Drop to a folder, add at end
	      if (BeforeFF57) {
	   	    browser.bookmarks.create(
  			  {parentId: BN_id,
  			   title: title,
  			   url: url
  			  }
  		    )
  		    .then(createBookmark);
	      }
	      else {
	        browser.bookmarks.create(
			  {parentId: BN_id,
			   title: title,
			   type: "bookmark",
			   url: url
			  }
		    )
		    .then(createBookmark);
	      }
		}
		else {
	      let index = BN_getIndex(BN);
	      if (insertPos == 1) { // Create just after target row
		   	index++;
		  }
	      if (BeforeFF57) {
		    browser.bookmarks.create(
			  {index: index,
			   parentId: BN.parentId,
			   title: title,
			   url: url
			  }
		    )
		    .then(createBookmark);
	      }
	      else {
		    browser.bookmarks.create(
			  {index: index,
			   parentId: BN.parentId,
			   title: title,
			   type: "bookmark",
			   url: url
			  }
		    )
		    .then(createBookmark);
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
 * recurLevel (optional, default 0) = relative resursion level to initial paste - used to detect
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
    // If index is undefined, wwe are pasting into a folder => at end
    let creating;
    let type = BN.type;
    let url = BN.url;
    if (index == undefined) {
      // Create BTN at end of parent folder
      if (BeforeFF57) {
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
      if (BeforeFF57) {
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
//        let t2 = new Date();
//        trace(t2.getTime()+" Paste node creation delay: "+(t2.getTime() - t1.getTime()));
        let children = BN.children;
        if ((children != undefined) && (children.length > 0)) { // There are children ...
    	  stackBN.push(BN); // Remember it for when we go up from depth first exploration
    	  stackNewBN.push(newParentBN);
          stackIndex.push(index);
          let newBN = curBNList[newBTN.id]; // We are supposing the creation cycle was complete
                                            // and a BN was created for this new node
          if (newBN == undefined)
        	deadbeef = null; // Scream if not !!
          pasteBkmk(children[0], newBN, 0, recurLevel+1);
        }
        else if (recurLevel > 0) { // There can be siblings at that recursion level
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
function getRowIndex (item) {
  let menu;
/*  let targetObjectType = Object.prototype.toString.call(item).slice(8, -1);
  if (targetObjectType == "HTMLElement") { // this is a <b>
	menu = item.parentElement.parentElement;
  }
  else { // This is a <div>
*/
	menu = item.parentElement;
/*  }
 */
  return(parseInt(menu.dataset.index, 10));
}

/*
 * Retrieve row for an action in a context menu
 * 
 * item is an HTMLDivElement or and HTMLElement (<b>) in a menu
 * 
 * Returns the row in context
 */
function getRow (item) {
  let menu;
/*  let targetObjectType = Object.prototype.toString.call(item).slice(8, -1);
  if (targetObjectType == "HTMLElement") { // this is a <b>
	menu = item.parentElement.parentElement;
  }
  else { // This is a <div>
*/
	menu = item.parentElement;
/*  }
*/
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
 * Upon Bookmark creation menu event, open Window to let the user enter values in fields
 * 
 * BTN is of type BookmarkTreeNode (promise from browser.bookmarks.create())
 */
function createBookmark (BTN) {
//  let popupURL = browser.extension.getURL("sidebar/popup.html");
  // Did not find a good way to get a modal dialog so far :-(
  // 1) let sign = prompt("What's your sign?");
  //    creates a modal inside the sidebar, half hidden if the sidebar is not large enough. 
  // 2) It appears window.open works outside of the .then, but not inside !!
  //    I do not understand why ..
  //    Anyway, "modal" is ignored, and I can't figure how to get
  //    the UniversalBrowserWrite privilege so far .. :-(
  //    window.open(popupURL, "_blank", "dialog,modal,height=200,width=200");
  // So using browser.windows instead, which is not modal, and which is resizeable.
  // Truncate title to just before "?" if it has one
  let title = BTN.title;
  let paramPos = title.indexOf("?");
  if (paramPos != -1) {
	title = title.slice(0, paramPos);
  }
  let url = PopupURL+"?type=newbkmk&id="+BTN.id+"&title="+title+"&url="+BTN.url;
  url = encodeURI(url);
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
  		popuptop_option: top,
  		popupleft_option: left
  	  });
  	}
  	  
    browser.windows.create(
      {titlePreface: "New bookmark",
	   type: "popup",
//	   type: "detached_panel",
	   // Using a trick with URL parameters to tell the window which type
       // it is, which bookmark id, .. etc .. since titlePreface doesn't appear to work
	   // and there appears to be no way to pass parameters to the popup by the call. 
	   url: url,
//----- Workaround for top and left position parameters being ignored for panels -----
// Cf. https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/windows/create
// Make the start size as small as possible so that it briefly flashes in its initial
// position in the least conspicuous way.
// Note: 1,1 does not work, this sets the window in a state reduced to the bar, and no
// internal resize seems to work after that.
// Also tried to start minimized, but the window pops in a big size first before being minimized,
// even les pretty.			   .
// => .. FF does not seem very clean on all this .. :-( 
//       height: PopupHeight,
//	     width: PopupWidth
	   height: 40,
	   width: 40,
//	     left: left,
//		 top: top,
//----- End of position ignored workaround -----
	   allowScriptsToClose: true
	  }
    );
  });

  // Don't call refresh search, it is already called through bkmkCreatedHandler
}

/*
 * Upon Folder creation menu event, open Window to let the user enter values in fields
 * 
 * BTN is of type BookmarkTreeNode (promise from browser.bookmarks.create())
 */
function createFolder (BTN) {
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
  		popuptop_option: top,
  		popupleft_option: left
  	  });
  	}
	  	  
    browser.windows.create(
      {titlePreface: "New folder",
	   type: "popup",
//	     type: "detached_panel",
	   // Using a trick with URL parameters to tell the window which type
       // it is, which bookmark id, .. etc .. since titlePreface doesn't appear to work
	   // and there appears to be no way to pass parameters to the popup by the call. 
	   url: PopupURL+"?type=newfldr&id="+BTN.id+"&title="+BTN.title,
//----- Workaround for top and left position parameters being ignored for panels -----
// Cf. https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/windows/create
// Make the start size as small as possible so that it briefly flashes in its initial
// position in the least conspicuous way.
// Note: 1,1 does not work, this sets the window in a state reduced to the bar, and no
// internal resize seems to work after that.
// Also tried to start minimized, but the window pops in a big size first before being minimized,
// even les pretty.			   .
// => .. FF does not seem very clean on all this .. :-( 
//	     height: PopupHeight,
//	     width: PopupWidth
	   height: 40,
	   width: 40,
//		 left: left,
//		 top: top,
//----- End of position ignored workaround -----
	   allowScriptsToClose: true
	  }
    );
  });

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
//  trace("Key event: "+e.type+" key: "+e.key+" char: "+e.char+" target: "+target);

  if (e.key == "Escape") {
	// Clear any menu when Esc is pressed
	let menuClosed = clearMenu();

	// Clear searchbox input and any search result when Esc is pressed within it
	if (((target.id == "searchtext") || !menuClosed)
	    && (SearchTextInput.value.length > 0)) {
	  clearSearchTextHandler();
	}
  }
//  else {
//	SearchTextInput.focus(); // Focus on search box when a key is typed ...
//  }
}

/*
 * Receive event from clicks anywhere in the sidebar panel, and also handle
 * menu actions
 * 
 * e is of type MouseEvent (click, but apparently works also with right and aux clicks .. 
 *   still saying "click" .. wonder why .. => filtering this out)
 */
function clickHandler (e) {
  let target = e.target; // Type depends ..
  let classList = target.classList;
//  trace("General click event: "+e.type+" button: "+e.button+" target: "+target+" class: "+target.classList);

  if (!classList.contains("menudisabled")) { // Click on a disabled menu element
	                                         // won't have any action
	                                         // and won't make the menu disappear
	let menuAction = false;  
    // If a menu action is clicked, handle it
	if (classList.contains("menushow")) { // Show source item in bookmarks table
		                                  // This can only happen in the results table
	  // Retrieve parent context menu, and the rowIndex on which it is
	  menuAction = true;
	  let row = getRow(target);
      // Make the source object visible .. and scroll to it
	  handleResultClick(row);

	  // If close search option is set, close search pane now
	  if (closeSearch_option) {
	    clearSearchTextHandler();
	  }
	}
	else if (classList.contains("menuopen")) { // Open bookmark in active tab
	  // Retrieve parent context menu, and the rowIndex on which it is
	  menuAction = true;
	  let row = getRow(target);
	  // Get anchor href
      let href = row.firstElementChild.firstElementChild.href;
	  if ((href != undefined) && (href.length > 0)) {
	    browser.tabs.update({url: href});
	  }
	}
	else if (classList.contains("menuopentab")) { // Open bookmark in a new tab
	  // Retrieve parent context menu, and the rowIndex on which it is
	  menuAction = true;
	  let row = getRow(target);
	  // Get anchor href
	  let href = row.firstElementChild.firstElementChild.href;
	  if ((href != undefined) && (href.length > 0)) {
		// Get current active tab as opener id to come back to it when closing the new tab
        browser.tabs.query({windowId: myWindowId, active: true})
        .then (
          function (a_tabs) {
        	if (BeforeFF57)
  		      browser.tabs.create({url: href});
        	else
		      browser.tabs.create({url: href, openerTabId: a_tabs[0].id});
		  }
        );
	  }
	}
	else if (classList.contains("menuopenwin")) { // Open bookmark in a new Window
	  // Retrieve parent context menu, and the rowIndex on which it is
	  menuAction = true;
	  let row = getRow(target);
	  // Get anchor href
	  let href = row.firstElementChild.firstElementChild.href;
	  if ((href != undefined) && (href.length > 0)) {
		// The second method disables any sidebar as it seems ... so can't use it
	    browser.windows.create({url: href});
//		window.open(href, "_blank", "menubar,toolbar,location,scrollbars");
	  }
	}
	else if (classList.contains("menuopenpriv")) { // Open bookmark in a new private Window
	  // Retrieve parent context menu, and the rowIndex on which it is
	  menuAction = true;
	  let row = getRow(target);
	  // Get anchor href
	  let href = row.firstElementChild.firstElementChild.href;
	  if ((href != undefined) && (href.length > 0)) {
	    browser.windows.create({url: href, incognito: true});
	  }
	}
	else if (classList.contains("menuopentree")) { // Open parent(s) of selected .reshidden row
	  // Retrieve parent context menu, and the rowIndex on which it is
	  menuAction = true;
	  let row = getRow(target);
	  openResParents(row);
	}
	else if (classList.contains("menunewb")) { // Create a new bookmark
	  // Can only be on bookmarks table row
	  menuAction = true;
	  let rowIndex = getRowIndex(target);
	  let row = bookmarksTable.rows[rowIndex];
	  // Retrieve bookmark item in that row
	  let BN_id = row.dataset.id;
	  let type = row.dataset.type;
	  let BN = curBNList[BN_id];

	  // Create new bookmark just before if this is a separator or a bookmark,
	  // or append inside if this is a folder.
	  if (type == "folder") {
        if (BeforeFF57) {
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
		    {parentId: BN_id,
		     title: "New bookmark",
		     type: "bookmark",
		     url: "about:blank"
		    }
		  )
		  .then(createBookmark);
	    }
	  }
	  else {
	    if (BeforeFF57) {
	      browser.bookmarks.create(
  		    {index: BN_getIndex(BN),
  		     parentId: BN.parentId,
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
		     type: "bookmark",
		     url: "about:blank"
		    }
		  )
		  .then(createBookmark);
	    }
	  }
	}
	else if (classList.contains("menunewf")) { // Create a new folder
	  // Can only be on bookmarks table row
	  menuAction = true;
	  let rowIndex = getRowIndex(target);
	  let row = bookmarksTable.rows[rowIndex];
	  // Retrieve bookmark item in that row
	  let BN_id = row.dataset.id;
	  let type = row.dataset.type;
	  let BN = curBNList[BN_id];

	  // Create new folder just before if this is a separator or a bookmark,
	  // or append inside if this is a folder.
	  if (type == "folder") {
	    if (BeforeFF57) {
	      browser.bookmarks.create(
		    {parentId: BN_id,
		     title: "New folder"
		    }
	      )
	      .then(createFolder);
	    }
	    else {
	      browser.bookmarks.create(
		    {parentId: BN_id,
		     title: "New folder",
		     type: "folder"
		    }
	      )
	      .then(createFolder);
	    }
	  }
	  else {
	    if (BeforeFF57) {
	      browser.bookmarks.create(
		    {index: BN_getIndex(BN),
		     parentId: BN.parentId,
		     title: "New folder"
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
	  }
	}
	else if (classList.contains("menunews")) { // Create a new separator
	  // Can only be on bookmarks table row
	  menuAction = true;
	  let rowIndex = getRowIndex(target);
	  let row = bookmarksTable.rows[rowIndex];
	  // Retrieve bookmark item in that row
	  let BN_id = row.dataset.id;
	  let type = row.dataset.type;
	  let BN = curBNList[BN_id];

	  // Create new separator just before if this is a separator or a bookmark,
	  // or append inside if this is a folder.
	  if (type == "folder") {
		if (BeforeFF57) {
		  let msg = "Creating separators is not supported in WebExtension API before FF 57 !"; 
		  trace(msg);
	      console.log(msg);
		}
		else {
	      browser.bookmarks.create(
		    {parentId: BN_id,
		     type: "separator"
		    }
	      );
		}
	  }
	  else {
		if (BeforeFF57) {
		  let msg = "Creating separators is not supported in WebExtension API before FF 57 !"; 
		  trace(msg);
	      console.log(msg);
		}
		else {
	      browser.bookmarks.create(
		    {index: BN_getIndex(BN),
		     parentId: BN.parentId,
		     type: "separator"
		    }
	      );
		}
	  }
	}
	else if (classList.contains("menucut")) { // Cut a bookmark item into bkmkClipboard
	  // Can only happen on bookmarks table row, retrieve the rowIndex from the menu
	  menuAction = true;
	  let rowIndex = getRowIndex(target);
	  let row = bookmarksTable.rows[rowIndex];
	  // Retrieve bookmark item in that row and its contents
	  let BN_id = row.dataset.id;
	  bkmkClipboard = curBNList[BN_id]; // We are going to move, so clip the real one

	  if (rowClipboard != undefined) {
		rowClipboard.classList.remove("cut");
	  }
	  rowClipboard = row;
	  // Just dim the row being cut, do not remove it now
	  // browser.bookmarks.removeTree(BN_id);
	  rowClipboard.classList.add("cut");
/*	    trace("clipboard: "+bkmkClipboard.id+" "+bkmkClipboard.title+" "+bkmkClipboard.type+" "+bkmkClipboard.index+" "+bkmkClipboard.children+" "+bkmkClipboard.url);
	  if (bkmkClipboard.children != undefined)
		for (let i of bkmkClipboard.children) {
		  trace("clipboard: "+i.id+" "+i.title+" "+i.type+" "+i.index+" "+i.children+" "+i.url);
		}
*/
	  if (bkmkClipboard.type == "folder") { // If folder, set the no paste zone
	  	noPasteMinRowIndex = rowIndex;
		// Find last child / grand child of bkmkClipboard (itself if no child)
		let lastBN = BN_lastDescendant(bkmkClipboard);
		row = curRowList[lastBN.id];
		noPasteMaxRowIndex = row.rowIndex; // Can be at end of bookmarks table
	  }
	  else {
		noPasteMinRowIndex = noPasteMaxRowIndex = -1;
	  }
	}
	else if (classList.contains("menucopy")) { // Copy a bookmark item into bkmkClipboard
	  // Can only happen on bookmarks table row, retrieve the rowIndex from the menu
	  menuAction = true;
	  let rowIndex = getRowIndex(target);
	  let row = bookmarksTable.rows[rowIndex];
	  // Retrieve bookmark item in that row and its contents
	  let BN_id = row.dataset.id;
	  bkmkClipboard = BN_copy(curBNList[BN_id]); // Get a copy ! Let's not reinject the node itself

	  if (rowClipboard != undefined) {
		rowClipboard.classList.remove("cut");
		noPasteMinRowIndex = noPasteMaxRowIndex = -1;
	  }
	  rowClipboard = undefined; // Not a cut
	}
	else if (classList.contains("menupaste")) { // Paste bkmkClipboard contents before the row
		                                        // Clear bkmkClipboard after that, as we want
		                                        // to paste only once.
	  // Can only happen on bookmarks table row, retrieve the rowIndex from the menu
	  menuAction = true;
	  let rowIndex = getRowIndex(target);
	  let row = bookmarksTable.rows[rowIndex];
	  // Retrieve bookmark item in that row
	  let BN_id = row.dataset.id;
	  let BN = curBNList[BN_id];

	  // Retrieve parent of that bookmark item as we have to insert just before that BN
	  let parentBN = curBNList[BN.parentId];

	  if (rowClipboard == undefined) {
	    // Paste clipboard contents at BN.index (then just before BN) under that parent
	    pasteBkmk(bkmkClipboard, parentBN, BN_getIndex(BN));
		bkmkClipboard = undefined; // Empty bkmkClipboard

		// Refresh search is handled thought bkmkCreatedHandler(), do not call it
	  }
	  else {
	    // Move clipboard contents at BN.index (then just before BN) under that parent
		rowClipboard.classList.remove("cut"); // In case it stays at the same place = no move
		noPasteMinRowIndex = noPasteMaxRowIndex = -1;
	    moveBkmk(bkmkClipboard, parentBN, BN_getIndex(BN));
	    bkmkClipboard = undefined; // Empty bkmkClipboard
	    rowClipboard = undefined;
	  }
	}
	else if (classList.contains("menupasteinto")) { // Paste bkmkClipboard contents in folder
                                                    // Clear bkmkClipboard after that, as we want
                                                    // to paste only once.
      // Can only happen on bookmarks table folder rows, retrieve the rowIndex from the menu
	  menuAction = true;
	  let rowIndex = getRowIndex(target);
      let row = bookmarksTable.rows[rowIndex];
      // Retrieve bookmark item in that row
      let BN_id = row.dataset.id;
      let folderBN = curBNList[BN_id];

	  if (rowClipboard == undefined) {
        // Paste clipboard contents at end of folder
        pasteBkmk(bkmkClipboard, folderBN);
        bkmkClipboard = undefined; // Empty bkmkClipboard

	    // Refresh search is handled thought bkmkCreatedHandler(), do not call it
	  }
	  else {
        // Move clipboard contents at end of folder
		rowClipboard.classList.remove("cut"); // In case it stays at the same place = no move
		noPasteMinRowIndex = noPasteMaxRowIndex = -1;
		moveBkmk(bkmkClipboard, folderBN);
		bkmkClipboard = undefined; // Empty bkmkClipboard
		rowClipboard = undefined;
	  }
    }
	else if (classList.contains("menudel")) { // Delete a bookmark item
	  // Can only happen on bookmarks table row, retrieve the rowIndex from the menu
	  menuAction = true;
	  let rowIndex = getRowIndex(target);
	  let row = bookmarksTable.rows[rowIndex];
	  // Delete bookmark item in that row
	  let BTN_id = row.dataset.id;
	  browser.bookmarks.removeTree(BTN_id);
	}
	else if (classList.contains("menurefreshfav")) { // Refresh favicon
      // Can only happen on bookmarks table bookmark row, retrieve the rowIndex from the menu
	  menuAction = true;
	  let rowIndex = getRowIndex(target);
	  let row = bookmarksTable.rows[rowIndex];
	  // Refresh favicon of that bookmark item
	  let BN_id = row.dataset.id;
	  let BN = curBNList[BN_id];

      // Trigger asynchronous favicon retrieval process
      let url = BN.url;
      if ((url != undefined)
       	  && !url.startsWith("about:")) { // about: is protected - security error ..
       	// This is a bookmark, so here no need for cloneBN(), there is no tree below
//        faviconWorker.postMessage(["get2", BN_id, url, true]);
    	let postMsg = ["get2", BN_id, url, true];
    	if (backgroundPage == undefined) {
    	  sendAddonMsgGetFavicon(postMsg);
    	}
    	else {
    	  backgroundPage.faviconWorkerPostMessage({data: postMsg});
    	}
      }
	}
	else if (classList.contains("menuprop")) { // Edit properties of an existing bookmark
	  // Can only be on bookmarks table row
	  menuAction = true;
	  let rowIndex = getRowIndex(target);
	  let row = bookmarksTable.rows[rowIndex];
	  // Retrieve bookmark item in that row
	  let BN_id = row.dataset.id;
	  let type = row.dataset.type;
	  let BN = curBNList[BN_id];

	  // Open popup on bookmark item
	  let url;
	  if (type == "folder") {
		url = PopupURL+"?type=propfldr&id="+BN_id+"&title="+BN.title;
	  }
	  else {
		url = PopupURL+"?type=propbkmk&id="+BN_id+"&title="+BN.title+"&url="+BN.url;
	  }
      url = encodeURI(url);
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
       		popuptop_option: top,
       		popupleft_option: left
       	  });
      	}
        	  
	    browser.windows.create(
	      {titlePreface: "Properties of « "+BN.title+" »",
		   type: "popup",
//			 type: "detached_panel",
		   // Using a trick with URL parameters to tell the window which type
		   // it is, which bookmark id, .. etc .. since titlePreface doesn't appear to work
		   // and there appears to be no way to pass parameters to the popup by the call. 
		   url: url,
//----- Workaround for top and left position parameters being ignored for panels -----
// Cf. https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/windows/create
// Make the start size as small as possible so that it briefly flashes in its initial
// position in the least conspicuous way.
// Note: 1,1 does not work, this sets the window in a state reduced to the bar, and no
// internal resize seems to work after that.
// Also tried to start minimized, but the window pops in a big size first before being minimized,
// even les pretty.			   .
// => .. FF does not seem very clean on all this .. :-( 
//           height: PopupHeight,
//           width: PopupWidth
		   height: 40,
		   width: 40,
//		     left: left,
//			 top: top,
//----- End of position ignored workaround -----
		   allowScriptsToClose: true
		  }
	    );
	  });
	}

    if ((e.button != 2) || menuAction || (classList == undefined) || (classList.length == 0)) {
      // Clear open menus on left or middle click, or on right click on (a menu action or outside
      // bookmarks or results).
      // Indeed, sometimes, the "click" Handler is called after the "context" Handler
      // instead of before :-( (in Linux at least)
      clearMenu();
    }
  }
}

/*
 * Prevent default context menus except in a few places
 */
function noDefaultAction (e) {
  let target = e.target; // Type depends ..
//  trace("noDefaultAction event: "+e.type+" button: "+e.button+" phase: "+e.eventPhase+" target: "+target+" class: "+target.classList);

  // Prevent default context menu except in the search box and in the trace box
  let targetObjectType = Object.prototype.toString.call(target).slice(8, -1);
  if ((targetObjectType != "HTMLInputElement")
      && (targetObjectType != "HTMLTextAreaElement")
     ) {
    e.preventDefault();
//    e.stopPropagation();
//    e.stopImmediatePropagation();
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
//    console.log("Background sent a response: <<"+msg+">> received in sidebar:"+myWindowId);
    if (msg == "getCurBNList") {
      curBNList = message.json;
      f_initializeNext();
    }
    else if (msg == "Ready") {
      backgroundReady = true; // Signal background ready for private windows for asking curBNList
      if (waitingInitBckgnd) { // We were waiting for it to continue
//    	console.log("Background is Ready 3");
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
//	  console.log("Got message <<"+msg+">> from "+request.source+" in "+myWindowId);
//      console.log("  sender.tab: "+sender.tab);
//    	console.log("  sender.frameId: "+sender.frameId);
//    	console.log("  sender.id: "+sender.id);
//    	console.log("  sender.url: "+sender.url);
//    	console.log("  sender.tlsChannelId: "+sender.tlsChannelId);

	  if (msg == "Ready") { // Background initialization is ready
		backgroundReady = true; // Signal background ready for private windows for asking curBNList
		if (waitingInitBckgnd) { // We were waiting for it to continue
//		  console.log("Background is Ready 2");
		  f_initializeNext();
		}
	  }
	  else if (msg.startsWith("savedOptions")) { // Option page changed something to options, reload them
		// Look at what changed
  	  	let enableCookies_option_old = enableCookies_option;
  	  	let enableFlipFlop_option_old = enableFlipFlop_option;
  	  	let advancedClick_option_old = advancedClick_option;
  	  	let closeSearch_option_old = closeSearch_option;
  	  	let openTree_option_old = openTree_option;
  	  	let traceEnabled_option_old = traceEnabled_option;

  	  	// Function to process option changes
  	  	function changedOptions () {
  	  	  // If trace option changed
  	  	  if (traceEnabled_option_old != traceEnabled_option) {
  	  		TracePlace.hidden = !traceEnabled_option;
  	  	  }
  	  	}

  	  	// Refresh options
  	  	if ((backgroundPage == undefined) || (backgroundPage.ready == undefined)) { // Load by ourselves
  	  	  refreshOptionsLStore()
  	  	  .then(changedOptions);
  	  	}
  	  	else { // Bacground page is accessible, all was loaded inside it, so get from there
  	  	  refreshOptionsBgnd(backgroundPage);
  	  	  changedOptions();
  	  	}
	  }
	  else if (msg.startsWith("resetSizes")) { // Option page reset sizes button was pressed
		// Reset of search pane height
		SearchResult.style.height = "";
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
//        trace("BN.id: "+bnId+" index: "+row.rowIndex+" Row id: "+row.dataset.id+" uri: "+uri);
		let img = row.firstElementChild.firstElementChild.firstElementChild;
		img.src = uri;

		// Call refresh search if there is one active to update any result with that BTN
		refreshFaviconSearch(bnId, uri);
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
	console.log("message:    "+error.message);
	console.log("lineNumber: "+error.lineNumber);
  }
}
/*
 * Fire when the sidebar is closed
 */
function closeHandler (e) {
//  console.log("Sidebar close: "+e.type);

  // Signal to background page we are going off
  if (backgroundPage != undefined) {
    backgroundPage.closeSidebar(myWindowId);
  }
  else {
	sendAddonMessage("Close:"+myWindowId);
  }
}

/*
 * Fire when we lose keyboard focus
 * Used to close any context menu when open
 */
function onBlur(aEvent) {
  clearMenu();
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
    for (let i of children) {
      await completeFavicons(i);
    }
	let t2 = new Date ();
	trace("Favicon display duration: "+(t2.getTime() - t1.getTime())+" ms", true);
  }
  else if ((BN.type == "folder") && ((children = BN.children) != undefined)) {
	// If there are children, recursively explore them
    for (let i of children) {
      await completeFavicons(i);
    }
  }
  else if (BN.type == "bookmark") {
    // Give a chance to other events every Bunch
/*	if (bunchCount-- <= 0) {
	  bunchCount = Bunch;
	  await sleep(0);
	}
*/
	if (++bunchCount > Bunch) {
	  // Impose a minimum count, and then
	  // give a chance to other events every Fluidity ms (40 ms = 25 times per second)
	  tt2 = Performance.now();
	  if (tt2 - tt1 >= Fluidity) {
//	    console.log("Number of iterations in 40 ms :"+bunchCount);
	    bunchCount = 0;
	    tt1 = tt2;
	    await sleep(0);
	  }
	}
		
	// Display the favicon
	let row = curRowList[BN.id];
	let img = row.firstElementChild.firstElementChild.firstElementChild;
	img.src = BN.faviconUri;
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
//    Bookmarks.appendChild(docFragment); // Display the table of bookmarks + reflow
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
  SearchResult.addEventListener("auxclick", resultsAuxHandler);
  Bookmarks.addEventListener("auxclick", bkmkAuxHandler);
  SearchResult.addEventListener("contextmenu", resultsContextHandler);
  Bookmarks.addEventListener("contextmenu", bkmkContextHandler);

  // General event handlers for a click anywhere in the document .. used to clear menus
  // and prevent default menus
  addEventListener("keyup", keyHandler);
  addEventListener("click", clickHandler);
  addEventListener("contextmenu", noDefaultAction);
  addEventListener("auxclick", noDefaultAction);
  window.addEventListener("blur", onBlur);

  // Detect when sidebar is closed
//  window.addEventListener("beforeunload", closeHandler);
//  window.addEventListener("pagehide", closeHandler);
  window.addEventListener("unload", closeHandler);
//  window.onclose = closeHandler;

  // Event handlers for drag & drop
  Bookmarks.addEventListener("dragstart", bkmkDragStartHandler);
  Bookmarks.addEventListener("dragend", bkmkDragEndHandler);
  Bookmarks.addEventListener("dragenter", bkmkDragEnterHandler);
  Bookmarks.addEventListener("dragover", bkmkDragOverHandler);
  Bookmarks.addEventListener("dragleave", bkmkDragLeaveHandler);
  Bookmarks.addEventListener("dragexit", bkmkDragExitHandler);
  Bookmarks.addEventListener("drop", bkmkDropHandler);

  let computedStyle = window.getComputedStyle(MyBProtMenu, null);
  trace("fontFamily = '"+computedStyle["fontFamily"]+"'", true);
  trace("fontSize   = '"+computedStyle["fontSize"]+"'", true);
//  for (let prop in computedStyle) {
//    trace(prop+" = '"+computedStyle[prop]+"'");
//  }

  // Signal to background page we are here
  if (backgroundPage == undefined) {
	sendAddonMessage("New:"+myWindowId);
  }
  else {
	// Trace stats
	trace("Stats:\r\n------", true);
	trace("Bookmarks:  "+countBookmarks, true);
	trace("Folders:    "+countFolders, true);
	trace("Separators: "+countSeparators, true);
	trace("Oddities:   "+countOddities, true);
	trace("--------------------", true);

	backgroundPage.newSidebar(myWindowId);
  }

  // Focus on searchtext input at initial load
  window.focus();
  SearchTextInput.focus();
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
    for (let i of children) {
      displayTreeBN(i);
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
 * When a tab gets new contents, verify its URL and if matching, get its Favicon
 *
 * tabId integer. ID of the tab that was updated.
 * changeInfo object. Contains properties for the tab properties that have changed. See changeInfo below.
 * tab tabs.Tab. The new state of the tab.
 */
function tabModified (tabId, changeInfo, tabInfo) {
/*
  trace('-------------------------------------');
  trace("A tab was updated.\r\n"
       +"tabId: "+tabId+"\r\n"
       +"changeInfo.favIconUrl: "+changeInfo.favIconUrl+"\r\n"
       +"changeInfo.status: "+changeInfo.status+"\r\n"
       +"changeInfo.title: "+changeInfo.title+"\r\n"
       +"changeInfo.url: "+changeInfo.url+"\r\n"
       +"tabInfo.favIconUrl: "+tabInfo.favIconUrl+"\r\n"
       +"tabInfo.index: "+tabInfo.index+"\r\n"
       +"tabInfo.status: "+tabInfo.status+"\r\n"
       +"tabInfo.title: "+tabInfo.title+"\r\n"
       +"tabInfo.url: "+tabInfo.url+"\r\n"
       );
*/
  if (!disableFavicons_option				// Ignore if disablefavicons_option is set
	  && (tabInfo.status == "complete")) {
    let tabUrl = tabInfo.url;
    let tabFaviconUrl = tabInfo.favIconUrl;

//    trace("A tab was updated - tabUrl: "+tabUrl+" tabFaviconUrl: "+tabFaviconUrl);
    if ((tabUrl != undefined)
    	&& (tabFaviconUrl != undefined)
    	&& (!tabUrl.startsWith("moz-extension://"))
    	&& (!tabUrl.startsWith("about:"))
    	&& (!tabUrl.startsWith("data:"))
    	&& (!tabUrl.startsWith("view-source:"))
       ) {
      // Look for a bookmark matching the url
      let searching = browser.bookmarks.search({url: tabUrl})
      .then(
        function (a_BTN) { // An array of BookmarkTreeNode
//          trace("Results: "+a_BTN.length);
          let BN;
          for (let i of a_BTN) {
//            trace("Matching BTN.id: "+i.id+" "+i.url);
            // Load the favicon as a data: URI
            if (tabFaviconUrl.startsWith("data:")) { // Cool, already in good format for us !
              setFavicon(i.id, tabFaviconUrl);
            }
            else {
              // Presumably a bookmark, so no need for cloneBTN(), there is no tree below
              let bnId = i.id;
              BN = curBNList[bnId];
//              faviconWorker.postMessage(["icon", bnId, tabFaviconUrl, enableCookies_option]);
              let postMsg = ["icon", bnId, tabFaviconUrl, enableCookies_option];
              if (backgroundPage == undefined) {
            	sendAddonMsgGetFavicon(postMsg);
              }
              else {
            	backgroundPage.faviconWorkerPostMessage({data: postMsg});
              }
//              trace("Retrieval demand 2 sent for icon:"+tabFaviconUrl);
            }
          }
        }
      );
    }
  }
}

/*
 * When opening sidebar/popup.html, it gets added to the History.
 * Cf. https://developer.mozilla.org/en-US/Add-ons/WebExtensions/user_interface/Extension_pages
 * Let's delete it.
 */
function onVisited(historyItem) {
//  trace("onVisited event: "+historyItem.url);
  let url = historyItem.url;
  if (url.startsWith(PopupURL)) {
    browser.history.deleteUrl({url: url});
  }
}

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
	curBNList[0] = rootBN;
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
	trace("Background save duration: "+saveDuration+" ms", true);
	countBookmarks = backgroundPage.countBookmarks;
	countFolders = backgroundPage.countFolders;
	countSeparators = backgroundPage.countSeparators;
	countOddities = backgroundPage.countOddities;

	// Get options and curBNList / rootBN
	refreshOptionsBgnd(backgroundPage);
	TracePlace.hidden = !traceEnabled_option;

	curBNList = backgroundPage.curBNList;
	rootBN = backgroundPage.rootBN;
  }
  endGetTreetime = new Date ();
  trace("Get tree duration: "+(endGetTreetime.getTime() - endLoadTime.getTime())+" ms", true);

  if (searchHeight != undefined) { // Set current saved size 
	SearchResult.style.height = searchHeight; 
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
  if (!structureVersion.includes(VersionImg16)) {
	// Remember to trigger img16 migration later
	migration_img16 = true;
  }

  // Catch changes to the search box contents
  // (including when we clear its contents programmatically ..)
  SearchTextInput.addEventListener("input", manageSearchTextHandler);

  // Catch clicks on the Cancel search button
  CancelSearchInput.addEventListener("click", clearSearchTextHandler);
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
  for (let i of rootBN.children) {
	displayTreeBN(i);
  }
  completeDisplay();

  // Display our version number
  browser.management.getSelf()
  .then(
	function (extensionInfo) {
	  let name = extensionInfo.name;
	  let version = extensionInfo.version;
	  trace("BSP2 version: "+version, true);
	  let title1 = name + " v" +version;
	  let title2 = name + "\nv" +version;
	  browser.sidebarAction.setTitle(
		{title: title1
		}
	  );
	  MGlassImg.title = title2;
	}
  );

  // Watch for tabs loading new URL's .. if one matches one of our bookmarks,
  // then get the favicon from that tab and refresh our bookmarks table and saved storage
  // with it.
  browser.tabs.onUpdated.addListener(tabModified);

  // Make sure sidebar.popup.html does not polute history
  browser.history.onVisited.addListener(onVisited);
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
  // Some variations depending on platform
  // Font "caption" turns to:
  // Windows 10 -> font: 12px "Segoe UI";
  // Windows 7  -> font: 12px serif; However 12px "Segoe UI" seems to work also, so forcing it
  // Linux      -> font: 13px "Sans"; Using a size of "12px", better
  // Mac        -> font: 13px "-apple-system"; Using a size of "12px", better
  if (BeforeFF57) {
    trace("FF before 57.0: "+BuildID, true);
  }
  trace("PlatformOs: "+platformOs, true);
  if (platformOs == "win") {
	trace("Setting Windows variations", true);
	Body.classList.replace("fontdflt", "fontwin");
	SearchTextInput.classList.replace("fontdflt", "fontwin");
  }
  else if (platformOs == "linux") {
	trace("Setting Linux variations", true);
	let fontSize = "12px";
	Body.style.fontSize = fontSize;
	SearchTextInput.style.fontSize = fontSize;
	let menuSize = "170px";
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
  else if (platformOs == "mac") {
	trace("Setting Mac variations", true);
	let fontSize = "12px";
	Body.style.fontSize = fontSize;
	SearchTextInput.style.fontSize = fontSize;
  }

  // Watch for background script messages
  browser.runtime.onMessage.addListener(handleAddonMessage);

  startTime = new Date();
  if (backgroundPage == undefined) { // Private window, load by ourselves, except SavedBNList
	waitMsg("Load saved state..");
	let p = readFullLStore(true, waitMsg);
	Promise.all([p_GetWindowId, p]) // Make sure we get myWindowId as we can directly call a function using it
	.then(
	  function (a_values) { // An array of one value per Promise is returned
		// Handle myWindowId
		let windowInfo = a_values[0];
		myWindowId = windowInfo.id;

		// Process read values from Store (they are already in Global variables from libstore.js)
		endLoadTime = new Date();
		trace("Load local store duration: "+(loadDuration = (endLoadTime.getTime() - startTime.getTime()))+" ms", true);
		TracePlace.hidden = !traceEnabled_option;

		if (backgroundReady) {
//		  console.log("Background is Ready 2");
		  initializePriv();
		  WaitMsg.textContent = "Load from background..";
		}
		else {
//		  console.log("Waiting on Background 2");
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
  else { // Bacground page is accessible, all is loaded inside it, so we will get from there
	// Only load folders state
	WaitMsg.textContent = "Load saved state..";
	let p = readFoldersLStore(waitMsg);
	Promise.all([p_GetWindowId, p]) // Make sure we get myWindowId as we can directly call a function using it
	.then(
	  function (a_values) { // An array of one value per Promise is returned
		// Handle myWindowId
		let windowInfo = a_values[0];
		myWindowId = windowInfo.id;

		// Process read values from Store (they are already in Global variables from libstore.js)
		endLoadTime = new Date();
		trace("Load local store duration: "+(loadDuration = (endLoadTime.getTime() - startTime.getTime()))+" ms", true);
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
//      openBookmarksInNewTabs_setting.onChange.addListener(openBookmarksInNewTabs_change);
	  openBookmarksInNewTabs_setting.get({})
      .then(openBookmarksInNewTabs_change);
	}
    // Get about:config browser.search.openintab setting
    let openSearchResultsInNewTabs_setting = bSettings.openSearchResultsInNewTabs;
    if (openSearchResultsInNewTabs_setting != undefined) {
// Not supported in FF (yet ?)
//      openSearchResultsInNewTabs_setting.onChange.addListener(openSearchResultsInNewTabs_change);
      openSearchResultsInNewTabs_setting.get({})
      .then(openSearchResultsInNewTabs_change);
	}
  }
}


/*
 * Main code:
 * ----------
*/
//Get background page asap
browser.runtime.getBackgroundPage()
.then(
  function (page) {
	// In a private browsing window (incognito), this will be null
	if (page != null) { // Not in a private browsing window
	  backgroundPage = page;

	  // Retrieve main infos and options already gathered by Background page
	  platformOs = backgroundPage.platformOs;
	  initialize();
	}
	else { // In a private browsing window
	  trace("In private browsing window", true);

	  //Retrieve Platform
	  browser.runtime.getPlatformInfo().then(function(info){
		platformOs = info.os;
		initialize();
	  });
	}
  },
  function (error) {
	msg = "Can't access background page: "+error;
	console.log(msg);
	trace(msg, true);

	//Retrieve Platform
	browser.runtime.getPlatformInfo().then(function(info){
	  platformOs = info.os;
	  initialize();
	});
  }
);

// Get Id of the window the sidebar is running in
// Note: there is an instance of sidebar run in each window as it seems
p_GetWindowId = browser.windows.getCurrent(
//  {populate: true	
//  }
);