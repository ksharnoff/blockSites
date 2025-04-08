
// two objects: config in sync/local storage and currently blocked websites in session
// make the currently blocked websites object have an expiration time; when to recheck
// all of the groups to see what currently should be blocked; should be the earliest 
// end time of the previously currently blocked websites

// add explanation of what is in storage and how alarms work to help.html!!


// do not let them store 10pm to 3am!!! when writing to storage, write that as 
// 10pm to 11:59 then mightnight to 3am!!
// to do: reorder the functions within this file written to be better! !!

// need to decide if on start up will have blank config or just nothing,,, I think
// just nothing will work fine because we're checking for null!


// const config = {
// 	groups: [
// 		{
// 			active: true, 
// 			sites: ["wikipedia.org", "mail.google.com"],
// 			exclude: ["en.wikipedia.org/wiki/California"],
// 			times: [[10, 190],[1260, 1414]],
// 			days: [true, true, false, true, true, true, true]
// 		},
// 		{
// 			active: false, 
// 			sites: ["facebook.com", "gmail.com"],
// 			exclude: [],
// 			times: [[10, 613],[1290, 1439]],
// 			days: [true, false, true, true, true, false, true]
// 		},
// 	],
// 	blockAll: true
// };
// each group should have the following variables:
	// active (bool), 
	// sites (array of strings), 
	// exclude (array of strings),
	// times (array of 2 length arrays of ints ("start", "end")), 
		// where each time is the number of minutes until that time, 
		// so 12:50pm is 12 hours 50 minutes so 1430 minutes
		// start time is always less than (before than) second time
	// days (7 length array of ints)


// if alarm goes off or the config storage gets updated! 
chrome.alarms.onAlarm.addListener(function(alarm) {
	console.log("alarm sounded!!!");
	updateCurrentBlock();
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
	if (details.reason === "install") {
		console.log("installed!");
		// maybe shouldn't clear storage on install? what if 
		// re-installing -- why would that happen?? -- maybe just 
		// clear currentBlock from storage! 
		// OR/AND just set currentBlockStor = null, and configStor = null
		chrome.storage.local.clear();

		clearAlarmsPrintBytesUsed();

		// following line needs to be tested:::: 
		createAlarm(-1, timeToMinutes(dateToTime(new Date())));

		// automatically open the settings page! 
		chrome.tabs.create({ url: chrome.runtime.getURL("../settings.html")});
	} else {
		// MAYBE set currentBlockStor = null, and configStor = null
		// maybe in production also have it open settings back on update! 
		/// bc can imagine owuld only ever press update if user changed 
		// the code or redownloaded new release,, in which case it makes
		// sense to view the settings page again!
		console.log("updated!!!");

		clearAlarmsPrintBytesUsed();
		updateCurrentBlock();

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
	}
)

// figures out what sites should be blocked now given the day and time
// calls that those sites are written to storage
// calculates when an alarm should next be called (so that is is O(n) not O(2n)) also, 
// by when the current site times expire. 
//
// would be better to seperate out the get config to a different function! 
let storedConfig = null; 
function updateCurrentBlock() {

	chrome.storage.local.get("config", function(items) {
		if (items != null) {
			storedConfig = items;
		}
	})

	console.log("config:");
	console.log(storedConfig);

	const today = new Date();
	const nowMinutes = timeToMinutes(dateToTime(today));

	if (storedConfig == null) {
		console.log("Tried to fetch config from storage for updateCurrentBlock, it is null");
		// if there isn't any stored config, then set an alarm for midnight to recheck! 
		createAlarm(1439, nowMinutes);
		return; 
	}

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
		createAlarm(-1, nowMinutes);
		writeCurrentBlock(sitesBlock, sitesExclude);
		return;
	}


	const day = today.getDay(); // Sunday is 0, Saturday is 6

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
			console.log("time of times: " + time);
			console.log("first finish: " + firstFinish);
			if (nowMinutes >= time[0] && nowMinutes < time[1]) {

				// in order to be more efficient and not try to add same 
				// websites from same group, use addedGroup boolean
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
	createAlarm(firstFinish, nowMinutes);
	writeCurrentBlock(sitesBlock, sitesExclude);
}

// adds all the values in the array to the map, returning the map
// map is useful so then there are not duplicated values
function arrayAddToMap(map, arr) {
	for (let val of arr) {
		map.set(val, 1);
	}
	return map;
}

// writes to storage the current blocked,, takes in two maps as input 
// and writes them down as arrays
function writeCurrentBlock(sitesBlock, sitesExclude) {
	let sitesBlockArr = [];
	let sitesExcludeArr = [];

	sitesBlock.forEach(function(value, key, map) {
		sitesBlockArr.push(key);
	});

	sitesExclude.forEach(function(value, key, map) {
		sitesExcludeArr.push(key);
	});

	console.log("ran write current block");
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

// takes in input of when to alarm and also nowTime from 0 to 2359
// creates an alarm for that time! 

// the variables here should be const!!! once everything else in code is wroking try it :D
function createAlarm(expireMinutes, nowMinutes) {
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

	chrome.alarms.create("updateBlockingAlarm", { 
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


// IDEA: make the includes more efficient???
// easy thing to make more efficient is define when to start looking in the string...
// it would be better if the first bit (fetching currentBlock) was its own function
// 
// now that it is a callback it only runs once! :D
// will return null the first two times that a tab is updated and then the 
// real thing on the third one -- then all after have the correct currentBlock!
// also when most webpags reload / go to a different page it sends several 
// page updates so it's fine :D
let storedCurrBlock = null;
function validSite(tab) {

	chrome.storage.local.get("currentBlock", function(items) {
		if (items != null) {
			storedCurrBlock = items;
		}
	})

	console.log("storedCurrBlock:");
	console.log(storedCurrBlock);

	if (storedCurrBlock == null) {
		console.log("Tried to fetch currentBlock from storage for validSite, it is null");
		return false; 
	} 

	const url = tab.url;

	excluded = false;

	for (let s of storedCurrBlock.currentBlock.sites) {
		if (url.includes(s)) {
			excluded = false;
			for (let e of storedCurrBlock.currentBlock.exclude) {
				if (url.includes(e)) {
					excluded = true;
					break;
				}
			}
			if (!excluded) {
				return true;
			}
		}
	}
	return false;
}

function blockTab(tabId) {
	// chrome.tabs.update(tabId, {url: "../blocked.html", active: true});
	console.log("block!!");
}


// tab gets updated, checks if should block, if it should then it does 
chrome.tabs.onUpdated.addListener(function(tabID, changeInfo, tab) {
	console.log("tab updated " + tab.url);
	console.log("change info:");
	console.log(changeInfo);

	// if the change of the tab is that it has been unloaded from memory
	// or that it is currently loading don't do anything!! another event
	// will fire once it's done loading (TabStatus == "complete")
	if (changeInfo.discarded || changeInfo.status == "loading") {
		return;
	}

	// no need to check if a tab should be blocked if it cannot 
	// be blocked or if it was already blocked
	// maybe change this to chrome:// for all of them?? can't 
	// imagine someone wants to block the settings page.... 
	if (tab.url.includes("chrome://extension")) {
		return;
	}

	if (true) {
		if (validSite(tab)) {
			blockTab(tabID);
		}
	}
});