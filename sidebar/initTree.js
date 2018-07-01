'use strict';

/*
 * Worker for background load of bookmaarks in the sidebar table
 * 
 * <rant on (again!) >
 *     There is no "include" function in this so said **POWERFUL** javascript language !!
 *     And since this script is a worker, there is no HTML to include something common at front.
 *     Therefore, I have to duplicate the following declarations from panel.js :-(
 * <rant off>
 */
const PersonalToobar = "toolbar_____";
const BookmarksMenu =  "menu________";
const OtherBookmarks = "unfiled_____";

/*
 * Functions
 * ---------
 */

/*
 * Get a cloned BTN object, but without the recursive structure of children.
 * This is to avoid structured cloning in postMessage().
 * 
 * BTN = a BookmarkTreeNode
 * 
 * Return another BookmarkTreeNode, copied from BTN, byut without the children tree
 */
function cloneBTN (BTN) {
  let newBTN = Object.create(Object.getPrototypeOf(BTN));
  // console.log("BTN.children: "+BTN.children+" newBTN.children: "+newBTN.children);
  newBTN.dateAdded         = BTN.dateAdded;
  newBTN.dateGroupModified = BTN.dateGroupModified;
  newBTN.id                = BTN.id;
  newBTN.index             = BTN.index;
  newBTN.parentId          = BTN.parentId;
  newBTN.title             = BTN.title;
  newBTN.type              = BTN.type;
  newBTN.unmodifiable      = BTN.unmodifiable;
  newBTN.url               = BTN.url;
  return(newBTN);
}

/*
 * Recursively explore a bookmark and its children
 * 
 * BTN = BookmarkTreeNode
 * level = integer, the tree depth
 */
function exploreTree (BTN, level) {
  // Avoid structured cloning by postMessage of full tree in return ..
  let newBTN = cloneBTN(BTN);
  postMessage([newBTN, level]);

  // If there are children, recursively display them
  if ((BTN.type == "folder") && (BTN.children.length > 0)) {
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
 * Main code:
 * ----------
*/
onmessage = function (e) {
  // e is of type MessageEvent, and its data contains a structured clone of tree root  
  // since we cannot use the browser.bookmarks interface from within the worker ...
  // let getTree = browser.bookmarks.getTree();
  let root = e.data; // This is a BookmarkTreeNode
                     //Id should be "root________" and type "folder"

  // First, display the Personal toolbar	"toolbar_____"
  displayBookmarkId(root.children, PersonalToobar, 0);
  // Then, display the Bookmarks menu		"menu________"
  displayBookmarkId(root.children, BookmarksMenu, 0);
  // And last, display the Other bookmarks	"unfiled_____"
  displayBookmarkId(root.children, OtherBookmarks, 0);

  postMessage([null, -1]); // Post one last message to say "finished"
  close(); // Terminate ourselves, we're finished
}