/*
	MIT License
	Copyright (c) 2025 Kezia Sharnoff

	- blockSites Chrome Extension
	- sharedFunctions.js
	Some functions shared between files about button coloring and getting config
	from storage.  
*/


// If the button is being hovered over when this function is called, 
// then it will no longer be inverted coloring. This is on purpose 
// so that the change in color between green and blue is more clear 
// than just the small text changing. 
// Used in popup.js and settings.js. 
export function swapClicked(button, activeButton) {
	if (button.className == "selected") {
		buttonOff(button, activeButton);
	} else {
		buttonOn(button, activeButton);
	}
}

// Turns the inputted button green with optional "on" text
export function buttonOn(button, activeButton) {
	button.className = "selected";
	if (activeButton) {
		button.innerHTML = "on";
	}
}

// Turns the inputted button green with optional "off" text
export function buttonOff(button, activeButton) {
	button.className = "unselected";
	if (activeButton) {
		button.innerHTML = "off";
	}
}

// Returns config object from storage or null if it is not in storage
// Used in background.js, popup.js, and settings.js
export async function getConfig() {
	let result = await chrome.storage.local.get("config");

	if (result == undefined || result.config == undefined) {
		return null;
	}

	return result.config;
}

// Inputs a button element, returns true if it was selected and green, false
// otherwise. 
// Used in settings and popup
export function isButtonOn(element) {
	if (element.className === "selected") {
		return true;
	} 
	return false;
}

// Inputs a date, returns how many minutes it has been until that date's time
// of day. 
// Example: 11pm --> 1380
// Example: 12:05am --> 5
export function dateToMinutes(date) {
	return date.getMinutes() + (date.getHours() * 60);
}