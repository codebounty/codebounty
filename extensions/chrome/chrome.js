// Called when the url of a tab changes.
function checkForValidUrl(tabId, changeInfo, tab) {
    // If the letter 'g' is found in the tab's URL...
    if (tab.url.indexOf("github.com/jperl/codebounty/issues/") > -1) {
        // ... show the page action.
        chrome.pageAction.show(tabId);
//        chrome.tabs.insertCSS(tabId, {file: "https://localhost/meteor/public/codebounty.css"});
    }
}

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForValidUrl);