'use strict';


/*
 * Constants
 */
const PopupURL = browser.extension.getURL("sidebar/popup.html");
const SelfURL = browser.extension.getURL("sidebar/panel.html");
const HistoryURL = browser.extension.getURL("sidebar/history.html");
const PopupWidth  = 380;
const PopupHeight = 190;

const BSP2UrlPattern = "moz-extension://" + window.location.host + "/*";
const MainMenuId = "show-path";  // FF standard menu item on bookmarks
const SubMenuPathId = "path-is"; // FF standard sub-menu item on bookmarks, to show path to bookmark
const BAOpenTabId = "baopentab"; // Browser action button context menu item, to open BSP2 in a tab
const BAShowInSidebar = "bashow"; // Browser action button context menu item, to show bookmarked page in BSP2 sidebar
const BAHistory = "bahistory"; // Browser action button context menu item, to open Bookmark history window
const BAOptionsId = "baoptions"; // Browser action button context menu item, to open BSP2 options
const Menu_bbkmk = "-bb"; // Menu identifier for Bookmark pane, on a bookmark item
const Menu_bresbkmk = "-brb"; // Menu identifier for Bookmark pane, on a bookmark item resulting from Show action in Search pane
const Menu_bfldr = "-bf"; // Menu identifier for Bookmark pane, on a folder item
const Menu_bresfldr = "-brf"; // Menu identifier for Bookmark pane, on a folder item resulting from Show action in Search pane
const Menu_bsep = "-bs"; // Menu identifier for Bookmark pane, on a separator item
const Menu_bprot = "-bpb"; // Menu identifier for Bookmark pane, on a protected bookmark item
const Menu_bprotf = "-bpf"; // Menu identifier for Bookmark pane, on a protected folder item
const Menu_bprots = "-bps"; // Menu identifier for Bookmark pane, on a protected separator item
const Menu_rbkmk = "-rb"; // Menu identifier for Search pane, on a bookmark item (advanced mode)
const Menu_rshowbkmk = "-rsb"; // Menu identifier for Search pane, on a bookmark item, with default being "Show"
const Menu_rfldr = "-rf"; // Menu identifier for Search pane, on a folder item
const ContextMenu = {};
// Record of keyboard shortcuts, result panel:
//   Bookmarks hgewnagtci
//   Folders   hgogtci
// Record of keyboard shortcuts, bookmark panel:
//   Bookmarks  ewnalgbfstcpdvi
//   Folders    olgbfstcpadrvi
//   Separators gbfstcpdv
ContextMenu["bsp2show"+Menu_rshowbkmk] = {
	title: "<S&how Bookmark>"
};
ContextMenu["bsp2show"+Menu_rfldr] = {
	title: "<S&how Folder>"
};
ContextMenu["bsp2goparent"+Menu_rshowbkmk+Menu_rfldr] = {
	is_goparent: true,
	title: "&Go Parent Folder"
};
ContextMenu["bsp2sep0"+Menu_rshowbkmk+Menu_rfldr] = {
	type: "separator"
};
ContextMenu["bsp2open"+Menu_bbkmk+Menu_bresbkmk+Menu_bprot+Menu_rbkmk] = {
	title: "<Op&en>"
};
ContextMenu["bsp2open"+Menu_rshowbkmk] = {
	title: "Op&en"
};
ContextMenu["bsp2opentab"+Menu_bbkmk+Menu_bresbkmk+Menu_bprot+Menu_rbkmk+Menu_rshowbkmk] = {
	title: "Open in Ne&w Tab"
};
ContextMenu["bsp2openwin"+Menu_bbkmk+Menu_bresbkmk+Menu_bprot+Menu_rbkmk+Menu_rshowbkmk] = {
	title: "Open in &New Window"
};
ContextMenu["bsp2openpriv"+Menu_bbkmk+Menu_bresbkmk+Menu_bprot+Menu_rbkmk+Menu_rshowbkmk] = {
	title: "Open in Priv&ate Window"
};
ContextMenu["bsp2openall"+Menu_bfldr+Menu_bresfldr+Menu_bprotf+Menu_rfldr] = {
	title: "&Open All in Tabs"
};
ContextMenu["bsp2sep1"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bprot+Menu_bprotf+Menu_rbkmk+Menu_rshowbkmk+Menu_rfldr] = {
	type: "separator"
};
ContextMenu["bsp2show"+Menu_rbkmk] = {
	title: "S&how Bookmark"
};
ContextMenu["bsp2opentree"+Menu_bresbkmk+Menu_bresfldr] = {
	title: "Open Parent Fo&lder(s)"
};
ContextMenu["bsp2goparent"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bsep+Menu_bprot+Menu_rbkmk] = {
	is_goparent: true,
	title: "&Go Parent Folder"
};
ContextMenu["bsp2sep2"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bsep+Menu_rbkmk] = {
	type: "separator"
};
ContextMenu["bsp2newb"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bsep+Menu_bprotf] = {
	title: "New &Bookmark..."
};
ContextMenu["bsp2newf"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bsep+Menu_bprotf] = {
	title: "New &Folder..."
};
ContextMenu["bsp2news"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bsep+Menu_bprotf] = {
	title: "New &Separator"
};
ContextMenu["bsp2sep3"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bsep+Menu_bprotf] = {
	type: "separator"
};
ContextMenu["bsp2cut"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bsep+Menu_rbkmk+Menu_rshowbkmk+Menu_rfldr] = {
	title: "Cu&t"
};
ContextMenu["bsp2copy"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bsep+Menu_rbkmk+Menu_rshowbkmk+Menu_rfldr] = {
	title: "&Copy"
};
ContextMenu["bsp2paste"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bsep] = {
	is_paste: true,
	title: "&Paste Before"
};
ContextMenu["bsp2pasteinto"+Menu_bfldr+Menu_bresfldr+Menu_bprotf] = {
	is_paste: true,
	title: "P&aste Into"
};
ContextMenu["bsp2sep4"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bsep+Menu_rbkmk+Menu_rshowbkmk+Menu_rfldr] = {
	type: "separator"
};
ContextMenu["bsp2del"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bsep] = {
	title: "&Delete"
};
ContextMenu["bsp2sep5"+Menu_bfldr+Menu_bresfldr] = {
	type: "separator"
};
ContextMenu["bsp2sort"+Menu_bfldr+Menu_bresfldr] = {
	title: "So&rt by Name"
};
ContextMenu["bsp2sep6"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bprotf] = {
	type: "separator"
};
const BSP2AdvancedMenu = "bsp2advanced"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bprotf;
ContextMenu[BSP2AdvancedMenu] = {
	title: "Ad&vanced"
};
ContextMenu["bsp2refreshfav"+Menu_bbkmk+Menu_bresbkmk] = {
	parentId: BSP2AdvancedMenu,
	is_refreshfav: true,
	title: "&Refresh Favicon"
};
ContextMenu["bsp2collapseall"+Menu_bfldr+Menu_bresfldr+Menu_bprotf] = {
    parentId: BSP2AdvancedMenu,
	title: "&Collapse All in Branch"
};
ContextMenu["bsp2expandall"+Menu_bfldr+Menu_bresfldr+Menu_bprotf] = {
    parentId: BSP2AdvancedMenu,
	title: "&Expand All in Branch"
};
ContextMenu["bsp2prop"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_rbkmk+Menu_rshowbkmk+Menu_rfldr] = {
	title: "Propert&ies..."
};


/*
 * Global variables, seen by other instances (var)
 */


/*
 * Global variables, private to including page (let)
 */


/*
 * Functions
 * ---------
 */

/*
 * Open bookmark Property popup with given title
 * 
 * propType = "new" or "prop", to indicate creation of a new item, or editing its properties
 * BN_id = String identifying the bookmark item to edit
 */
function openPropPopup (popupType, BN_id, path, type, title, url) {
  // Open popup on bookmark item
  let titlePreface;
  let popupUrl;
//  let popupURL = browser.extension.getURL("sidebar/popup.html");
  // Did not find a good way to get a modal dialog so far :-(
  // 1) let sign = prompt("What's your sign?");
  //    creates a modal inside the sidebar, half hidden if the sidebar is not large enough. 
  // 2) It appears window.open works outside of the .then, but not inside !!
  //    I do not understand why ..
  //    window.open(popupURL, "_blank", "dialog,modal,height=200,width=200");
  //    Anyway, "modal" is ignored, and I can't figure how to get the UniversalBrowserWrite privilege so far .. :-(
  // So using browser.windows instead, which is not modal, and which is resizeable.
  if (type == "folder") {
	let winType;
	if (popupType == "new") {
	  winType = "newfldr";
	  titlePreface = "New Folder";
	}
	else {
	  winType = "propfldr";
	  titlePreface = "Properties of « "+title+" »";
	}
	popupUrl = PopupURL+"?type="+winType+"&id="+BN_id+"&path="+encodeURIComponent(path)+"&title="+encodeURIComponent(title)+"&url=null";
  }
  else { // Bookmark
	let winType;
	if (popupType == "new") {
	  winType = "newbkmk";
	  titlePreface = "New Bookmark";
	}
	else {
	  winType = "propbkmk";
	  titlePreface = "Properties of « "+title+" »";
	}
	popupUrl = PopupURL+"?type="+winType+"&id="+BN_id+"&path="+encodeURIComponent(path)+"&title="+encodeURIComponent(title)+"&url="+encodeURIComponent(url);
  }
  popupUrl = encodeURI(popupUrl);
  let gettingItem = browser.storage.local.get(
	{popuptop_option: 300,
	 popupleft_option: 300
	}
  );
  gettingItem.then((res) => {
	// Open popup window where it was last. If it was in another screen than
	// our current screen, then center it.
	// This avoids having the popup out of screen and unreachable, in case
	// the previous screen went off, or display resolution changed.
	let top = res.popuptop_option;
	let left = res.popupleft_option;
//console.log("openPropPopup() - top="+top+" left="+left);
	let scr = window.screen;
	let adjust = false;
	// Also, protect if possible against privacy.resistFingerprinting which does not return the screen size,
	// but the sidebar size instead !! :-(
	let al = scr.availLeft;
	let aw = scr.availWidth;
	if ((PopupWidth < aw) // If wider than the reported screen width, do not adjust
		&& ((left < al) || (left >= al + aw))
	   ) {
	  adjust = true;
	  left = al + Math.floor((aw - PopupWidth) / 2);
	}
	let at = scr.availTop;
	let ah = scr.availHeight;
	if ((PopupHeight < ah) // If higher than the reported screen height, do not adjust
		&& ((top < at) || (top >= at + ah))
	   ) {
	  adjust = true;
	  top = at + Math.floor((ah - PopupHeight) / 2);
	}
	if (adjust) { // Save new position values
	  browser.storage.local.set({
		popuptop_option: top,
		popupleft_option: left
	  });
//console.log("openPropPopup() - had to adjust position top="+top+" left="+left);
	}
  
	browser.windows.create(
	  {titlePreface: titlePreface,
	   type: "popup",
//		 type: "detached_panel",
	   // Using a trick with URL parameters to tell the window which type
	   // it is, which bookmark id, .. etc .. since titlePreface doesn't appear to work
	   // and there appears to be no way to pass parameters to the popup by the call. 
	   url: popupUrl,
//----- Workaround for top and left position parameters being ignored for panels and bug on popups (since panel is an alias for popup) -----
// Cf. https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/windows/create
//     https://bugzilla.mozilla.org/show_bug.cgi?id=1271047
//Make the start size as small as possible so that it briefly flashes in its initial
//position in the least conspicuous way.
//Note: 1,1 does not work, this sets the window in a state reduced to the bar, and no
//internal resize seems to work after that.
//Also tried to start minimized, but the window pops in a big size first before being minimized,
//even less pretty.			   .
//=> .. FF does not seem very clean on all this .. :-( 
//       height: PopupHeight,
//       width: PopupWidth,
	   height: 40,
	   width: 40,
//	     left: left,
//		 top: top,
//----- End of position ignored workaround -----
	   allowScriptsToClose: true
	  }
	);
  });
}

/*
 * Open BSP2 in a new tab, referring to current tab to come back to it when closing
 * 
 * tab = referring tab
 */
function openBsp2NewTab (tab) {
  if (beforeFF57)
	browser.tabs.create({url: SelfURL});
  else
	browser.tabs.create({url: SelfURL, openerTabId: tab.id});
}

/*
 * Open BSP2 Bookmark History window
 * 
 * tab = referring tab
 */
function openBsp2History () {
  let href = HistoryURL;
  // Open in new window, like Properties popup
  // Open popup window where it was last. If it was in another screen than
  // our current screen, then center it.
  // This avoids having the popup out of screen and unreachable, in case
  // the previous screen went off, or display resolution changed.
/*
  let top = res.historytop_option;
  let left = res.historyleft_option;
  let scr = window.screen;
  let adjust = false;
  if ((left < scr.availLeft) || (left >= scr.availLeft + scr.availWidth)) {
	adjust = true;
	left = scr.availLeft + Math.floor((scr.availWidth - PopupWidth) / 2);
  }
  if ((top < scr.availTop) || (top >= scr.availTop + scr.availHeight)) {
	adjust = true;
	top = scr.availTop + Math.floor((scr.availHeight - PopupHeight) / 2);
  }
  if (adjust) { // Save new values
	browser.storage.local.set({
	  historytop_option: top,
	  historyleft_option: left
	});
  }
*/
  // Open Bookmark history window if not already open, else just focus on it
  browser.windows.getAll({populate: true, windowTypes: ["popup"]})
  .then(
	function (a_Windowinfo) {
	  let wi, openedWi;
	  let wTitle = "("+selfName+") - Bookmark History -";
	  for (wi of a_Windowinfo) {
		if (wi.title.includes(wTitle)) {
		  openedWi = wi; 
		}
	  }
	  if (openedWi != undefined) {
		browser.windows.update(openedWi.id, {focused: true});
	  }
	  else {
		browser.windows.create(
		  {titlePreface: "Bookmark History",
		   type: "popup",
		   url: href,
		   //----- Workaround for top and left position parameters being ignored for panels -----
		   //Cf. https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/windows/create
		   //Make the start size as small as possible so that it briefly flashes in its initial
		   //position in the least conspicuous way.
		   //Note: 1,1 does not work, this sets the window in a state reduced to the bar, and no
		   //internal resize seems to work after that.
		   //Also tried to start minimized, but the window pops in a big size first before being minimized,
		   //even less pretty.			   .
		   //=> .. FF does not seem very clean on all this .. :-( 
//		   height: PopupHeight,
//		   width: PopupWidth,
		   height: 800,
		   width: 800,
//		   left: left,
//		   top: top,
		   //----- End of position ignored workaround -----
		   allowScriptsToClose: true
		  }
		);
	  }
	}
  );
}

/*
 * Open BSP2 in new tab, referring to current tab
 * 
 * tab = referring tab
 */
/*
 * Create our own sidebar overriding context menu, with all possible options in one.
 * Called once by background task.
 */
function createBSP2ContextMenu () {
  let cPropTop = {
	contexts:			 ["bookmark"],
	documentUrlPatterns: [BSP2UrlPattern],
	id:					 undefined,
	title:				 undefined,
	type:				 undefined,
	viewTypes:			 ["sidebar", "tab"],
	visible: false // hide all by default
  };
  let cPropSub = {
	contexts:			 ["bookmark"],
	documentUrlPatterns: [BSP2UrlPattern],
	id:					 undefined,
	parentId:			 undefined,
	title:				 undefined,
	type:				 undefined,
	viewTypes:			 ["sidebar", "tab"],
	visible: false // hide all by default
  };
  let menuIds = Object.keys(ContextMenu);
  let menuItem;
  let cProp;
  let id;
  let len = menuIds.length;
  for (let i=0 ; i<len ; i++) {
	id = menuIds[i];
	menuItem = ContextMenu[id];
	if (menuItem.parentId) {
	  cProp = cPropSub;
	  cProp.parentId = menuItem.parentId;
	}
	else {
	  cProp = cPropTop;
	}
	cProp.id = id;
	cProp.title = menuItem.title;
	cProp.type = menuItem.type || "normal";
	browser.menus.create(cProp);
  }
}

/*
 * Update our own sidebar overriding context menu, with specified options.
 * Called on contextmenu events by the panels.
 * 
 * menu = String to filter which elements are visible
 * pasteEnabled = Boolean to enable (true) or disable (false) the paste menu items
 * goparentEnabled = Boolean to enable (true) or disable (false / undefined) the go parent menu items
 * refreshfavEnabled = Boolean to enable (true) or disable (false / undefined) the refresh favicon menu items
 */
function updateBSP2ContextMenu (menu, pasteEnabled, goparentEnabled, refreshfavEnabled) {
  let menuIds = Object.keys(ContextMenu);
  let menuItem;
  let id;
  let len = menuIds.length;
  for (let i=0 ; i<len ; i++) {
	id = menuIds[i];
	menuItem = ContextMenu[id];
	if (id.includes(menu)) {
	  browser.menus.update(
		id,
		{enabled: (!menuItem.is_paste || pasteEnabled) && (!menuItem.is_goparent || goparentEnabled)
				  && (!menuItem.is_refreshfav || refreshfavEnabled),
		 visible: true
		}
	  );
	}
	else {
	  browser.menus.update(
		id,
		{visible: false
		}
	  );
	}
  }
}

/*
 * Create additional context menu to be active everywhere except in our own sidebar
 */
function createFFContextMenu () {
  browser.menus.create({ // Main menu
	contexts: ["bookmark"],
	id: 	  MainMenuId,
	title: 	  "&Bookmark path"
  });
  browser.menus.create({ // Sub menu 1
	id:       SubMenuPathId,
	parentId: MainMenuId,
	title:    "path" // To be updated on menu shown
  });
}

/*
 * Hide path submenu
 */
function hideFFContextMenu () {
  browser.menus.update(
	MainMenuId,
	{visible: false
	}
  );
  browser.menus.refresh();
}

/*
 * Show path submenu, and update its submenu item with bookmark path string
 */
function showFFContextMenu (bnId) {
  if ((bnId == HistoryFolderV)
	  || (bnId == DownloadsFolderV)
	  || (bnId == TagsFolderV)
	  || (bnId == AllBookmarksV)
	 ) { // Not in our known list, as never returned to us by the FF API
	browser.menus.update(
	  MainMenuId,
	  {visible: true
	  }
	);
	browser.menus.update(
	  SubMenuPathId,
	  {title: ""
	  }
	);
	browser.menus.refresh();
  }
  else {
	let BN = curBNList[bnId];
	if (BN == undefined) { // Desynchro !! => reload bookmarks from FF API
	  reloadFFAPI(true);
	}
	else {
	  let path = BN_path(BN.parentId);
	  browser.menus.update(
		MainMenuId,
		{visible: true
		}
	  );
	  browser.menus.update(
		SubMenuPathId,
		{title: path
		}
	  );
	  browser.menus.refresh();
	}
  }
}

/*
 * Create additional context menu to be active on the browser action icon in the toolbar
 */
function createBAContextMenu () {
  browser.menus.create({ // Main menu, open Bookmark history window
	contexts: ["browser_action"],
	id: 	  BAShowInSidebar,
	title: 	  "Show Bookmark in Sidebar",
	enabled:  false
  });
  browser.menus.create({ // Main menu, open BSP2 in a tab
	contexts: ["browser_action"],
	id: 	  BAOpenTabId,
	title: 	  "Open BSP2 in a Tab"
  });
  browser.menus.create({ // Main menu, open Bookmark history window
	contexts: ["browser_action"],
	id: 	  BAHistory,
	title: 	  "Bookmark History.."
  });
  browser.menus.create({ // Main menu, open options page
	contexts: ["browser_action"],
	id: 	  BAOptionsId,
	title: 	  "Options.."
  });
}

/*
 * Disable show in sidebar submenu
 */
function disableBAShowBkmk () {
  browser.menus.update(
	BAShowInSidebar,
	{enabled: false
	}
  );
  browser.menus.refresh();
}

/*
 * Enable show in sidebar submenu
 */
function enableBAShowBkmk () {
  browser.menus.update(
	BAShowInSidebar,
	{enabled: true
	}
  );
  browser.menus.refresh();
}