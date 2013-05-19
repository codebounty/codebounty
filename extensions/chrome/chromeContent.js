//Inject css - will probably want to squash all into one file someday.
var css = [
    "https://localhost/meteor/public/codebounty.css",
    "https://localhost/meteor/public/toggles.css",
    "https://localhost/meteor/public/toggles-light.css"
];
var link;

for (var i = 0; i < css.length; i++) {
    link = document.createElement("link");
    link.href = css[i];
    link.type = "text/css";
    link.rel = "stylesheet";
    document.getElementsByTagName("head")[0].appendChild(link);
}

//Inject javascript - will probably want to squash all into one file someday.
var js = [
    "https://localhost/meteor/public/github.js",
    "https://localhost/meteor/public/toggles.min.js",
    "https://localhost/meteor/public/qrcode.js",
    "https://localhost/meteor/public/jquery.qrcode.js"
];

for (var i = 0; i < js.length; i++) {
    document.body.appendChild(document.createElement("script")).src = js[i];
}
