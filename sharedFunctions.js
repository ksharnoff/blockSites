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
	if (isButtonOn(button)) {
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

// Inputs today's date and when the blockAllUntil or blockSettingsUntil will 
// expire (in milliseconds) and then outputs -1 if it does not expire today, 
// 0 if it already expired, or the number of minutes until it expires today.
// Used in checkBlockSettings and in background.js 
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

	let toReturn = Math.floor((diff/1000)/60);

	console.log(diff)
	console.log(toReturn);

	return toReturn;
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
		chrome.storage.local.set({
			config: config
		});
	}
	return false;
}

// Input site stored from config, current URL that is being checked, and the
// type of site stored (char, domain, regex). If the input type is domain,
// then the url was prepended with a period. 
// Used in background.js (to see if site should be blocked) and settings.js
// (to see if redirect address is valid)
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
		// make regex!!!!!
		// get the / and the / and then get any flags after the last 
		// / and then create the regex and run it! 
		return false;
	}
}


// when doing comparisons with domains, check if === or if url ends with site
// str.endsWith("str")
// str === str
// think about if should store site with period at the start? and then when doing 
// comparions with url, add a period to the front of the string? 
// and then when you write the string to the settings page, delete the period and when 
// copy from the settings page, write the period so then you don't have to add the period
// when that site is compared many many times!!

// okay so:
// domain site saved -- write period at the start in the config and current block
// when writing domain site saved to the settings page, delete the period at the 
// start! 
// add period to the start of the url when doing check URL site comparisons!! bc
// what if have to compare many of the domain ones!!