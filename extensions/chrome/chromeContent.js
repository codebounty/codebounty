//Inject javascript
var URL = "https://localhost/meteor/public/github.js";
document.body.appendChild(document.createElement("script")).src=URL;

//Inject css
var link = document.createElement("link");
link.href = "https://localhost/meteor/public/codebounty.css";
link.type = "text/css";
link.rel = "stylesheet";
document.getElementsByTagName("head")[0].appendChild(link);