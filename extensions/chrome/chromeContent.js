var contentUrl = function (file) {
    return chrome.extension.getURL("content/" + file);
};

var cssFiles = [
    "codebounty.css",
    "toggles.css",
    "toggles-github.css"
];

var link;
for (var i = 0; i < cssFiles.length; i++) {
    link = document.createElement("link");
    link.href = contentUrl(cssFiles[i]);
    link.type = "text/css";
    link.rel = "stylesheet";
    document.getElementsByTagName("head")[0].appendChild(link);
}

//Inject javascript - will probably want to squash all into one file someday.
var jsFiles = [
    "github.js",
    "toggles.min.js"
];

for (var i = 0; i < jsFiles.length; i++) {
    document.body.appendChild(document.createElement("script")).src = contentUrl(jsFiles[i]);
}