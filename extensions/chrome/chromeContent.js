//Inject css - will probably want to squash all into one file someday.

//TODO uncomment for deployment
// var publicUrl = "https://app.codebounty.co/";
var publicUrl = "https://localhost:8888/meteor/public/"; //locally we use the node server because it is https

var css = [
    publicUrl + "codebounty.css",
    publicUrl + "toggles.css",
    publicUrl + "toggles-github.css"
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
    publicUrl + "github.js",
    publicUrl + "toggles.min.js"
];

for (var i = 0; i < js.length; i++) {
    document.body.appendChild(document.createElement("script")).src = js[i];
}
