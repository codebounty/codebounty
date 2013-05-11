chrome = chrome || {};
chrome.contentSettings = chrome.contentSettings || {};

// Called when the url of a tab changes.
function checkForValidUrl(tabId, changeInfo, tab) {
    // Check whether we are at the valid issue page
    var validUrlPattern = /https:\/\/github.com\/[^\/ \n\r]+\/[^\/ \n\r]+\/issues\/\d.*/i;

    if (validUrlPattern.test(tab.url)) {
        // ... show the page action.
        chrome.pageAction.show(tabId);
        // chrome.tabs.insertCSS(tabId, {file: "https://localhost/meteor/public/codebounty.css"});
        
        // Inject content scripts
        if (changeInfo.status === "loading") {
            chrome.tabs.executeScript(tabId, {
                "file": "jquery-1.9.1.min.js",
                "runAt": "document_end"
            });

            chrome.tabs.executeScript(tabId, {
                "file": "chromeContent.js",
                "runAt": "document_end"
            });
        }
    }
}

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForValidUrl);

// Add popup exception
chrome.contentSettings.popups.set({
    "primaryPattern": "https://github.com/*",
    "setting": "allow"
});