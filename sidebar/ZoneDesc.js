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
// ZoneDesc class
//***************************************************
class ZoneDesc {
  // Constructor:
  //-------------
  // a_zone: an array of zones, with zone = [min index, max index] and min index <= max index, itself an array
  //   It is organized and maintained as an increasing list of zones with increasing indexes, and no overlap
  // zoneLen: integer, length of the array
  constructor () {
	this.a_zone = [];
	this.zoneLen = 0; 
  }

  // Method: clear (empty) the zone description
  clear() {
	if (this.zoneLen != 0) {
	  this.a_zone.length = this.zoneLen = 0;
	}
  }

  // Method: returns true if zone is empty
  isEmpty () {
	return(this.zoneLen == 0);
  }

  // Method: determines if an index is in the zone description = included in one of ts zones
  isInZone (index) {
	let is_inZone = false;
	let zone;
	for (let i=0 ; i<this.zoneLen ; i++) {
	  zone = this.a_zone[i];
	  if (index < zone[0]) { // index is before start of current zone, none after that will match
		break;
	  }
	  if (index <= zone[1]) { // index is inside current zone, we have a match, stop
		is_inZone = true;
		break;
	  }
	}
	return (is_inZone);
  }

  // Method: add a zone
  //-------------
  // minIndex, maxIndex: integer, index range to add to zone description
  add (minIndex, maxIndex) {
	// Find right place to insert or merge in a_zone
	if (this.zoneLen == 0) { // Add new zone as single component
	  this.zoneLen = this.a_zone.unshift([minIndex, maxIndex]);
	}
	else {
	  let i;
	  let zone, prevZone;
	  let nbPrevMerge = 0;
	  let prevMin, prevMax, nextMin, nextMax;
	  let is_endMerge = false;
	  // Search for insert/merge point
	  for (i=0 ; i<this.zoneLen ; i++) {
		zone = this.a_zone[i];
		if (maxIndex < (nextMin = zone[0])-1) { // maxIndex is before start of next zone and not in contact
		  break; // None after that will match
		}
		if (maxIndex <= (nextMax = zone[1])) { // maxIndex is inside current zone or in contact, merge added zone at end
		  is_endMerge = true;
		  break;
		}
		if (nbPrevMerge > 0) {
		  // One more previous zone to merge
		  nbPrevMerge++;
		}
		else if ((prevMax != undefined) && (minIndex <= prevMax+1)) { // Overlap or contact with previous zone at start
		  nbPrevMerge = 1;
		}
		else { // Move prevZone forward
		  prevMin = nextMin;
		  prevMax = nextMax;
		  prevZone = zone;
		}
	  }
	  // We found the insert/merge point
	  if (is_endMerge) { // Check if partial overlap/contact or full inclusion (if second, do nothing, we have it already)
		// Check if previous zone(s) to be joined also
		if (nbPrevMerge > 0) { // Yes, do a merge (prevMax necessarily has a value since nbPrevMerge > 0)
		  zone[0] = prevMin; // Extend next zone to include previous one(s) and added one
		  a_zone.splice(i-nbPrevMerge, nbPrevMerge); // Remove previous zone(s)
		  this.zoneLen -= nbPrevMerge;
		}
		else if (minIndex < nextMin) { // Simple partial overlap/contact at end with next zone, extend it to include added one
		  // Total a_zone length is untouched
		  zone[0] = minIndex;
		}
	  }
	  else { // No overlap/contact on end with next zone
		// Check if previous zone(s) to be joined
		if (nbPrevMerge > 1) { // Yes, several of them, do a merge (prevMax necessarily has a value since nbPrevMerge > 0)
		  prevZone[1] = maxIndex; // Extend start zoe of overlap/contact to include next one(s) and added one
		  a_zone.splice(i-nbPrevMerge+1, nbPrevMerge-1); // Remove intermediate zone(s)
		  this.zoneLen -= nbPrevMerge-1;
		}
		else if (nbPrevMerge == 1) { // Simple partial overlap/contact at start with previous zone, extend it to include added one
		  // Total a_zone length is untouched
		  prevZone[1] = maxIndex;
		}
		else { // Insert between previous and next zone
		  this.a_zone.splice(i, 0, [minIndex, maxIndex]);
		  this.zoneLen++;
		}
	  }
	}
  }
}


//***************************************************
// Functions to manipulate ZoneDesc class
//***************************************************
/*
 * Add BN to a zone description
 * 
 * zoneDesc = ZoneDesc describing zone to add to
 * bnId = Integer, id of BookmarkNode to add
 * BN = BookmarkNode to add
 */
function zoneAddBN (zoneDesc, bnId, BN) {
  let minRowIndex = curRowList[bnId].rowIndex;
  let maxRowIndex;
  if (BN.type == "folder") { // If folder, set the zone from folder to end of folder content
	// Find last child / grand child of BN (= itself if no child)
	let lastBN = BN_lastDescendant(BN);
	maxRowIndex = curRowList[lastBN.id].rowIndex; // Can be at end of bookmarks table
  }
  else {
	maxRowIndex = minRowIndex;
  }
  zoneDesc.add(minRowIndex, maxRowIndex);
}