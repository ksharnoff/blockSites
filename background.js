// to do: reorder the functions within this file written to be better! !!

const configtoWrite = {
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
// each group should have the following variables:
	// name (string) (of the group)
	// active (bool), 
	// sites (array of strings), 
	// exclude (array of strings),
	// times (array of 2 length arrays of ints ("start", "end")), 
		// where each time is the number of minutes until that time, 
		// so 12:50pm is 12 hours 50 minutes so 1430 minutes
		// start time is always less than (before than) second time
	// days (7 length array of ints)

const tempCurrentBlock = {
	sites: ["wikipedia.org", "mail.google.com"], 
	exclude: ["en.wikipedia.org/wiki/California"]
}


// if alarm goes off or the config storage gets updated! 
chrome.alarms.onAlarm.addListener(function(alarm) {
	console.log(">>>>>>>>alarm sounded!!!");

	if (alarm.name !== "updateCurrentBlock") {
		console.log(alarm.name);
	}

	updateCurrentBlock();
});

chrome.runtime.onMessage.addListener(function(request) {
	console.log("got a message!!!!! <--------");
	console.log(request);
	if (request === undefined || request.task === undefined) {
		updateCurrentBlock();
	} else if (request.task === "updateCurrentBlock") {
		updateCurrentBlock();
	} else if (request.task === "blockAll") {
		blockAll();
	} else if (request.task === "pause") {
		if (request.time !== undefined) {
			pauseBlock(request.time);
		}
	}
});

chrome.storage.onChanged.addListener(function(changes) {
	for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
		// if any changes to config are detected, update! 
		// --- maybe also check for this by having settings js send a message? -- redundant! 
		if (key === "config") {
			updateCurrentBlock();
		}
	}
});

// when the chrome extension is installed or updated then:
chrome.runtime.onInstalled.addListener(function(details) {
	console.log("on installed listerner");
	if (details.reason === "install") {
		console.log("installed!");
		// maybe shouldn't clear storage on install? what if 
		// re-installing -- why would that happen?? -- maybe just 
		// clear currentBlock from storage! 
		// OR/AND just set currentBlockStor = null, and configStor = null
		// chrome.storage.local.clear();

		clearAlarmsPrintBytesUsed();

		// following line needs to be tested:::: 
		createErrorAlarm(-1);

		// automatically open the settings page! 
		chrome.tabs.create({ url: chrome.runtime.getURL("../settings.html")});
	} else {
		console.log("updated!!!");
		// maybe in production also have it open settings back on update! 
		/// bc can imagine would only ever press update if user changed 
		// the code or redownloaded new release,, in which case it makes
		// sense to view the settings page again!


		// code for writing in a currentblock for testing! 
		// chrome.storage.local.set({"currentBlock": tempCurrentBlock});

		// code for writing in a config for testing! 
		chrome.storage.local.set({"config": configtoWrite});


		clearAlarmsPrintBytesUsed();
		updateCurrentBlock();

		// testing code!!! prints all items in storage... (weird it doesn't need promise)
		// chrome.storage.local.get(null, function(items) {
		// 	console.log("all items in storage:");
		// 	console.log(items);
		// });
	}
});

// after this is called then updateCurrentBlock should also be called for on 
// updated,, else wise no alarms would go off until they changed the settings!
function clearAlarmsPrintBytesUsed() {
	chrome.alarms.clearAll();
	chrome.storage.local.getBytesInUse(function(bytesInUse) {
		console.log("Bytes in use:");
		console.log(bytesInUse);
	});
}
 
chrome.storage.onChanged.addListener(function(changes, areaName) {
	console.log("!!!!storage changed!");
	console.log(changes);
	updateCurrentBlock();
});


// pauses all blocking for the number of inputted minutes
function pauseBlock(time) {
	if (isNaN(time)) {
		console.log("Tried to pause for a time that isn't a number");
		console.log(time);
		return;
	}
	if (time < 1) {
		time = 1;
	} else if (time > 1400) { // number of minutes in a day
		time = 1400;
	}


	chrome.alarms.clearAll();
	createErrorAlarm(time);
	writeCurrentBlock(new Map(), new Map());
}


function blockAll() {
	
}


// To coordinate the functions about updating the current block
// Mainly an async function to get config from storage and then to calculate
// calculate what to block and when and then write currentBlock to storage. 
function updateCurrentBlock() {
	getConfig()
	.then(function(value) {
		if (value == null) {
			console.log("Tried to fetch config from storage for updateCurrentBlock, it is null");
			// if there isn't any stored config, then set an alarm for hour to recheck! 
			createErrorAlarm(60);
			return; 
		} 
		calculateBlock(value);
	})
	.catch(function(value) {
		console.log("Failed to get config from storage");
		return;
	})
}

// returns config object from storage or null if it is not in storage
async function getConfig() {
	console.log("async trying to get config!");
	let result = await chrome.storage.local.get("config");
	if (result == undefined) {
		return null;
	}
	return result.config;
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
	// array of webistes to be excluded from blocking
	let sitesExclude = new Map();

	// if later want to change that blockAll will only block all in that day then double check this!! 
	if (config.blockAll) {
		for (let g of config.groups) {
			sitesBlock = arrayAddToMap(sitesBlock, g.sites);
			sitesExclude = arrayAddToMap(sitesExclude, g.exclude);
		}
		// alarm for midnight!
		// (if they change settings or blockAll button, new alarm will go off then)
		createErrorAlarm(-1);
		writeCurrentBlock(sitesBlock, sitesExclude);
		return;
	}

	const today = new Date();
	const day = today.getDay(); // Sunday is 0, Saturday is 6
	const nowMinutes = timeToMinutes(dateToTime(today));

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
			// if at or after start time and before ending time:
			if (nowMinutes >= time[0] && nowMinutes < time[1]) {

				// in order to be more efficient and not try to add same 
				// websites from same group, use addedGroup boolean
				// because multiple opportunities to add each group
				// as all of the times are checked
				if (!addedGroup) {
					sitesBlock = arrayAddToMap(sitesBlock, g.sites);
					sitesExclude = arrayAddToMap(sitesExclude, g.exclude);
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

// adds all the values in the array to the map, returning the map
// map is useful so then there are not duplicated values
function arrayAddToMap(map, arr) {
	if (arr === undefined || map === undefined) {
		return map;
	}
	for (let val of arr) {
		map.set(val, 1);
	}
	return map;
}

function mapToArray(map, arr) {
	map.forEach(function(value, key, map) {
		arr.push(key);
	});
	return arr;
}

// writes to storage the current blocked,, takes in two maps as input 
// and writes them down as arrays
function writeCurrentBlock(sitesBlock, sitesExclude) {
	let sitesBlockArr = [];
	let sitesExcludeArr = [];

	sitesBlockArr = mapToArray(sitesBlock, sitesBlockArr);
	sitesExcludeArr = mapToArray(sitesBlock, sitesExcludeArr);

	console.log("ran write current block");
	console.log("sites:");
	console.log(sitesBlockArr);
	console.log("exclude:");
	console.log(sitesExcludeArr);

	chrome.storage.local.set({
		currentBlock: {
			"sites": sitesBlockArr, 
			"exclude": sitesExcludeArr
		}
	});
	if (chrome.runtime.lastError) {
	 	console.log("chrome runtime last error exists! failed to write to storage!");
        console.log(chrome.runtime.lastError);
    } 
}

// easy function that will set nowMinutes in order to
// call createAlarm to have the alarm expire at midnight or in a few minutes
// or maybe I shoud have a global nowMinutes variable starting from the wakeup 
// of this background js????
//
// inputs a time in minutes, sets an alarm to go off in that many minutes
function createErrorAlarm(time) {
	const nowMinutes = timeToMinutes(dateToTime(new Date()));

	let expire;
	if (time < 0) {
		expire = -1
	} else {
		expire = nowMinutes + time;
	}
	console.log("called create alarm on expire, nowminutes:");
	console.log(expire);
	console.log(nowMinutes);
	createAlarm(expire, nowMinutes, "updateCurrentBlock");
}

// takes in input of when to alarm and also nowTime from 0 to 2359
// creates an alarm for that time! 
function createAlarm(expireMinutes, nowMinutes, name) {
	// should expire at midnight at the latest, if expire time is smaller 
	// than now time that means the next day, so it should be midnight
	// midnight is 23hours, 59 minutes which is 1,439 minutes
	if (expireMinutes <= nowMinutes || expireMinutes > 1439) {
		expireMinutes = 1439;
	}

	// the alarm will be 1 minute late in order to garentee that it happens, 
	// imagine the scenario of an alarm begin set for 0 minutes and it not working right
	// IDEA maybe only add 0.5 minutes??? can I use decimals here?
	let minutesAlarm = 1 + expireMinutes-nowMinutes;

	console.log("Creating alarm! expire at " + expireMinutes + " now is " + nowMinutes + "; will expire in " + minutesAlarm);

	// "updateCurrentBlock"
	chrome.alarms.create(name, { 
		delayInMinutes: minutesAlarm
	});
}

// inputs a time, like 2359 and outputs how many minutes it has been 
// of a day until that time, so 1439
function timeToMinutes(time) {
	return time % 100 + ((Math.trunc(time / 100))*60);
} 

// inputs a date, outputs the hours and minutes formatted as a four 
// digit number, where noon is 1200, 11pm is 2300, and 1 am is 100. 
function dateToTime(date) {
	return date.getMinutes() + (date.getHours() * 100);
}


// Function to coordinate the function calls to see if the current url should be
// blocked. Mainly just dealing with the promise of getting the data from the
// storage and then checking the url in validSite(). 
// Always returns nothing.
async function checkBlock(url, tabID) {
	console.log("checkking if block!");
	// value is currentBlock
	getCurrentBlock().then(function(value) {
		if (value == null | value.sites == null)  {
			console.log("Tried to fetch currentBlock from storage for validSite, it is null");
			return; 
		}
		validSite(value, url, tabID);
		return;
	}).catch(function(error) {
		console.log("Error in fetching currentBlock from storage for validSite")
		return; 
	})
}

// Checks if the current url should be blocked according to the fetched
// currentBlock. Calls blockTab if it should, returns void if it shouldn't.
function validSite(currentBlock, url, tabID) {
	console.log("checkking if valid site!");
	console.log("currentBlock");
	console.log(currentBlock);
	excluded = false;

	for (let s of currentBlock.sites) {
		if (url.includes(s)) {
			excluded = false;
			for (let e of currentBlock.exclude) {
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

// Fetchs the stored currentBlock, the sites that should be blocked now until
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

function blockTab(tabId) {
	// chrome.tabs.update(tabId, {url: "../blocked.html", active: true});
	console.log("block!!");
}


// need to figure out how to optimize so it isn't checking several times for each
// tab --- bc tab title loads in, the tab favicon (little icon at tab name) and
// when the tab completes loading! 

// tab gets updated, checks if should block, if it should then it does 
chrome.tabs.onUpdated.addListener(function(tabID, changeInfo, tab) {

	console.log("tab updated " + tab.url);
	// console.log(tab);
	console.log("change info:");
	console.log(changeInfo);

	// if the change of the tab is that it has been unloaded from memory
	// or that it is currently loading don't do anything!! another event
	// will fire once it's done loading (tab.status == "complete")
	// .discarded, tab.highlighted, tab.lastAccessed all make sure that the
	// changed tab is one that is currently being used!
	// for example a tab playing music in another window should not be checked
	// whenever each song changes. 
	if ((changeInfo.discarded || changeInfo.status == "loading") || 
		(!tab.highlighted) || tab.lastAccessed > 1000) {
		console.log("no need to block! that tab is still loading or not in use!");
		return;
	}

	// no need to check if a tab should be blocked if it cannot 
	// be blocked or if it was already blocked
	// maybe make this more efficient?? at the beginning??
	// IDEA: slice the inputted string and then see if it perfectly matches this! 
	if (tab.url.includes("chrome-extension://")) {
		console.log("no need to block! you're on the chrome-extension page");
		return;
	}

	// will check if should be blocked and block if should be
	checkBlock(tab.url, tabID);
});