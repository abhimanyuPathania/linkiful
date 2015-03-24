
(function () { 
// put the whole code in an anonymous function, (to sanitize namespace) and
// call it immediately

var LINKIFUL = {
	allLinkInputs: document.querySelectorAll("#linkInputWrapper input[type=text]"),
	textField : document.querySelector("#text"),
	urlField : document.querySelector("#url"),
	tagsField : document.querySelector("#tags"),
	save : document.querySelector("#save"),
	cancel : document.querySelector("#cancel"),

	searchInput : document.querySelector("#searchInput"),
	searchButton : document.querySelector("#searchButton"),
	tagSearchCheckBox: document.querySelector("#tagSearchCheckBox"),

	trackTagsDiv : document.querySelector("#trackTags"),
	result: document.querySelector("#result"),
	log: document.querySelector("#log"),
	clearStorage : document.querySelector("#clearStorage"),
	backup : document.querySelector("#backup"),
	restore : document.querySelector("#restore"),
	changeTheme: document.querySelector('#changeTheme'),

	// Working JS object initialized using JSON from localStorage
	allLinks: null,

	// LINKIFUL app state flags
	edit : false,
	editKey : null,
	newInput:false,
	reversed:false,
	filtered:false,
	tagsFiltered:[],
	theme: null
};

(function() {

	//this is the only function that runs on document load
	console.log("Welcome to linkiful"); // remove this
	
	var linkifulJSON = localStorage.getItem("linkiful");
	if (linkifulJSON) {
		LINKIFUL.allLinks = JSON.parse(linkifulJSON);
	} else {
		//first time usage
		LINKIFUL.allLinks = {};
	}

	// setup theme as soon as possible. Either get it from the localStorage or
	// set it to "pink" as the default
	LINKIFUL.theme = localStorage.getItem("linkifulTheme") || "pink";
	setupTheme();


	//register events
	LINKIFUL.save.addEventListener("mouseup", addLink, false);
	LINKIFUL.clearStorage.addEventListener("mouseup", clearStorage, false);

		// two event handlers on cancel with same event
	LINKIFUL.cancel.addEventListener("mouseup", cancelEdit, false);
	LINKIFUL.cancel.addEventListener("mouseup", cancelNewInput, false);

	LINKIFUL.searchButton.addEventListener("mouseup", linkSearch, false);
	LINKIFUL.tagSearchCheckBox.addEventListener("change", updatePlaceholder, false);
	LINKIFUL.changeTheme.addEventListener("mouseup", flipTheme,false);
	LINKIFUL.restore.addEventListener("mouseup", restoreLinks, false);

	for (var i=0; i< LINKIFUL.allLinkInputs.length; i += 1) {
		LINKIFUL.allLinkInputs[i].addEventListener("input", setNewInput, false);
	}

	//display the links
	displayLinks(LINKIFUL.allLinks);

}());





//******************************************* EVENT HANDLERS **************************************************//

function addLink(e) {

	/*
	This function is the core of this application's logic. Runs when user clicks the
	"save" button.
	
	//ADDING NEW LINK
	Every link which user saves is stored in an object with the properties
	"text", "url" and "tags". These, then, become consistent for every individual link
	object and we are able to mimic an object style database.

	This link object is then stored in the main "LINKIFUL.allLinks" object.
	Key in this case is the current time as returned by "Date.now()" function. Hence,
	every link object is a unique property of the "LINKIFUL.allLinks" object.

	"LINKIFUL.allLinks" object is the working buffer object which is deflated using "JSON.stringify" 
	and the returned JSON string is stored in localSotage with key "linkiful".
	
	//EDITING AN EXISTING LINK	
	This functions also handles link edits. If the edit flag, *"LINKIFUL.edit", 
	is true, instead of saving the new link object to "allLinks", we grab the *"LINKIFUL.editKey" 
	and overwrite the existing link object referred by the "LINKIFUL.editKey".

	*"LINKIFUL.edit" and "LINKIFUL.editKey" is set by the "editLink" function

	*/

	if (e.button !== 0) {
		return false;
	}

	//create new object and add the user input data to it.
	var newLinkObj = {};
	newLinkObj.text = LINKIFUL.textField.value;
	newLinkObj.url = LINKIFUL.urlField.value;
	newLinkObj.tags = sanitizeTagString(LINKIFUL.tagsField.value) || "no-tag";

	if(newLinkObj.text && newLinkObj.url) {
		
		newLinkObj.url = sanitizeURL(newLinkObj.url);
		if (LINKIFUL.edit) {
			// if edit flag is set
			LINKIFUL.allLinks[LINKIFUL.editKey] = newLinkObj;
			//restore flags
			LINKIFUL.edit = false;
			LINKIFUL.editKey = null;
		} else {
			// else make a new key 
			LINKIFUL.allLinks[Date.now()] = newLinkObj;
		}

		// disable cancel button
		if (!LINKIFUL.cancel.classList.contains("disabled")) {
			LINKIFUL.cancel.classList.add("disabled");
		}
		//remove newInput flag
		LINKIFUL.newInput = false;

		//save it to the localStorage
		updateStorage();
		clearLog();

		//preceeding logic is just to preserve the application's state

		// to see if it's filtered and see if new tags have been 
		// already set as filters
		if (LINKIFUL.filtered) {

			var checkNewTags = false;
			var newTagsArr = newLinkObj.tags.split(",");
			for (var i=0; i< newTagsArr.length;i += 1) {

				if (LINKIFUL.tagsFiltered.indexOf(newTagsArr[i]) !== -1) {
					checkNewTags = true;
					break;
				}

			}
			if (checkNewTags) {
				// new link added has a tag in the exsisting tags filtered list
				LINKIFUL.reversed ? displayLinks(getFilterTagsKeys().reverse()) : displayLinks(getFilterTagsKeys());
				return false;
			} else {
				// if filtered but new tags are not in tagsFiltered array
				LINKIFUL.filtered = false;
				LINKIFUL.tagsFiltered = [];
				if (!LINKIFUL.trackTagsDiv.classList.contains("hidden")) {
					LINKIFUL.trackTagsDiv.classList.add("hidden");			
				}			
			}
		}
		// no links filtered. So display all and if reversed? keep reversed
		LINKIFUL.reversed ? displayLinks(Object.keys(LINKIFUL.allLinks).reverse()) : displayLinks(LINKIFUL.allLinks);

	} else {
		//user did not enter link text or link url. Display error
		LINKIFUL.log.innerHTML = "please enter all fields";
		return false;
	}

}

function deleteLink(e) {

	if (e.button !== 0) {
		return false;
	}

	// don't allow delete if already editing some other link
	// or adding a new one
	var checkFlags = checkEditNewInputFlags();
	if (typeof checkFlags === "string" && checkFlags !== true) {

		LINKIFUL.log.innerHTML = checkFlags;
		return false;

	}

	var key = this.getAttribute("data-key");
	var displayKeys; //array of keys to links which are displayed after delete operation

	//delete the link from buffer "allLinks" object
	delete LINKIFUL.allLinks[key]; 

	//the update the localStorage
	updateStorage();
	
	//preceeding logic is to preserve the app state when diplaying after delete
	if (LINKIFUL.filtered) {

		displayKeys = getFilterTagsKeys();
		if (LINKIFUL.reversed) {
			//if reversed stay reversed by reversing in advance!!!
			displayKeys.reverse();
		}
		// if we delete all links in the current filters
		//clear filtered flags and display all links
		if (displayKeys.length === 0) {

			displayKeys = LINKIFUL.allLinks;
			LINKIFUL.filtered = false;
			LINKIFUL.tagsFiltered = [];
			
			if (!LINKIFUL.trackTagsDiv.classList.contains("hidden")) {
				//also remove the track tags
				LINKIFUL.trackTagsDiv.classList.add("hidden");
			}

		}
	} else {
		//not filtered, just display all
		displayKeys = LINKIFUL.allLinks;
	}

	displayLinks(displayKeys);
	clearLog();
	return false;
}

function editLink(e) {

	/* This function works in tandem with the "addLinks" function. All this does is
	set the edit flag and pass the relevent key via "LINKIFUL.editKey" property.
	Rest of it is handled by the "addLinks" function. */

	// fired on "mouseup" event of the "edit" button

	if (e.button !== 0) {
		return false;
	}
	clearLog();

	// if press edit after setting new input; clear the new input flag
	if (LINKIFUL.newInput) {
		LINKIFUL.newInput = false;
	}

	//the key of the link being edited is grabbed from the edit button itself
	var key = this.getAttribute("data-key");
	LINKIFUL.textField.value = LINKIFUL.allLinks[key].text;
	LINKIFUL.urlField.value = LINKIFUL.allLinks[key].url;
	LINKIFUL.tagsField.value = LINKIFUL.allLinks[key].tags;

	//Enable cancel button
	if (LINKIFUL.cancel.classList.contains("disabled")) {
			LINKIFUL.cancel.classList.remove("disabled");
		}
	// scroll to the input fields and set focus on url field
	LINKIFUL.urlField.focus();

	// set edit flag true so that addLink can handle this case too
	LINKIFUL.edit = true; 
	LINKIFUL.editKey = key;
	return true;
}

function cancelEdit(e) {

	if (e.button !== 0) {
		return false;
	}

	if(!LINKIFUL.edit) {
		//user clicks on the "cancel" button and we are not editing; return
		//this also takes care of the new input scenerio. Since same event is used for both cases
		return false;
	}

	// clear input fields filled by editLink function and clear flags
	clearInputFields();

	//clear flags
	LINKIFUL.edit = false;
	LINKIFUL.editKey = null;

	if (!LINKIFUL.cancel.classList.contains("disabled")){
		LINKIFUL.cancel.classList.add("disabled");
	}
	clearLog();
	return false;
}

function cancelNewInput(e) {
	
	if (e.button !== 0) {
		return false;
	}

	if (!LINKIFUL.newInput) {
		// handles the cancelEdit function that is fired for the same event
		return false;
	}

	//clear input fields and turn-off the flag, disable cancel
	clearInputFields();
	LINKIFUL.newInput = false;
	if (!LINKIFUL.cancel.classList.contains("disabled")){
		LINKIFUL.cancel.classList.add("disabled");
	}
	clearLog();
	return false;
	
}

function setNewInput(e) {
	// if input is inserted due to edits return
	if (LINKIFUL.edit) {
		return false;
	}

	// since "input" event fires right on focus(removing placeholder) in IE
	// only enable the "cancel" button if user actually has entered some data
	var enable = false;
	for (var i = 0, len = LINKIFUL.allLinkInputs.length; i<len; i += 1) {
		if (LINKIFUL.allLinkInputs[i].value.length > 0) {
			enable = true;
			break;
		}
	}
	if (enable) {
		LINKIFUL.cancel.classList.remove("disabled");
	}

	//set the newInput flag
	LINKIFUL.newInput = true;
}

function filterTags(e) {

	if (e && e.button !== 0) {
		return false;
	}

	var checkFlags = checkEditNewInputFlags();
	if (typeof checkFlags === "string" && checkFlags !== true) {

		//user should complete/cancel the new input/edit first
		LINKIFUL.log.innerHTML = checkFlags;
		return false;

	}

	// if came through tag click
	if (e) {

		var tagName = this.getAttribute("data-tag");
		// set filtered flag
		LINKIFUL.filtered = true;

		//if clicked tag already in tagsFiltered array- return
		if (LINKIFUL.tagsFiltered.indexOf(tagName) !== -1) {
			return false;
		} else {
			//else push it
			LINKIFUL.tagsFiltered.push(tagName);
		}
	}

	//after adding it to the "LINKIFUL.tagsFiltered" array, get relevent keys
	//and display them
	var filteredKeys = getFilterTagsKeys();
	clearLog();
	displayLinks(filteredKeys);
	
	if (filteredKeys.length > 0){
		//to solve the edge case for the tag search functionality.
		// if tag was searched and nothing is found don't created tag tracks
		createTrackTags();
	}
	
}

function removeTrackTag(e) {

	if (e.button !== 0) {
		return false;
	}

	//if user is editing or creating a new link; return
	var checkFlags = checkEditNewInputFlags();
	if (typeof checkFlags === "string" && checkFlags !== true) {
		LINKIFUL.log.innerHTML = checkFlags;
		return false;
	}

	var trackTagName = this.getAttribute("data-tag");
	var trackTagIndex = LINKIFUL.tagsFiltered.indexOf(trackTagName);
	
	if (!LINKIFUL.filtered && trackTagIndex === -1) {
		//for debug and stability
		console.log("some flag or tag-name error");
	}

	LINKIFUL.tagsFiltered.splice(trackTagIndex, 1);
	if (LINKIFUL.tagsFiltered.length === 0) {
		//when the last tag filter is removed
		if (!LINKIFUL.trackTagsDiv.classList.contains("hidden")) {
			LINKIFUL.trackTagsDiv.classList.add("hidden");
		}
		
		displayLinks(LINKIFUL.allLinks);
		LINKIFUL.filtered = false;

	} else {
		displayLinks(getFilterTagsKeys());
		createTrackTags();
	}
}

function sortDateReverse(e) {

	/* this function displays the older links first */

	if (e.button !== 0) {
		return false;
	}

	clearEditNewInputFlags();
	var keys;
	
	if (LINKIFUL.filtered) {
		// only reverse the filtered links
		keys = getFilterTagsKeys();
	} else{
		//all keys
		keys = Object.keys(LINKIFUL.allLinks);
	}

	//to toggle the reverse behaviour, we are using the flag "LINKIFUL.reversed" to preserver
	//the app state
	if (!LINKIFUL.reversed) {
		displayLinks(keys.reverse());
		LINKIFUL.reversed = true;
	}
	else {
		displayLinks(keys);
		LINKIFUL.reversed = false;
	}
	// disable cancel just in case
	if (!LINKIFUL.cancel.classList.contains("disabled")){
		LINKIFUL.cancel.classList.add("disabled");
	}

}

function restoreLinks(e) {

	if (e.button !== 0) {
		return false;
	}

	clearLog();

	var linkifulJson = prompt("Enter the saved text");
	if (linkifulJson === null) {
		//user presses cancel on the prompt
		return false;
	}
	if (linkifulJson === "") {
		//press "OK" without entering any data; we just use an empty object
		linkifulJson = JSON.stringify({});
	}

	var confirmRestore = confirm("Restore overwrites all existing links. Confirm?\n" 
								+ "\nYou entered:\n" + linkifulJson + "\n\n");
	if (confirmRestore) {

		try {
			//if JSON.parse causes an error, display log and return without touching localStorage
			var linkifulJsonParsed = JSON.parse(linkifulJson);
		} catch(e) {
			LINKIFUL.log.innerHTML = "invalid JSON entered";
			return false;
		}

		localStorage.setItem("linkiful", linkifulJson);
		LINKIFUL.allLinks = linkifulJsonParsed;
		clearAllflags();
		displayLinks(LINKIFUL.allLinks);

	} else {
		//user cancels the confirm
		return false;
	}
}

function clearStorage(e) {

	if (e.button !== 0) {
		return false;
	}

	clearLog();
	var check = confirm("This will permanently delete all links.\nAre you sure?");
	if (check){
		localStorage.removeItem("linkiful");
		LINKIFUL.allLinks = {};
		clearAllflags();
		displayLinks(LINKIFUL.allLinks);
	} else{
		return false;
	}
	
}

function flipTheme (e) {

	/* This function handles changing color schemes across the app. Runs on the "theme-contorl"
	button in the footer */
	if (e.button !== 0) {
			return false;
		}

	var colorQuery, shadeQuery

	//this is intialized in the beginning
	var currentTheme = LINKIFUL.theme;

	if( currentTheme === "pink") {
		colorQuery = ".pink"; //query strings for the document.QuerySelectorAll
		shadeQuery = ".light";
		// swith the active theme for next flip
		LINKIFUL.theme = "yellow";
		// remember in case of app close
		localStorage.setItem("linkifulTheme", "yellow");
		// change the button text
		LINKIFUL.changeTheme.innerHTML = "Use Light-theme";
	} else {
		colorQuery = ".yellow";
		shadeQuery = ".dark";
		LINKIFUL.theme = "pink";
		localStorage.setItem("linkifulTheme", "pink");
		LINKIFUL.changeTheme.innerHTML = "Use Dark-theme";
	}

	//select all the elements from the DOM with above classes 
	var colorElements = document.querySelectorAll(colorQuery);
	var shadeElements = document.querySelectorAll(shadeQuery);

	//flip classes
	for (var i = 0, len = colorElements.length; i < len; i += 1) {
		colorElements[i].classList.toggle("pink");
		colorElements[i].classList.toggle("yellow");
	}

	for (var i = 0, len = shadeElements.length; i < len; i += 1) {
		shadeElements[i].classList.toggle("light");
		shadeElements[i].classList.toggle("dark");
	}

}

function linkSearch (e) {

	if (e.button !== 0) {
			return false;
		}

	var searchedKeys, allKeys, searchString, searchStringArr, escapeWords;

	searchString = LINKIFUL.searchInput.value;
	if (searchString === "") {
		return false;
	}

	if (LINKIFUL.tagSearchCheckBox.checked) {

		var tagString = sanitizeTagString(searchString);
		// use the same process as done for filtering tags by click;
		LINKIFUL.filtered = true;
		LINKIFUL.tagsFiltered = tagString.split(",");
		filterTags();

	} else {

		// we are using text based search
		escapeWords = {"the":true, "is":true, "an":true, "a":true, "to":true, }; // improve this
		searchedKeys = [];
		allKeys = Object.keys(LINKIFUL.allLinks);
		searchStringArr = searchString.split(" ");

		for (var i = 0, len1 = searchStringArr.length; i < len1; i += 1) {

			if (searchStringArr[i] in escapeWords) {
				//console.log("escape word hit");
				continue;
			}

			for (var j = 0, len2 = allKeys.length; j < len2; j += 1) {
				
				var text = LINKIFUL.allLinks[allKeys[j]].text.toLowerCase();
				var	lookingFor = searchStringArr[i].toLowerCase();

				if (text.indexOf(lookingFor) !== -1) {
					searchedKeys.push(allKeys[j]);
				}
			}
		}

		searchedKeys =  removeDuplicates(searchedKeys);
		clearAllflags();
		LINKIFUL.trackTagsDiv.innerHTML = ""; // clear filter html if there;
		displayLinks(searchedKeys);
	}
}

function updatePlaceholder(e) {

	if (LINKIFUL.tagSearchCheckBox.checked) {
		LINKIFUL.searchInput.setAttribute("placeholder", "comma seperated tags");
	} else {
		LINKIFUL.searchInput.setAttribute("placeholder", "enter search text");
	}
}

//************************************ EVENT HANDLER HELPER FUNCTIONS *******************************************//

function displayLinks(ob) {

	/* This function handles all the display functionality of the app

	It can take both an object or an array as its argument to extract keys from it.
	After extracting the keys it calls "createLinkDiv" for each key which generates the markup
	*/

	//wipe out everything and display the markup again
	clearWrapper();

	clearInputFields();
	updatePlaceholder();
	
	var keys;
	if (Array.isArray(ob)) {
		keys = ob;
	} else {
		keys = Object.keys(ob);
	}
	// reverse to display newest first
	keys.reverse();

	if (keys.length > 0) {
		
		for(var i=0, len= keys.length; i<len; i += 1) {
			var linkDiv = createLinkDiv(keys[i]);
			LINKIFUL.result.appendChild(linkDiv);
		}
		clearLog();

	} else{
		var theme = LINKIFUL.theme;
		var noLinksDiv = document.createElement("div");
		noLinksDiv.classList.add("no-links");
		noLinksDiv.classList.add(theme);
		noLinksDiv.innerHTML =  "<p class='emoticon'>(-_-)</p>" + 
								"<p>No links</p>";

		LINKIFUL.result.appendChild(noLinksDiv);
	}
	
}

function setupTheme () {
	
	//if pink then don't do anything else, since markup is setup already for it
	if (LINKIFUL.theme === "pink") {
		LINKIFUL.changeTheme.innerHTML = "Use Dark-theme";
		return false;
	} 

	if (LINKIFUL.theme === "yellow") {
		var colorToToggle = document.querySelectorAll(".pink");
		var shadeToToggle = document.querySelectorAll(".light");

		for (var i = 0, len = colorToToggle.length; i < len; i += 1) {
			colorToToggle[i].classList.remove("pink");
			colorToToggle[i].classList.add("yellow");
		}

		for (var i = 0, len = shadeToToggle.length; i < len; i += 1) {
			shadeToToggle[i].classList.remove("light");
			shadeToToggle[i].classList.add("dark");
		}

		LINKIFUL.changeTheme.innerHTML = "Use Light-theme";
	}

}

function updateStorage() {
	localStorage.setItem("linkiful", JSON.stringify(LINKIFUL.allLinks));
}

function getFilterTagsKeys() {

	var allKeys = Object.keys(LINKIFUL.allLinks);
	var filteredKeys = allKeys.filter(function (v) {
		
		var tagsArr = LINKIFUL.allLinks[v].tags.split(",");

		/* here we are using the reverse logic. We set the check to false(hence not including that key)
		even if it does not has a single tag that is not contained in "LINKIFUL.TagsFiltered" array. 
		This creates an "AND" like logic for matching filtered tags and not an "OR". */
		var check = true;
		
		for (var i=0; i< LINKIFUL.tagsFiltered.length; i += 1) {
			
			if (tagsArr.indexOf(LINKIFUL.tagsFiltered[i]) === -1) {
				check = false;
				break;
			}
		}
		return check;
	});
	return filteredKeys;
}

function checkEditNewInputFlags() {
	
	if (LINKIFUL.edit === true && LINKIFUL.newInput === true) {
		console.log("strange edit/newInput BUG!! please check");
	}

	if (LINKIFUL.edit === true) {
		return "please complete/canel edit";
	}

	if (LINKIFUL.newInput === true) {
		return "please complete/canel newInput";
	}
	// return true only if both flags are clear
	return true;

}

function clearInputFields() {
	for(var i=0; i<LINKIFUL.allLinkInputs.length; i++) {
		//clear input fields
		LINKIFUL.allLinkInputs[i].value = "";
	}
	LINKIFUL.searchInput.value = "";
	LINKIFUL.tagSearchCheckBox.checked = false;
}

function clearWrapper() {
	LINKIFUL.result.innerHTML = "";
}

function clearLog() {
	LINKIFUL.log.innerHTML = "";
}

function clearEditNewInputFlags() {

	LINKIFUL.edit = false;
	LINKIFUL.newInput = false;
	LINKIFUL.editKey = null;

	clearInputFields();
	clearLog();

}

function clearAllflags() {
	
	LINKIFUL.edit = false;
	LINKIFUL.editKey = null;
	LINKIFUL.newInput = false;
	LINKIFUL.reversed = false;
	LINKIFUL.filtered = false;
	LINKIFUL.tagsFiltered = [];
	LINKIFUL.search = false;

}




//****************************************** HTML GENERATING FUNCTIONS ******************************************//

function createLinkDiv(key) {

	/* This function generates all the markup for the app. It is called by the "displayLinks" function
	with the link key string to the link object as an argument */
	var activeTheme = LINKIFUL.theme;
	
	var mainDiv = document.createElement("div");
	mainDiv.classList.add("link-div")
	mainDiv.classList.add(activeTheme); 

	var contentDiv = document.createElement("div");
	contentDiv.classList.add("content");
	contentDiv.classList.add("clearfix2");
	

	var controlsDiv = document.createElement("div");
	controlsDiv.classList.add("link-controls-div");
	controlsDiv.classList.add("clearfix1"); 
	
	
	var link = document.createElement("a");
	var linkText = document.createTextNode(LINKIFUL.allLinks[key].text);
	link.appendChild(linkText);
	link.href = LINKIFUL.allLinks[key].url;
	link.target = "_blank";
	
	var dateSpan = document.createElement("span");
	var dateArr = (new Date(parseInt(key, 10))).toDateString().split(" ");
	var dateText = dateArr[2] + ", " + dateArr[1] + " " + dateArr[3];
	dateSpan.appendChild(document.createTextNode(dateText));
	dateSpan.addEventListener("mouseup", sortDateReverse, false);
	
	//we add the key string as a data-key attribute to the "Delete" and "Edit" buttons
	//this attribute is then used by the "editLink" and "deleteLink" function.
	var deleteControl = document.createElement("button");
	deleteControl.setAttribute("data-key", key);
	deleteControl.addEventListener("mouseup", deleteLink, false);
	deleteControl.classList.add("control");

	var editControl = document.createElement("button");
	editControl.setAttribute("data-key", key);
	editControl.addEventListener("mouseup", editLink, false);
	editControl.classList.add("control");

	if (activeTheme === "pink") {
		editControl.classList.add("light");
		deleteControl.classList.add("light");
	} else {
		editControl.classList.add("dark");
		deleteControl.classList.add("dark");
	}
	

	deleteControl.appendChild(document.createTextNode("Delete"));
	editControl.appendChild(document.createTextNode("Edit"));

	var tagSpan = document.createElement("span");
	var tags = LINKIFUL.allLinks[key].tags;
	var tagsArr = tags.split(",");
	
		for (var i=0; i<tagsArr.length; i += 1) {

			var tagLink = document.createElement("a");
			var tagLinkText = tagsArr[i];
			tagLink.appendChild(document.createTextNode(tagLinkText));
			tagLink.setAttribute("data-tag", tagLinkText);
			tagLink.classList.add("tag");
			tagLink.addEventListener("mouseup", filterTags, false);
			tagSpan.appendChild(tagLink);

		}

	controlsDiv.appendChild(tagSpan);
	controlsDiv.appendChild(editControl);
	controlsDiv.appendChild(deleteControl);
	
	
	contentDiv.appendChild(link);
	contentDiv.appendChild(dateSpan);
	mainDiv.appendChild(contentDiv);
	mainDiv.appendChild(controlsDiv);

	return mainDiv;
}

function createTrackTags () {
	
	var activeTheme = LINKIFUL.theme;
	LINKIFUL.trackTagsDiv.innerHTML = "";
	
	if (LINKIFUL.trackTagsDiv.classList.contains("hidden")) {
		LINKIFUL.trackTagsDiv.classList.remove("hidden");
	}
	var span = document.createElement("span");
	var spanText;
	if (window.innerWidth < 1000) {
		spanText = "Tags filtered (tap to remove):";
	} else {
		spanText = "Tags filtered (click to remove):";
	}
	span.appendChild(document.createTextNode(spanText));
	LINKIFUL.trackTagsDiv.appendChild(span);

	for (var i=0; i< LINKIFUL.tagsFiltered.length; i += 1) {
		var trackTag = document.createElement("a");
		var trackTagText =LINKIFUL.tagsFiltered[i];
		trackTag.appendChild(document.createTextNode(trackTagText));
		trackTag.setAttribute("data-tag", trackTagText);
		trackTag.classList.add("tag");
		trackTag.classList.add(activeTheme);
		trackTag.addEventListener("mouseup", removeTrackTag, false)

		LINKIFUL.trackTagsDiv.appendChild(trackTag);
	}
}




//**************************************** GENERAL HELPER FUNCTIONS ****************************************//

function sanitizeURL(url) {

	var pattern = /^https?:\/\//;
	if (!pattern.test(url)) {
		url = "http://" + url;
	}
	return url;
}

function sanitizeTagString(tags) {

	var tagsArr = tags.split(",");

	tagsArr.forEach(function(v,i,a) {

	    a[i] = a[i].replace(/^\s+/, "");
    	a[i] = a[i].replace(/\s+$/, "");
	});
	tagsArr = tagsArr.filter(function(v) {
		//fliter also removes sparse arrays and result is always dense
	   return v ? true:false;
	});

	return removeDuplicates(tagsArr).join(",").toLowerCase();
}

function removeDuplicates(arr) {

    var seen = {};
    arr = arr.filter(function(v) {
       if (seen.hasOwnProperty(v)) {
           return false;
       } else {
           seen[v] = true;
           return true;
       }
    });
    return arr
}

}()); // end and run the anonymous wrapper