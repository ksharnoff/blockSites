// Creates new tab of settings.html
document.getElementById("settings").addEventListener("click", function() {
	chrome.tabs.create({ url: chrome.runtime.getURL("../settings.html")});
});


// Creates new tab of help.html 
document.getElementById("help").addEventListener("click", function() {
	chrome.tabs.create({ url: chrome.runtime.getURL("../help.html")});
});

// If click the "I changed timezones / recheck" button then set alarm to go
// off that background.js will hear and re-calculate who should be blocked
// now! 
// The alarm must have a minimum 30 seconds wait because chrome says so

let recheckButton = document.getElementById("recheck");

recheckButton.addEventListener("click", function() {
	recheckButton.innerHTML = "the button worked! wait 30 seconds...";
	console.log("popup demands manual recheck!");
	chrome.alarms.create("updateCurrentBlock", { 
		delayInMinutes: 0.5
	});
});


let blockAllButton = document.getElementById("blockAll");

// Creates alarm to tell background to block everything! 
blockAllButton.addEventListener("click", function() {
	blockAllButton.innerHTML = "the button worked! wait 30 seconds...";
	console.log("popup demands block all!!");
	

	// instead of making alarm,, what if just get from storage and then write? 
	// so then instantenous? or can just do it via alarms....
});