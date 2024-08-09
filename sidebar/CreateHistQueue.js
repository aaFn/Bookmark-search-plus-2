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

//***************************************************
// CreateHistQueue class (and CreateHist class + CreateEntry class)
//
// This mechanism is for create undo/redo and for multi-create records, and is to work around the problem that
// when we create a bookmark we cannot set its id, and we cannot either pass a coreslation id in the creation API
// so that when the bookmark is created, we can retrieve where to place it in the history of bookmark nodes.
//
// One possibility would have been to not listen on the bookmark created event, and to simply wait that
// the creatio ncall completes, returns the created BTN with its id, and then insert it in history,
// however we do need to listen on that event to catch bookmarks created by other sources than BSP2,
// like the native bookmark sidebar, or other web extensions.
// Since we do not have a way in the bookmark to recognize if at was created by BSP2 or by another
// source, we have to ahndle all created events, and find another method to correlate things.
//
// The algorithm used here functions as follows:
// - Use a CreateHistQueue mechanism of CreateHist objects sorted by decreasing time, describing bookmarks
//   submitted for creation BSP2, holding its attributes, a pointer to an HistoryNode where to attach it
//   when recognized, a queue of matching created BTNs as CreateEntry objects sorted by increasing time,
//   and also ultimately holding the id of the created bookmark received on creation completion, as well as a
//   Promise to wait on to get the new HistoryNode created when the create event is received, to be attached
//   to the pointed at HistoryNode.
// - This CreateHistQueue is manipulated in the background context, and its queued CreateHist objects hold
//   a pointer towards the destination multi or reversion HN, in the same background context.
//
// - It is called from the panel, or from any other piece, either directly through the backgroundPage or
//   indirectly through messaging (for private windows), when creating bookmarks in multi or reversion operations,
//   to queue new CreateHist objects which are returned for later usage on creation completion.
//
// - It is accessed from the bookmark created event in the background context when a newly created
//   bookmark is received, to check if a match is found, processing queued CreateHist objects from most
//   recent to oldest:
//   - if no match, add the history node for the newly created bookmark directly to history, as being
//     created by something else than BSP2, or as being a non multi or non reversion create
//   - if yes, but no exact match on the id is possible, then queue the new bookmark as CreateEntry on the
//     oldest matching CreateHist object havoing no id in the CreateHistQueue
//   - if yes, and there is an exact match on id, then:
//     a) attach the new bookmark HN on the pointed at HN, call the Promise resolve() with the new HsitoryNode
//     b) remove the CreateHist object from the CreateHistQueue (it will be garbage collected when no more in use).
//     (note: there is no CreateEntry on this CreateHist object, as it was cleaned up on creation completion)
//
// - The CreateHistQueue is also accessed when a bookmark creation completes and returns the created id,
//   again by calling it in the background context from the panel or any other place, and passing the previously
//   returned CreateHist object. The calling function should then wait on the returned Promise to get he new
//   HistoryNode created when the create event is received.
//   - the corresponding queued CreateHist object is then updated to hold the received id and:
//     c) if any previously queued CreateEntry on it matches the id, execute a) on that CreateEntry,
//        and remove it
//     d) if not, check in older CreateHist objects if there is a CreateEntry with that id, and if yes,
//        stop the search, execute a) on it, and remove that CreateEntry from the older CreateHist object
//     e) for each remaining CreateEntry already queued on this CreateHist object, from the oldest to newest,
//        check if it can be placed on another matching more recent queued CreateHist objedt
//     f) if yes, re-queue it there, keeping the sort on time
//     g) else, add the history node for the CreateEntry directly to history, as being created by
//        something else than BSP2, or as being a non multi or non reversion create, and remove the corresponding
//        CreateEntry
//     h) if c) or d) above executed a), then delete the CreateHist object from the CreateHistQueue,
//        else keep it for when the creation event will be received
//***************************************************
class CreateEntry {
  // Constructor:
  //-------------
  // id: String, created bookmark id
  // BN: BookmarkNode, pointer to the created bookmark object
  // HN: HistoryNode, pointer to the HistoryNode to attach to the HistoryList later
  // dateAdded: number representing the creation date of the node in milliseconds since the epoch
  constructor (id, BN, HN) {
	this.id = id;
	this.BN = BN;
	this.HN = HN;
	this.dateAdded = BN.dateAdded;
  }
}


class CreateHist {
  // Constructor:
  //-------------
  // id: String, initially undefined, id received from the API after bookmark creation
  // index: integer , position where to insert
  // parentId: String, id of parent boookmark
  // title: String, title of the bookmark
  // type: String, "bookmark", "folder" or "separator"
  // url: String; url of the bookmark
  // toHN: HistoryNode, pointer to the HistoryNode where to attach the recognized creation later
// ref: String, reference used in CreateHistQueue.refMap
  //
  // createEntryList: Array, holding CreateEntry sorted in time, increasing, initialized to []
  // len: integer, length of the queue, initialized to 0
  // dateAdded: number representing the creation date of the node in milliseconds since the epoch
  // promise: Promise to listen on to wait for the create event, and get the corresponding new HistoryNode
  // resolve: externalize the resolve() function to return the new HistoryNode on create event reception
//  constructor (index, parentId, title, type, url, toHN, ref) {
  constructor (index, parentId, title, type, url, toHN) {
	this.id = undefined;
	this.index = index;
	this.parentId = parentId;
	this.title = title;
	this.type = type;
	this.url = url;
	this.toHN = toHN;
//	this.ref = ref;

	this.createEntryList = [];
	this.len = 0;
	this.dateAdded = (new Date ()).getTime();

	this.resolve = undefined; // Ensure the attribute exists
	let newObj = this; // To avoid anyh ambiguity on "this" in the body of the function below
	this.promise = new Promise (
	  (resolve, reject) => {
		// Externalise the resolve function
		newObj.resolve = resolve;
	  }
	);
  }

  // Method: check if a CreeateEntry matches id
  //-------------
  // If an existing CreateEntry matches the id, remove it from the createEntryList queue, and return it.
  // id: String, id of completed bookmark creation to set
  // Returns a CreateEntry if there is a matching one, else undefined
  checkId (id) {
	let entry, e;
	for (let i=0 ; i<this.len ; i++) {
	  e = this.createEntryList[i];
	  if (e.id == id) { // found one !
		// Return it
		entry = e;
		// Remove it from the queue
		this.createEntryList.splice(i, 1);
		this.len--;
	  }
	}
	return(entry);
  }

  // Method: set id
  //-------------
  // If an existing CreateEntry matches the id, remove it from the createEntryList queue, and return it.
  // id: String, id of completed bookmark creation to set
  // Returns a CreateEntry if there is a matching one, else undefined
  setId (id) {
	this.id = id;
	return(this.checkId(id));
  }

  // Method: check if a BN matches on id, or on content, or not
  //-------------
  // BN: BookmarkNode to check
  // Returns -1 if no match, or 0 if match on content only, or 1 if match on id
  match (BN) {
	if (BN.id == this.id)   return (1);
	if ((BN.parentId = this.parentId) && (BN.title == this.title) && (BN.type == this.type) && (BN.url == this.url))
	  return (0);
	return(-1);
  }

  // Method: quene a new received CreateEntry, keeping sort in time
  //-------------
  // id: String, created bookmark id
  // BN: BookmarkNode, pointer to the created bookmark object received
  // HN: HistoryNode, pointer to the HistoryNode to attach to the HistoryList later
  queueCreated (id, BN, HN) {
	let dateAdded = BN.dateAdded;
	let i;
	for (i=0 ; i<this.len ; i++) {
	  if (dateAdded <= this.createEntryList[i].dateAdded)
		break;
	}
	if (i < this.len) { // Insert at found position
	  this.createEntryList.splice(i, 0, new CreateEntry (id, BN, HN));
	  this.len++;
	}
	else { // Add at end
	  this.len = this.createEntryList.push(new CreateEntry (id, BN, HN));
	}
  }

  // Method: requene a CreateEntry, keeping sort in time
  //-------------
  // entry: CreateEntry to requeue
  requeueCreated (entry) {
	let dateAdded = entry.dateAdded;
	let i;
	for (i=0 ; i<this.len ; i++) {
	  if (dateAdded <= this.createEntryList[i].dateAdded)
		break;
	}
	if (i < this.len) { // Insert at found position
	  this.createEntryList.splice(i, 0, entry);
	  this.len++;
	}
	else { // Add at end
	  this.len = this.createEntryList.push(entry);
	}
  }
}


class CreateHistQueue {
  // Constructor:
  //-------------
  // createHistList: Array, holding CreateHist sorted in time, decreasing, initialized to []
  // len: integer, length of the queue, initialized to 0
  constructor () {
	this.createHistList = [];
//	this.nextFreeRef = 0;
//	this.refMap = {};
	this.len = 0;
  }

  // Method: queue a new inside multi or inside reversion Create for later recognition
  //-------------
  // index: integer , position where to insert
  // parentId: String, id of parent boookmark
  // title: String, title of the bookmark
  // type: String, "bookmark", "folder" or "separator"
  // url: String; url of the bookmark
  // toHN: HistoryNode, pointer to the HistoryNode where to attach the recognized creation later
  //
  // Returns the created CreateHist object
  queueMultiOrReversionCreation (index, parentId, title, type, url, toHN) {
//	let ref = "ref"+this.nextFreeRef++;
//	let newHist = new CreateHist (index, parentId, title, type, url, toHN, ref);
	let newHist = new CreateHist (index, parentId, title, type, url, toHN);
	this.len = this.createHistList.unshift(newHist);
//	this.refMap[ref] = newHist;
//	return(ref);
	return(newHist);
  }

  // Method: cleanup a CreateHist object from its CreateEntry, requeuieng them or attaching to HistoryList
  //-------------
  // hist: CreateHist object to cleanup
  // pos: integer, position of hist in the createEntryList
  cleanupCreateHist (hist, pos) {
	// For each CreateEntry already queued on this CreateHist object, from the oldest to newest,
	// check if it can be placed on another matching more recent queued CreateHist objedt
	let len = hist.len;
	let e;
	let k
	let cel = hist.createEntryList; 
	for (let j=0 ; j<len ; j++) {
	  e = cel[j];
	  for (k=pos-1 ; k>=0 ; k--) {
		h = this.createHistList[k];
	 	m = h.match(e.BN);
	    if (m == 0) { // It can only be 0, not 1, because when an id is set, older CreateHist are checked
		  // If yes, re-queue it there, keeping the sort on time
		  h.requeueCreated(e);
		  break;
		}
	  }
	  // If not requeued,, add the history node directly to history at end, as being created by
	  // something else than BSP2. The corresponding CreateEntry will be garbage collected with
	  // its parent CreateHist
	  if (k < 0) {
		historyListAddCreate(curHNList, h.HN);
	  }
	}
  }

  // Method: handle the reception of a newly created bookmark event
  //-------------
  // id: String, created bookmark id
  // BN: BookmarkNode, pointer to the created bookmark object received
  // HN: HistoryNode, pointer to the HistoryNode to attach to the HistoryList later
  receivedCreateEvent (id, BN, HN) {
	// Check if a match is found, processing queued CreateHist objects from most recent to oldest
	let hist, h;
	let match, m;
	let i;
	for (i=0 ; i<this.len ; i++) {
	  h = this.createHistList[i];
	  m = h.match(BN);
	  if (m == 1) { // Match on id, stop on it
		hist = h; // Take that one
		match = m;
		break;
	  }
	  else if ((h.id == undefined) && (m >= 0)) { // Keep the oldest match with no id
		hist = h;
		match = m;
	  }
	}
	if (hist == undefined) { // Found no match, add directly at end of HistoryList
	  historyListAddCreate(curHNList, HN);
	}
	else { // Found a match
	  if (match == 0) { // No match on id was possible, enqueue the created bookmark on the oldest match with no id
		hist.queueCreated(id, BN, HN);
	  }
	  else { // Found a match on id, the bookmark is recognized !
		// Attach the new bookmark HN on the pointed at HN
		historyListAttachCreate(curHNList, HN, hist.toHN);

		// Call resolve with the provided HN to pass it through the promise on any waiting part
		hist.resolve(HN);

		// Note: there is no CreateEntry on this CreateHist object, as it was cleaned up on creation completion 

		// Now, remove the CreateHist object from the CreateHistQueue
//		let ref = hist.ref;
		this.createHistList.splice(i, 1);
		this.len--;
 		// And delete from the refMap to avoid a memory leak !
// 		delete (this.refMap)[ref];
	  }
	}
  }

  // Method: a bookmark creation, inside multi or inside reversion, completed and returned the created bnId
  //-------------
  // createHist : CreateHist object corresponding to the queued creation in createHistList
  // bnId: String, id of completed bookmark creation
  //
  // Returns a Promise, which will return the created HistoryNode when the create event is received
  multiOrReversionCreationComplete (createHist, bnId) {
	// Find CreateHist in createHistList
//	let createHist = this.refMap[createHistRef];
	let pos = this.createHistList.indexOf(createHist); // Cannot be -1 !

	// Update CreateHist object to hold the received bnId
	let entry = createHist.setId(bnId);
	// If a previously queued CreateEntry on it matches the bnId, attach its bookmark HN on the pointed at HN
	// (note: it was removed from it by the setId() call).
	if (entry != undefined) {
	  let HN = entry.HN;
	  historyListAttachCreate(curHNList, HN, createHist.toHN);
	  // Call resolve with the provided HN to passs it through the promise on any waiting part
	  createHist.resolve(HN);
	}
	else { // Else, check in older CreateHist objects if there is a CreateEntry with that bnId
	  let h;
	  for (let i=pos+1 ; i<this.len ; i++) {
		h = this.createHistList[i];
		entry = h.checkId(bnId);
		// If yes, stop the search, and attach its bookmark HN on the pointed at HN
		// (note: it was removed from it by the checkId() call).
		if (entry != undefined) {
		  let HN = entry.HN;
		  historyListAttachCreate(curHNList, HN, createHist.toHN);
		  // Call resolve with the provided HN to passs it through the promise on any waiting part
		  createHist.resolve(HN);
		  break;
		}
	  }
	}

	// For each CreateEntry already queued on this CreateHist object, from the oldest to newest,
	// check if it can be placed on another matching more recent queued CreateHist objedt
	this.cleanupCreateHist(createHist, pos);

	if (entry != undefined) { // A previously enqueued CreateEntry was found, remove this CreateHist object
	  this.createHistList.splice(pos, 1);
	  this.len--;
	  // And delete it from the refMap to avoid a memory leak !
//	  delete (this.refMap)[createHistRef];
	}
	// Else keep it for when the creation event will be received

	// Return the promise to get the created HN
	return(createHist.promise);
  }
}


//***************************************************
// Functions to manipulate OptionDesc class
//***************************************************
