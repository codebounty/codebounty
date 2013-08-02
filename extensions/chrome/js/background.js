chrome = chrome || {};
chrome.contentSettings = chrome.contentSettings || {};

// Called when the url of a tab changes
function checkForValidUrl(tabId, changeInfo, tab) {
    // if we are at a valid issue page
    var validUrlPattern = /https:\/\/github.com\/[^\/ \n\r]+\/[^\/ \n\r]+\/issues\/\d.*/i;

    // show the page action
    if (validUrlPattern.test(tab.url))
        chrome.pageAction.show(tabId);
}

// Listen for any changes to the URL of any tab
chrome.tabs.onUpdated.addListener(checkForValidUrl);

// Prevent our popup from getting hidden
chrome.contentSettings.popups.set({
    "primaryPattern": "https://github.com/*",
    "setting": "allow"
});