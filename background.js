
// two objects: config in sync/local storage and currently blocked websites in session
// make the currently blocked websites object have an expiratoin time; when to recheck all of the groups to see what currently should be blocked; should be the earliest end time of the previously currently blocked websites

// do not let them store 10pm to 3am!!! when writing to storage, write that as 10pm to 11:59 then mightnight to 3am!!

// have on update of extension all alarms cleared + updateCurrentBlock!


// to do: reorder the functions written to be better! 
// to test: make an on update that writes config to storage & then have current block check ofc! 

const currentBlock = {
	sites: ["youtube.com", "wikipedia.org"],
	exclude: ["music.youtube.com"]
};

const config = {
	groups: [
		{
			active: true, 
			sites: ["wikipedia.org", "mail.google.com"],
			exclude: ["en.wikipedia.org/wiki/California"],
			times: [[10, 190],[1260, 1414]],
			days: [true, true, false, true, true, true, true]
		},
		{
			active: false, 
			sites: ["facebook.com", "gmail.com"],
			exclude: [],
			times: [[10, 613],[1290, 1439]],
			days: [true, false, true, true, true, false, true]
		},
	],
	blockAll: true
};
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
		if (key === "config") {
			updateCurrentBlock();
		}
	}
});

// when the chrome extension is installed or updated then:
chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason === "install") {
		// do some stuff on install
		// maybe have it console.log the bytes curretnly in storage?? would be fun :D
	} else {
		console.log("updated!!!");
		updateCurrentBlock();
	}
});

chrome.storage.onChanged.addListener(function(changes, areaName) {
	console.log("!!!!storage changed!");
	console.log(changes);
	console.log("current block: " + chrome.storage.local.get("currentBlock"));
	}
)

// figures out what sites should be blocked now given the day and time
// calls that those sites are written to storage
// calculates when an alarm should next be called (so that is is O(n) not O(2n)) also, 
// by when the current site times expire. 
function updateCurrentBlock() {

	// need to try to get config from storage! if config doesn't exist, 
	// try an alarm for 5 minutes,, if still doesn't exist then stop alarming..... 
	// TO DO TO DO TO DO TO DO

	// how to check for error of get???/

	// array of websites to be written to storage to be blocked
	let sitesBlock = new Map();
	// array of webistes to be excluded from blocking
	let sitesExclude = new Map();

	const today = new Date();
	const nowMinutes = timeToMinutes(dateToTime(today));

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
			"sites": sitesBlock, 
			"exclude": sitesExclude
		}
	});
	if (chrome.runtime.lastError) {
	 	console.log("chrome runtime last error exists! failed to write to storage!");
        console.log(chrome.runtime.lastError);
    } 

    chrome.storage.sync.get(null, function (data) { console.log("all storage:" + data) });
}

// takes in input of when to alarm and also nowTime from 0 to 2359
// creates an alarm for that time! 

// the variables here should be const!!! once everything else in code is wroking try it :D
function createAlarm(expireMinutes, nowMinutes) {
	console.log("Creating alarm! expire at" + expireMinutes + " now is " + nowMinutes);
	// should expire at midnight at the latest, if expire time is smaller 
	// than now time that means the next day, so it should be midnight
	// midnight is 23hours, 59 minutes which is 1,439 minutes
	if (expireMinutes < nowMinutes || expireMinutes > 1439) {
		expireMinutes = 1439;
	}

	// the alarm will be 1 minute late in order to garentee that it happens, imagine the scneario of an alarm begin set for 0 minutes and it not working right
	let minutesAlarm = 1 + expireMinutes-nowMinutes;

	console.log("will expire in " + minutesAlarm);

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
function validSite(tab) {

	// need to get currentBlock from storage!! 
	// TO DO TO DO TO DO TO DO

	const url = tab.url;

	for (let s of currentBlock.sites) {
		if (url.includes(s)) {
			for (let e of currentBlock.exclude) {
				if (url.includes(e)) {
					continue;
				}
			}
			return true;
		}
	}
	return false;
}

function blockTab(tabId) {
	chrome.tabs.update(tabId, {url: "../blocked.html", active: true});
}


const test = true;

// tab gets updated, checks if should block, if it should then it does 
chrome.tabs.onUpdated.addListener(function(tabID, changeInfo, tab) {
	if (!test) {
		if (validSite(tab)) {
			blockTab(tabID);
		}
	}
});
