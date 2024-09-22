'use strict';

// Retrieve some options
let remembersizes_option; // At this stage, we didn't collect all options yet
const HistoryWidth  = 800;
const HistoryHeight = 800;
let gettingItem = browser.storage.local.get(
  {historytop_option: 50,
   historyleft_option: 100,
   remembersizes_option: false,
   historyheight_option: HistoryHeight,
   historywidth_option: HistoryWidth
  }
);

// Retrieve FF version
let beforeFF57;
let beforeFF58;
let beforeFF60;
let beforeFF63;
let beforeFF109;
let ffversion;
let p_ffversion = browser.runtime.getBrowserInfo();

//Retrieve Platform, Background page and Window id
let p_platform = browser.runtime.getPlatformInfo();
let p_background = browser.runtime.getBackgroundPage();
let p_getWindowId = browser.windows.getCurrent(
//  {populate: true	
//  }
);

//----- Workaround for top and left position parameters being ignored for panels and bug on popups (szince panel is an alis for popup) -----
// Cf. https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/windows/create
//     https://bugzilla.mozilla.org/show_bug.cgi?id=1271047
//This is also used as workaround for bug 1408446 in Linux (window contents is not painted ..)
// Cf. https://bugzilla.mozilla.org/show_bug.cgi?id=1408446
// imposing to resize in order to draw contents - Apparently corrected in FF 59.x -

//gettingItem.then((res) => {
Promise.all([p_ffversion, gettingItem])
.then(
  function (a_values) { // An array of one value per Promise is returned
	p_ffversion = gettingItem = undefined; // Free memory held by these global variables

	// Retrieve values in the same order
	let info = a_values[0];
	let res = a_values[1];

	// Check FF version
	ffversion = parseFloat(info.version);
	beforeFF57 = (ffversion < 57.0);
	beforeFF58 = (ffversion < 58.0);
	beforeFF60 = (ffversion < 60.0);
	beforeFF63 = (ffversion < 63.0);
	beforeFF109 = (ffversion < 109.0);

	remembersizes_option = res.remembersizes_option;
    if (beforeFF109) { // Use the workaround for popup window placement
	  let top = res.historytop_option;
	  let left = res.historyleft_option;
	  let height;
	  let width;
	  if (remembersizes_option) {
		height = res.historyheight_option;
		width = res.historywidth_option;
//console.log("history.js entrance - remembersizes_option set - top="+top+" left="+left+" height="+height+" width="+width);
	  }
	  else {
		height = HistoryHeight;
		width = HistoryWidth;
//console.log("history.js entrance - top="+top+" left="+left);
	  }
	  browser.windows.update(browser.windows.WINDOW_ID_CURRENT,
							 {left: left,
							  top: top,
							  height: height,
							  width: width
							 }
							);
	}
  }
);
//----- End of position ignored workaround -----


/*
 * Constants
 */
const Performance = window.performance;
const Body = document.querySelector("#body"); // Assuming it is an HTMLBodyElement
const HPane = document.querySelector("#pane"); // Assuming it is an HTMLDivElement
const HNode = document.querySelector("#node"); // Assuming it is an HTMLDivElement
const HActions = document.querySelector("#actions"); // Assuming it is an HTMLDivElement
const URListInput = document.querySelector("#urlist"); // Assuming it is an HTMLInputElement
const RawListInput = document.querySelector("#rawlist"); // Assuming it is an HTMLInputElement
const Bookmarks = document.querySelector("#bookmarks"); // Assuming it is an HTMLDivElement
const NDNum = document.querySelector("#ndnum"); // Assuming it is an HTMLSpanElement
const NDTimestamp = document.querySelector("#ndtimestamp"); // Assuming it is an HTMLSpanElement
const NDAction = document.querySelector("#ndaction"); // Assuming it is an HTMLSpanElement
const NDState = document.querySelector("#ndstate"); // Assuming it is an HTMLSpanElement
const NDBNId = document.querySelector("#ndbnid"); // Assuming it is an HTMLDivElement
const NDType = document.querySelector("#ndtype"); // Assuming it is an HTMLDivElement
const NDParentId = document.querySelector("#ndparentid"); // Assuming it is an HTMLDivElement
const NDIndex = document.querySelector("#ndindex"); // Assuming it is an HTMLDivElement
const NDPath = document.querySelector("#ndpath"); // Assuming it is an HTMLDivElement
const NDTitle = document.querySelector("#ndtitle"); // Assuming it is an HTMLDivElement
const NDFavicon = document.querySelector("#ndfavicon"); // Assuming it is an HTMLDivElement
const NDUrl = document.querySelector("#ndurl"); // Assuming it is an HTMLDivElement
const NDInTrash = document.querySelector("#ndintrash"); // Assuming it is an HTMLDivElement
const NDChildIds = document.querySelector("#ndchildids"); // Assuming it is an HTMLDivElement
const NDToParentId = document.querySelector("#ndtoparentid"); // Assuming it is an HTMLDivElement
const NDToIndex = document.querySelector("#ndtoindex"); // Assuming it is an HTMLDivElement
const NDToPath = document.querySelector("#ndtopath"); // Assuming it is an HTMLDivElement
const NDToTitle = document.querySelector("#ndtotitle"); // Assuming it is an HTMLDivElement
const NDToUrl = document.querySelector("#ndtourl"); // Assuming it is an HTMLDivElement
const NDToChildIds = document.querySelector("#ndtochildids"); // Assuming it is an HTMLDivElement
const AUndoButton = document.querySelector("#aundo"); // Assuming it is an HTMLButtonElement
const ARedoButton = document.querySelector("#aredo"); // Assuming it is an HTMLButtonElement
const AUndoToSelButton = document.querySelector("#aundotosel"); // Assuming it is an HTMLButtonElement
const AReplayButton = document.querySelector("#areplay"); // Assuming it is an HTMLButtonElement
const ALogTextArea = document.querySelector("#alog"); // Assuming it is an HTMLTextAreaElement
const MapAction = {};

const Selhighlight = "selbrow"; // selhighlight class name in CSS
const HighlightTextColor = "#222426"; // Text color used when hovering or focusing a cell (or dragging over a folder)
const NBSP = "\xa0";



/*
 * Initialize MapAction
 */
MapAction[HNACTION_BSP2START]          = {nclass: "started", type: "meta", title: "BSP2 start"};
MapAction[HNACTION_CLEARHISTORY]       = {nclass: "cleared", type: "meta", title: "History clear"};
MapAction[HNACTION_RELOADFFAPI]        = {nclass: "reloaded", type: "meta", title: "BSP2 reload"};
MapAction[HNACTION_AUTORELOADFFAPI]    = {nclass: "reloadeda", type: "meta", title: "BSP2 auto reload"};
MapAction[HNACTION_BKMKCREATE]         = {nclass: "created", uclass: "created_u", rclass: "created_r", title: "create"};
MapAction[HNACTION_BKMKCREATEFROMTRASH]        = {nclass: "created", uclass: "created_u", rclass: "created_r", title: "create from trash"};
MapAction[HNACTION_BKMKCREATEFROMTRASH_DESYNC] = {nclass: "created", uclass: "created_u", rclass: "created_r", title: "create from trash (desync detected)"};
MapAction[HNACTION_BKMKCHANGE]         = {nclass: "changed", uclass: "changed_u", rclass: "changed_r", title: "change"};
MapAction[HNACTION_BKMKCHANGE_DESYNC]  = {nclass: "changedd", title: "change (desync detected)"};
MapAction[HNACTION_BKMKMOVE]           = {nclass: "moved", uclass: "moved_u", rclass: "moved_r", title: "move"};
MapAction[HNACTION_BKMKMOVE_DESYNC]    = {nclass: "movedd", title: "move (desync detected)"};
MapAction[HNACTION_BKMKREORDER]        = {nclass: "reordered", uclass: "reordered_u", rclass: "reorderted_r", title: "reorder"};
MapAction[HNACTION_BKMKREORDER_DESYNC] = {nclass: "reorderedd", title: "reorder (desync detected)"};
MapAction[HNACTION_BKMKREMOVE]         = {nclass: "removed", uclass: "removed_u", rclass: "removed_r", title: "remove"};
MapAction[HNACTION_BKMKREMOVE_DESYNC]  = {nclass: "removedd", title: "remove (desync detected)"};
MapAction[HNACTION_BKMKREMOVETOTRASH]          = {nclass: "removed", uclass: "removed_u", rclass: "removed_r", title: "remove to trash"};
MapAction[HNACTION_BKMKREMOVETOTRASH_DESYNC]   = {nclass: "removedd", title: "remove to trash (desync detected)"};

/*
 *******  Prepare standard Meta structure for node cloning
 */
const MetaTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
MetaTempl.classList.add("meta");
MetaTempl.draggable = false; // False by default for <div>
let tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false;
MetaTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
										  // Not using <img> since with FF65 and later, they
										  // show default box-shadow: inset when the src=
										  // attribute is not specified.
tmpElem1.classList.add("nocursor");
tmpElem1.draggable = false;
MetaTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("histicon");
tmpElem1.draggable = false;
MetaTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
MetaTempl.appendChild(tmpElem1);
/*
 *******  Prepare standard Folder structure for node cloning
 */
const FolderTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
FolderTempl.classList.add("bkmkitem_f");
FolderTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false; // True by default for <img>
FolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("nocursor");
tmpElem1.draggable = false; // True by default for <img>
FolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("histicon");
tmpElem1.draggable = false; // True by default for <img>
FolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("ffavicon");
tmpElem1.draggable = false; // True by default for <img>
FolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
FolderTempl.appendChild(tmpElem1);
/*
 *******  Prepare special Folder structure for node cloning
 */
const SFolderTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
SFolderTempl.classList.add("bkmkitem_f");
SFolderTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false;
SFolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("nocursor");
tmpElem1.draggable = false;
SFolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("histicon");
tmpElem1.draggable = false;
SFolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("img"); // Assuming it is an HTMLImageElement
tmpElem1.classList.add("favicon");
tmpElem1.draggable = false;
SFolderTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
SFolderTempl.appendChild(tmpElem1);
/*
 *******  Prepare Separator structure for node cloning
 */
const SeparatorTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
SeparatorTempl.classList.add("bkmkitem_s");
SeparatorTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false;
SeparatorTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("nocursor");
tmpElem1.draggable = false;
SeparatorTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("histicon");
tmpElem1.draggable = false;
SeparatorTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("favseparator");
tmpElem1.draggable = false;
SeparatorTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("favseparatorend");
tmpElem1.draggable = false; // False by default for <div>
SeparatorTempl.appendChild(tmpElem1);
/*
 *******  Prepare Bookmark structure for node cloning
 */
const BookmarkTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
BookmarkTempl.classList.add("bkmkitem_b");
BookmarkTempl.draggable = false; // False by default for <div> 
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false;
BookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("nocursor");
tmpElem1.draggable = false;
BookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("histicon");
tmpElem1.draggable = false;
BookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("img"); // Assuming it is an HTMLImageElement
tmpElem1.classList.add("favicon");
// Cannot prepare image as it is taking much time ..
// So set "flex: none;" in CSS .favicon to reserve space in advance
tmpElem1.draggable = false; // True by defaul for <img>
BookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
BookmarkTempl.appendChild(tmpElem1);
/*
 *******  Prepare nofavicon Bookmark structure for node cloning
 */
const NFBookmarkTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
NFBookmarkTempl.classList.add("bkmkitem_b");
NFBookmarkTempl.draggable = false; // False by default for <div> 
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false;
NFBookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("nocursor");
tmpElem1.draggable = false;
NFBookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("histicon");
tmpElem1.draggable = false;
NFBookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLImageElement
										  // Not using <img> since with FF65 and later, they
										  // show default box-shadow: inset when the src=
										  // attribute is not specified.
tmpElem1.classList.add("nofavicon");
tmpElem1.draggable = false; // True by defaul for <img>
NFBookmarkTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
NFBookmarkTempl.appendChild(tmpElem1);
/*
 *******  Prepare Multiple selection structure for node cloning
 */
const MultiSelTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
MultiSelTempl.classList.add("bkmkitem_mlst");
MultiSelTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false;
MultiSelTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("nocursor");
tmpElem1.draggable = false;
MultiSelTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("histicon");
tmpElem1.draggable = false;
MultiSelTempl.appendChild(tmpElem1);
let tmpElem2 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem2.classList.add("mfavicon");
tmpElem2.draggable = false;
MultiSelTempl.appendChild(tmpElem2);
let tmpElem3 = document.createElement("div"); // Assuming it is an HTMLDivElement
//tmpElem3.classList.add("twistieao");
tmpElem3.draggable = false; // False by default for <div>
MultiSelTempl.appendChild(tmpElem3);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem2.title = tmpElem3.title = tmpElem1.title = tmpElem1.textContent = "Multiple selection";
tmpElem1.classList.add("favtextm");
tmpElem1.draggable = false; // False by default for <span>
MultiSelTempl.appendChild(tmpElem1);
/*
 *******  Prepare standard Folder Item in Multiple selection structure for node cloning
 */
const ItemFMultiSelTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
ItemFMultiSelTempl.classList.add("bkmkitem_mf");
ItemFMultiSelTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false;
ItemFMultiSelTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("vbar");
tmpElem1.draggable = false;
ItemFMultiSelTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("ffavicon");
tmpElem1.draggable = false;
ItemFMultiSelTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtextm");
tmpElem1.draggable = false; // False by default for <span>
ItemFMultiSelTempl.appendChild(tmpElem1);
/*
 *******  Prepare separator Item in Multiple selection structure for node cloning
 */
const ItemSMultiSelTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
ItemSMultiSelTempl.classList.add("bkmkitem_ms");
ItemSMultiSelTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false;
ItemSMultiSelTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("vbar");
tmpElem1.draggable = false;
ItemSMultiSelTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("favseparator");
tmpElem1.draggable = false;
ItemSMultiSelTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("favseparatorend");
tmpElem1.draggable = false; // False by default for <div>
ItemSMultiSelTempl.appendChild(tmpElem1);
/*
 *******  Prepare bookmark Item in Multiple selection structure for node cloning
 */
const ItemBMultiSelTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
ItemBMultiSelTempl.classList.add("bkmkitem_mb");
ItemBMultiSelTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false;
ItemBMultiSelTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("vbar");
tmpElem1.draggable = false;
ItemBMultiSelTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("img"); // Assuming it is an HTMLImageElement
tmpElem1.classList.add("favicon");
tmpElem1.draggable = false; // True by defaul for <img>
ItemBMultiSelTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
ItemBMultiSelTempl.appendChild(tmpElem1);
/*
 *******  Prepare nofavicon bookmark Item in Multiple selection structure for node cloning
 */
const ItemNFBMultiSelTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
ItemNFBMultiSelTempl.classList.add("bkmkitem_mb");
ItemNFBMultiSelTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false;
ItemNFBMultiSelTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("vbar");
tmpElem1.draggable = false;
ItemNFBMultiSelTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div");
tmpElem1.classList.add("nofavicon");
tmpElem1.draggable = false; // True by defaul for <img>
ItemNFBMultiSelTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtext");
tmpElem1.draggable = false; // False by default for <span>
ItemNFBMultiSelTempl.appendChild(tmpElem1);
/*
 *******  Prepare Undo/Redo list structure for node cloning
 */
const URListTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
URListTempl.classList.add("bkmkitem_urlst");
URListTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false;
URListTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("vbarend");
tmpElem1.draggable = false;
URListTempl.appendChild(tmpElem1);
tmpElem2 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem2.classList.add("urfavicon");
tmpElem2.draggable = false;
URListTempl.appendChild(tmpElem2);
tmpElem3 = document.createElement("div"); // Assuming it is an HTMLDivElement
//tmpElem3.classList.add("twistieao");
tmpElem3.draggable = false; // False by default for <div>
URListTempl.appendChild(tmpElem3);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem2.title = tmpElem3.title = tmpElem1.title = tmpElem1.textContent = "Undo/redo list";
tmpElem1.classList.add("favtextm");
tmpElem1.draggable = false; // False by default for <span>
URListTempl.appendChild(tmpElem1);
/*
 *******  Prepare Undo item structure for node cloning
 */
const UItemTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
UItemTempl.classList.add("bkmkitem_u");
UItemTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false;
UItemTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("uritemicon", "undo");
tmpElem1.draggable = false;
UItemTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtextm");
tmpElem1.draggable = false; // False by default for <span>
UItemTempl.appendChild(tmpElem1);
/*
 *******  Prepare Redo item structure for node cloning
 */
const RItemTempl = document.createElement("div"); // Assuming it is an HTMLDivElement
RItemTempl.classList.add("bkmkitem_r");
RItemTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false;
RItemTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("uritemicon", "redo");
tmpElem1.draggable = false;
RItemTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("span"); // Assuming it is an HTMLSpanElement
tmpElem1.classList.add("favtextm");
tmpElem1.draggable = false; // False by default for <span>
RItemTempl.appendChild(tmpElem1);

tmpElem1 = undefined;


/*
 *  Global variables
 */
let backgroundPage;
let platformOs;
let isMacOS = false; // To indicate we are under MacOS, used for properly detecting the Cmd key
					 // which is Ctrl in Windows/Linux (Apple always want to do it their way, don't they ?)
let myWindowId;
let curBNList; // Current list of BookmarkNode - Saved in storage at each modification
let curHNList; // Current history of HistoryNode - Saved in storage at each modification
let curRowList = {}; // Current map between id and row for each bookmark item
let bookmarksTable; // Assuming it is an HTMLTableElement
let cellHighlight = null; // Current highlight of a row in source bookmarks = cell
let sidebarTextColor = undefined; // Contains text color if we apply a theme's colors
let canUndo = false; // To enable or disable the undo button on the expanded menu
let canRedo = false; // To enable or disable the redo button on the expanded menu


/*
 * Functions
 * ---------
 */

/*
 * Handle search options
 */
function setSearchOptions () {
/*
  let cn;
  if (options.searchMatch == "regexp") {
	cn = "sr" + options.searchField;
	SMatchRegexpInput.checked = true;
  }
  else {
	cn = "sw" + options.searchField;
	SMatchWordsInput.checked = true;
  }
  SearchButtonInput.className = cn;
  if (options.searchScope == "all") {
	MGlassImgStyle.backgroundImage = 'url("/icons/search.png"';
	SScopeAllInput.checked = true;
  }
  else {
	MGlassImgStyle.backgroundImage = 'url("/icons/searchsub.png"';
	SScopeSubfolderInput.checked = true;
  }

  if (options.searchField == "both") {
	SFieldTitleUrlInput.checked = true;
  }
  else if (options.searchField == "title") {
	SFieldTitleOnlyInput.checked = true;
  }
  else {
	SFieldUrlOnlyInput.checked = true;
  }

  // Clear any ongoing search
  clearSearchTextHandler();
*/
}

/*
 * Handle click on URList radio button
 *
 */
function handleURListClick () {
  if (!options.historyDispURList) { // Option is changed
	options.historyDispURList = true;
	browser.storage.local.set({
	  historydispurlist_option: true
	})
	.then(
	  function () {
		// Signal change to options to all
		sendAddonMessage("savedOptions");
	  }
	);

	// Empty table and re-display the history pane content
	let newTable = document.createElement("table");
	Bookmarks.replaceChild(newTable, bookmarksTable);
	bookmarksTable = newTable;
	displayHNList(curHNList.hnList);

	// Go to and show the current active position (cursor)
	goHNItem(curHNList.activeIndex);
	lastActiveIndex = null; // Force redisplay of cursor
	setUndoRedoCursor();
  }
}

/*
 * Handle click on RawList radio button
 *
 */
function handleRawListClick () {
  if (options.historyDispURList) { // Option is changed
	options.historyDispURList = false;
	browser.storage.local.set({
	  historydispurlist_option: false
	})
	.then(
	  function () {
		// Signal change to options to all
		sendAddonMessage("savedOptions");
	  }
	);

	// Empty table and re-display the history pane content
	let newTable = document.createElement("table");
	Bookmarks.replaceChild(newTable, bookmarksTable);
	bookmarksTable = newTable;
	displayHNList(curHNList.hnList);

	// Go to and show the current active position (cursor)
	goHNItem(curHNList.activeIndex);
	lastActiveIndex = null; // Force redisplay of cursor
	setUndoRedoCursor();
  }
}

/*
 * Append a bookmark HistoryNode inside the "pane" table
 *
 * hnId = Integer, index of the record in the HN list
 * HN = HistoryNode
 * is_visible = Boolean, indicate if the row to insert is visible or hidden.
 * pos_insideMulti = integer, position of HN inside a multi record, else undefined if a normal node
 * forcedState = HNSTATE_ACTIVEBRANCH or HNSTATE_INACTIVEBRANCH to force a value, else undefined 
 * insertPos = integer, if -1, append a tend, else insert at given position
 *
 * Returns: the inserted row (an HTMLTableRowElement).
 */
let isDisplayComplete = false;
function appendBookmarkHN (hnId, HN, is_visible = true, pos_insideMulti = undefined, forcedState = undefined, insertPos = -1) {
  // Append new row inside the bookmarks table
  let index;
  if (pos_insideMulti == undefined) { // normal row
	index = hnId;
  }
  else { // Row for a node inside a multi node
	index = hnId + "+" + pos_insideMulti; // String
  }
  let row = curRowList[index] = bookmarksTable.insertRow(insertPos);
  row.dataset.id = index; // Keep unique id of HN in the data-id attribute
  row.hidden = !is_visible;

  // Add bookmark HN in row
  let cell = row.insertCell();
  cell.classList.add("brow");
  cell.tabIndex = 0;
//  cell.draggable = false; // False by default for <td>

  // Append proper contents to the cell:
  let action = HN.action;
  let map = MapAction[action];
  let type = map.type;
  let t = new Date (HN.timestamp);
  let tStr = t.toLocaleString();
  if (type != undefined) {				// Meta node, only value is "meta" for now
	row.dataset.type = type;
	let div = MetaTempl.cloneNode(true);
	let seqnum = div.firstElementChild;
	seqnum.textContent = hnId;
	let cursor = seqnum.nextElementSibling;
	let histicon = cursor.nextElementSibling;
	histicon.classList.add(map.nclass);
	let span = histicon.nextElementSibling;
	let text = span.title = span.textContent = map.title;
	seqnum.title = cursor.title = histicon.title = text + "\n" + tStr;
	cell.appendChild(div);
  }
  else {
	let div, seqnum, img;
	let revOp = HN.revOp; // If undefined, normal operation, else undo or redo
	if ((revOp != undefined) && (revOp != HNREVOP_NONE) && options.historyDispURList) { // Special display as URList item
	  type = "uritem";
	  let textOp;
	  if (revOp == HNREVOP_ISUNDO) {
		div = UItemTempl.cloneNode(true);
		textOp = "undo ";
	  }
	  else { // Must be HNREVOP_ISREDO
		div = RItemTempl.cloneNode(true);
		textOp = "redo ";
	  }
	  seqnum = div.firstElementChild;
	  img = seqnum.nextElementSibling;
	  let span = img.nextElementSibling;
	  let op = map.title;
	  seqnum.textContent = hnId;
	  seqnum.title = img.title = textOp + op + "\n" + tStr;
	  span.title = span.textContent = textOp + op;
	  if (!HN.is_complete) { // Color text in red, as incomplete
		span.classList.add("incompleteop");
	  }
	}
	else {
	  type = HN.type;
	  let cursor, histicon, span;
	  if (HN.is_multi == true) {				// Multiple bookmarks record
		type = "multiple";
		div = MultiSelTempl.cloneNode(true);
		seqnum = div.firstElementChild;
		cursor = seqnum.nextElementSibling;
		histicon = cursor.nextElementSibling;
		img = histicon.nextElementSibling;
		let twistie = img.nextElementSibling;
		twistie.classList.add((HN.is_open == true) ? "twistieao" : "twistieac");
		span = twistie.nextElementSibling;
		if (!HN.is_complete) { // Color text in red, as incomplete
		  span.classList.add("incompleteop");
		}
	  }
	  else if (type == "folder") {				// Folder
		let uri = HN.faviconUri;
		if (pos_insideMulti != undefined) { // Item is part of a multi-selection operation
		  row.draggable = true; // Note: it is false by default for <tr>
		  div = ItemFMultiSelTempl.cloneNode(true);
		  seqnum = div.firstElementChild;
		  let vbar = seqnum.nextElementSibling;
		  img = vbar.nextElementSibling;
		}
		else if ((uri != undefined) && (uri != "/icons/folder.png")) { // Special folder
		  div = SFolderTempl.cloneNode(true);
		  seqnum = div.firstElementChild;
		  cursor = seqnum.nextElementSibling;
		  histicon = cursor.nextElementSibling;
		  img = histicon.nextElementSibling;
		  img.src = uri;
		}
		else {
		  row.draggable = true; // Note: it is false by default for <tr>
		  div = FolderTempl.cloneNode(true);
		  seqnum = div.firstElementChild;
		  cursor = seqnum.nextElementSibling;
		  histicon = cursor.nextElementSibling;
		  img = histicon.nextElementSibling;
		}
		span = img.nextElementSibling;
		if (HN.inBSP2Trash) { // Set to italics
		  span.style.fontStyle = "italic";
		}
		let toTitle = HN.toTitle;
		if (toTitle == undefined) {
		  toTitle = HN.title;
		}
		img.title = span.title = span.textContent = toTitle;
	  }
	  else if (type == "separator") {				// Separator
		row.draggable = true; // Note: it is false by default for <tr>
		if (pos_insideMulti != undefined) { // Item is part of a multi-selection operation
		  row.draggable = true; // Note: it is false by default for <tr>
		  div = ItemSMultiSelTempl.cloneNode(true);
		  seqnum = div.firstElementChild;
		  let vbar = seqnum.nextElementSibling;
		  img = vbar.nextElementSibling;
		}
		else {
		  div = SeparatorTempl.cloneNode(true);
		  seqnum = div.firstElementChild;
		  seqnum.textContent = (pos_insideMulti == undefined ? hnId : pos_insideMulti);
		  cursor = seqnum.nextElementSibling;
		  histicon = cursor.nextElementSibling;
		}
	  }
	  else {										// Presumably a Bookmark
		row.draggable = true; // Note: it is false by default for <tr>
		let uri;
		if (((uri = HN.faviconUri) == undefined) || (uri == "/icons/nofavicon.png")
			|| (uri == "/icons/waiting.gif") || (uri == "/icons/nofavicontmp.png")
		   ) { // Clone with nofavicon image background
		  if (pos_insideMulti != undefined) { // Item is part of a multi-selection operation
			div = ItemNFBMultiSelTempl.cloneNode(true);
			seqnum = div.firstElementChild;
			let vbar = seqnum.nextElementSibling;
			img = vbar.nextElementSibling;
		  }
		  else {
			div = NFBookmarkTempl.cloneNode(true);
			seqnum = div.firstElementChild;
			cursor = seqnum.nextElementSibling;
			histicon = cursor.nextElementSibling;
			img = histicon.nextElementSibling;
		  }
		}
		else { // Clone normal one
		  if (pos_insideMulti != undefined) { // Item is part of a multi-selection operation
			div = ItemBMultiSelTempl.cloneNode(true);
			seqnum = div.firstElementChild;
			let vbar = seqnum.nextElementSibling;
			img = vbar.nextElementSibling;
		  }
		  else {
			div = BookmarkTempl.cloneNode(true);
			seqnum = div.firstElementChild;
			cursor = seqnum.nextElementSibling;
			histicon = cursor.nextElementSibling;
			img = histicon.nextElementSibling;
		  }
		  if (isDisplayComplete) { // When we are on initial display, we will fill the image later
			img.src = uri;
		  }
		}
		span = img.nextElementSibling;
		if (HN.inBSP2Trash) { // Set to italics
		  span.style.fontStyle = "italic";
		}
		let toUrl = HN.toUrl;
		if (toUrl == undefined) {
		  toUrl = HN.url;
		}
		let toTitle = HN.toTitle;
		if (toTitle == undefined) {
		  toTitle = HN.title;
		}
		if (toTitle == "") {
		  img.title = span.title = toUrl;
		  span.textContent = suggestDisplayTitle(toUrl);
		}
		else {
		  img.title = span.title = toTitle+"\n"+toUrl;
		  span.textContent = toTitle;
		}
	  }
	  seqnum.textContent = (pos_insideMulti == undefined ? hnId : pos_insideMulti);
	  let textOp;
	  if ((revOp == undefined) || (revOp == HNREVOP_NONE)) {
		if (histicon != undefined) {
		  histicon.classList.add(map.nclass);
		}
	    textOp = "";
	  }
	  else if (revOp == HNREVOP_ISUNDO) {
		if (histicon != undefined) {
		  histicon.classList.add(map.uclass);
		}
		if ((span != undefined) && !HN.is_complete) {
		  span.classList.add("incompleteop");
		}
	    textOp = "undo ";
	  }
	  else if (revOp == HNREVOP_ISREDO) {
		if (histicon != undefined) {
		  histicon.classList.add(map.rclass);
		}
		if ((span != undefined) && !HN.is_complete) {
		  span.classList.add("incompleteop");
		}
	    textOp = "redo ";
	  }
	  let t = seqnum.title = textOp + map.title + "\n" + tStr;
	  if (cursor != undefined) {
		cursor.title = t;
	  }
	  if (histicon != undefined) {
		histicon.title = t;
	  }
	}
	row.dataset.type = type;
	if ((forcedState == HNSTATE_INACTIVEBRANCH) || (HN.state == HNSTATE_INACTIVEBRANCH)) {
	  div.classList.add("inactive");
	}
	cell.appendChild(div);
  }

  return(row);
}

/*
 * Refresh an existing bookmark HistoryNode inside the main "pane" table.
 * Only its state (-> become inactive), is_complete (-> become complete), reversion and revOp_HNref can change
 *
 * hnId = Integer, index of the record in the history list
 * HN = HistoryNode
 * pos_insideMulti = integer, position of HN inside a multi record, else undefined if a normal node
 * forcedState = HNSTATE_ACTIVEBRANCH or HNSTATE_INACTIVEBRANCH to force a value, else undefined 
 *
 * Returns: true if the modified row (an HTMLTableRowElement) had its state changed to inactive.
 */
function refreshBookmarkHN (hnId, HN, pos_insideMulti = undefined, forcedState = undefined) {
  let inactiveState = false;
  // Retrieve row inside the bookmarks table
  let index;
  if (pos_insideMulti == undefined) { // normal row
	index = hnId;
  }
  else { // Row for a node inside a multi node
	index = hnId + "+" + pos_insideMulti; // String
  }
  let row = curRowList[index];
  if (row != undefined) { // Can be undefined in URList mode display, and the row is a reversion of a past purged history node 
	let cell = row.firstElementChild;
	let div = cell.firstElementChild;

	// Refresh content in the cell:
	if (((forcedState == HNSTATE_INACTIVEBRANCH) || (HN.state == HNSTATE_INACTIVEBRANCH))
		&& !div.classList.contains("inactive")
	   ) {
	  div.classList.add("inactive");
	  inactiveState = true;
	}
	if (HN.is_complete == true) {
	  let span = div.lastElementChild;
	  if (span.classList.contains("incompleteop")) {
		span.classList.remove("incompleteop");
	  }
	}	

	// If row is the highlighted one, also update the detailed Node display panel
	if (cellHighlight == cell) {
	  displayHN(row.dataset.type, index);
	}
  }
  return(inactiveState);
}

/*
 * Append an undo / redo list inside the "pane" table
 *
 * hnid = Integer, id of parent HistoryNode 
 * is_open = Boolean, if true set twistie as open, else set as closed
 * insertPos = integer, if -1, append a tend, else insert at given position
 *
 * Returns: the inserted row (an HTMLTableRowElement).
 */
function appendURList (hnid, is_open, insertPos = -1) {
  // Append new row inside the bookmarks table
  let row = bookmarksTable.insertRow(insertPos);
  row.dataset.id = hnid; // Keep unique id of HN in the data-id attribute, to retrieve it later in twistie clicks
  row.draggable = false; // True by default for <tr>

  // Add UR List template in row
  let cell = row.insertCell();
  cell.classList.add("brow");
  cell.tabIndex = 0;
//  cell.draggable = false; // False by default for <td>

  // Append UR List contents to the cell:
  row.dataset.type = "urlist";
  let div = URListTempl.cloneNode(true);
  let twistie = div.firstElementChild.nextElementSibling.nextElementSibling.nextElementSibling;
  twistie.classList.add((is_open == true) ? "twistieao" : "twistieac");
  cell.appendChild(div);

  return(row);
}

/*
 * Handle clicks on multiple record twistie - Change twistie and visibility of children
 *
 * row is a HTMLRowElement
 * twistie is an HTLMDivElement
 */
function handleMultipleTwistieClick (row, twistie) {
  // Retrieve the HistoryNode
  let hnid = row.dataset.id;
  let HN = curHNList.hnList[hnid];

  if (twistie.classList.contains("twistieao")) { // Hide all multiple record children
	// Close twistie
	HN.is_open = false;
	twistie.classList.replace("twistieao", "twistieac");

    // Hide all bkmkitem_m? rows
	let bkmkitem;
	while ((row = row.nextElementSibling) != null) {
	  bkmkitem = row.firstElementChild.firstElementChild;
	  if (!bkmkitem.className.startsWith("bkmkitem_m"))
		break; // Stop when we encounter something else thatn a multiple item
	  row.hidden = true;
	}
  }
  else { // Show all multiple record children
	// Open twistie
	HN.is_open = true;
	twistie.classList.replace("twistieac", "twistieao");

	// Unhide all bkmkitem_m? rows
	let bkmkitem;
	while ((row = row.nextElementSibling) != null) {
	  bkmkitem = row.firstElementChild.firstElementChild;
	  if (!bkmkitem.className.startsWith("bkmkitem_m"))
		break; // Stop when we encounter something else thatn a multiple item
	  row.hidden = false;
	}
  }

  // Save new current history info
  saveBNList();
}

/*
 * Handle clicks on URList twistie - Change twistie and visibility of children
 *
 * row is a HTMLRowElement
 * twistie is an HTLMDivElement
 */
function handleURListTwistieClick (row, twistie) {
  // Retrieve the HistoryNode
  let hnid = row.dataset.id;
  let HN = curHNList.hnList[hnid];

  if (twistie.classList.contains("twistieao")) { // Hide all uritem children
	// Close twistie
	HN.is_urlistOpen = false;
	twistie.classList.replace("twistieao", "twistieac");

    // Hide all uritem rows
	let type;
	while ((row = row.nextElementSibling) != null) {
	  type = row.dataset.type;
	  if (type != "uritem")
		break; // Stop when we encounter something else thatn a multiple item
	  row.hidden = true;
	}
  }
  else { // Show all uritem children
	// Open twistie
	HN.is_urlistOpen = true;
	twistie.classList.replace("twistieac", "twistieao");

	// Unhide all uritem rows
	let type;
	while ((row = row.nextElementSibling) != null) {
	  type = row.dataset.type;
	  if (type != "uritem")
		break; // Stop when we encounter something else thatn a multiple item
	  row.hidden = false;
	}
  }

  // Save new current history info
  saveBNList();
}

/*
 * Set undo/redo cursor
 */
let lastActiveIndex = null;
function setUndoRedoCursor () {
  let activeIndex = curHNList.activeIndex;
  // Proceed only if there is a change in activeIndex position 
  if ((activeIndex != lastActiveIndex) || (lastActiveIndex === null)) {
	// Clear last one if there was one
	let row;
	let cursorClass;
	let cursor;
	if (lastActiveIndex !== null) {
	  if (lastActiveIndex != undefined) {
		row = curRowList[lastActiveIndex];
		cursorClass = "urcursor";
	  }
	  else {
		row = curRowList[0];
		cursorClass = "urcursortop";
	  }
	  let seqnum = row.firstElementChild.firstElementChild.firstElementChild;
	  cursor = seqnum.nextElementSibling;
	  cursor.classList.replace(cursorClass, "nocursor");
	  cursor.title = seqnum.title;
	}

	// Set new one, if present
	if (activeIndex != undefined) {
	  row = curRowList[activeIndex];
	  cursorClass = "urcursor";
	}
	else {
	  row = curRowList[0];
	  cursorClass = "urcursortop";
	}
	cursor = row.firstElementChild.firstElementChild.firstElementChild.nextElementSibling;
	cursor.classList.replace("nocursor", cursorClass);
	cursor.title = "undo/redo cursor";

	// Remember the new value for next update
	lastActiveIndex = activeIndex;
  }
}

/*
 * Remove highlight from a cell, if there is one
 */
function clearCellHighlight () {
  if (cellHighlight != null) {
	cellHighlight.classList.replace(Selhighlight, "brow");
	cellHighlight = null;
  }
}

/*
 * Set cell highlight
 * 
 * cell = .brow cell to set.
 */
function setCellHighlight (cell) {
  if (cell != cellHighlight) {
	clearCellHighlight();
	cellHighlight = cell;
	cellHighlight.classList.replace("brow", Selhighlight);
  }
}

/*
 * Display a value if defined, else NBSP
 * 
 * node: a Node on which to set textContent
 * text: whatever ... but will finish as a String
 */
function displayField (node, text) {
  if ((text == undefined) || (text.length == 0)) {
	node.textContent = NBSP;
  }
  else {
	node.textContent = text;
  }
}

/*
 * Display a path value if defined, else NBSP
 * 
 * node: a Node on which to set textContent
 * a_path: Array of Strings, from top to deepest
 */
function displayPath (node, a_path) {
  let len;
  if ((a_path == undefined) || ((len = a_path.length) == 0)) {
	node.textContent = NBSP;
  }
  else {
	let text;
	if (options.reversePath) {
	  text = a_path[len-1];
	  for (let i=len-2 ; i>=0 ; i--) {
		text += " < " + a_path[i]; // Separator on the path ...
	  }
	}
	else {
	  text = a_path[0];
	  for (let i=1 ; i<len ; i++) {
		text += " > " + a_path[i]; // Separator on the path ...
	  }
	}
	node.textContent = text;
  }
}

/*
 * Display a specific History Node in the "node" panel
 * 
 * rowType = String, type of row to display = "meta", "bookmark", "separator", "folder", "multiple", "urlist"
 *           or "uritem"
 * hnId = integer, index in the history list, or String of the form "index+pos_insideMulti" or undefined
 */
function displayHN (rowType, hnId) {
  if (rowType == "urlist") {
	NDNum.textContent = NBSP;
	NDTimestamp.textContent = NBSP;
	NDAction.classList.remove("incompleteop");
	NDAction.textContent = "Undo / redo list";
	NDState.textContent = NBSP;
	NDBNId.textContent = NBSP;
	NDType.textContent = NBSP;
	NDIndex.textContent = NBSP;
	NDParentId.textContent = NBSP;
	NDPath.textContent = NBSP;
	NDTitle.textContent = NBSP;
	NDFavicon.style = "";
	NDFavicon.className = "urfavicon";
	NDUrl.textContent = NBSP;
	NDInTrash.textContent = NBSP;
	NDChildIds.textContent = NBSP;
	NDToParentId.textContent = NBSP;
	NDToIndex.textContent = NBSP;
	NDToPath.textContent = NBSP;
	NDToTitle.textContent = NBSP;
	NDToUrl.textContent = NBSP;
	NDToChildIds.textContent = NBSP;
  }
  else {
	NDNum.textContent = hnId;

	// Handle case of HN inside a multi parent node
	let HN, parentHN;
	let hnIdType = Object.prototype.toString.call(hnId).slice(8, -1);
	let pos;
	let pos_insideMulti;
	if ((hnIdType == "String") && ((pos = hnId.indexOf("+")) >= 0)) {
	  pos_insideMulti = parseInt(hnId.substring(pos+1), 10);
	  hnId = parseInt(hnId.substring(0, pos), 10);
	  parentHN = curHNList.hnList[hnId];
	  HN = parentHN.hn_list[pos_insideMulti];
	}
	else { 
	  HN = curHNList.hnList[hnId];
	}

	let t = new Date (HN.timestamp);
	NDTimestamp.textContent = t.toLocaleString();
	let actionTextStart, actionTextEnd;
	let is_multi = HN.is_multi;
	if (is_multi == true) {
	  actionTextStart = "multi bookmarks ";
	  actionTextEnd = "";
	}
	else {
	  actionTextStart = actionTextEnd = "";
	  if (HN.is_insideMulti != undefined) {
		actionTextEnd = " (in a multi bookmarks action)";
	  }
	}
	let revOp = HN.revOp;
	if ((is_multi == true) || (revOp != undefined)) {
	  if (HN.is_complete) {
		actionTextEnd += " (complete) "; 
		NDAction.classList.remove("incompleteop");
	  }
	  else {
		actionTextEnd += " (incomplete) ";
		NDAction.classList.add("incompleteop");
	  }
	}
	else {
	  NDAction.classList.remove("incompleteop");
	}

	let action = HN.action;
	let map = MapAction[action];
	if (revOp == undefined) {
	  let reversion = HN.reversion;
	  NDAction.textContent = actionTextStart+map.title+actionTextEnd;
	  if (reversion == HNREVERSION_UNDONE) {
		let n = parseInt(hnId, 10) + HN.revOp_HNref;
		NDAction.textContent += " (undone by record #"+n+")";
	  }
	  else if (reversion == HNREVERSION_REDONE) {
		let n = parseInt(hnId, 10) + HN.revOp_HNref;
		NDAction.textContent += " (redone by record #"+n+")";
	  }
	}
	else if (revOp == HNREVOP_ISUNDO) {
	  let n = parseInt(hnId, 10) + HN.revOp_HNref;
	  NDAction.textContent = "undo "+actionTextStart+map.title+" of record #"+n+actionTextEnd;
	}
	else if (revOp == HNREVOP_ISREDO) {
	  let n = parseInt(hnId, 10) + HN.revOp_HNref;
	  NDAction.textContent = "redo "+actionTextStart+map.title+" of record #"+n+actionTextEnd;
	}
	if (((pos_insideMulti == undefined) && (HN.state == HNSTATE_INACTIVEBRANCH))
		|| ((pos_insideMulti != undefined) && (parentHN.state == HNSTATE_INACTIVEBRANCH))
	   ) {
	  NDState.textContent = "Inactive branch";
	}
	else {
	  NDState.textContent = "Active branch";
	}
	let type = map.type;
	if (type != undefined) {				// Meta node
	  NDBNId.textContent = NBSP;
	  NDType.textContent = type;
	  NDIndex.textContent = NBSP;
	  NDParentId.textContent = NBSP;
	  NDPath.textContent = NBSP;
	  NDTitle.textContent = NBSP;
	  NDFavicon.style = "";
	  NDFavicon.className = "favicon "+map.nclass;
	  NDUrl.textContent = NBSP;
	  NDInTrash.textContent = NBSP;
	  NDChildIds.textContent = NBSP;
	  NDToParentId.textContent = NBSP;
	  NDToIndex.textContent = NBSP;
	  NDToPath.textContent = NBSP;
	  NDToTitle.textContent = NBSP;
	  NDToUrl.textContent = NBSP;
	  NDToChildIds.textContent = NBSP;
	}
	else {
	  let tmp = HN.id;
	  NDBNId.textContent = (tmp == undefined ? NBSP : tmp);
	  type = HN.type;
	  NDType.textContent = (type == undefined ? NBSP : type);
	  displayPath(NDPath, HN.path);
	  tmp = HN.index;
	  NDIndex.textContent = (tmp == undefined ? NBSP : tmp);
	  tmp = HN.parentId;
	  NDParentId.textContent = (tmp == undefined ? NBSP : tmp);
	  if (type == "folder") {				// Folder
		NDTitle.textContent = HN.title;
		let uri = HN.faviconUri;
		if ((uri != undefined) && (uri != "/icons/folder.png")) { // Special folder
		  NDFavicon.className = "favicon";
		  NDFavicon.style = "background-image: url(\""+uri+"\");";
		}
		else {
		  NDFavicon.style = "";
		  NDFavicon.className = "ffavicon";
		}
	  }
	  else if (type == "separator") {		// Separator
		NDTitle.textContent = NBSP;
		NDFavicon.style = "";
		NDFavicon.className = "favicon";
	  }
	  else if (type == undefined) {		// Should occur only when is_multi is true
		NDTitle.textContent = NBSP;
		NDFavicon.style = "";
		NDFavicon.className = "mfavicon";
	  }
	  else {								// Presumably a Bookmark
		NDTitle.textContent = HN.title;
		let uri;
		if (options.disableFavicons || ((uri = HN.faviconUri) == undefined)
			|| (uri == "/icons/waiting.gif") || (uri == "/icons/nofavicontmp.png")
		   ) { // Show nofavicon
		  NDFavicon.style = "";
		  NDFavicon.className = "nofavicon";
		}
		else { // Show favicon
		  NDFavicon.className = "favicon";
		  NDFavicon.style = "background-image: url(\""+uri+"\");";
		}
	  }
	  displayField(NDUrl, HN.url);
	  displayField(NDInTrash, HN.inBSP2Trash);
	  displayField(NDChildIds, HN.childIds);
	  displayPath(NDToPath, HN.toPath);
	  displayField(NDToParentId, HN.toParentId);
	  displayField(NDToIndex, HN.toIndex);
	  displayField(NDToTitle, HN.toTitle);
	  displayField(NDToUrl, HN.toUrl);
	  displayField(NDToChildIds, HN.toChildIds);
	}
  }
}

/*
 * Show a HN row into view
 * 
 * srcRow is an HTMLTableRowElement
 */
function showRow (srcRow) {
  // Highlight the source cell + scroll it into view
  setCellHighlight(srcRow.firstElementChild);
  // Bug: "smooth" has a bug when the viewport content is modified, it points at the origin position before modification
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1139745
  // So using "auto" instead of "smooth", which appears to work all time .. even if less nice
  //
  // To reproduce = scroll to bottom of tree, make a search on an item which is hidden while it has to significantly
  // expand, and click on the result ==> the smooth scroll up is much insufficient, and doesn't being the element into view,
  // which can be found much further up :-(
  if (beforeFF58) { // block: "center" is supported only from FF58
	srcRow.scrollIntoView({behavior: "auto"});
  }
  else {
	srcRow.scrollIntoView({behavior: "auto", block: "center", inline: "nearest"});
  }
}

/*
 * Go to a specific HNId, highlight it and display it.
 * 
 * hnId is an integer
 */
function goHNItem (hnId) {
  if (hnId != undefined) {
	let row = curRowList[hnId];
	showRow(row);
	displayHN(row.dataset.type, hnId);
  }
}

/*
 * Receive event from left clicks on bookmarks table
 *
 * e is of type MouseEvent (click)
 */
function bkmkMouseHandler (e) {
  let target = e.target; // Type depends ..
  let className = target.className;
//console.log("Bookmark click event: "+e.type+" button: "+e.button+" shift: "+e.shiftKey+" target: "+target+" class: "+className);

  // The click target is one of .bscrollok (empty space click in div, nothing should happen),
  // .brow/.selbrow cell,
  // .seqnum, .histicon, .bkmkitem_x div, .favseparator/.favseparatorend div, .favicon or .favttext
  // Go up to the level of the cell (.brow/.selbrow) to handle click
  if (!className.includes("bscrollok")) {
	let cell;
	if (className.includes("brow")) {
	  cell = target;
	}
	else if (className.includes("bkmkitem_") || className.includes("meta")) {
	  cell = target.parentElement;
	}
	else {
	  cell = target.parentElement.parentElement;
	}

	// Highlight history node, and display it in the node panel
	setCellHighlight(cell);
	let row = cell.parentElement;
	let hnId = row.dataset.id;
	let type = row.dataset.type;
	displayHN(type, hnId);

	// If click on twistie, handle visibility of corresponding multiple or URList nodes
	if (className.startsWith("twistiea")) {
	  let row = cell.parentElement;
	  let type = row.dataset.type;
	  if (type == "multiple") {
		handleMultipleTwistieClick(row, target);
	  }
	  else if (type == "urlist") {
		handleURListTwistieClick(row, target);
	  }
	}
  }
  e.stopPropagation(); // Prevent handlers up the DOM chain on same event
}

/*
 * Receive event from keyboard anywhere in the "sidebar" panel
 * 
 * e is of type KeyboardEvent
 */
function keyHandler (e) {
  let target = e.target; // Type depends, but is an HTMLTableCellElement when a row is highlighted
  let key = e.key;
  let is_ctrlKey = (isMacOS ? e.metaKey : e.ctrlKey);
  let classList = target.classList;
//console.log("Key event: "+e.type+" key: "+key+" char: "+e.char+" target: "+target+" classList: "+classList);

  let isResultRow = false;
/*
  let isResultRow = classList.contains("brow");
  if (key == "Escape") {
	// Clear any menu when Esc is pressed
	let menuClosed = clearMenu();

	// Clear searchbox input and any search result when Esc is pressed within it
	if (((target.id == "searchtext") || !menuClosed)
	    && (SearchTextInput.value.length > 0)) {
	  clearSearchTextHandler();
	}
  }
  else if (target.id == "searchtext") {
	if (key == "Enter") { // Enter in search input box should go to first search result if any
	  // Get to first row if there is one
	  let len = resultsTable.rows.length;
	  if (len > 0) {
		let firstRow = resultsTable.rows[0];
		let cell = firstRow.firstElementChild;
		cell.focus();
	  }
	  e.preventDefault();
	}
  }
  else
*/
  if (classList.contains(Selhighlight) || isResultRow) { // Keyboard actions on an highlighted (=> focused) cell
	let row = target.parentElement;
	let keyProcessed = false;

	if (key == "ArrowDown") {
	  // Highlight next visible row
	  let nextRow = row;
	  while (((nextRow = nextRow.nextElementSibling) != null) && (nextRow.hidden));
	  if (nextRow != null) { // We got one
		let cell = nextRow.firstElementChild;
		if (!isResultRow) {
		  setCellHighlight(cell);
		  displayHN(nextRow.dataset.type, nextRow.dataset.id);
		}
		cell.focus();
	  }
	  keyProcessed = true;
	}
	else if (key == "ArrowUp") {
	  // Highlight previous visible row
	  let previousRow = row;
	  while (((previousRow = previousRow.previousElementSibling) != null) && (previousRow.hidden));
	  if (previousRow != null) { // We got one
		let cell = previousRow.firstElementChild;
		if (!isResultRow) {
		  setCellHighlight(cell);
		  displayHN(previousRow.dataset.type, previousRow.dataset.id);
		}
		cell.focus();
	  }
	  keyProcessed = true;
	}
	else if (key == "PageDown") {
	  // Find bottom of bounding parent (it can change with window size or search panel presence,
	  // so recalculate each time
	  let ch, maxBottom;
	  if (isResultRow) {
//		ch = SearchResult.clientHeight;
//		maxBottom = SearchResult.offsetTop + ch;
	  }
	  else {
		ch = Bookmarks.clientHeight;
		maxBottom = Bookmarks.offsetTop + ch;
	  }

	  // Get bottom and height of selected object
	  var rect = row.getBoundingClientRect();
	  let bottom = rect.bottom;
	  let rowHeight = rect.height;

	  // If there are more rows visible below, go to last one visible
	  let nbItems = Math.round(maxBottom - bottom) / rowHeight; // bottom can be a float sometimes
	  let intItems;
	  if (nbItems >= 1) {
		// Not at bottom of "viewport", go to the most bottom visible one
		// Can be a non integer, so round down, and then go down by this number of visible items or end of rows
		intItems = Math.floor(nbItems);
	  }
	  else {
		// Scroll by the number of elements of a "page", max
		intItems = Math.floor(ch / rowHeight);
	  }
	  let nextRow = row;
	  let temp;
	  do {
		temp = nextRow;
		while (((temp = temp.nextElementSibling) != null) && (temp.hidden));
		if (temp == null) // Reached end
		  break;
		nextRow = temp;
	  } while (--intItems > 0);
	  if (nextRow != row) { // We got one
		let cell = nextRow.firstElementChild;
		if (!isResultRow) {
		  setCellHighlight(cell);
		  displayHN(nextRow.dataset.type, nextRow.dataset.id);
		}
		cell.focus();
	  }
	  keyProcessed = true;
	}
	else if (key == "PageUp") {
	  // Find top of bounding parent (it can change with window size or search panel presence,
	  // so recalculate each time
	  let ch, minTop;
	  if (isResultRow) {
//		ch = SearchResult.clientHeight;
//		minTop = SearchResult.offsetTop;
	  }
	  else {
		ch = Bookmarks.clientHeight;
		minTop = Bookmarks.offsetTop;
	  }

	  // Get top and height of selected object
	  var rect = row.getBoundingClientRect();
	  let top = rect.top;
	  let rowHeight = rect.height;

	  // If there are more rows visible above, go to first one visible
	  let nbItems = Math.round(top - minTop) / rowHeight; // top can be a float sometimes
	  let intItems;
	  if (nbItems >= 1) {
		// Not at top of "viewport", go to the most top visible one
		// Can be a non integer, so round down, and then go down by this number of visible items or end of rows
		intItems = Math.floor(nbItems);
	  }
	  else {
		// Scroll by the number of elements of a "page", max
		intItems = Math.floor(ch / rowHeight);
	  }
	  let previousRow = row;
	  let temp;
	  do {
		temp = previousRow;
		while (((temp = temp.previousElementSibling) != null) && (temp.hidden));
		if (temp == null) // Reached end
		  break;
		previousRow = temp;
	  } while (--intItems > 0);
	  if (previousRow != row) { // We got one
		let cell = previousRow.firstElementChild;
		if (!isResultRow) {
		  setCellHighlight(cell);
		  displayHN(previousRow.dataset.type, previousRow.dataset.id);
		}
		cell.focus();
	  }
	  keyProcessed = true;
	}
	else if (key == "End") {
	  // Find last visible row and highlight it
	  let len;
	  let lastRow;
	  if (isResultRow) {
//		len = resultsTable.rows.length; // Start from end of table
//		lastRow = resultsTable.rows[len-1];
	  }
	  else {
		len = bookmarksTable.rows.length; // Start from end of table
		lastRow = bookmarksTable.rows[len-1];
		if (lastRow.hidden) {
		  while ((lastRow = lastRow.previousElementSibling).hidden);
		}
	  }
	  let cell = lastRow.firstElementChild;
	  if (!isResultRow) {
		setCellHighlight(cell);
		displayHN(lastRow.dataset.type, lastRow.dataset.id);
	  }
	  cell.focus();
	  keyProcessed = true;
	}
	else if (key == "Home") {
	  // Find next visible row and highlight it
	  let firstRow;
	  if (isResultRow) {
//		firstRow = resultsTable.rows[0];
	  }
	  else {
		firstRow = bookmarksTable.rows[0]; // Always visible
	  }
	  let cell = firstRow.firstElementChild;
	  if (!isResultRow) {
		setCellHighlight(cell);
		displayHN(firstRow.dataset.type, firstRow.dataset.id);
	  }
	  cell.focus();
	  keyProcessed = true;
	}
	else if (key == "Enter") {
	  let type = row.dataset.type;
	  if (type == "multiple") {
		let twistie = target.firstElementChild.firstElementChild.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling;
		handleMultipleTwistieClick(row, twistie);
	  }
	  else if (type == "urlist") {
		let twistie = target.firstElementChild.firstElementChild.nextElementSibling.nextElementSibling.nextElementSibling;
		handleURListTwistieClick(row, twistie);
	  }
	  keyProcessed = true;
	}
//  else {
//	SearchTextInput.focus(); // Focus on search box when a key is typed ...
//  }

	if (keyProcessed) { // We used up the key, don't pass it to FF for further processing
	  e.stopPropagation();
	  e.preventDefault();
	}
  }
}

/*
 * Receive event from keyboard anywhere in the history window
 * 
 * e is of type KeyboardEvent
 */
function globalKeyHandler (e) {
  let target = e.target; // Type depends, but is an HTMLTableCellElement when a row is highlighted
  let key = e.key;
  let is_ctrlKey = (isMacOS ? e.metaKey : e.ctrlKey);
  let classList = target.classList;
//console.log("Global key event: "+e.type+" key: "+key+" char: "+e.char+" target: "+target+" classList: "+classList);

  let keyProcessed = false;
  if ((key.toLowerCase() == "z") && is_ctrlKey) { // Undo
	triggerUndo();
	keyProcessed = true;
  }
  else if ((key.toLowerCase() == "y") && is_ctrlKey) { // Redo
	triggerRedo();
	keyProcessed = true;
  }

  if (keyProcessed) { // We used up the key, don't pass it to FF for further processing
	e.preventDefault();
  }
}

/*
 * Receive event from clicks anywhere in the sidebar panel, and also handle
 * menu actions
 * 
 * e is of type MouseEvent (click, but apparently is also called with right and aux clicks .. 
 *   still saying "click" in e.type .. wonder why .. but e.button is correct
 *   => use this for clearing menus when appropriate)
 *
 * Use global variable mousedownTarget to detect a bug in Linux on contextmenu events resulting
 * in the click event target always equal to body ..
 * 
 */
let mousedownTarget;
function clickHandler (e) {
  let target = e.target; // Type depends ..
  if (mousedownTarget != target) { // Fight against Linux bug on click after contextmenu event with FF66 ..
	target = mousedownTarget; // Restore the normal target it should have ...
  }
//let classList = target.classList;
//console.log("General click event: "+e.type+" button: "+e.button+" target: "+target+" target.nodeName: "+target.nodeName+" class: "+classList);

}

/*
 * Prevent default context menus or aux actions except in a few places
 * Called twice when context click = once with contextmenu + once with auxclick event
 * Called once on auxclick
 * Called all the times with mousedown events, whatever button.
 */
function noDefaultAction (e) {
  let target = e.target; // Type depends ..
  let eventType = e.type;
//console.log("noDefaultAction event: "+eventType+" button: "+e.button+" phase: "+e.eventPhase+" target: "+target+"target.nodeName: "+target.nodeName+" class: "+target.classList);

  // To fight a bug on Linux on context menu = it appears that the click event on a contextmenu event (button 2)
  // has now with FF66 its target set to the top body element, whatever element it is on.
  // So let's remember the target at mousedown time, so that things can be ignored if the target on click
  // event has changed and is different from what it was at mousedown time.
  if (eventType == "mousedown") {
	mousedownTarget = target;
  }

  if ((e.button == 1) || (e.button == 2)) {
	// Prevent default context menu except in the search box and in the log box
	let targetObjectType = Object.prototype.toString.call(target).slice(8, -1);
	if ((targetObjectType != "HTMLInputElement")
		&& (targetObjectType != "HTMLTextAreaElement")
	   ) {
	  e.preventDefault();
	}
  }
}

/*
 * Add text in the log panel
 */ 
function appendLog (text) {
  ALogTextArea.textContent += text + "\r\n";
}

/*
 * Get a particular CSSStyleRule from a CSSRuleList
 * 
 * cssRules = CSSRuleList to get a CSSStyleRule from
 * selectorText = String, name of wanted CSSStyleRule
 * 
 * Returns the wanted CSSStyleRule
 */
function getStyleRule (cssRules, selectorText) {
  let len = cssRules.length;
  let i;
  for (let j=0 ; j<len ; j++) {
	i = cssRules[j];
	if (i.selectorText == selectorText) {
	  return(i);
	}
  }
}

/*
 * Set cssRules background colors of the main pane to a given value
 * 
 * prop = a String holding color value to apply. If null or undefined, goes back to default
 */
function setPaneBackgroundColors (cssRules, prop) {
  let cssStyleRule;
  let style;

  if ((prop == undefined) || (prop == null)) {
	prop = "white";
  }

  cssStyleRule = getStyleRule(cssRules, "#pane");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("background-color", prop);

  cssStyleRule = getStyleRule(cssRules, "#bookmarks");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("border-top-color", prop);

  cssStyleRule = getStyleRule(cssRules, ".brow");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("background-color", prop);
  style.setProperty("border-color", prop);
}

/*
 * Set cssRules text colors of the main pane to a given value
 * 
 * prop = a String holding color value to apply. If null or undefined, goes back to default
 */
function setPaneTextColors (cssRules, prop) {
  let cssStyleRule;
  let style;

  if ((prop != undefined) && (prop != null)) {
	sidebarTextColor = prop;

	cssStyleRule = getStyleRule(cssRules, "#pane");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("color", prop);

	cssStyleRule = getStyleRule(cssRules, ".favseparator");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("border-bottom-color", prop);

	// Force a visible text color when highlighting a cell (= default FF value in nm/default theme mode)
	cssStyleRule = getStyleRule(cssRules, ".selbrow");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("color", HighlightTextColor);

	cssStyleRule = getStyleRule(cssRules, ".brow:hover, .selbrow:hover");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("color", HighlightTextColor);

	cssStyleRule = getStyleRule(cssRules, ".brow:focus, .selbrow:focus");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("color", HighlightTextColor);
  }
  else {
	sidebarTextColor = undefined;

	cssStyleRule = getStyleRule(cssRules, "#pane");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.removeProperty("color");

	cssStyleRule = getStyleRule(cssRules, ".favseparator");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("border-bottom-color", HighlightTextColor);

	// Force a visible text color when highlighting a cell (= default FF value in nm/default theme mode)
	cssStyleRule = getStyleRule(cssRules, ".selbrow");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.removeProperty("color");

	cssStyleRule = getStyleRule(cssRules, ".brow:hover, .selbrow:hover");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.removeProperty("color");

	cssStyleRule = getStyleRule(cssRules, ".brow:focus, .selbrow:focus");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.removeProperty("color");
  }
}

/*
 * Set cssRules background colors of the part at right of the main pane to a given value
 * 
 * prop1 = a String holding color value to apply. If null or undefined, goes back to default
 * prop2 = a String holding color value to apply to the div separating border. If null or undefined, goes back to default
 * prop3 = a String holding color value to apply to the border of rules. If null or undefined, goes back to default
 */
function setRestBackgroundColors (cssRules, prop1, prop2, prop3) {
  let cssStyleRule;
  let style;

  if ((prop1 == undefined) || (prop1 == null)) {
	prop1 = "#F0F0F0";
	prop2 = "#E0E0E0";
	prop3 = "#A0A0A0";
  }

  cssStyleRule = getStyleRule(cssRules, "#displayopt");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("background-color", prop1);
  style.setProperty("border-color", prop1);
  style.setProperty("border-right-color", prop2);

  cssStyleRule = getStyleRule(cssRules, "#pane");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("border-color", prop1);

  cssStyleRule = getStyleRule(cssRules, "#node");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("background-color", prop1);
  style.setProperty("border-color", prop1);
  style.setProperty("border-bottom-color", prop2);

  cssStyleRule = getStyleRule(cssRules, "#actions");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("background-color", prop1);
  style.setProperty("border-color", prop1);
  style.setProperty("border-top-color", prop2);

  cssStyleRule = getStyleRule(cssRules, "#alog");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("background-color", prop1);

  cssStyleRule = getStyleRule(cssRules, ".ndrrule");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("border-top-color", prop3);
  style.setProperty("border-bottom-color", prop3);

  cssStyleRule = getStyleRule(cssRules, ".ndfield1");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("border-color", prop3);

  cssStyleRule = getStyleRule(cssRules, ".ndfield2");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("border-color", prop3);
}

/*
 * Set cssRules text colors of of the part at right of the main pane to a given value
 * 
 * prop = a String holding color value to apply. If null or undefined, goes back to default
 */
function setRestTextColors (cssRules, prop) {
  let cssStyleRule;
  let style;

  if ((prop != undefined) && (prop != null)) {
	cssStyleRule = getStyleRule(cssRules, "#displayopt");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("color", prop);

	cssStyleRule = getStyleRule(cssRules, "#node");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("color", prop);

	cssStyleRule = getStyleRule(cssRules, "#actions");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.setProperty("color", prop);
  }
  else {
	cssStyleRule = getStyleRule(cssRules, "#displayopt");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.removeProperty("color");

	cssStyleRule = getStyleRule(cssRules, "#node");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.removeProperty("color");

	cssStyleRule = getStyleRule(cssRules, "#actions");
	style = cssStyleRule.style; // A CSSStyleDeclaration object
	style.removeProperty("color");
  }
}

/*
 * Set back panel colors to default
 */
function resetPanelColors () {
  // Retrieve the CSS rules to modify
  let a_ss = document.styleSheets;
  let ss = a_ss[0];
  let cssRules = ss.cssRules;

  setPaneBackgroundColors(cssRules, undefined);
  setPaneTextColors(cssRules, undefined);
  setRestBackgroundColors(cssRules, undefined, undefined, undefined);
  setRestTextColors(cssRules, undefined);
}

/*
 * Initialization colors with those of the current windows theme
 * 
 * wTheme is a theme.Theme object
 */
function setPanelColors (wTheme) {
  let propColors = wTheme.colors;
  if ((propColors == undefined) || (propColors == null)) { // No colors part => reset to default
														   // (can also happen when active theme is default)
	resetPanelColors();
  }
  else {
	// Retrieve the CSS rules to modify
	let a_ss = document.styleSheets;
	let ss = a_ss[0];
	let cssRules = ss.cssRules;

	setPaneBackgroundColors(cssRules, propColors.sidebar);
	setPaneTextColors(cssRules, propColors.sidebar_text);
	setRestBackgroundColors(cssRules, propColors.ntp_background, propColors.toolbar_bottom_separator, propColors.popup_border);
	setRestTextColors(cssRules, propColors.ntp_text);
  }
}

/*
 * Initialization colors with specified ones
 * 
 * tc and bc are String
 */
function setPanelColorsTB (tc, bc) {
  // Retrieve the CSS rules to modify
  let a_ss = document.styleSheets;
  let ss = a_ss[0];
  let cssRules = ss.cssRules;

  setPaneBackgroundColors(cssRules, bc);
  setPaneTextColors(cssRules, tc);
}

/*
 * Handle changes to FF window theme
 */
function themeRefreshedHandler (updateInfo) {
  let wId = updateInfo.windowId;
  if ((wId == undefined) || (wId = myWindowId)) {
	browser.theme.getCurrent(myWindowId)
	.then(setPanelColors);
  }
}

/*
 * Set folder image as per options
 */
function setPanelFolderImg (useAltFldr_option, altFldrImg_option) {
  // Retrieve the CSS rules to modify
  let a_ss = document.styleSheets;
  let ss = a_ss[0];
  let cssRules = ss.cssRules;
  let cssStyleRule;
  let style;

  cssStyleRule = getStyleRule(cssRules, ".ffavicon");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("background-image", (useAltFldr_option ? "url(\""+altFldrImg_option+"\")"
														   : "url(\"/icons/folder.png\")"
										)
				   );
}

/*
 * Set no-favicon image as per options
 */
function setPanelNoFaviconImg (useAltNoFav_option, altNoFavImg_option) {
  // Retrieve the CSS rules to modify
  let a_ss = document.styleSheets;
  let ss = a_ss[0];
  let cssRules = ss.cssRules;
  let cssStyleRule;
  let style;

  cssStyleRule = getStyleRule(cssRules, ".nofavicon");
  style = cssStyleRule.style; // A CSSStyleDeclaration object
  style.setProperty("background-image", (useAltNoFav_option ? "url(\""+altNoFavImg_option+"\")"
															: "url(\"/icons/nofavicon.png\")"
										)
				   );
}

/*
 * Set undo and redo buttons disabled or enabled state
 * 
 * undo = Boolean; true for enabled, false for disabled
 * redo = Boolean; true for enabled, false for disabled
 */
function setUndoRedoButtons (undo, redo) {
  if (undo != canUndo) {
	AUndoButton.disabled = !undo;
	canUndo = undo;
  }
  if (redo != canRedo) {
	ARedoButton.disabled = !redo;
	canRedo = redo;
  }
}

/*
 * Iteratively display the HN list
 *
 * hnList = Array of HN
 */
function displayHNList (hnList) {
  isDisplayComplete = false;
  let HN;
  let len = hnList.length;
  let is_historyDispURList = options.historyDispURList;
  for (let i=0 ; i<len ; i++) {
	HN = hnList[i];
	// If options.historyDispURList, do not display undo/redo, they are done after each bookamrk item
	if (!is_historyDispURList || (HN.revOp == undefined)) {
	  appendBookmarkHN(i, HN); // Append at end
	  if (HN.is_multi) { // Display all multiple selection "children" now
	    let state = HN.state;
		let hn_childs = HN.hn_list;
		let len = hn_childs.length;
		let is_visible = (HN.is_open == true);
		for (let j=0 ; j<len ; j++) {
		  // During old format conversion, it can happen that some nodes are missing in the list,
		  // protect against that
		  let hn = hn_childs[j];
		  if (hn != undefined) {
			appendBookmarkHN(i, hn, is_visible, j, state); // Append "child" at end, and impose the parent state on it
		  }
		}
	  }
	  // Special display of URList items
	  let reversion = HN.reversion;
	  if (is_historyDispURList && (reversion != undefined) && (reversion > 0)) {
		let is_visible = (HN.is_urlistOpen == true); // URList items are visible only if URList is open
		appendURList(i, is_visible); // Create a new URList header
		// Now display the old history of inactive redo / undo actions as URList items if there are
		let hnref_list = HN.revOp_HNref_list;
		let k;
		if (hnref_list != undefined) {
		  let len = hnref_list.length;
		  for (let j=0 ; j<len ; j++) {
			k = i + hnref_list[j]; // Calculate absolute position of "child"
			appendBookmarkHN(k, hnList[k], is_visible); // Append undo/redo record at end
		  }
		}
		// And display the active undo/redo record, not yet in list of inactive ones
		k = i + HN.revOp_HNref;
		appendBookmarkHN(k, hnList[k], is_visible); // Append it at end
	  }
	}
  }

  // Finish displaying favicons asynchronously
  isDisplayComplete = true;
  if (!options.disableFavicons) {
	setTimeout(completeFavicons, 0);
  }
}

/*
 * Refresh display from the HN list on an addition of a new node, at indicated position
 *
 * hnList = Array of HN
 * nnId = Integer, index of added node in hnList
 * pos_insideMulti = Integer, position inside parent multi when a refresh is made in a multi. Else, undefined.
 */
function refreshHNList (hnList, hnId, pos_insideMulti) {
//console.log("hnId "+hnId+" pos_insideMulti "+pos_insideMulti);
  let HN;
  // First refresh all previous records which could have something changed because of this addition
  // Note: only their state, is_complete, reversion and revOp_HNref can change,
  //       and nodes inside a multi record can also change in their displayed state; inherited from their parent
  let is_historyDispURList = options.historyDispURList;
  let revOp;
  for (let i=0 ; i<hnId ; i++) {
	HN = hnList[i];
	if (refreshBookmarkHN(i, HN) && HN.is_multi
		&& (!is_historyDispURList || ((revOp = HN.revOp) == undefined) || (revOp == HNREVOP_NONE))
	   ) {
	  // If a multi went inactive, also change the displayed state of its children, forcing them to inactive,
	  // when not in URList mode, or when not a reversion multi
	  let hn_list = HN.hn_list;
	  let len = hn_list.length;
	  for (let j=0 ; j<len ; j++) {
		refreshBookmarkHN(i, hn_list[j], j, HNSTATE_INACTIVEBRANCH);
	  }
	}
  }

  // Check if hnid is already displayed (can happen on completing a reversion operation
  HN = hnList[hnId];
  let row;
  if ((pos_insideMulti == undefined) && ((row = curRowList[hnId]) != undefined)) { // Yes => simple refresh here also
	refreshBookmarkHN(hnId, HN);
  }
  else { // Add new record, by an insert or an append at end
	let len = hnList.length;
	let insertPos = -1; // Append at end by default
	let forcedState;
	let is_visible;
	revOp = HN.revOp;
	if ((pos_insideMulti == undefined) && (revOp != undefined) && (revOp != HNREVOP_NONE) && is_historyDispURList) {
 	  // Insert at end of urlist of reverted bookmark
	  // Get reverted node
	  let revHNid = hnId+HN.revOp_HNref;
	  let rowIndex;
	  let revHN = hnList[revHNid];
	  let revOp_HNref_list = revHN.revOp_HNref_list;
	  is_visible = (revHN.is_urlistOpen == true); // Row is visible if revHN URList is open
	  if (revOp_HNref_list == undefined) { // This is the first reversion on this node
	    let len;
		if (revHN.is_multi) { // If multi, insert after the last displayed item in the multi record 
		  len = revHN.hn_list.length;
		  row = curRowList[revHNid+"+"+(len-1)];
		}
		else { // Insert just after the reverted record
		  row = curRowList[revHNid];
		}
		// Insert first the URList row and then this node, just after
		rowIndex = row.rowIndex;
		len = bookmarksTable.rows.length;
		if (++rowIndex >= len) { // Already at end
		  appendURList(revHNid, is_visible);
		}
		else { // Not the last panel row, insert before the next row
		  appendURList(revHNid, is_visible, rowIndex);
		  insertPos = ++rowIndex; // Shift by 1 for the next insert
		}
	  }
	  else { // Not the first reversion, insert after the latest previous reversion
		let len = revOp_HNref_list.length;
		row = curRowList[revHNid+revOp_HNref_list[len-1]];
		rowIndex = row.rowIndex;
		len = bookmarksTable.rows.length;
		if (++rowIndex < len) { // Not at end
		  insertPos = rowIndex;
		}
	  }
	}
	else {
	  // Search for the first node after it, which is already displayed, if any
	  if (pos_insideMulti != undefined) { // Added inside a multi
		is_visible = HN.is_open; // Always visible
		// Refresh parent if it becomes complete
		if (HN.is_complete) {
		  refreshBookmarkHN(hnId, HN);
		}
		// If parent is a reversion node and we are in URList mode, do not display it, however refresh parent if it becomes complete
		if ((revOp != undefined) && (revOp != HNREVOP_NONE) && is_historyDispURList) {
		  return;
		}
		// Else, go to multi parent, and check if there is an already displayed later sibbling
		let len = HN.hn_list.length; // Prepare, before reusing HN and losing the pointer at parent multi
		forcedState = HN.state;
		HN = HN.hn_list[pos_insideMulti];
		for (let i=pos_insideMulti+1 ; i<len ; i++) {
		  row = curRowList[hnId+"+"+i]; // String
		  if (row != undefined) { // Found one
			insertPos = row.rowIndex;
			break;
		  }
		}
	  }
	  else {
		is_visible = true; // Always visible
	  }
	  if (insertPos == -1) { ///Still didn't find a place)
		for (let i=hnId+1 ; i<len ; i++) {
		  row = curRowList[i];
		  if ((row != undefined)
			  && (!is_historyDispURList || ((revOp = hnList[i].revOp) == undefined) || (revOp == HNREVOP_NONE)) // Ignore reversion nodes in URList mode
			 ) { // Found one
			insertPos = row.rowIndex;
			break;
		  }
		}
	  } 
	}
	appendBookmarkHN(hnId, HN, is_visible, pos_insideMulti, forcedState, insertPos);
  }
}

/*
 * Refresh favicon of an existing bookmark inside the "pane" table.
 *
 * index = integer, index in the history list, or String of the form "index+pos_insideMulti"
 * uri = String, new faviconuri to show
 */
function refreshFaviconRow (index, uri) {
  let row = curRowList[index];
  let cell = row.firstElementChild;
  let bkmkitem = cell.firstElementChild;
  let oldImg;
  let classList = bkmkitem.classList;
  if (classList.contains("bkmkitem_b")) {
	oldImg = bkmkitem.firstElementChild.nextElementSibling.nextElementSibling.nextElementSibling;
  }
  else if (classList.contains("bkmkitem_mb")) {
	oldImg = bkmkitem.firstElementChild.nextElementSibling.nextElementSibling;
  }
  else { // bkmkitem_u or bkmkitem_r
	if (options.historyDispURList) { // In URList mode, such nodes do not show the favicon
	  return;
	}
	oldImg = bkmkitem.firstElementChild.nextElementSibling.nextElementSibling.nextElementSibling;
  }
  // Set image
  let cn = oldImg.className;
  if ((uri == "/icons/nofavicon.png") || (uri == "/icons/waiting.gif") || (uri == "/icons/nofavicontmp.png")) {
	if ((cn == undefined) || !cn.includes("nofavicon")) { // Change to nofavicon only if not already a nofavicon
	  let tmpElem = document.createElement("div");
	  tmpElem.classList.add("nofavicon");
	  tmpElem.draggable = false; // True by default for <img>
	  bkmkitem.replaceChild(tmpElem, oldImg);
	}
  }
  else {
	if ((cn != undefined) && cn.includes("nofavicon")) { // Change type from <div> to <img> if it was a nofavicon
	  let tmpElem = document.createElement("img"); // Assuming it is an HTMLImageElement
	  tmpElem.classList.add("favicon");
	  tmpElem.draggable = false; // True by default for <img>
	  tmpElem.src = uri;
	  bkmkitem.replaceChild(tmpElem, oldImg);
	}
	else {
	  oldImg.src = uri;
	}
  }

  // If row is also in the Node display pane, update it
  if (cellHighlight == cell) {
	displayHN(row.dataset.type, index);
  }
}

/*
 * Refresh favicon of an existing bookmark inside the "pane" table.
 *
 * hnList = Array of HN
 * bnId = String, id of the bookmark item
 * uri = String, new faviconuri to show
 */
function refreshFavicon (hnList, bnId, uri) {
  // Update all corresponding rows inside the bookmarks table
  let len = hnList.length;
  let len2;
  let HN, hn_list;
  for (let i=0 ; i<len ; i++) {
	HN = hnList[i];
	if (HN.id == bnId) { // Corresponding HistoryNode, update its row
	  refreshFaviconRow(i, uri);
	}
	if (HN.is_multi
		|| ((HN.revOp != undefined) && (HN.revOp != HNREVOP_NONE) && (!options.historyDispURList))
	   ) { // Also update display of the nodes in hn_list
	  hn_list = HN.hn_list;
	  if (hn_list != undefined) {
		len2 = hn_list.length;
		for (let j=0 ; j<len2 ; j++)  {
		  if (hn_list[j].id == bnId) {
			refreshFaviconRow(i+"+"+j, uri);
		  }
		}
	  }
	}
  }
}

/*
 * Demand save of curHNList (which is saved by saveBNList() in the background thread).
 */
async function saveBNList () {
  if (backgroundPage == undefined) {
	try {
	  let message = await browser.runtime.sendMessage(
			{source: "sidebar:"+myWindowId,
			 content: "saveBNList"
			}
		  );
	  handleMsgResponse(message);
	}
	catch (error) {
	  handleMsgError(error);
	}
  }
  else {
	backgroundPage.saveBNList();
  }
}

/*
 * Handle responses or errors when talking with background
 */
let f_initializeNext;
function handleMsgResponse (message) {
  // Is always called, even is destination didn't specifically reply (then message is undefined)
  if (message != undefined) {
	let msg = message.content;
	if (options.traceEnabled) {
	  console.log("History "+myWindowId+" received a response: <<"+msg+">>");
	}
  }
}

function handleMsgError (error) {
  console.log("Error: "+error);
}

/*
 * Send msg to background
 */
function sendAddonMessage (msg) {
  browser.runtime.sendMessage(
	{source: "history:"+myWindowId,
	 content: msg
	}
  ).then(handleMsgResponse, handleMsgError);
}

/*
 * Trigger an undo operation if possible
 */
async function triggerUndo () {
  if (backgroundPage == undefined) {
	try {
	  let message = await browser.runtime.sendMessage(
			{source: "sidebar:"+myWindowId,
			 content: "triggerUndo"
			}
		  );
	  handleMsgResponse(message);
	}
	catch (error) {
	  handleMsgError(error);
	}
  }
  else {
	backgroundPage.triggerUndo();
  }
}

/*
 * Trigger a redo operation if possible
 */
async function triggerRedo () {
  if (backgroundPage == undefined) {
	try {
	  let message = await browser.runtime.sendMessage(
			{source: "sidebar:"+myWindowId,
			 content: "triggerRedo"
			}
		  );
	  handleMsgResponse(message);
	}
	catch (error) {
	  handleMsgError(error);
	}
  }
  else {
	backgroundPage.triggerRedo();
  }
}

function handleAddonMessage (request, sender, sendResponse) {
  try{ // Use a try catch structure, as any exception will be caught as an error response to calling part
	let source = request.source;
	if (source == "background") { // Ignore message from sidebars
	  // When coming from background:
	  //   sender.url: moz-extension://28a2a188-53d6-4f91-8974-07cd0d612f9e/_generated_background_page.html
	  // When coming from sidebar:
	  //   sender.url: moz-extension://28a2a188-53d6-4f91-8974-07cd0d612f9e/sidebar/panel.html
	  let msg = request.content;
		if (options.traceEnabled) {
		  console.log("Got message <<"+msg+">> from "+request.source+" in History "+myWindowId);
		  console.log("  sender.tab: "+sender.tab);
		  console.log("  sender.frameId: "+sender.frameId);
		  console.log("  sender.id: "+sender.id);
		  console.log("  sender.url: "+sender.url);
		  console.log("  sender.tlsChannelId: "+sender.tlsChannelId);
		}

	  if (msg.startsWith("savedOptions")) { // Option page changed something to options, reload them
		// Look at what changed
//		let advancedClick_option_old = options.advancedClick;
//		let showPath_option_old = options.showPath;
//		let closeSearch_option_old = options.closeSearch;
//		let openTree_option_old = options.openTree;
//		let matchTheme_option_old = options.matchTheme;
//		let setColors_option_old = options.setColors;
//		let textColor_option_old = options.textColor;
//		let bckgndColor_option_old = options.bckgndColor;
		let reversePath_option_old = options.reversePath;
		let matchTheme_option_old = options.matchTheme;
		let setColors_option_old = options.setColors;
		let textColor_option_old = options.textColor;
		let bckgndColor_option_old = options.bckgndColor;
		let altFldrImg_option_old = options.altFldrImg;
		let useAltFldr_option_old = options.useAltFldr;
		let altNoFavImg_option_old = options.altNoFavImg;
		let useAltNoFav_option_old = options.useAltNoFav;
//		let traceEnabled_option_old = options.traceEnabled;

		// Function to process option changes
		function changedOptions () {
		  // If path option changed, update any open search result 
		  if (reversePath_option_old != options.reversePath) {
			// Update displayed HN
			if (cellHighlight != null) {
			  let row = cellHighlight.parentElement;
			  displayHN(row.dataset.type, row.dataset.id);
			}
		  }
		  // If match FF theme option changed
		  if (matchTheme_option_old != options.matchTheme) {
			if (options.matchTheme) {
			  // Align colors with window theme 
			  browser.theme.getCurrent(myWindowId)
			  .then(setPanelColors);

			  // Register listener
			  browser.theme.onUpdated.addListener(themeRefreshedHandler);
			}
			else {
			  resetPanelColors();

			  // Remove listener
			  browser.theme.onUpdated.removeListener(themeRefreshedHandler);
			}
		  }
		  // If set colors option changed, or if one of the colors changed while that option is set
		  if (setColors_option_old != options.setColors
			  || (options.setColors && ((textColor_option_old != options.textColor)
									   || (bckgndColor_option_old != options.bckgndColor)
				 					  )
				 )
			 ) {
			if (options.setColors) {
			  // Align colors with chosen ones 
			  setPanelColorsTB(options.textColor, options.bckgndColor);
			}
			else { // Cannot change while machTheme option is set, so no theme to match, reset ..
			  resetPanelColors();
			}
		  }
		  // If folder image options changed
		  if ((options.useAltFldr && (altFldrImg_option_old != options.altFldrImg))
			  || (useAltFldr_option_old != options.useAltFldr)
			 ) {
			setPanelFolderImg(options.useAltFldr, options.altFldrImg);
		  }
		  // If no-favicon image options changed
		  if ((options.useAltNoFav && (altNoFavImg_option_old != options.altNoFavImg))
			  || (useAltNoFav_option_old != options.useAltNoFav)
			 ) {
			setPanelNoFaviconImg(options.useAltNoFav, options.altNoFavImg);
		  }
		}

		// Refresh options
		// Bacground page is accessible, all was loaded inside it, so get from there
		refreshOptionsBgnd(backgroundPage);
		changedOptions();
	  }
	  else if (msg.startsWith("savedSearchOptions")) { // Reload and process search options
		// Refresh options
		// Background page is accessible, all was loaded inside it, so get from there
		refreshOptionsBgnd(backgroundPage);
		setSearchOptions();
	  }
	  else if (msg.startsWith("resetSizes")) { // Option page reset sizes button was pressed
		// Reset of search pane height
//		SearchResult.style.height = "";
	  }
	  else if (msg.startsWith("hnListAdd")) { // We are getting a new record appended to curHNList or to one of its nodes
		let pos = request.pos;
		if (pos != -1) { // This is a node within a folder inside a multi, do not redfresh display
		  let pos_insideMulti = request.pos_insideMulti;
		  refreshHNList(curHNList.hnList, pos, pos_insideMulti); // This takes care also of the Node display
		  // Go to and show the current active position (cursor)
		  goHNItem(curHNList.activeIndex);
		  setUndoRedoCursor();
		  // Update undo/redo buttons if any change
		  setUndoRedoButtons(request.canUndo, request.canRedo);
		}
	  }
	  else if (msg.startsWith("hnListClear")) { // History was cleared
 		// Reload ourselves
		window.location.reload();
		// Disable both undo & redo buttons if not already disabled
		setUndoRedoButtons(false, false);
	  }
	  else if (msg.startsWith("asyncFavicon")) { // Got a favicon uri to refresh
		let bnId = request.bnId;
		let uri = request.uri;
		refreshFavicon(curHNList.hnList, bnId, uri);
	  }

	  // Answer (only to background task, to not perturbate dialog between sidebars or other add-on windows, and background)
	  sendResponse(
		{content: "History:"+myWindowId+" response to "+request.source		
		}
	  );
	}
  }
  catch (error) {
	console.log("Error processing message: "+request.content);
	if (error != undefined) {
	  console.log("message:    "+error.message);
	  let fn = error.fileName;
	  if (fn == undefined)   fn = error.filename; // Not constant :-( Some errors have filename, and others have fileName 
	  console.log("fileName:   "+fn);
	  console.log("lineNumber: "+error.lineNumber);
	}
  }
}

/*
 * Fire when there is a mouse wheel event
 * Used to disable zooming with Ctrl+mouse wheel
 */
function onWheel (aEvent) {
  let is_ctrlKey;
  let is_metaKey;
  if (isMacOS) {
	is_ctrlKey = aEvent.metaKey;
	is_metaKey = aEvent.ctrlKey;
  }
  else {
	is_ctrlKey = aEvent.ctrlKey;
	is_metaKey = aEvent.metaKey;
  }
  if (is_ctrlKey && !aEvent.altKey && !is_metaKey && !aEvent.shiftKey) {
	aEvent.preventDefault();
  }
}

/*
 * Handle window close
 */
function closeHandler (e) {
//console.log("Close clicked: "+e.type);
  // Note that this is unclean ... the promise to be returned by browser.bookmarks.update
  // or by browser.bookmarks.remove()
  // will never be able to be dispatched to something stil existing, therefore generating
  // an error message on the browser console.
  // Could do something complex by listening in the main code for the windows.onRemoved
  // event, and then compare with windowId we got at creation to retrieve the btnId and
  // then update/remove the bookmark .. but I guess I am lazy tonight .. that will be one
  // more junk message .. too bad for the console ..

  // Get the CSS pixel ratio
  // Note 1: window.windowUtils does not work ...
  // Note 2: not reliable ! Is impacted by both the system DPI and the window zoom factor,
  //         however window.screenX and screenY are only impacted by the window zoom factor :-(
  //         => Need to rely on browser.windows.getCurrent() instead, which is all in pixels
//let pixelsPerCSS = window.devicePixelRatio;
//console.log("closeHandler() - window.devicePixelRatio="+pixelsPerCSS);

  // Get and remember our own position (and size if option is activated), converting to real pixels
//	let top = Math.floor(window.screenY * pixelsPerCSS);
//	let left = Math.floor(window.screenX * pixelsPerCSS);
  browser.windows.getCurrent()
  .then(
	function (wInfo) {
//console.log("closeHandler() - window.devicePixelRatio="+window.devicePixelRatio);
//console.log("closeHandler() - wInfo.top: "+wInfo.top+" screenY: "+window.screenY);
//console.log("closeHandler() - calc top: "+(window.screen.top+window.screenY));
//console.log("closeHandler() - wInfo.left: "+wInfo.left+" screenX: "+window.screenX);
//console.log("closeHandler() - calc left: "+(window.screen.left+window.screenX));
	  let top = wInfo.top;
	  let left = wInfo.left;
	  if (options.rememberSizes) {
//	  let height = Math.floor(window.outerHeight*pixelsPerCSS);
//	  let width = Math.floor(window.outerWidth*pixelsPerCSS);
		let height = wInfo.height;
		let width = wInfo.width;
		browser.storage.local.set({
		  historytop_option: top,
		  historyleft_option: left,
		  historyheight_option: height,
		  historywidth_option: width
		});
//console.log("closeHandler() - options.rememberSizes set - top="+top+" left="+left+" height="+height+" width="+width);
	  }
	  else {
		browser.storage.local.set({
		  historytop_option: top,
		  historyleft_option: left
		});
//console.log("closeHandler() - top="+top+" left="+left);
	  }

/*
browser.windows.getCurrent()
.then(
  function (wInfo) {
	let top1 = wInfo.top;
	let left1 = wInfo.left;
	let height1 = wInfo.height;
	let width1 = wInfo.width;
console.log("closeHandler() - browser.windows.getCurrent wInfo - top="+top1+" left="+left1+" height="+height1+" width="+width1);
  }
);
*/
	}
  );
}

/*
 * Finish the initial display of favicons in background after display of bookmark tree
 */
const Fluidity = 40;
const Bunch = 250;
let bunchCount = 0;
let tt1, tt2;
async function completeFavicons () {
  let hnList = curHNList.hnList;
  let HN;
  tt1 = Performance.now();
  let len = hnList.length;
  let is_historyDispURList = options.historyDispURList;
  let row, img;
  for (let i=0 ; i<len ; i++) {
	HN = hnList[i];
	if (HN.type == "bookmark") {
	  // Give a chance to other events every Bunch
	  if (++bunchCount > Bunch) {
		// Impose a minimum count, and then
		// give a chance to other events every Fluidity ms (40 ms = 25 times per second)
		tt2 = Performance.now();
		if (tt2 - tt1 >= Fluidity) {
		  bunchCount = 0;
		  tt1 = tt2;
		  await sleep(0);
		}
	  }

	  // Display the favicon when this is a standard bookmark row
	  if (!is_historyDispURList || (HN.revOp == undefined)) {
		row = curRowList[i];
		img = row.firstElementChild.firstElementChild.firstElementChild.nextElementSibling.nextElementSibling.nextElementSibling;
		img.src = HN.faviconUri;
	  }
	}
	else if (HN.is_multi) { // Also process the nodes inside multi records
	  let hn_list = HN.hn_list;
	  let len = hn_list.length;
	  for (let j=0 ; j<len ; j++) {
		HN = hn_list[j];
		if (HN.type == "bookmark") {
		  // Give a chance to other events every Bunch
		  if (++bunchCount > Bunch) {
			// Impose a minimum count, and then
			// give a chance to other events every Fluidity ms (40 ms = 25 times per second)
			tt2 = Performance.now();
			if (tt2 - tt1 >= Fluidity) {
			  bunchCount = 0;
			  tt1 = tt2;
			  await sleep(0);
			}
		  }

		  // Display the favicon, if the row exists (not the case when multiple in a reversion node, in URList mode)
		  row = curRowList[i+"+"+j];
		  if (row != undefined) {
			img = row.firstElementChild.firstElementChild.firstElementChild.nextElementSibling.nextElementSibling;
			img.src = HN.faviconUri;
		  }
		}
	  }
	}
  }
}

/*
 * Complete the initial display of bookmarks history table
 */
function completeDisplay () {
  // Handle display option changes
  URListInput.addEventListener("click", handleURListClick);
  RawListInput.addEventListener("click", handleRawListClick);

  // Setup mouse and keyboard handlers for bookmarks and results
//  SearchResult.addEventListener("click", resultsMouseHandler);
  Bookmarks.addEventListener("click", bkmkMouseHandler);
/*
  SearchResult.addEventListener("contextmenu", resultsContextHandler);
  Bookmarks.addEventListener("contextmenu", bkmkContextHandler);
  SearchResult.addEventListener("auxclick", resultsAuxHandler);
  Bookmarks.addEventListener("auxclick", bkmkAuxHandler);
  SearchResult.addEventListener("scroll", rsltScrollHandler);
  Bookmarks.addEventListener("scroll", bkmkScrollHandler);
  if (isLinux) {
	Bookmarks.addEventListener("dragenter", bkmkMouseEnterHandler, true);
	Bookmarks.addEventListener("dragexit", bkmkMouseLeaveHandler, true);
	Bookmarks.addEventListener("dragleave", bkmkMouseLeaveHandler, true);
	SearchResult.addEventListener("dragenter", rsltMouseEnterHandler, true);
	SearchResult.addEventListener("dragexit", rsltMouseLeaveHandler, true);
	SearchResult.addEventListener("dragleave", rsltMouseLeaveHandler, true);
  }
*/
  HPane.addEventListener("keydown", keyHandler); // History pane only
  addEventListener("keydown", globalKeyHandler); // Window wide

  // Setup mouse handlers for search button
//  SearchButtonInput.addEventListener("click", searchButtonHandler);

  // General event handlers for a click anywhere in the document .. used to clear menus
  // and prevent default menus
  addEventListener("click", clickHandler);
  addEventListener("mousedown", noDefaultAction);
  addEventListener("contextmenu", noDefaultAction);
  addEventListener("auxclick", noDefaultAction);
//  addEventListener("blur", onBlur);
  addEventListener('wheel', onWheel, {capture: true, passive: false}); // To disable zooming

  /*
  if (!beforeFF64) { // Handle integrated FF menu items
	browser.menus.onClicked.addListener(onClickedContextMenuHandler);
	browser.menus.onHidden.addListener(onHiddenContextMenuHandler);
  }
*/

  // Event handlers for drag & drop
/*
  Bookmarks.addEventListener("dragstart", bkmkDragStartHandler);
  Bookmarks.addEventListener("dragend", bkmkDragEndHandler);
  SearchResult.addEventListener("dragstart", resultsDragStartHandler);
  SearchResult.addEventListener("dragend", resultsDragEndHandler);
  Bookmarks.addEventListener("dragenter", bkmkDragEnterHandler);
  Bookmarks.addEventListener("dragover", bkmkDragOverHandler);
  Bookmarks.addEventListener("dragleave", bkmkDragLeaveHandler);
  Bookmarks.addEventListener("dragexit", bkmkDragExitHandler);
  Bookmarks.addEventListener("drop", bkmkDropHandler);
  SearchResult.addEventListener("dragenter", rsltDragEnterHandler);
  SearchResult.addEventListener("dragover", rsltDragOverHandler);
  SearchResult.addEventListener("dragleave", rsltDragLeaveHandler);
  SearchResult.addEventListener("dragexit", rsltDragExitHandler);
*/

  // Handle action buttons
  AUndoButton.addEventListener("click", triggerUndo);
  ARedoButton.addEventListener("click", triggerRedo);

  // Catch button clicks, and window close
  window.onbeforeunload = closeHandler;

  // Go to and show the current active position (cursor)
  goHNItem(curHNList.activeIndex);
  setUndoRedoCursor();

  // Focus on searchtext input at initial load
//  window.focus();
//  SearchTextInput.focus();
}

/*
 * Initialization phase 2
 */
function initialize2 () {
  // Some variations depending on platform
  if (platformOs == "win") {
	Body.classList.replace("fontdflt", "fontwin");
  }
  else if (platformOs == "linux") {
	Body.style.fontSize = "12px";
  }
  else if (platformOs == "mac") {
	isMacOS = true;
	Body.style.fontSize = "12px";
  }

  // Align colors with window theme
  if (options.matchTheme) {
	browser.theme.getCurrent(myWindowId)
	.then(setPanelColors);

	// Register listener
	browser.theme.onUpdated.addListener(themeRefreshedHandler);
  }
  else { // If set colors option is set, align colors with specified values
	if (options.setColors) {
	  // Align colors with chosen ones 
	  setPanelColorsTB(options.textColor, options.bckgndColor);
	}
  }

  // Set folder image as per options
  if (options.useAltFldr) {
	setPanelFolderImg(true, options.altFldrImg);
  }

  // Set no-favicon image as per options
  if (options.useAltNoFav) {
	setPanelNoFaviconImg(true, options.altNoFavImg);
  }

  // Show options.historyDispURList on screen radio buttons
  if (options.historyDispURList) {
	URListInput.checked = true;
  }
  else {
	RawListInput.checked = true;
  }

  // Update undo/redo buttons if any change
  setUndoRedoButtons((curHNList.activeIndex != undefined), (curHNList.undoList.length > 0));

  // Display the HN list inside a table in "pane"
  bookmarksTable = document.createElement("table");
  Bookmarks.appendChild(bookmarksTable);
  displayHNList(curHNList.hnList);
  completeDisplay();
}

/*
 * Initialization phase 1 for private windows = get CurHNList from background
 * and then link to initialization phase 2
 */
// Never happens from traces
//function initializePriv () {
//  f_initializeNext = initialize2;
//	..curBNList..;
//  sendAddonMessage("getCurHNList");
//}

/*
 * Initialization phase 0
 */
function initialize () {
  // Start when we have the platform and the background page
  Promise.all([p_platform, p_background, p_getWindowId])
  .then(
	function (a_values) { // An array of one value per Promise is returned
	  p_platform = p_background = p_getWindowId = undefined; // Free memory held by these global variables

	  // Retrieve values in the same order
	  platformOs = a_values[0].os; // info object
	  let page = a_values[1];

	  // In a private browsing window (incognito), this will be null -> Never happens from traces
//	  if (page != null) { // Not in a private browsing window
		backgroundPage = page;
//	  }

	  // Handle myWindowId
	  let windowInfo = a_values[2];
	  myWindowId = windowInfo.id;

	  // Watch for background script messages
	  browser.runtime.onMessage.addListener(handleAddonMessage);

	  // Get options and populate Options page Input elements
//	  if (backgroundPage == undefined) { // Load by ourselves -> Never happens from traces
//		refreshOptionsLStore()
//		.then(initializePriv);
//	  }
//	  else {
		// Background page is accessible, all was loaded inside it, so get from there
		refreshOptionsBgnd(backgroundPage);
		curBNList = backgroundPage.curBNList;
		curHNList = backgroundPage.curHNList;
		initialize2();
//	  }
	}
  );
}


/*
 * Main code:
 * ----------
*/

// Get saved or default values in the page 
document.addEventListener('DOMContentLoaded', initialize);