TL = TLog.getLogger();

//log all client errors
window.onerror = function (message, url, lineNumber) {
    TL.error(message + " " + url + ":" + lineNumber, "Client");
    return true;
};