
(function () {

// REMOVE THIS!
console.log("The anonymoussss wrapper"); 

var LINKIFUL = {
	allLinkInputs: document.querySelectorAll("#linkInputWrapper input[type=text]"),
	textField : document.querySelector("#text"),
	urlField : document.querySelector("#url"),
	tagsField : document.querySelector("#tags"),
	save : document.querySelector("#save"),
	cancel : document.querySelector("#cancel"),
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
	tagsFiltered:[]
};

(function() {

	//this is the only function that runs on document load
	console.log("anon function"); // remove this
	
	var linkifulJSON = localStorage.getItem("linkiful");
	if (linkifulJSON) {
		LINKIFUL.allLinks = JSON.parse(linkifulJSON);
	} else {
		LINKIFUL.allLinks = {};
	}

	LINKIFUL.save.addEventListener("mouseup", addLink, false);
	LINKIFUL.clearStorage.addEventListener("mouseup", clearStorage, false);

	// two event handlers on cancel with same event
	LINKIFUL.cancel.addEventListener("mouseup", cancelEdit, false);
	LINKIFUL.cancel.addEventListener("mouseup", cancelNewInput, false);
	LINKIFUL.changeTheme.addEventListener("mouseup", flipTheme,false);
	LINKIFUL.restore.addEventListener("mouseup", restoreLinks, false);

	for (var i=0; i< LINKIFUL.allLinkInputs.length; i += 1) {
		LINKIFUL.allLinkInputs[i].addEventListener("input", setNewInput, false);
	}

	displayLinks(LINKIFUL.allLinks);
}());

// EVENT HANDLERS

function addLink(e) {
	
	if (e.button !== 0) {
		return false;
	}

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
		updateStorage();
		clearLog();

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
		// or display all // if reversed? keep reversed
		LINKIFUL.reversed ? displayLinks(Object.keys(LINKIFUL.allLinks).reverse()) : displayLinks(LINKIFUL.allLinks);

	} else {
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
	var displayKeys;
	delete LINKIFUL.allLinks[key];
	updateStorage();
	
	if (LINKIFUL.filtered) {

		displayKeys = getFilterTagsKeys();
		//if reversed stay reversed!!!
		if (LINKIFUL.reversed) {
			displayKeys.reverse();
		}
		// if we delete all links in the current filters
		//clear filtered flags and display all links
		if (displayKeys.length === 0) {

			displayKeys = LINKIFUL.allLinks;
			LINKIFUL.filtered = false;
			LINKIFUL.tagsFiltered = [];
			
			if (!LINKIFUL.trackTagsDiv.classList.contains("hidden")) {
				LINKIFUL.trackTagsDiv.classList.add("hidden");
			}

		}
	} else {
		displayKeys = LINKIFUL.allLinks;
	}

	displayLinks(displayKeys);
	clearLog();
	return false;
}

function editLink(e) {

	if (e.button !== 0) {
		return false;
	}
	clearLog();
	// if press edit after setting new input clear flag
	if (LINKIFUL.newInput) {
		LINKIFUL.newInput = false;
	}

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
		return false;
	}

	// clear input fields filled by editLink function and clear flags
	clearInputFields();
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
	LINKIFUL.cancel.classList.remove("disabled");
	LINKIFUL.newInput = true;
}

function filterTags(e) {

	if (e.button !== 0) {
		return false;
	}

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
	
	var allKeys = Object.keys(LINKIFUL.allLinks);
	var filteredKeys = getFilterTagsKeys();
	clearLog();
	displayLinks(filteredKeys);
	createTrackTags();
}

function removeTrackTag(e) {

	if (e.button !== 0) {
		return false;
	}

	var trackTagName = this.getAttribute("data-tag");
	var trackTagIndex = LINKIFUL.tagsFiltered.indexOf(trackTagName);
	
	if (!LINKIFUL.filtered && trackTagIndex === -1) {
		console.log("some flag or tag-name error"); //remove this later
	}

	LINKIFUL.tagsFiltered.splice(trackTagIndex, 1);
	if (LINKIFUL.tagsFiltered.length === 0) {
		
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

	if (e.button !== 0) {
		return false;
	}

	clearEditNewInputFlags();
	var keys;
	
	if (LINKIFUL.filtered) {
		keys = getFilterTagsKeys();
	} else{
		keys = Object.keys(LINKIFUL.allLinks);
	}

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
		return false;
	}
	if (linkifulJson === "") {
		linkifulJson = JSON.stringify({});
	}

	var confirmRestore = confirm("Restore overwrites all existing links. Confirm?\n" 
								+ "\nYou entered:\n" + linkifulJson + "\n\n");
	if (confirmRestore) {

		try {
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

	if (e.button !== 0) {
			return false;
		}

	console.log("flip theme function");
	var pinkElements = document.querySelectorAll(".pink");
	for (var i = 0, len = pinkElements.length; i < len; i += 1) {
		pinkElements[i].classList.remove("pink");
	}

}

//------------------------ EVENT HANDLER HELPER FUNCTIONS ------------------------//

function displayLinks(ob) {
	clearWrapper();
	clearInputFields();
	
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
		LINKIFUL.result.innerHTML = "No links yet";
	}
	
}

function updateStorage() {
	localStorage.setItem("linkiful", JSON.stringify(LINKIFUL.allLinks));
}

function getFilterTagsKeys() {

	var allKeys = Object.keys(LINKIFUL.allLinks);
	var filteredKeys = allKeys.filter(function (v) {
		
		var tags = LINKIFUL.allLinks[v].tags;
		var check = true;
		
		for (var i=0; i< LINKIFUL.tagsFiltered.length; i += 1) {
			
			if (tags.indexOf(LINKIFUL.tagsFiltered[i]) === -1) {
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

}

// HTML GENERATING FUNCTIONS

function createLinkDiv(key) {
	
	var mainDiv = document.createElement("div");
	mainDiv.classList.add("link-div")
	mainDiv.classList.add("pink");

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
	
	var deleteControl = document.createElement("button");
	deleteControl.setAttribute("data-key", key);
	deleteControl.addEventListener("mouseup", deleteLink, false);
	deleteControl.classList.add("control");

	var editControl = document.createElement("button");
	editControl.setAttribute("data-key", key);
	editControl.addEventListener("mouseup", editLink, false);
	editControl.classList.add("control");

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
		trackTag.classList.add("pink");
		trackTag.addEventListener("mouseup", removeTrackTag, false)

		LINKIFUL.trackTagsDiv.appendChild(trackTag);
	}
}

//GENERAL HELPER FUNCTIONS

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

}());