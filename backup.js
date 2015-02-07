
var result = document.querySelector("#result");

if (localStorage.getItem("linkiful")) {
	var backupText = document.createTextNode(localStorage.getItem("linkiful"));
	result.appendChild(backupText);
} else {
	result.innerHTML = "<img src='http://i.memeful.com/media/post/PdW9kOM_700wa_0.gif' alt='ahahaha NO!'></img>"
}