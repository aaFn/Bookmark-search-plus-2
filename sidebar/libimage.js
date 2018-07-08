'use strict';


/*
 * Constants
 */
//x-icon signatures .. Cf. https://mimesniff.spec.whatwg.org/#image-type-pattern-matching-algorithm
const XIconSignature1 = String.fromCharCode(0, 0, 1, 0);
const XIconSignature2 = String.fromCharCode(0, 0, 2, 0);


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
 * Select closest x-icon image as possible to 16x16, and return it
 * as an Uint8ClampedArray
 * 
 * uri = a data:image/x-icon base64 string describing the image
 * 
 * Returns null if no choice to make (or wrong format),
 * or an uri with a data:image/x-icon base64 string containing only the selected image
 */
function selectXIconImg (uri) {
  let pos = uri.indexOf("base64,");
  if (pos == -1) {
//    console.log("not an x-icon: "+uri);
	return(null);
  }
  let str = atob(uri.slice(pos+7)); // Get the binary part

  // Explore structure, as docupmented here: https://en.wikipedia.org/wiki/ICO_(file_format)
//  console.log("str.length: "+str.length);
  // Do a bit of verifications on structure as sometimes the mime type doesn't correspond
  // to contents !!
  let header = str.slice(0,4); 
  if ((header != XIconSignature1) && (header != XIconSignature2)) {
//    console.log("not an x-icon: "+uri);
	return(null);
  }
//  console.log("x-icon: "+uri);

  // First get the npmber of images
  let nbImg = str.charCodeAt(4) + str.charCodeAt(5) * 256;
//  console.log("  nbImg: "+nbImg);
  if (nbImg == 1) {
	return(null);
  }

  // Now go through the image directory to find the closest one
  let index = 6; // Start of first image entry
  const entryLen = 16; // Length of an image entry
  let selEntry, selSize, selOffset, selNbColors, height, width, nbColors, distance;
  let selH = 512; // Arbitrary big number above 256 which is the max size
  let selW = 512;
  let selDist = (selH - 16) * (selH - 16) + (selW - 16) * (selW - 16);
  let selIDData;
  for (let i=0 ; i<nbImg ; i++,index+=entryLen) {
	// Get image size
	width = str.charCodeAt(index);
	if (width == 0)   width = 256;
	height = str.charCodeAt(index+1);
	if (height == 0)   height = 256;
//    console.log("  width,height: "+width+","+height);

	// Compare with last one selected in terms of distance to 16,16
    distance = (height - 16) * (height - 16) + (width - 16) * (width - 16);
    nbColors = str.charCodeAt(index+2);
    if (nbColors == 0)   nbColors = 256;
//    console.log("  distance,selDist,nbColors,selNbColors: "+distance+","+selDist+","+nbColors+","+selNbColors);
	if ((distance < selDist)
		|| ((distance == selDist) && (nbColors > selNbColors))
	   ) {
	  selEntry = index;
	  selDist = distance;
	  selH = height;
	  selW = width;
	  selNbColors = nbColors;
//      console.log("  selected: "+selW+","+selH+","+selNbColors);
	  selSize = str.charCodeAt(index+8)
                + str.charCodeAt(index+9) * 256
                + str.charCodeAt(index+10) * 65536
                + str.charCodeAt(index+11) * 16777216;
	  selOffset = str.charCodeAt(index+12)
	              + str.charCodeAt(index+13) * 256
	              + str.charCodeAt(index+14) * 65536
	              + str.charCodeAt(index+15) * 16777216;
//      console.log("  size,offset: "+selSize+","+selOffset);
	}
  }

  // Allocate array to hold selected image, and fill it with data
  // Rebuild header
  selIDData = new Uint8ClampedArray(selSize+22);
  selIDData[0] = selIDData[1] = selIDData[5] = selIDData[19] = selIDData[20] = selIDData[21] = 0;
  selIDData[2] = str.charCodeAt(2); // Keep same type as src image
  selIDData[3] = str.charCodeAt(3);
  selIDData[4] = 1; // 1 image
  // Recopy image entry except offset which will change
  index = selEntry;
  for (let i=6 ; i<18 ; i++,index++) {
    selIDData[i] = str.charCodeAt(index);
  }
  selIDData[18] = 22;
  index = selOffset;
  let end = 22+selSize;
  for (let i=22 ; i<end ; i++,index++) {
	selIDData[i] = str.charCodeAt(index);
//    console.log("  src,clamped: "+selIDData[i]+","+str.charCodeAt(index));
  }
//  console.log("  selected: "+selW+","+selH);

  // Return result as an uri
  // See https://stackoverflow.com/questions/6965107/converting-between-strings-and-arraybuffers
  //   for the fastest method to convert an array to a string ... :-)
  //   then used in btoa()
  uri = "data:image/x-icon;base64,"
	    + btoa(String.fromCharCode.apply(null, selIDData));
/*
  uri = "data:image/x-icon;base64,";
  let incr = 1024;
  str = "";
  for(let i=0 ; i<end ; i+=incr){
    if (i + incr > end){
      incr = end - i;
    }
    str += String.fromCharCode.apply(null, selIDData.subarray(i,i+incr));
  }  
  uri += btoa(String.fromCharCode.apply(null, str));
*/
/*
console.log("  uri: "+uri);
str = atob(uri.slice(25));
console.log("str.length: "+str.length);
console.log("reserved0: "+str.charCodeAt(0));
console.log("reserved1: "+str.charCodeAt(1));
console.log("type0: "+str.charCodeAt(2));
console.log("type1: "+str.charCodeAt(3));
console.log("#images0: "+str.charCodeAt(4));
console.log("#images1: "+str.charCodeAt(5));
console.log("width: "+str.charCodeAt(6));
console.log("height: "+str.charCodeAt(7));
console.log("colors: "+str.charCodeAt(8));
console.log("reserved: "+str.charCodeAt(9));
console.log("cplanes0: "+str.charCodeAt(10));
console.log("cplanes1: "+str.charCodeAt(11));
console.log("bperpixel0: "+str.charCodeAt(12));
console.log("bperpixel1: "+str.charCodeAt(13));
console.log("size0: "+str.charCodeAt(14));
console.log("size1: "+str.charCodeAt(15));
console.log("size2: "+str.charCodeAt(16));
console.log("size3: "+str.charCodeAt(17));
console.log("offset0: "+str.charCodeAt(18));
console.log("offset1: "+str.charCodeAt(19));
console.log("offset2: "+str.charCodeAt(20));
console.log("offset3: "+str.charCodeAt(21));
*/
  return(uri);
}

/*
 * Our own 16x16 downscaling algorithm ..
 * 
 * srcIDData = an ImageData of source
 * tgtIDData = a 16x16 ImageData at target
 * nh = Integer, natural height
 * nw = Integer, natural width
 */
function downscaleImg (srcIDData, tgtIDData, nh, nw) {
  let rowsize = nw * 4;
  let sx = nw / 16.0;
  let sy = nh / 16.0;
  let sxy = sx * sy;
//  console.log("sx: "+sx+" sy: "+sy+" sxy: "+sxy);
  let px; // Start of square to average
  let py = 0.0;
  let psx, psy; // End of square to average
  let pxInt, pyInt, psxInt, psyInt; // Smallest bounding square in integer coordinates
  let psxInt_1, psyInt_1; // psxInt and psyInt minus 1 when psx and psy are not integers
  let i, j;
  let pxTmp, pyTmp;
  let r, g, b, a, avgR, avgG, avgB, avgA; // Average per channel
  let wx, wy, wxy; // Weights to apply to each point
//let swx, swy;
  let waxay, swaxay;
  let srcIndex;
  let tgtIndex = 0;
  for (j=0 ; j<16 ; j++,py=psy) { // Go through each target point (i,j)
    psy = py + sy;
    pyInt = Math.trunc(py);
	psyInt = psyInt_1 = Math.trunc(psy);
	if (psyInt < psy)   psyInt++;
	px = 0.0;
	for (i=0 ; i<16 ; i++,px=psx) {
	  psx = px + sx;
	  pxInt = Math.trunc(px);
	  psxInt = psxInt_1 = Math.trunc(psx);
	  if (psxInt < psx)   psxInt++;
/*
if (py < 2)
console.log("px,py,psx,psy: "+px+","+py+","+psx+","+psy+",");
if (py < 2)
console.log("pxInt,pyInt,psxInt,psyInt: "+pxInt+","+pyInt+","+psxInt+","+psyInt+",");
swy = 0;
*/
	  // One pixel in target image corresponds to a square (px,py,psx,psy) of pixels at source
	  // Do an average of that square.
	  // Note: IDData objects are Uint8ClampedArray in RGBA order (4 bytes each pixel)
      swaxay = avgR = avgG = avgB = avgA = 0;
	  // Go through each point in (pxInt,pyInt,psxInt,psyInt)
	  for (pyTmp=pyInt ; pyTmp<psyInt ; pyTmp++) {
		srcIndex = pyTmp*rowsize + pxInt*4;
		if (pyTmp == pyInt) {
		  wy = pyInt + 1 - py;  
		}
		else if (pyTmp == psyInt_1) {
		  wy = psy - psyInt_1;
		}
		else {
		  wy = 1;
		}
//swy += wy;
//swx = 0;
		for (pxTmp=pxInt ; pxTmp<psxInt ; pxTmp++) {
		  if (pxTmp == pxInt) {
		    wx = pxInt + 1 - px;  
		  }
		  else if (pxTmp == psxInt_1) {
			wx = psx - psxInt_1;
		  }
		  else {
			wx = 1;
		  }
//swx += wx;
          r = srcIDData[srcIndex++];
          g = srcIDData[srcIndex++];
          b = srcIDData[srcIndex++];
          a = srcIDData[srcIndex++];
		  wxy = wx * wy;
          // Account for transparency in the weighted sum
		  waxay = wx * a / 255 * wy * a / 255;
		  swaxay += waxay;
		  avgR += r * waxay;
		  avgG += g * waxay;
		  avgB += b * waxay;
		  avgA += a * wxy;
//if (py < 2)
//console.log("wx,wy,wxy,waxay,R,G,B,A: "+wx+","+wy+","+wxy+","+waxay+","+avgR+","+avgG+","+avgB+","+avgA+",");
		}
//if (py < 2)
//console.log("swx: "+swx);
	  }
//if (py < 2)
//console.log("swy: "+swy);
/*
	  // Take the closest pixel to center of the square (px,py,psx,psy)
	  pyTmp = py + sy / 2;
	  pxTmp = px + sx / 2;
	  pyInt = Math.round(pyTmp);
	  pxInt = Math.round(pxTmp);
	  srcIndex = pyInt*rowsize + pxInt*4;
	  avgR = srcIDData[srcIndex++];
	  avgG = srcIDData[srcIndex++];
	  avgB = srcIDData[srcIndex++];
	  avgA = srcIDData[srcIndex];
	  sxy = 1;
*/
//console.log("swaxay,sxy,swxy: "+swaxay+","+sxy+","+swx*swy);
      if (swaxay == 0) {
  	    tgtIDData[tgtIndex++] = 0;
	    tgtIDData[tgtIndex++] = 0;
	    tgtIDData[tgtIndex++] = 0;
	    tgtIDData[tgtIndex++] = avgA / sxy;
      }
      else {
	    tgtIDData[tgtIndex++] = avgR / swaxay;
	    tgtIDData[tgtIndex++] = avgG / swaxay;
	    tgtIDData[tgtIndex++] = avgB / swaxay;
	    tgtIDData[tgtIndex++] = avgA / sxy;
      }
	}
  }
}