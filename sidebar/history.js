'use strict';

//----- Workaround for top and left position parameters being ignored for panels and bug on popups (szince panel is an alis for popup) -----
// Cf. https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/windows/create
//     https://bugzilla.mozilla.org/show_bug.cgi?id=1271047
//This is also used as workaround for bug 1408446 in Linux (window contents is not painted ..)
// Cf. https://bugzilla.mozilla.org/show_bug.cgi?id=1408446
// imposing to resize in order to draw contents - Apparently corrected in FF 59.x -
const HistoryWidth  = 800;
const HistoryHeight = 800;

let remembersizes_option; // At this stage, we didn't collect all options yet
let gettingItem = browser.storage.local.get(
  {historytop_option: 50,
   historyleft_option: 100,
   remembersizes_option: false,
   historyheight_option: HistoryHeight,
   historywidth_option: HistoryWidth
  }
);
gettingItem.then((res) => {
  let top = res.historytop_option;
  let left = res.historyleft_option;
  remembersizes_option = res.remembersizes_option;
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
});
//----- End of position ignored workaround -----


//Retrieve Platform and Background page
let p_platform = browser.runtime.getPlatformInfo();
let p_background = browser.runtime.getBackgroundPage();
let p_ffversion = browser.runtime.getBrowserInfo();
let p_getWindowId = browser.windows.getCurrent(
//  {populate: true	
//  }
);


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
tmpElem3.classList.add("twistieao");
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
tmpElem3.classList.add("twistieac");
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
tmpElem1.classList.add("ufavicon");
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
RItemTempl.classList.add("bkmkitem_u");
RItemTempl.draggable = false; // False by default for <div>
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("seqnum");
tmpElem1.draggable = false;
RItemTempl.appendChild(tmpElem1);
tmpElem1 = document.createElement("div"); // Assuming it is an HTMLDivElement
tmpElem1.classList.add("rfavicon");
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
let beforeFF57;
let beforeFF58;
let beforeFF60;
let beforeFF63;
let ffversion;
let myWindowId;
let curBNList; // Current list of BookmarkNode - Saved in storage at each modification
let curHNList; // Current history of HistoryNode - Saved in storage at each modification
let curRowList = {}; // Current map between id and row for each bookmark item
let bookmarksTable; // Assuming it is an HTMLTableElement
let cellHighlight = null; // Current highlight of a row in source bookmarks = cell
let sidebarTextColor = undefined; // Contains text color if we apply a theme's colors


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
	lastActiveIndex = undefined; // Force redisplay of cursor
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
	lastActiveIndex = undefined; // Force redisplay of cursor
	setUndoRedoCursor();
  }
}

/*
 * Append a bookmark HistoryNode inside the "pane" table
 *
 * id = Integer, index of the record in the HN list
 * HN = HistoryNode
 *
 * Returns: the inserted row (an HTMLTableRowElement).
 */
let isDisplayComplete = false;
function appendBookmarkHN (id, HN) {
  // Append new row inside the bookmarks table
  let row = curRowList[id] = bookmarksTable.insertRow(-1);
  row.dataset.id = id; // Keep unique id of HN in the data-id attribute

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
	seqnum.textContent = id;
	let cursor = seqnum.nextElementSibling;
	let histicon = cursor.nextElementSibling;
	histicon.classList.add(map.nclass);
	let span = histicon.nextElementSibling;
	let text = span.textContent = map.title;
	seqnum.title = cursor.title = histicon.title = text + "\n" + tStr;
	cell.appendChild(div);
  }
  else {
	type = row.dataset.type = HN.type;
	let div, seqnum;
	let revOp = HN.revOp; // If undefined, normal operation, else undo or redo
	if ((revOp != undefined) && options.historyDispURList) { // Special display as URList item
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
	  let img = seqnum.nextElementSibling;
	  let span = img.nextElementSibling;
	  let op = map.title;
	  seqnum.title = img.title = span.title = textOp + op + "\n" + tStr;
	  span.textContent = textOp + op + tStr;
	}
	else {
	  let cursor, histicon;
	  if (HN.is_multi == true) {					// Multiple bookmarks action
		div = MultiSelTempl.cloneNode(true);
		seqnum = div.firstElementChild;
		cursor = seqnum.nextElementSibling;
		histicon = cursor.nextElementSibling;
		let img = histicon.nextElementSibling;
		if (!HN.is_complete) { // Color text in red, as incomplete
		  let span = img.nextElementSibling;
		  span.classList.add("incompleteop");
		}
	  }
	  else if (type == "folder") {				// Folder
		let img;
		let uri = HN.faviconUri;
		if (HN.multi_HNref) { // Item is part of a multi-selection operation
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
		let span = img.nextElementSibling;
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
		if (HN.multi_HNref) { // Item is part of a multi-selection operation
		  row.draggable = true; // Note: it is false by default for <tr>
		  div = ItemSMultiSelTempl.cloneNode(true);
		  seqnum = div.firstElementChild;
		  let vbar = seqnum.nextElementSibling;
		  img = vbar.nextElementSibling;
		}
		else {
		  div = SeparatorTempl.cloneNode(true);
		  seqnum = div.firstElementChild;
		  seqnum.textContent = id;
		  cursor = seqnum.nextElementSibling;
		  histicon = cursor.nextElementSibling;
		}
	  }
	  else {										// Presumably a Bookmark
		row.draggable = true; // Note: it is false by default for <tr>
		let img;
		let uri;
		if (((uri = HN.faviconUri) == undefined) || (uri == "/icons/nofavicon.png")) { // Clone with nofavicon image background
		  if (HN.multi_HNref) { // Item is part of a multi-selection operation
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
		  if (HN.multi_HNref) { // Item is part of a multi-selection operation
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
		let span = img.nextElementSibling;
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
	  seqnum.textContent = id;
	  let textOp;
	  if (revOp == undefined) {
		if (histicon != undefined) {
		  histicon.classList.add(map.nclass);
		}
	    textOp = "";
	  }
	  else if (revOp == HNREVOP_ISUNDO) {
		if (histicon != undefined) {
		  histicon.classList.add(map.uclass);
		}
	    textOp = "undo";
	  }
	  else if (revOp == HNREVOP_ISREDO) {
		if (histicon != undefined) {
		  histicon.classList.add(map.rclass);
		}
	    textOp = "redo";
	  }
	  let t = seqnum.title = textOp + map.title + "\n" + tStr;
	  if (cursor != undefined) {
		cursor.title = t;
	  }
	  if (histicon != undefined) {
		histicon.title = t;
	  }
	}
	if (HN.state == HNSTATE_INACTIVEBRANCH) {
	  div.classList.add("inactive");
	}
	cell.appendChild(div);
  }

  return(row);
}

/*
 * Refresh an existing bookmark HistoryNode inside the "pane" table.
 * Only its state (-> become inactive), is_complete (-> become complete), reversion and revOp_HNref can change
 *
 * id = Integer, id of the record in the list
 * HN = HistoryNode
 *
 * Returns: the modified row (an HTMLTableRowElement).
 */
function refreshBookmarkHN (id, HN) {
  // Retrieve row inside the bookmarks table
  let row = curRowList[id];
  let cell = row.firstElementChild;
  let div = cell.firstElementChild;

  // Refresh content in the cell:
  if ((HN.state == HNSTATE_INACTIVEBRANCH) && !div.classList.contains("inactive")) {
	div.classList.add("inactive");
  }
  if (HN.is_complete == true) {
	let span = cell.lastElementChild;
	if (div.classList.contains("incompleteop")) {
	  span.classList.remove("incompleteop")
	}
  }	

  // If row is in Node display, update it
  if (cellHighlight == cell) {
	if (row.dataset.type != "urlist") {
	  displayHN(id);
	}
  }

  return(row);
}

/*
 * Append an undo / redo list inside the "pane" table
 *
 * Returns: the inserted row (an HTMLTableRowElement).
 */
function appendURList () {
  // Append new row inside the bookmarks table
  let row = bookmarksTable.insertRow(-1);
  row.draggable = false; // True by default for <tr>

  // Add UR List template in row
  let cell = row.insertCell();
  cell.classList.add("brow");
  cell.tabIndex = 0;
//  cell.draggable = false; // False by default for <td>

  // Append UR List contents to the cell:
  row.dataset.type = "urlist";
  let div = URListTempl.cloneNode(true);
  cell.appendChild(div);

  return(row);
}

/*
 * Set undo/redo cursor
 */
let lastActiveIndex;
function setUndoRedoCursor () {
  let activeIndex = curHNList.activeIndex;
  // Proceed only if there is a change in activeIndex position 
  if (activeIndex != lastActiveIndex) {
	// Clear last one if there was one
	if (lastActiveIndex != undefined) {
	  let row = curRowList[lastActiveIndex];
	  let seqnum = row.firstElementChild.firstElementChild.firstElementChild;
	  let cursor = seqnum.nextElementSibling;
	  cursor.classList.replace("urcursor", "nocursor");
	  cursor.title = seqnum.title;
	}
	// Set new one, if present
	if (activeIndex != undefined) {
	  let row = curRowList[activeIndex];
	  let cursor = row.firstElementChild.firstElementChild.firstElementChild.nextElementSibling;
	  cursor.classList.replace("nocursor", "urcursor");
	  cursor.title = "undo/redo cursor";
	}
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
 * hnId is an integer
 */
function displayHN (hnId) {
  NDNum.textContent = hnId;
  let HN = curHNList.hnList[hnId];
  let t = new Date (HN.timestamp);
  NDTimestamp.textContent = t.toLocaleString();
  let actionTextStart, actionTextEnd;
  let is_multi = HN.is_multi;
  if (is_multi == true) {
	actionTextStart = "multi bookmarks ";
	if (HN.is_complete) {
	  actionTextEnd = " (complete) "; 
	  NDAction.style = "";
	}
	else {
	  actionTextEnd = " (incomplete) ";
	  NDAction.classList.add("incompleteop");
	}
  }
  else {
	actionTextStart = actionTextEnd = "";
	if (HN.multi_HNref != undefined) {
	  actionTextEnd = " (in a multi bookmarks action)";
	}
  }
  let action = HN.action;
  let map = MapAction[action];
  let revOp = HN.revOp;
  if (revOp == undefined) {
	let reversion = HN.reversion;
	NDAction.textContent = actionTextStart+map.title+actionTextEnd;
	if (reversion == HNREVERSION_UNDONE) {
	  NDAction.textContent += " (undone by record #)"+hnId+HN.revOp_HNref;
	}
	else if (reversion == HNREVERSION_REDONE) {
	  NDAction.textContent += " (redone by record #)"+hnId+HN.revOp_HNref;
	}
  }
  else if (revOp == HNREVOP_ISUNDO) {
	NDAction.textContent = "undo "+actionTextStart+map.title+" of record #"+hnId+HN.revOp_HNref+actionTextEnd;
  }
  else if (revOp == HNREVOP_ISREDO) {
	NDAction.textContent = "redo "+actionTextStart+map.title+" of record #"+hnId+HN.revOp_HNref+actionTextEnd;
  }
  if (HN.state == HNSTATE_INACTIVEBRANCH) {
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
	  if (options.disableFavicons || ((uri = HN.faviconUri) == undefined)) { // Show nofavicon
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

/*
 * Display for an Undo /redo list Node in the "node" panel
 */
function displayURList () {
  NDNum.textContent = NBSP;
  NDTimestamp.textContent = NBSP;
  NDAction.style = "";
  NDAction.textContent = "Undo / redo list";
  NDState.textContent = NBSP;
  NDBNId.textContent = NBSP;
  NDType.textContent = type;
  NDParentId.textContent = NBSP;
  NDIndex.textContent = NBSP;
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
	displayHN(hnId);
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
	else if (className.includes("bkmkitem_")) {
	  cell = target.parentElement;
	}
	else {
	  cell = target.parentElement.parentElement;
	}

	// Highlight history node, and display it in the node panel
	setCellHighlight(cell);
	let row = cell.parentElement;
	let hnId = row.dataset.id;
	displayHN(hnId);
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

	if (key == "ArrowDown") {
	  // Highlight next row
	  let nextRow = row.nextElementSibling;
	  if (nextRow != null) { // We got one
		let cell = nextRow.firstElementChild;
		if (!isResultRow) {
		  setCellHighlight(cell);
		  displayHN(nextRow.dataset.id);
		}
		cell.focus();
	  }
	  e.preventDefault();
	}
	else if (key == "ArrowUp") {
	  // Highlight previous row
	  let previousRow = row.previousElementSibling;
	  if (previousRow != null) { // We got one
		let cell = previousRow.firstElementChild;
		if (!isResultRow) {
		  setCellHighlight(cell);
		  displayHN(previousRow.dataset.id);
		}
		cell.focus();
	  }
	  e.preventDefault();
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
		temp = nextRow.nextElementSibling;
		if (temp == null) // Reached end
		  break;
		nextRow = temp;
	  } while (--intItems > 0);
	  if (nextRow != row) { // We got one
		let cell = nextRow.firstElementChild;
		if (!isResultRow) {
		  setCellHighlight(cell);
		  displayHN(nextRow.dataset.id);
		}
		cell.focus();
	  }
	  e.preventDefault();
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
		temp = previousRow.previousElementSibling;
		if (temp == null) // Reached end
		  break;
		previousRow = temp;
	  } while (--intItems > 0);
	  if (previousRow != row) { // We got one
		let cell = previousRow.firstElementChild;
		if (!isResultRow) {
		  setCellHighlight(cell);
		  displayHN(previousRow.dataset.id);
		}
		cell.focus();
	  }
	  e.preventDefault();
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
	  }
	  let cell = lastRow.firstElementChild;
	  if (!isResultRow) {
		setCellHighlight(cell);
		displayHN(lastRow.dataset.id);
	  }
	  cell.focus();
	  e.preventDefault();
	}
	else if (key == "Home") {
	  // Find next visible row and highlight it
	  let firstRow;
	  if (isResultRow) {
//		firstRow = resultsTable.rows[0];
	  }
	  else {
		firstRow = bookmarksTable.rows[0];
	  }
	  let cell = firstRow.firstElementChild;
	  if (!isResultRow) {
		setCellHighlight(cell);
		displayHN(firstRow.dataset.id);
	  }
	  cell.focus();
	  e.preventDefault();
	}
//  else {
//	SearchTextInput.focus(); // Focus on search box when a key is typed ...
//  }
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
 * Set cssRules background colors to a given value
 * 
 * prop = a String holding color value to apply. If null or undefined, goes back to default
 */
function setBackgroundColors (cssRules, prop) {
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
 * Set cssRules text colors to a given value
 * 
 * prop = a String holding color value to apply. If null or undefined, goes back to default
 */
function setTextColors (cssRules, prop) {
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
 * Set back panel colors to default
 */
function resetPanelColors () {
  // Retrieve the CSS rules to modify
  let a_ss = document.styleSheets;
  let ss = a_ss[0];
  let cssRules = ss.cssRules;

  setBackgroundColors(cssRules, undefined);
  setTextColors(cssRules, undefined);
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

	setBackgroundColors(cssRules, propColors.sidebar);
	setTextColors(cssRules, propColors.sidebar_text);
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

  setBackgroundColors(cssRules, bc);
  setTextColors(cssRules, tc);
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
 * Iteratively display the HN list
 *
 * hnList = Array of HN
 */
let lastHNListLen; // Length of last displayed list
function displayHNList (hnList) {
  isDisplayComplete = false;
  let HN;
  lastHNListLen = hnList.length;
  for (let i=0 ; i<lastHNListLen ; i++) {
	HN = hnList[i];
	let revop;
	if ((HN.multi_HNref == undefined)		// Do not display items part of a multiple selection as they are done with their "parent"
		&& (!options.historyDispURList || ((revop = HN.revOp) == undefined))	// If options.historyDispURList, do not display undo/redo, they are done after each bookamrk item
	   ) {
	  appendBookmarkHN(i, HN);
	  if (HN.is_multi) { // Display all multiple selection "children" now
		let hnref_list = HN.hnref_list;
		let len = hnref_list.length;
		let k;
		for (let j=0 ; j<len ; j++) {
		  k = i + hnref_list[j]; // Calculate absolute position of "child"
		  appendBookmarkHN(k, hnList[k]); // Display "child"
		}
	  }
	  let reversion = HN.reversion;
	  if (options.historyDispURList && (reversion != undefined) && (reversion > 0)) { // Special display of URList items
		appendURList(); // Create a new URList header
		// Now display all redo / undo actions as URList items
		let hnref_list = HN.revOp_HNref_list;
		let k;
		if (hnref_list != undefined) {
		  let len = hnref_list.length;
		  for (let j=0 ; j<len ; j++) {
			k = i + hnref_list[j]; // Calculate absolute position of "child"
			appendBookmarkHN(k, hnList[k]); // Display "child"
		  }
		}
		// Display last one, not yet in list of inactive ones
		k = i + revop;
		appendBookmarkHN(k, hnList[k]); // Display "child"
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
 * Iteratively refresh the HN list on an update, and refresh Node display for selected cell
 *
 * hnList = Array of HN
 */
function refreshHNList (hnList) {
  let HN;
  // First refresh existing records (only their state, is_complete, reversion and revOp_HNref can change)
  for (let i=0 ; i<lastHNListLen ; i++) {
	HN = hnList[i];
	refreshBookmarkHN(i, HN);
  }
  // Then add new record(s)
  let len = hnList.length;
  for (let i=lastHNListLen ; i<len ; i++) {
	HN = hnList[i];
	appendBookmarkHN(i, HN);
  }
  lastHNListLen = len;
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
  let HN;
  for (let i=0 ; i<len ; i++) {
	HN = hnList[i];
	if (HN.id == bnId) { // Corresponding HistoryNode, update its row
	  let row = curRowList[i];
	  let cell = row.firstElementChild;
	  let bkmkitem = cell.firstElementChild;
	  let oldImg;
	  if (bkmkitem.classList.contains("bkmkitem_b")) {
		oldImg = bkmkitem.firstElementChild.nextElementSibling.nextElementSibling.nextElementSibling;
	  }
	  else { // bkmkitem_mb
		oldImg = bkmkitem.firstElementChild.nextElementSibling.nextElementSibling;
	  }
	  // Set image
	  let cn = oldImg.className;
	  if (uri == "/icons/nofavicon.png") {
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

	  // If row is in Node display, update it
	  if (cellHighlight == cell) {
		if (row.dataset.type != "urlist") {
		  displayHN(i);
		}
	  }
	}
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
  console.log("Background sent a response: <<"+msg+">> received in options");
}
	if (msg == "getStats") {
	}
	// -> Never happens from traces
//	else if (msg == "getCurHNList") { // Received curBNList content
//	  let json = message.json;
//	  curBNList = ...;
//	  curHNList = historyListDeserialize(json);
//
//	  f_initializeNext();
//	}
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
	{source: "options",
	 content: msg
	}
  ).then(handleMsgResponse, handleMsgError);
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
  console.log("Got message <<"+msg+">> from "+request.source+" in "+myWindowId);
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
			  displayHN(cellHighlight.parentElement.dataset.id);
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
	  else if (msg.startsWith("hnListAdd")) { // We are getting a new record appended to curHNList
		refreshHNList(curHNList.hnList); // This takes cre also of the Node display
		// Update undo/redo cursor
		setUndoRedoCursor();
	  }
	  else if (msg.startsWith("hnListClear")) { // History was cleared
 		// Reload ourselves
		window.location.reload();
	  }
	  else if (msg.startsWith("asyncFavicon")) { // Got a favicon uri to refresh
		let bnId = request.bnId;
		let uri = request.uri;
		refreshFavicon (curHNList.hnList, bnId, uri);
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

	  // Display the favicon
	  let row = curRowList[i];
	  let img;
	  if (HN.multi_HNref != undefined) {
		img = row.firstElementChild.firstElementChild.firstElementChild.nextElementSibling.nextElementSibling;
	  }
	  else {
		img = row.firstElementChild.firstElementChild.firstElementChild.nextElementSibling.nextElementSibling.nextElementSibling;
	  }
	  img.src = HN.faviconUri;
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
  HPane.addEventListener("keydown", keyHandler);

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
  Promise.all([p_platform, p_background, p_ffversion, p_getWindowId])
  .then(
	function (a_values) { // An array of one value per Promise is returned
	  p_platform = p_background = undefined;

	  // Retrieve values in the same order
	  platformOs = a_values[0].os; // info object
	  let page = a_values[1];

	  // In a private browsing window (incognito), this will be null -> Never happens from traces
//	  if (page != null) { // Not in a private browsing window
		backgroundPage = page;
//	  }

	  // Check FF version
	  let info = a_values[2];
	  ffversion = parseInt(info.version);
	  beforeFF57 = (ffversion < 57.0);
	  beforeFF58 = (ffversion < 58.0);
	  beforeFF60 = (ffversion < 60.0);
	  beforeFF63 = (ffversion < 63.0);

	  // Handle myWindowId
	  let windowInfo = a_values[3];
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