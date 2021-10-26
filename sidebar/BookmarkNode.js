'use strict';


/*
 * Constants
 */
const Root = "root________";
const PersonalToobar = "toolbar_____";
const BookmarksMenu =  "menu________";
const OtherBookmarks = "unfiled_____";
const MobileBookmarks = "mobile______";
const TagsFolder = "tags________";
const MostVisitedSort = "sort=8";
const RecentTagSort = "sort=14"; 
const RecentBkmkSort = "sort=12";
const BSP2TrashName = "BSP2 trash folder for undo of bookmark deletes - DO NOT REMOVE !" // Placed under Other bookmarks
//Next ones are encountered in Bookmarks library
const HistoryFolderV = "history____v";
const DownloadsFolderV = "downloads__v";
const TagsFolderV = "tags_______v";
const AllBookmarksV = "allbms_____v";


/*
 * Global variables, seen by other instances (var)
 */
var countBookmarks = 0, countFolders = 0, countSeparators = 0, countOddities = 0, countFetchFav = 0;
var mostVisitedBNId, mostVisitedBN, recentTagBNId, recentTagBN, recentBkmkBNId, recentBkmkBN;
var bsp2TrashFldrBNId, bsp2TrashFldrBN;


/*
 * Global variables, private to including page (let)
 */


/*
 * Objects
 */

//***************************************************
//BookmarkNode "object".
//Must be serializable .. so no function in it ..
//***************************************************

// Constructor:
//-------------
// id
//    A string which uniquely identifies the node. Each ID is unique within the user's profile and remains unchanged across browser restarts.
// type
//    A bookmarks.BookmarkTreeNodeType object indicating whether this is a "bookmark", a "folder", or a "separator".
// level
//    A number which represents the depth level in the tree.
//    -1 for root node.
// parentId
//    A string which specifies the ID of the parent folder. Is undefined in the root node.
// dateAdded
//    A number representing the creation date of the node in milliseconds since the epoch.
// protect Optional
//    A boolean representing the protected (true) or not (false) state of the object on UI.
//    Protected cannot be modified, dragged .. etc ..
//    Defaults to false.
// title Optional
//    A string which contains the text displayed for the node in menus and lists of bookmarks.
//    undefined for separators and for root node.
// faviconUri Optional
//    A string URI (data: ..) holding the bookmark favicon, for display.
//    Undefined for separators and for root node, or when no favicon fetching
// fetchedUri Optional
//    A boolean indicating for bookmark if the uri is BSP2 internal or was fetched from Internet / FF,
//    and indicating for folder if this is a special folder favicon or a standard one.
// url Optional
//    A string which represents the URL for the bookmark.
//    If the node represents a folder or a separator, this is undefined.
// children Optional
//    An array of BookmarkNode objects which represent the node's children. The list is ordered in the list in which the children appear in the user interface.
//    This field is undefined if the node isn't a folder.
// dateGroupModified Optional
//    A number representing the date and time the contents of this folder last changed, in milliseconds since the epoch.
//    Note that it is updated also when folder title has changed, or when a child has been moved
//    or when a chiild of a child .. has been moved / added / removed.
//    Does not change when a child or any child of child .. changes of title / url.
//    undefined if not a folder.
// inBSP2Trash Optional
//    undefined or Boolean. If true, marks the BN as being in BSP2 trash
// trashDate Optional
//    If inBSP2Trash is true, date at which the item was put in trash (for trimming at BSP2 start)
// unmodifiable Optional
//    undefined or a string as described by the type bookmarks.BookmarkTreeNodeUnmodifiable. Represents the reason that the node can't be changed.
//    Always undefined today
function BookmarkNode (id, type, level, parentId, dateAdded, protect = false, 
					   title = undefined, faviconUri = undefined, fetchedUri = false, url = undefined,
					   children = undefined, dateGroupModified = undefined,
					   inBSP2Trash = undefined, trashDate = undefined, unmodifiable = undefined) {
  this.id                = id;
  this.type              = type;
  this.level             = level;
  this.parentId          = parentId;
  this.dateAdded         = dateAdded;
  this.protect           = protect;
  this.title             = title;
  this.faviconUri        = faviconUri;
  this.fetchedUri        = fetchedUri;
  this.url               = url;
  this.children          = children;
  this.dateGroupModified = dateGroupModified;
  this.inBSP2Trash       = inBSP2Trash;
  this.trashDate         = trashDate;
  this.unmodifiable      = unmodifiable;
}

/*
 * Recursively convert the BN tree to plain text, with indentation
 * BN = BookmarkNode to "print" to plain text
 * indent = String, leading part before printed string and before tab indented folder contents
 * 
 * Returns: a String
 */
function BN_toPlain (BN, indent = "") {
  let plain;
  let type = BN.type;
  if (type == "folder") {
	plain = indent+BN.title;
	let children = BN.children;
	if (children != undefined) {
	  let len = children.length;
	  for (let i=0 ; i<len ;i++) {
		plain += "\n"+BN_toPlain(children[i], indent + "\t");
	  }
	}
  }
  else if (type == "bookmark") {
	plain = indent+BN.url;
  }
  else {
	plain = indent+"--------------------";
  }
  return(plain);
}

/*
 * Recursively convert the BN tree to HTML
 * BN = BookmarkNode to "print" to HTML
 * 
 * Returns: a String
 */
function BN_toHTML (BN) {
  let html;
  let type = BN.type;
  if (type == "folder") {
	html = "<DL><DT>"+BN.title+"</DT>";
	let children = BN.children;
	if (children != undefined) {
	  let len = children.length;
	  for (let i=0 ; i<len ;i++) {
		html += "<DD>"+BN_toHTML(children[i])+"</DD>";
	  }
	}
	html += "</DL>";
  }
  else if (type == "bookmark") {
	html = "<A HREF=\""+BN.url+"\">"+BN.title+"</A>";
  }
  else {
	html = "<HR>";
  }
  return(html);
}

/*
 * Recursively serialize (JSON like) the BN tree
 * 
 * Returns: a String of form: {toJSON1,toJSON2,... }
 * 		for all fieldx which are not undefined
 * 		where toJSONx is JSON.stringify(fieldx) for all
 * 		except children which is "children":[BN_serialize[0],BN_serialize[1],..] if not undefined
 */
function BN_serialize (BN) {
  let json;
  try {
	json = JSON.stringify(BN);
  } catch (e) {
	throw e;
  }
  return(json);
}

/*
 * Recursively deserialize (JSON like) the BN tree from a String
 * 
 * Returns: a BN tree
 */
function BN_deserialize (jsonstr) {
  let BNtree;
  try {
	BNtree = JSON.parse(jsonstr);
  } catch (e) {
	console.log("Error when parsing BN JSON string: "+e);
  }
  return(BNtree);
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

	title = decodeURI(host + pathname + search + hash);
  } 
  catch (e) {
	// Use (no title) for non-valid/standard URIs
	title = "(no title)"; // TODO : move to _locales/en/messages.json
  }

  return(title);
}

//Get path to BookmarkNode id, including bnId itself, using curBNList
//Returns an Array of String, from top to deepest (last one = parent of bookmark item)
function BN_aPath (bnId) {
  if (bnId != Root) {
	let BN = curBNList[bnId];
	let parentId = BN.parentId;
	let a_path;
	if (parentId != Root) {
	  a_path = BN_aPath(parentId);
	}
	else {
	  a_path = [];
	}
	let title = BN.title;
	let url;
	if ((title == "") && ((url = BN.url) != undefined)) {
	  title = suggestDisplayTitle(url);
	}
	a_path.push(title);
	return(a_path);
  }
  else {
	return([]);
  }
}

// Get path to BookmarkNode id, including bnId itself, using curBNList
// Returns a String, with '>' between each item on the path (or empty string if not parent).
function BN_path (bnId) {
  if (bnId != Root) {
	let BN = curBNList[bnId];
	let parentId = BN.parentId;
	let path;
	if (parentId != Root) {
	  if (reversePath_option) {
		path = " < " + BN_path(parentId); // Separator on the path ...
	  }
	  else {
		path = BN_path(parentId) + " > "; // Separator on the path ...
	  }
	}
	else {
	  path = "";
	}
	let title = BN.title;
	let url;
	if ((title == "") && ((url = BN.url) != undefined)) {
	  title = suggestDisplayTitle(url);
	}
	if (reversePath_option) {
	  return(title + path);
	}
	else {
	  return(path + title);
	}
  }
  else {
	return("");
  }
}

// Get parent of BookmarkNode, from list bnList (curBNList by default)
// Returns a BookmarkNode (or undefined if root node = no parent, or parent does not exist).
function BN_getParentBN (BN, bnList = curBNList) {
  let parentId;
  if ((parentId = BN.parentId) == undefined) {
	return(undefined);
  }
  return(bnList[parentId]);
}

// Get index of BookmarkNode within its parent, from list bnList (curBNList by default)
// Returns an Integer = -1 if root node or if position is unknown for that parent
function BN_getIndex (BN, parentBN = undefined, bnList = curBNList) {
  if (parentBN == undefined) {
	let parentId;
	if ((parentId = BN.parentId) == undefined) {
	  return(-1);
	}
	if ((parentBN = bnList[parentId]) == undefined) {
	  return(-1);
	}
  }
  return(parentBN.children.indexOf(BN));
}

// Return an array of children bookmark id strings for a folder (else undefined)
function BN_childIds (BN) {
  let childIds;
  if (BN.type == "folder") {
	childIds = [];
	let children = BN.children;
	if (children != undefined) {
	  let len = children.length;
	  for (let i=0 ; i<len ;i++) {
		childIds.push(children[i].id);
	  }
	}
  }
  else {
	childIds = undefined;
  }
  return(childIds);
}

// Return last descendant of a BookmarkNode (return BN itself if no child)
function BN_lastDescendant (BN) {
  let children = BN.children;
  if (children == undefined) {
	return(BN);
  }
  let len = children.length;
  if (len == 0) {
	return(BN);
  }
  return(BN_lastDescendant(children[len-1]));
}

// Create recursively a copy of BookmarkNode.
// Return the copy.
function BN_copy (BN) {
  let node = new BookmarkNode (BN.id, BN.type, BN.level, BN.parentId, BN.dateAdded, BN.protect, 
	  						   BN.title, BN.faviconUri, BN.fetchedUri, BN.url,
	  						   undefined, BN.dateGroupModified,
	  						   BN.inBSP2Trash, BN.trashDate, BN.unmodifiable);
  let children = BN.children;
  if (children != undefined) {
	let len = children.length;
	let nodeChildren = node.children = new Array (len);
	let j = 0;
	for (let i=0 ; i<len ; i++) {
	  nodeChildren[j++] = BN_copy(children[i]);
	}
  }
  return(node);
}

// Decrement appropriate counters when deleting a node
function decrCounters (BN, type) {
  if (type == "folder") { // Root cannot be deleted, so do not verify
	if (countFolders > 0)   countFolders--;
  }
  else if (type == "separator") {
	if (countSeparators > 0)   countSeparators--;
  }
  else {
	if (type == "bookmark") {
	  if ((countBookmarks > 0)
		  && (!BN.id.startsWith("place:")) // Do not count special bookmarks under special place: folders
		  								   // tagged with "place:" before their id when inserted
		 ) {
		countBookmarks--;
	  }
	}
	else {
	  if (countOddities > 0)   countOddities--;
	}
	if ((BN.faviconUri == "/icons/nofavicontmp.png") && (countFetchFav > 0))
	  countFetchFav--;  
  }
}

// Recursively delete a BookmarkNode from its parent and from list bnList (curBNList by default) if real.
// Note: for a move, set real to false for both delete and insert.
function BN_delete (BN, parentId = undefined, real = true, bnList = curBNList, removeFromParent = true) {
  if (parentId == undefined) {
	if ((parentId = BN.parentId) == undefined) {
	  return; // Cannot delete root
	}
  }
  // Remove from parent node children 
  let parentBN;
  let children;
  if (removeFromParent								   // Do not remove from parent if not told to
	  && ((parentBN = bnList[parentId]) != undefined)  // Plan for no parent error case, for robustness..
	  && ((children = parentBN.children) != undefined) // Plan for no children error case, for robustness..
	 ) {
	let index = children.indexOf(BN);
	if (index != -1) {
	  children.splice(index, 1);
	}
  }

  let bnId = BN.id;
  // Recursively remove from bnList if real
  if (real) {
	let type = BN.type;
	if (type == "folder") {
	  children = BN.children;
	  if (children != undefined) {
		let len = children.length;
		for (let i=0 ; i<len ; i++) {
		  BN_delete(children[i], bnId, true, bnList, false); // Do not remove from parent since we are taking care
		  													 // of things here .. else that would perturb the loop
		}
	  }
	}
	decrCounters(BN, type); // Keep counters up to date
	delete bnList[bnId];
	// Maintain global shortcut Id/pointers up to date
	if (bnId == recentBkmkBNId) {
	  recentBkmkBNId = undefined;
	  recentBkmkBN = undefined;
	}
	else if (bnId == mostVisitedBNId) {
	  mostVisitedBNId = undefined;
	  mostVisitedBN = undefined;
	}
	else if (bnId == recentTagBNId) {
	  recentTagBNId = undefined;
	  recentTagBN = undefined;
	}
	else if (bnId == bsp2TrashFldrBNId) {
	  bsp2TrashFldrBNId = undefined;
	  bsp2TrashFldrBN = undefined;
	}
  }
}

// Recursively update the level of a BookmarkNode tree
function BN_updateLevel (BN, level) {
  BN.level = level;
  let children = BN.children;
  if (children != undefined) {
	let len = children.length;
	for (let i=0 ; i<len ; i++) {
	  BN_updateLevel(children[i], level+1);
	}
  }
}

// Insert a BookmarkNode under its parent and in list bnList (curBNList by default) if real
// at 0-based position index (if -1, append at end)
// Note: for a move, set real to false for both delete and insert.
//
// Requires global function insertFF56EndGapSep (parentBN) {} when running on FF < 57
function BN_insert (BN, parentBN, index = -1, real = true, bnList = curBNList) {
  if (parentBN == undefined) {
	return; // Cannot insert root
  }

  // Add under parent children
  let level = parentBN.level + 1;
  let parentId = parentBN.id;
  if (index == -1) {
	parentBN.children.push(BN);
  }
  else {
	if (beforeFF57) {
	  let children = parentBN.children;
	  if (children == undefined) {
		children = parentBN.children = new Array (0);
	  }
	  let len = children.length;
	  if (index <= len) { // Insert before end or just at end, no surprise ..
		 children.splice(index, 0, BN);
	  }
	  else { // There is a gap ... create separators in between
		let j = len;
		let node;
		let id;
		while (j < index) {
		  id = "separator" + countSeparators;
		  node = new BookmarkNode (id, "separator", level, parentId, 0,
			  					   ((countSeparators++ == 0) ? true : false)
		  						  );
		  children.push(node);
		  bnList[node.id] = node; // Add gap separator in list
		  j++;
		  insertFF56EndGapSep(parentBN); // Update display in sidebars
		}
		children.push(BN);
	  }
	}
	else {
	  let children = parentBN.children;
	  if (children == undefined) {
		children = parentBN.children = new Array (0);
	  }
	  children.splice(index, 0, BN);
	}
  }
  // Also add in list if required
  if (real) {
	bnList[BN.id] = BN;
  }

  // Firm up some details ...
  BN.parentId = parentId;
  if (BN.level != level) {
	BN_updateLevel(BN, level);
  }
}

/*
 * Get type from a BTN
 *
 * BTN = BookmarkTreeNode
 * 
 * Returns BTN type as a String
 */
function getType (BTN) {
//  traceBTN(BTN);
  let type = BTN.type;
  if (type == undefined) {
	if (BTN.url == undefined)
	  if (BTN.dateGroupModified == undefined)   type = "separator";
	  else   type = "folder";
	else   type = "bookmark";
  }
  return(type);
}

// "Constructor" from a BTN, and append/insert as child if parentBN is provided.
// Not recursive, i.e. does not handle BTN.children.
//
// BTN = BookmarkTreeNode
// level = depth in tree.
// faviconWorker = a worker to trigger favicon fetching if missing
//
// Relies on Global variables savedBkmkUriList and savedBNList
// Returns the created node.
function BN_create (BTN, level, faviconWorker, parentBN = undefined) {
  let node;
  let BTN_id = BTN.id;
  let index = BTN.index;
  let type = getType(BTN);
  let protect;
  if (type == "folder") { // Root cannot be created, so do not verify
	countFolders++;

	let title = BTN.title;
	let uri, fetchedUri, inBSP2Trash;
	if (BTN_id == PersonalToobar) {
	  uri = "/icons/toolbarbkmk.png";
	  protect = true;
	  fetchedUri = true;
	}
	else if (BTN_id == BookmarksMenu) {
	  uri = "/icons/menubkmk.png";
	  protect = true;
	  fetchedUri = true;
	}
	else if (BTN_id == OtherBookmarks) {
	  uri = "/icons/otherbkmk.png";
	  protect = true;
	  fetchedUri = true;
	}
	else if (BTN_id == MobileBookmarks) {
	  uri = "/icons/folder.png";
	  protect = true;
	  fetchedUri = false;
	}
	else if (title == BSP2TrashName) {
	  uri = "/icons/bsp2trash.png";
	  protect = inBSP2Trash = true;
	  fetchedUri = true;
	  bsp2TrashFldrBNId = BTN_id;
	}
	else {
	  uri = "/icons/folder.png";
	  protect = false;
	  fetchedUri = false;
	}

	// Pre-create an array of empty children if needed
	let children = BTN.children;
	if (children != undefined) {
	  children = new Array (children.length);
	}

	// Create new node
	node = new BookmarkNode (
	  BTN_id, "folder", level, BTN.parentId, BTN.dateAdded, protect,
	  BTN.title, uri, fetchedUri, undefined,
	  children, BTN.dateGroupModified, inBSP2Trash
	);
  }
  else if (type == "separator") {
	if ((countSeparators++ == 0) || beforeFF57) { // First separator is not draggable,
	  											  // or all separators when FF < 57
	  protect = true;
	}
	else {
	  protect = false;
	}
	node = new BookmarkNode (
	  BTN_id, type, level, BTN.parentId, BTN.dateAdded, protect
	);
  }
  else { // Presumably "bookmark" type
    let forceProtect; // In case the general protection rule does not apply
	if (type == "bookmark") {
	  if (!BTN_id.startsWith("place:")) { // Do not count special bookmarks under special place: folders
										  // -> tagged with "place:" before their id when inserted
		countBookmarks++;
	  }
	  else {
		forceProtect = true;
	  }
	}
	else {
	  trace("Odd bookmark type: "+type);
	  countOddities++;
	}

	let uri, fetchedUri;
	let triggerFetch = false;
	let url = BTN.url;
	let title = BTN.title;
	if (url == undefined) {
	  trace("Bookmark with undefined URL !");
	  traceBTN(BTN);
	  url = "<undefined!>";
	  uri = "/icons/nofavicon.png";
	  fetchedUri = false;
	  protect = false;
	}
	else if (url.startsWith("place:")) {
	  type = "folder"; // Convert to folder
	  uri = "/icons/specfavicon.png";
	  fetchedUri = true;
	  protect = true;
	  if (url.includes(MostVisitedSort)) {
		mostVisitedBNId = BTN_id;
	  }
	  else if (url.includes(RecentTagSort)) {
		recentTagBNId = BTN_id; 
	  }
	  else if (url.includes(RecentBkmkSort)) {
		recentBkmkBNId = BTN_id;
	  }
	  else { // Unknown or non supported place: case ...
		title = url;
	  }
	}
	else if (url.startsWith("about:") || url.startsWith("file:")) { // about: and file: generate a security error when we try to fetch ..
	  uri = "/icons/nofavicon.png";
	  fetchedUri = false;
	  // They are draggable, but keep favicon = nofavicon
	  protect = false;
	}
	else if (disableFavicons_option) {
	  fetchedUri = false;
	  protect = false;
	}
	else {
	  // Retrieve saved uri or set to undefined by default
	  // and trigger favicon retrieval in background
	  uri = undefined;
	  if (savedBkmkUriList != undefined) { // We are migrating to BN list ..
		uri = savedBkmkUriList[BTN_id];
		if ((uri == "/icons/nofavicontmp.png")  // Last time we stopped the sidebar
			|| (uri == "/icons/waiting.gif")    // it didn't have time to fetch that
		   ) {									// favicon .. so let's do it now.
		  uri = undefined;
		}
	  }
	  else if (savedBNList != undefined) { // We are still at initial load ..
		let BN = savedBNList[BTN_id];
		if (BN != undefined) {
		  uri = BN.faviconUri;
		  if ((uri == "/icons/nofavicontmp.png")  // Last time we stopped the sidebar
			  || (uri == "/icons/waiting.gif")    // it didn't have time to fetch that
			 ) {                                  // favicon .. so let's do it now.
			uri = undefined;
		  }
		}
	  }
	  protect = false;

	  // Trigger asynchronous favicon retrieval process if favicon uri not found
	  if (uri == undefined) {
		// Set tmp favicon and remember it in case the add-on is stopped before we had
		// a chance to get its image.
		uri = "/icons/nofavicontmp.png";
		fetchedUri = false;
		triggerFetch = true;
		if (faviconWorker != undefined) {
		  countFetchFav++;
//console.log("countFetchFav 1: "+countFetchFav+" BTN_id: "+BTN_id);
		}
	  }
	  else {
		fetchedUri = true;
	  }
	}

	if (forceProtect != undefined) { // General rule does not apply (e.g. BTN_id starting with "place:")
	  protect = forceProtect;
	}
	node = new BookmarkNode (
	  BTN_id, type, level, BTN.parentId, BTN.dateAdded, protect,
	  title, uri, fetchedUri, url
	);

	if (triggerFetch && !pauseFavicons_option) { // Trigger favicon fetch, except if paused
	  // This is a bookmark, so here no need for cloneBN(), there is no tree below
	  if (faviconWorker != undefined) {
		faviconWorker({data: ["get", BTN_id, url, enableCookies_option]});
	  }
	}
  }

  // Add child to parentBN if provided, adjusting index of other children as needed
  if (parentBN != undefined) {
	let children = parentBN.children;
	if (children == undefined) { // No list of children so far
	  parentBN.children = [node];
	}
	else if (index >= children.length) { // Append child at end
	  children.push(node);
	}
	else { // Insert child at position
	  children.splice(index, 0, node);
	}
  }

  return(node);
}

// Trim content of a folder based on timestamps of its BN's - used for the BSP2 trash.
// Note: remain at first level (do not recurse inside folder items)
//
// BN: BookmarkNode folder to trim
// retention: duration in past to keep things, in milliseconds  
function BN_folderTrim (BN, retention) {
  let children = BN.children;
  let len;
  if ((children != undefined) && ((len = children.length) > 0)) {
	let trimTime = (new Date ()).getTime() - retention;
	let i;
	for (let j=0 ; j<len ;j++) {
	  i = children[j];
	  if (i.trashDate < trimTime) { // Remove node (definitely)
		browser.bookmarks.removeTree(i.id);
	  }
	}
  } 
}

// Empty a folder from its content - used for the BSP2 trash
// Note: remain at first level (do not recurse inside folder items)
//
// BN: BookmarkNode folder to trim
function BN_folderClean (BN) {
  let children = BN.children;
  let len;
  if ((children != undefined) && ((len = children.length) > 0)) {
	for (let j=0 ; j<len ;j++) {
	  browser.bookmarks.removeTree(children[j].id);
	}
  } 
}

// Set trash state recursively on a bookmark item and its possible content
//
// BN: BookmarkNode folder to mark / unmark
// is_inTrash: Boolean
function BN_markTrash (BN, is_inTrash) {
  if (is_inTrash) {
	BN.inBSP2Trash = true;
	BN.trashDate = (new Date ()).getTime();
  }
  else {
	BN.inBSP2Trash = false;
  }
  if (BN.type == "folder") {
	let children = BN.children;
	let len;
	if ((children != undefined) && ((len = children.length) > 0)) {
	  for (let j=0 ; j<len ;j++) {
		BN_markTrash(children[j], is_inTrash);
	  }
	}
  } 
}

/*
 * Function to normalize (remove diacritics) a string
 * Cf. https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript 
 */
function strNormalize (str) {
  return(str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
}

/*
 * Function to normalize (remove diacritics) and lowercase a string
 * Cf. https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript 
 */
function strLowerNormalize (str) {
  return(str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
}

// Verify a BookmarkNode against a match - normalized case insensitive
// a_matchStr is an array of normalized lower case word strings to match (no space)
//
// Returns a Boolean, true or false
function BN_match (BN, a_matchStr, matchRegExp, isRegExp, isTitleSearch, isUrlSearch) {
  if (BN.type == "separator") {
	return (false);
  }

  let isMatch;
  if (isRegExp) {
	let url;
	isMatch = (isTitleSearch && matchRegExp.test(strLowerNormalize(BN.title)))
			  || (isUrlSearch && ((url = BN.url) != undefined) && matchRegExp.test(strLowerNormalize(url)));
  }
  else { // Match all words with both or only one as needed (note, if both, we can have
		 // some of the words matching only title, and some others matching url, the native
		 // condition is that each word match at least one, and can mix)
	isMatch = true;
	let url;
	let str;
	let len = a_matchStr.length;
	for (let i=0 ; i<len ;i++) {
	  str = a_matchStr[i];
	  if ((!isTitleSearch || (strLowerNormalize(BN.title).indexOf(str) == -1))
		  && (!isUrlSearch || ((url = BN.url) == undefined) || (strLowerNormalize(url).indexOf(str) == -1))
	     ) {
		isMatch = false; // One word is not matching at least, stop there, result is false
		break;
	  };
	}
  }
  return (isMatch);
}

// Search a BookmarkNode and its children for a match - normalized case insensitive
// a_matchStr is an array of normalized lowercase word strings to match (no space)
// If is_recur is specified and is false, then do 1 level search only (no sub-folders)
//
// Returns list of matches in a_result (supplied at start as an empty array []
function BN_search (BN, a_matchStr, matchRegExp, isRegExp, isTitleSearch, isUrlSearch, a_result, is_recur = true) {
  if (BN_match(BN, a_matchStr, matchRegExp, isRegExp, isTitleSearch, isUrlSearch)) {
	a_result.push(BN);
  }
  if (is_recur && (BN.type == "folder")) {
	let children = BN.children;
	if (children != undefined) {
	  let url;
	  let i;
	  let len = children.length;
	  for (let j=0 ; j<len ;j++) {
		i = children[j];
		if ((i.type != "separator")
			&& (((url = i.url) == undefined) || !url.startsWith("place:"))  // Ignore special bookmarks
		   ) {
		  BN_search(i, a_matchStr, matchRegExp, isRegExp, isTitleSearch, isUrlSearch, a_result, is_recur)
		}
	  }
	}
  }
}

// Search a BookmarkNode and its children for inclusion of a given BN
//
// Returns Boolean, true if searched BN is included
function BN_includes (BN, sBN) {
  let found = Object.is(BN, sBN);
  if (!found && (BN.type == "folder")) {
	let children = BN.children;
	let len;
	if ((children != undefined) && ((len = children.length) > 0)) {
	  for (let i=0 ; i<len ; i++) {
		if (BN_includes(children[i], sBN)) {
		  found = true;
		  break;
		}
	  }
	}
  }
  return (found);
}


/*
 * Functions
 * ---------
 */

/*
 * Trace object contents
 */
function BN_trace (BN) {
  trace("---------------------");
  trace("BookmarkNode");
  trace("  id:                "+BN.id);
  trace("  type:              "+BN.type);
  trace("  level:             "+BN.level);
  trace("  parentId:          "+BN.parentId);
  trace("  dateAdded:         "+BN.dateAdded);
  trace("  protect:           "+BN.protect);
  trace("  title:             "+BN.title);
  let uri = BN.faviconUri;
  if (uri == undefined) {
	trace("  faviconUri:        undefined");
  }
  else {
	trace("  faviconUri:        "+BN.faviconUri.slice(0, 100));
  }
  trace("  fetchedUri:        "+BN.fetchedUri);
  trace("  url:               "+BN.url);
  let children = BN.children;
  if (children == undefined) {
	trace("  children:          undefined");
  }
  else {
	trace("  children_length:   "+BN.children.length);
  }
  trace("  dateGroupModified: "+BN.dateGroupModified);
  trace("  inBSP2Trash:       "+BN.inBSP2Trash);
  trace("  trashDate:         "+BN.trashDate);
  trace("  unmodifiable:      "+BN.unmodifiable);
}

/*
 * Recursive build of BNList from a BN tree
 * BNList: the list (Object) to reconstruct
 * BN: source BN tree to build from
 * 
 * Returns: true if no null encountered while completing the BNList (= no error)
 */
function recurRebuildBNList (BNList, BN) {
  let rc;
  if (BN == null) { // Error case, corruption from last jsonified save
	rc = false;
  }
  else {
	rc = true;
	BNList[BN.id] = BN;
	if (BN.type == "folder") {
	  let children = BN.children;
	  if (children != undefined) {
		let len = children.length;
		for (let i=0 ; i<len ;i++) {
		  if (!recurRebuildBNList(BNList, children[i])) {
			rc = false;
		  }
		}
	  }
	}
  }
  return(rc);
}

/*
 * Rebuild the full BNList from a BN tree
 * BNList: the list (Object) to reconstruct
 * BN: source BN tree to build from
 * 
 * Returns: true if no null encountered while completing the BNList (= no error)
 */
function rebuildBNList (BNList, BN) {
  let rc = recurRebuildBNList(BNList, BN);
  BNList[0] = BN;
  return(rc);
}

/*
 * Search the full BNList for matches - normalized case insensitive
 * a_matchStr is an array of normalized lower case word strings to match (no space)
 * 
 * Returns: an array listing matching BookmarkNodes
 */
function searchCurBNList (a_matchStr, matchRegExp, isRegExp, isTitleSearch, isUrlSearch) {
  let a_result = [];

  let names = Object.getOwnPropertyNames(curBNList);
  let BN;
  let url;
  let i;
  let len = names.length;
  for (let j=0 ; j<len ; j++) {
	i = names[j];
	if ((i != 0) && (i != Root) && !i.startsWith("place:")) { // Do not match with Root, nor with most visited nor recent bookmarks
	  BN = curBNList[i];
	  if ((BN.type != "separator")
		  && (((url = BN.url) == undefined) || !url.startsWith("place:"))  // Ignore special bookmarks
		  && BN_match(BN, a_matchStr, matchRegExp, isRegExp, isTitleSearch, isUrlSearch)
		 ) {
		a_result.push(BN);
	  }
	}
  }
  return(a_result);
}

/*
 * Search from current BN for matches - normalized case insensitive
 * If current BN is a folder (or Root), ignore it in the search
 * If it is a bookmark/separator, go to parent folder (and ignore the parent in the search)
 * 
 * a_matchStr is an array of normalized lower case word strings to match (no space)
 * If is_recur is specified and is false, then do 1 level search only (no sub-folders)
 * 
 * Returns: an array listing matching BookmarkNodes
 */
function searchBNRecur (BN, a_matchStr, matchRegExp, isRegExp, isTitleSearch, isUrlSearch, is_recur = true) {
  let a_result = [];

  if (BN.type != "folder") { // Parent must be a folder ..
	BN = curBNList[BN.parentId];
  }
  let url;
  if (((url = BN.url) == undefined) || !url.startsWith("place:")) { // Ignore special bookmarks
	let children = BN.children;
	if (children != undefined) {
	  let i;
	  let len = children.length;
	  for (let j=0 ; j<len ;j++) {
		i = children[j];
		if ((i.type != "separator")
			&& (((url = i.url) == undefined) || !url.startsWith("place:"))  // Ignore special bookmarks
		   ) {
		  BN_search (i, a_matchStr, matchRegExp, isRegExp, isTitleSearch, isUrlSearch, a_result, is_recur);
		}
	  }
	}
  }

  return(a_result);
}

/*
 * Uniquely append a BN to a unique ordered list of BNs (Array) =
 * - do not include if already there or already included by a listed BN
 * - if added, add at end and remove previous listed BNs which it includes
 * Unique list property is that all its elements are different, and none includes another one in its tree.
 * 
 * bnId = Id of BN to add
 * BN = BN to add
 * a_BNId = list of unique BN Ids to add to, [] if empty, cannot be undefined
 * a_BN = list of unique BNs to add to, in same order than a_BNId, [] if empty
 * addCopy = Boolean, if true add a copy  of BN, else add BN, to a_BN (if not undefined)
 */
function uniqueListAddBN (bnId, BN, a_BNIds, a_BN, addCopy = false) {
  let is_included = false;
  let len = a_BN.length;
  if (len > 0) {
	let is_including = false;
	let tmpBN;
	for (let i=0 ; i<len ; ) { // i is incremented, or len is decremented, inside loop
	  tmpBN = a_BN[i];
	  // Check if BN equals or is under tmpBN tree
 	  // If is_including is true (meaning BN includes tmpBN), then we do not need to check for is_included anymore,
	  // because no node after previously included tmpBN could exist in unique list and include BN, or it would also
	  // include current tmpBN, breaking the unique property of the list (all different, and none includes another) 
	  if (!is_including && BN_includes(tmpBN, BN)) {
		is_included = true;
		break;
	  }
	  else if (BN_includes(BN, tmpBN)) { // Check if BN is under tmpBN tree. Note: tmpBN != BN if we are here
		is_including = true;
		// Remove tmpBN from list, since BN includes it and we're going to add it
		a_BNIds.splice(i, 1);
		a_BN.splice(i, 1);
		// Decrease length
		len--;
	  }
	  else {
		i++;
	  }
	}
  }
  if (!is_included) { // If not there, add at end
	a_BNIds.push(bnId);
	if (addCopy) { // Add a copy of BN
	  a_BN.push(BN_copy(BN));
	}
	else {
	  a_BN.push(BN);
	}
  }
}

/*
 * Create a copy of a unique list (containing a copy of all nodes)
 * 
 * a_BN = list of unique BNs to copy, [] if empty
 * Returns an Arry copy of that list, with copied BookmarkNodes
 */
function uniqueListCopy (a_BN) {
  let a_BNcopy = [];
  let len = a_BN.length;
  for (let i=0 ; i<len ; i++) {
	a_BNcopy.push(BN_copy(a_BN[i]));
  }
  return(a_BNcopy);
}

/*
 * Scan a BN tree for stats and for favicons to fetch, and updates as needed
 * function of disableFavicons_option.
 * 
 * BN = BN tree to scan
 * faviconWorker = function to post favicons fetching to
 * doStats = if false, do not update counters
 *  
 * Returns: maintains global countxx variable, and triggers favicon fetching if needed
 */
function scanBNTree (BN, faviconWorker, doStats = true) {
  let type = BN.type;
  if (type == "folder") {
	let bnId = BN.id;
	if (bnId != Root) { // Do not count Root (not visible)
	  let url = BN.url;
	  if (url == undefined) { // Do not count folders with url ("place:" special folders),
							  // they are to be counted as bookmarks
		if (doStats)
		  countFolders++;
		if (BN.title == BSP2TrashName) {
		  bsp2TrashFldrBNId = bnId;
		  bsp2TrashFldrBN = BN;
		}
	  }
	  else if (url.startsWith("place:")) { // Remember pointers at special folders ..
//BN.type = "bookmark";
		if (doStats)
		  countBookmarks++;
		if (url.includes(RecentBkmkSort)) {
		  recentBkmkBNId = bnId;
		  recentBkmkBN = BN;
		}
		else if (url.includes(MostVisitedSort)) {
		  mostVisitedBNId = bnId;
		  mostVisitedBN = BN;
		}
		else if (url.includes(RecentTagSort)) {
		  recentTagBNId = bnId;
		  recentTagBN = BN;
		}
	  }
	}
	let children = BN.children;
 	if (children != undefined) {
	  let len = children.length;
	  for (let i=0 ; i<len ;i++) {
 		scanBNTree(children[i], faviconWorker, doStats);
 	  }
    }
  }
  else if (type == "separator") {
	if (doStats)
	  countSeparators++;
  }
  else { // Presumably a bookmark
	let bnId = BN.id;
	if (type == "bookmark") {
	  if (bnId.startsWith("place:")) { // Do not count special bookmarks under special place: folders
									   // tagged with "place:" before their id when inserted
		if (!bnId.startsWith("place:mostVisited_")) { 
		  // If one of recently bookmarked, try to avoid any un-needed fetches
		  // by getting the uri directly from the original bookmark
		  let origBnId = bnId.substring(6); // Remove "place:"
		  let origBN = curBNList[origBnId];
		  if (origBN != undefined) {
			BN.faviconUri = origBN.faviconUri;
		  }
		}
	  } else {
		if (doStats)
		  countBookmarks++;
	  }
	}
	else {
	  trace("Odd bookmark type: "+type);
	  if (doStats)
		countOddities++;
	}
	let url = BN.url;
	if ((url == undefined) || url.startsWith("file:")) { // Change nothing
	}
	else if (url.startsWith("about:")) { // Change nothing also, except if protect is set unduly
	  BN.protect = bnId.startsWith("place:"); 
	}
	else if (migration_spfldr && url.startsWith("place:")) { // Change nothing also, but transform (and remember pointers) ..
	  // These are now special folders, still counted as bookmarks
	  BN.type = "folder";
	  BN.fetchedUri = true; // Tell to use special favicon instead of standard folder favicon
	  if (url.includes(MostVisitedSort)) {
		mostVisitedBNId = bnId;
		mostVisitedBN = BN;
	  }
	  else if (url.includes(RecentTagSort)) {
		recentTagBNId = bnId;
		recentTagBN = BN;
	  }
	  else if (url.includes(RecentBkmkSort)) {
		recentBkmkBNId = bnId;
		recentBkmkBN = BN;
	  }
	}
	else if (disableFavicons_option) {
	  BN.faviconUri = undefined;
	  BN.fetchedUri = false;
	}
	else {
	  let triggerFetch;
	  let uri = BN.faviconUri;
	  if ((uri == undefined) || (uri == "/icons/waiting.gif")) {
		BN.faviconUri = "/icons/nofavicontmp.png";
		BN.fetchedUri = false;
		triggerFetch = true;
		if (doStats) {
		  countFetchFav++;
//console.log("countFetchFav 2: "+countFetchFav+" bnId: "+bnId);
		}
	  }
	  else if (uri == "/icons/nofavicontmp.png") {
		BN.fetchedUri = false;
		triggerFetch = true;
		if (doStats) {
		  countFetchFav++;
//console.log("countFetchFav 3: "+countFetchFav+" bnId: "+bnId);
		}
	  }
	  else if ((url.toLowerCase().endsWith(".pdf")) && (uri == "/icons/nofavicon.png")) {
		BN.faviconUri = "/icons/pdffavicon.png";
	  }
	  else {
		triggerFetch = false;
	  }

	  if (triggerFetch && !pauseFavicons_option) { // Trigger favicon fetch, except if paused
		// This is a bookmark, so here no need for cloneBN(), there is no tree below
//		faviconWorker.postMessage(["get", BN.id, BN.url, enableCookies_option]);
		faviconWorker({data: ["get", BN.id, BN.url, enableCookies_option]});
	  }
	}
  }
}