
chrome.tabs.onUpdated.addListener(function(tabID, changeInfo, tab) {
	if (validTime()) {
		if (validSite(tab)) {
			blockTab(tabID);
		}
	}
});

function validTime() {
	// chaque jour
	const allTimesStarts = 3 // 12:03am
	const allTimesEnds = 905 // 9:05am

	const today = new Date();
	const day = today.getDay(); // Sunday is 0, Saturday is 6
	const now = today.getMinutes() + (today.getHours() * 100);

	// switch statemetn bc later when i am fetching from storage switch statemetn will be useful
	switch (day) {
	case 0: // sunday 
		return timeInTimeRange(now, allTimesStarts, allTimesEnds);
	case 1: // monday 
		return timeInTimeRange(now, allTimesStarts, allTimesEnds);

	case 2: // tuesday 
		return timeInTimeRange(now, allTimesStarts, allTimesEnds);
      
	case 3: // wednesday
		return timeInTimeRange(now, allTimesStarts, allTimesEnds);

	case 4: // thursday
		return timeInTimeRange(now, allTimesStarts, allTimesEnds);
	case 5: // friday
		return timeInTimeRange(now, allTimesStarts, allTimesEnds);
	case 6: // saturday
		return timeInTimeRange(now, allTimesStarts, allTimesEnds);
	default: 
		return false;
	}
}

// returns true if the inputted (now) time is within the time range
// startTime and EndTime could be either order in greater than or less than -- right now must be within!!
// startTime and EndTime are ints where hhmm
// nowTime is the time right now as an int: hhmm
function timeInTimeRange(nowTime, startTime, endTime) {
	if (startTime == endTime) { // if time is 10pm to 10pm ex: 2200 2200
		if (nowTime == startTime) {
			return true;
		}
	}

	// this doesn't seem to be working...
	if (endTime < startTime) { // for example, 10pm to 4am (2200 to 400)
		if (timeInTimeRange(nowTime, startTime, 2359)) {
			return true;
		}
		if (timeInTimeRange(nowTime, 0, endTime)) {
			return true;
		}
		return false; // return here because checking the end time will be bad 
	} 

	if (nowTime >= startTime) {
		if (nowTime <= endTime) {
			return true;
		}
	}

	return false;
}


// IDEA: make the includes more efficient?
// easy thing to make more efficient is define when to start looking in the string...
function validSite(tab) {

	if (tab.url.includes("youtube.com")) {
		if (tab.url.includes("music")) {
			return false;
		} else {
			return true;
		}
	return false;
}

function validSiteTesting(tab) {
	if (tab.url.includes("wikipedia.org")) {
		return true;
	}
	return false;
}

function blockTab(tabId) {
	chrome.tabs.update(tabId, {url: "../blocked.html", active: true});
}
