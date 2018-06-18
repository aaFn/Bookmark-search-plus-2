'use strict';


/*
 * Constants
 */
const Navigator = window.navigator; // Get version of navigator to detect unavailable features between FF 54 and FF 56
const BuildID = Navigator.buildID; // BuildID: 20100101 means that we have the websites.resistFingerprinting setting
                                   // set .. see https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/privacy/websites
                                   // This can happen when the Privacy Settings add-on is used for example ..
                                   // See https://addons.mozilla.org/fr/firefox/addon/privacy-settings/ .. good news, this
                                   //   add-on requires FF 57 minimum, and that particular setting exist only since FF 58,
                                   //   so we cannot have it on FF 56 and it means BeforeFF57 must be false.
//console.log("BuildID: "+BuildID);
const BeforeFF57 = ((BuildID != "20100101") && (BuildID < "20171112125346"));
//console.log("BeforeFF57: "+BeforeFF57);
const SidebarScanInterval = 1000; // Every 1 s


/*
 * Global variables, seen by foreground instances (var)
 */


/*
 * Global variables, private to background (let)
 */
let justInstalled = false; // Signal if we were just installed or this is an update
let isSidebarOpen = {};			// Track state of open sidebars
let privateSidebarsList = {};	// Track private windows sidebars
let sidebarScanIntervalId = undefined; // To scan open private sidebars ...


/*
 * Objects
 */


/*
 * Functions
 * ---------
 */

/*
 * Called by a sidebar when opening
 */
function newSidebar (windowId) {
//  console.log("Background received newSidebar notification from "+windowId);
  isSidebarOpen[windowId] = true;
}

/*
 * Called by a sidebar when closing
 */
function closeSidebar (windowId) {
//  console.log("Background received closeSidebar notification from "+windowId);
  delete isSidebarOpen[windowId];
}

/*
 * Verify if private window sidebars are still open. If not, update scanSidebars status
 */
function scanSidebars () {
  for (let i in privateSidebarsList) {
	let windowId = privateSidebarsList[i];
//    console.log("Scanning "+windowId);
	browser.sidebarAction.isOpen(
	  {windowId: windowId}
	).then(
	  function (open) {
//        console.log(windowId+" is "+open);
		if (!open) { // Remove from lists of open sidebars
//          console.log("Deleting "+windowId);
		  delete privateSidebarsList[windowId];
		  delete isSidebarOpen[windowId];
		  if (privateSidebarsList.length == 0) {
			clearInterval(sidebarScanIntervalId);
			sidebarScanIntervalId = undefined;
		  }
		}
	  }
	).catch( // Asynchronous also, like .then
	  function (err) {
	    // window doesn't exist anymore
//        console.log("Error name: "+err.name+" Error message: "+err.message);
		if (err.message.includes("Invalid window ID")) {
//          console.log("Window doesn't exist anymore, deleting it: "+windowId);
		  delete privateSidebarsList[windowId];
		  delete isSidebarOpen[windowId];
		}
	  }
	);
  }
}

/*
 * Handle responses or errors when talking with sidebars
 */
function handleMsgResponse (message) {
  // Is always called, even is destination didn't specifically reply (then message is undefined)
  console.log("Sidebar sent a response: "+message);
}

function handleMsgError (error) {
  console.log("Error: "+error);
}

/*
 * Send msg to sidebars
 */
function sendAddonMessage (msg) {
  browser.runtime.sendMessage(
	{source: "background",
	 content: msg
	}
  ).then(handleMsgResponse, handleMsgError);
}

/*
 * Get and handle messages from sidebar scripts
 */
function handleAddonMessage (request, sender, sendResponse) {
  // When coming from background:
  //   sender.url: moz-extension://28a2a188-53d6-4f91-8974-07cd0d612f9e/_generated_background_page.html
  // When coming from sidebar:
  //   sender.url: moz-extension://28a2a188-53d6-4f91-8974-07cd0d612f9e/sidebar/panel.html
  console.log("Got message <<"+request.content+">> from "+request.source+" in background");
  console.log("  sender.tab: "+sender.tab);
  console.log("  sender.frameId: "+sender.frameId);
  console.log("  sender.id: "+sender.id);
  console.log("  sender.url: "+sender.url);
  console.log("  sender.tlsChannelId: "+sender.tlsChannelId);

  let msg = request.content;
  if (msg.startsWith("New:")) { // New private window sidebar opening - Register it
	let windowId = parseInt(msg.slice(4), 10);
	privateSidebarsList[windowId] = windowId;
	newSidebar(windowId);
	// Start private windows sidebar tracking
	if (sidebarScanIntervalId == undefined) {
	  sidebarScanIntervalId = setInterval(scanSidebars, SidebarScanInterval);
	}
  }
  else if (msg.startsWith("Close:")) { // Private window closing - De-register it
	                                   // In fact, this message never comes :-(
	                                   // So have to poll such pages ...
	let windowId = parseInt(msg.slice(6), 10);
	closeSidebar(windowId);
  }
 
  // Answer
  sendResponse(
	{content: "Background response to "+request.source		
	}
  );
}

/*
 * Called by browser action button click (if enabled)
 * tab: a tabs.Tab indicating the tab that was active when the icon was clicked
 */
function buttonClicked (tab) {
//  console.log("Background received button click");
  let windowId = tab.windowId;
  // Can't use browser.sidebarAction.isOpen() here, as this is waiting for a Promise,
  // and so when it arrives we are not anymore in the code flow of a user action, so
  // the browser.sidebarAction.close() and browser.sidebarAction.open() are not working :-(
  // => Have to track state through other mechanisms to not rely on Promises ...
  if (isSidebarOpen[windowId] == true) {
//    console.log("Sidebar is open. Closing.");
    browser.sidebarAction.close();
  }
  else {
//    console.log("Sidebar is closed. Opening.");
    browser.sidebarAction.open();
  }
}

/*
 * Detect whether we were just installed, or if this is an update
 */
function handleInstall (details) {
//  console.log("Install event reason: "+details.reason+" Temporary: "+details.temporary);
  if (details.reason == "install") {
	justInstalled = true;
  }
}


/*
 * Main code:
 * ----------
*/
// General add-on events
browser.runtime.onInstalled.addListener(handleInstall);

// Watch for sidebar script messages
browser.runtime.onMessage.addListener(handleAddonMessage);

//setTimeout(sendAddonMessage, 120000);

/*
let count = 20;
function test() {
  const Root = "root________";
  let endLoadTime = new Date();
  browser.bookmarks.get(Root)
  .then(
    function (BTN) {
	  let t2 = new Date();
	  console.log("Root get duration: "+(t2.getTime() - endLoadTime.getTime())+" ms");
	  console.log("      Root.children: "+BTN.children);
 	  browser.bookmarks.getChildren(Root)
 	  .then(
 	    function (a_BTN1) {
 		  let t3 = new Date();
 		  console.log("Root getChildren duration: "+(t3.getTime() - t2.getTime())+" ms");
 		  console.log("      Number of children: "+a_BTN1.length);
 	      browser.bookmarks.getSubTree(Root)
 	      .then(
 	        function (a_BTN2) {
 	    	  let t4 = new Date();
 	    	  console.log("Root getSubTree duration: "+(t4.getTime() - t3.getTime())+" ms");
 	    	  console.log("      Root.children: "+a_BTN2[0].children);
 	    	  console.log("      Number of children: "+a_BTN2[0].children.length);
 	  	      browser.bookmarks.getTree()
 	  	      .then(
 	  	        function (a_BTN3) {
 	  	    	  let t5 = new Date();
 	  	    	  console.log("(Root) getTree duration: "+(t5.getTime() - t4.getTime())+" ms");
 	  	    	  console.log("      Root.children: "+a_BTN3[0].children);
 	  	    	  console.log("      Number of children: "+a_BTN3[0].children.length);
 	  	    	  if (count-- > 0)   test();
 	  	        }
 	  	      );
 	        }
 	      );
 	    }
 	  );
    }
  );
}
setTimeout(test, 10000);
*/

// Get our version number and
// show the browser action button if option is set
browser.management.getSelf()
.then(
  function (extensionInfo) {
	let name = extensionInfo.name;
	let version = extensionInfo.version;
//	let title1 = name;
	let title2 = name + "\nv" +version;

	// Disable the toolbar button in FF56, it is useless ..
	if (BeforeFF57) {
	  browser.browserAction.disable();
	  title2 += "\nButton not working in FF56 !";
	}

//	browser.browserAction.enable();
//	browser.browserAction.setBadgeText(
//	  {text: title1
//	  }
//	);
	browser.browserAction.setTitle(
	  {title: title2
	  }
	);
	browser.browserAction.setIcon(
	  {path: "icons/star2.png"
	  }
	);
	browser.browserAction.onClicked.addListener(buttonClicked);
  }
);
