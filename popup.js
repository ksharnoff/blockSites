// Listener to settings button, if pressed creates new tab of settings.html
document.getElementById("settings").addEventListener("click", function() {
	chrome.tabs.create({ url: chrome.runtime.getURL("../settings.html")});
});

// Listener to help button, if pressed creates new tab of help.html for 
// help inforamtion
document.getElementById("help").addEventListener("click", function() {
	chrome.tabs.create({ url: chrome.runtime.getURL("../help.html")});
});