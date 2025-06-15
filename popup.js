/*
	MIT License
	Copyright (c) 2025 Kezia Sharnoff

	- blockSites Chrome Extension
	- popup.js
	Functionality for the buttons in the popup. The ones that just open pages do,
	the ones that are more complicated (blockAll, pause, recheck) send a message
	to background.js to do those tasks. 
*/


import { getConfig, swapClicked } from "./sharedFunctions.js";

let errorMessage = document.getElementById("errorMessage");

// on window load, set up the correct text for the block all button
// and create the event listener for that button
window.addEventListener("load", function() {
	getConfig()
	.then(function (value) {
		let blockAllButton = document.getElementById("blockAll");

		if (value.blockAll) {
			blockAllButton.className = "selected";
			blockAllButton.innerHTML = "on";
		} else {
			blockAllButton.className = "unselected";
			blockAllButton.innerHTML = "off";
		}

		blockAllButton.addEventListener("click", function() {
			swapClicked(blockAllButton, true);
			sendMessageToBackground({task: "blockAll"})
		})
	});

});

// Creates new tab of settings.html
document.getElementById("settings").addEventListener("click", function() {
	chrome.tabs.create({ url: chrome.runtime.getURL("../settings.html")});
});

// Creates new tab of help.html 
document.getElementById("help").addEventListener("click", function() {
	chrome.tabs.create({ url: chrome.runtime.getURL("../help.html")});
});

// Sends the inputted message, background.js listens to it
// If get a response or error, then logs it in the errorMessage
async function sendMessageToBackground(message) {
	chrome.runtime.sendMessage(message)
	.then(function () {}, function (error) { 
		if (error === undefined || error == null) {
			return;
		}
		console.log("error in sending message from popup js to background")
		console.log(error); 
		errorMessage.innerHTML = error;
	});
}

document.getElementById("recheck").addEventListener("click", function() {
	errorMessage.innerHTML = "";
	sendMessageToBackground({task: "updateCurrentBlock"});
	// errorMessage.innerHTML = "Rechecked!";
});

document.getElementById("pauseButton").addEventListener("click", function() {
	errorMessage.innerHTML = "";
	let amountStr = document.getElementById("pauseAmount").value;

	let amount = parseInt(amountStr);

	if (isNaN(amount)) {
		errorMessage.innerHTML = "Can only give a numerical number to pause";
		return;
	}

	let blockAmountStr = "for " + amount + " minutes";

	if (amount < 1) {
		amount = -1;
		blockAmountStr = "until midnight"
	} else if (amount > 1440) {
		amount = 1440;
		blockAmountStr = "for 24 hours";
	} 

	const message = {task: "pause", time: amount};

	sendMessageToBackground(message)
	.then(function() {
		errorMessage.innerHTML = "Pausing blocking " + blockAmountStr;
	});
});

document.getElementById("pauseMidnight").addEventListener("click", function() {
	errorMessage.innerHTML = "";
	sendMessageToBackground({task: "pause", time: -1})
	.then(function () {
		errorMessage.innerHTML = "Pausing blocking until midnight";
	})
});


