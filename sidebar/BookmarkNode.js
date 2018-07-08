'use strict';


/*
 * Constants
 */
const Root = "root________";
const PersonalToobar = "toolbar_____";
const BookmarksMenu =  "menu________";
const OtherBookmarks = "unfiled_____";
const MobileBookmarks = "mobile______";


/*
 * Global variables, seen by other instances (var)
 */
var countBookmarks = 0, countFolders = 0, countSeparators = 0, countOddities = 0;


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
//    undefined for separators and for root node, or for bookmarks for which we didn't yet
//    retrieve the favicon.
// fetchedUri Optional
//    A boolean indicating for bookmark if the uri is internal or was fetched from Internet,
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
//    Does not change when a child or any child of child .. chnages of title / url.
//    undefined if not a folder.
// unmodifiable Optional
//    undefined or a string as described by the type bookmarks.BookmarkTreeNodeUnmodifiable. Represents the reason that the node can't be changed.
//    Always undefined today
function BookmarkNode (id, type, level, parentId, dateAdded, protect = false, 
		               title = undefined, faviconUri = undefined, fetchedUri = false, url = undefined,
		               children = undefined, dateGroupModified = undefined,
		               unmodifiable = undefined) {
  this.id                = id;
  this.type              = type;
//  this.index             = index;
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
  this.unmodifiable      = unmodifiable;
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
  return(JSON.parse(jsonstr));
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
		                       BN.unmodifiable);
  let children = BN.children;
  if (children != undefined) {
	let nodeChildren = node.children = new Array (children.length);
	let j = 0;
	for (let i of children) {
	  nodeChildren[j++] = BN_copy(i);
	}
  }
  return(node);
}

// Delete a BookmarkNode from its parent and from list bnList (curBNList by default) if real.
// Note: for a move, set real to false for both delete and insert.
function BN_delete (BN, parentId = undefined, real = true, bnList = curBNList) {
  if (parentId == undefined) {
	if ((parentId = BN.parentId) == undefined) {
	  return; // Cannot delete root
	}
  }
  let parentBN;
  if ((parentBN = bnList[parentId]) == undefined) { // No parent .. error case, for robustness..
	if (real) {
	  delete bnList[BN.id];
	}
	return;
  }
  let index = parentBN.children.indexOf(BN);
  if (index != -1) {
	parentBN.children.splice(index, 1);
	if (real) {
	  delete bnList[BN.id];
	}
  }
}

// Recursively update the level of a BookmarkNode tree
function BN_updateLevel (BN, level) {
  BN.level = level;
  let children = BN.children;
  if (children != undefined) {
	for (let i of BN.children) {
	  BN_updateLevel(i, level+1);
	}
  }
}

// Insert a BookmarkNode under its parent and in list bnList (curBNList by default) if real
// at 0-based position index (if -1, append at end)
// Note: for a move, set real to false for both delete and insert.
//
// requires function insertFF56EndGapSep (parentBN) {}
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
	if (BeforeFF57) {
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
// Relies on Global variables savedBkmkUriList, savedBNList and uglyHackTabFavIconUrl.
// Returns the created node.
let uglyHackTabFavIconUrl = undefined; // Used by bkmkDropHandler() to speed up favIconUrl
                                       // retrieval process when dragging & dropping a tab,
                                       // since there is no way to pass the favicon to the
                                       // bookmarks.create() call.
function BN_create (BTN, level, faviconWorker, parentBN = undefined) {
  let node;
  let BTN_id = BTN.id;
  let index = BTN.index;
  let type = getType(BTN);
  let protect;
  if (type == "folder") {
	countFolders++;

	let uri, fetchedUri;
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
	else {
	  uri = "/icons/folder.png";
	  protect = false;
	  fetchedUri = false;
	}

	// Pre-create an empty array of children if needed
	let children = BTN.children;
	if (children != undefined) {
	  children = new Array (children.length);
	}

	// Create new node
	node = new BookmarkNode (
	  BTN_id, "folder", level, BTN.parentId, BTN.dateAdded, protect,
	  BTN.title, uri, fetchedUri, undefined,
	  children, BTN.dateGroupModified
	);
  }
  else if (type == "separator") {
	if ((countSeparators++ == 0) || BeforeFF57) { // First separator is not draggable,
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
	if (type == "bookmark")
	  countBookmarks++;
	else {
	  trace("Odd bookmark type: "+type);
	  countOddities++;
	}

	let uri, fetchedUri;
	let triggerFetch = false;
	let url = BTN.url;
	if (url == undefined) {
	  trace("Bookmark with undefined URL !");
	  traceBTN(BTN);
	  url = "<undefined!>";
	  uri = "/icons/nofavicon.png";
	  fetchedUri = false;
	  protect = false;
	}
	else if (url.startsWith("place:")) {
	  uri = "/icons/specfavicon.png";
	  fetchedUri = false;
	  protect = true;
	}
	else if (url.startsWith("about:")) { // about: is protected - security error ..
	  uri = "/icons/nofavicon.png";
	  fetchedUri = false;
	  protect = (url != "about:blank"); // about:blank is not protected ...
                                        // It is draggable, but keep favicon = nofavicon
	}
	else if (disableFavicons_option) {
	  uri = undefined;
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
           ) {                                  // favicon .. so let's do it now.
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
	  }
	  else {
		fetchedUri = true;
	  }
	}

	node = new BookmarkNode (
	  BTN_id, type, level, BTN.parentId, BTN.dateAdded, protect,
	  BTN.title, uri, fetchedUri, url
	);

	if (triggerFetch) {
	  if (uglyHackTabFavIconUrl == undefined) {
		// This is a bookmark, so here no need for cloneBN(), there is no tree below
//		faviconWorker.postMessage(["get", BTN_id, url, enableCookies_option]);
		faviconWorker({data: ["get", BTN_id, url, enableCookies_option]});
	  }
	  else {
		// This is a bookmark, so here no need for cloneBN(), there is no tree below
//		faviconWorker.postMessage(["icon", BTN_id, uglyHackTabFavIconUrl, enableCookies_option]);
		faviconWorker({data: ["icon", BTN_id, uglyHackTabFavIconUrl, enableCookies_option]});
//        trace("Retrieval demand 1 sent for icon:"+uglyHackTabFavIconUrl);
		uglyHackTabFavIconUrl = undefined; // One shot ..
	  } 
	}
  }

  // Add child to parentBN if provided, adjusting index of other children as needed
  if (parentBN != undefined) {
	let children = parentBN.children;
	if (children == undefined) { // No list of children so far
	  parentBN.children = [node];
//      node.index = 0;
	}
	else if (index >= children.length) { // Append child at end
//      node.index =
	  children.push(node);
	}
	else { // Insert child at position
	  children.splice(index, 0, node);
	  // Reindex next children
//      let len = children.length;
// 		for (let i=index+1 ; i<len ; i++) {
//     	  children[i].index = i;
//   	}
	}
  }

  return(node);
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
//  trace("  index:             "+BN.index);
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
  trace("  unmodifiable:      "+BN.unmodifiable);
}

/*
 * Rebuild the full BNList from a BN tree
 * 
 * Returns: nothing, just completes the BNList
 */
function rebuildBNList (BNList, BN) {
  BNList[BN.id] = BN;
  if (BN.type == "folder") {
 	let children = BN.children;
 	if (children != undefined) {
 	  for (let i of children) {
 	    rebuildBNList(BNList, i);
 	  }
    }
  }
}

/*
 * Scan the full BN tree for stats and for favicons to fetch, and updates as needed
 * funciton of disableFavicons_option.
 * 
 * Returns: maintains global countxx variable, and triggers favicon fetching if needed
 */
function scanBNTree (BN, faviconWorker) {
  let type = BN.type;
  if (type == "folder") {
	countFolders++;
	let children = BN.children;
 	if (children != undefined) {
 	  for (let i of children) {
 		scanBNTree(i, faviconWorker);
 	  }
    }
  }
  else if (type == "separator") {
	countSeparators++;
  }
  else {
	if (type == "bookmark")
	  countBookmarks++;
	else {
	  trace("Odd bookmark type: "+type);
	  countOddities++;
	}
	let url = BN.url;
	if ((url == undefined)
		|| (url.startsWith("place:"))
		|| (url.startsWith("about:"))
	   ) { // In those 3 cases, change nothing
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
	  }
	  else if (uri == "/icons/nofavicontmp.png") {
		BN.fetchedUri = false;
		triggerFetch = true;
	  }
	  else {
		triggerFetch = false;
	  }

	  if (triggerFetch) {
		// This is a bookmark, so here no need for cloneBN(), there is no tree below
//		faviconWorker.postMessage(["get", BN.id, BN.url, enableCookies_option]);
		faviconWorker({data: ["get", BN.id, BN.url, enableCookies_option]});
	  }
	}
  }
}