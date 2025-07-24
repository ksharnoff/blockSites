/*
	MIT License
	Copyright (c) 2025 Kezia Sharnoff

	- blockSites Chrome Extension
	- sharedFunctions.js
	Some functions shared between files about button coloring and getting config
	from storage.  
*/

// Returns config object from storage or null if it is not in storage
// Used in background.js, popup.js, and settings.js
export async function getConfig() {
	let result = await chrome.storage.local.get("config");

	if (result == undefined || result.config == undefined) {
		return null;
	}

	return result.config;
}

// Write the new config object to storage
// Used in background.js and settings.js
export async function setConfig(newConfig) {
	chrome.storage.local.set({
		config: newConfig
	});
}

// If the button is being hovered over when this function is called, 
// then it will no longer be inverted coloring. This is on purpose 
// so that the change in color between green and blue is more clear 
// than just the small text changing. 
// Used in popup.js and settings.js. 
export function swapClicked(button, activeButton) {
	if (isButtonOn(button)) {
		buttonOff(button, activeButton);
	} else {
		buttonOn(button, activeButton);
	}
}

// Turns the inputted button green with optional "on" text
// Used in this file and in popup.js and settings.js to color buttons once got
// booleans from storage.
export function buttonOn(button, activeButton) {
	button.className = "selected";
	if (activeButton) {
		button.innerHTML = "on";
	}
}

// Turns the inputted button green with optional "off" text
// Used in this file and in popup.js and settings.js to color buttons once got
// booleans from storage.
export function buttonOff(button, activeButton) {
	button.className = "unselected";
	if (activeButton) {
		button.innerHTML = "off";
	}
}

// Inputs a button element, returns true if it was selected and green, false
// otherwise. 
// Used in settings.js and popup.js
export function isButtonOn(element) {
	if (element.className === "selected") {
		return true;
	} 
	return false;
}

// Inputs today's date and when the __Until (pauseUntil, blockUntil, etc) will 
// expire (in milliseconds) and then outputs -1 if it does not expire today, 
// 0 if it already expired, or the number of minutes until it expires today.
// Used in this file and in background.js 
export function checkDateExpired(date) {
	const today = new Date();
	const diff = date-today;

	// already expired
	if (diff < 0) {
		return 0;
	}

	// will not expire today
	if (diff > 1000*60*60*24) {
		return -1;
	}

	return Math.floor((diff/1000)/60);
}

// Number of minutes until midnight
// (FIGURE OUT HOW TO EXPORT THIS?)
const MIDNIGHT = 1439;

// Return milliseconds since epoch of the inputted minutes after the current
// time. Used to calculate when the pausing should end. If something goes wrong,
// returns null.
// maybe this should be in a try catch to else return null? 
// Used in background.js and settings.js
export function nowPlusMinutes(minutes) {
	// (for pauseUntil) this is checked in popup.js this is just double checking
	if (isNaN(minutes)) {
		console.log("Tried to pause for a time that isn't a number");
		console.log(minutes);
		return null;
	}

	const today = new Date();

	if (minutes < 1) { // pause until midnight
		minutes = MIDNIGHT - dateToMinutes(today);
	} else if (minutes > 1400) { // number of minutes in a day
		minutes = 1400;
	}

	return today.getTime() + minutes*1000*60;
}


// Inputs a date, returns how many minutes it has been until that date's time
// of day. 
// Example: 11pm --> 1380
// Example: 12:05am --> 5
// Used in background.js and this file
export function dateToMinutes(date) {
	return date.getMinutes() + (date.getHours() * 60);
}

// Inputs the config object, returns true if it is blocked, false if not. In
// addition, if it is passed the time to block until, it will re-write the
// config and unblock it.
// Used in popup.js and settings.js
export function checkBlockedSettings(config) {
	if (config !== null && config.blockSettings !== undefined && config.blockSettings !== null) {
		if (checkDateExpired(config.blockSettings) !== 0) {
			return true;
		}
		// therefore, it does equal 0 and should be unblocked! 
		config.blockSettings = null;
		setConfig(config);
	}
	return false;
}

// Input site stored from config, current URL that is being checked, and the
// type of site stored (char, domain, regex). If the input type is domain,
// then 'url' is just the hostname (subdomains.domains.tlds) prepended with
// a period. 
// Used in background.js (to see if url should be blocked) and settings.js
// (to see if redirect URL overlaps with anything that is blocked)
export function checkURLSite(site, url, type) {
	switch (type) {
	case "char":
		if (url.includes(site)) {
			return true;
		}
		return false;
	case "domain":
		if (url.endsWith("." + site)) {
			return true;
		}
		return false;
	case "regex":
		let flags = ""
		let regex = site; 

		// Javascript regex is supposed to be '/regex/flags'
		// but they could have done 'regex' with no flags
		if (site.charAt(0) === "/") {
			let flagsInd = site.lastIndexOf("/");
			// if flagsInd is zero then it starts with a / but does not have
			// a closing one, which is weird
			if (flagsInd !== 0) {
				// if there is no flags like '/regex/' this will return the
				// empty string
				flags = regex.substring(flagsInd+1);

				// final regex should not include the slashes that surround it
				regex = regex.substring(1, flagsInd)
			}
		}

		try {
			const re = new RegExp(regex, flags);

			if (url.match(re)) {
				return true;
			}
		} catch (error) {
			console.log("Error in creating and matching with regex!");
			console.log(error);
			return false;
		}

		return false;
	}
	return false;
}