'use strict';


/*
 * Constants
 */


/*
 * Global variables, seen by other instances (var)
 */


/*
 * Global variables, private to including page (let)
 */


/*
 * Objects
 */


/*
 * Functions
 * ---------
 */

/*
 * Handle FF API call for bookmark creation - only for single create (non multi, non reversion)
 * Only called within sidebar or history window context.
 * 
 * parentId = String identifying the folder inside which to insert
 * insertIndex = position in parent folder where to insert (undefined if append at end)
 * title = String, title of created bookmark
 * url = String, URL of created bookmark (undefined if folder)
 * type = String, "bookmark", "folder" or "separator"
 *
 * Returns a creation promise (which returns a BTN)
 */
function createBkmkItem (parentId, insertIndex, title, url, type) {
  let creating;
  if (insertIndex == undefined) { // Create in a folder, at end
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
		  {parentId: parentId,
		   title: title,
		   url: url
		  }
		);
	  }
	}
	else {
	  creating = browser.bookmarks.create(
		{parentId: parentId,
		 title: title,
		 type: type,
		 url: url
		}
	  );
	}
  }
  else { // Create before or after a bookmark item
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
		  {index: insertIndex,
		   parentId: parentId,
		   title: title,
		   url: url
		  }
		);
	  }
	}
	else {
	  creating = browser.bookmarks.create(
		{index: insertIndex,
		 parentId: parentId,
		 title: title,
		 type: type,
		 url: url
		}
	  );
	}
  }
  return(creating);
}

/*
 * Handle FF API call for bookmark creation - async function, for types of create (single, or multi, or reversion)
 * Both called within sidebar/history window context, or background context.
 * 
 * parentId = String identifying the folder inside which to insert
 * insertIndex = position in parent folder where to insert (undefined if append at end)
 * title = String, title of created bookmarkf
 * url = String, URL of created bookmark (undefined if folder)
 * type = String, "bookmark", "folder" or "separator"
 * toHN = optional, only meaningful in background context, HistoryNode where to attach the recognized creation,
 *        for create inside multi or inside reversion
 *
 * Returns an object with BTN = created BTN, and HN = created HN
 */
async function createBkmkItem_async (parentId, insertIndex, title, url, type, toHN = undefined) {
  // Queue the creation for recognition if requested
  let is_separatorAndFF56 = (beforeFF57 && (type == "separator"));
  let createHistRef;
  if ((toHN != undefined) && !is_separatorAndFF56) { // Do not queue separators if FF56, since not yet supported
	createHistRef = curCreateHistQueue.queueMultiOrReversionCreation(insertIndex, parentId, title, type, url, toHN);
  }

  // Execute creation
  let creating;
  if (insertIndex == undefined) { // Create in a folder, at end
	if (beforeFF57) {
	  if (is_separatorAndFF56) { // Cannot create separators in FF 56
		creating = new Promise (
		  (resolve, reject) => {
			resolve(); // Send promise for anybody waiting ..
		  }
		);
	  }
	  else {
		creating = browser.bookmarks.create(
		  {parentId: parentId,
		   title: title,
		   url: url
		  }
		);
	  }
	}
	else {
	  creating = browser.bookmarks.create(
		{parentId: parentId,
		 title: title,
		 type: type,
		 url: url
		}
	  );
	}
  }
  else { // Create before or after a bookmark item
	if (beforeFF57) {
	  if (is_separatorAndFF56) { // Cannot create separators in FF 56
		creating = new Promise (
		  (resolve, reject) => {
			resolve(); // Send promise for anybody waiting ..
		  }
		);
	  }
	  else {
		creating = browser.bookmarks.create(
		  {index: insertIndex,
		   parentId: parentId,
		   title: title,
		   url: url
		  }
		);
	  }
	}
	else {
	  creating = browser.bookmarks.create(
		{index: insertIndex,
		 parentId: parentId,
		 title: title,
		 type: type,
		 url: url
		}
	  );
	}
  }

  // Wait for creation to complete, and send information for recognition if required
  let newBTN = await creating; // Created BookmarkTreeNode
  let newHN;
  if (createHistRef != undefined) {
	newHN = await curCreateHistQueue.multiOrReversionCreationComplete(createHistRef, newBTN.id);
  }

  return({BTN: newBTN, HN: newHN});
}

/*
 * Paste (create as copy) bookmark contents (recursively because can only create one by one) at the
 * designated place. This is only called in background page context.
 * 
 * a_BN = array of BookmarkNodes to paste (copy)
 * parentId = String, Id of new parent to paste into
 * index = integer position in parent (undefined if at end)
 * toHN = HistoryNode where to attach the recognized creations, can be undefined
 * 
 * Returns the list of (top) created bookmark ids, received on complettion of create
 */
async function util_copyBkmk (a_BN, parentId, index = undefined, toHN = undefined) {
//let t1 = (new Date ()).getTime();
//trace(t1+" Paste BN: "+BN+" Parent: "+parentBN+" index: "+index+" recur: "+recurLevel);
  let len = a_BN.length;
  let BN, children;
  let bnId, bnIdList = [];
  let newObj;
  for (let i=0 ; i<len ; i++) { // Go through list of BookmarkNodes
	BN = a_BN[i];
	if (!BN.protect) {
	  // If index is undefined, we are pasting into a folder => at end
	  if (index == undefined) {
		// Create BTN at end of parent folder
		newObj = await createBkmkItem_async(parentId, undefined, BN.title, BN.url, BN.type, toHN);
	  }
	  else {
		newObj = await createBkmkItem_async(parentId, index++, BN.title, BN.url, BN.type, toHN);
	  }
	  bnId = newObj.BTN.id;
	  bnIdList.push(bnId);
//let t2 = (new Date ()).getTime();
//trace(t2+" Paste node creation delay: "+(t2.getTime() - t1.getTime()));
	  children = BN.children;
	  if ((children != undefined) && (children.length > 0)) { // There are children to copy ...
		// Recursively call copyBkmk on children
		await util_copyBkmk(children, bnId, undefined, newObj.HN);
	  }
	}
  }
  return(bnIdList);
}

/*
 * Move bookmark(s) at the designated place.
 * 
 * a_BN = Array of BookmarkNodes to move (=> need to remain synchronous to keep order)
 * newParentId = String, Id of new parent to move into
 * newIndex = integer position in parent (undefined if at end)
 * 
 * Return true if moved, else false. 
 */
async function util_moveBkmk (a_BN, newParentId, newIndex = undefined) {
  let len = a_BN.length;
  let moveLoc = new Object ();
  moveLoc.parentId = newParentId;
  if (newIndex == undefined) { // Cut and pasting into a folder, at end
	let BN;
	for (let i=0 ; i<len ; i++) {
	  BN = a_BN[i];
//trace("Move BN id: "+BN.id+" to Parent id: "+newParentId+" at index: "+newIndex);
	  // Move BTN at end of folder. Do that synchronously to avoid mess when processing multiple BNs
	  if (!BN.protect) {
		await browser.bookmarks.move(
		  BN.id,
		  moveLoc
		);
	  }
	}
  }
  else {
	let BN;
	let index;
	for (let i=0 ; i<len ; i++) {
	  BN = a_BN[i];
      // If designated place is under same parent and after, some special handling ..
	  if (BN.parentId == newParentId) {
		// If moved after under same parent, need to decrease index by 1 to represent position without moved item ..
		// This is not documented properly on https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/bookmarks/move
		index = BN_getIndex(BN);
		if (newIndex > index)   newIndex--;
		if (newIndex == index) { // No move
		  continue;
		}
	  }
	  // Move BTN at designated place. Do that synchronously to avoid mess when processing multiple BNs
	  moveLoc.index = newIndex++;
	  if (!BN.protect) {
		await browser.bookmarks.move(
		  BN.id,
		  moveLoc
		);
	  }
	}
  }
}

/*
 * Remove bookmarks (with handling of BSP2 trash, if enabled)
 * 
 * a_BN = Array of BookmarkNodes to delete
 * is_trashEnabled = Boolean, true is trash is enabled
 */
async function util_delBkmk (a_BN, is_trashEnabled) {
  let len = a_BN.length;
  let BN;
  let bnId;
  for (let i=0 ; i<len ; i++) {
	BN = a_BN[i];
	bnId = BN.id;
//trace("Remove BN id: "+bnId);
	// If BSP2 trash enabled, move the bookmark item to trash instead
	// (except when already in trash, where we really delete it)
	if (is_trashEnabled && !BN.inBSP2Trash) { // Move at end of trash
	  await browser.bookmarks.move(
		bnId,
		{parentId: bsp2TrashFldrBNId
		}
	  );
	}
	else { // Really delete the bookmark item
	  await browser.bookmarks.removeTree(bnId);
	}
  }
}