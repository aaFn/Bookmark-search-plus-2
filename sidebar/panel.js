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
const Body = document.querySelector("#body"); // Assuming it is an HTMLBodyElement
const SearchTextInput = document.querySelector("#searchtext"); // Assuming it is an HTMLInputElement
const CancelSearchInput = document.querySelector("#cancelsearch"); // Assuming it is an HTMLInputElement
const SearchResult = document.querySelector("#searchresult"); // Assuming it is an HTMLDivElement
const Bookmarks = document.querySelector("#bookmarks"); // Assuming it is an HTMLDivElement
//const ResultsTable = document.querySelector("#searchresult table"); // Assuming it is an HTMLTableElement
//const BookmarksTable = document.querySelector("#bookmarks table"); // Assuming it is an HTMLTableElement
const TracePlace = document.querySelector("#trace");
const WaitingSearch = document.querySelector("#waitingsearch");
const WaitingImg = document.querySelector("#waiting");
const MyRBkmkMenu = document.querySelector("#myrbkmkmenu");
const MyRBkmkMenuStyle = document.querySelector("#myrbkmkmenu").style;
////const MyRBkmkMenuStyle = document.getElementById("myrbkmkmenu").style;
const MyBBkmkMenu = document.querySelector("#mybbkmkmenu");
const MyBBkmkMenuStyle = document.querySelector("#mybbkmkmenu").style;
const MyBBkmkMenuPaste = document.querySelector("#mybbkmkmenupaste");
const MyBFldrMenu = document.querySelector("#mybfldrmenu");
const MyBFldrMenuStyle = document.querySelector("#mybfldrmenu").style;
const MyBFldrMenuPaste = document.querySelector("#mybfldrmenupaste");
const MyBFldrMenuPasteInto = document.querySelector("#mybfldrmenupasteinto");
const MyBSepMenu = document.querySelector("#mybsepmenu");
const MyBSepMenuStyle = document.querySelector("#mybsepmenu").style;
const MyBSepMenuPaste = document.querySelector("#mybsepmenupaste");
const MyBProtMenu = document.querySelector("#mybprotmenu");
const MyBProtMenuStyle = document.querySelector("#mybprotmenu").style;
const InputKeyDelay = 500; // Delay in ms from last keystropke to activate / refresh search result
const PopupURL = browser.extension.getURL("sidebar/popup.html");
const OpenFolderTimeout = 1000; // Wait time in ms for opening a closed folder, when dragging over it

const Reshighlight = "resbrow"; // reshighlight class name in CSS

const LevelIncrementPx = 12; // Shift right in pixel from levle N to level N+1
const PersonalToobar = "toolbar_____";
const BookmarksMenu =  "menu________";
const OtherBookmarks = "unfiled_____";


/*
 *  Global variables
 */
var platformOs;
var myWindowId;
var bookmarksTree; // Type is array of BookmarkTreeNode
var savedBkmkUriList; // Used to receive the favicon uri saved in storage - Will be deleted at end
var savedFldrOpenList; // Used to receive the open state saved in storage - Will be deleted at end
var curRowIndexList = {}; // Current map between BTN.id and rowIndex for each bookmark item
var curBkmkUriList = {};  // Current uri info for bookmarks - Saved in storage at each modification
var curFldrOpenList = {}; // Current open info for folders - Saved in storage at each modification
var bkmkWorker; // For non blocking load of bookmark items
var faviconWorker; // For background retrieval of favicons
var resultsFragment; // Type is DocumentFragment
var docFragment; // Type is DocumentFragment
var resultsTable; // Assuming it is an HTMLTableElement
var bookmarksTable; // Assuming it is an HTMLTableElement
var asyncLoad_option = false; // Boolean
var highest_open_level; // Indicator of what to hide / display when initially displaying the table
var inputTimeout = null; // Timeout between keystrokes to trigger bookmarck search from inpu
var resultHighlight = null; // Current highlight of a search result in source bookmarks = cell
var myRBkmkMenu_open = false;
var myBBkmkMenu_open = false;
var myBFldrMenu_open = false;
var myBSepMenu_open = false;
var myBProtMenu_open = false;
var bkmkClipboard = undefined;

var traceEnabled_option = false; // Boolean
var countBookmarks = 0, countFolders = 0, countSeparators = 0;


/*
 * Trace when needed ...
 */
function trace (text) {
  if (traceEnabled_option) {
    TracePlace.textContent += text + "\r\n";
  }
}

/*
 * Save the favicons URI's in storage, indexed by their stable bookmark id
 */
function saveBkmkUri () {
//  var t1 = new Date();
//  trace(t1.getTime()+" Enter saveBkmkUri");
  browser.storage.local.set({
    savedBkmkUriList: curBkmkUriList
  })
/*  .then(
	function () {
	  var t2 = new Date();
	  trace(t2.getTime()+" End of saveBkmkUri save. Delay = "+(t2.getTime() - t1.getTime()));
	}
  )
*/
  ;
//  trace("Saved curBkmkUriList");
//  trace(Object.keys(curBkmkUriList));
//  trace(Object.values(curBkmkUriList));
}

/*
 * Save the folders open state in storage, indexed by their stable bookmark id
 */
function saveFldrOpen () {
//  var t1 = new Date();
//  trace(t1.getTime()+" Enter saveFldrOpen");
  browser.storage.local.set({
    savedFldrOpenList: curFldrOpenList
  })
/*  .then(
	function () {
	  var t2 = new Date();
	  trace(t2.getTime()+" End of saveFldrOpen save. Delay = "+(t2.getTime() - t1.getTime()));
	}
  )
*/
  ;
//  trace("Saved curFldrOpenList");
//  trace(Object.keys(curFldrOpenList));
//  trace(Object.values(curFldrOpenList));
}

/*
 * Append a bookmark inside the search result sidebar table
 *
 * BTN = BookmarkTreeNode
 */
function appendResult (BTN) {
//  trace("Displaying <<"+BTN.id+">><<"+BTN.title+">><<"+BTN.type+">><<"+BTN.url+">>");

  // Append new bookmark row inside the search results table
  var row = resultsTable.insertRow();
  row.draggable = true; // Adding this, but with no handler, avoids that the anchor inside
                        // can be dragged .. not sure of exactly why, but this is what I observe !
  var BTN_id = row.dataset.id = BTN.id; // Keep unique id of bookmark in the data-id attribute

  // Add bookmark items in row
  var cell = row.insertCell();
  cell.classList.add("brow");
  cell.draggable = false;
  cell.setAttribute("tabindex", "0");

  // Append proper contents to the cell:
  // - a <div> of class "bkmkitem", with no margin-left, containing:
  //   - a <div> of class "bkmkitem_f", or a <a> of class "bkmkitem_b",
  //     for respectively folder or bookmark, containing:
  //     - an <img> (class "favicon") and a <span> with text
  //       (set class to "favtext" in javascript to get 3px margin-left, but not in HTML where
  //        it's already done, don't know why).
  var div1 = document.createElement("div"); // Assuming it is an HTMLDivElement
  div1.classList.add("bkmkitem");
  div1.draggable = false;
  cell.appendChild(div1);

  if (BTN.type == "folder") {               // Folder
    // Mark that row as folder
    row.dataset.type = "folder";

    // Create elements
    var div3 = document.createElement("div"); // Assuming it is an HTMLDivElement
    div3.classList.add("bkmkitem_f");
    div3.draggable = false;
    div1.appendChild(div3);

    var img = document.createElement("img"); // Assuming it is an HTMLImageElement
    img.classList.add("favicon");
    if (BTN_id == PersonalToobar)   img.src = "/icons/toolbarbkmk.png";
    else if (BTN_id == BookmarksMenu)   img.src = "/icons/menubkmk.png";
    else if (BTN_id == OtherBookmarks)   img.src = "/icons/otherbkmk.png";
    else   img.src = "/icons/folder.png";
    img.draggable = false;
    div3.appendChild(img);

    var span = document.createElement("span"); // Assuming it is an HTMLSpanElement
    span.classList.add("favtext");
    span.textContent = BTN.title;
    span.draggable = false;
    div3.appendChild(span);
  }
  else {                                    // "bookmark"
    // Mark that row as folder
    row.dataset.type = "bookmark";

    // Create elements
    var special = BTN.url.startsWith("place:");
    var anchor;
    if (special) {
      anchor = document.createElement("div"); // Assuming it is an HTMLDivElement
    }
    else {
      anchor = document.createElement("a"); // Assuming it is an HTMLAnchorElement
      anchor.href = BTN.url;
    }
    anchor.classList.add("bkmkitem_b");
    anchor.title = BTN.title+"\n"+BTN.url;
    anchor.draggable = false;
    div1.appendChild(anchor);

    var img = document.createElement("img"); // Assuming it is an HTMLImageElement
    img.classList.add("favicon");
    if (special)   img.src = "/icons/specfavicon.png";
    else {
      // Retrieve current uri or set to nofavicontmp.png by default, to signal
      // we are waiting for the retrieval process to complete.
      var uri = curBkmkUriList[BTN_id];
      if (uri == undefined) {
        uri = "/icons/nofavicontmp.png";
      }
      img.src = uri;
    }
    img.draggable = false;
    anchor.appendChild(img);

    var span = document.createElement("span"); // Assuming it is an HTMLSpanElement
    span.classList.add("favtext");
    span.textContent = BTN.title;
    span.draggable = false;
    anchor.appendChild(span);
  }
}

/*
 * Execute / update a bookmark search and display result
 */
function updateSearch () {
  // Triggered by timeout, so now clear the id
  inputTimeout = null;

  // Get search string
  var value = SearchTextInput.value;

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
    resultsFragment = null;

    // If a row cell was highlighted, do not highlight it anymore
    if (resultHighlight != null) {
      resultHighlight.classList.replace(Reshighlight, "brow");
      resultHighlight = null;
    }
  }

  // Look for bookmarks matching the search text in their contents (title, url .. etc ..)
  var searching = browser.bookmarks.search(value)
  .then(
    function (a_BTN) { // An array of BookmarkTreeNode
      // Create the search results table
      resultsFragment = document.createDocumentFragment();
      resultsTable = document.createElement("table");
      resultsFragment.appendChild(resultsTable);

//      trace("Results: "+a_BTN.length);
      if (a_BTN.length > 0) {
        for (let i of a_BTN) {
//          trace("Matching BTN.id: "+i.id+" "+i.title+" "+i.url);
          if ((i.url == undefined)            // folder
              || !i.url.startsWith("place:") // "place:" results behave strangely ..
                                              // (they have no title !!)
             ) {
            // Append to the search result table
            appendResult(i);
          }
        }
      }
      // Display the search result table
      WaitingSearch.hidden = true;
      SearchResult.appendChild(resultsFragment); // Display the search results table + reflow
    }
  );
}

/*
 * Reset bookmarks tree to its intended visiblity state
 * which means hide all that is under a closed (.twistieac) folder
 */
function resetTreeVisiblity () {
  var row = bookmarksTable.rows[0]; // Start at first row in table (which btw cannot be hidden)
  var level;
  while (row != null) {
    // We are on an intended to be visible row,
    row.hidden = false;
    // check if this is a folder and if meant to be open
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
 * Manage searches in the Searchbox:
 * - handle visibility and state (enabled / disabled) of the text cancel button
 * - handle appearance of a search result area, and display search results, after a timeout
 * - handle reset of timeout each time new key is pressed
 */
function manageSearchTextHandler () {
//  trace("manageSearchTextHandler");
  var value = SearchTextInput.value;

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
    resultsFragment = null;

    // If a row was highlighted, do not highlight it anymore
    if (resultHighlight != null) {
      resultHighlight.classList.replace(Reshighlight, "brow");
      resultHighlight = null;
    }

    // Restore bookmarks tree to its initial visiblity state
    resetTreeVisiblity();
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
  var event = new InputEvent ("input");
  SearchTextInput.dispatchEvent(event);
  SearchTextInput.focus(); // Keep focus on it ...
}

/*
Update content when a new tab becomes active.
*/
/* browser.tabs.onActivated.addListener(updateContent); */

/*
Update content when a new page is loaded into a tab.
*/
/* browser.tabs.onUpdated.addListener(updateContent); */

/*
 * Insert a bookmark inside the sidebar table at given position (so just before
 * the row at that position).
 *
 * BTN = BookmarkTreeNode
 * level = integer, the tree depth
 * index (optional) = insert position, or append at end if -1
 *
 * Returns: the inserted row (an HTMLTableRowElement).
 *
 * Be careful that there is a global variable used: highest_open_level.
 * It has to be set appropriately before an insert (or append), to determine the row visibility.
 * It is maintained by the function for sequential calls at initial display time, but when
 * inserting a bookmark later in the middle, the calling code has to set it appropriately.
 */
var uglyHackTabFavIconUrl = undefined; // Used by bkmkDropHandler() to speed up favIconUrl
                                       // retrieval process when dragging & dropping a tab,
                                       // since there is no way to pass the favicon to the
                                       // bookmarks.create() call.
function insertBookmark (BTN, level, index = -1) {
//  var t1 = new Date();
//  trace(t1.getTime()+" Displaying <<"+BTN.id+">><<"+BTN.title+">><<"+BTN.type+">><<"+BTN.url+">> at level: "+level+" highest_open_level: "+highest_open_level+" and index: "+index);

  // Refresh highest_open_level if we finished one or more levels which were open
  if (level < highest_open_level)   highest_open_level = level;

  // Insert new row at given place, or append a new row, inside the bookmarks table
  var row = bookmarksTable.insertRow(index);
  row.dataset.level = level;  // Keep level of bookmark in the data-level attribute
  var BTN_id = row.dataset.id = BTN.id; // Keep unique id of bookmark in the data-id attribute
  row.hidden = (level > highest_open_level); // If not in an open part, hide the row
  row.draggable = true; // Always .. and we will use dataset.protect to forbid move
                        // of special elements.
  row.dataset.protect = "false";
  curRowIndexList[BTN_id] = row.rowIndex;

  // Add bookmark items in row
  var cell = row.insertCell();
  cell.classList.add("brow");
  cell.setAttribute("tabindex", "0");
  cell.draggable = false;

  // Append proper contents to the cell:
  // - a <div> of class "bkmkitem", with a margin-left corresponding to the level, containing:
  //   - if folder, a <div> of class "twistiena", "twistieac" or twistieao", depending
  //     if there are no children, or if closed or open
  //   - a <div> of class "bkmkitem_s" or "bkmkitem_f", or a <a> of class "bkmkitem_b",
  //     for respectively separator, folder or bookmark, containing:
  //     - if separator, a <div> of class "favseparator"
  //     - if folder or bookmark, an <img> (class "favicon") and a <span> with text
  //       (set class to "favtext" in javascript to get 3px margin-left, but not in HTML where
  //        it's already done, don't know why).
  var div1 = document.createElement("div"); // Assuming it is an HTMLDivElement
  div1.classList.add("bkmkitem");
  div1.draggable = false;
  if (level > 0) {
    div1.style.marginLeft = (LevelIncrementPx * level)+"px";
  }
  cell.appendChild(div1);

  if (BTN.type == "folder") {               // Folder
    countFolders++;
    // Mark that row as folder
    row.dataset.type = "folder";

    // Retrieve saved state or set open by default
    var open = undefined;
    if (savedFldrOpenList != undefined) {
      open = savedFldrOpenList[BTN_id];
    }
    else {
      // Verify if we already know about it
      open = curFldrOpenList[BTN_id];
    }
    if (open == undefined) {
      open = curFldrOpenList[BTN_id] = true;
    }
    else   curFldrOpenList[BTN_id] = open;

    // Update indicator of highest open level .. only if open and in an open part
    if (open && (highest_open_level == level))
        highest_open_level = level + 1;

    // Create elements
    var div2 = document.createElement("div"); // Assuming it is an HTMLDivElement
    if ((BTN.children == undefined) || (BTN.children.length == 0))
        div2.classList.add("twistiena");
    else   div2.classList.add(open ? "twistieao" : "twistieac");
    div2.draggable = false;
    div1.appendChild(div2);

    var div3 = document.createElement("div"); // Assuming it is an HTMLDivElement
    div3.classList.add("bkmkitem_f");
    div3.title = BTN.title;
    div3.draggable = false;
    div1.appendChild(div3);

    var img = document.createElement("img"); // Assuming it is an HTMLImageElement
    img.classList.add("favicon");
    if (BTN_id == PersonalToobar) {
      img.src = "/icons/toolbarbkmk.png";
      row.dataset.protect = "true";
    }
    else if (BTN_id == BookmarksMenu) {
      img.src = "/icons/menubkmk.png";
      row.dataset.protect = "true";
    }
    else if (BTN_id == OtherBookmarks) {
      img.src = "/icons/otherbkmk.png";
      row.dataset.protect = "true";
    }
    else   img.src = "/icons/folder.png";
    img.draggable = false;
    div3.appendChild(img);

    var span = document.createElement("span"); // Assuming it is an HTMLSpanElement
    span.classList.add("favtext");
    span.textContent = BTN.title;
    span.draggable = false;
    div3.appendChild(span);
  }
  else if (BTN.type == "separator") {       // Separator
    if (countSeparators++ == 0) { // First separator is not draggable
      row.dataset.protect = "true";
    }
    // Mark that row as separator
    row.dataset.type = "separator";

    // Create elements
    var div2 = document.createElement("div"); // Assuming it is an HTMLDivElement
    div2.classList.add("bkmkitem_s");
    div2.draggable = false;
    div1.appendChild(div2);

    var div3 = document.createElement("div"); // Assuming it is an HTMLDivElement
    div3.classList.add("favseparator");
    div3.draggable = false;
    div2.appendChild(div3);

    var div4 = document.createElement("div"); // Assuming it is an HTMLDivElement
    div4.classList.add("favseparatorend");
    div4.draggable = false;
    div2.appendChild(div4);
  }
  else {                                    // "bookmark"
    countBookmarks++;
    // Mark that row as folder
    row.dataset.type = "bookmark";

    // Create elements
    var isSpecial = BTN.url.startsWith("place:");
    var anchor;
    anchor = document.createElement("a"); // Assuming it is an HTMLAnchorElement
    if (!isSpecial) {
      anchor.href = BTN.url;
    }
    anchor.classList.add("bkmkitem_b");
    anchor.title = BTN.title+"\n"+BTN.url;
    anchor.draggable = false;
    div1.appendChild(anchor);

    var img = document.createElement("img"); // Assuming it is an HTMLImageElement
    img.classList.add("favicon");
    if (isSpecial) {
      img.src = "/icons/specfavicon.png";
      row.dataset.protect = "true";
    }
    else {
      // Retrieve saved uri or set to nofavicontmp.png by default
      // and trigger favicon retrieval in background
      var uri = undefined;
      if (savedBkmkUriList != undefined) { // We are at initial load time
        uri = savedBkmkUriList[BTN_id];
        if (uri == "/icons/nofavicontmp.png") { // Last time we stopped the sidebar
        	                                    // it didn't have time to fetch that
        	                                    // favicon .. so let's do it now.
          uri = undefined;
        }
      }
      else {
        // Verify if we already know about it
        uri = curBkmkUriList[BTN_id];
      }

      // Trigger asynchronous favicon retrieval process if favicon uri not found
      if (BTN.url.startsWith("about:")) { // about: is protected - security error ..
        uri = "/icons/nofavicon.png";
        if (BTN.url != "about:blank") // about:blank is not protected ...
        	                          // It is draggable, but keep favicon = nofavicon
           row.dataset.protect = "true";
      }
      else {
        if (uri == undefined) {
          if (uglyHackTabFavIconUrl == undefined) {
            faviconWorker.postMessage(["get", BTN]);
          }
          else {
            faviconWorker.postMessage(["icon:"+uglyHackTabFavIconUrl, BTN]);
            trace("Retrieval demand 1 sent for icon:"+uglyHackTabFavIconUrl);
            uglyHackTabFavIconUrl = undefined; // One shot ..
          } 
        }
      }
      img.src = curBkmkUriList[BTN_id] = (uri == undefined ? "/icons/nofavicontmp.png" : uri);
    }
    img.draggable = false;
    anchor.appendChild(img);

    var span = document.createElement("span"); // Assuming it is an HTMLSpanElement
    span.classList.add("favtext");
    span.textContent = BTN.title;
    span.draggable = false;
    anchor.appendChild(span);
  }

  return(row);
}

/*
 * Calculate the real length of a folder, including itself, its bookmarks and length of sub-folders
 * 
 * folderBTN = folder BookmarkTreeNode
 * 
 * Returns the (integer) real length of the folder
 */
function realLength (folderBTN) {
  var length = 1; // At least the folder item
  for (let i of folderBTN.children) {
	if (i.type == "folder") {
	  length += realLength(i);
	}
	else   length++;
  }
  return(length);
}

/*
 * Calculate the real offset from parent, including length of sub-folders between parent and node
 * 
 * parentBTN = BookmarkTreeNode
 * internalPos = 0 based index of parentBTN children 
 * 
 * Returns the (integer) real offset from parent for relative position inside bookmarksTable.
 */
function realOffset (parentBTN, internalPos) {
  var offset = 1;
  var children = parentBTN.children;
  var BTN;
  for (let i=0 ; i<internalPos ; i++) {
	if ((BTN = children[i]).type == "folder") {
	  offset += realLength(BTN);
	}
	else   offset++;
  }
  return(offset);
}

/*
 * Insert one or more (if folder) bookmarks in table
 *
 * BTN = BookmarkTreeNode. Information about the new bookmark item (and its children if folder)
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
var insertRowIndex;
function insertBkmks (BTN, parentRow, parentLevel = undefined, parentOpen = undefined) {
  // Retrieve parent in the bookmarks table if not supplied
  if (parentLevel == undefined) { // Retrieve infos
    // There must be a parent .. root is never created
    // Assumption is also that "toolbar_____", "menu________"
    // and "unfiled_____" are never created either, and everything
    // falls under one of them (at least ..).

    // Retrieve level of parent, and open information
    parentLevel = parseInt(parentRow.dataset.level, 10);
    parentOpen = curFldrOpenList[BTN.parentId];

    // Update parent twistiexx class if we insert under an empty folder
    // Note: this only happens when we don't know the parent ...
    var twistie = parentRow.firstElementChild.firstElementChild.firstElementChild;
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
         // Limitation: if the parent and its contents are visible because of
         //       a search result click, but the parent is intended closed (.twistieac), then the
         //       new bookmark will not be visible (it will in a next search or open though ..).
    if (parentOpen)   highest_open_level = parentLevel + 1; // Will be set visible
    else   highest_open_level = parentLevel; // Will be hidden
  }

  // Insert the new bookmark at its place (and retrieve its favicon .. etc ..)
  var row;
  if (insertRowIndex == bookmarksTable.rows.length) {
    row = insertBookmark(BTN, parentLevel+1); // Append row
    insertRowIndex++;
  }
  else { 
    row = insertBookmark(BTN, parentLevel+1, insertRowIndex++);
  }

  // If BTN is a folder, proceed with inserting its children (if any = case of Move or Sort)
  if (BTN.type == "folder") {
	var children = BTN.children;
    if ((children != undefined) && (children.length > 0)) {
      var childRow;
      var open = curFldrOpenList[BTN.id]; // Retrieve our intended open state
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
 * id = string. The new bookmark item's ID.
 * BTN = BookmarkTreeNode. Information about the new bookmark item.
 * 
 * Note: we got a problem: when creating several bookmarks in a row very fast, like in
 *       "Mark all tabs", since getSubTree() can be quite long, we're getting plenty of requests
 *       nearly at the same time just after the initial parent folder,  which are its children,
 *       and while still processing the parent folder, because of the Promise mechanism. And
 *       it frequently happens that children are processed faster than their parent, so their
 *       result happen before ..! And that ends up in a mess, with exceptions since for ex.
 *       curRowIndexList is not yet filled with the parent when children get executed,
 *       and so parentRowIndex is null, and we're calling insertBkmks with therefore a null
 *       returned by bookmarksTable.rows[parentRowIndex] !! Total disorder .. !!
 * => Async/await is not helping ... still getting things in "paralleled" disorder :-(
 * => Would need semaphores or true synchronicity, but none of this exists in javascript :-(
 * => Have to implement a queueing mechanism at entry .. again, javascript is a crap language ..
 */
var createReqQueue = []; // Array of create requests, to serialize and cadence their handling
var t1;
function bkmkCreatedHandler (id, BTN) {
//  t1 = new Date();
//  trace(t1.getTime()+" Create event on: "+id+" type: "+BTN.type+" parentId: "+BTN.parentId+" index: "+BTN.index);

  createReqQueue.push([id, BTN]);
  if (createReqQueue.length == 1) { // createReqQueue was empty, need to start cadence process
//    trace("There was no work in create queue: "+createReqQueue.length+" - dispatching");
	handleCreateRequest();
  }
//  trace("Finished queueing request id: "+id+" BTN: "+BTN);
}

function handleCreateRequest () {
  // Get first element in queue
  var req = createReqQueue[0];
  var id = req[0]; 
  var BTN = req[1]; 
//  trace("Processing id: "+id+" BTN: "+BTN);

  // We need the parent to calculate the real offset of insertion
  var parentId = BTN.parentId;
  var parentRowIndex = curRowIndexList[parentId];
  var index = BTN.index;

  // We need to retrieve the insertion point the hard way if we do not want to call
  // getSubtree() which is very very long ...
  var row = bookmarksTable.rows[parentRowIndex];
  var level = parseInt(row.dataset.level, 10) + 1;

  // Find insertion point, setting it in global variable insertRowIndex
  insertRowIndex = parentRowIndex + 1; // Start just after parent
  row = row.nextElementSibling;
  while ((row != null) && (index > 0)) {
	// Entry point of the loop is by construction not null and an element exactly at level
    // Go over it, decreasing index to find the right place
    insertRowIndex++;
    index--;
    row = row.nextElementSibling;
    // In case this row has children, skip them all ...
	while ((row != null) && (parseInt(row.dataset.level, 10) > level)) {
      row = row.nextElementSibling;
      insertRowIndex++;
    }
  }

  // We got the insertion point, proceed to insertion
  row = insertBkmks(BTN, bookmarksTable.rows[parentRowIndex]);
//  var t2 = new Date();
//  trace(t2.getTime()+" Create handler intermediate delay: "+(t2.getTime() - t1.getTime()));

  // Save new current info
  if (BTN.type == "folder")   saveFldrOpen(); // If move or sort, curBkmkUriList is untouched
                                              // and if real folder creation, there is no children (yet)
  else if (BTN.type == "bookmark")   saveBkmkUri();

  // Update index of rows following the inserted one since they changed
  do {
    curRowIndexList[row.dataset.id] = row.rowIndex;
  }
  while ((row = row.nextElementSibling) != null)
//  var t3 = new Date();
//  trace(t3.getTime()+" Create handler delay: "+(t3.getTime() - t1.getTime()));

  // Check if there is more in queue
  createReqQueue.shift(); // Remove the element in queue we just processed (= first one)
  if (createReqQueue.length > 0) { // Still work in queue, continue the cadence process
//    trace("Still work in create queue: "+createReqQueue.length+" - redispatching");
    handleCreateRequest();
  }
}

/*
 * Delete rows from the table and from cur lists (and all xx-children if it is a folder),
 * maintaining the twistie class of the parent folder if it becomes empty because of the delete.
 *
 * rowIndex = position of row to delete in table (and its children if folder)
 * cleanup = Boolean, if true, delete entry from cur<xxx>List, else leave it (like for a move
 *           or sort).
 *
 * Returns the row which took its place
 */
function removeBkmks (rowIndex, cleanup) {
  // Remove item from display, and from the appropriate lists
  var row = bookmarksTable.rows[rowIndex];
  var BTN_id = row.dataset.id;
  var nextRow = row.nextElementSibling;
  // Remember current level
  var level = parseInt(row.dataset.level, 10);
  // Remember previous row before deleting this one, for handling parent twistie later
  var previousRow = row.previousElementSibling;

  if (row.dataset.type == "folder") {
    // Delete node and cleanup if needed
    if (cleanup) {
      delete curFldrOpenList[BTN_id];
      delete curRowIndexList[BTN_id];
    }
    bookmarksTable.deleteRow(rowIndex);

    // Delete children if any
    while ((nextRow != null) && (parseInt(nextRow.dataset.level, 10) > level)) {
   	  if (cleanup) {
   		BTN_id = nextRow.dataset.id;
   		if (nextRow.dataset.type == "folder") {
          delete curFldrOpenList[BTN_id];
   		}
   		else if (nextRow.firstElementChild.firstElementChild.firstElementChild.classList
                        .contains("bkmkitem_b")) { // Not a separator
   	      delete curBkmkUriList[BTN_id];
   		}
        delete curRowIndexList[BTN_id];
   	  }

   	  // rowIndex is constant since nextRow took the place
      nextRow = nextRow.nextElementSibling; // Do it before delete to not get a null ..
      bookmarksTable.deleteRow(rowIndex);
    }
  }
  else {
    // Delete node and cleanup if needed
    if (cleanup) {
      if (row.firstElementChild.firstElementChild.firstElementChild.classList
               .contains("bkmkitem_b")) { // Not a separator
        delete curBkmkUriList[BTN_id];
      }
      delete curRowIndexList[BTN_id];
    }
    bookmarksTable.deleteRow(rowIndex);
  }

  // Update parent folder to twistiena class if it has no more chidren
  // This is true if the previous row is a folder of level-1,
  // and if next row is null or is of level-1 or less
  if ((previousRow != null) // Being null should not occur, but just in case ...
      && (previousRow.dataset.type == "folder")
      && (parseInt(previousRow.dataset.level, 10) == level-1)
      && ((nextRow == null) || (parseInt(nextRow.dataset.level, 10) < level))
     ) {
    var twistie = previousRow.firstElementChild.firstElementChild.firstElementChild;
    if (twistie.classList.contains("twistieao")) { // It was open
      twistie.classList.replace("twistieao", "twistiena");
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
 * id = string. ID of the item that was removed.
 * removeInfo = an object containing info about the removed item.
 *   {parentId: string. ID of the item's parent in the tree.
 *    index:    integer. Zero-based index position of this item in its parent.
 *    node:     BookmarkTreeNode. Detailed information about the item that was removed.
 *   }
 */
function bkmkRemovedHandler (id, removeInfo) {
//  trace("Remove event on: "+id+" title: <<"+removeInfo.node.title+">> type: "+removeInfo.node.type);
  // Retrieve position of removed item in the bookmarks table
  var rowIndex = curRowIndexList[id];

  // Remove item and its children from display, and from the appropriate lists
  // The returned value is the row which took its place in the table (or none if at end).
  var row = removeBkmks(rowIndex, true);

  // Save new current info
  var type = removeInfo.node.type;
  if (type == "folder") {
    saveBkmkUri(); // Presumably, some bookmark nodes were also removed ... so save it
    saveFldrOpen();
  }
  else if (type == "bookmark")   saveBkmkUri(); // Only one bookmark affected

  // Update index of remaining rows after the deleted one(s) = -1 or more ..
  while (row != null) {
    curRowIndexList[row.dataset.id] = rowIndex++;
    row = row.nextElementSibling;
  }
}

/*
 * Handle bookmark changed event
 *
 * id = string. ID of the item that was removed.
 * changeInfo = an object containing info about the changed item.
 *   {title: string containing the item's title if that changed, else undefined
 *    url: string containing the item's URL if that changed, else undefined
 *   }
 */
function bkmkChangedHandler (id, changeInfo) {
//  trace("Change event on: "+id+" title: <<"+changeInfo.title+">> url: "+changeInfo.url);
  // Retrieve the real BookmarkTreeNode for complete information
  browser.bookmarks.get(id)
  .then(
    function (a_BTN) { // Array of BookmarkTreeNode
      var BTN = a_BTN[0]; // Assume we have only one element since we gave only one id

      // Retrieve position of changed item in the bookmarks table
      var rowIndex = curRowIndexList[id];
      var row = bookmarksTable.rows[rowIndex];
      var isBookmark = (BTN.type == "bookmark");
//      trace("Change event on: "+id+" title: <<"+changeInfo.title+">> url: <<"+changeInfo.url+">> isBookmark: "+isBookmark);

      // Update its contents
      var item = row.firstElementChild.firstElementChild.firstElementChild;
      if (isBookmark) { // item is a .bkmkitem_b <a>
        // item.title mixes both, so is always updated
        var url = BTN.url;
        item.title = BTN.title+"\n"+url;

        // Update what changed ...
        if (changeInfo.title != undefined) { // Title changed
          var span = item.firstElementChild.nextElementSibling;
          span.textContent = BTN.title;
        }
        if (changeInfo.url != undefined) { // URL changed
          var isSpecial = url.startsWith("place:");
          if (isSpecial) {
            if (item.hasAttribute("href")) { // It was not special before .. remove the href
              item.removeAttribute("href");
              delete curBkmkUriList[id]; // Remove also its uri from the list
            }
          }
          else { // Set the new href value
            item.href = url;
          }

          var img = item.firstElementChild; // Assuming it is an HTMLImageElement
          if (isSpecial)   img.src = "/icons/specfavicon.png";
          else {
            // Trigger asynchronous favicon retrieval process in background
            if (url.startsWith("about:")) { // about: is protected - security error ..
                // Set uri to nofavicon.png
                img.src = curBkmkUriList[id] = "/icons/nofavicon.png";
            }
            else {
              img.src = curBkmkUriList[id] = "/icons/nofavicontmp.png";
              faviconWorker.postMessage(["get2", BTN]);
            }
            saveBkmkUri();
          }
        }
      }
      else { // Can only be a folder, per spec of the event, not a separator
             // => item is a ".twistie.." <div>
        if (changeInfo.title != undefined) { // Title changed
          // Get to the <span> in .bkmkmitem_f <div>
          var span = item.nextElementSibling.firstElementChild.nextElementSibling;
          span.textContent = BTN.title;
        }
      }
    }
  );
}

/*
 * Handle bookmark moved event
 *
 * id = string. ID of the item that was moved.
 * moveInfo = an object containing info about the moved item.
 *   {parentId: string. The new parent folder.
 *    index: integer. The new index of this item in its parent.
 *    oldParentId: string. The old parent folder.
 *    oldIndex: integer. The old index of the item in its parent. 
 *   }
 *
 * Note: same problem as with bkmkCreatedHandler, since Firefox when reordering a folder contents
 *       doesnt appear to use the reorder event (bkmkReorderedHandler), but results in a close
 *       series of move .. which can result in the same parallel disorder problem because
 *       of the Promise mechnanism.
 *       Won't repeat what I think of javascript .. anyway, no other choice to write an extension
 *       for our favorite browser :-(
 */
var moveReqQueue = []; // Array of move requests, to serialize and cadence their handling
function bkmkMovedHandler (id, moveInfo) {
//  trace("Move event on: "+id+" from: <<"+moveInfo.oldParentId+", "+moveInfo.oldIndex+">> to: <<"+moveInfo.parentId+", "+moveInfo.index+">>");

  moveReqQueue.push([id, moveInfo]);
  if (moveReqQueue.length == 1) { // moveReqQueue was empty, need to start cadence process
//    trace("There was no work in move queue: "+moveReqQueue.length+" - dispatching");
    handleMoveRequest();
  }
//  trace("Finished queueing move request id: "+id+" moveInfo: "+moveInfo);
}

function handleMoveRequest (id, moveInfo) {
  // Get first element in queue
  var req = moveReqQueue[0];
  var id = req[0]; 
  var moveInfo = req[1]; 
//  trace("Processing id: "+id+" moveInfo: "+moveInfo);

  // Retrieve the real BookmarkTreeNode and all its children, and its new parent
  browser.bookmarks.getSubTree(id)
  .then(
    function (a_BTN) { // Array of BookmarkTreeNode
      var BTN = a_BTN[0]; // Assume the responses are in the same order as the demand ..

      // Get move description in current (= old) reference
      var oldRowIndex = curRowIndexList[id];
      var targetParentId = moveInfo.parentId;
      var targetParentOldRowIndex = curRowIndexList[targetParentId];
      var targetParentRow = bookmarksTable.rows[targetParentOldRowIndex];
      var targetOldIndex = moveInfo.index;
      if (targetParentId == moveInfo.oldParentId) { // Move under same parent
    	if (targetOldIndex >= moveInfo.oldIndex)
    	  targetOldIndex++; // Count current item in the oldIndex
      }

      // Find insertion point, in current (old) reference
      var targetOldRowIndex = targetParentOldRowIndex + 1; // At least just after its new parent
      var targetRow = targetParentRow.nextElementSibling; // Can be null if we move at end
      var level = parseInt(targetParentRow.dataset.level, 10) + 1;
      while ((targetRow != null) && (targetOldIndex > 0)) {
    	// Entry point of the loop is by construction not null and an element exactly at level
        // Go over it, decreasing targetOldIndex to find the right place
    	targetOldIndex--;
    	targetRow = targetRow.nextElementSibling;
    	targetOldRowIndex++;
        // In case this row has children, skip them all ...
    	while ((targetRow != null) && (parseInt(targetRow.dataset.level, 10) > level)) {
    	  targetRow = targetRow.nextElementSibling;
          targetOldRowIndex++;
        }
      }

      // We got the move point in targetRow (null if at end), and its position in
      // targetOldRowIndex, proceed to move
//      trace("oldRowIndex: "+oldRowIndex+" targetOldRowIndex: "+targetOldRowIndex);

      // Remove item and its children from display, but keep them in their cur lists
      // as this is only a move.
      // The returned value is the row which took its place in the table (or null if
      // removed at end).
      var deletePos = removeBkmks(oldRowIndex, false);

      // If moved after, re-index now before inserting the remaining rows between deleted
      // and target, and only those ones, in order to keep curRowIndexList current
      // since it is used by insertBkmk().
      // Those before or after that range do not change their index after move completion.
      if (oldRowIndex < targetOldRowIndex) {
    	var startRow = deletePos; // The row just after removed ones
        while (startRow != targetRow) { // startRow can't be null in that case, but targetRow can
        	                            // in which case startRow will go to table end (== null)
          curRowIndexList[startRow.dataset.id] = startRow.rowIndex;
          startRow = startRow.nextElementSibling;
        }
      }

      // Insert the item at its new place (with its children) using global variable insertRowIndex
      // and get the last inserted row in return.
      if (oldRowIndex == targetOldRowIndex) { // targetRow has disappeared, it was the moved row
    	// We are then visually inserting where it was deleted
    	insertRowIndex = deletePos.rowIndex;
      }
      else {
    	if (targetRow == null) // Moving at end of bookmarks table
    	  insertRowIndex = bookmarksTable.rows.length;
    	else   insertRowIndex = targetRow.rowIndex;
      }
      var insertPos = insertBkmks(BTN, targetParentRow);

      // If moved before, re-index now the rows between last inserted and origin, and only
      // those ones.
      // Those before or after that range do not change their index after move completion
      // Note that the case oldRowIndex == targetOldRowIndex corresponds to when the object
      //   changes of parent without physically moving (this is possible when moving inside
      //   of a grand-parent or higher ancestor), indexes do not change at all before and
      //   after, so we save this processing.
      if (oldRowIndex > targetOldRowIndex) {
        var startRow = insertPos.nextElementSibling;
        while (startRow != deletePos) { // startRow can't be null in that case, but deletePos can
                                        // in which case startRow will go to table end (== null)
          curRowIndexList[startRow.dataset.id] = startRow.rowIndex;
          startRow = startRow.nextElementSibling;
        }
      }

      // Current info didn't change, so no need to save anything ..
      // Check if there is more in queue
      moveReqQueue.shift(); // Remove the element in queue we just processed (= first one)
      if (moveReqQueue.length > 0) { // Still work in queue, continue the cadence process
//        trace("Still work in move queue: "+moveReqQueue.length+" - redispatching");
        handleMoveRequest();
	  }
    }
  );
}

/*
 * Handle bookmark reordered event
 *
 * id = string. ID of the folder whose children were reordered.
 * reorderInfo = an object containing info about the reordered item.
 *   {childIds: array of string. Array containing the IDs of all the bookmark items in this folder,
 *              in the order they now appear in the UI. 
 *   }
 */
function bkmkReorderedHandler (id, reorderInfo) {
//  trace("Reorder event on: "+id);

  // We need the BTN to get real info
  browser.bookmarks.getSubTree(id)
  .then(
    function (a_BTN) { // Array of BookmarkTreeNode
      var folderBTN = a_BTN[0]; // Only one element per spec = a folder BTN

      // Delete all children of folderBTN on display, if any (no cleanup)
      var rowIndex = curRowIndexList[id];
      var folderRow = bookmarksTable.rows[rowIndex++];
      var level = parseInt(folderRow.dataset.level, 10);
      var nextRow = folderRow.nextElementSibling;
      while ((nextRow != null) && (parseInt(nextRow.dataset.level, 10) > level)) {
        // rowIndex is constant since the next row takes the place each time
        nextRow = nextRow.nextElementSibling; // Do it before delete to not get a null ..
        bookmarksTable.deleteRow(rowIndex);
      }

      // And reinsert all children of folderBTN in new order
      if (folderBTN.children != undefined) {
    	var open = curFldrOpenList[folderBTN.id]; // Retrieve our intended open state
    	insertRowIndex = rowIndex;
    	for (let i of folderBTN.children) {
    	  insertBkmks(i, folderRow, level+1, open);
    	}
      }

      // No folder or uri info changed, so nothing to save
    }
  );
}

/*
 * Handle clicks on results
 *
 * row is an HTLMTableRowElement
 */
function handleResultClick (row) {
  // Retrieve bookmark information in the row (BTN.id)
  var BTN_id = row.dataset.id;

  // Find rowIndex of the source object
  var index = curRowIndexList[BTN_id];
//  trace("Row: "+row+" BTN_id: "+BTN_id+" index: "+index);

  // If there was a previous highlighted row cell, go back to normal
  if (resultHighlight != null) {
    resultHighlight.classList.replace(Reshighlight, "brow");
    resultHighlight = null;
  }

  // Make the source row of result visible if hidden
  var srcRow = bookmarksTable.rows[index];
  if (srcRow.hidden) {
    // Unhide up to first parent already visible
    var row;
    (row = srcRow).hidden = false;
    while ((row = row.previousElementSibling).hidden) {
      row.hidden = false;
    }

    // Retrieve the level of that first already visible parent
    // Note that if row was null, then the loop would have stopped on the first row of the table.
    // However,  this is a SNO (Should Not Occur) since the first row can never be hidden,
    // so no test for that condition ..
    var last_open_level = parseInt(row.dataset.level, 10);

    // And now, unhide down all hidden elements, until we find a level < last_open_level
    // or reach end of table.
    row = srcRow;
    while (((row = row.nextElementSibling) != null)
           && row.hidden
           && (parseInt(row.dataset.level, 10) >= last_open_level)
          ) {
      row.hidden = false;
    }
  }

  // Highlight the source cell + scroll it into view
  resultHighlight = srcRow.firstElementChild;
  resultHighlight.classList.replace("brow", Reshighlight);
  srcRow.scrollIntoView({behavior: "smooth"});
}

/*
 * Handle clicks on folders - Change twistie and visibility of children (recursively)
 *
 * twistie is an HTLMDivElement
 */
function handleFolderClick (twistie) {
  // Retrieve bookmark information in the row (BTN.id and level)
  var row = twistie.parentElement.parentElement.parentElement;
  var BTN_id = row.dataset.id;
  var level = parseInt(row.dataset.level, 10);
//  trace("Row: "+row+" level: "+level);

  if (twistie.classList.contains("twistieao")) { // Hide all children (having level > row level)
    // Close twistie
    twistie.classList.replace("twistieao", "twistieac");
    curFldrOpenList[BTN_id] = false;
    saveFldrOpen();

    while ((row = row.nextElementSibling) != null) {
      if (parseInt(row.dataset.level, 10) <= level)
        break; // Stop when lower or same level
      row.hidden = true;
    }
  }
  else { // Open and unhide all direct children, plus only those under open sub-folders
    var last_open_level, cur_level, prev_level;
    var prev_row;

    // Open twistie
    twistie.classList.replace("twistieac", "twistieao");
    curFldrOpenList[BTN_id] = true;
    saveFldrOpen();

    last_open_level = prev_level = level + 1;
    while ((row = (prev_row = row).nextElementSibling) != null) {
      if ((cur_level = parseInt(row.dataset.level, 10)) <= level)
          break; // Stop when lower or same level
//      trace("Row: "+row+" cur_level: "+cur_level+" prev_level: "+prev_level);
      if (cur_level > prev_level) { // We just crossed a folder in previous row ..
        // Check if it was open or not
        twistie = prev_row.firstElementChild.firstElementChild.firstElementChild;
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
  var target = e.target; // Type depends ..
//  trace("Result click event: "+e.type+" target: "+target+" class: "+target.classList);
  if ((target.className != undefined)
	  && (target.className.length > 0)) {
//  if (resultsTable.rows.length > 0) {

    // The click target is one of .brow cell, .bkmkitem div,
    // .bkmkitem_x div or anchor, .favicon or .favttext
    // Handle click, and go to the parent row
    var className = target.className;
    if (className.startsWith("fav")) {
	  target = target.parentElement;
	  className = target.className;
    }
    if (className == "bkmkitem_b") { // An HTMLAnchorElement
	  e.preventDefault(); // We do not want the left click to open in a new tab ..
	                    // but in the active tab
	  var href = target.href;
	  if (href != undefined) {
	    browser.tabs.update({url: href});
	  }

      target = target.parentElement.parentElement.parentElement;
    }
    else if (className == "bkmkitem_f") {
	  target = target.parentElement.parentElement.parentElement;
	}
    else if (target.classList.contains("bkmkitem")) {
      target = target.parentElement.parentElement;
    }
    else { // Presumably the .brow cell
      target = target.parentElement;
    }

    // Make the source object visible .. and scroll to it
    handleResultClick(target);
  }
}

/*
 * Receive event from left clicks on bookmarks table
 *
 * e is of type MouseEvent (click)
 */
function bkmkMouseHandler (e) {
  var target = e.target; // Type depends ..
//  trace("Bookmark click event: "+e.type+" target: "+target+" class: "+target.classList);

  // The click target is one of .brow cell, .bkmkitem div, .twistiexx img (if folder),
  // .bkmkitem_x div or anchor, .favseparator div, .favicon or .favttext
  // Act only if the user clicked on .twistieax img, .bkmkitem_x, .favicon or .favtext
  // If favicon or favtext, get parent instead and handle click
  var twistie;
  var className = target.className;
  if (className.startsWith("fav")) {
	target = target.parentElement;
	className = target.className;
  }
  if (className == "bkmkitem_b") { // An HTMLAnchorElement
    e.preventDefault(); // We do not want the left click to open in a new tab ..
                        // but in the active tab
    var href = target.href;
    if (href != undefined) {
      browser.tabs.update({url: href});
    }
  }
  // If folder bkmkitem with active twistie, handle folder click
  else if ((className == "bkmkitem_f")
           && (twistie = target.previousElementSibling).className.startsWith("twistiea")) {
    handleFolderClick(twistie);
  }
  // If active twistie (folder with children), also go for folder action
  else if (className.startsWith("twistiea")) { // "twistieao" or "twistieac"
    handleFolderClick(target);
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
  var menuRect = menu.getBoundingClientRect();
  var height = menuRect.height;
  var width = menuRect.width;

  // Calculate proper position for full visibility, default being posY, posX
  var wh = window.innerHeight - 3;
  var ww = window.innerWidth - 3;
  if (posY + height > wh)
	if (posY >= height)   posY -= height;
	else   posY = wh - height;
  if (posX + width > ww)
	if (posX >= width)   posX -= width;
	else   posX = ww - width;

  // Display the context menu at calculated position
  menu.style.top = posY + "px";
  menu.style.left = posX + "px";
  menu.style.visibility = "visible";
}

/*
 * Clear any menu, if drawn
 */
function clearMenu () {
  if (myRBkmkMenu_open) {
    MyRBkmkMenuStyle.visibility = "hidden";
    myRBkmkMenu_open = false;
  }

  if (myBBkmkMenu_open) {
    MyBBkmkMenuStyle.visibility = "hidden";
    myBBkmkMenu_open = false;
  }

  if (myBFldrMenu_open) {
    MyBFldrMenuStyle.visibility = "hidden";
    myBFldrMenu_open = false;
  }

  if (myBSepMenu_open) {
    MyBSepMenuStyle.visibility = "hidden";
    myBSepMenu_open = false;
  }

  if (myBProtMenu_open) {
    MyBProtMenuStyle.visibility = "hidden";
    myBProtMenu_open = false;
  }
}

/*
 * Receive event from right clicks on results table, and display context menu
 * 
 * e is of type MouseEvent (contextmenu)
 */
function resultsContextHandler (e) {
  var target = e.target; // Type depends ..
//  trace("Result context event: "+e.type+" target: "+target+" class: "+target.classList);

  // If there is a previous menu, clear it
  clearMenu();

  if ((target.className != undefined)
	  && (target.className.length > 0)) {
    // Go up to the row level, and store the rowIndex and type in the menu as data- attribute
    var className = target.className;
    var row;
    if(className.includes("fav")) {
	  row = target.parentElement.parentElement.parentElement.parentElement;
    }
    else if (className.startsWith("bkmkitem_") || className.startsWith("twistie")) {
	  row = target.parentElement.parentElement.parentElement;
    }
    else if (className == "bkmkitem") {
	  row = target.parentElement.parentElement;
    }
    else { // .brow
	  row = target.parentElement;
    }

    // Determine proper menu from type, signal it is open,
    // and store the rowIndex in it as data-index attribute
    var type = row.dataset.type;
//    trace("Row: "+row+" rowIndex: "+row.rowIndex+" type: "+type);
    if (type == "bookmark") {
      myRBkmkMenu_open = true;
      MyRBkmkMenu.dataset.index = row.rowIndex;

      // Display the context menu function of click position
      drawMenu(MyRBkmkMenu, e.clientY, e.clientX);
    }
    // No menu for "folder"
  }
}

/*
 * Receive event from right clicks on bookmarks table, and display context menu
 * 
 * e is of type MouseEvent (contextmenu)
 */
function bkmkContextHandler (e) {
  var target = e.target; // Type depends ..
//  trace("Bookmark context event: "+e.type+" target: "+target+" class: "+target.classList);

  // Go up to the row level
  var className = target.className;
  var row;
  if(className.startsWith("fav")) {
	row = target.parentElement.parentElement.parentElement.parentElement;
  }
  else if (className.startsWith("bkmkitem_") || className.startsWith("twistie")) {
	row = target.parentElement.parentElement.parentElement;
  }
  else if (className == "bkmkitem") {
	row = target.parentElement.parentElement;
  }
  else { // .brow
	row = target.parentElement;
  }

  // If there is a previous menu, clear it
  clearMenu();

  // Determine proper menu from type, signal it is open,
  // and store the rowIndex in it as data-index attribute
  // If the clipboard is not empty, show "Paste"
  var type = row.dataset.type;
  var menu;
//  trace("Row: "+row+" rowIndex: "+row.rowIndex+" type: "+type);
  if (type == "bookmark") {
	if (row.dataset.protect == "true") { // Protected row
	  menu = MyBProtMenu;
      myBProtMenu_open = true;
	}
	else { // Non protected row
      menu = MyBBkmkMenu;
      if (bkmkClipboard != undefined) {
        if (MyBBkmkMenuPaste.className == "menupasted")
          MyBBkmkMenuPaste.className = "menupaste";
      }
      else {
        if (MyBBkmkMenuPaste.className == "menupaste")
    	  MyBBkmkMenuPaste.className = "menupasted";
      }
      myBBkmkMenu_open = true;
	}
  }
  else if (type == "folder") {
	if (row.dataset.protect != "true") { // Non protected row
      menu = MyBFldrMenu;
      if (bkmkClipboard != undefined) {
        if (MyBFldrMenuPaste.className == "menupasted")
    	  MyBFldrMenuPaste.className = "menupaste";
        if (MyBFldrMenuPasteInto.className == "menupastedinto")
          MyBFldrMenuPasteInto.className = "menupasteinto";
      }
      else {
        if (MyBFldrMenuPaste.className == "menupaste")
          MyBFldrMenuPaste.className = "menupasted";
        if (MyBFldrMenuPasteInto.className == "menupasteinto")
          MyBFldrMenuPasteInto.className = "menupastedinto";
      }
      myBFldrMenu_open = true;
	}
  }
  else if (type == "separator") {
	if (row.dataset.protect != "true") { // Non protected row
      menu = MyBSepMenu;
      if (bkmkClipboard != undefined) {
        if (MyBSepMenuPaste.className == "menupasted")
    	  MyBSepMenuPaste.className = "menupaste";
      }
      else {
        if (MyBSepMenuPaste.className == "menupaste")
    	  MyBSepMenuPaste.className = "menupasted";
      }
      myBSepMenu_open = true;
	}
  }

  if (menu != undefined) {
    menu.dataset.index = row.rowIndex;

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
 * Sets global variables rowDragged (HTMLRowElmeent) and BTNDragged (BookmarkTreeNode),
 * as well as the index min/max range indicating the no drop zone.
 */
var rowDragged;
var BTNDragged;
var noDropMinRowIndex = -1;
var noDropMaxRowIndex = -1;
function bkmkDragStartHandler (e) {
  rowDragged = e.target; // Should always be a [object HTMLTableRowElement] by construction
//  trace("Drag start event: "+e.type+" target: "+rowDragged+" class: "+rowDragged.classList);
//  trace("Draggable: "+rowDragged.draggable+" Protected: "+rowDragged.dataset.protect);
  if (rowDragged.dataset.protect != "true") {
    var BTN_id = rowDragged.dataset.id;
//    trace("BTN_id: "+BTN_id);
    // Now, get dragged BTN (promise)
    browser.bookmarks.get(BTN_id)
    .then(
	  function (a_BTN) { // Array of BookmarkTreeNode
	    BTNDragged = a_BTN[0]; // Assume we have only one element since we gave only one id
      }
    );

    // Get some text decribing what we are moving
    var type = rowDragged.dataset.type;
    var text;
    var isBookmark;
    var isFolder;
    if ((isFolder = (type == "folder"))
	    || (type == "separator")) {
      isBookmark = false;
      text = type;
    }
    else { // Bookmark
      var anchor = rowDragged.firstElementChild.firstElementChild.firstElementChild; // This is an HTMLAnchorElement
      isBookmark = true;
      text = anchor.href;
    }
    var className;
//    trace("Type: "+type+" text: "+text+" isBookmark: "+isBookmark);

    // Set the event dataTransfer
    var dt = e.dataTransfer;
    dt.setData("application/x-bookmark", BTN_id);
    if (isBookmark)
      dt.setData("text/uri-list", text);
    dt.setData("text/plain", text);
    dt.effectAllowed = "move";

    // Set drop forbidden zone
    if (isFolder) {
	  noDropMinRowIndex = rowDragged.rowIndex;
      var row = rowDragged;
      var level = parseInt(row.dataset.level, 10);
	  var next;
      while (((next = row.nextElementSibling) != null)
             && (parseInt(next.dataset.level, 10) > level)) {
	    row = next;	
	  }
	  noDropMaxRowIndex = row.rowIndex;
    }
    else {
	  noDropMinRowIndex = noDropMaxRowIndex = rowDragged.rowIndex;
    }
  }
}

/*
 * Drag end event handler. This is on the element which was in Drag start = HTMLTableRowElement
 * 
 * e = DragEvent
 */
function bkmkDragEndHandler (e) {
  var target = e.target;
  var dt = e.dataTransfer;
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
  var isSupported = false;

  // When the dragged element is one of our bookmarks its dt.types will be
  //   dt.types        : application/x-bookmark,[text/uri-list,]text/plain
  // When it is a tab, it will be
  //   dt.types        : text/x-moz-text-internal
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
var bkmkitem_x;
var isBkmkitem_f;
var isFolderClosed;
function getDragToRow (target) {
  var classList = target.classList;
  var className = target.className;
  var row;

  if (classList == undefined) { // Apparently drag enter events can be on the text inside Span..
	row = (bkmkitem_x = target.parentElement.parentElement).parentElement.parentElement.parentElement;
	if (isBkmkitem_f = (row.dataset.type == "folder")) {
      if (bkmkitem_x.previousElementSibling.classList.contains("twistieac"))
		isFolderClosed = true;
	  else   isFolderClosed = false;
	}
  }
  else if (className.startsWith("fav")) {
	row = (bkmkitem_x = target.parentElement).parentElement.parentElement.parentElement;
	if (isBkmkitem_f = (row.dataset.type == "folder")) {
	  if (bkmkitem_x.previousElementSibling.classList.contains("twistieac"))
		isFolderClosed = true;
	  else   isFolderClosed = false;
	}
  }
  else if (classList.contains("bkmkitem_f")) {
	row = (bkmkitem_x = target).parentElement.parentElement.parentElement;
	isBkmkitem_f = true;
    if (bkmkitem_x.previousElementSibling.classList.contains("twistieac"))
	  isFolderClosed = true;
	else   isFolderClosed = false;
  }
  else if (className.startsWith("bkmkitem_")) {
	row = (bkmkitem_x = target).parentElement.parentElement.parentElement;
	isBkmkitem_f = false;
  }
  else if (className.startsWith("twistie")) {
	row = target.parentElement.parentElement.parentElement;
	bkmkitem_x = target.nextElementSibling;
	isBkmkitem_f = true;
    if (classList.contains("twistieac"))
	  isFolderClosed = true;
	else   isFolderClosed = false;
  }
  else if (classList.contains("bkmkitem")) {
	row = target.parentElement.parentElement;
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
  else if (classList.contains("brow")) {
	row = target.parentElement;
	bkmkitem_x = target.firstElementChild.firstElementChild;
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
var openFolderTimerID = null;
function openFolderTimeoutHandler () {
  openFolderTimerID = null;
//  trace("Open folder event");
  // Fire event on bkmkitem_x
  var event = new MouseEvent ("click",
		                      {view: window,
	                           bubbles: true,
	                           cancelable: true
	                          }
  );
  var ret = bkmkitem_x.dispatchEvent(event);
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
var prevBkmkitem_x = null;
var prevInsertPos = undefined;
function highlightInsert (e) {
  var bkmkRect = bkmkitem_x.getBoundingClientRect();
  var style;
//  trace("x: "+bkmkRect.x+" y: "+bkmkRect.y+" left: "+bkmkRect.left+" top: "+bkmkRect.top+" right: "+bkmkRect.right+" bottom: "+bkmkRect.bottom+" width: "+bkmkRect.width+" height: "+bkmkRect.height)
//  trace("clientX: "+e.clientX+" clientY: "+e.clientY+" offsetX: "+e.offsetX+" offsetY: "+e.offsetY+" pageX: "+e.pageX+" pageY: "+e.pageY+" screenX: "+e.screenX+" screenY: "+e.screenY)
  var insertPos;
  var y = e.clientY; 

  if (isBkmkitem_f) { // We can drop inside a folder 
	if (y <= bkmkRect.top + bkmkRect.height / 4) {
      if (openFolderTimerID != null) { // Cancel timeout
		clearTimeout(openFolderTimerID);
		openFolderTimerID = null;
	  }
      insertPos = -1;
      // If changed from previous, update style (avoid to overload for nothing ..)
      if ((prevBkmkitem_x != bkmkitem_x) || (prevInsertPos != insertPos)) {
    	style = (prevBkmkitem_x = bkmkitem_x).style;
    	prevInsertPos = insertPos;
        style.borderTop = "1px solid #7BC3FF";
        style.background = "";
        style.borderBottomWidth = "0";
      }
	}
	else if (y >= bkmkRect.bottom - bkmkRect.height / 4) {
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
        style.borderBottom = "1px solid #7BC3FF";
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
        style.borderTop = "1px solid #7BC3FF";
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
        style.borderBottom = "1px solid #7BC3FF";
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
  var style = bkmkitem_x.style;
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
  var target = e.target;
  var dt = e.dataTransfer;
//  trace("Drag enter event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
  if (checkDragType(dt)
	  && ((target.className == undefined)  // When on Text, className and classList are undefined.
	      || (target.className.length > 0) // For some reason, when the mouse is over the lifts,
	                                       // an HTMLDivElement is returned which is none of what
	                                       // is inside BookmarksTree :-(
	     )
	 ) {
    // Get the enclosing row and bkmkitem_x inside it which we will highlight
    var row = getDragToRow(target);
//    trace("Enter row: "+row+" class: "+row.classList+" BTN_id: "+row.dataset.id);
//    trace("Bkmkitem_x: "+bkmkitem_x+" class: "+bkmkitem_x.classList);
    var index = row.rowIndex;
    if ((index >= noDropMinRowIndex) && (index <= noDropMaxRowIndex)
    	|| (row.dataset.protect == "true") // Protection, can't drop on non draggable elements = specials
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
  var target = e.target;
  var dt = e.dataTransfer;
//  trace("Drag over event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
  if (checkDragType(dt)
	  && ((target.className == undefined)  // When on Text, className and classList are undefined.
	      || (target.className.length > 0) // For some reason, when the mouse is over the lifts,
	                                       // an HTMLDivElement is returned which is none of what
	                                       // is inside BookmarksTree :-(
	     )
	 ) {
    // Get the enclosing row
    var row = getDragToRow(target);
//    trace("Over row: "+row+" class: "+row.classList+" BTN_id: "+row.dataset.id);
//    trace("Bkmkitem_x: "+bkmkitem_x+" class: "+bkmkitem_x.classList);
    var index = row.rowIndex;
    if ((index >= noDropMinRowIndex) && (index <= noDropMaxRowIndex)
       	|| (row.dataset.protect == "true") // Protection, can't drop on non draggable elements = specials
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
  var target = e.target;
  var dt = e.dataTransfer;
//  trace("Drag leave event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
  var targetType = Object.prototype.toString.call(target).slice(8, -1);
  if (checkDragType(dt)
      && (targetType != "HTMLDocument") // When we drop on a dropEffect=none zone (drop not fired)
	  && ((target.className == undefined)  // When on Text, className and classList are undefined.
	      || (target.className.length > 0) // For some reason, when the mouse is over the lifts,
	                                       // an HTMLDivElement is returned which is none of what
	                                       // is inside BookmarksTree :-(
	     )
	 ) {
    // Get the enclosing row
    var row = getDragToRow(target);
//    trace("Leave row: "+row+" class: "+row.classList+" BTN_id: "+row.dataset.id);
    var index = row.rowIndex;
    if (((index < noDropMinRowIndex) || (index > noDropMaxRowIndex))
    	&& (row.dataset.protect != "true") // Protection, can't drop on non draggable elements = specials
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
  var target = e.target;
  var dt = e.dataTransfer;
//  trace("Drag exit event: "+e.type+" target: "+target+" id: "+target.id+" class: "+target.classList);
  var targetType = Object.prototype.toString.call(target).slice(8, -1);
  if (checkDragType(dt)
      && (targetType != "HTMLDocument") // When we drop on a dropEffect=none zone (drop not fired)
	  && ((target.className == undefined)  // When on Text, className and classList are undefined.
	      || (target.className.length > 0) // For some reason, when the mouse is over the lifts,
	                                       // an HTMLDivElement is returned which is none of what
	                                       // is inside BookmarksTree :-(
	     )
	 ) {
    // Get the enclosing row
    var row = getDragToRow(target);
//    trace("Exit row: "+row+" class: "+row.classList+" BTN_id: "+row.dataset.id);
    var index = row.rowIndex;
    if (((index < noDropMinRowIndex) || (index > noDropMaxRowIndex))
       	&& (row.dataset.protect != "true") // Protection, can't drop on non draggable elements = specials
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
  var target = e.target;
  var dt = e.dataTransfer;
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
    var row = getDragToRow(target);
//    trace("Drop on row: "+row+" class: "+row.classList+" BTN_id: "+row.dataset.id);

    // Can't happen when in a dropEffect=none zone .. but in case, let's protect against it
    var index = row.rowIndex;
    if ((index < noDropMinRowIndex) || (index > noDropMaxRowIndex)) {
      // Highlight one last time to make sure we get latest insert position, then remove highlight
      var insertPos = highlightInsert(e);
      highlightRemove(e);

      // Now, get target BookmarkTreeNode
	  var BTN_id = row.dataset.id;
	  browser.bookmarks.get(BTN_id)
	  .then(
		function (a_BTN) { // Array of BookmarkTreeNode
		  var BTN = a_BTN[0]; // Assume we have only one element since we gave only one id

		  // Get data to drop, and insert / move it 
	      // When the dragged element is one of our bookmarks its dt.types will be
	      //   dt.types        : application/x-bookmark,[text/uri-list,]text/plain
	      // When it is a tab, it will be
	      //   dt.types        : text/x-moz-text-internal
	      // When it is a link in the HTML page:
	      //   dt.types        : text/x-moz-url,text/x-moz-url-data,text/x-moz-url-desc,text/uri-list,text/_moz_htmlcontext,text/_moz_htmlinfo,text/html,text/plain
		  var data;
	      if (dt.types.includes("application/x-bookmark")) {
		    data = dt.getData("application/x-bookmark");
		  }
	      else if (dt.types.includes("text/x-moz-text-internal")) {
	        data = dt.getData("text/x-moz-text-internal");
	  	  }
		  else if (dt.types.includes("text/uri-list")) {
		    data = dt.getData("text/uri-list");
		  }

/*	      var dataType = Object.prototype.toString.call(data).slice(8, -1);
		  trace("InsertPos: "+insertPos);
		  trace("Items dataType : "+dataType);
		  trace("Items data     : "+data);
	      trace("Items length   : "+dt.items.length);
	      for (let i=0 ; i<dt.items.length; i++) {
	        trace("... items["+i+"].kind = "+dt.items[i].kind + "; type = "+dt.items[i].type);
	      }
	      trace("Types length   : "+dt.types.length);
	      for (let i=0 ; i<dt.types.length; i++) {
	        var type = dt.types[i];
	        trace("... types["+i+"] = "+type);
	        data = dt.getData(type);
		    trace("... data["+type+"] = <<"+data+">>");
	      }
*/
	      if (dt.types.includes("application/x-bookmark")) { // Move the dragged bookmark
	    	if (insertPos == 0) { // Drop to a folder, add at end
	          browser.bookmarks.move(rowDragged.dataset.id,
			                         {parentId: BTN_id
			                         }
	          );
	    	}
	    	else if (insertPos == -1) { // Move just before target row
	    	  // Do nothing if we insert just after rowDragged and same parent == no move !
	    	  if ((row.rowIndex != rowDragged.rowIndex+1)
	    		  || (BTNDragged.parentId != BTN.parentId)) {
	    		// Be careful (not documented ...), if the boomark is moved after itself
	    		// under the same parent, the insertion index is to be numbered without it
	    		// => decrease target index by 1 (basically, the index is used after delete ..)
	    		var adjust = 0;
	    		if ((BTNDragged.parentId == BTN.parentId) // Same parent, so moving inside parent
	    			&& (BTNDragged.index < BTN.index)
	    		   ) {
	    		  adjust = -1;
	    		}
	    	    browser.bookmarks.move(rowDragged.dataset.id,
	    			                   {parentId: BTN.parentId,
	    		                        index: BTN.index + adjust
	    			                   }
	    	    );
	    	  }
	    	}
	    	else { // Move just after target row
	    	  // Do nothing if we insert just before rowDragged and same parent == no move !
	    	  if ((row.rowIndex != rowDragged.rowIndex-1)
	    		  || (BTNDragged.parentId != BTN.parentId)) {
	    		// Be careful (not documented ...), if the boomark is moved after itself
	    		// under the same parent, the insertion index is to be numbered without it
	    		// => decrease target index by 1 (basically, the index is used after delete ..)
	    		var adjust = 0;
	    		if ((BTNDragged.parentId == BTN.parentId) // Same parent, so moving inside parent
	    			&& (BTNDragged.index < BTN.index)
	    		   ) {
	    		  adjust = -1;
	    		}
	    	    browser.bookmarks.move(rowDragged.dataset.id,
	    			                   {parentId: BTN.parentId,
	    		                        index: BTN.index+1 + adjust
	    			                   }
	    	    );
	    	  }
	    	}
	      }
	      else if (dt.types.includes("text/x-moz-text-internal")) { // Dragging a tab to us
	        var url = dt.getData("text/x-moz-text-internal");
            // Bug in browser.tabs.query() !
	        // When there is a # in the url, it finds the open tab but returns an empty array :-(
	        // So lets remove the # part ..
	        var posDash = url.indexOf("#");
	        if (posDash != -1) {
	          url = url.slice(0, posDash);
	        }
//	        trace("Query tab for url: "+url)
	        // Get tab corresponding to url
	        browser.tabs.query({windowId: myWindowId, url: url})
	        .then (
	          function (a_tabs) {
//                trace("tabs length: "+a_tabs.length);
	        	var droppedTab = a_tabs[0]; // One URL => 1 tab, or only take first one
	        	                            // if multiple matches
	        	// Create new bookmark at insertion point
	        	uglyHackTabFavIconUrl = droppedTab.favIconUrl;
	        	var title = droppedTab.title;
	        	var url = droppedTab.url;
		    	if (insertPos == 0) { // Drop to a folder, add at end
		    	  browser.bookmarks.create(
					{parentId: BTN.id,
					 title: title,
					 type: "bookmark",
					 url: url
					}
				  );
			    }
			    else {
			      var index = BTN.index;
			      if (insertPos == 1) { // Create just after target row
			    	index++;
			      }
			      browser.bookmarks.create(
					{index: index,
					 parentId: BTN.parentId,
					 title: title,
					 type: "bookmark",
					 url: url
					}
				  );
			    }
			  }
	        );
	  	  }
		  else if (dt.types.includes("text/uri-list")) { // Dragging a page link to us
		    var url = dt.getData("text/uri-list");
		    var title = dt.getData("text/x-moz-url-desc");
		    if (title.length == 0)   title = url;

		    // Create new bookmark at insertion point
	    	if (insertPos == 0) { // Drop to a folder, add at end
	    	  browser.bookmarks.create(
				{parentId: BTN.id,
				 title: title,
				 type: "bookmark",
				 url: url
				}
			  )
			  .then(createBookmark);
		    }
		    else {
		      var index = BTN.index;
		      if (insertPos == 1) { // Create just after target row
		    	index++;
		      }
		      browser.bookmarks.create(
				{index: index,
				 parentId: BTN.parentId,
				 title: title,
				 type: "bookmark",
				 url: url
				}
			  )
			  .then(createBookmark);
		    }
		  }
		}
	  );
    }
  }
}

/*
 * Paste bookmark contents (recursively) at the designated place
 * 
 * BTN = BookmarkTreeNode to paste - If it is undefined, it signals last sibling reached at
 *       current recursion level.
 * newParentBTN = BookmarkTreeNode of new parent to paste into
 * index = integer position in parent
 * recurLevel (optional, default 0) = relative resursion level to initial paste - used to detect
 *                                    when to end
 * 
 * Relies on stackBTN, stackNewBTN and stackIndex global arrays to execute the recursion without
 * synchronous returns.
 */
var stackBTN;
var stackNewBTN;
var stackIndex
function pasteBkmk (BTN, newParentBTN, index, recurLevel = 0) {
//  var t1 = new Date();
//  trace(t1.getTime()+" Paste BTN: "+BTN+" Parent: "+newParentBTN+" index: "+index+" recur: "+recurLevel);
  if (BTN != undefined) { // Initial call or recursive call
    if (recurLevel == 0) { // First and only node at top
	  stackBTN = [];
	  stackNewBTN = [];
	  stackIndex = [];
    }
    // Create BTN at designated place
    browser.bookmarks.create(
	  {index: index,
       parentId: newParentBTN.id,
	   title: BTN.title,
	   type: BTN.type,
	   url: BTN.url
	  }
    )
    .then(
      function (newBTN) { // Created BookmarkTreeNode
//        var t2 = new Date();
//        trace(t2.getTime()+" Paste node creation delay: "+(t2.getTime() - t1.getTime()));
        var children = BTN.children;
        if ((children != undefined) && (children.length > 0)) { // There are children ...
    	  stackBTN.push(BTN); // Remember it for when we go up from depth first exploration
    	  stackNewBTN.push(newParentBTN);
          stackIndex.push(index);
          pasteBkmk(children[0], newBTN, 0, recurLevel+1);
        }
        else if (recurLevel > 0) { // There can be siblings at that recursion level
          var parentBTN = stackBTN[stackBTN.length-1];
          children = parentBTN.children;
          if (++index < children.length) { // There are siblings ..
            pasteBkmk(children[index], newParentBTN, index, recurLevel);
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
	BTN = stackBTN.pop();
    var parentBTN = stackBTN[stackBTN.length-1];
	newParentBTN = stackNewBTN.pop();
	index = stackIndex.pop();

	// See if there are siblings at that level
	var children = parentBTN.children;
	if (++index < children.length) { // There are siblings ..
      pasteBkmk(children[index], newParentBTN, index, recurLevel);
    }
    else if (recurLevel > 1) { // It was the last child of its parent,
    	                       // and parent may have more siblings to explore
        // Go back one level and get next sibling of parent
      pasteBkmk(undefined, undefined, undefined, recurLevel-1);
    }
  }
}

/*
 * Retrieve row on which a context menu was open
 * 
 * menu is an HTMLDivElement
 * 
 * Returns the row in context
 */
function getRow (menu) {
  var rowIndex = parseInt(menu.dataset.index, 10);
  var row;
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
//  var popupURL = browser.extension.getURL("sidebar/popup.html");
  // Did not find a good way to get a modal dialog so far :-(
  // 1) var sign = prompt("What's your sign?");
  //    creates a modal inside the sidebar, half hidden if the sidebar is not large enough. 
  // 2) It appears window.open works outside of the .then, but not inside !!
  //    I do not understand why ..
  //    Anyway, "modal" is ignored, and I can't figure how to get
  //    the UniversalBrowserWrite privilege so far .. :-(
  //    window.open(popupURL, "_blank", "dialog,modal,height=200,width=200");
  // So using browser.windows instead, which is not modal, and which is resizeable.
  // Truncate title to just before "?" if it has one
  var title = BTN.title;
  var paramPos = title.indexOf("?");
  if (paramPos != -1) {
	title = title.slice(0, paramPos);
  }
  browser.windows.create(
    {titlePreface: "New bookmark",
	 type: "popup",
//	 type: "detached_panel",
	 // Using a trick with URL parameters to tell the window which type
     // it is, which bookmark id, .. etc .. since titlePreface doesn't appear to work
	 // and there appears to be no way to pass parameters to the popup by the call. 
	 url: PopupURL+"?type=newbkmk&id="+BTN.id+"&title="+title+"&url="+BTN.url,
	 height: 150,
	 width: 375,
	 left: 300,
	 top: 300,
	 allowScriptsToClose: true
	}
/*  )
  .then(
    function (wInfo) {
      console.log("Id: "+wInfo.id+" Title: "+wInfo.title+" Type: "+wInfo.type);
    }
*/
  );
}

/*
 * Upon Folder creation menu event, open Window to let the user enter values in fields
 * 
 * BTN is of type BookmarkTreeNode (promise from browser.bookmarks.create())
 */
function createFolder (BTN) {
  browser.windows.create(
    {titlePreface: "New folder",
	 type: "popup",
//	 type: "detached_panel",
	 // Using a trick with URL parameters to tell the window which type
     // it is, which bookmark id, .. etc .. since titlePreface doesn't appear to work
	 // and there appears to be no way to pass parameters to the popup by the call. 
	 url: PopupURL+"?type=newfldr&id="+BTN.id+"&title="+BTN.title,
	 height: 150,
	 width: 375,
	 left: 300,
	 top: 300,
	 allowScriptsToClose: true
	}
  );
}

/*
 * Receive event from clicks anywhere in the sidebar panel, and also handle
 * menu actions
 * 
 * e is of type MouseEvent (click, but apparently works also with right clicks .. 
 *   still saying "click" .. wonder why)
 */
function clickHandler (e) {
  var target = e.target; // Type depends ..
  var classList = target.classList;
//  trace("General click event: "+e.type+" target: "+target+" class: "+target.classList);

  if (!classList.contains("menupasted")) { // Click on a disabled menu paste element
	                                       // won't have any action
	                                       // and won't make the menu disappear
	var menuAction = false;  
    // If a menu action is clicked, handle it
	if (classList.contains("menuopen")) { // Open bookmark in active tab
	  // Retrieve parent context menu, and the rowIndex on which it is
	  menuAction = true;
	  var row = getRow(target.parentElement);
	  // Get anchor href
      var href = row.firstElementChild.firstElementChild.firstElementChild.href;
	  if ((href != undefined) && (href.length > 0)) {
	    browser.tabs.update({url: href});
	  }
	}
	else if (classList.contains("menuopentab")) { // Open bookmark in a new tab
	  // Retrieve parent context menu, and the rowIndex on which it is
	  menuAction = true;
	  var row = getRow(target.parentElement);
	  // Get anchor href
	  var href = row.firstElementChild.firstElementChild.firstElementChild.href;
	  if ((href != undefined) && (href.length > 0)) {
		// Get current active tab as opener id to come back to it when closing the new tab
        browser.tabs.query({windowId: myWindowId, active: true})
        .then (
          function (a_tabs) {
		    browser.tabs.create({url: href, openerTabId: a_tabs[0].id});
		  }
        );
	  }
	}
	else if (classList.contains("menuopenwin")) { // Open bookmark in a new Window
	  // Retrieve parent context menu, and the rowIndex on which it is
	  menuAction = true;
	  var row = getRow(target.parentElement);
	  // Get anchor href
	  var href = row.firstElementChild.firstElementChild.firstElementChild.href;
	  if ((href != undefined) && (href.length > 0)) {
		// The second method disables any sidebar as it seems ... so can't use it
	    browser.windows.create({url: href});
//		window.open(href, "_blank", "menubar,toolbar,location,scrollbars");
	  }
	}
	else if (classList.contains("menuopenpriv")) { // Open bookmark in a new private Window
	  // Retrieve parent context menu, and the rowIndex on which it is
	  menuAction = true;
	  var row = getRow(target.parentElement);
	  // Get anchor href
	  var href = row.firstElementChild.firstElementChild.firstElementChild.href;
	  if ((href != undefined) && (href.length > 0)) {
	    browser.windows.create({url: href, incognito: true});
	  }
	}
	else if (classList.contains("menunewb")) { // Create a new bookmark
	  // Can only be on bookmarks table row
	  menuAction = true;
	  var rowIndex = parseInt(target.parentElement.dataset.index, 10);
	  var row = bookmarksTable.rows[rowIndex];
	  // Retrieve bookmark item in that row
	  var BTN_id = row.dataset.id;
	  browser.bookmarks.get(BTN_id)
	  .then(
		function (a_BTN) { // Array of BookmarkTreeNode
		  var BTN = a_BTN[0]; // Assume we have only one element since we gave only one id

		  // Create new bookmark just before
		  browser.bookmarks.create(
			{index: BTN.index,
			 parentId: BTN.parentId,
			 title: "New bookmark",
			 type: "bookmark",
			 url: "about:blank"
			}
		  )
		  .then(createBookmark);
		}
	  );
	}
	else if (classList.contains("menunewf")) { // Create a new folder
	  // Can only be on bookmarks table row
	  menuAction = true;
	  var rowIndex = parseInt(target.parentElement.dataset.index, 10);
	  var row = bookmarksTable.rows[rowIndex];
	  // Retrieve bookmark item in that row
	  var BTN_id = row.dataset.id;
	  browser.bookmarks.get(BTN_id)
	  .then(
		function (a_BTN) { // Array of BookmarkTreeNode
		  var BTN = a_BTN[0]; // Assume we have only one element since we gave only one id

		  // Create new bookmark just before
		  browser.bookmarks.create(
			{index: BTN.index,
			 parentId: BTN.parentId,
			 title: "New folder",
			 type: "folder"
			}
		  )
		  .then(createFolder);
		}
	  );
	}
	else if (classList.contains("menunews")) { // Create a new separator
	  // Can only be on bookmarks table row
	  menuAction = true;
	  var rowIndex = parseInt(target.parentElement.dataset.index, 10);
	  var row = bookmarksTable.rows[rowIndex];
	  // Retrieve bookmark item in that row
	  var BTN_id = row.dataset.id;
	  browser.bookmarks.get(BTN_id)
	  .then(
		function (a_BTN) { // Array of BookmarkTreeNode
		  var BTN = a_BTN[0]; // Assume we have only one element since we gave only one id
		  browser.bookmarks.create(
		    {index: BTN.index,
		     parentId: BTN.parentId,
		     type: "separator"
		    }
		  );
		}
	  );
	}
	else if (classList.contains("menucut")) { // Cut a bookmark item into bkmkClipboard
	  // Can only happen on bookmarks table row, retrieve the rowIndex from the menu
	  menuAction = true;
	  var rowIndex = parseInt(target.parentElement.dataset.index, 10);
	  var row = bookmarksTable.rows[rowIndex];
	  // Retrieve bookmark item in that row and its contents
	  var BTN_id = row.dataset.id;
	  browser.bookmarks.getSubTree(BTN_id)
	  .then(
		function (a_BTN) { // Array of BookmarkTreeNode
		  bkmkClipboard = a_BTN[0]; // Assume we have only one element since we gave only one id
		  browser.bookmarks.removeTree(BTN_id);
/*		  trace("clipboard: "+bkmkClipboard.id+" "+bkmkClipboard.title+" "+bkmkClipboard.type+" "+bkmkClipboard.index+" "+bkmkClipboard.children+" "+bkmkClipboard.url);
		  if (bkmkClipboard.children != undefined)
			for (let i of bkmkClipboard.children) {
			  trace("clipboard: "+i.id+" "+i.title+" "+i.type+" "+i.index+" "+i.children+" "+i.url);
			}
*/
		}
	  );
	}
	else if (classList.contains("menucopy")) { // Copy a bookmark item into bkmkClipboard
	  // Can only happen on bookmarks table row, retrieve the rowIndex from the menu
	  menuAction = true;
	  var rowIndex = parseInt(target.parentElement.dataset.index, 10);
	  var row = bookmarksTable.rows[rowIndex];
	  // Retrieve bookmark item in that row and its contents
	  var BTN_id = row.dataset.id;
	  browser.bookmarks.getSubTree(BTN_id)
	  .then(
		function (a_BTN) { // Array of BookmarkTreeNode
		  bkmkClipboard = a_BTN[0]; // Assume we have only one element since we gave only one id
		}
	  );
	}
	else if (classList.contains("menupaste")) { // Paste bkmkClipboard contents before the row
		                                        // Clear bkmkClipboard after that, as we want
		                                        // to paste only once.
	  // Can only happen on bookmarks table row, retrieve the rowIndex from the menu
	  menuAction = true;
	  var rowIndex = parseInt(target.parentElement.dataset.index, 10);
	  var row = bookmarksTable.rows[rowIndex];
	  // Retrieve bookmark item in that row
	  var BTN_id = row.dataset.id;
	  browser.bookmarks.get(BTN_id)
	  .then(
		function (a_BTN1) { // Array of BookmarkTreeNode
		  var BTN = a_BTN1[0]; // Assume we have only one element since we gave only one id

		  // Retrieve parent of that bookmark item as we have to insert just before that BTN
		  browser.bookmarks.get(BTN.parentId)
		  .then(
			function (a_BTN2) { // Array of BookmarkTreeNode
			  var parentBTN = a_BTN2[0]; // Assume we have only one element since we gave only one id

			  // Paste clipboard contents at BTN.index (then just before BTN) under that parent
			  pasteBkmk(bkmkClipboard, parentBTN, BTN.index);
			  bkmkClipboard = undefined; // Empty bkmkClipboard
			}
		  );
		}
	  );
	}
	else if (classList.contains("menupasteinto")) { // Paste bkmkClipboard contents in folder
                                                    // Clear bkmkClipboard after that, as we want
                                                    // to paste only once.
      // Can only happen on bookmarks table folder rows, retrieve the rowIndex from the menu
	  menuAction = true;
      var rowIndex = parseInt(target.parentElement.dataset.index, 10);
      var row = bookmarksTable.rows[rowIndex];
      // Retrieve bookmark item in that row
      var BTN_id = row.dataset.id;
      browser.bookmarks.get(BTN_id)
      .then(
        function (a_BTN) { // Array of BookmarkTreeNode
          var folderBTN = a_BTN[0]; // Assume we have only one element since we gave only one id

          // Paste clipboard contents at end of folder
          pasteBkmk(bkmkClipboard, folderBTN, folderBTN.length);
          bkmkClipboard = undefined; // Empty bkmkClipboard
        }
      );
    }
	else if (classList.contains("menudel")) { // Delete a bookmark item
	  // Can only happen on bookmarks table row, retrieve the rowIndex from the menu
	  menuAction = true;
	  var rowIndex = parseInt(target.parentElement.dataset.index, 10);
	  var row = bookmarksTable.rows[rowIndex];
	  // Delete bookmark item in that row
	  var BTN_id = row.dataset.id;
	  browser.bookmarks.removeTree(BTN_id);
	}
	else if (classList.contains("menurefreshfav")) { // Refresh favicon
      // Can only happen on bookmarks table bookmark row, retrieve the rowIndex from the menu
	  menuAction = true;
	  var rowIndex = parseInt(target.parentElement.dataset.index, 10);
	  var row = bookmarksTable.rows[rowIndex];
	  // Refresh favicon of that bookmark item
	  var BTN_id = row.dataset.id;
      browser.bookmarks.get(BTN_id)
      .then(
        function (a_BTN) { // Array of BookmarkTreeNode
          var BTN = a_BTN[0]; // Assume we have only one element since we gave only one id

          // Trigger asynchronous favicon retrieval process
          if (!BTN.url.startsWith("about:")) { // about: is protected - security error ..
            faviconWorker.postMessage(["get2", BTN]);
          }
        }
      );
	}
	else if (classList.contains("menuprop")) { // Edit properties of an existing bookmark
	  // Can only be on bookmarks table row
	  menuAction = true;
	  var rowIndex = parseInt(target.parentElement.dataset.index, 10);
	  var row = bookmarksTable.rows[rowIndex];
	  // Retrieve bookmark item in that row
	  var BTN_id = row.dataset.id;
	  browser.bookmarks.get(BTN_id)
	  .then(
		function (a_BTN) { // Array of BookmarkTreeNode
		  var BTN = a_BTN[0]; // Assume we have only one element since we gave only one id

		  // Open popup on bookmark item
		  var url;
		  if (BTN.type == "folder") {
			url = PopupURL+"?type=propfldr&id="+BTN.id+"&title="+BTN.title;
		  }
		  else {
			url = PopupURL+"?type=propbkmk&id="+BTN.id+"&title="+BTN.title+"&url="+BTN.url;
		  }
          url = encodeURI(url);
		  browser.windows.create(
		    {titlePreface: "Properties of « "+BTN.title+" »",
					 type: "popup",
//					 type: "detached_panel",
					 // Using a trick with URL parameters to tell the window which type
				     // it is, which bookmark id, .. etc .. since titlePreface doesn't appear to work
					 // and there appears to be no way to pass parameters to the popup by the call. 
					 url: url,
					 height: 150,
					 width: 375,
					 left: 300,
					 top: 300,
					 allowScriptsToClose: true
					}
				/*  )
				  .then(
				    function (wInfo) {
				      console.log("Id: "+wInfo.id+" Title: "+wInfo.title+" Type: "+wInfo.type);
				    }
				*/
				  );
		}
	  );
	}

    if ((e.button != 2) || menuAction || (classList == undefined) || (classList.length == 0)) {
      // Clear open menus on left click, or on right click on (a menu action or oustide
      // bookmarks or results).
      // Indeed, sometimes, the "click" Handler is called after the "context" Handler :-(
      // (in Linux at least)
      clearMenu();
    }
  }
}

/*
 * Prevent default context menus except in a few places
 */
function noDefaultContextMenu (e) {
  var target = e.target; // Type depends ..
//  trace("General context right click event: "+e.type+" target: "+target+" class: "+target.classList);

  // Prevent default context menu except in the search box and in the trace box
  var targetObjectType = Object.prototype.toString.call(target).slice(8, -1);
  if ((targetObjectType != "HTMLInputElement")
      && (targetObjectType != "HTMLTextAreaElement")
     ) {
    e.preventDefault();
  }
}

/*
 * Complete the bookmarks table at end of initial display process
 */
function completeBookmarks () {
  WaitingImg.hidden = true; // Stop displaying the waiting glass
  Bookmarks.appendChild(docFragment); // Display the table of bookmarks + reflow

  // Save current info
  saveBkmkUri();
  saveFldrOpen();

  // Cleanup saved info and release memory, all is now maintained in cur... lists
  savedBkmkUriList = undefined;
  savedFldrOpenList = undefined;
  bookmarksTree = undefined;

  // Setup mouse handlers for bookmarks and results
  SearchResult.addEventListener("click", resultsMouseHandler);
  Bookmarks.addEventListener("click", bkmkMouseHandler);
  SearchResult.addEventListener("contextmenu", resultsContextHandler);
  Bookmarks.addEventListener("contextmenu", bkmkContextHandler);

  // General event handlers for a click anywhere in the document .. used to clear menus
  // and prevent default menus
  addEventListener("click", clickHandler);
  addEventListener("contextmenu", noDefaultContextMenu);

  // Event handlers for drag & drop
  Bookmarks.addEventListener("dragstart", bkmkDragStartHandler);
  Bookmarks.addEventListener("dragend", bkmkDragEndHandler);
//  row.ondragenter = bkmkDragEnterHandler;
  Bookmarks.addEventListener("dragenter", bkmkDragEnterHandler);
  Bookmarks.addEventListener("dragover", bkmkDragOverHandler);
  Bookmarks.addEventListener("dragleave", bkmkDragLeaveHandler);
  Bookmarks.addEventListener("dragexit", bkmkDragExitHandler);
  Bookmarks.addEventListener("drop", bkmkDropHandler);

  // Setup event handlers for bookmark modifications
  browser.bookmarks.onCreated.addListener(bkmkCreatedHandler);
  browser.bookmarks.onRemoved.addListener(bkmkRemovedHandler);
  browser.bookmarks.onChanged.addListener(bkmkChangedHandler);
  browser.bookmarks.onMoved.addListener(bkmkMovedHandler);
  // onChildrenReordered doesn't seem implemented for now ... :-(
  // It apears to use a sequence of Move instead ...
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1319530 ??
  if (browser.bookmarks.onChildrenReordered != undefined) {
    browser.bookmarks.onChildrenReordered.addListener(bkmkReorderedHandler);
  }

  // Trace stats
  trace("Stats:\r\n------");
  trace("Bookmarks:  "+countBookmarks);
  trace("Folders:    "+countFolders);
  trace("Separators: "+countSeparators);
  trace("--------------------");
//  var computedStyle = window.getComputedStyle(MyBProtMenu, null);
//  for (let prop in computedStyle) {
//    trace(prop+" = '"+computedStyle[prop]+"'");
//  }
}

 /*
 * Receive event from worker to display a new bookmark
 *
 * e is of type MessageEvent, containing a [BTN, level]
 */
function asyncDisplayBookmark (e) {
//  trace("asyncDisplayBookmark");
  var level = e.data[1];
  if (level == -1) { // Reached the end of the table, this is the last async event to close
    completeBookmarks();
  }
  else   insertBookmark(e.data[0], level);
}

/*
 * Recursively explore a bookmark and its children
 *
 * BTN = BookmarkTreeNode
 * level = integer, the tree depth
 */
function exploreTree (BTN, level) {
  insertBookmark(BTN, level);

  // If there are children, recursively display them
  if ((BTN.type == "folder") && (BTN.children != undefined)) {
    for (let i of BTN.children) {
      exploreTree(i, level+1);
    }
  }
}

/*
 * Search for and recursively display a bookmark of a given id in the array
 *
 * a_BTN = array of BookmarkTreeNode
 * id = string, the node id looked for
 * level = integer, the tree depth
 */
function displayBookmarkId (a_BTN, id, level) {
  for (let i of a_BTN) {
    if (i.id == id) {
      exploreTree(i, level);
      break;
    }
  }
}

/*
 * Display the bookmarks tree inside the sidebar table
 *
 * Use a worker to recursively explore the tree.
 * Then the worker posts back each bookmark to display (append).
 * The worker will send back messages of type [BTN, level].
 * At the end, it will wend a final [null, -1] and close itself, no need to terminate it.
 */
function displayBookmarksTable () {
  var root = bookmarksTree[0]; // Id is "root________" and type is "folder"
  //  trace("Root: <<"+root.id+">>"+"<<"+root.title+">>"+"<<"+root.type+">>");

  // Create a Document Fragment to go faster (work is in memory only, no reflow.
  // It will get appended at end, when last bookmark item is created
  docFragment = document.createDocumentFragment();
  bookmarksTable = document.createElement("table");
  docFragment.appendChild(bookmarksTable);

  highest_open_level = 0;
  if (asyncLoad_option) { // If load bookmarks in non-blocking mode ..
    // Prepare worker to explore and display bookmarks tree
    bkmkWorker = new Worker("initTree.js");
    bkmkWorker.onmessage = asyncDisplayBookmark;

    // Start worker
    bkmkWorker.postMessage(root);
  }
  else {
    // First, display the Personal toolbar  "toolbar_____"
    displayBookmarkId(root.children, PersonalToobar, 0);
    // Then, display the Bookmarks menu     "menu________"
    displayBookmarkId(root.children, BookmarksMenu, 0);
    // And last, display the Other bookmarks    "unfiled_____"
    displayBookmarkId(root.children, OtherBookmarks, 0);

    completeBookmarks();
  }
}

/*
 * Store promised bookmark tree in a global variable,
 * then display it in the bookmarks table
 *
 * a_BTN = array of BookmarkTreeNode
 */
function storeAndDisplayTree (a_BTN) {
//  trace("storeAndDisplayTree");
  bookmarksTree = a_BTN;
  displayBookmarksTable();
}

/*
 * Log error
 *
 * error is whatever the Promise sent as error ... don't want to guess
 */
function onRejected (error) {
  console.log("BookmarkSearchPlus2 error: "+error);
  trace("BookmarkSearchPlus2 error: <<"+error+">>");
}

/*
 * Set Favicon on screen and in storage
 *
 * BTN is BookmarktreeNode
 * uri is the image to set
 */
function setFavicon (BTN, uri) {
  var index = curRowIndexList[BTN.id]; // Rerieve index of row holding the icon
  var row = bookmarksTable.rows[index];
//  trace("BTN.id: "+BTN.id+" index: "+index+" Row id: "+row.dataset.id);
  var img = row.firstElementChild.firstElementChild.firstElementChild.firstElementChild;
  img.src = uri;

  // Save new icon
  curBkmkUriList[BTN.id] = uri;
  saveBkmkUri();
}

/*
 * Set Favicon on screen to waiting its new value
 *
 * BTN is BookmarktreeNode
 */
function setWaitingFavicon (BTN) {
  var index = curRowIndexList[BTN.id]; // Rerieve index of row holding the icon
  var row = bookmarksTable.rows[index];
//  trace("BTN.id: "+BTN.id+" index: "+index+" Row id: "+row.dataset.id+" set to waiting");
  var img = row.firstElementChild.firstElementChild.firstElementChild.firstElementChild;
  img.src = "/icons/waiting.gif";
}

/*
 * Set Favicon on screen to nofavicon.png
 *
 * BTN is BookmarktreeNode
 */
function setNoFavicon (BTN) {
  var index = curRowIndexList[BTN.id]; // Rerieve index of row holding the icon
  var row = bookmarksTable.rows[index];
  var uri = curBkmkUriList[BTN.id] = "/icons/nofavicon.png";
//  trace("BTN.id: "+BTN.id+" index: "+index+" Row id: "+row.dataset.id+" uri: "+uri);
  var img = row.firstElementChild.firstElementChild.firstElementChild.firstElementChild;
  img.src = uri;

  // Save new icon
  curBkmkUriList[BTN.id] = uri;
  saveBkmkUri();
}

/*
 * Favicon background retrieval process
 *
 * e is of type MessageEvent, containing a [BTN, uri]
 */
function asyncFavicon (e) {
  var BTN = e.data[0]; // BookmarkTreeNode
  var uri = e.data[1]; // String
  trace("Async uri received for BTN.id: "+BTN.id+" url: "+BTN.url+" uri: <<"+uri.substr(0,50)+">>");

  // Refresh display of the icon, and save it
  if (uri.startsWith("error:")) { // Got an error ... trace it
    trace("Error on getting favicon for "+BTN.id+":\r\n"
          +"title: "+BTN.title+"\r\n"
          +"url:   "+BTN.url+"\r\n"
          +uri+"\r\n"
          +"--------------------");
    setNoFavicon(BTN);
  }
  else if (uri.startsWith("starting:")) { // We started retrieving a new favicon, signal it
                                          // on the bookmarks table by a "waiting" icon
    setWaitingFavicon(BTN);
  }
  else if (!uri.startsWith("data:image/")
           && !uri.startsWith("data:application/octet-stream")
           && !uri.startsWith("data:text/plain")
           && !uri.startsWith("data:text/html")
           && !uri.startsWith("/icons/")
          ) { // Received another data type than image ...!
    trace("Didn't get an image on favicon for "+BTN.id+":\r\n"
          +"url:   "+BTN.url+"\r\n"
          +uri+"\r\n"
          +"--------------------");
    setNoFavicon(BTN);
  }
  else { // Valid URI returned
    setFavicon(BTN, uri);
  }
}

/*
 * When a tab gets new contents, very its URL and if matching, get its Favicon
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
  if (tabInfo.status == "complete") {
    var tabUrl = tabInfo.url;
    var tabFaviconUrl = tabInfo.favIconUrl;

//    trace("A tab was updated - tabUrl: "+tabUrl+" tabFaviconUrl: "+tabFaviconUrl);
    if ((tabUrl != undefined) && (tabFaviconUrl != undefined)
    	&& (!tabUrl.startsWith("moz-extension://"))
    	&& (!tabUrl.startsWith("about:"))
       ) {
      // Look for a bookmark matching the url
      var searching = browser.bookmarks.search({url: tabUrl})
      .then(
        function (a_BTN) { // An array of BookmarkTreeNode
//          trace("Results: "+a_BTN.length);
          for (let i of a_BTN) {
//            trace("Matching BTN.id: "+i.id+" "+i.url);
            // Load the favicon as a data: URI
            if (tabFaviconUrl.startsWith("data:")) { // Cool, already in good format for us !
              setFavicon(i, tabFaviconUrl);
            }
            else {
              faviconWorker.postMessage(["icon:"+tabFaviconUrl, i]);
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
trace("onVisited event: "+historyItem.url);
  if (historyItem.url.startsWith(PopupURL)) {
trace("here");
    browser.history.deleteUrl({url: historyItem.url});
  }
}


/*
 * Main code:
 * ----------
*/
// Retrieve Platform, and config options
browser.runtime.getPlatformInfo().then(function(info){
  platformOs = info.os;
  var gettingItem = browser.storage.local.get(["asyncLoad_option"
                                               ,"traceEnabled_option"
                                               ,"savedBkmkUriList"
                                               ,"savedFldrOpenList"
                                              ]);
  gettingItem.then((res) => {
    if (res.asyncLoad_option != undefined) {
      if (res.asyncLoad_option == "true") {
        asyncLoad_option = true;
      }
    }
    if (res.traceEnabled_option != undefined) {
      if (res.traceEnabled_option == "true") {
        traceEnabled_option = true;
        TracePlace.hidden = false;
      }
    }

    // Some variations depending on platform
    trace("PlatformOs: "+platformOs);
    if (platformOs == "linux") {
	  trace("Setting Linux variations");
	  Body.style.fontSize = "12px";
	  SearchTextInput.style.fontSize = "12px";
	  MyRBkmkMenuStyle.width = "170px";
      MyBBkmkMenuStyle.width = "170px";
	  MyBFldrMenuStyle.width = "170px";
	  MyBSepMenuStyle.width = "170px";
	  MyBProtMenuStyle.width = "170px";
    }

    if (res.savedBkmkUriList != undefined) {
      savedBkmkUriList = res.savedBkmkUriList;
    }
    if (res.savedFldrOpenList != undefined) {
      savedFldrOpenList = res.savedFldrOpenList;
    }

    // Get Id of the window the sidebar is running in
    // Note: there is an instance of sidebar run in each window as it seems
    browser.windows.getCurrent(
//                               {populate: true	
//                               }
    )
    .then(
      (windowInfo) => {
        myWindowId = windowInfo.id;
      }
    );

    // Catch changes to the search box contents
    // (including when we clear its contents programmatically ..)
    SearchTextInput.addEventListener("input", manageSearchTextHandler);

    // Catch clicks on the Cancel search button
    CancelSearchInput.addEventListener("click", clearSearchTextHandler);
//    CancelSearchInput.addEventListener("contextmenu", contextSearchTextHandler);

    // Start the favicon worker
    faviconWorker = new Worker("favicon.js");
    faviconWorker.onmessage = asyncFavicon;

    // Get the boorkmarks tree and display it
    var getTree = browser.bookmarks.getTree();
    getTree.then(storeAndDisplayTree, onRejected);

    // Watch for tabs loading new URL's .. if one matches one of our bookmarks,
    // then get the favicon from that tab and refresh our bookmarks table and saved storage
    // with it.
    browser.tabs.onUpdated.addListener(tabModified);

    // Make sure sidebar.popup.html does not polute history
    browser.history.onVisited.addListener(onVisited);
  });
});