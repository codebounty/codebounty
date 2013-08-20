//replace requirejs default loading to support loading modules from inside the extension
//this does not handle shim order nicely so instead inside manifest.json we import all
//of the non-requirejs libs manually so that we can keep control of the deps order

require.load = function (context, moduleName, url) {
    var xhr;
    xhr = new XMLHttpRequest();
    xhr.open("GET", chrome.extension.getURL(url) + "?r=" + new Date().getTime(), true);
    xhr.onreadystatechange = function (e) {
        if (xhr.readyState === 4 && xhr.status === 200) {
            //sourceURL is needed for debugging in chrome
            eval(xhr.responseText + "\n//@ sourceURL=" + url);
            context.completeLoad(moduleName)
        }
    };
    xhr.send(null);
};