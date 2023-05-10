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
// OptionDesc class
//***************************************************
class OptionDesc {
  // Constructor:
  //-------------
  // storeName: String, the name by which the option is stored in the local store
  // type: Strin, "Boolean", "Integer", "String", "DOMString"
  // dflt: default value for the option
  constructor (storeName, type, dflt) {
	this.storeName = storeName;
	this.type = type;
	this.dflt = dflt;
  }

  // Method: read option value from result received from the local store, according to its type and default
  // res: result received from local store
  readValue (res) {
	let v = res[this.storeName];
	return(v == undefined ? this.dflt : v);
  }

  // Method: get default value
  // Returns the default value
  getDefault () {
	return(this.dflt);
  }

  // Method: verify the value against its type (Boolean, Integer, DOMString, DataURI, String)
  // v: value / object to check against verification rules
  // Returns true or false if verification is ok or ko.
  verifyValue (v) {
	let valid = false;
	switch (this.type) {
	  case "Boolean":
		valid = ((typeof v) == "boolean");
		break;
	  case "Integer":
		valid = ((typeof v) == "number");
		break;
	  case "DataURI":
		valid = ((typeof v) == "string") && v.startsWith("data:");
		break;
	  case "DOMString":
	  case "String":
		valid = ((typeof v) == "string");
		break;
	}
	return(valid);
  }
}


//***************************************************
// Functions to manipulate OptionDesc class
//***************************************************
