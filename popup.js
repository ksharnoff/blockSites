/*
	MIT License
	Copyright (c) 2025 Kezia Sharnoff

	- blockSites Chrome Extension
	- popup.js
	Functionality for the buttons in the popup. The ones that just open pages do,
	the ones that are more complicated (blockAll, pause, recheck) send a message
	to background.js to do those tasks. 
*/


import { getConfig, swapClicked, isButtonOn, buttonOn, buttonOff, checkBlockedSettings } from "./sharedFunctions.js";


// Creates new tab of settings.html
document.getElementById("settings").addEventListener("click", function() {
	chrome.tabs.create({ url: chrome.runtime.getURL("../settings.html")});
});

// Creates new tab of help.html 
document.getElementById("help").addEventListener("click", function() {
	chrome.tabs.create({ url: chrome.runtime.getURL("../help.html")});
});


let errorMessage = document.getElementById("errorMessage");

// Sends the inputted message, which background.js will listen for. If an
// error is gotten in return, errorMessage is modified. 
async function sendMessageToBackground(message) {
	chrome.runtime.sendMessage(message)
	.then(function () {}, function (error) { 
		if (error === undefined || error == null) {
			return;
		}
		console.log("Error in sending message from popup to background")
		console.log(error); 
		errorMessage.innerHTML = error;
	});
}

// On window load, set up the correct selectiveness for the block all button
// and create the event listener for the block all button.
window.addEventListener("load", function() {
	getConfig()
	.then(function (value) {

		// figure out if allowed to pause
		if (value !== null && value.pause !== undefined) {
			if (!(value.pause)) {
				document.getElementById("pauseDiv").remove();
			}
		}

		// Set up blockAll button
		let blockAllButton = document.getElementById("blockAll");
		buttonOff(blockAllButton, true);
		if (value !== null && value.blockAll !== undefined) {
			if (value.blockAll) {
				buttonOn(blockAllButton, true);
			} 
		}

		// if no settings changes allowed
		if (checkBlockedSettings(value)) {
			document.getElementById("blockAllDiv").remove();
		}

		blockAllButton.addEventListener("click", function() {
			swapClicked(blockAllButton, true);

			sendMessageToBackground(
				{task: "blockAll", active: isButtonOn(blockAllButton)}
			);
		});
	});
});

// Once the recheck button is pressed, a message is sent to the background
// script to re calculate the currentBlock.
document.getElementById("recheck").addEventListener("click", function() {
	errorMessage.innerHTML = "";
	sendMessageToBackground({task: "updateCurrentBlock"});
	// errorMessage.innerHTML = "Rechecked!";
});

// Once the pause button is pressed, the contents of the pause input is read
// and if it is a valid number, then a message is sent to the background to 
// make a pause for that many minutes. 
document.getElementById("pauseButton").addEventListener("click", function() {
	errorMessage.innerHTML = "";
	let amountStr = document.getElementById("pauseAmount").value;

	let amount = parseInt(amountStr);

	if (isNaN(amount)) {
		errorMessage.innerHTML = "Can only give a numerical number to pause";
		return;
	}

	// blockAmountStr will be used to print to errorMessage to assure the user
	// that their request went through
	let blockAmountStr = "for " + amount + " minutes";

	if (amount < 1) {
		amount = -1;
		blockAmountStr = "until midnight"
	} else if (amount > 1440) {
		amount = 1440;
		blockAmountStr = "for 24 hours";
	} 

	// If there is an error in sending the message, it will overwrite this
	errorMessage.innerHTML = "Pausing blocking " + blockAmountStr;

	const message = {task: "pause", time: amount};
	sendMessageToBackground(message);
});

// Once the pause midnight button is pressed, a message is sent to the background
// to pause until midnight. 
document.getElementById("pauseMidnight").addEventListener("click", function() {
	// If there is an error in sending the message, it will overwrite this
	errorMessage.innerHTML = "Pausing blocking until midnight";

	sendMessageToBackground({task: "pause", time: -1});
});

// If cancel pause is clicked, then send message to write the stored pause to 
// null.
document.getElementById("cancelPause").addEventListener("click", function() {
	sendMessageToBackground({task: "cancelPause"});
});
