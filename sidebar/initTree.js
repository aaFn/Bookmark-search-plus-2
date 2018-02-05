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
 * Recursively explore a bookmark and its children
 * 
 * BTN = BookmarkTreeNode
 * level = integer, the tree depth
 */
function exploreTree (BTN, level) {
  postMessage([BTN, level]);

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
onmessage = function (e) { // e is of type MessageEvent, and its data contains the tree root 
  // Cannot use the browser.bookmarks interface from within the worker ...
  // var getTree = browser.bookmarks.getTree();
  var root = e.data; // This is a BookmarkTreeNode
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