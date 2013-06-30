//log all uncaught client errors
window.onerror = function (message, url, lineNumber) {
    TL.error(message + " " + url + ":" + lineNumber, Modules.Client);
    return true;
};