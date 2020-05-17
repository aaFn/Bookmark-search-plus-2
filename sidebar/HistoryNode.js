'use strict';


/*
 * Constants
 */
const HNACTION_BSP2START          = "bsp2start";
const HNACTION_RELOADFFAPI        = "reloadffapi";
const HNACTION_AUTORELOADFFAPI    = "autoreloadffapi";
const HNACTION_BKMKCREATE         = "create";
const HNACTION_BKMKCHANGE         = "change";
const HNACTION_BKMKCHANGE_DESYNC  = "change_desync"; // De-sync problem detected when doing a Change on bookmark
const HNACTION_BKMKMOVE           = "move";
const HNACTION_BKMKMOVE_DESYNC    = "move_desync"; // De-sync problem detected when doing a bookmark move
const HNACTION_BKMKREORDER        = "reorder";
const HNACTION_BKMKREORDER_DESYNC = "reorder_desync"; // De-sync problem detected when reordering bookmarks
const HNACTION_BKMKREMOVE         = "remove";
const HNACTION_BKMKREMOVE_DESYNC  = "remove_desync"; // De-sync problem detected when removing a bookmark
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
// action
//    A String indicating the recorded action: "bsp2start", "reloadffapi", "create", "change", "move", "reorder", "remove".
//    Note: nothing is recorded for favicon load / changes.
// id
//    String identifying the bookmark subject to the action (undefined if "bsp2start" or "reloadffapi").
// type
//    Bookmark type.
// path
//    Path = Array of parent title String, from top to deepest (last one = parent of bookmark item)
// parentId
//    Bookmark parentID.
// index
//    Bookmark index.
// title
//    Bookmark title.
// faviconUri
//    Favicon.
// url
//    Bookmark URL.
// bnTreeJson
//    Recursive representation of node and its children if any, when "remove" (to be able to undo the remove).
// toPath
//    Target path of move = Array of parent title String, from top to deepest (last one = parent of bookmark item)
// toParentId
//    Target parentId when "move", else undefined.
// toIndex
//    Target index when "move", else undefined.
// toTitle
//    Changed to title when "change" (undefined if no change), else undefined.
// toUrl
//    Changed to URL when "change" (undefined if no change), else undefined.
// childIds
//    Array, initial order when "reorder", else undefined.
// toChildIds
//    Array, target order when "reorder", else undefined.
// state
//    Integer. 0 (or undefined) means "active branch", 1 means "inactive branch"
// revOp
//    If undefined, this is a normal operation. Else, 1 is for an "undo" record, and 2 is for a "redo" record
// relHNref
//    Integer, if revOp is defined and > 0, this is a relative (negative) integer to get to undone / redone HN from this node
//    Else, if reversion (below) is defined and > 0, this is a relative (positive) integer to get to undoer / redoer HN
//
// Additional fields, added later on non is_undoredo records:
//-----------------------------------------------------------
// reversion - Added or modififed when a reversion operation (undo / redo) is made by BSP2 to a bookmark item  
//    Integer, if defined and different from 0, tells if the record was undone (= 1) or redone (= 2) by a further record
//    Note that state can be "inactive branch" only when reversion is "undone". If reversion is "redone", state can only be "active branch". 
function HistoryNode (action,
					  id = undefined, type = undefined, path = undefined, parentId = undefined, index = undefined,
					  title = undefined, faviconUri = undefined, url = undefined, bnTreeJson = undefined,
					  toPath = undefined, toParentId = undefined, toIndex = undefined, toTitle = undefined, toUrl = undefined,
					  childIds = undefined, toChildIds = undefined,
					  state = HNSTATE_ACTIVEBRANCH, revOp = undefined, relHNref = undefined) {
  this.timestamp  = (new Date()).getTime();
  this.action     = action;
  if (id != undefined) {
	this.id         = id;
	this.type       = type;
	this.path       = path;
	this.parentId   = parentId;
	this.index      = index;
	if (title != undefined) {
	  this.title      = title;
	}
	if (faviconUri != undefined) {
	  this.faviconUri = faviconUri;
	}
	if (url != undefined) {
	  this.url        = url;
	}
	if (bnTreeJson != undefined) {
	  this.bnTreeJson = bnTreeJson;
	}
	if (toParentId != undefined) {
	  this.toPath     = toPath;
	  this.toParentId = toParentId;
	  this.toIndex    = toIndex;
	}
	if (toTitle != undefined) {
	  this.toTitle    = toTitle;
	}
	if (toUrl != undefined) {
	  this.toUrl      = toUrl;
	}
	if (childIds != undefined) {
	  this.childIds   = childIds;
	  this.toChildIds = toChildIds;
	}
	this.state = state;
	if (revOp != undefined) {
	  this.revOp = revOp; 
	}
	if (relHNref != undefined) {
	  this.relHNref   = relHNref;
	}
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
  console.log("  timestamp:  "+ts+" ("+tsDate.toISOString()+" / "+tsDate.toLocaleString()+")");
  console.log("  action:     "+HN.action);
  let id = HN.id;
  if (id != undefined) {
	console.log("  id:         "+id);
	console.log("  type:       "+HN.type);
	console.log("  parentId:   "+HN.parentId);
	console.log("  index:      "+HN.index);
	let title = HN.title;
	if (title != undefined) {
	  console.log("  title:      "+title);
	}
	let faviconUri = HN.faviconUri;
	if (faviconUri != undefined) {
	  console.log("  faviconUri: "+faviconUri);
	}
	let url = HN.url;
	if (title != undefined) {
	  console.log("  url:        "+url);
	}
	let bnTreeJson = HN.bnTreeJson;
	if (bnTreeJson != undefined) {
	  console.log("  bnTreeJson: "+bnTreeJson);
	}
	let toParentId = HN.toParentId;
	if (toParentId != undefined) {
	  console.log("  toParentId: "+toParentId);
	  console.log("  toIndex:    "+HN.toIndex);
	}
	let toTitle = HN.toTitle;
	if (toTitle != undefined) {
	  console.log("  toTitle:    "+toTitle);
	}
	let toUrl = HN.toUrl;
	if (toUrl != undefined) {
	  console.log("  toUrl:      "+HN.toUrl);
	}
	let childIds = HN.childIds;
	if (childIds != undefined) {
	  console.log("  childIds:   "+childIds);
	  console.log("  toChildIds: "+HN.toChildIds);
	}
	console.log("  state:      "+HN.state);
	let revOp = HN.revOp;
	if (revOp != undefined) {
	  console.log("  revOp:      "+revOp);
	}
	let relHNref = HN.relHNref;
	if (relHNref != undefined) {
	  console.log("  relHNref:   "+relHNref);
	}
	let reversion = HN.reversion;
	if (reversion != undefined) {
	  console.log("  reversion:  "+reversion);
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
function HistoryList (hnList = []) {
  this.hnList = hnList;
  // Recalculate activeIndex
  let activeIndex = hnList.length;
  let hn;
  let action;
  while (--activeIndex >= 0) { // Find first bookmark action record
	action = (hn = hnList[activeIndex]).action;
	if ((action != HNACTION_BSP2START)
		&& (action != HNACTION_RELOADFFAPI)
		&& (action != HNACTION_AUTORELOADFFAPI)
	   ) {
	  break;
	}
  }
  if (activeIndex < 0) {
	this.activeIndex = undefined;
  }
  else {
	let revOp = hn.revOp;
	if (revOp == HNREVOP_ISUNDO) { // Last not undone record is the one before relHNref
	  activeIndex += hn.relHNref - 1;
	}
	else if (revOp == HNREVOP_ISREDO) { // Last not undone record is the one on relHNref
	  activeIndex += hn.relHNref;
	}
	this.activeIndex = (activeIndex >= 0 ? activeIndex : undefined);
  }
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
						 id = undefined, type = undefined, path = undefined, parentId = undefined, index = undefined,
						 title = undefined, faviconUri = undefined, url = undefined, bnTreeJson = undefined,
						 toPath = undefined, toParentId = undefined, toIndex = undefined, toTitle = undefined, toUrl = undefined,
						 childIds = undefined, toChildIds = undefined,
  						 state = HNSTATE_ACTIVEBRANCH, revOp = undefined, relHNref = undefined) {
  // Do not record actions on special folders
  if ((id != mostVisitedBNId) && (id != recentTagBNId) && (id != recentBkmkBNId)) {
	let hn = new HistoryNode (action,
							  id, type, path, parentId, index, title, faviconUri, url, bnTreeJson,
							  toPath, toParentId, toIndex, toTitle, toUrl,
							  childIds, toChildIds,
							  state, revOp, relHNref
							 );
//HN_trace(hn);
	let hnList = hl.hnList;
	let len = hnList.push(hn); // Add at end of list / array
	// Update activeIndex, and any previous record impacted by the new record
	if ((state == HNSTATE_ACTIVEBRANCH)
		&& (action != HNACTION_BSP2START)
		&& (action != HNACTION_RELOADFFAPI)
		&& (action != HNACTION_AUTORELOADFFAPI)
	   ) { // Set at end of list
	  // Any active record between current activeIndex and this new one becomes inactive
	  let curIndex = hl.activeIndex;
	  if (curIndex == undefined) {
		curIndex = -1;
	  }
	  let newIndex = hl.activeIndex = len - 1;
	  let tmpHn;
	  let tmpState, tmpAction;
	  while (++curIndex < newIndex) {
		tmpState = (tmpHn = hnList[curIndex]).state;
		tmpAction = tmpHn.action;
		if (((tmpState == undefined) || (tmpState == HNSTATE_ACTIVEBRANCH))
			&& (tmpAction != HNACTION_BSP2START)
			&& (tmpAction != HNACTION_RELOADFFAPI)
			&& (tmpAction != HNACTION_AUTORELOADFFAPI)
		   ) {
		  tmpHn.state = HNSTATE_INACTIVEBRANCH;
		}
	  }
	}
	if (revOp == HNREVOP_ISUNDO) { // Coming back in past
	  // If there was already a reversion on the undone record, inactivate the corresponding revOp record
	  let tmpIndex = len - 1 + relHNref;
	  let tmpHn = hnList[tmpIndex];
	  let reversion = tmpHn.reversion;
	  if (reversion != undefined) {
		let revOpIndex = tmpIndex + tmpHn.relHNref;
		hnList[revOpIndex].state = HNSTATE_INACTIVEBRANCH;
	  }
	  // Update undone record with proper information
	  tmpHn.relHNref = -relHNref;
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
	  // If there was already a reversion on the redone record, inactivate the corresponding revOp record
	  // Also set activeIndex to the redone record
	  let tmpIndex = hl.activeIndex = len - 1 + relHNref;
	  let tmpHn = hnList[tmpIndex];
	  let reversion = tmpHn.reversion;
	  if (reversion != undefined) {
		let revOpIndex = tmpIndex + tmpHn.relHNref;
		hnList[revOpIndex].state = HNSTATE_INACTIVEBRANCH;
	  }
	  // Update redone record with proper information
	  tmpHn.relHNref = -relHNref;
	  tmpHn.reversion = HNREVERSION_REDONE;
	}

	// Notfy the Bookmark history window that there is a change, it it is open
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
  let trimTime = (new Date()).getTime() - retention;
  for (let i=0 ; i<len ; i++, count++) {
	if (hnList[i].timestamp > trimTime)
	  break;
  }
//console.log("Records to trim: "+count);
  if (count > 0) { // Remove all outdated records at start, and update activeIndex
	hnList.splice(0, count);
	let activeIndex = hnList.activeIndex - count;
	hl.activeIndex = (activeIndex >= 0 ? activeIndex : undefined);
  }
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