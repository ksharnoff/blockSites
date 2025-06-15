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

import { getConfig } from "./sharedFunctions.js";


const tempConfig = {
	groups: [
		{
			name: "wikipedia",
			active: true, 
			sites: ["wikipedia.org", "mail.google.com"],
			excludes: ["en.wikipedia.org/wiki/California"],
			times: [[0, 190], [1260, 1435]],
			days: [true, true, false, true, true, true, true]
		},
		{
			name: "socials",
			active: false, 
			sites: ["facebook.com", "gmail.com"],
			excludes: [],
			times: [[5, 613], [1290, 1439]],
			days: [true, false, true, true, true, false, true]
		},
	],
	blockAll: false
};

const tempCurrentBlock = {
	sites: ["wikipedia.org", "mail.google.com"], 
	exclude: ["en.wikipedia.org/wiki/California"]
}


// Upon initial installation or updating: 
chrome.runtime.onInstalled.addListener(function(details) {
	console.log("on installed listener");
	if (details.reason === "install") {
		console.log("installed!");

		clearAlarmsPrintBytesUsed();

		updateCurrentBlock();

		// automatically open the settings page! 
		chrome.tabs.create({ url: chrome.runtime.getURL("../settings.html")});
	} else {
		console.log("updated!!!");

		// code for writing in a currentBlock for testing! 
		// chrome.storage.local.set({"currentBlock": tempCurrentBlock});

		// code for writing in a config for testing! 
		// chrome.storage.local.set({"config": tempConfig});

		clearAlarmsPrintBytesUsed();
		updateCurrentBlock();

		// testing code!!! prints all items in storage
		// chrome.storage.local.get(null, function(items) {
		// 	console.log("all items in storage!");
		// 	console.log(items);
		// });
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
			console.log("Tried to fetch config from storage for \
						 updateCurrentBlock, it is null");
			// if no stored config, then set an alarm to recheck! 
			createErrorAlarm(120);
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
	let sitesBlock = new Map();
	// array of websites to be excluded from blocking
	let sitesExclude = new Map();

	// if later want to change that blockAll will only block all in that day then double check this!! 
	if (config.blockAll) {
		for (let g of config.groups) {
			if (!g.active) {
				continue;
			}

			sitesBlock = arrayAddToMap(sitesBlock, g.sites);
			sitesExclude = arrayAddToMap(sitesExclude, g.excludes);
		}
		// alarm for midnight!
		// (if they change settings or blockAll button, new alarm will go off then)
		createErrorAlarm(-1);
		writeCurrentBlock(sitesBlock, sitesExclude);
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
					sitesBlock = arrayAddToMap(sitesBlock, g.sites);
					sitesExclude = arrayAddToMap(sitesExclude, g.excludes);
					addedGroup = true;
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
	writeCurrentBlock(sitesBlock, sitesExclude);
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
function mapToArray(map, arr) {
	map.forEach(function(value, key, map) {
		arr.push(key);
	});
	return arr;
}

// Inputs the sites to block map and sites to exclude map, then writes them to
// storage as arrays in the currentBlock. 
function writeCurrentBlock(sitesBlock, sitesExclude) {
	let sitesBlockArr = [];
	let sitesExcludeArr = [];

	sitesBlockArr = mapToArray(sitesBlock, sitesBlockArr);
	sitesExcludeArr = mapToArray(sitesExclude, sitesExcludeArr);

	console.log("ran write current block");
	console.log("sites:");
	console.log(sitesBlockArr);
	console.log("excludes:");
	console.log(sitesExcludeArr);

	chrome.storage.local.set({
		currentBlock: {
			"sites": sitesBlockArr, 
			"excludes": sitesExcludeArr
		}
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


// Inputs a date, returns how many minutes it has been until that date's time
// of day. 
// Example: 11pm --> 1380
// Example: 12:05am --> 5
function dateToMinutes(date) {
	return date.getMinutes() + (date.getHours() * 60);
}


// Logic about blocking currently changing tabs: 


// Listener for when any tab gets updated. Then, helper functions are called
// so that it is checked if it should be blocked and then is blocked if so. 
chrome.tabs.onUpdated.addListener(function(tabID, changeInfo, tab) {

	console.log("tab updated " + tab.url);
	// console.log(tab);
	console.log("change info:");
	console.log(changeInfo);

	// if the change of the tab is that it has been unloaded from memory
	// or that it is currently loading don't do anything! another event
	// will fire once it's finished. 
	// tab.highlighted tries to make sure that the changed tab is currently 
	// being used -- fails if highlighted in another window....
	if (changeInfo.discarded || changeInfo.status === "loading" ||
	   changeInfo.favIconUrl || (!tab.highlighted)) {
		console.log("no need to block! tab still loading or not in use!");
		return;
	}

	// no need to block if on a page of the chrome extension
	if (tab.url.substring(0,20).includes("chrome-extension://")) {
		console.log("no need to block! you're on the chrome-extension page");
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
	console.log("checking if block!");
	// value is currentBlock
	getCurrentBlock().then(function(value) {
		if (value == null | value.sites == null)  {
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
	console.log("checking if valid site!");
	console.log("currentBlock");
	console.log(currentBlock);
	let excluded = false;

	for (let s of currentBlock.sites) {
		if (url.includes(s)) {
			excluded = false;
			for (let e of currentBlock.excludes) {
				if (url.includes(e)) {
					excluded = true;
					break;
				}
			}
			if (!excluded) {
				console.log("should be blocked!");
				blockTab(tabID);
				return;
			}
		}
	}
	console.log("shouldn't block!");
	return;
}

// Fetches the stored currentBlock, the sites that should be blocked now until
// the next alarm goes off. Returns null if failed.
// Maybe should add check for if error? 
async function getCurrentBlock() {
	console.log("async trying to get current block!");
	let result = await chrome.storage.local.get("currentBlock");
	if (result == undefined) {
		return null;
	}
	return result.currentBlock; 
}

// Blocks tab at tabId, redirects to the blocked.html page
function blockTab(tabId) {
	chrome.tabs.update(tabId, {url: "../blocked.html", active: true});
}


// Tasks from popup: 


// Once message is received (from popup), do the task: 1) updating current block,
// 2) swapping the block all, 3) pausing blocking. 
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
	console.log("got a message!!!!! <--------");
	console.log(request);

	if (request === undefined || request.task === undefined) {
		// do nothing! :D
	} else if (request.task === "updateCurrentBlock") {
		updateCurrentBlock();
	} else if (request.task === "blockAll") {
		blockAllSwap();
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

// Edits the config stored to swap blockAll to the opposite: true to false, etc. 
// Called after receiving a message from the popup
function blockAllSwap() {
	getConfig()
	.then(function(value) {
		if (value == null || value.blockAll == null) {
			console.log("Tried to block all from a popup request, it is null!")
			return;
		}

		value.blockAll = !value.blockAll;

		chrome.storage.local.set({
			config: value
		});
	});
}

