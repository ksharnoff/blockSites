/*
	MIT License
	Copyright (c) 2025 Kezia Sharnoff

	- blockSites Chrome Extension
	- background.js
	This file deals with the background functionality of figuring out what 
	sites should be blocked now (in currentBlock) and when any tab is updated
	blocking it or not. This also does the back end of the popup (recheck, 
	blockAll, pause).
*/

import { getConfig, dateToMinutes, checkDateExpired, checkURLSite } from "./sharedFunctions.js";

/*
There are two objects in storage: config and currentBlock

config has the following:
	- blockAll: boolean
	- pause: boolean
	- blockAllUntil: milliseconds since the epoch or null
	- blockSettings: milliseconds since the epoch or null
	- groups: array of group objects, specified in settings.js. Each group has:
		name: string
		active: boolean
		sites: string array of sites to block
		sitesChar
		sitesRegex
		excludes: string array of sites to exclude from blocking
		excludesChar
		excludesRegex
		times: int 2-arrays array of times to block
		days: 7-array of booleans of what days to block

currentBlock:
	- (optional) sites: string array of sites to block
	- (optional) sitesChar
	- (optional) sitesRegex
	- (optional) excludes: string array of sites to exclude from blocking
	- (optional) excludesChar
	- (optional) excludesRegex
*/

// Upon initial installation or updating: 
chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason === "install") {
		console.log("installed!!");

		getConfig()
		.then(function(value) {
			clearAlarmsPrintBytesUsed();

			// if no config stored previously, make an empty one
			if (value === null) {
				const config = {
					groups: [],
					blockAll: false, 
					blockAllUntil: null,
					blockStorage: null,
					redirect: "", 
					pause: true
				}

				chrome.storage.local.set({
					config: config
				});
			} 

			// call updateCurrentBlock even if nothing in config to set up cycle
			// of alarms later to check if anything was added
			updateCurrentBlock();

			// automatically open the settings page! 
			chrome.tabs.create({ url: chrome.runtime.getURL("../settings.html")});
		});
	} else { // extension update, chrome update, or module update
		console.log("updated!!!");

		clearAlarmsPrintBytesUsed();
		updateCurrentBlock();

		// Testing code to print all items in storage
		chrome.storage.local.get(null, function(items) {
			console.log("All items in storage:");
			console.log(items);
		});
	}
});

// Helper function for installation and updating to clear all current alarms
// and print the bytes used in storage. 
function clearAlarmsPrintBytesUsed() {
	chrome.alarms.clearAll();
	chrome.storage.local.getBytesInUse(function(bytesInUse) {
		console.log("Bytes in use:");
		console.log(bytesInUse);
	});
}

// If config in storage is changed (such as from settings or swapBlockAll), then
// recalculate the current block. 
chrome.storage.onChanged.addListener(function(changes) {
	for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
		if (key === "config") {
			updateCurrentBlock();
			return;
		}
	}
});


// Recalculating and storing currentBlock: 


// Once alarm is sounded, update the currently blocked sites.
chrome.alarms.onAlarm.addListener(function(alarm) {
	console.log(">>>>>>>>alarm sounded!!!");

	// should not happen
	if (alarm.name !== "updateCurrentBlock") {
		console.log("Got weird alarm name:");
		console.log(alarm.name);
	}

	updateCurrentBlock();
});

// To coordinate the functions about updating the current block
// Mainly an async function to get config from storage and then to calculate
// calculate what to block and when and then write currentBlock to storage. 
function updateCurrentBlock() {
	getConfig()
	.then(function(value) {
		if (value == null) {
			console.log("Tried to fetch config from storage for updateCurrentBlock, it is null");
			// if no stored config, then set an alarm to recheck! 
			createErrorAlarm(120);
			return;
		} 
		calculateBlock(value);
	})
	.catch(function(error) {
		console.log("Failed in fetching config from storage");
		console.log(error);
	})
}

// Takes in the config item from storage. 
// Figures out what sites should be blocked now given the day and time
// calculates when an alarm should next be called (so that is is O(n) not O(2n)) also, 
// by when the current site times expire. 
function calculateBlock(config) {
	console.log("config:");
	console.log(config);

	// array of websites to be written to storage to be blocked
	let sites = new Map();
	let sitesChar = new Map();
	let sitesRegex = new Map();
	// array of websites to be excluded from blocking
	let excludes = new Map();
	let excludesChar = new Map();
	let excludesRegex = new Map();

	if (config.blockAll) {
		for (let g of config.groups) {
			// if later want to change that blockAll will only block all in that day then double check this!! 
			if (!g.active) {
				continue;
			}

			sites = arrayAddToMap(sites, g.sites);
			sitesChar = arrayAddToMap(sitesChar, g.sitesChar);
			sitesRegex = arrayAddToMap(sitesRegex, g.sitesRegex);

			excludes = arrayAddToMap(excludes, g.excludes);
			excludesChar = arrayAddToMap(excludesChar, g.excludesChar);
			excludesRegex = arrayAddToMap(excludesRegex, g.excludesRegex);
		}
		if (config.blockAllUntil !== undefined && config.blockAllUntil !== null) {
			const alarmTime = checkDateExpired(config.blockAllUntil);

			if (alarmTime === 0) {
				config.blockAllUntil = null;
				config.blockAll = false;
				chrome.storage.local.set({
					config: config
				});
			}
			createErrorAlarm(alarmTime);
		} else {
			createErrorAlarm(-1);
		}
		writeCurrentBlock(sites, sitesChar, sitesRegex, excludes, excludesChar, excludesRegex, config.redirect);
		return;
	}

	const today = new Date();
	const day = today.getDay(); // Sunday is 0, Saturday is 6
	const nowMinutes = dateToMinutes(today);

	// firstFinish is the first time that any of the websites currently 
	// blocking will expire being blocked, and when the alarm to 
	// re-run updateCurrentBlock() will fire, at most midnight 
	let firstFinish = 1439;

	// const groups = config.groups;
	for (let g of config.groups) { 
		let addedGroup = false;

		// if that group is turned off
		// if the current day is not chosen as a day to block in the group
		if (!g.active || !g.days[day]) {
			continue;
		}

		// iterate through each time pair of the current group
		for (let time of g.times) {
			if (time.length < 2 || time[0] < 0 || time[1] < 0) { // if only start or end time
				continue;
			}
			// if at or after start time and before ending time:
			if (nowMinutes >= time[0] && nowMinutes < time[1]) {

				// in order to be more efficient and not try to add same 
				// websites from same group, use addedGroup boolean
				// because multiple opportunities to add each group
				// as all of the times are checked
				if (!addedGroup) {
					sites = arrayAddToMap(sites, g.sites);
					sitesChar = arrayAddToMap(sitesChar, g.sitesChar);
					sitesRegex = arrayAddToMap(sitesRegex, g.sitesRegex);
					excludes = arrayAddToMap(excludes, g.excludes);
					excludesChar = arrayAddToMap(excludesChar, g.excludesChar);
					excludesRegex = arrayAddToMap(excludesRegex, g.excludesRegex);
					addedGroup = true;
					// DOES PUTTING A BREAK HERE BREAK THINGS??
					break;
				}

				if (time[1] < firstFinish) {
					firstFinish = time[1];
				}

			// if should not currently be blocked but will start before 
			// the first finishes rechecks the list
			} else if (time[0] < firstFinish && time[0] > nowMinutes) {
				firstFinish = time[0];
			}
		}

	}
	createAlarm(firstFinish, nowMinutes, "updateCurrentBlock");
	writeCurrentBlock(sites, sitesChar, sitesRegex, excludes, excludesChar, excludesRegex, config.redirect);
}

// Adds all values of the inputted array to the inputted map. This is useful
// in order to avoid duplicate websites to block or exclude from blocking. 
// This is a helper function to calculateBlock
function arrayAddToMap(map, arr) {
	if (arr === undefined || map === undefined) {
		return map;
	}
	for (let val of arr) {
		map.set(val, 1);
	}
	return map;
}

// Inputs a map and outputs an array made of the keys. Used for changing the map
// to array in writeCurrentBlock
function mapToArray(map) {
	let arr = [];
	map.forEach(function(value, key, map) {
		arr.push(key);
	});
	return arr;
}

// Inputs the sites to block map and sites to exclude map, then writes them to
// storage as arrays in the currentBlock. 
function writeCurrentBlock(sites, sitesChar, sitesRegex, excludes, excludesChar, excludesRegex, redirectURL) {
	let sitesArr = mapToArray(sites);
	let sitesCharArr = mapToArray(sitesChar);
	let sitesRegexArr = mapToArray(sitesRegex);
	let excludesArr = mapToArray(excludes);
	let excludesCharArr = mapToArray(excludesChar);
	let excludesRegexArr = mapToArray(excludesRegex);

	let currentBlock = {}; 

	if (sitesArr.length > 0) {
		currentBlock.sites = sitesArr;
	}
	if (sitesCharArr.length > 0) {
		currentBlock.sitesChar = sitesCharArr;
	}
	if (sitesRegexArr.length > 0) {
		currentBlock.sitesRegex = sitesRegexArr;
	}
	if (excludesArr.length > 0) {
		currentBlock.excludes = excludesArr;
	}
	if (excludesCharArr.length > 0) {
		currentBlock.excludesChar = excludesCharArr;
	}
	if (excludesRegexArr.length > 0) {
		currentBlock.excludesRegex = excludesRegexArr;
	}

	// console.log("current block!");
	// console.log(currentBlock);

	chrome.storage.local.set({
		currentBlock: currentBlock
	});
	if (chrome.runtime.lastError) {
	 	console.log("chrome runtime last error exists! failed to write to storage!");
        console.log(chrome.runtime.lastError);
    } 
}


// Creating alarms (for re-calculating currentBlock):


// Inputs number of minutes, sets an alarm to go off after that many minutes
function createErrorAlarm(minutes) {
	const nowMinutes = dateToMinutes(new Date());

	// expire is what time the alarm should go off at in units of minutes of
	// the day
	let expire;
	if (minutes < 0) {
		expire = -1
	} else {
		expire = nowMinutes + minutes;
	}
	// console.log("called create alarm on expire, nowMinutes:");
	// console.log(expire);
	// console.log(nowMinutes);

	createAlarm(expire, nowMinutes, "updateCurrentBlock");
}

// takes in input of when to alarm and also nowTime from 0 to 2359
// creates an alarm for that time! 
function createAlarm(expireMinutes, nowMinutes, name) {
	// should expire at midnight at the latest, if expire time is smaller 
	// than now time that means the next day, so it should be midnight
	// midnight is 23 hours, 59 minutes which is 1,439 minutes
	if (expireMinutes <= nowMinutes || expireMinutes > 1439) {
		expireMinutes = 1439;
	}

	let minutesAlarm = expireMinutes-nowMinutes;

	if (minutesAlarm < 1) {
		minutesAlarm = 1;
	}

	console.log("Creating alarm! expire at " + expireMinutes + " now is " + nowMinutes + "; will expire in " + minutesAlarm);

	// "updateCurrentBlock"
	chrome.alarms.create(name, { 
		delayInMinutes: minutesAlarm
	});
}


// Logic about blocking currently changing tabs: 


// Listener for when any tab gets updated. Then, helper functions are called
// so that it is checked if it should be blocked and then is blocked if so. 
chrome.tabs.onUpdated.addListener(function(tabID, changeInfo, tab) {

	console.log("tab updated " + tab.url);

	// if the change of the tab is that it has been unloaded from memory
	// or that it is currently loading don't do anything! another event
	// will fire once it's finished. 
	// tab.highlighted tries to make sure that the changed tab is currently 
	// being used -- fails if highlighted in another window....
	if (changeInfo.discarded || changeInfo.status === "loading" ||
	   changeInfo.favIconUrl || (!tab.highlighted)) {
		console.log("No need to block! Tab still loading or not in use!");
		return;
	}

	// A normal url will start with a protocol, like https://. The chrome 
	// settings and extensions pages start with chrome. 
	if (tab.url.startsWith("chrome")) {
		console.log("No need to block! You're on a chrome page!");
		return;
	} 

	// will check if should be blocked and block if should be
	checkBlock(tab.url, tabID);
});

// Function to coordinate the function calls to see if the current url should be
// blocked. Mainly just dealing with the promise of getting the data from the
// storage and then checking the url in validSite(). 
// Always returns nothing.
async function checkBlock(url, tabID) {
	// console.log("checking if block!");
	// value is currentBlock
	getCurrentBlock().then(function(value) {
		if (value === undefined || value === null)  {
			console.log("Tried to fetch currentBlock from storage for validSite, it is null");
			return; 
		}
		validSite(value, url, tabID);
		return;
	}).catch(function(error) {
		console.log("Error in fetching currentBlock from storage for validSite");
		console.log(error);
		return; 
	})
}

// Checks if the current url should be blocked according to the fetched
// currentBlock. Calls blockTab if it should be blocked.
function validSite(currentBlock, url, tabID) {
	let periodURL = "." + url;
	try {
		let urlObj = new URL(url);
		periodURL = "." + urlObj.hostname; 
	} catch(error) {
		console.log("tried to get hostname from a real url, but failed");
	}

	if (currentBlock.excludes !== undefined) {
		for (const e of currentBlock.excludes) {
			if (checkURLSite(e, periodURL, "domain")) {
				return;
			}
		}
	}
	if (currentBlock.excludesChar !== undefined) {
		for (const e of currentBlock.excludesChar) {
			if (checkURLSite(e, url, "char")) {
				return;
			}
		}
	}
	if (currentBlock.excludesRegex !== undefined) {
		for (const e of currentBlock.excludesregex) {
			if (checkURLSite(e, url, "regex")) {
				return;
			}
		}
	}

	if (currentBlock.sites !== undefined) {
		for (const e of currentBlock.sites) {
			if (checkURLSite(e, periodURL, "domain")) {
				blockTab(tabID, currentBlock.redirect);
				return;
			}
		}
	}
	if (currentBlock.sitesChar !== undefined) {
		for (const e of currentBlock.sitesChar) {
			if (checkURLSite(e, url, "char")) {
				blockTab(tabID, currentBlock.redirect);
				return;
			}
		}
	}
	if (currentBlock.sitesRegex !== undefined) {
		for (const e of currentBlock.sitesregex) {
			if (checkURLSite(e, url, "regex")) {
				blockTab(tabID, currentBlock.redirect);
				return;
			}
		}
	}
	return;
}

// Fetches the stored currentBlock, the sites that should be blocked now until
// the next alarm goes off. Returns null if failed.
async function getCurrentBlock() {
	let result = await chrome.storage.local.get("currentBlock");
	if (result == undefined || result.currentBlock === undefined) {
		return null;
	}
	console.log(result.currentBlock);
	return result.currentBlock; 
}

// Blocks tab at tabId, redirects to the blocked.html page
function blockTab(tabId, redirectURL) {
	if (redirectURL === "" || redirectURL === undefined) {
		redirectURL = "../blocked.html";
	}

	chrome.tabs.update(tabId, {url: redirectURL, active: true});
}


// Tasks from popup: 


// Once message is received (from popup), do the task: 1) updating current block,
// 2) swapping the block all, 3) pausing blocking. 
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
	console.log("got a message!!!!! <--------");
	console.log(request);

	if (request === undefined || request.task === undefined) {
		// do nothing! :D
		return;
	}

	if (request.task === "updateCurrentBlock") {
		updateCurrentBlock();
	} else if (request.task === "blockAll") {
		if (request.active !== undefined) {
			blockAllSwap(request.active);
		}
	} else if (request.task === "pause") {
		if (request.time !== undefined) {
			pauseBlock(request.time);
		}
	}
});

// Inputs a number of minutes and creates a currentBlock and calls to write it
// to storage that is empty. Sets an alarm for the number of minutes inputted
// to change it back to normal. Called after receiving a message from popup. 
function pauseBlock(time) {
	if (isNaN(time)) {
		console.log("Tried to pause for a time that isn't a number");
		console.log(time);
		return;
	}

	if (time < 1) {
		time = -1;
	} else if (time > 1400) { // number of minutes in a day
		time = 1400;
	}

	chrome.alarms.clearAll();
	createErrorAlarm(time);
	writeCurrentBlock(new Map(), new Map());
}

// Edits the config stored to swap the blockAll in config to the inputted
// bool, active. Called after receiving a message from the popup. If there
// was not previously a config in storage, then one is created. 
function blockAllSwap(active) {
	getConfig()
	.then(function(value) {
		// if previously was nothing in storage, create blank config
		if (value == null) {
			const config = {
				groups: [],
				blockAll: active, 
				blockAllUntil: null,
				blockSettings: null,
				redirect: "", 
				pause: true
			}

			chrome.storage.local.set({
				config: config
			});
			return;
		}

		// else, edit the currently stored item and re-set it

		value.blockAll = active;

		chrome.storage.local.set({
			config: value
		});
	});
}

