
var result = document.querySelector("#result");

if (localStorage.getItem("linkman")) {
	var backupText = document.createTextNode(localStorage.getItem("linkman"));
	result.appendChild(backupText);
} else {
	result.innerHTML = "<img src='http://i.memeful.com/media/post/PdW9kOM_700wa_0.gif'></img>"
}