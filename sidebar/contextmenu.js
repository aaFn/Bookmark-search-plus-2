'use strict';


/*
 * Constants
 */
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
	title: "<S&how bookmark>"
};
ContextMenu["bsp2show"+Menu_rfldr] = {
	title: "<S&how folder>"
};
ContextMenu["bsp2goparent"+Menu_rshowbkmk+Menu_rfldr] = {
	is_goparent: true,
	title: "&Go parent folder"
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
	title: "Open in ne&w tab"
};
ContextMenu["bsp2openwin"+Menu_bbkmk+Menu_bresbkmk+Menu_bprot+Menu_rbkmk+Menu_rshowbkmk] = {
	title: "Open in &new window"
};
ContextMenu["bsp2openpriv"+Menu_bbkmk+Menu_bresbkmk+Menu_bprot+Menu_rbkmk+Menu_rshowbkmk] = {
	title: "Open in priv&ate window"
};
ContextMenu["bsp2openall"+Menu_bfldr+Menu_bresfldr+Menu_bprotf+Menu_rfldr] = {
	title: "&Open all in tabs"
};
ContextMenu["bsp2sep1"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bprot+Menu_bprotf+Menu_rbkmk+Menu_rshowbkmk+Menu_rfldr] = {
	type: "separator"
};
ContextMenu["bsp2show"+Menu_rbkmk] = {
	title: "S&how bookmark"
};
ContextMenu["bsp2opentree"+Menu_bresbkmk+Menu_bresfldr] = {
	title: "Open parent fo&lder(s)"
};
ContextMenu["bsp2goparent"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bsep+Menu_bprot+Menu_rbkmk] = {
	is_goparent: true,
	title: "&Go parent folder"
};
ContextMenu["bsp2sep2"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bsep+Menu_rbkmk] = {
	type: "separator"
};
ContextMenu["bsp2newb"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bsep+Menu_bprotf] = {
	title: "New &bookmark.."
};
ContextMenu["bsp2newf"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bsep+Menu_bprotf] = {
	title: "New &folder.."
};
ContextMenu["bsp2news"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_bsep+Menu_bprotf] = {
	title: "New &separator"
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
	title: "&Paste before"
};
ContextMenu["bsp2pasteinto"+Menu_bfldr+Menu_bresfldr+Menu_bprotf] = {
	is_paste: true,
	title: "P&aste into"
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
	title: "&Refresh favicon"
};
ContextMenu["bsp2collapseall"+Menu_bfldr+Menu_bresfldr+Menu_bprotf] = {
    parentId: BSP2AdvancedMenu,
	title: "&Collapse all in branch"
};
ContextMenu["bsp2expandall"+Menu_bfldr+Menu_bresfldr+Menu_bprotf] = {
    parentId: BSP2AdvancedMenu,
	title: "&Expand all in branch"
};
ContextMenu["bsp2prop"+Menu_bbkmk+Menu_bresbkmk+Menu_bfldr+Menu_bresfldr+Menu_rbkmk+Menu_rshowbkmk+Menu_rfldr] = {
	title: "Propert&ies.."
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
	viewTypes:			 ["sidebar"],
	visible: false // hide all by default
  };
  let cPropSub = {
	contexts:			 ["bookmark"],
	documentUrlPatterns: [BSP2UrlPattern],
	id:					 undefined,
	parentId:			 undefined,
	title:				 undefined,
	type:				 undefined,
	viewTypes:			 ["sidebar"],
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
 */
function updateBSP2ContextMenu (menu, pasteEnabled, goparentEnabled) {
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
		{enabled: (!menuItem.is_paste || pasteEnabled) && (!menuItem.is_goparent || goparentEnabled),
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
	title: 	  "BSP2 Path to &bookmark item"
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
  browser.menus.create({ // Main menu, open BSP2 in a tab
	contexts: ["browser_action"],
	id: 	  BAOpenTabId,
	title: 	  "Open BSP2 in a tab"
  });
  browser.menus.create({ // Main menu, open Bookmark history window
	contexts: ["browser_action"],
	id: 	  BAShowInSidebar,
	title: 	  "Show bookmark in sidebar",
	enabled:  false
  });
  browser.menus.create({ // Main menu, open Bookmark history window
	contexts: ["browser_action"],
	id: 	  BAHistory,
	title: 	  "Bookmark history.."
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