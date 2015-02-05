
var LINKMAN = {
	allLinkInputs: document.querySelectorAll("#linkInputWrapper input[type=text]"),
	textField : document.querySelector("#text"),
	urlField : document.querySelector("#url"),
	tagsField : document.querySelector("#tags"),
	save : document.querySelector("#save"),
	cancel : document.querySelector("#cancel"),
	result: document.querySelector("#result"),
	log: document.querySelector("#log"),
	clearStorage : document.querySelector("#clearStorage"),
	backup : document.querySelector("#backup"),
	restore : document.querySelector("#restore"),
	allLinks: null,

	edit : false,
	editKey : null
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
	LINKMAN.cancel.addEventListener("mouseup", cancelEdit, false);
	LINKMAN.restore.addEventListener("mouseup", restoreLinks, false);

	displayLinks(LINKMAN.allLinks);
}());

function addLink(e) {
	
	if (e.button !== 0) {
		return false;
	}

	var newLinkObj = {};
	newLinkObj.text = LINKMAN.textField.value;
	newLinkObj.url = LINKMAN.urlField.value;
	newLinkObj.tags = LINKMAN.tagsField.value;

	if(newLinkObj.text && newLinkObj.url) {
		
		if (LINKMAN.edit) {
			// if edit flag is set
			LINKMAN.allLinks[LINKMAN.editKey] = newLinkObj;
			//restore flags
			LINKMAN.edit = false;
			LINKMAN.editKey = null;
			LINKMAN.cancel.classList.add("disabled");
		} else {
			// else make a new key 
			LINKMAN.allLinks[Date.now()] = newLinkObj;
		}

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
	if (LINKMAN.edit) {
		LINKMAN.log.innerHTML = "Please complete/cancel edit first";
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

	var key = this.getAttribute("data-key");
	LINKMAN.textField.value = LINKMAN.allLinks[key].text;
	LINKMAN.urlField.value = LINKMAN.allLinks[key].url;
	LINKMAN.tagsField.value = LINKMAN.allLinks[key].tags;

	//Enable cancel button
	LINKMAN.cancel.classList.remove("disabled");

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

	// clear input fields filled by editLink function and clear flags
	clearInputFields();
	LINKMAN.edit = false;
	LINKMAN.editKey = null;

	LINKMAN.cancel.classList.add("disabled");
	clearLog();
	return false;
}

function fliterTag(e) {

	if (e.button !== 0) {
		return false;
	}

	var tagName = this.getAttribute("data-tag");
	var allKeys = Object.keys(LINKMAN.allLinks).reverse();
	var filteredKeys = allKeys.filter(function (v) {
		var tags = LINKMAN.allLinks[v].tags;
		if (tags.indexOf(tagName) != -1) {
			return true;
		} else {
			return false;
		}
	});
	clearLog();
	displayLinks(filteredKeys);
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
		keys = Object.keys(ob).reverse();
	}
	
	if (keys.length > 0) {
		
		for(var i=0, len= keys.length; i<len; i += 1) {
			var linkDiv = createLinkDiv(keys[i]);
			LINKMAN.result.appendChild(linkDiv);
		}

	} else{
		LINKMAN.result.innerHTML = "No links yet";
	}
	
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
			var tagLinkText = tagsArr[i].trim().toLowerCase();
			tagLink.appendChild(document.createTextNode(tagLinkText));
			tagLink.href = "#";
			tagLink.setAttribute("data-tag", tagLinkText);
			tagLink.classList.add("tag");
			tagLink.addEventListener("mouseup", fliterTag, false);
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