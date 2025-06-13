/*
to do :
- make th block every site get config from storage and change to unblock every site if
	all teh sites are currently blocked !

- maybe move pause and block all to be implemented here rather than background js? 
	- because it's not as if we would need to do those things there! no benefit! 
*/

import { getConfig, swapClicked } from "./sharedFunctions.js";

let errorMessage = document.getElementById("errorMessage");

// on window load, set up the correct text for the block all buttton
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
	.then(function (response) {
		console.log("GOT RESPONSE BACK!!");
		if (response === undefined || response === null) {
			console.log(response);
			return;
		}
		console.log(response);
		console.log(response.response);
		errorMessage.innerHTML = response.response;
	})
	.then(function (error) { 
		if (error === undefined || error == null) {
			return;
		}
		console.log("error in sending message from popup js to background")
		console.log(error); 
		errorMessage.innerHTML = error;
	});
}

document.getElementById("recheck").addEventListener("click", function() {
	sendMessageToBackground({task: "updateCurrentBlock"});
	// errorMessage.innerHTML = "Rechecked!";
});

document.getElementById("pauseButton").addEventListener("click", function() {
	let amountStr = document.getElementById("pauseAmount").value;
	errorMessage.innerHTML = "";

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
	sendMessageToBackground({task: "pause", time: -1})
	.then(function () {
		errorMessage.innerHTML = "Pausing blocking until midnight";
	})
});


