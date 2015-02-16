
(function () {

var result = document.querySelector("#result");
var theme = localStorage.getItem("linkifulTheme") || "pink";
setupTheme(theme);
if (localStorage.getItem("linkiful")) {
	var backupText = document.createTextNode(localStorage.getItem("linkiful"));
	result.appendChild(backupText);
} else {
	result.innerHTML = "<img src='http://i.memeful.com/media/post/PdW9kOM_700wa_0.gif' alt='ahahaha NO!'></img>" +
						"<p>Nothing to backup!</p>";
}



function setupTheme (myTheme) {
	
	if (myTheme === "pink") {
		return false;
	} 

	if (myTheme === "yellow") {
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

	}

}

}());