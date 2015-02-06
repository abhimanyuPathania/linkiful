
var LINKMAN = {
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
	allLinks: null,

	edit : false,
	editKey : null,
	newInput:false,
	reversed:false,
	filtered:false,
	tagsFiltered:[]
};

(function() {
	console.log("anon function");
	
	var linkmanJSON = localStorage.getItem("linkman");
	if (linkmanJSON) {
		LINKMAN.allLinks = JSON.parse(linkmanJSON);
	} else {
		LINKMAN.allLinks = {};
	}

	LINKMAN.save.addEventListener("mouseup", addLink, false);
	LINKMAN.clearStorage.addEventListener("mouseup", clearStorage, false);
	// two event handlers on cancel with same event
	LINKMAN.cancel.addEventListener("mouseup", cancelEdit, false);
	LINKMAN.cancel.addEventListener("mouseup", cancelNewInput, false);
	LINKMAN.restore.addEventListener("mouseup", restoreLinks, false);

	for (var i=0; i< LINKMAN.allLinkInputs.length; i += 1) {
		LINKMAN.allLinkInputs[i].addEventListener("input", setNewInput, false);
	}

	displayLinks(LINKMAN.allLinks);
}());

function addLink(e) {
	
	if (e.button !== 0) {
		return false;
	}

	var newLinkObj = {};
	newLinkObj.text = LINKMAN.textField.value;
	newLinkObj.url = LINKMAN.urlField.value;
	newLinkObj.tags = LINKMAN.tagsField.value.trim().toLowerCase(); //sanitize tags

	if(newLinkObj.text && newLinkObj.url) {
		
		newLinkObj.url = sanitizeURL(newLinkObj.url);
		if (LINKMAN.edit) {
			// if edit flag is set
			LINKMAN.allLinks[LINKMAN.editKey] = newLinkObj;
			//restore flags
			LINKMAN.edit = false;
			LINKMAN.editKey = null;
		} else {
			// else make a new key 
			LINKMAN.allLinks[Date.now()] = newLinkObj;
		}

		// disable cancel button
		if (!LINKMAN.cancel.classList.contains("disabled")) {
			LINKMAN.cancel.classList.add("disabled");
		}
		//remove newInput flag
		LINKMAN.newInput = false;
		updateStorage();
		clearLog();
		displayLinks(LINKMAN.allLinks);

	} else {
		LINKMAN.log.innerHTML = "please enter all fields";
		return false;
	}

}

function deleteLink(e) {
	if (e.button !== 0) {
		return false;
	}

	// don't allow delete if already editing some other link
	// or adding a new one
	if (LINKMAN.edit) {
		LINKMAN.log.innerHTML = "complete/cancel edit first";
		return false;
	}

	if (LINKMAN.newInput) {
		LINKMAN.log.innerHTML = "complete/cancel new input first";
		return false;
	}

	var key = this.getAttribute("data-key");
	delete LINKMAN.allLinks[key];
	updateStorage();
	displayLinks(LINKMAN.allLinks);
	clearLog();
	return false;
}

function editLink(e) {

	if (e.button !== 0) {
		return false;
	}
	clearLog();
	// if press edit after setting new input clear flag
	if (LINKMAN.newInput) {
		LINKMAN.newInput = false;
	}

	var key = this.getAttribute("data-key");
	LINKMAN.textField.value = LINKMAN.allLinks[key].text;
	LINKMAN.urlField.value = LINKMAN.allLinks[key].url;
	LINKMAN.tagsField.value = LINKMAN.allLinks[key].tags;

	//Enable cancel button
	if (LINKMAN.cancel.classList.contains("disabled")) {
			LINKMAN.cancel.classList.remove("disabled");
		}
	// scroll to the input fields and set focus on url field
	window.scrollTo(0,200);
	LINKMAN.urlField.focus();

	// set edit flag true so that addLink can handle this case too
	LINKMAN.edit = true; 
	LINKMAN.editKey = key;
	return true;
}

function cancelEdit(e) {
	if (e.button !== 0) {
		return false;
	}
	if(!LINKMAN.edit) {
		return false;
	}
	console.log("cancel edit");
	// clear input fields filled by editLink function and clear flags
	clearInputFields();
	LINKMAN.edit = false;
	LINKMAN.editKey = null;

	if (!LINKMAN.cancel.classList.contains("disabled")){
		LINKMAN.cancel.classList.add("disabled");
	}
	clearLog();
	return false;
}

function cancelNewInput(e) {
	
	if (e.button !== 0) {
		return false;
	}

	if (!LINKMAN.newInput) {
		return false;
	}
	console.log("cancel new input");
	//clear input fields and turn-off the flag
	clearInputFields();
	LINKMAN.newInput = false;
	if (!LINKMAN.cancel.classList.contains("disabled")){
		LINKMAN.cancel.classList.add("disabled");
	}
	clearLog();
	return false;
	
}

function setNewInput(e) {
	// if input is inserted due to edits return
	if (LINKMAN.edit) {
		return false;
	}
	LINKMAN.cancel.classList.remove("disabled");
	LINKMAN.newInput = true;
}

function filterTags(e) {

	if (e.button !== 0) {
		return false;
	}

	var tagName = this.getAttribute("data-tag");

	// set filtered flag
	LINKMAN.filtered = true;
	//if clicked tag already in tagsFiltered array- return
	if (LINKMAN.tagsFiltered.indexOf(tagName) !== -1) {
		return false;
	} else {
		//else push it
		LINKMAN.tagsFiltered.push(tagName);
	}
	
	var allKeys = Object.keys(LINKMAN.allLinks);
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
	var trackTagIndex = LINKMAN.tagsFiltered.indexOf(trackTagName);
	
	if (!LINKMAN.filtered && trackTagIndex === -1) {
		console.log("some flag or tag-name error");
	}

	LINKMAN.tagsFiltered.splice(trackTagIndex, 1);
	if (LINKMAN.tagsFiltered.length === 0) {
		
		if (!LINKMAN.trackTagsDiv.classList.contains("hidden")) {
			LINKMAN.trackTagsDiv.classList.add("hidden");
		}
		
		displayLinks(LINKMAN.allLinks);
		LINKMAN.filtered = false;

	} else {
		displayLinks(getFilterTagsKeys());
		createTrackTags();
	}



}

function getFilterTagsKeys() {

	var allKeys = Object.keys(LINKMAN.allLinks);
	var filteredKeys = allKeys.filter(function (v) {
		
		var tags = LINKMAN.allLinks[v].tags;
		var check = true;
		
		for (var i=0; i< LINKMAN.tagsFiltered.length; i += 1) {
			
			if (tags.indexOf(LINKMAN.tagsFiltered[i]) === -1) {
				check = false;
				break;
			}

		}
		return check;
	});

	return filteredKeys;
}

function sortDateReverse(e) {

	if (e.button !== 0) {
		return false;
	}

	var keys = Object.keys(LINKMAN.allLinks)
	
	if (!LINKMAN.reversed) {
		displayLinks(keys.reverse());
		LINKMAN.reversed = true;
	}
	else {
		displayLinks(keys);
		LINKMAN.reversed = false;
	}
	// disable cancel just in case
	if (!LINKMAN.cancel.classList.contains("disabled")){
		LINKMAN.cancel.classList.add("disabled");
	}

}

function restoreLinks(e) {
	if (e.button !== 0) {
		return false;
	}
	clearLog();
	var linkmanJson = prompt("Enter the saved text");
	if (linkmanJson === null) {
		return false;
	}
	if (linkmanJson === "") {
		linkmanJson = JSON.stringify({});
	}
	var confirmRestore = confirm("Restore overwrites all existing links. Confirm?\n" 
								+ "\nYou entered:\n" + linkmanJson + "\n\n");

	if (confirmRestore) {
		try {
			var linkmanJsonParsed = JSON.parse(linkmanJson);
		} catch(e) {
			LINKMAN.log.innerHTML = "invalid JSON entered";
			return false;
		}
		localStorage.setItem("linkman", linkmanJson);
		LINKMAN.allLinks = linkmanJsonParsed;
		displayLinks(LINKMAN.allLinks);
	} else {
		return false;
	}
	
}

function clearInputFields() {
	for(var i=0; i<LINKMAN.allLinkInputs.length; i++) {
		//clear input fields
		LINKMAN.allLinkInputs[i].value = "";
	}
}

function clearLog() {
	LINKMAN.log.innerHTML = "";
}

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
			LINKMAN.result.appendChild(linkDiv);
		}
		clearLog();

	} else{
		LINKMAN.result.innerHTML = "No links yet";
	}
	
}

function sanitizeURL(url) {
	var pattern = /^https?:\/\//;
	if (!pattern.test(url)) {
		url = "http://" + url;
	}
	return url;
}

function clearWrapper() {
	LINKMAN.result.innerHTML = "";
}

function updateStorage() {
	localStorage.setItem("linkman", JSON.stringify(LINKMAN.allLinks));
}

function clearStorage() {
	clearLog();
	var check = confirm("This will permanently delete all links.\nAre you sure?");
	if (check){
		localStorage.removeItem("linkman");
		LINKMAN.allLinks = {};
		displayLinks(LINKMAN.allLinks);
	} else{
		return false;
	}
	
}

function createLinkDiv(key) {
	
	var mainDiv = document.createElement("div");
	mainDiv.classList.add("link-div")
	mainDiv.classList.add("pink");

	var controlsDiv = document.createElement("div");
	controlsDiv.classList.add("link-controls-div");
	//controlsDiv.classList.add("clearfix"); testing clearfix
	
	var link = document.createElement("a");
	var linkText = document.createTextNode(LINKMAN.allLinks[key].text);
	link.appendChild(linkText);
	link.href = LINKMAN.allLinks[key].url;
	link.target = "_blank";
	
	var dateSpan = document.createElement("span");
	var dateArr = (new Date(parseInt(key, 10))).toDateString().split(" ");
	var dateText = dateArr[2] + ", " + dateArr[1] + " " + dateArr[3];
	dateSpan.appendChild(document.createTextNode(dateText));
	dateSpan.classList.add("pink");
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

	var tags = LINKMAN.allLinks[key].tags;
	var tagsArr = [];
	
	if(tags) {
		if (tags.indexOf(",") != -1) {
			tagsArr = tags.split(",");
		} else {
			tagsArr.push(tags);
		}
		for (var i=0; i<2 && i < tagsArr.length; i += 1) {

			var tagLink = document.createElement("a");
			var tagLinkText = tagsArr[i].trim(); // to handel white spaces after commas
			tagLink.appendChild(document.createTextNode(tagLinkText));
			//tagLink.href = "#";
			tagLink.setAttribute("data-tag", tagLinkText);
			tagLink.classList.add("tag");
			tagLink.addEventListener("mouseup", filterTags, false);
			controlsDiv.appendChild(tagLink);

		}

	}
	controlsDiv.appendChild(editControl);
	controlsDiv.appendChild(deleteControl);

	mainDiv.appendChild(link);
	mainDiv.appendChild(dateSpan);
	mainDiv.appendChild(controlsDiv);

	return mainDiv;
}

function createTrackTags () {
	
	LINKMAN.trackTagsDiv.innerHTML = "";
	
	if (LINKMAN.trackTagsDiv.classList.contains("hidden")) {
		LINKMAN.trackTagsDiv.classList.remove("hidden");
	}
	

	for (var i=0; i< LINKMAN.tagsFiltered.length; i += 1) {
		var trackTag = document.createElement("a");
		var trackTagText =LINKMAN.tagsFiltered[i];
		trackTag.appendChild(document.createTextNode(trackTagText));
		trackTag.setAttribute("data-tag", trackTagText);
		trackTag.classList.add("tag");
		trackTag.addEventListener("mouseup", removeTrackTag, false)

		LINKMAN.trackTagsDiv.appendChild(trackTag);
	}
}