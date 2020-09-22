'use strict';


//Retrieve Platform and Background page
let p_platform = browser.runtime.getPlatformInfo();
let p_background = browser.runtime.getBackgroundPage();
let p_ffversion = browser.runtime.getBrowserInfo();
let p_getWindowId = browser.windows.getCurrent(
//  {populate: true	
//  }
);


/*
 * Constants
 */
const Performance = window.performance;
const Body = document.querySelector("#body"); // Assuming it is an HTMLBodyElement
const HPane = document.querySelector("#pane"); // Assuming it is an HTMLDivElement
const HNode = document.querySelector("#node"); // Assuming it is an HTMLDivElement
const HActions = document.querySelector("#actions"); // Assuming it is an HTMLDivElement
const Bookmarks = document.querySelector("#bookmarks"); // Assuming it is an HTMLDivElement
const NDNum = document.querySelector("#ndnum"); // Assuming it is an HTMLSpanElement
const NDTimestamp = document.querySelector("#ndtimestamp"); // Assuming it is an HTMLSpanElement
const NDAction = document.querySelector("#ndaction"); // Assuming it is an HTMLSpanElement
const NDState = document.querySelector("#ndstate"); // Assuming it is an HTMLSpanElement
const NDBNId = document.querySelector("#ndbnid"); // Assuming it is an HTMLDivElement
const NDType = document.querySelector("#ndtype"); // Assuming it is an HTMLDivElement
const NDParentId = document.querySelector("#ndparentid"); // Assuming it is an HTMLDivElement
const NDIndex = document.querySelector("#ndindex"); // Assuming it is an HTMLDivElement
const NDPath = document.querySelector("#ndpath"); // Assuming it is an HTMLDivElement
const NDTitle = document.querySelector("#ndtitle"); // Assuming it is an HTMLDivElement
const NDFavicon = document.querySelector("#ndfavicon"); // Assuming it is an HTMLDivElement
const NDUrl = document.querySelector("#ndurl"); // Assuming it is an HTMLDivElement
const NDChildIds = document.querySelector("#ndchildids"); // Assuming it is an HTMLDivElement
const NDToParentId = document.querySelector("#ndtoparentid"); // Assuming it is an HTMLDivElement
const NDToIndex = document.querySelector("#ndtoindex"); // Assuming it is an HTMLDivElement
const NDToPath = document.querySelector("#ndtopath"); // Assuming it is an HTMLDivElement
const NDToTitle = document.querySelector("#ndtotitle"); // Assuming it is an HTMLDivElement
const NDToUrl = document.querySelector("#ndtourl"); // Assuming it is an HTMLDivElement
const NDToChildIds = document.querySelector("#ndtochildids"); // Assuming it is an HTMLDivElement
const AUndoButton = document.querySelector("#aundo"); // Assuming it is an HTMLButtonElement
const ARedoButton = document.querySelector("#aredo"); // Assuming it is an HTMLButtonElement
const AUndoToSelButton = document.querySelector("#aundotosel"); // Assuming it is an HTMLButtonElement
const AReplayButton = document.querySelector("#areplay"); // Assuming it is an HTMLButtonElement
const ALogTextArea = document.querySelector("#alog"); // Assuming it is an HTMLTextAreaElement
const MapAction = {};

const Selhighlight = "selbrow"; // selhighlight class name in CSS
const NBSP = "\xa0";



/*
 * Initialize MapAction
 */
MapAction[HNACTION_BSP2START]          = {nclass: "started", type: "meta", title: "BSP2 start"};
MapAction[HNACTION_RELOADFFAPI]        = {nclass: "reloaded", type: "meta", title: "BSP2 reload"};
MapAction[HNACTION_AUTORELOADFFAPI]    = {nclass: "reloadeda", type: "meta", title: "BSP2 auto reload"};
MapAction[HNACTION_BKMKCREATE]         = {nclass: "created", uclass: "created_u", rclass: "created_r", title: "create"};
MapAction[HNACTION_BKMKCHANGE]         = {nclass: "changed", uclass: "changed_u", rclass: "changed_r", title: "change"};
MapAction[HNACTION_BKMKCHANGE_DESYNC]  = {nclass: "changedd", title: "change"};
MapAction[HNACTION_BKMKMOVE]           = {nclass: "moved", uclass: "moved_u", rclass: "moved_r", title: "move"};
MapAction[HNACTION_BKMKMOVE_DESYNC]    = {nclass: "movedd", title: "move"};
MapAction[HNACTION_BKMKREORDER]        = {nclass: "reordered", uclass: "reordered_u", rclass: "reorderted_r", title: "reorder"};
MapAction[HNACTION_BKMKREORDER_DESYNC] = {nclass: "reorderedd", title: "reorder"};
MapAction[HNACTION_BKMKREMOVE]         = {nclass: "removed", uclass: "removed_u", rclass: "removed_r", title: "remove"};
MapAction[HNACTION_BKMKREMOVE_DESYNC]  = {nclass: "removedd", title: "remove"};

/*
 *******  Prepare standard Meta structure for node cloning
 */
const MetaTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
MetaTempl.classList.add("meta");
MetaTempl.draggable = false; // False by default for <div>
let tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false; // True by default for <img>
MetaTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
										  // Not using <img> since with FF65 and later, they
										  // show default box-shadow: inset when the src=
										  // attribute is not specified.
tmpElem1.classList.add("nocursor");
tmpElem1.draggable = false; // True by default for <img>
MetaTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("histicon");
tmpElem1.draggable = false; // True by default for <img>
MetaTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
MetaTempl.appendChild(tmpElem1);
/*
 *******  Prepare standard Folder structure for node cloning
 */
const FolderTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
FolderTempl.classList.add("bkmkitem_f");
FolderTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false; // True by default for <img>
FolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("nocursor");
tmpElem1.draggable = false; // True by default for <img>
FolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("histicon");
tmpElem1.draggable = false; // True by default for <img>
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
 *******  Prepare special Folder structure for node cloning
 */
const SFolderTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
SFolderTempl.classList.add("bkmkitem_f");
SFolderTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false; // True by default for <img>
SFolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("nocursor");
tmpElem1.draggable = false; // True by default for <img>
SFolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("histicon");
tmpElem1.draggable = false; // True by default for <img>
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
 *******  Prepare Separator structure for node cloning
 */
const SeparatorTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
SeparatorTempl.classList.add("bkmkitem_s");
SeparatorTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false; // True by default for <img>
SeparatorTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("nocursor");
tmpElem1.draggable = false; // True by default for <img>
SeparatorTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("histicon");
tmpElem1.draggable = false; // True by default for <img>
SeparatorTempl.appendChild(tmpElem1);
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
const BookmarkTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
BookmarkTempl.classList.add("bkmkitem_b");
BookmarkTempl.draggable = false; // False by default for <div> 
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false; // True by default for <img>
BookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("nocursor");
tmpElem1.draggable = false; // True by default for <img>
BookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("histicon");
tmpElem1.draggable = false; // True by default for <img>
BookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("img"); // Assuming it is an HTMLImageElement
tmpElem1.classList.add("favicon");
// Cannot prepare image as it is taking much time ..
// So set "flex: none;" in CSS .favicon to reserve space in advance
tmpElem1.draggable = false; // True by defaul for <img>
BookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
BookmarkTempl.appendChild(tmpElem1);
/*
 *******  Prepare nofavicon Bookmark structure for node cloning
 */
const NFBookmarkTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
NFBookmarkTempl.classList.add("bkmkitem_b");
NFBookmarkTempl.draggable = false; // False by default for <div> 
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false; // True by default for <img>
NFBookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("nocursor");
tmpElem1.draggable = false; // True by default for <img>
NFBookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("histicon");
tmpElem1.draggable = false; // True by default for <img>
NFBookmarkTempl.appendChild(tmpElem1);
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
tmpElem1 = undefined;


/*
 *  Global variables
 */
let backgroundPage;
let platformOs;
let beforeFF57;
let beforeFF58;
let beforeFF60;
let beforeFF63;
let ffversion;
let myWindowId;
let curBNList; // Current list of BookmarkNode - Saved in storage at each modification
let curHNList; // Current history of HistoryNode - Saved in storage at each modification
let curRowList = {}; // Current map between id and row for each bookmark item
let bookmarksTable; // Assuming it is an HTMLTableElement
let cellHighlight = null; // Current highlight of a row in source bookmarks = cell


/*
 * Functions
 * ---------
 */

/*
 * Handle search options
 */
function setSearchOptions () {
/*
  let cn;
  if (searchMatch_option == "regexp") {
	cn = "sr" + searchField_option;
	SMatchRegexpInput.checked = true;
  }
  else {
	cn = "sw" + searchField_option;
	SMatchWordsInput.checked = true;
  }
  SearchButtonInput.className = cn;
  if (searchScope_option == "all") {
	MGlassImgStyle.backgroundImage = 'url("/icons/search.png"';
	SScopeAllInput.checked = true;
  }
  else {
	MGlassImgStyle.backgroundImage = 'url("/icons/searchsub.png"';
	SScopeSubfolderInput.checked = true;
  }

  if (searchField_option == "both") {
	SFieldTitleUrlInput.checked = true;
  }
  else if (searchField_option == "title") {
	SFieldTitleOnlyInput.checked = true;
  }
  else {
	SFieldUrlOnlyInput.checked = true;
  }

  // Clear any ongoing search
  clearSearchTextHandler();
*/
}

/*
 * Append a bookmark HistoryNode inside the "pane" table
 *
 * id = Integer, id of the record in the list
 * HN = HistoryNode
 *
 * Returns: the inserted row (an HTMLTableRowElement).
 */
function appendBookmarkHN (id, HN) {
  // Append new row inside the bookmarks table
  let row = curRowList[id] = bookmarksTable.insertRow(-1);
  row.dataset.id = id; // Keep unique id of HN in the data-id attribute

  // Add bookmark HN in row
  let cell = row.insertCell();
  cell.classList.add("brow");
  cell.tabIndex = 0;
//  cell.draggable = false; // False by default for <td>

  // Append proper contents to the cell:
  let action = HN.action;
  let map = MapAction[action];
  let type = map.type;
  let t = new Date (HN.timestamp);
  let tStr = t.toLocaleString();
  if (type != undefined) {				// Meta node
	row.dataset.type = type;
	let div = MetaTempl.cloneNode(true);
	let seqnum = div.firstElementChild;
	seqnum.textContent = id;
	let cursor = seqnum.nextElementSibling;
	let histicon = cursor.nextElementSibling;
	histicon.classList.add(map.nclass);
	let span = histicon.nextElementSibling;
	let text = span.textContent = map.title;
	seqnum.title = cursor.title = histicon.title = text + "\n" + tStr;
	cell.appendChild(div);
  }
  else {
	type = row.dataset.type = HN.type;
	if (type == "folder") {				// Folder
	  let div, seqnum, cursor, histicon, img;
	  let uri = HN.faviconUri;
	  if ((uri != undefined) && (uri != "/icons/folder.png")) { // Special folder
		div = SFolderTempl.cloneNode(true);
		seqnum = div.firstElementChild;
		cursor = seqnum.nextElementSibling;
		histicon = cursor.nextElementSibling;
		img = histicon.nextElementSibling;
		img.src = uri;
	  }
	  else {
		row.draggable = true; // Note: it is false by default for <tr>
		div = FolderTempl.cloneNode(true);
		seqnum = div.firstElementChild;
		cursor = seqnum.nextElementSibling;
		histicon = cursor.nextElementSibling;
		img = histicon.nextElementSibling;
	  }
	  let span = img.nextElementSibling;
	  seqnum.textContent = id;
	  seqnum.title = cursor.title = histicon.title = map.title + "\n" + tStr;
	  let revOp = HN.revOp;
	  if (revOp == undefined) {
		histicon.classList.add(map.nclass);
	  }
	  else if (revOp == HNREVOP_ISUNDO) {
		histicon.classList.add(map.uclass);
	  }
	  else if (revOp == HNREVOP_ISREDO) {
		histicon.classList.add(map.rclass);
	  }
	  let toTitle = HN.toTitle;
	  if (toTitle == undefined) {
		toTitle = HN.title;
	  }
	  img.title = span.title = span.textContent = toTitle;
	  if (HN.state == HNSTATE_INACTIVEBRANCH) {
		div.classList.add("inactive");
	  }
	  cell.appendChild(div);
	}
	else if (type == "separator") {		// Separator
	  row.draggable = true; // Note: it is false by default for <tr>
	  let div = SeparatorTempl.cloneNode(true);
	  let seqnum = div.firstElementChild;
	  seqnum.textContent = id;
	  let cursor = seqnum.nextElementSibling;
	  let histicon = cursor.nextElementSibling;
	  seqnum.title = cursor.title = histicon.title = map.title + "\n" + tStr;
	  let revOp = HN.revOp;
	  if (revOp == undefined) {
		histicon.classList.add(map.nclass);
	  }
	  else if (revOp == HNREVOP_ISUNDO) {
		histicon.classList.add(map.uclass);
	  }
	  else if (revOp == HNREVOP_ISREDO) {
		histicon.classList.add(map.rclass);
	  }
	  if (HN.state == HNSTATE_INACTIVEBRANCH) {
		div.classList.add("inactive");
	  }
	  cell.appendChild(div);
	}
	else {								// Presumably a Bookmark
	  row.draggable = true; // Note: it is false by default for <tr>
	  let div, seqnum, cursor, histicon, img;
	  let uri;
	  if (disableFavicons_option || ((uri = HN.faviconUri) == undefined)) { // Clone with nofavicon image background
		div = NFBookmarkTempl.cloneNode(true);
		seqnum = div.firstElementChild;
		cursor = seqnum.nextElementSibling;
		histicon = cursor.nextElementSibling;
		img = histicon.nextElementSibling;
	  }
	  else { // Clone normal one, we will fill the image later
		div = BookmarkTempl.cloneNode(true);
		seqnum = div.firstElementChild;
		cursor = seqnum.nextElementSibling;
		histicon = cursor.nextElementSibling;
		img = histicon.nextElementSibling;
		img.src = uri;
	  }
	  let span = img.nextElementSibling;
	  seqnum.textContent = id;
	  seqnum.title = cursor.title = histicon.title = map.title + "\n" + tStr;
	  let revOp = HN.revOp;
	  if (revOp == undefined) {
		histicon.classList.add(map.nclass);
	  }
	  else if (revOp == HNREVOP_ISUNDO) {
		histicon.classList.add(map.uclass);
	  }
	  else if (revOp == HNREVOP_ISREDO) {
		histicon.classList.add(map.rclass);
	  }
	  let toUrl = HN.toUrl;
	  if (toUrl == undefined) {
		toUrl = HN.url;
	  }
	  let toTitle = HN.toTitle;
	  if (toTitle == undefined) {
		toTitle = HN.title;
	  }
	  if (toTitle == "") {
		img.title = span.title = toUrl;
		span.textContent = suggestDisplayTitle(toUrl);
	  }
	  else {
		img.title = span.title = toTitle+"\n"+toUrl;
		span.textContent = toTitle;
	  }
	  if (HN.state == HNSTATE_INACTIVEBRANCH) {
		div.classList.add("inactive");
	  }
	  cell.appendChild(div);
	}
  }

  return(row);
}

/*
 * Refresh an existing bookmark HistoryNode inside the "pane" table.
 * Only its state (-> become inactive), or reversion/relHNref can change
 *
 * id = Integer, id of the record in the list
 * HN = HistoryNode
 *
 * Returns: the modified row (an HTMLTableRowElement).
 */
function refreshBookmarkHN (id, HN) {
  // Retrieve row inside the bookmarks table
  let row = curRowList[id];
  let cell = row.firstElementChild;
  let div = cell.firstElementChild;

  // Refresh content in the cell:
  if ((HN.state == HNSTATE_INACTIVEBRANCH) && !div.classList.contains("inactive")) {
	div.classList.add("inactive");
  }

  return(row);
}

/*
 * Set undo/redo cursor
 */
let lastActiveIndex;
function setUndoRedoCursor () {
  let activeIndex = curHNList.activeIndex;
  // Proceed only if there is a change in activeIndex position 
  if (activeIndex != lastActiveIndex) {
	// Clear last one if there was one
	if (lastActiveIndex != undefined) {
	  let row = curRowList[lastActiveIndex];
	  let seqnum = row.firstElementChild.firstElementChild.firstElementChild;
	  let cursor = seqnum.nextElementSibling;
	  cursor.classList.replace("urcursor", "nocursor");
	  cursor.title = seqnum.title;
	}
	// Set new one, if present
	if (activeIndex != undefined) {
	  let row = curRowList[activeIndex];
	  let cursor = row.firstElementChild.firstElementChild.firstElementChild.nextElementSibling;
	  cursor.classList.replace("nocursor", "urcursor");
	  cursor.title = "undo/redo cursor";
	}
	// Remember the new value for next update
	lastActiveIndex = activeIndex;
  }
}

/*
 * Remove highlight from a cell, if there is one
 */
function clearCellHighlight () {
  if (cellHighlight != null) {
	cellHighlight.classList.replace(Selhighlight, "brow");
	cellHighlight = null;
  }
}

/*
 * Set cell highlight
 * 
 * cell = .brow cell to set.
 */
function setCellHighlight (cell) {
  if (cell != cellHighlight) {
	clearCellHighlight();
	cellHighlight = cell;
	cellHighlight.classList.replace("brow", Selhighlight);
  }
}

/*
 * Display a value if defined, else NBSP
 * 
 * node: a Node on which to set textContent
 * text: whatever ... but will finish as a String
 */
function displayField (node, text) {
  if (text == undefined) {
	node.textContent = NBSP;
  }
  else {
	node.textContent = text;
  }
}

/*
 * Display a path value if defined, else NBSP
 * 
 * node: a Node on which to set textContent
 * a_path: Array of Strings, from top to deepest
 */
function displayPath (node, a_path) {
  let len;
  if ((a_path == undefined) || ((len = a_path.length) == 0)) {
	node.textContent = NBSP;
  }
  else {
	let text;
	if (reversePath_option) {
	  text = a_path[len-1];
	  for (let i=len-2 ; i>=0 ; i--) {
		text += " < " + a_path[i]; // Separator on the path ...
	  }
	}
	else {
	  text = a_path[0];
	  for (let i=1 ; i<len ; i++) {
		text += " > " + a_path[i]; // Separator on the path ...
	  }
	}
	node.textContent = text;
  }
}

/*
 * Display a specific History Node in the "node" panel
 * 
 * hnId is an integer
 */
function displayHN (hnId) {
  NDNum.textContent = hnId;
  let HN = curHNList.hnList[hnId];
  let t = new Date (HN.timestamp);
  NDTimestamp.textContent = t.toLocaleString();
  let action = HN.action;
  let map = MapAction[action];
  let revOp = HN.revOp;
  if (revOp == undefined) {
	let reversion = HN.reversion;
	if (reversion == undefined) {
	  NDAction.textContent = map.title;
	}
	else if (reversion == HNREVERSION_UNDONE) {
	  NDAction.textContent = map.title+" (undone by record #)"+hnId+HN.relHNref;
	}
	else if (reversion == HNREVERSION_RENDONE) {
	  NDAction.textContent = map.title+" (redone by record #)"+hnId+HN.relHNref;
	}
  }
  else if (revOp == HNREVOP_ISUNDO) {
	NDAction.textContent = "undo "+map.title+" of record #"+hnId+HN.relHNref;
  }
  else if (revOp == HNREVOP_ISREDO) {
	NDAction.textContent = "redo "+map.title+" of record #"+hnId+HN.relHNref;
  }
  if (HN.state == HNSTATE_INACTIVEBRANCH) {
	NDState.textContent = "Inactive branch";
  }
  else {
	NDState.textContent = "Active branch";
  }
  let type = map.type;
  if (type != undefined) {				// Meta node
	NDBNId.textContent = NBSP;
	NDType.textContent = type;
	NDParentId.textContent = NBSP;
	NDIndex.textContent = NBSP;
	NDPath.textContent = NBSP;
	NDTitle.textContent = NBSP;
	NDFavicon.style = "";
	NDFavicon.className = "favicon "+map.nclass;
	NDUrl.textContent = NBSP;
	NDChildIds.textContent = NBSP;
	NDToParentId.textContent = NBSP;
	NDToIndex.textContent = NBSP;
	NDToPath.textContent = NBSP;
	NDToTitle.textContent = NBSP;
	NDToUrl.textContent = NBSP;
	NDToChildIds.textContent = NBSP;
  }
  else {
	NDBNId.textContent = HN.id;
	type = NDType.textContent = HN.type;
	displayPath(NDPath, HN.path);
	NDParentId.textContent = HN.parentId;
	NDIndex.textContent = HN.index;
	if (type == "folder") {				// Folder
	  NDTitle.textContent = HN.title;
	  let uri = HN.faviconUri;
	  if ((uri != undefined) && (uri != "/icons/folder.png")) { // Special folder
		NDFavicon.className = "favicon";
		NDFavicon.style = "background-image: url(\""+uri+"\");";
	  }
	  else {
		NDFavicon.style = "";
		NDFavicon.className = "ffavicon";
	  }
	}
	else if (type == "separator") {		// Separator
	  NDTitle.textContent = NBSP;
	  NDFavicon.style = "";
	  NDFavicon.className = "favicon";
	}
	else {								// Presumably a Bookmark
	  NDTitle.textContent = HN.title;
	  let uri;
	  if (disableFavicons_option || ((uri = HN.faviconUri) == undefined)) { // Show nofavicon
		NDFavicon.style = "";
		NDFavicon.className = "nofavicon";
	  }
	  else { // Show favicon
		NDFavicon.className = "favicon";
		NDFavicon.style = "background-image: url(\""+uri+"\");";
	  }
	}
	displayField(NDUrl, HN.url);
	displayField(NDChildIds, HN.childIds);
	displayPath(NDToPath, HN.toPath);
	displayField(NDToParentId, HN.toParentId);
	displayField(NDToIndex, HN.toIndex);
	displayField(NDToTitle, HN.toTitle);
	displayField(NDToUrl, HN.toUrl);
	displayField(NDToChildIds, HN.toChildIds);
  }
}

/*
 * Show a HN row into view
 * 
 * srcRow is an HTMLTableRowElement
 */
function showRow (srcRow) {
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
 * Go to a specific HNId, highlight it and display it.
 * 
 * hnId is an integer
 */
function goHNItem (hnId) {
  if (hnId != undefined) {
	let row = curRowList[hnId];
	showRow(row);
	displayHN(hnId);
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

  // The click target is one of .bscrollok (empty space click in div, nothing should happen),
  // .brow/.selbrow cell,
  // .seqnum, .histicon, .bkmkitem_x div, .favseparator/.favseparatorend div, .favicon or .favttext
  // Go up to the level of the cell (.brow/.selbrow) to handle click
  if (!className.includes("bscrollok")) {
	let cell;
	if (className.includes("brow")) {
	  cell = target;
	}
	else if (className.includes("bkmkitem_")) {
	  cell = target.parentElement;
	}
	else {
	  cell = target.parentElement.parentElement;
	}

	// Highlight history node, and display it in the node panel
	setCellHighlight(cell);
	let row = cell.parentElement;
	let hnId = row.dataset.id;
	displayHN(hnId);
  }
  e.stopPropagation(); // Prevent handlers up the DOM chain on same event
}

/*
 * Receive event from keyboard anywhere in the "sidebar" panel
 * 
 * e is of type KeyboardEvent
 */
function keyHandler (e) {
  let target = e.target; // Type depends, but is an HTMLTableCellElement when a row is highlighted
  let key = e.key;
  let classList = target.classList;
//console.log("Key event: "+e.type+" key: "+key+" char: "+e.char+" target: "+target+" classList: "+classList);

  let isResultRow = false;
/*
  let isResultRow = classList.contains("brow");
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
	if (key == "Enter") { // Enter in search input box should go to first search result if any
	  // Get to first row if there is one
	  let len = resultsTable.rows.length;
	  if (len > 0) {
		let firstRow = resultsTable.rows[0];
		let cell = firstRow.firstElementChild;
		cell.focus();
	  }
	  e.preventDefault();
	}
  }
  else
*/
  if (classList.contains(Selhighlight) || isResultRow) { // Keyboard actions on an highlighted (=> focused) cell
	let row = target.parentElement;

	if (key == "ArrowDown") {
	  // Highlight next row
	  let nextRow = row.nextElementSibling;
	  if (nextRow != null) { // We got one
		let cell = nextRow.firstElementChild;
		if (!isResultRow) {
		  setCellHighlight(cell);
		  displayHN(nextRow.dataset.id);
		}
		cell.focus();
	  }
	  e.preventDefault();
	}
	else if (key == "ArrowUp") {
	  // Highlight previous row
	  let previousRow = row.previousElementSibling;
	  if (previousRow != null) { // We got one
		let cell = previousRow.firstElementChild;
		if (!isResultRow) {
		  setCellHighlight(cell);
		  displayHN(previousRow.dataset.id);
		}
		cell.focus();
	  }
	  e.preventDefault();
	}
	else if (key == "PageDown") {
	  // Find bottom of bounding parent (it can change with window size or search panel presence,
	  // so recalculate each time
	  let ch, maxBottom;
	  if (isResultRow) {
//		ch = SearchResult.clientHeight;
//		maxBottom = SearchResult.offsetTop + ch;
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
		temp = nextRow.nextElementSibling;
		if (temp == null) // Reached end
		  break;
		nextRow = temp;
	  } while (--intItems > 0);
	  if (nextRow != row) { // We got one
		let cell = nextRow.firstElementChild;
		if (!isResultRow) {
		  setCellHighlight(cell);
		  displayHN(nextRow.dataset.id);
		}
		cell.focus();
	  }
	  e.preventDefault();
	}
	else if (key == "PageUp") {
	  // Find top of bounding parent (it can change with window size or search panel presence,
	  // so recalculate each time
	  let ch, minTop;
	  if (isResultRow) {
//		ch = SearchResult.clientHeight;
//		minTop = SearchResult.offsetTop;
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
		temp = previousRow.previousElementSibling;
		if (temp == null) // Reached end
		  break;
		previousRow = temp;
	  } while (--intItems > 0);
	  if (previousRow != row) { // We got one
		let cell = previousRow.firstElementChild;
		if (!isResultRow) {
		  setCellHighlight(cell);
		  displayHN(previousRow.dataset.id);
		}
		cell.focus();
	  }
	  e.preventDefault();
	}
	else if (key == "End") {
	  // Find last visible row and highlight it
	  let len;
	  let lastRow;
	  if (isResultRow) {
//		len = resultsTable.rows.length; // Start from end of table
//		lastRow = resultsTable.rows[len-1];
	  }
	  else {
		len = bookmarksTable.rows.length; // Start from end of table
		lastRow = bookmarksTable.rows[len-1];
	  }
	  let cell = lastRow.firstElementChild;
	  if (!isResultRow) {
		setCellHighlight(cell);
		displayHN(lastRow.dataset.id);
	  }
	  cell.focus();
	  e.preventDefault();
	}
	else if (key == "Home") {
	  // Find next visible row and highlight it
	  let firstRow;
	  if (isResultRow) {
//		firstRow = resultsTable.rows[0];
	  }
	  else {
		firstRow = bookmarksTable.rows[0];
	  }
	  let cell = firstRow.firstElementChild;
	  if (!isResultRow) {
		setCellHighlight(cell);
		displayHN(firstRow.dataset.id);
	  }
	  cell.focus();
	  e.preventDefault();
	}
//  else {
//	SearchTextInput.focus(); // Focus on search box when a key is typed ...
//  }
  }
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
//let classList = target.classList;
//console.log("General click event: "+e.type+" button: "+e.button+" target: "+target+" target.nodeName: "+target.nodeName+" class: "+classList);

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
  }

  if ((e.button == 1) || (e.button == 2)) {
	// Prevent default context menu except in the search box and in the log box
	let targetObjectType = Object.prototype.toString.call(target).slice(8, -1);
	if ((targetObjectType != "HTMLInputElement")
		&& (targetObjectType != "HTMLTextAreaElement")
	   ) {
	  e.preventDefault();
	}
  }
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
 * Iteratively display the HN list
 *
 * hnList = Array of HN
 */
let lastHNListLen;
function displayHNList (hnList) {
  let HN;
  lastHNListLen = hnList.length;
  for (let i=0 ; i<lastHNListLen ; i++) {
	HN = hnList[i];
	appendBookmarkHN(i, HN);
  }
}

/*
 * Iteratively refresh the HN list on an update
 *
 * hnList = Array of HN
 */
function refreshHNList (hnList) {
  let HN;
  // First refresh existing records (only their state or reversion/relHNref can change)
  for (let i=0 ; i<lastHNListLen ; i++) {
	HN = hnList[i];
	refreshBookmarkHN(i, HN);
  }
  // Then add new record(s)
  let len = hnList.length;
  for (let i=lastHNListLen ; i<len ; i++) {
	HN = hnList[i];
	appendBookmarkHN(i, HN);
  }
  lastHNListLen = len;
}

/*
 * Handle responses or errors when talking with background
 */
let f_initializeNext;
function handleMsgResponse (message) {
  // Is always called, even is destination didn't specifically reply (then message is undefined)
  if (message != undefined) {
	let msg = message.content;
//console.log("Background sent a response: <<"+msg+">> received in options");
	if (msg == "getStats") {
	}
	// -> Never happens from traces
//	else if (msg == "getCurHNList") { // Received curBNList content
//	  let json = message.json;
//	  curBNList = ...;
//	  curHNList = historyListDeserialize(json);
//
//	  f_initializeNext();
//	}
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

function handleAddonMessage (request, sender, sendResponse) {
  try{ // Use a try catch structure, as any exception will be caught as an error response to calling part
	let source = request.source;
	if (source == "background") { // Ignore message from sidebars
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

	  if (msg.startsWith("savedOptions")) { // Option page changed something to options, reload them
		// Look at what changed
//		let advancedClick_option_old = advancedClick_option;
//		let showPath_option_old = showPath_option;
//		let closeSearch_option_old = closeSearch_option;
//		let openTree_option_old = openTree_option;
//		let matchTheme_option_old = matchTheme_option;
//		let setColors_option_old = setColors_option;
//		let textColor_option_old = textColor_option;
//		let bckgndColor_option_old = bckgndColor_option;
		let reversePath_option_old = reversePath_option;
		let altFldrImg_option_old = altFldrImg_option;
		let useAltFldr_option_old = useAltFldr_option;
//		let traceEnabled_option_old = traceEnabled_option;

		// Function to process option changes
		function changedOptions () {
		  // If path option changed, update any open search result 
		  if (reversePath_option_old != reversePath_option) {
			// Update displayed HN
			if (cellHighlight != null) {
			  displayHN(cellHighlight.parentElement.dataset.id);
			}
		  }
		  // If folder image options changed
		  if ((useAltFldr_option && (altFldrImg_option_old != altFldrImg_option))
			  || (useAltFldr_option_old != useAltFldr_option)
		     ) {
			setPanelFolderImg(useAltFldr_option, altFldrImg_option);
		  }
		}

		// Refresh options
		// Bacground page is accessible, all was loaded inside it, so get from there
		refreshOptionsBgnd(backgroundPage);
		changedOptions();
	  }
	  else if (msg.startsWith("savedSearchOptions")) { // Reload and process search options
		// Refresh options
		// Bacground page is accessible, all was loaded inside it, so get from there
		refreshOptionsBgnd(backgroundPage);
		setSearchOptions();
	  }
	  else if (msg.startsWith("resetSizes")) { // Option page reset sizes button was pressed
		// Reset of search pane height
//		SearchResult.style.height = "";
	  }
	  else if (msg.startsWith("hnListAdd")) { // We are getting a new record appended to curHNList
		refreshHNList(curHNList.hnList);
		// Update undo/redo cursor
		setUndoRedoCursor();
		// Update displayed HN
		if (cellHighlight != null) {
		  displayHN(cellHighlight.parentElement.dataset.id);
		}
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
 * Fire when there is a mouse wheel event
 * Used to disable zooming with Ctrl+mouse wheel
 */
function onWheel (aEvent) {
  if (aEvent.ctrlKey && !aEvent.altKey && !aEvent.metaKey && !aEvent.shiftKey) {
	aEvent.preventDefault();
  }
}

/*
 * Finish the initial display of favicons in background after display of bookmark tree
 */
const Fluidity = 40;
const Bunch = 250;
let bunchCount = 0;
let tt1, tt2;
async function completeFavicons () {
  let hnList = curHNList.hnList;
  let HN;
  tt1 = Performance.now();
  let len = hnList.length;
  for (let i=0 ; i<len ; i++) {
	HN = hnList[i];
	if (HN.type == "bookmark") {
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
	  let row = curRowList[i];
	  let img = row.firstElementChild.firstElementChild.firstElementChild.nextElementSibling.nextElementSibling;
	  img.src = HN.faviconUri;
	}
  }
}

/*
 * Complete the initial display of bookmarks history table
 */
function completeDisplay () {
  // Finish displaying favicons asynchronously
  if (!disableFavicons_option && !immediateFavDisplay_option) {
	setTimeout(completeFavicons, 0);
  }


  // Setup mouse and keyboard handlers for bookmarks and results
//  SearchResult.addEventListener("click", resultsMouseHandler);
  Bookmarks.addEventListener("click", bkmkMouseHandler);
/*
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
*/
  HPane.addEventListener("keydown", keyHandler);

  // Setup mouse handlers for search button
//  SearchButtonInput.addEventListener("click", searchButtonHandler);

  // General event handlers for a click anywhere in the document .. used to clear menus
  // and prevent default menus
  addEventListener("click", clickHandler);
  addEventListener("mousedown", noDefaultAction);
  addEventListener("contextmenu", noDefaultAction);
  addEventListener("auxclick", noDefaultAction);
//  addEventListener("blur", onBlur);
  addEventListener('wheel', onWheel, {capture: true}); // To disable zooming

  /*
  if (!beforeFF64) { // Handle integrated FF menu items
	browser.menus.onClicked.addListener(onClickedContextMenuHandler);
	browser.menus.onHidden.addListener(onHiddenContextMenuHandler);
  }
*/

  // Event handlers for drag & drop
/*
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
*/

  // Go to and show the current active position (cursor)
  goHNItem(curHNList.activeIndex);
  setUndoRedoCursor();

  // Focus on searchtext input at initial load
//  window.focus();
//  SearchTextInput.focus();
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

  // Set folder image as per options
  if (useAltFldr_option) {
	setPanelFolderImg(true, altFldrImg_option);
  }

  // Display the HN list inside a table in "pane"
  bookmarksTable = document.createElement("table");
  Bookmarks.appendChild(bookmarksTable);
  displayHNList(curHNList.hnList);
  completeDisplay();
}

/*
 * Initialization phase 1 for private windows = get CurHNList from background
 * and then link to initialization phase 2
 */
// Never happens from traces
//function initializePriv () {
//  f_initializeNext = initialize2;
//	..curBNList..;
//  sendAddonMessage("getCurHNList");
//}

/*
 * Initialization phase 0
 */
function initialize () {
  // Start when we have the platform and the background page
  Promise.all([p_platform, p_background, p_ffversion, p_getWindowId])
  .then(
	function (a_values) { // An array of one value per Promise is returned
	  p_platform = p_background = undefined;

	  // Retrieve values in the same order
	  platformOs = a_values[0].os; // info object
	  let page = a_values[1];

	  // In a private browsing window (incognito), this will be null -> Never happens from traces
//	  if (page != null) { // Not in a private browsing window
		backgroundPage = page;
//	  }

	  // Check FF version
	  let info = a_values[2];
	  ffversion = info.version;
	  beforeFF57 = (ffversion < "57.0");
	  beforeFF58 = (ffversion < "58.0");
	  beforeFF60 = (ffversion < "60.0");
	  beforeFF63 = (ffversion < "63.0");

	  // Handle myWindowId
	  let windowInfo = a_values[3];
	  myWindowId = windowInfo.id;

	  // Watch for background script messages
	  browser.runtime.onMessage.addListener(handleAddonMessage);

	  // Get options and populate Options page Input elements
//	  if (backgroundPage == undefined) { // Load by ourselves -> Never happens from traces
//		refreshOptionsLStore()
//		.then(initializePriv);
//	  }
//	  else {
		// Background page is accessible, all was loaded inside it, so get from there
		refreshOptionsBgnd(backgroundPage);
		curBNList = backgroundPage.curBNList;
		curHNList = backgroundPage.curHNList;
		initialize2();
//	  }
	}
  );
}


/*
 * Main code:
 * ----------
*/

// Get saved or default values in the page 
document.addEventListener('DOMContentLoaded', initialize);