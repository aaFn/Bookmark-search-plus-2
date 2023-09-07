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
// hn_list
//    Array of HistoryNode in the multiple action, or in an undo/redo record, in received order.
//    (undefined if is_multi is false, or if revOp is undefined, else initialized to [] (later when this is a
//    non-multi revOp))
//    Note that in the case of a "create" action, these history nodes can have in their turn hn_list of HistoryNode,
//    acting as the children attribute in BookmarkNode, in a tree of HistoryNode - since we cannot create a folder
//    with its children in one go.
// found_id_list
//    Array of String to collect bookmark ids collected in hn_list, in the multiple action or undo/redo record,
//    in same order as hn_list.
//    (undefined if is_multi is false, or if revOp is undefined, else initialized to [] (later when this is a
//    non-multi revOp))
// is_open
//    Boolean, undefined if is_multi is false, else intialized to false. Indicate if the multi list is open
//    (twistie open), and so there if the hn_list nodes are visible or not.
// is_urlistOpen
//    Boolean, undefined if reversion is undefined or HNREVERSION_NONE, else intialized to false. Indicate if
//    the URList is open (twistie open), and so if the revOp nodes displayed below in URList mode are visible or not.
// is_complete
//    Boolean, undefined if is_multi is false and revOp is undefined,
//    else initialized to false, and set to true when all ids in list are received, or when reversion operation
//    is received. 
// *id
//    String identifying the bookmark Id subject to the action (undefined if "bsp2start" or "reloadffapi"
//     or "bsp2clearhist", or if is_multi is true).
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
//    Record if in trash or not at the end of the operation (except for "remove", where it is at beginning).
//    Note: no need for storing both the start and end state .. indeed:
//      "create", "change", "reorder", "remove" ony have one state
//      "create_ft" imposes the source to be in trash - and the target to be outside of trash 		
//      "remove_tt" imposes the source to out of trash - and the target to be in trash 		
//      "move" imposes to have source = target, else it is a "create_ft" or a "remove_tt" 		
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
//    Note that state can be "inactive branch" only when reversion is "undone". If reversion is "redone", state can only
//         be "active branch".
// revOp_HNref_list
//    Array of offset integer to collect relative position of revOp operations later in list corresponding to that bookmark action
//    (filled with successive revOp_HNref as they get replaced, in chronological order. Does not contain last one, which is the active one)
// is_insideMulti - Added when the record is recognized to be part of a multi bookmarks action
//    Boolean, undefined if not part of any multi bookmarks action, else true
// (OLD, not used anymore) multi_HNref - Added when the record is recognized to be part of a multi bookmarks action  
//    Integer, undefined if not part of any multi bookmarks action, else relative (negative) integer to get to multi bookmarks node
//    Note: can have a value only when is_multi is false, which means when id is defined.
// orig_id_list
//    Array of String to collect the original bookmark ids in the same order as the initial id_list, propagated when
//    bookmarks are recreated after an undo of a remove, or after a redo of a create with no trash available.
//    (undefined if revOp is undefined)
function HistoryNode (action,
					  is_multi = undefined, id_list = undefined, id = undefined, type = undefined, path = undefined, parentId = undefined, index = undefined,
					  title = undefined, faviconUri = undefined, url = undefined, inBSP2Trash = undefined, bnTreeJson = undefined,
					  toPath = undefined, toParentId = undefined, toIndex = undefined, toTitle = undefined, toUrl = undefined,
					  childIds = undefined, toChildIds = undefined,
					  state = HNSTATE_ACTIVEBRANCH, revOp = undefined, revOp_HNref = undefined, orig_id_list = undefined) {
  this.timestamp   = (new Date ()).getTime();
  this.action      = action;
  this.is_multi    = is_multi;
  if (is_multi == true) {
	this.id_list       = id_list;
	this.id_list_len   = id_list.length;
	this.hn_list       = [];
	this.found_id_list = [];
	this.is_open       = false;
	this.is_complete   = false;
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
	if (toParentId != undefined) {
	  this.toPath      = toPath;
	  this.toParentId  = toParentId;
	  this.toIndex     = toIndex;
	}
	if (revOp != undefined) {
	  this.revOp       = revOp; 
	  this.is_complete = false;
	}
	if (revOp_HNref != undefined) {
	  this.revOp_HNref = revOp_HNref
	}
	if (orig_id_list != undefined) {
	  this.orig_id_list = orig_id_list
	}
  }
}

/*
 * Verify if the bookmarks describe by 2 HN are identical in content (used for matching recreatss when no trash)
 * 
 * hn1: first HistortyNode
 * hn2: second HistortyNode
 * 
 * Returns: Boolean, true is match, eles false.
 */
function HN_match (hn1, hn2) {
  let type1 = hn1.type;
  let type2 = hn2.type;
  if ((type1 != type2)
	  || (hn2.parentId != hn2.parentId)
	  || (hn2.index != hn2.index)
	 ) {
	return(false);
  }
  if (type1 == "separator")   return(true); // Nothing else to compare for a separator
  if (hn1.title != hn2.title)   return(false);
  if (type1 == 'folder')   return(true); // Nothing else to compare for a folder
  // This must be a "bookmark"
  if (hn1.url != hn2.url)   return(false);
  return(true); // Nothing else to compare for a bookmark
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
	console.log("  hn_list       "+HN.hn_list);
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
	let is_insideMulti = HN.is_insideMulti;
	if (is_insideMulti != undefined) {
	  console.log("  is_insideMulti: "+is_insideMulti);
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
  // Also, convert the old format with multi_HNref into the new one of multi records containing involved nodes.
  let hn;
  let action, state;
  let activeIndex = undefined;
  let lastMulti = undefined;
  let is_multiFound = false;
  let multiIndex, multiHN, hn_list;
  let toIndex;
  for (let i=hnList.length-1 ; i>=0 ; i--) {
	hn = hnList[i];
	let delta = undefined;
	if (hn.is_multi) { // This is a multi node
	   // For the old multi format, make sure there is a childs list, even if no "inside multi" node
	   // is encountered later
	  if (hn.hn_list == undefined) {
		hn.hn_list = new Array (hn.id_list_len);
	  }
	  // Remember the most recent incomplete one
	  if (!is_multiFound) {
		is_multiFound = true;
		if (!hn.is_complete) {
		  lastMulti = i;
		}
	  }
	}
	else {
	  // Convert old "inside multi" nodes to the new format
	  if ((delta = hn.multi_HNref) != undefined) { // Old format = this is a node refering to a multi parent
		multiIndex = i + delta;
		multiHN = hnList[multiIndex];
		hn_list = multiHN.hn_list;
		if (hn_list == undefined) { // Create the list if missing
		  hn_list = multiHN.hn_list = new Array (multiHN.id_list_len);
		}
		// Insert at right place in the mluti record
		let pos = multiHN.found_id_list.indexOf(hn.id);
		hn_list[pos] = hn;
		hn.is_insideMult = true;
		delete hn.multi_HNref; // Remove the attribute
		// Also, rebuild the multi record toParentId and toIndex which were not filled in the old format
		if (multiHN.toParentId == undefined) {
		  multiHN.toParentId = hn.toParentId;
		}
		toIndex = hn.toIndex;
		if ((multiHN.toIndex == undefined) || (multiHN.toIndex > toIndex)) {
		  multiHN.toIndex = toIndex;
		}
	  }
	}
	  
	if ((activeIndex == undefined) && (delta == undefined)) { // Remember node as activeIndex if appropriate
	  state = hn.state;
	  if (((state == undefined) || (state == HNSTATE_ACTIVEBRANCH))
		  && ((action = hn.action) != HNACTION_BSP2START)
		  && (action != HNACTION_RELOADFFAPI)
		  && (action != HNACTION_AUTORELOADFFAPI)
		  && (action != HNACTION_CLEARHISTORY)
		  && (hn.revOp == undefined)
		  && (hn.reversion != HNREVERSION_UNDONE)
		 ) {
		activeIndex = i;
	  }
	}
	
  }

  // Store the activeIndex value
  if ((activeIndex == undefined) || (activeIndex < 0)) {
	this.activeIndex = undefined;
  }
  else { // Adjust activeIndex in case the found record is a reversion operation
	let revOp;
	if ((revOp = hn.revOp) == HNREVOP_ISUNDO) { // Last not undone record is the one before revOp_HNref
	  activeIndex += hn.revOp_HNref - 1;
	}
	else if (revOp == HNREVOP_ISREDO) { // Last not undone record is the one on revOp_HNref
	  activeIndex += hn.revOp_HNref;
	}
	this.activeIndex = (activeIndex >= 0 ? activeIndex : undefined);
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
 * Get an HistoryNode given its ide
 * hl: HistoryList
 * hnId: id of HistoryNode
 * 
 * Returns: an HistoryNode
 */
function historyListGetHN (hl, hnId) {
  let hn = hl.hnList[hnId];
  return(hn);
}

/*
 * Verify that an action is compatible with a parentAction for a mlutiple history node
 * action: String, action to check
 * parentAction: String, parent action to check with
 * parentRevOp: integer, undefined if no reversion in parent, else contains the parent reversion opertaion
 * 
 * Returns: Boolean, true is match, eles false.
 */
function matchActions (action, parentAction, parentRevOp = undefined) {
  let is_match;
  switch (action) {
	case HNACTION_BKMKCREATE:
	case HNACTION_BKMKCREATEFROMTRASH:
	case HNACTION_BKMKCREATEFROMTRASH_DESYNC:
	  is_match =
		((parentRevOp != HNREVOP_ISUNDO) && ((parentAction == HNACTION_BKMKCREATE)
											 || (parentAction == HNACTION_BKMKCREATEFROMTRASH)
											 || (parentAction == HNACTION_BKMKCREATEFROMTRASH_DESYNC)
											)
		)
		|| ((parentRevOp == HNREVOP_ISUNDO) && ((parentAction == HNACTION_BKMKREMOVE)
												|| (parentAction == HNACTION_BKMKREMOVE_DESYNC)
												|| (parentAction == HNACTION_BKMKREMOVETOTRASH)
												|| (parentAction == HNACTION_BKMKREMOVETOTRASH_DESYNC)
											   )
		   )
		;
	  break;

	case HNACTION_BKMKCHANGE:
	case HNACTION_BKMKCHANGE_DESYNC:
	  is_match =
		(parentAction == HNACTION_BKMKCHANGE)
		|| (parentAction == HNACTION_BKMKCHANGE_DESYNC)
		;
	  break;

	case HNACTION_BKMKMOVE:
	case HNACTION_BKMKMOVE_DESYNC:
	  is_match =
		(parentAction == HNACTION_BKMKMOVE)
		|| (parentAction == HNACTION_BKMKMOVE_DESYNC)
		;
	  break;

	case HNACTION_BKMKREMOVE:
	case HNACTION_BKMKREMOVE_DESYNC:
	case HNACTION_BKMKREMOVETOTRASH:
	case HNACTION_BKMKREMOVETOTRASH_DESYNC:
	  is_match =
		((parentRevOp != HNREVOP_ISUNDO) && ((parentAction == HNACTION_BKMKREMOVE)
											 || (parentAction == HNACTION_BKMKREMOVE_DESYNC)
											 || (parentAction == HNACTION_BKMKREMOVETOTRASH)
											 || (parentAction == HNACTION_BKMKREMOVETOTRASH_DESYNC)
											)
		)
		|| ((parentRevOp == HNREVOP_ISUNDO) && ((parentAction == HNACTION_BKMKCREATE)
												|| (parentAction == HNACTION_BKMKCREATEFROMTRASH)
												|| (parentAction == HNACTION_BKMKCREATEFROMTRASH_DESYNC)
											   )
		   )
		;
	  break;
  }
  return(is_match);
}

/*
 * Add an HistoryNode to the HistoryList (note: non-multi create is using historyListAddCreate(), not this one))
 * 
 * revOp_HNref contains the index to the reversed HN
 * Returns the newly created HistoryNode
 */
function historyListAdd (hl, action,
						 is_multi = false, id_list = undefined, id = undefined, type = undefined, path = undefined, parentId = undefined, index = undefined,
						 title = undefined, faviconUri = undefined, url = undefined, inBSP2Trash = undefined, bnTreeJson = undefined,
						 toPath = undefined, toParentId = undefined, toIndex = undefined, toTitle = undefined, toUrl = undefined,
						 childIds = undefined, toChildIds = undefined,
  						 revOp = undefined, revOp_HNref = undefined, orig_id_list = undefined,
  						 state = HNSTATE_ACTIVEBRANCH,
  						) {
  // Record actions on special folders, but force them inactive = they are traced, but cannot be undone / redone 
  if ((id != undefined)
	  && ((id == mostVisitedBNId) || (id == recentTagBNId) || (id == recentBkmkBNId) || (id == bsp2TrashFldrBNId))
	 ) {
	state = HNSTATE_INACTIVEBRANCH;
  }

  // Create a new record
  let hn = new HistoryNode (action,
						  is_multi, id_list, id, type, path, parentId, index, title, faviconUri, url, inBSP2Trash, bnTreeJson,
						  toPath, toParentId, toIndex, toTitle, toUrl,
						  childIds, toChildIds,
						  state, revOp, revOp_HNref, orig_id_list
						 );
  // Look at where to place it
  let pos, pos_insideMulti;
  let hnList = hl.hnList;
  let curIndex = hl.activeIndex;
  // If non multi and non revop, check if the operation exactly matches the last undo/redo operation ..
  // and if so, if that operation was not already matched.
  // If yes, place it in that record, as the record already exists
  // = we will use the corresponding undo/refo record and mark it complete.
  let is_matchRevop = false;
  let lastRevOp = hl.lastRevOp;
  if (!is_multi && (revOp === undefined) && (lastRevOp != undefined)) {
	// Look at the last revop, and if not multi, not complete, verify if it matches
	let hnRev = hnList[lastRevOp];
	let hnRevOp = hnRev.revOp;
	is_matchRevop = ((hnRevOp != undefined) // For robustness
	  				 && !hnRev.is_multi
					 && !hnRev.is_complete // For robustness
					 && (hnRev.id == hn.id) // There is always an id, because we do not handle non-multi create here
					 && matchActions(action, hnRev.action, hnRevOp)
					);
	if (is_matchRevop) { // If matched, mark it complete and pass its position for display refresh
	  // Keep the hn the matched record, it will serve for a later potential undo/redo
	  hnRev.hn_list = [hn];
	  hnRev.found_id_list = [id];
	  hnRev.is_complete = true;
	  pos = lastRevOp;
	  hl.lastRevOp = undefined;
	}
  }
  if (!is_matchRevop) { // Can be in a multi, or a revop, or a normal action
//HN_trace(hn);
	if ((state == HNSTATE_ACTIVEBRANCH)
		&& (action != HNACTION_BSP2START)
		&& (action != HNACTION_RELOADFFAPI)
		&& (action != HNACTION_AUTORELOADFFAPI)
		&& (action != HNACTION_CLEARHISTORY)
	   ) { // Add record, and update activeIndex as needed, and any previous record impacted by the new record
	  if (is_multi) { // If multiple operation, add at end and remember its position (by construction it is not yet complete)
		// Note that this can also be a reversion operation at same time, but this will be handled below
		pos = hl.lastMulti = hnList.push(hn) - 1;
	  } else { // Normal record (non multi), with id != undefined
		// Can be part of (match) a multiple operation, in which case it is added inside it and not at end of list
		// LIMITATION: we will only come back to the last incomplete recorded multiple operation
		//   under assumption that a new multiple operation only happens when previous one has ended
		let is_added = false;
		let lastMulti = hl.lastMulti;
		if ((lastMulti != undefined) && (revOp == undefined)) { // Non revOp record => check if it is in lastMulti
		  let parentHn = hnList[lastMulti];
		  // Only match if actions correspond
		  let parentRevOp = parentHn.revOp;
		  if (matchActions(action, parentHn.action, parentRevOp)) {
			// Check if listed in there
			let i = parentHn.id_list.indexOf(id);
			if (i >= 0) { // Yes, verify if not already found
			  let j = parentHn.found_id_list.indexOf(id);
			  if (j < 0) { // Not yet found, so add it inside the parent multi
				let foundLen = parentHn.found_id_list.push(id);
				pos_insideMulti = parentHn.hn_list.push(hn) - 1;
				hn.is_insideMulti = true; // Mark it as inside a Multi action record
				pos = lastMulti;
				is_added = true;
				if (foundLen == parentHn.id_list_len) { // We found the complete list
				  parentHn.is_complete = true;
				  hl.lastMulti = undefined; // No more lastMulti to remember for matching
				  if (parentRevOp != undefined) { // No more lastRevOp as well
					hl.lastRevOp = undefined;
				  }
				}
				// Do not update activeIndex in a multi case, it does not change
			  }
			}
		  }
		}
		if (!is_added) { // Add at end of list / array
		  pos = hnList.push(hn) - 1;
		}
	  }

	  if (pos_insideMulti == undefined) { // We appended at end, and not inside a multi record
		if (revOp == HNREVOP_ISUNDO) { // Coming back in past
		  // Remember the operation
		  hl.lastRevOp = pos;

		  // If there was already a reversion on the undone record, inactivate the revOp redo record we are replacing
		  let tmpIndex = revOp_HNref;
		  hn.revOp_HNref = revOp_HNref = tmpIndex - pos;
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
		  let tmpState, tmpAction;
		  while (--tmpIndex >= 0) {
			tmpState = (tmpHn = hnList[tmpIndex]).state;
			if (((tmpState == undefined) || (tmpState == HNSTATE_ACTIVEBRANCH))
				&& ((tmpAction = tmpHn.action) != HNACTION_BSP2START)
				&& (tmpAction != HNACTION_RELOADFFAPI)
				&& (tmpAction != HNACTION_AUTORELOADFFAPI)
				&& (tmpAction != HNACTION_CLEARHISTORY)
				&& (tmpHn.revOp == undefined)
				&& (tmpHn.reversion != HNREVERSION_UNDONE)
		 	   ) {
			  break;
			}
		  }
		  hl.activeIndex = (tmpIndex >= 0 ? tmpIndex : undefined);
		}
		else if (revOp == HNREVOP_ISREDO) { // Redoing an undo
		  // Remember the operation
		  hl.lastRevOp = pos;

		  // There must be already a reversion on the redone record, inactivate the revOp record we are replacing
		  // Also set activeIndex to the redone record itself
		  let tmpIndex = hl.activeIndex = revOp_HNref;
		  hn.revOp_HNref = revOp_HNref = tmpIndex - pos;
		  let tmpHn = hnList[tmpIndex];
		  let reversion = tmpHn.reversion;
		  if (reversion != undefined) { // Must be ...!!
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
		else {
		  // Any active record between current activeIndex and this new one becomes inactive
		  // since they are now in a branch which cannot be reached anymore
		  if (curIndex == undefined) {
			curIndex = -1;
		  }
		  hl.activeIndex = pos;
		  let tmpHn;
		  let tmpState, tmpAction;
		  while (++curIndex < pos) {
			tmpState = (tmpHn = hnList[curIndex]).state;
			if (((tmpState == undefined) || (tmpState == HNSTATE_ACTIVEBRANCH))
				&& ((tmpAction = tmpHn.action) != HNACTION_BSP2START)
				&& (tmpAction != HNACTION_RELOADFFAPI)
				&& (tmpAction != HNACTION_AUTORELOADFFAPI)
				&& (tmpAction != HNACTION_CLEARHISTORY)
			   ) {
			  tmpHn.state = HNSTATE_INACTIVEBRANCH;
			}
		  }
		}
	  }
	}
	else { // Add at end of list / array
	  pos = hnList.push(hn) - 1;
	}
  }
  // Notify the Bookmark history window that there is a change, if it is open
  sendAddonMsgComplex(
	{source: "background",
	 content: "hnListAdd",
	 pos: pos,
	 pos_insideMulti: pos_insideMulti
	});

  return(hn);
}

/*
 * Append a "create" action HistoryNode to the HistoryList
 * 
 * hn: HistoryNode to append
 */
function historyListAddCreate (hl, hn) {
  // Record actions on special folders, but force them inactive = they are traced, but cannot be undone / redone 
  let id = hn.id;
  let state;
  if ((id != undefined)
	  && ((id == mostVisitedBNId) || (id == recentTagBNId) || (id == recentBkmkBNId) || (id == bsp2TrashFldrBNId))
	 ) {
	state = hn.state = HNSTATE_INACTIVEBRANCH;
  }
  else {
	state = hn.state;
  }

  // Look at where to place it
  let hnList = hl.hnList;
  let curIndex = hl.activeIndex;

  // Add record at end, and update activeIndex as needed, and any previous record impacted by the new record
  // Remember its position
  let pos = hnList.push(hn) - 1;
  if (state == HNSTATE_ACTIVEBRANCH) {
	hl.activeIndex = pos;

	// Any active record between current activeIndex and this new one becomes inactive
	// since they are now in a branch which cannot be reached anymore
	if (curIndex == undefined) {
	  curIndex = -1;
	}
	let tmpHn;
	let tmpState, tmpAction;
	while (++curIndex < pos) {
	  tmpState = (tmpHn = hnList[curIndex]).state;
	  if (((tmpState == undefined) || (tmpState == HNSTATE_ACTIVEBRANCH))
		  && ((tmpAction = tmpHn.action) != HNACTION_BSP2START)
		  && (tmpAction != HNACTION_RELOADFFAPI)
		  && (tmpAction != HNACTION_AUTORELOADFFAPI)
		  && (tmpAction != HNACTION_CLEARHISTORY)
		 ) {
		tmpHn.state = HNSTATE_INACTIVEBRANCH;
	  }
	}
  }

  // Notify the Bookmark history window that there is a change, if it is open
  sendAddonMsgComplex(
	{source: "background",
	 content: "hnListAdd",
	 pos: pos,
	 pos_insideMulti: undefined
	});
}

/*
 * Attach a "create" action HistoryNode to an existing multi or reversion HistoryNode, already in HistoryList
 * 
 * hn: HistoryNode to append
 * toHN: parent HistoryNode to append to
* is_updateId: Boolean, if true, then update toHN id or id_list
 */
//function historyListAttachCreate (hl, hn, toHN, is_updateId = false) {
function historyListAttachCreate (hl, hn, toHN) {
  // Attach hn to the hn_list of toHN, and update also its found_id_list, and id, or id_list if toHN is a multi record
  let hn_list = toHN.hn_list;
  let found_id_list = toHN.found_id_list;
  if (hn_list == undefined) { // Can happen for non-multi reversion nodes
	hn_list = toHN.hn_list = [];
	found_id_list = toHN.found_id_list = [];
  }
  let pos_insideMulti = hn_list.push(hn) - 1;
  let bnId = hn.id;
  let foundLen = found_id_list.push(bnId);
  let is_multi = hn.is_insideMulti = toHN.is_multi; // Mark it as inside a Multi action record

  let pos;
  if (is_multi) {
	pos = hl.lastMulti;
	if (foundLen == toHN.id_list_len) { // We found the complete list
		toHN.is_complete = true;
		hl.lastMulti = undefined; // No more lastMulti to remember for matching
		if (toHN.revOp != undefined) { // No more lastRevOp as well
		  hl.lastRevOp = undefined;
		}
	  }
  }
  else {
	pos = hl.lastRevOp;
	pos_insideMulti = undefined;
	toHN.is_complete = true;
	if (toHN.revOp != undefined) { // No more lastRevOp
	  hl.lastRevOp = undefined;
	}
  }

/*
  // Update toHN id or id_list (and id_list_len) if required
  if (is_updateId) {
	if (hn.is_multi) {
	  toHN.id_list_len = toHN.id_list.push(bnId);
	}
	else {
	  toHN.id = bnId;
	}
  }
*/

  // Notify the Bookmark history window that there is a change, if it is open
  sendAddonMsgComplex(
	{source: "background",
	 content: "hnListAdd",
	 pos: pos,
	 pos_insideMulti: pos_insideMulti
	});
}

/*
 * Execute an Undo action, obtained from history (if there is an action to undo)
 */
async function executeUndo (hl) {
  let activeIndex = hl.activeIndex;
  if (activeIndex != undefined) { // Undo the record which is on activeIndex
	let hnList = hl.hnList;
	let HN = hnList[activeIndex];
	let action = HN.action;
	let orig_id_list = HN.orig_id_list;

	// Check if there is a reversion which happened later (must then be a redo .)
	let hnRev;
	if (HN.reversion == HNREVERSION_REDONE) {
	  // Remember the redo record which we are going to revert before it gets overwritten by historyListAdd()
	  hnRev = hnList[activeIndex + HN.revOp_HNref];
	}

	// Normalize in an array whether multi or not to simplify coding
	// And record a multiple undo operation if more than one item is in the array
	let a_HN, bnId;
	let len;
	let undoHN;
	let is_multi = HN.is_multi;
	if (is_multi) {
	  // Note: use the latest list of ids in hnRev.id_list if it exists
	  // Also, take the received list of HNs in the multi or redo to revert if thre is one
	  // If it is not complete, then we will not undo the not received multi/redone HNs
	  let id_list;
	  if (hnRev != undefined) {
		id_list = hnRev.id_list;
		a_HN = hnRev.hn_list;
	  }
	  else {
		id_list = HN.id_list;
		a_HN = HN.hn_list;
	  }
	  if ((orig_id_list == undefined) && (action.startsWith(HNACTION_BKMKREMOVE))) {
		// Set orig_id_list in case of recreate
		orig_id_list = id_list;
	  }
	  undoHN = historyListAdd(hl, action,
  					 true, id_list, undefined, undefined, undefined, undefined, undefined,
  					 undefined, undefined, undefined, undefined, undefined,
  					 HN.toPath, HN.toParentId, HN.toIndex, undefined, undefined,
  					 undefined, undefined,
  					 HNREVOP_ISUNDO, activeIndex, orig_id_list
  					);
	}
	else {
	  // Note: use the latest id in hnRev.id if it exists
	  // Also, take the received HN in the redo to revert if there is one
	  // If it is not complete, then we will not undo the not received multi/redone HNs
	  if (hnRev != undefined) {
		bnId = hnRev.id;
		a_HN = hnRev.hn_list;
	  }
	  else {
		bnId = HN.id;
		a_HN = [HN];
	  }
	  if ((orig_id_list == undefined) && (action.startsWith(HNACTION_BKMKREMOVE))) {
		// Set orig_id_list in case of recreate
		orig_id_list = [bnId];
	  }
	  undoHN = historyListAdd(hl, action,
  					 false, undefined, bnId, HN.type, HN.path, HN.parentId, HN.index,
  					 HN.title, HN.faviconUri, HN.url, HN.inBSP2Trash, HN.bnTreeJson,
  					 HN.toPath, HN.toParentId, HN.toIndex, HN.toTitle, HN.toUrl,
  					 HN.childIds, HN.toChildIds,
  					 HNREVOP_ISUNDO, activeIndex, orig_id_list
  					);
	}
	len = (a_HN == undefined) ? 0 : a_HN.length;

	// Determine the undo action to accomplish
	let moveLoc;
	let BN;
	let toParentId, toIndex;
	switch (action) {
	  case HNACTION_BKMKCREATE:
	  case HNACTION_BKMKCREATEFROMTRASH:
	  case HNACTION_BKMKCREATEFROMTRASH_DESYNC:
		// Really remove if no trash, or if create of a bookmark in trash (note: "create_ft" ends outside of trash)
		if (options.trashEnabled && !HN.inBSP2Trash) { // Move at end of, or back to, trash
 		  // All here is going to trash
		  moveLoc = new Object ();
		  moveLoc.parentId = bsp2TrashFldrBNId;
		  let is_createFromTrash = action.startsWith(HNACTION_BKMKCREATEFROMTRASH); 
		  for (let i=len-1 ; i>=0 ; i--) { // Execute in reverse order to keep target order if possible
			HN = a_HN[i];
			if (is_createFromTrash) { // Move back to where it was
			  // Extract target position from the last operation, which can be a redo, so different from action
			  if (HN.action == HNACTION_BKMKCREATE) { // None
				delete moveLoc.index;
			  }
			  else {
				toIndex = HN.index; 
				moveLoc.index = toIndex;
			  }
			}
			// Can't be under same parent since a move inside trash is a move, not a moveto/createfrom trash
			await browser.bookmarks.move(
			  HN.id,
			  moveLoc
			);
		  }
		}
		else { // Really delete the bookmark item
		  for (let i=0 ; i<len ; i++) {
			HN = a_HN[i];
			await browser.bookmarks.removeTree(HN.id);
		  }
		}
		break;

	  case HNACTION_BKMKCHANGE:
	  case HNACTION_BKMKCHANGE_DESYNC:
		// There is no multiple change operation, so there is only 1 element, which is in HN
		await browser.bookmarks.update(
		  HN.id,
		  ((HN.type == "folder") ?
			{title: HN.title
			}
		   :
			{title: HN.title,
			 url: HN.url	
			}
		  )
		);
		break;

	  case HNACTION_BKMKMOVE:
	  case HNACTION_BKMKMOVE_DESYNC:
		moveLoc = new Object (); // Note: the undo of a multi move can have multiple destinations
		for (let i=len-1 ; i>=0 ; i--) { // Execute in reverse order to keep target order if possible
		  HN = a_HN[i];
		  toParentId = HN.parentId;
		  // As we are using the real indexes before and after move, there is no need to decrease toIndex by 1
		  // if under the same parent to represent position without moved item .. this is already accounted for.
		  toIndex = HN.index;
		  if ((toParentId == HN.toParentId) && (toIndex == HN.toIndex)) { // No move
			continue;
		  }
		  moveLoc.parentId = toParentId;
		  moveLoc.index = toIndex; 
		  await browser.bookmarks.move(
			HN.id,
			moveLoc
		  );
		}
		break;

	  case HNACTION_BKMKREMOVE: // Weed to recreate the bookmark(s), we cannot undo remove !!
	  case HNACTION_BKMKREMOVE_DESYNC:
	  case HNACTION_BKMKREMOVETOTRASH: // If in trash, no need to recreate, but have to check it is still there ..
	  case HNACTION_BKMKREMOVETOTRASH_DESYNC:
		moveLoc = new Object ();
		// A remove or move can have many sources (and only one destination if moving), so parentId can change each time
		let id_list = []; // If recreate, collect the new bookmark ids, else keep the existing ones
		let is_recreated = false;
		let a_id = (hnRev != undefined) ? hnRev.found_id_list : (is_multi ? HN.found_id_list : [bnId]);
		for (let i=len-1 ; i>=0 ; i--) { // Execute in reverse order to keep target order if possible
		  // Search if the removed bookmark node to undo stil exists (in trash ..)
		  // If yes, move it back where it was, else recreate it
		  bnId = a_id[i];
		  BN = curBNList[bnId];
		  
		  HN = a_HN[i];
		  toParentId = HN.parentId;
		  toIndex = HN.index;
		  if (BN != undefined) { // BN still exists, move it back to where it was
			if ((BN.parentId != toParentId) || (BN.index != toIndex)) { // Move it only if not already in its place !
			  moveLoc.parentId = toParentId;
			  moveLoc.index = toIndex; 
			  // Can't be under same parent since a move inside trash is a move, not a moveto/createfrom trash
			  await browser.bookmarks.move(
				bnId,
				moveLoc
			  );
			}
		  }
		  else { // We need to recreate the bookmark, we cannot revert the previous remove !!
			is_recreated = true;
			let json = HN.bnTreeJson;
			if (json != undefined) { //We can only recreate it if we have its past structure
			  BN = BN_deserialize(json);
			  bnId = (await util_copyBkmk ([BN], toParentId, toIndex, undoHN))[0];
			}
		  }
		  id_list.push(bnId);
		}
		if (is_recreated) { // Set the id or id_list for recreated bookmark(s) in undoHN
		  if (is_multi) {
			undoHN.id_list = id_list;
			undoHN.id_list_len = len;
		  }
		  else {
			undoHN.id = id_list[0];
		  }
		}
		break;
	}

  // Save new current info
  saveBNList();
  }
}

/*
 * Execute a Redo action, obtained from history (if thre is an action to redo)
 */
async function executeRedo (hl) {
  let activeIndex = hl.activeIndex;
  if (activeIndex == undefined) {
	activeIndex = -1;
  }
  // Redo the next undone record on active branch which is just after activeIndex
  // Search for such a record and redo it
  let hnList = hl.hnList;
  let len = hnList.length;
  let HN, state, action;
  while (++activeIndex < len) {
	state = (HN = hnList[activeIndex]).state;
	if (((state == undefined) || (state == HNSTATE_ACTIVEBRANCH))
		&& ((action = HN.action) != HNACTION_BSP2START)
		&& (action != HNACTION_RELOADFFAPI)
		&& (action != HNACTION_AUTORELOADFFAPI)
		&& (action != HNACTION_CLEARHISTORY)
		&& (HN.reversion == HNREVERSION_UNDONE)
	   ) {
	  break;
	}
  }

  if (activeIndex < len) { // Found one !
	// Remember the undo record which we are going to revert before it gets overwritten by historyListAdd()
	let hnRev = hnList[activeIndex + HN.revOp_HNref];
	let orig_id_list = hnRev.orig_id_list;

	// Record a multiple redo operation if more than one item is in the array
	let redoHN;
	let is_multi = HN.is_multi;
	if (is_multi) {
	  // Note: use the latest list of ids in hnRev.id_list, from the undo record to revert
	  let id_list = hnRev.id_list;
	  if ((orig_id_list == undefined) && (action.startsWith(HNACTION_BKMKCREATE))) {
		// Set orig_id_list in case of recreate
		orig_id_list = id_list;
	  }
	  redoHN = historyListAdd(hl, action,
  					 true, id_list, undefined, undefined, undefined, undefined, undefined,
  					 undefined, undefined, undefined, undefined, undefined,
  					 HN.toPath, HN.toParentId, HN.toIndex, undefined, undefined,
  					 undefined, undefined,
  					 HNREVOP_ISREDO, activeIndex, orig_id_list
  					);
	}
	else {
	  // Note: use the latest id in hnRev.id, from the undo record to revert
	  let bnId = hnRev.id;
	  if ((orig_id_list == undefined) && (action.startsWith(HNACTION_BKMKCREATE))) {
		// Set orig_id_list in case of recreate
		orig_id_list = [bnId];
	  }
	  redoHN = historyListAdd(hl, action,
  					 false, undefined, bnId, HN.type, HN.path, HN.parentId, HN.index,
  					 HN.title, HN.faviconUri, HN.url, HN.inBSP2Trash, HN.bnTreeJson,
  					 HN.toPath, HN.toParentId, HN.toIndex, HN.toTitle, HN.toUrl,
  					 HN.childIds, HN.toChildIds,
  					 HNREVOP_ISREDO, activeIndex, orig_id_list
  					);
	}

	// Take the received list of HNs in the undo to revert
	// If it is not complete, then we will not redo the not received undone HNs
	let a_HN = hnRev.hn_list;
	len = (a_HN == undefined) ? 0 : a_HN.length;

	// Determine the redo action to accomplish
	let moveLoc;
	let bnId, BN;
	let toParentId, toIndex;
	switch (action) {
	  case HNACTION_BKMKCREATE:
	  case HNACTION_BKMKCREATEFROMTRASH:
	  case HNACTION_BKMKCREATEFROMTRASH_DESYNC:
		moveLoc = new Object ();
		moveLoc.parentId = toParentId = ((action == HNACTION_BKMKCREATE) && !is_multi) ? HN.parentId : HN.toParentId;
		let id_list = []; // If recreate, collect the new bookmark ids, else keep the existing ones
		let is_recreated = false;
		let a_id = hnRev.found_id_list;
		for (let i=len-1 ; i>=0 ; i--) { // Execute in reverse order from hnRev to keep target order if possible
		  // Look for the bookmark node resulting from the last undo
		  // Indeed, if it went through a series of undo / redo with no trash in the middle, it was recreated with a different id
		  // Note that if it was moved to trash and trash was removed, then it was deleted and so it won't be found
		  bnId = a_id[i];
		  BN = curBNList[bnId];
		  
		  HN = a_HN[i];
		  toIndex = HN.index; // Extract from the last undo action
		  if (BN != undefined) { // BN exists, move it back to where it should
			if ((BN.parentId != toParentId) || (BN.index != toIndex)) { // Move it only if not already in its place !
			  moveLoc.index = toIndex;
			  // Can't be under same parent since a move inside trash is a move, not a moveto/createfrom trash
			  await browser.bookmarks.move(
				bnId,
				moveLoc
			  );
			}
		  }
		  else { // We need to recreate the bookmark, we cannot revert the previous remove !!
			is_recreated = true;
			let json = HN.bnTreeJson;
			if (json != undefined) { //We can only recreate it if we have its past structure
			  BN = BN_deserialize(json);
			  bnId = (await util_copyBkmk ([BN], toParentId, toIndex, redoHN))[0];
			}
		  }
		  id_list.push(bnId);
		}
		if (is_recreated) { // Set the id or id_list for recreated bookmark(s) in redoHN
		  if (is_multi) {
			redoHN.id_list = id_list;
			redoHN.id_list_len = len;
		  }
		  else {
			redoHN.id = id_list[0];
		  }
		}
		break;

	  case HNACTION_BKMKCHANGE:
	  case HNACTION_BKMKCHANGE_DESYNC:
		// There is no multiple change operation, so there is only 1 element, which is in HN
		await browser.bookmarks.update(
		  HN.id,
		  ((HN.type == "folder") ?
			 {title: HN.toTitle
			 }
		    :
			 {title: HN.toTitle,
			  url: HN.toUrl	
			 }
		  )
		);
		break;

	  case HNACTION_BKMKMOVE:
	  case HNACTION_BKMKMOVE_DESYNC:
		moveLoc = new Object ();
		moveLoc.parentId = toParentId = HN.toParentId; // One destination for all moves
		let is_sameParent = (toParentId == HN.parentId);
		for (let i=len-1 ; i>=0 ; i--) { // Execute in reverse order from hnRev to keep target order if possible
		  HN = a_HN[i];
		  // As we are using the real indexes before and after move, there is no need to decrease toIndex by 1
		  // if under the same parent to represent position without moved item .. this is already accounted for.
		  toIndex = HN.index; // Extract from the last undo action
		  if (is_sameParent && (toIndex == HN.toIndex)) { // No move
			continue;
		  }
		  moveLoc.index = toIndex;
		  await browser.bookmarks.move(
			HN.id,
			moveLoc
		  );
		}
		break;

	  case HNACTION_BKMKREMOVE: // Move to trash if enabled, else really remove
	  case HNACTION_BKMKREMOVE_DESYNC:
	  case HNACTION_BKMKREMOVETOTRASH:
	  case HNACTION_BKMKREMOVETOTRASH_DESYNC:
		// Really remove if no trash, or if remove of a bookmark in trash
		let is_removeToTrash = action.startsWith(HNACTION_BKMKREMOVETOTRASH); 
		if (options.trashEnabled && (is_removeToTrash || !HN.inBSP2Trash)) { // Move at end of, or to, trash
		  moveLoc = new Object ();
		  moveLoc.parentId = bsp2TrashFldrBNId;
		  for (let i=len-1 ; i>=0 ; i--) { // Execute in reverse order from hnRev to keep target order if possible
			HN = a_HN[i];
			if (is_removeToTrash) {
			  // Extract target position from the last undo action
			  if (HN.action == HNACTION_BKMKCREATE) { // None
				delete moveLoc.index;
			  }
			  else {
				toIndex = HN.index; 
				moveLoc.index = toIndex;
			  }
			}
			// Can't be under same parent since a move inside trash is a move, not a moveto/createfrom trash
			await browser.bookmarks.move(
			  HN.id,
			  moveLoc
			);
		  }
		}
		else { // Really delete the bookmark item
		  for (let i=0 ; i<len ; i++) {
			HN = a_HN[i];
			await browser.bookmarks.removeTree(HN.id);
		  }
		}
		break;
	}

	// Save new current history info
	saveBNList();
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
	if (record.is_multi) { // Look also at bookmark nodes included in multi records
	  let hn_list = record.hn_list;
	  for (let j=hn_list.length-1 ; j>= 0 ; j--) {
		record = hn_list[j];
		if ((record != undefined) && (record.id == id)
			&& (((title = record.toTitle) != undefined) || ((title = record.title) != undefined))
		   ) {
		  break;
		}
	  }
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
	if (record.is_multi) { // Look also at bookmark nodes included in multi records
	  let hn_list = record.hn_list;
	  for (let j=hn_list.length-1 ; j>= 0 ; j--) {
		record = hn_list[j];
		if ((record != undefined) && (record.id == id)) {
		  record.faviconUri = faviconUri;
		}
	  }
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
	if (record.is_multi) { // Look also at bookmark nodes included in multi records
	  let hn_list = record.hn_list;
	  for (let j=hn_list.length-1 ; j>= 0 ; j--) {
		record = hn_list[j];
		if ((record != undefined) && (record.id == id)
			&& ((uri = record.faviconUri) != undefined)
		   ) {
		  break;
		}
	  }
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
	  else if (!options.disableFavicons) {
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
	if (record.is_multi) { // Look also at bookmark nodes included in multi records
	  let hn_list = record.hn_list;
	  for (let j=hn_list.length-1 ; j>= 0 ; j--) {
		record = hn_list[j];
		if ((record != undefined) && (record.id == id)
			&& (((url = record.toUrl) != undefined) || ((url = record.url) != undefined))
		   ) {
		  break;
		}
	  }
	}
  }
  return(url);
}

/*
 * Try to find last childIds of a folder bookmark from history
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
	if (record.is_multi) { // Look also at bookmark nodes included in multi records
	  let hn_list = record.hn_list;
	  for (let j=hn_list.length-1 ; j>= 0 ; j--) {
		record = hn_list[j];
		if ((record != undefined) && (record.id == id)
			&& (((childIds = record.toChildIds) != undefined) || ((childIds = record.childIds) != undefined))
		   ) {
		  break;
		}
	  }
	}
  }
  return(childIds);
}