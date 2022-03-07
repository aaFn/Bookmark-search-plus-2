'use strict';


/*
 * Constants
 */
const HNACTION_BSP2START           = "bsp2start";
const HNACTION_CLEARHISTORY        = "bsp2clearhist";
const HNACTION_RELOADFFAPI         = "reloadffapi";
const HNACTION_AUTORELOADFFAPI     = "autoreloadffapi";
const HNACTION_BKMKCREATE          = "create";
const HNACTION_BKMKCREATEFROMTRASH = "create_ft";
const HNACTION_BKMKCREATEFROMTRASH_DESYNC = "create_ft_desync";
const HNACTION_BKMKCHANGE          = "change";
const HNACTION_BKMKCHANGE_DESYNC   = "change_desync"; // De-sync problem detected when doing a Change on bookmark
const HNACTION_BKMKMOVE            = "move";
const HNACTION_BKMKMOVE_DESYNC     = "move_desync"; // De-sync problem detected when doing a bookmark move
const HNACTION_BKMKREORDER         = "reorder";
const HNACTION_BKMKREORDER_DESYNC  = "reorder_desync"; // De-sync problem detected when reordering bookmarks
const HNACTION_BKMKREMOVE          = "remove";
const HNACTION_BKMKREMOVE_DESYNC   = "remove_desync"; // De-sync problem detected when removing a bookmark (move to trash)
const HNACTION_BKMKREMOVETOTRASH   = "remove_tt";
const HNACTION_BKMKREMOVETOTRASH_DESYNC  = "remove_tt_desync"; // De-sync problem detected when removing a bookmark (move to trash)
const HNSTATE_ACTIVEBRANCH   = 0;
const HNSTATE_INACTIVEBRANCH = 1;
const HNREVOP_NONE   = 0;
const HNREVOP_ISUNDO = 1;
const HNREVOP_ISREDO = 2;
const HNREVERSION_NONE   = 0;
const HNREVERSION_UNDONE = 1;
const HNREVERSION_REDONE = 2;


/*
 * Global variables, seen by other instances (var)
 */
// Declared in BookmarkNode.js
//var mostVisitedBNId, recentTagBNId, recentBkmkBNId;


/*
 * Global variables, private to including page (let)
 */


/*
 * Objects
 */

//***************************************************
//HistoryNode "object".
//Must be serializable .. so no function in it ..
//***************************************************
// Constructor:
//-------------
// timestamp
//    A number in milliseconds since the epoch representing time of recording the action.
//    Filled by the Constructor.
// *action
//    A String indicating the recorded action: "bsp2start", "reloadffapi", "create", "change", "move", "reorder", "remove".
//    Note: nothing is recorded for favicon load / changes.
// *is_multi
//    Boolean, if true, designate a multiple selection action to group them under history and for undo / redo
//    (undefined if "bsp2start" or "reloadffapi".
// *id_list
//    Array of String identifying the bookmark Ids subject to the multiple action (undefined if is_multi is false)
// id_list_len
//    Integer, length of the id_list array, initialized when is_multi is true, else undefined
// hnref_list
//    Array of offset integer to collect relative position of bookmarks later in list corresponding to the multiple action
//    (undefined if is_multi is false, else initialized to an array of size id_list_len)
// found_id_list
//    Array of String to collect bookmarks ids later in list corresponding to the multiple action
//    (undefined if is_multi is false, else initialized to [])
// is_complete
//    Boolean, undefined if is_multi is false and revOp is undefined,
//    else initialized to false, and set to true when all ids in list are received, or when reversion operation is received. 
// *id
//    String identifying the bookmark Id subject to the action (undefined if "bsp2start" or "reloadffapi", or if is_multi is true).
// *type
//    Bookmark type.
// *path
//    Path = Array of parent title String, from top to deepest (last one = parent of bookmark item)
// *parentId
//    Bookmark parentID.
// *index
//    Bookmark index.
// *title
//    Bookmark title.
// *faviconUri
//    Favicon.
// *url
//    Bookmark URL.
// *inBSP2Trash
//    Record if in trash or not.
// *bnTreeJson
//    Recursive representation of node and its children if any, when "remove" (to be able to undo the remove, when no BSP2 trash).
// *toPath
//    Target path of move = Array of parent title String, from top to deepest (last one = parent of bookmark item)
// *toParentId
//    Target parentId when "move", else undefined.
// *toIndex
//    Target index when "move", else undefined.
// *toTitle
//    Changed to title when "change" (undefined if no change), else undefined.
// *toUrl
//    Changed to URL when "change" (undefined if no change), else undefined.
// *childIds
//    Array of String, initial order when "reorder", else undefined.
// *toChildIds
//    Array of String, target order when "reorder", else undefined.
// *state
//    Integer. 0 (or undefined) means "active branch", 1 means "inactive branch"
// *revOp
//    If undefined, this is a normal operation. Else, 1 is for an "undo" record, and 2 is for a "redo" record
// *revOp_HNref
//    Integer, if revOp is defined and > 0, this is a relative (negative) integer to get to undone / redone HN from this node
//    Else, if reversion (below) is defined and > 0, this is a relative (positive) integer to get to undoer / redoer HN
//
// Additional fields, added later on:
//-----------------------------------------------------------
// reversion - Added or modififed when a reversion operation (undo / redo) is made by BSP2 to a bookmark item  
//    Integer, if defined and different from 0, tells if the record was undone (= 1) or redone (= 2) by a further record
//    Note that state can be "inactive branch" only when reversion is "undone". If reversion is "redone", state can only be "active branch".
// revOp_HNref_list
//    Array of offset integer to collect relative position of revOp operations later in list corresponding to that bookmark action
//    (filled with successive revOp_HNref as they get replaced, so does not contain last one, which is the active one)
// multi_HNref - Added when the record is recognized to be part of a multi bookmarks action  
//    Integer, undefined if not part of any multi bookmarks action, else relative (negative) integer to get to multi bookmarks node
//    Note: can have a value only when is_multi is false, which means when id is defined.
function HistoryNode (action,
					  is_multi = undefined, id_list = undefined, id = undefined, type = undefined, path = undefined, parentId = undefined, index = undefined,
					  title = undefined, faviconUri = undefined, url = undefined, inBSP2Trash = undefined, bnTreeJson = undefined,
					  toPath = undefined, toParentId = undefined, toIndex = undefined, toTitle = undefined, toUrl = undefined,
					  childIds = undefined, toChildIds = undefined,
					  state = HNSTATE_ACTIVEBRANCH, revOp = undefined, revOp_HNref = undefined) {
  this.timestamp   = (new Date ()).getTime();
  this.action      = action;
  this.is_multi    = is_multi;
  if (is_multi == true) {
	this.id_list     = id_list;
	let len = this.id_list_len = id_list.length;
	this.hnref_list  = new Array (len);
	this.found_id_list = [];
	this.is_complete = false;
  }
  else if (id != undefined) {
	this.id          = id;
	this.type        = type;
	this.path        = path;
	this.parentId    = parentId;
	this.index       = index;
	if (title != undefined) {
	  this.title       = title;
	}
	if (faviconUri != undefined) {
	  this.faviconUri  = faviconUri;
	}
	if (url != undefined) {
	  this.url         = url;
	}
	if (inBSP2Trash != undefined) {
	  this.inBSP2Trash = inBSP2Trash;
	}
	if (bnTreeJson != undefined) {
	  this.bnTreeJson  = bnTreeJson;
	}
	if (toParentId != undefined) {
	  this.toPath      = toPath;
	  this.toParentId  = toParentId;
	  this.toIndex     = toIndex;
	}
	if (toTitle != undefined) {
	  this.toTitle     = toTitle;
	}
	if (toUrl != undefined) {
	  this.toUrl       = toUrl;
	}
	if (childIds != undefined) {
	  this.childIds    = childIds;
	  this.toChildIds  = toChildIds;
	}
  }
  if ((is_multi == true) || (id != undefined)) {
	this.state = state;
	if (revOp != undefined) {
	  this.revOp       = revOp; 
	  this.is_complete = false;
	}
	if (revOp_HNref != undefined) {
	  this.revOp_HNref = relrevOp_HNref	}
  }
}

/*
 * Trace object contents
 */
function HN_trace (HN) {
  console.log("---------------------");
  console.log("HistoryNode");
  let ts = HN.timestamp;
  let tsDate = new Date ();
  tsDate.setTime(ts);
  console.log("  timestamp:   "+ts+" ("+tsDate.toISOString()+" / "+tsDate.toLocaleString()+")");
  console.log("  action:      "+HN.action);
  let is_multi = HN.is_multi;
  console.log("  is_multi:    "+is_multi);
  let id;
  if (is_multi) {
	console.log("  id_list_len   "+HN.id_list_len);
	console.log("  id_list       "+HN.id_list);
	console.log("  hnref_list    "+HN.hnref_list);
	console.log("  found_id_list "+HN.found_id_list);
	console.log("  is_complete   "+HN.is_complete);
  }
  else if ((id = HN.id) != undefined) {
	console.log("  id:           "+id);
	console.log("  type:         "+HN.type);
	console.log("  parentId:     "+HN.parentId);
	console.log("  index:        "+HN.index);
	let title = HN.title;
	if (title != undefined) {
	  console.log("  title:       "+title);
	}
	let faviconUri = HN.faviconUri;
	if (faviconUri != undefined) {
	  console.log("  faviconUri:  "+faviconUri);
	}
	let inBSP2Trash = HN.inBSP2Trash;
	if (inBSP2Trash != undefined) {
	  console.log("  inBSP2Trash: "+inBSP2Trash);
	}
	let url = HN.url;
	if (title != undefined) {
	  console.log("  url:         "+url);
	}
	let bnTreeJson = HN.bnTreeJson;
	if (bnTreeJson != undefined) {
	  console.log("  bnTreeJson:  "+bnTreeJson);
	}
	let toParentId = HN.toParentId;
	if (toParentId != undefined) {
	  console.log("  toParentId:  "+toParentId);
	  console.log("  toIndex:     "+HN.toIndex);
	}
	let toTitle = HN.toTitle;
	if (toTitle != undefined) {
	  console.log("  toTitle:     "+toTitle);
	}
	let toUrl = HN.toUrl;
	if (toUrl != undefined) {
	  console.log("  toUrl:       "+HN.toUrl);
	}
	let childIds = HN.childIds;
	if (childIds != undefined) {
	  console.log("  childIds:    "+childIds);
	  console.log("  toChildIds:  "+HN.toChildIds);
	}
  }
  if ((is_multi == true) || (id != undefined)) {
	console.log("  state:       "+HN.state);
	let revOp = HN.revOp;
	if (revOp != undefined) {
	  console.log("  revOp:       "+revOp);
	  console.log("  is_complete: "+HN.is_complete);
	}
	let revOp_HNref = HN.revOp_HNref;
	if (revOp_HNref != undefined) {
	  console.log("  revOp_HNref: "+revOp_HNref);
	}
	let reversion = HN.reversion;
	if (reversion != undefined) {
	  console.log("  reversion:   "+reversion);
      console.log("  revOp_HNref_list "+HN.revOp_HNref_list)
	}
  }
  if (id != undefined) {
	let multi_HNref = HN.multi_HNref;
	if (multi_HNref != undefined) {
	  console.log("  multi_HNref: "+multi_HNref);
	}
  }
}

//***************************************************
//HistoryList "object".
//***************************************************
//Constructor:
//-------------
// hnList
//   List (array) of HistoryNode
// activeIndex
//   Index in list of last active and not undone record (undefined if the list is empty)
// lastMulti
//   Index in list of last is_multi action, when not yet complete (else, undefined)
// lastRevOp
//   Index in list of last reversion operation (undo or redo), when not yet complete (else, undefined)
function HistoryList (hnList = []) {
  this.hnList = hnList;
  // Recalculate activeIndex, and find lastMulti at same time, if any
  let activeIndex = hnList.length;
  let hn;
  let action;
  let lastMulti = undefined;
  let is_multiFound = false;
  let is_hnMultiRef = false;
  let multiIndex;
  let multiHN;
  while (--activeIndex >= 0) { // Find first bookmark action record
	action = (hn = hnList[activeIndex]).action;
	if (!is_multiFound && (hn.is_multi)) { // This is a multi node
	  is_multiFound = true;
	  if (!hn.is_complete) {
		lastMulti = activeIndex;
	  }
	}
	let delta;
	if ((delta = hn.multi_HNref) != undefined) { // This is a node refering to a multi parent
	  multiIndex = activeIndex + delta;
	  multiHN = hnList[multiIndex];
	  if (multiHN.is_complete) {
		is_hnMultiRef = true;
	  }
	  else {
		is_hnMultiRef = false;
		if (!is_multiFound) {
		  lastMulti = multiIndex;
		}
	  }
	  is_multiFound = true;
	}
	if ((action != HNACTION_BSP2START)
		&& (action != HNACTION_RELOADFFAPI)
		&& (action != HNACTION_AUTORELOADFFAPI)
		&& (action != HNACTION_CLEARHISTORY)
	   ) {
	  break;
	}
  }
  if (activeIndex < 0) {
	this.activeIndex = undefined;
  }
  else {
	let revOp;
	if (is_hnMultiRef) { // Point at the parent multi operation, if complete
	  activeIndex = multiIndex;
	}
	else if ((revOp = hn.revOp) == HNREVOP_ISUNDO) { // Last not undone record is the one before revOp_HNref
	  activeIndex += hn.revOp_HNref - 1;
	}
	else if (revOp == HNREVOP_ISREDO) { // Last not undone record is the one on revOp_HNref
	  activeIndex += hn.revOp_HNref;
	}
	this.activeIndex = (activeIndex >= 0 ? activeIndex : undefined);
	// We found activeIndex, but if no multi found yet, search deeper
	while (!is_multiFound && (--activeIndex >= 0)) {
	  hn = hnList[activeIndex];
	  if (hn.is_multi) {
		is_multiFound = true;
		if (!hn.is_complete) {
		  lastMulti = activeIndex;
		}
	  }
	}
  }
  // Store the lastMulti value
  this.lastMulti = lastMulti;
}


/*
 * Functions
 * ---------
 */

/*
 * Serialize (JSON like) the History list array of an HistoryList object
 * hl: HistoryList
 * 
 * Returns: a String
 */
function historyListSerialize (hl) {
  let json;
  try {
	json = JSON.stringify(hl.hnList);
  } catch (e) {
	throw e;
  }
  return(json);
}

/*
 * Deserialize (JSON like) the History list array from a String, and rebuild the HistoryList object
 * 
 * Returns: an HistoryList
 */
function historyListDeserialize (jsonstr) {
  let hnList;
  try {
	hnList = JSON.parse(jsonstr);
  } catch (e) {
	console.log("Error when parsing history JSON string: "+e);
  }
  let hl = new HistoryList (hnList);
  return(hl);
}

/*
 * Add an HistoryNode to the HistoryList
 */
function historyListAdd (hl, action,
						 is_multi = false, id_list = undefined, id = undefined, type = undefined, path = undefined, parentId = undefined, index = undefined,
						 title = undefined, faviconUri = undefined, url = undefined, inBSP2Trash = undefined, bnTreeJson = undefined,
						 toPath = undefined, toParentId = undefined, toIndex = undefined, toTitle = undefined, toUrl = undefined,
						 childIds = undefined, toChildIds = undefined,
  						 state = HNSTATE_ACTIVEBRANCH, revOp = undefined, revOp_HNref = undefined) {
  // Do not record actions on special folders
  if ((id != mostVisitedBNId) && (id != recentTagBNId) && (id != recentBkmkBNId)) {
	let hn = new HistoryNode (action,
							  is_multi, id_list, id, type, path, parentId, index, title, faviconUri, url, inBSP2Trash, bnTreeJson,
							  toPath, toParentId, toIndex, toTitle, toUrl,
							  childIds, toChildIds,
							  state, revOp, revOp_HNref
							 );
//HN_trace(hn);
	let hnList = hl.hnList;
	let len = hnList.push(hn); // Add at end of list / array
	// Update activeIndex, and any previous record impacted by the new record
	if ((state == HNSTATE_ACTIVEBRANCH)
		&& (action != HNACTION_BSP2START)
		&& (action != HNACTION_RELOADFFAPI)
		&& (action != HNACTION_AUTORELOADFFAPI)
		&& (action != HNACTION_CLEARHISTORY)
	   ) { // Set at end of list
	  // Any active record between current activeIndex and this new one becomes inactive
	  // since they are now in a branch which cannot be reached anymore
	  // (note: when referring to a multi, they take the state of their parent multi record)
	  let curIndex = hl.activeIndex;
	  if (curIndex == undefined) {
		curIndex = -1;
	  }
	  let newIndex = hl.activeIndex = len - 1;
	  let tmpHn;
	  let tmpState, tmpAction;
	  while (++curIndex < newIndex) {
		tmpState = (tmpHn = hnList[curIndex]).state;
		if (((tmpState == undefined) || (tmpState == HNSTATE_ACTIVEBRANCH))
			&& ((tmpAction = tmpHn.action) != HNACTION_BSP2START)
			&& (tmpAction != HNACTION_RELOADFFAPI)
			&& (tmpAction != HNACTION_AUTORELOADFFAPI)
			&& (tmpAction != HNACTION_CLEARHISTORY)
		   ) {
		  let delta = tmpHn.multi_HNref;
		  if (delta != undefined) {
			tmpHn.state = hnList[curIndex+delta].state;
		  }
		  else {
			tmpHn.state = HNSTATE_INACTIVEBRANCH;
		  }
		}
	  }

	  if (revOp == HNREVOP_ISUNDO) { // Coming back in past
		// If there was already a reversion on the undone record, inactivate the revOp record we are replacing
		let tmpIndex = len - 1 + revOp_HNref;
		let tmpHn = hnList[tmpIndex];
		let reversion = tmpHn.reversion;
		if (reversion != undefined) {
		  let oldDelta = tmpHn.revOp_HNref;
		  let revOpIndex = tmpIndex + oldDelta;
		  hnList[revOpIndex].state = HNSTATE_INACTIVEBRANCH;
		  // Store old revOp_HNref in revOp_HNref_list
		  let lst = tmpHn.revOp_HNref_list;
		  if (lst == undefined) {
			lst = tmpHn.revOp_HNref_list = [];
		  }
		  lst.push(oldDelta);
		}
		// Update undone record with proper information
		tmpHn.revOp_HNref = -revOp_HNref;
		tmpHn.reversion = HNREVERSION_UNDONE;
		// Find the last active record before the undone one, and set it in activeIndex
		let tmpState;
		let revOp;
		while (--tmpIndex >= 0) {
		  tmpState = (tmpHn = hnList[curIndex]).state;
		  revOp = tmpHn.revOp;
		  if (((tmpState == undefined) || (tmpState == HNSTATE_ACTIVEBRANCH))
			  && (revOp == undefined)
		 	 ) {
			break;
		  }
		}
		hl.activeIndex = (tmpIndex >= 0 ? tmpIndex : undefined);
	  }
	  else if (revOp == HNREVOP_ISREDO) { // Redoing an undo
		// If there was already a reversion on the redone record, inactivate the revOp record we are replacing
		// Also set activeIndex to the redone record itself
		let tmpIndex = hl.activeIndex = len - 1 + revOp_HNref;
		let tmpHn = hnList[tmpIndex];
		let reversion = tmpHn.reversion;
		if (reversion != undefined) {
		  let oldDelta = tmpHn.revOp_HNref;
		  let revOpIndex = tmpIndex + oldDelta;
		  hnList[revOpIndex].state = HNSTATE_INACTIVEBRANCH;
		  // Store old revOp_HNref in revOp_HNref_list
		  let lst = tmpHn.revOp_HNref_list;
		  if (lst == undefined) {
			lst = tmpHn.revOp_HNref_list = [];
		  }
		  lst.push(oldDelta);
		}
		// Update redone record with proper information
		tmpHn.revOp_HNref = -revOp_HNref;
		tmpHn.reversion = HNREVERSION_REDONE;
	  }
	  else if (is_multi) { // Multiple operation, remember its position (by construction it is not yet complete)
		hl.lastMulti = newIndex;
	  }
	  else if (id != undefined) { // Normal record, can be part of (match) a multiple operation
		// LIMITATION: we will only come back to the last incomplete recorded multiple operation
		//   under assumption that a new multiple operation only happens when previous one has ended
		let lastMulti = hl.lastMulti;
		if (lastMulti != undefined) {
		  // Check if the added record is part of it
		  let parentHn = hnList[lastMulti];
		  let i = parentHn.id_list.indexOf(id);
		  if (i >= 0) { // Yes, verify if not already found
			let j = parentHn.found_id_list.indexOf(id);
			if (j < 0) { // Not yet found, so add it, and mark it to refer back to the parent is_multi HN record
			  let foundLen = parentHn.found_id_list.push(id);
			  parentHn.hnref_list[i] = len - 1 - lastMulti;
			  if (foundLen == parentHn.id_list_len) { // We found the complete list
				parentHn.is_complete = true;
				hl.lastMulti = undefined; // No more lastMulti to remember for matching
			  }
			  hn.multi_HNref = lastMulti - newIndex;
			  // Update activeIndex to point at parent multi
			  hl.activeIndex = lastMulti;
			}
		  }
		}
	  }
	}

	// Notify the Bookmark history window that there is a change, if it is open
	sendAddonMessage("hnListAdd");
  }
}

/*
 * Trim an History array to remove nodes older than retention time
 * hl: HistoryList to trim
 * retention: duration in past to keep things, in milliseconds  
 */
function historyListTrim (hl, retention) {
  let count = 0;
  let hnList = hl.hnList;
  let len = hnList.length;
//console.log("History length: "+len);
  let trimTime = (new Date ()).getTime() - retention;
  for (let i=0 ; i<len ; i++, count++) {
	if (hnList[i].timestamp > trimTime)
	  break;
  }
//console.log("Records to trim: "+count);
  if (count > 0) { // Remove all outdated records at start, and update activeIndex and lastMulti
	hnList.splice(0, count);
	let activeIndex = hl.activeIndex - count;
	hl.activeIndex = (activeIndex >= 0 ? activeIndex : undefined);
	let lastMulti = hl.lastMulti;
	if (lastMulti != undefined) {
	  lastMulti -= count;
	  hl.lastMulti = (lastMulti >= 0 ? lastMulti : undefined);
	}
  }
}

/*
 * Clear the History array to remove all nodes
 * hl: HistoryList to trim
 */
function historyListClear (hl) {
  let hnList = hl.hnList;
  hnList.length = 0;
  let hn = new HistoryNode (HNACTION_CLEARHISTORY);
  hnList.push(hn);
  hl.activeIndex = hl.lastMulti = hl.lastRevOp = undefined;

  // Notify the Bookmark history window of the clear, if it is open
  sendAddonMessage("hnListClear");
}

/*
 * Try to find last title of a bookmark from history
 * hl: HistoryList
 * id: Bookmark id
 * 
 * Returns: last title String found, or undefined.
 */
function historyListSearchTitle (hl, id) {
  let record;
  let title = undefined;
  let hnList = hl.hnList;
  for (let i=hnList.length-1 ; i>= 0 ; i--) {
	record = hnList[i];
	if ((record.id == id)
		&& (((title = record.toTitle) != undefined) || ((title = record.title) != undefined))
	   ) {
	  break;
	}
  }
  return(title);
}

/*
 * Update favicon of a bookmark in history
 * hl: HistoryList
 * id: Bookmark id
 * faviconUri: String
 */
function historyListUpdateFaviconUri (hl, id, faviconUri) {
  let record;
  let hnList = hl.hnList;
  for (let i=hnList.length-1 ; i>= 0 ; i--) {
	record = hnList[i];
	if (record.id == id) {
	  record.faviconUri = faviconUri;
	}
  }
}

/*
 * Try to find last faviconUri of a bookmark from history
 * hl: HistoryList
 * id: Bookmark id
 * btn: BookmarkTreeNode
 * 
 * Returns: last faviconUri String found, or default Uri for the node type.
 */
function historyListSearchFaviconUri (hl, id, btn) {
  let record;
  let uri = undefined;
  let hnList = hl.hnList;
  for (let i=hnList.length-1 ; i>= 0 ; i--) {
	record = hnList[i];
	if ((record.id == id)
		&& ((uri = record.faviconUri) != undefined)
	   ) {
	  break;
	}
  }
  if (uri == undefined) { // Set a default value, except for separators and when nofavicon option is set
	let type = btn.type;
	if (type == "folder") {
	  if (id == PersonalToobar) {
		uri = "/icons/toolbarbkmk.png";
	  }
	  else if (id == BookmarksMenu) {
		uri = "/icons/menubkmk.png";
	  }
	  else if (id == OtherBookmarks) {
		uri = "/icons/otherbkmk.png";
	  }
	  else if (id == MobileBookmarks) {
		uri = "/icons/folder.png";
	  }
	  else {
		uri = "/icons/folder.png";
	  }
	}
	else if (type == "bookmark") {
	  if (btn.url.startsWith("about:")) { // about: is protected - security error ..
		uri = "/icons/nofavicon.png";
	  }
	  else if (!disableFavicons_option) {
		uri = "/icons/nofavicontmp.png";
	  }
	}
  }
  return(uri);
}

/*
 * Try to find last url of a bookmark from history
 * hl: HistoryList
 * id: Bookmark id
 * 
 * Returns: last url String found, or undefined.
 */
function historyListSearchUrl (hl, id) {
  let record;
  let url = undefined;
  let hnList = hl.hnList;
  for (let i=hnList.length-1 ; i>= 0 ; i--) {
	record = hnList[i];
	if ((record.id == id)
		&& (((url = record.toUrl) != undefined) || ((url = record.url) != undefined))
	   ) {
	  break;
	}
  }
  return(url);
}

/*
 * Try to find last childIds a folder bookmark from history
 * hl: HistoryList
 * id: Bookmark id
 * 
 * Returns: last array of String ids found, or undefined.
 */
function historyListSearchChildIds (hl, id) {
  let record;
  let childIds = undefined;
  let hnList = hl.hnList;
  for (let i=hnList.length-1 ; i>= 0 ; i--) {
	record = hnList[i];
	if ((record.id == id)
		&& (((childIds = record.toChildIds) != undefined) || ((childIds = record.childIds) != undefined))
	   ) {
	  break;
	}
  }
  return(childIds);
}