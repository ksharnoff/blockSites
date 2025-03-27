
// two objects: config in sync/local storage and currently blocked websites in session
// make the currently blocked websites object have an expiratoin time; when to recheck all of the groups to see what currently should be blocked; should be the earliest end time of the previously currently blocked websites

// do not let them store 10pm to 3am!!! when writing to storage, write that as 10pm to 11:59 then mightnight to 3am!!

// have on update of extension all alarms cleared + updateCurrentBlock!


// to do: reorder the functions written to be better! 
// to test: make an on update that writes config to storage & then have current block check ofc! 





// only left to do is get from storage & have a way to error check that failing!

// then... testing time! 
// have something run on update to write config to storage if doesn't 
// already exist,, then set alarm for 5 minutes! (plus edit the current config so that it would go off………)
// woot woot


// next steps after this is to edit the settings page so that it gets populated 
// from the storage and also so that it can write to the storage and also 
// that it can automatically make more groups


const currentBlock {
	sites: ["youtube.com", "wikipedia.org"],
	exclude: ["music.youtube.com"]
};

const config {
	groups: [
		{
			on: true, 
			sites: ["wikipedia.org", "mail.google.com"],
			exclude: ["en.wikipedia.org/wiki/California"],
			// times: [[10, 310],[2100, 2350]],
			times: [[10, 190],[1260, 1430]],
			days: [true, true, false, false, false, false, true]
		},
		{
			on: false, 
			sites: ["facebook.com", "gmail.com"],
			exclude: [],
			times: [[10, 613],[1290, 1439]],
			days: [true, false, true, true, true, false, true]
		},
	],
	blockAll: false
};
// each group should have the following variables:
	// on (bool), 
	// sites (array of strings), 
	// exclude (array of strings),
	// times (array of 2 length arrays of ints ("start", "end")), 
		// where each time is the number of minutes until that time, 
		// so 12:50pm is 12 hours 50 minutes so 1430 minutes
		// start time is always less than (before than) second time
	// days (7 length array of ints)


// if alarm goes off or the config storage gets updated! 
chrome.alarms.onAlarm.addListener(updateCurrentBlock);

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
	} else {
		updateCurrentBlock();
	}
});


// WHAT ABOUT CASE OF ANOTHER TIME IS GOING TO START IN FIVE MINUTES, 
// BEFORE ANY OF THE CURRENT ONES RUN OUT??? DOES NOT WORK!!!
// TO DO TO DO TO DO TO DO

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
	let sitesBlock = new Set;
	// array of webistes to be excluded from blocking
	let sitesExclude = new Set;

	const today = new Date();
	const nowMinutes = timeToMinutes(dateToTime(today));

	// if later want to change that blockAll will only block all in that day then double check this!! 
	if (config.blockAll) {
		for (let g of config.groups) {
			sitesBlock = arrayAddToSet(sitesBlock, g.sites)
			sitesExclude = arrayAddToSet(sitesExclude, g.exclude)
		}
		// alarm for midnight!
		createAlarm(-1, nowMinutes);
		writeCurrentBlock(Array.from(sitesBlock), Array.from(sitesExclude));
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
		if (!g.on || !g.days[day]) {
			continue;
		}

		// iterate through each time pair of the current group
		for (let time of g.times) {
			// if at or after start time and before ending time:
			if (nowMinutes >= time[0] && nowMinutes < time[1]) {

				// in order to be more efficient and not try to add same 
				// websites from same group, use addedGroup boolean
				if (!addedGroup) {
					sitesBlock = arrayAddToSet(sitesBlock, g.sites)
					sitesExclude = arrayAddToSet(sitesExclude, g.exclude)
					addedGroup = true;
				}

				if (time[1] < firstFinish) {
					firstFinish = time[1]
				}
			}
		}

	}
	createAlarm(firstFinish, nowMinutes);
	writeCurrentBlock(Array.from(sitesBlock), Array.from(sitesExclude));
}

// adds all the values in the array to the set, returning the set
// set is useful so then there are not duplicated values
function arrayAddToSet(set, arr) {
	for (let val of arr) {
		set.add(val);
	}
	return set;
}

// writes to storage the current blocked
function writeCurrentBlock(sitesBlock, sitesExclude) {
	chrome.storage.local.set({
		currentBlock: {
			"sites": sitesBlock, 
			"exclude": sitesExclude
		}
	});
}

// takes in input of when to alarm and also nowTime from 0 to 2359
// creates an alarm for that time! 

// the variables here should be const!!! once everything else in code is wroking try it :D
function createAlarm(expireMinutes, nowMinutes) {
	// should expire at midnight at the latest, if expire time is smaller 
	// than now time that means the next day, so it should be midnight
	// midnight is 23hours, 59 minutes which is 1,439 minutes
	if (expireTime < nowTime || expireTime > 1439) {
		expireTime = 1439;
	}

	// the alarm will be 1 minute late in order to garentee that it happens, imagine the scneario of an alarm begin set for 0 minutes and it not working right
	let minutesAlarm = 1 + expireMinutes-nowMinutes;

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
		if url.includes(s) {
			for (let e of currentBlock.exclude) {
				if url.includes(e) {
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
