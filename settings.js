/*
	MIT License
	Copyright (c) 2025 Kezia Sharnoff

	- blockSites Chrome Extension
	- settings.js
	This is the functionality of the settings page: getting the previous settings
	from storage and saving changes.
*/

import { getConfig, swapClicked, isButtonOn, buttonOn, buttonOff, checkBlockedSettings, checkURLSite, setConfig, nowPlusMinutes } from "./sharedFunctions.js";

// Help button being clicked launches the help webpage. 
document.getElementById("helpButton").addEventListener("click", function() {
	chrome.tabs.create({ url: chrome.runtime.getURL("../help.html")});
});

// Div with all the divs of each website group
let allGroupsDiv = document.getElementById("allGroupsDiv");
let change = true;

// Once the page loads, get config from storage and fill in the groups with the
// data, or if config is null then make some empty groups to fill in. 
window.addEventListener("load", function() {
	getConfig()
	.then(function(value) {

		// block all setting changes until time
		let blockSettingsButton = document.getElementById("blockSettingsButton");
		buttonOff(blockSettingsButton, true);

		let whenBlockSettings = dateTomorrow();
		// see if settings are currently blocked, therefore set change = false 
		// so do not register any changes
		if (checkBlockedSettings(value)) {
			whenBlockSettings = miliToDateTimeInput(value.blockSettings);
			buttonOn(blockSettingsButton, true);
			change = false;
			document.getElementById("save").innerHTML = "no settings can be changed";
		}

		// write down the current paused timing so that it can be saved later
		if (value !== null & value.pauseUntil !== undefined) {
			allGroupsDiv.dataset.pauseUntil = value.pauseUntil;
		} else {
			allGroupsDiv.dataset.pauseUntil = null;
		}

		let blockSettingsDate = document.getElementById("blockSettingsDate");
		blockSettingsDate.value = whenBlockSettings[0];
		let blockSettingsTime = document.getElementById("blockSettingsTime");
		blockSettingsTime.value = whenBlockSettings[1];

		// block all button
		let blockAllButton = document.getElementById("blockAll");
		buttonOff(blockAllButton, true);

		if (value !== null && value.blockAll !== undefined) {
			if (value.blockAll) {
				buttonOn(blockAllButton, true);
			} 
		}

		// block all sites until time
		let blockAllUntilButton = document.getElementById("blockAllUntilButton");
		buttonOff(blockAllUntilButton, true);

		let whenBlockAll = dateTomorrow();
		if (value !== null && value.blockAllUntil !== undefined && value.blockAllUntil !== null) {
			whenBlockAll = miliToDateTimeInput(value.blockAllUntil);
			buttonOn(blockAllUntilButton, true);
		}
		let blockAllUntilDate = document.getElementById("blockAllUntilDate");
		blockAllUntilDate.value = whenBlockAll[0];
		let blockAllUntilTime = document.getElementById("blockAllUntilTime");
		blockAllUntilTime.value = whenBlockAll[1];


		// allow pausing button
		let pauseButton = document.getElementById("pauseButton");
		buttonOn(pauseButton, true);

		if (value !== null && value.pause !== undefined) {
			if (!(value.pause)) {
				buttonOff(pauseButton, true);
			}
		}

		// redirect to different URL
		let redirectURL = document.getElementById("redirectURL");
		if (value !== null && value.redirect !== undefined) {
			redirectURL.value = value.redirect;
		}

		// fill in groups 
		if (value == null || value.groups === undefined || value.groups.length < 1) {
			drawGroup(1, null);
			allGroupsDiv.dataset.groupCount = 1;
		} else {
			let numGroups = value.groups.length;
			for (let i = 0; i < numGroups; i++) {
				drawGroup(i + 1, value.groups[i]);
			}
			allGroupsDiv.dataset.groupCount = numGroups; 
		}		

		// these buttons have to editing if or if not changes are allowed
		// (to add a listener on click or to turn off hover color changes)
		let saveButton = document.getElementById("save");
		let moreGroupsButton = document.getElementById("moreGroups");


		// set up all event listeners only if settings are allowed to be changed
		if (change) {
			// settings buttons at the top
			blockSettingsButton.addEventListener("click", function() {
				swapClicked(blockSettingsButton, true);				
			});
			blockAllButton.addEventListener("click", function() {
				swapClicked(blockAllButton, true);
			});
			blockAllUntilButton.addEventListener("click", function() {
				swapClicked(blockAllUntilButton, true);
			});
			pauseButton.addEventListener("click", function() {
				swapClicked(pauseButton, true);
			});

			// saving
			saveButton.addEventListener("click", save);

			document.addEventListener("click", saveAfterWait)
			document.addEventListener("keydown", saveAfterWait)
			// Save the data once the page is closed
			window.addEventListener("beforeunload", function() {
				save();
			});

			moreGroupsButton.addEventListener("click", moreGroups)
		} else {
			// make the inputs unclickable
			blockSettingsDate.style.pointerEvents = "none";
			blockSettingsTime.style.pointerEvents = "none";
			blockAllUntilDate.style.pointerEvents = "none";
			blockAllUntilTime.style.pointerEvents = "none";
			redirectURL.style.pointerEvents = "none";

			// make the button un editable
			blockSettingsButton.classList.add("disabled");
			blockAllButton.classList.add("disabled");
			blockAllUntilButton.classList.add("disabled");
			pauseButton.classList.add("disabled");
			saveButton.className = "disabled";
			moreGroupsButton.classList.add("disabled");
		}

		// Hide loading message that says the page isn't loaded
		document.getElementById("loadingMessage").style.visibility = "hidden";
	})
});

// Deal with any changes done by the popup so that they are here as well. The
// changes will also be saved to storage from the background script, because
// then we don't need to differentiate for if the settings page is open. 
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
	console.log("got a message!!!!! <--------");
	console.log(request);

	if (request === undefined || request.task === undefined) {
		// do nothing! something failed!
		return;
	}

	if (request.task === "blockAll") {
		if (request.active !== undefined) {
			swapClicked(document.getElementById("blockAll"), true);
		}
	} else if (request.task === "pause") {
		if (request.time !== undefined) {
			allGroupsDiv.dataset.pauseUntil = nowPlusMinutes(request.time);
		}
	} else if (request.task === "cancelPause") {
		allGroupsDiv.dataset.pauseUntil = null;
	}
});

//////////////////////////
// Saving data to storage: 
//////////////////////////

// Iterate through all the groups, get all the inputs, make it into Group 
// objects, and save to storage as "config".
function save() {
	// get total group count
	let newGroupCount = parseInt(allGroupsDiv.dataset.groupCount);
	if (isNaN(newGroupCount)) {
		return;
	}

	// get data per each group and add it to the list
	let groupsList = [];
	for (let i = 1; i <= newGroupCount; i++) {
		const groupObj = saveGroupFromInputs(i);
		if (groupObj !== null) {
			groupsList.push(groupObj);
		}
	}

	// figure it blockAll is on
	let blockAll = false;
	let blockAllButton = document.getElementById("blockAll");
	if (isButtonOn(blockAllButton)) {
		blockAll = true;
	}

	// get blockAllSitesUntil
	let blockAllUntilButton = document.getElementById("blockAllUntilButton");
	let blockAllUntil = null;
	if (isButtonOn(blockAllUntilButton)) {
		const date = document.getElementById("blockAllUntilDate").value;
		const time = document.getElementById("blockAllUntilTime").value;
		blockAllUntil = dateTimeInputToMili([date, time]);
		blockAll = true;
	}

	// figure if pausing is allowed
	let pauseButton = document.getElementById("pauseButton");
	let pause = false;
	if (isButtonOn(pauseButton)) {
		pause = true;
	}

	// get blockSettingsUntil
	let blockSettings = null;
	let blockSettingsButton = document.getElementById("blockSettingsButton");
	if (isButtonOn(blockSettingsButton)) {
		const date = document.getElementById("blockSettingsDate").value;
		const time = document.getElementById("blockSettingsTime").value;
		blockSettings = dateTimeInputToMili([date, time]);
	}

	// get redirect URL
	let redirectURLInput = document.getElementById("redirectURL");
	let redirectURL = redirectURLInput.value;
	redirectURL = validRedirect(redirectURL, groupsList);

	// save the pause until that was saved from when config was first loaded
	let pauseUntil = allGroupsDiv.dataset.pauseUntil;
	// should only be null or milliseconds since epoch
	if (pauseUntil !== null && isNaN(parseInt(pauseUntil))) {
		pauseUntil = null;
	}

	// create config object: list of groups and blockAll
	const config = {
		groups: groupsList,
		blockAll: blockAll,
		blockAllUntil: blockAllUntil,
		blockSettings: blockSettings,
		pause: pause, 
		pauseUntil: pauseUntil,
		redirect: redirectURL
	}

	let saveButton = document.getElementById("save");

	console.log(config);

	setConfig(config).then(function() {
		// give the user feedback that it saved! 
		saveButton.innerHTML = "saved!";

		// then go back to normal text
		setTimeout(function() {
			saveButton.innerHTML = "save";
		}, 1500)
	});
}

// Input redirect url the string and groups, the object list of groups
// Returns "" if the url would block one of the websites in the list of groups
// and the inputted url otherwise
function validRedirect(urlStr, groups) {
	document.getElementById("redirectURLError").innerHTML = "";
	urlStr = urlStr.trim();

	if (urlStr === "") {
		noErrorCircle();
		return urlStr;
	}

	// check if it has protocol at beginning like https:// or mailto://
	let url; 
	try {
		url = new URL(urlStr);
	} catch (error) {
		errorCircle("invalid URL, cannot save");
		return "";
	}

	// iterate through all groups, to see if there is overlap, which would 
	// cause an infinite looping problem later
	for (const g of groups) {
		if (!(g.active)) {
			continue;
		}

		// used in domain matching
		let periodURL = "." + url.hostname;

		// If excluded for this group, then don't need to check the sites
		// because the excluded and the blocked sites travel together
		let skipGroup = false
		for (const e of g.excludes) {
			if (checkURLSite(e, periodURL, "domain")) {
				skipGroup = true;
				break;
			}
		}
		for (const e of g.excludesChar) {
			if (checkURLSite(e, urlStr, "char")) {
				skipGroup = true;
				break;
			}
		}
		for (const e of g.excludesRegex) {
			if (checkURLSite(e, urlStr, "regex")) {
				skipGroup = true;
				break;
			}
		}
		// If excluded, then don't need to check if blocked
		if (skipGroup) {
			continue;
		}


		for (const s of g.sites) {
			if (checkURLSite(s, periodURL, "domain")) {
				errorCircle("overlap with blocked website, cannot save");
				return "";
			}
		}
		for (const s of g.sitesChar) {
			if (checkURLSite(s, urlStr, "char")) {
				errorCircle("overlap with blocked website, cannot save");
				return "";
			}
		}
		for (const s of g.sitesRegex) {
			if (checkURLSite(s, urlStr, "regex")) {
				errorCircle("overlap with blocked website, cannot save");
				return "";
			}
		}
	}
	noErrorCircle()
	return urlStr;
}

// Changes the color of the error circle next to the redirect URL input to red
// and write the inputted error message next to it. 
function errorCircle(error) {
	document.getElementById("redirectURLCircle").className = "circle redCircle";
	document.getElementById("redirectURLError").innerHTML = error;
}

// Makes the circle green
function noErrorCircle() {
	document.getElementById("redirectURLCircle").className = "circle greenCircle";
}

// Sets a timer specified by waitTime and once it has passed that time without
// being called again, the callback is run. This is used to save the inputs 
// 500ms after the last click or key press
// This debounce function and the related listeners are from
// https://stackoverflow.com/a/75988895
const debounce = (callback, waitTime) => {
	let timeoutId = null;
	return (...args) => {
		window.clearTimeout(timeoutId);
		timeoutId = window.setTimeout(() => {
			callback(...args);
		}, waitTime);
	};
}
const saveAfterWait = debounce((event) => {
	save()
}, 750);

// The names of the day selection buttons, used to draw the groups and save the
// inputs later. 
const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Iterates through the input elements of groupNum and gets all the information
// from all its fields. If the group still has the default information (the user
// has not edited it), then null is returned. If the group has been edited, 
// a Group object is returned. This is called from the on click save button. 
function saveGroupFromInputs(groupNum) {
	const groupElements = document.querySelectorAll(
			'[data-group = "' + groupNum + '"]'
		);

	// If no group exists with that number (can happen if groups are deleted)
	if (groupElements === null || groupElements === undefined || 
		groupElements.length < 1) {
		return null;
	}

	let name = "";
	let active = true;
	let days = [false, true, true, true, true, true, false];
	let timeNodes = []; // storeX elements, deal with after
	let siteNodes = [];
	let excludeNodes = [];

	// bool to track if the group has any content, aside from name
	let changed = false;

	// logic of storing each element and if it would change the changes bool
	groupElements.forEach(function(element) {
		const type = element.dataset.type;

		// on or day of the week 
		if (type.length === 2) {
			if (type === "on") {
				active = isButtonOn(element);
				if (!active) { 
					changed = true; 
				}
				return;
			}

			let index = daysOfWeek.indexOf(type);

			if (index < 0) {
				console.log("Unexpected button name when trying to save");
				console.log(type);
				return;
			}

			days[index] = isButtonOn(element);

			// If Sunday or Saturday and is true, then something was changed
			if ((index === 0 && days[0])|| (index === 6 && days[6])) {
				changed = true;
				return;
			}

			// If Monday through Friday and is false, then something was changed
			if (!days[index]) {
				changed = true;
			}
			return; 
		}

		// times
		if (type === "startTime" || type === "endTime") {
			timeNodes.push(element);
			return;
		}

		// name
		if (type === "groupName") {
			name = element.value;
			return
		}

		// sites to block
		if (type === "site") {
			const site = element.value.trim();
			if (site !== "") {
				siteNodes.push(element)
				changed = true; 
			}
			return;
		}

		// sites to exclude from blocking
		if (type == "exclude") {
			const exclude = element.value.trim();
			if (exclude !== "") {
				excludeNodes.push(element);
				changed = true; 
			}
			return;
		}

		if (type == "selectSiteType") {
			return;
		}

		// shouldn't get here 
		console.log("While trying to save, ran into unfamiliar type of group");
		console.log(type);
	});

	// match the start and end times and translate to correct format
	const times = matchStartEndTimeNodes(timeNodes, groupNum);
	if (times.length > 0) {
		changed = true;
	}

	const sitesObj = matchSiteToType(siteNodes, groupNum, false);
	const excludesObj = matchSiteToType(excludeNodes, groupNum, true);

	if (!changed) {
		return null;
	}

	return new Group(name, active, sitesObj, excludesObj, times, days);
}

// Helper for storing input to groups while saving. Iterates through list of 
// time elements, matching the pairs together, then translates to correct
// format. Returns the formatted list of times.
function matchStartEndTimeNodes(elementList, groupNum) {
	let len = elementList.length;
	if (len < 1) { // case of no times
		return [];
	}

	// get count of time pairs in this group
	let timeDiv = document.getElementById("timeDiv" + groupNum);
	let timeCount = timeDiv.dataset.paircount;

	if (isNaN(timeCount)) {
		console.log("Tried to get pair count for the times to save, it isn't a number");
		timeCount = 100;
	}

	// create empty list big enough for all the time pairs
	let timePairs = [];
	for (let i = 0; i < timeCount; i++) {
		timePairs.push(["", ""]);
	}

	// for all the time nodes, fill in their position on the timePairs array
	elementList.forEach(function(element) {
		if (element.value === "") {
			return;
		}

		// get which pair it is out of all the time nodes
		let index = parseInt(element.dataset.timepair);
		if (isNaN(index)) {
			console.log("failed in saving, time pair count not an int");
			return;
		}
		index -= 1;

		// figure what position it is within its pair (start or end)
		let pairIndex = 1;
		if (element.dataset.type === "startTime") {
			pairIndex = 0;
		}

		// the following should never happen, just in case: 
		if (index >= timePairs.length || index < 0) {
			console.log("timePairs array not enough room for start and end!");
			console.log(index);
			console.log(timePairs);
			console.log(timePairs.length);
			return;
		}

		timePairs[index][pairIndex] = element.value;
	});


	let finalTimes = [];

	// iterate through each of the stored times, translate to the correct format,
	// if no time was saved (left blank), then do not push it to the final time
	// list. this also deals with any extra space left from using the 
	// dataset.timepair which may be bigger than the final number of times,
	// after possibly deleting some of them. 
	for (let i = 0; i < timePairs.length; i++) {
		const timePairArr = timeToMinutes(timePairs[i]);

		if (timePairs[i][0] != -1 || timePairs[i][1] != -1) {

			// case of a time that lasts over midnight: 10pm to 3am
			if (timePairArr[1] < timePairArr[0] && timePairArr[1] != -1) {
				const firstPair = [timePairArr[0], 1439];
				finalTimes.push(firstPair);

				if (timePairArr[1] !== 0) {
					const secondPair = [0, timePairArr[1]];
					finalTimes.push(secondPair);
				}
			} else {
				finalTimes.push(timePairArr);
			}
		}
	}
	return finalTimes;
}

// Helper for storing input to groups while saving. Iterates through list of 
// input elements, matching the text with what is selected in the dropdown,  // domain, char, or regex. groupNum is necessary as an input in order to get 
// the id of the dropdown correctly. An object with all the sites of the group
// in their own lists is returned, if excludes is true then the object is the
// excludes sites object while if not then it is a sites object. 
function matchSiteToType(elementList, groupNum, excludes) {
	let domain = [];
	let char = [];
	let regex = [];

	let middle = "site";
	if (excludes) {
		middle = "exclude";
	}


	elementList.forEach(function(element) {
		let siteNum = parseInt(element.dataset.sitenum);
		if (isNaN(siteNum)) {
			console.log("Tried to save site but its sitenum wasn't a number");
			return;
		}
		const siteTypeSelect = document.getElementById(groupNum + middle + siteNum);

		let siteType = "domain";
		if (siteTypeSelect !== null) {
			siteType = siteTypeSelect.value;
		} 

		if (siteType === "char") {
			char.push(element.value);
		} else if (siteType === "regex") {
			regex.push(element.value);
		} else {
			domain.push(element.value);
		}
	});

	if (excludes) {
		const obj = {
			excludes: domain,
			excludesChar: char,
			excludesRegex: regex,
		}
		return obj;
	}

	const obj = {
		sites: domain,
		sitesChar: char,
		sitesRegex: regex,
	}
	return obj;
}

// Returns a Group object where name is a string; active is a boolean; sitesObj
// and excludesObj are objects each with three arrays of strings for the three
// types of site matching: domain, character includes, and regex; times is an
// array of two length arrays, where the first element is start time (in 
// minutes since 12am) and the second element is end time; days is a 7-array of 
// booleans. 
function Group(name, active, sitesObj, excludesObj, times, days) {
	this.name = name;
	this.active = active;
	this.sites = sitesObj.sites;
	this.sitesChar = sitesObj.sitesChar;
	this.sitesRegex = sitesObj.sitesRegex;
	this.excludes = excludesObj.excludes;
	this.excludesChar = excludesObj.excludesChar;
	this.excludesRegex = excludesObj.excludesRegex;
	this.times = times;
	this.days = days;
}

///////////////////////////////////////////////////////////////
// Time formatting and translating (used in drawing and saving) 
///////////////////////////////////////////////////////////////

// Inputs an array of ints (how time is stored in config) that represent
// the time after midnight in minutes. Returns an array that has 
// those same times translated to be strings in "hh:mm" in
// 24 hour time, in order to be displayed in the time input. Any invalid times
// will be returned as empty strings. 
// Example: [5, 613] --> ["00:05", "10:13"]
function minutesToTime(minutes) {
	const len = minutes.length;
	if (len < 1) {
		return ["", ""];
	}

	for (let i = 0; i < len; i++) {
		if (minutes[i] == -1) {
			minutes[i] = "";
			continue;
		}

		let hh = Math.trunc(minutes[i] / 60);
		hh = hh.toString();
		if (hh.length < 2) {
		   hh = "0" + hh;
		}

		let mm = minutes[i] % 60;
		mm = mm.toString();
		if (mm.length < 2) {
		  mm = "0" + mm;
		}
		minutes[i] = hh + ':' + mm;
	}
	return minutes;
}

// Inputs a string array (how time is inputted on settings page)
// that represents the time in 24 hour time in the form "hh:mm". Returns an
// array with those time values as ints as minutes after midnight. Any 
// invalid times will be returned as -1. 
// example: ["00:13", "11:59"] --> [13, 1439]
function timeToMinutes(time) {
	const len = time.length;

	if (len < 1) {
		return [-1, -1];
	}

	for (let i = 0; i < len; i++) {
		if (time[i] === undefined || time[i].length < 5) {
			time[i] = -1;
			continue;
		}

		let hh = parseInt(time[i]); // parses up till it's not an int, the :
		let mm = parseInt(time[i].substring(3));
		if (isNaN(hh) || isNaN(mm)) {
			return null;
		}
		time[i] = 60*hh + mm;
	}

	return time;
}

// Returns a 2-array string of the date and time in ~24 hours. The first string 
// is the date in the format of "yyyy-mm-dd", the second is the time in the 
// format of "hh:mm". 
function dateTomorrow() {
	// using milliseconds to deal with some possible time issues
	let tomorrow = Date.now() + 1000*60*60*24 + 1000*60*10;

	return miliToDateTimeInput(tomorrow);
}
// Inputs a date in milliseconds and then returns a 2-array string of the date
// and time. The first string is the date in the format of "yyyy-mm-dd", the 
// second is the time in the format of "hh:mm". 
function miliToDateTimeInput(dateMili) {
	let date = new Date();
	date.setTime(dateMili);

	const calendar = "" + date.getFullYear() + "-" + doubleDigits((date.getMonth()+1)) + "-" + doubleDigits(date.getDate());

	const time = "" + doubleDigits(date.getHours()) + ":" + doubleDigits(date.getMinutes());

	return [calendar, time];
}
// Helper function for dateTomorrow(), input a number and return that same 
// number with a 0 prepended if necessary to make it two digits. 
function doubleDigits(num) {
	if (num < 10) {
		return "0" + num;
	}
	return num
}
// Inputs the formatted date and time for those input elements, returns them as
// milliseconds after the epoch for storage. 
function dateTimeInputToMili(dateTime) {
	if (dateTime.length < 2) {
		return null;
	}
	const date = dateTime[0];

	const year = parseInt(date);
	const monthIndex = parseInt(date.substring(5)) - 1;
	const day = parseInt(date.substring(8))

	if (isNaN(year) || isNaN(monthIndex) || isNaN(day)) {
		return null;
	} else if (year < 0 || monthIndex < 0 || day <= 0) {
		return null;
	}

	const time = dateTime[1];

	let hours = parseInt(time);
	let minutes = parseInt(time.substring(3));

	if (isNaN(hours) || isNaN(minutes) || hours < 0 || minutes < 0) {
		hours = 0;
		minutes = 0;
	}

	let newDate = new Date(year, monthIndex, day, hours, minutes)
	return newDate.getTime()
}

///////////////////////////////////////////
// Drawing empty and full groups to screen: 
///////////////////////////////////////////

// Once more groups button is pressed, calculate the groupNum of the new group
// and then draw it. 
function moreGroups() {
	let newGroupCount = parseInt(allGroupsDiv.dataset.groupCount);

	if (isNaN(newGroupCount)) {
		console.log("Failed to turn group count in allGroupsDiv into an int");
		// allGroupDiv counter should not fail, but if it does we still
		// want to make a new group div with a unique id counter, we do a 
		// random number from 10000 to 11000, extremely unlikely to exist 
		// already. 
		newGroupCount = Math.floor(10000*Math.random()) + 1000;
	} else {
		newGroupCount++;
	}

	drawGroup(newGroupCount, null);
	allGroupsDiv.dataset.groupCount = newGroupCount;
}

// Input a group number and group object (or null) and draw all the input fields
// and buttons necessary onto the settings page. 
function drawGroup(groupNum, group) {
	// if group is null or any fields are undefined, set to default values
	group = cleanGroupForDraw(groupNum, group);

	// Create divs for the entire group plus a new line and to hold the three
	// columns
	let groupDiv = document.createElement("div");
	let thirdsDiv = document.createElement("div");
	thirdsDiv.className = "twoColumns container";

	// divs for each column
	let leftGroupDiv = document.createElement("div");
	let rightGroupDiv = document.createElement("div");


	// group name
	let groupName = paragraphElement("name:");
	groupName.style.cssText = "display: inline-block;";
	leftGroupDiv.appendChild(groupName);

	let nameInput = textInput("name", groupNum, group.name, 250);
	nameInput.dataset.type = "groupName";
	leftGroupDiv.appendChild(nameInput);
	leftGroupDiv.appendChild(blankLineElement());


	// set the group to active or not
	leftGroupDiv.appendChild(buttonElement("on", groupNum, group.active, true));
	leftGroupDiv.appendChild(
		deleteElementButton(groupDiv, allGroupsDiv, "delete group")
	);

	leftGroupDiv.appendChild(blankLineElement());
	leftGroupDiv.appendChild(blankLineElement());


	leftGroupDiv.appendChild(paragraphElement("times to block:"));

	// time inputs
	let timeCount = group.times.length;
	let timeDiv = document.createElement("div");
	timeDiv.id = "timeDiv" + groupNum;
	timeDiv.dataset.paircount = timeCount;

	for (let i = 0; i < timeCount; i++) {
		timeDiv.appendChild(
			timeInputsDiv(groupNum, i+1, group.times[i][0], group.times[i][1], timeDiv)
		);
	}
	leftGroupDiv.appendChild(timeDiv);

	// more times button 
	leftGroupDiv.appendChild(moreInputsButton("time", "more times", groupNum));
	leftGroupDiv.appendChild(blankLineElement());


	// days of the week buttons
	leftGroupDiv.appendChild(paragraphElement("days blocked: (green)"));

	let dayDiv = document.createElement("div");
	for (let i = 0; i < 7; i++){
		dayDiv.appendChild(
			buttonElement(daysOfWeek[i], groupNum, group.days[i], false)
		);
	}
	leftGroupDiv.appendChild(dayDiv);


	// sites to block
	rightGroupDiv.appendChild(paragraphElement("sites to block:"));

	// inputs for sites
	let siteDiv = document.createElement("div");
	siteDiv.id = "siteDiv" + groupNum;
	siteDiv.dataset.sitecount = countSites(group, false);

	let offset = 1;

	let sitesCount = group.sites.length;
	for (let i = 0; i < sitesCount; i++) {
		siteDiv.appendChild(
			textInputDiv("site", i+offset, "domain", groupNum, group.sites[i], siteDiv)
		);
	}
	offset = sitesCount + 1;
	let sitesCharCount = group.sitesChar.length; 
	for (let i = 0; i < sitesCharCount; i++) {
		siteDiv.appendChild(
			textInputDiv("site", i+offset, "char", groupNum, group.sitesChar[i], siteDiv)
		);
	}
	offset = sitesCount + sitesCharCount + 1; 
	let sitesRegexCount = group.sitesRegex.length; 
	for (let i = 0; i < sitesRegexCount; i++) {
		siteDiv.appendChild(
			textInputDiv("site", i+offset, "regex", groupNum, group.sitesRegex[i], siteDiv)
		);
	}

	rightGroupDiv.appendChild(siteDiv);

	// button for more sites
	rightGroupDiv.appendChild(moreInputsButton("site", "more sites", groupNum));
	rightGroupDiv.appendChild(blankLineElement());


	// sites to exclude from blocking
	rightGroupDiv.appendChild(paragraphElement("sites to exclude from blocking:"));

	let excludeDiv = document.createElement("div");
	excludeDiv.id = "excludeDiv" + groupNum;
	let excludeCount = group.excludes.length;
	excludeDiv.dataset.sitecount = countSites(group, true);

	offset = 1;

	let excludesCount = group.excludes.length;
	for (let i = 0; i < excludesCount; i++) {
		excludeDiv.appendChild(
			textInputDiv("exclude", i+offset, "domain", groupNum, group.excludes[i], excludeDiv)
		);
	}
	offset = excludesCount + 1;
	let excludesCharCount = group.excludesChar.length; 
	for (let i = 0; i < excludesCharCount; i++) {
		excludeDiv.appendChild(
			textInputDiv("exclude", i+offset, "char", groupNum, group.excludesChar[i], excludeDiv)
		);
	}
	offset = excludesCount + excludesCharCount + 1; 
	let excludesRegexCount = group.excludesRegex.length; 
	for (let i = 0; i < excludesRegexCount; i++) {
		excludeDiv.appendChild(
			textInputDiv("exclude", i+offset, "regex", groupNum, group.excludesRegex[i], excludeDiv)
		);
	}


	rightGroupDiv.appendChild(excludeDiv);

	// button for more excludes
	rightGroupDiv.appendChild(moreInputsButton("exclude", "more sites", groupNum));

	thirdsDiv.appendChild(leftGroupDiv);
	thirdsDiv.appendChild(rightGroupDiv);

	groupDiv.appendChild(thirdsDiv);
	groupDiv.appendChild(blankLineElement());
	allGroupsDiv.appendChild(groupDiv);
}

// Inputs group object and its number (to put in the name), returns a group
// with any missing values set to the default ones or create a new group
// with default values from null. 
// to make the name
function cleanGroupForDraw(groupNum, group) {
	if (group == null) {
		const excludesObj = {
			excludes: [""],
			excludesChar: [],
			excludesRegex: [],
		}
		const sitesObj = {
			sites: ["", ""], 
			sitesChar: [],
			sitesRegex: []
		}

		group = new Group("group " + groupNum,
			true, 
			sitesObj, 
			excludesObj, 
			[["", ""]], 
			[false, true, true, true, true, true, false]);
		console.log(group);
		return group;
	}

	// name, active, times, days should not be undefined, this is just in case
	if (group.name === undefined) {
		group.name = "group " + groupNum;
	}
	if (group.active === undefined) {
		group.active = true;
	}

	// Create any lists that may be empty so that we don't have to deal with
	// checking if it is undefined in the drawGroup() function
	if (group.sites === undefined || countSites(group, false) < 1) {
		group.sites = ["", ""];
	}
	if (group.sitesChar === undefined) {
		group.sitesChar = [];
	}
	if (group.sitesRegex === undefined) {
		group.sitesRegex = [];
	}

	if (group.excludes == undefined || countSites(group, true) < 1) {
		group.excludes = [""];
	}
	if (group.excludesChar === undefined) {
		group.excludesChar = [];
	}
	if (group.excludesRegex === undefined) {
		group.excludesRegex = [];
	}

	if (group.times === undefined || group.times.length < 1) {
		group.times = [["", ""]];
	} else {
		for (let i = 0; i < group.times.length; i++) {
			group.times[i] = minutesToTime(group.times[i]);
		}
	}

	if (group.days === undefined || group.days.length != 7) {
		group.days = [false, true, true, true, true, true, false];
	}
	return group;
}

// Returns count of all the sites -- sites, sitesChar, sitesRegex or the same
// but for excludes if excludes is true
// This is for the site count data saved in order to give each site's dropdown
// its own unique id to be easily found later. 
function countSites(group, excludes) {
	let count = 0;

	if (excludes) {
		if (group.excludes !== undefined) {
			count += group.excludes.length;
		}
		if (group.excludesChar !== undefined) {
			count += group.excludesChar.length;
		}
		if (group.excludesRegex !== undefined) {
			count += group.excludesRegex.length;
		}

		return count;
	}

	if (group.sites !== undefined) {
		count += group.sites.length;
	}
	if (group.sitesChar !== undefined) {
		count += group.sitesChar.length;
	}
	if (group.sitesRegex !== undefined) {
		count += group.sitesRegex.length;
	}
	return count;
}

/////////////////////////////////////////////////
// Creating elements and divs for drawing groups: 
/////////////////////////////////////////////////

// Returns a "more <input>" button to be used for "site", "exclude", "time"
// as specified in the type input. The buttonText is "more times" or "more
// sites"
function moreInputsButton(type, buttonText, groupNum) {
	let moreButton = document.createElement("button");
	moreButton.style.cssText = "display: block;";
	moreButton.innerHTML = buttonText;

	if (change) {
		moreButton.addEventListener("click", function() {
			drawMoreInputs(type, groupNum);
		});
	} else {
		moreButton.className = "disabled";
	}

	return moreButton;
}

// Draws more input spaces to settings page, where type is "site", "exclude", 
// or "time". groupNum is needed to find the parent div to append to. 
function drawMoreInputs(type, groupNum) {
	if (type !== "time" && type !== "site" && type !== "exclude") {
		console.log("Failed to make newInput from 'more' button, type not found");
		console.log(type);
		return;
	}

	// The parent div of the rest of the inputs of that type
	let div = document.getElementById(type + "Div" + groupNum);

	if (div === null) {
		console.log("Failed drawing inputs from more button as cannot find the div (group) supposed to attach to, " + 
			type + "Div" + groupNum);
		return;
	}

	let newInput;

	// time type
	if (type === "time") {
		// get the count of total time pairs from the div
		let newPairCount = parseInt(div.dataset.paircount);
		if (isNaN(newPairCount)) {
			console.log("Failed to draw more time inputs as the pair count of the time div cannot be turned into an int");
			return;
		}
		newPairCount++;

		newInput = timeInputsDiv(groupNum, newPairCount, "", "", div);
		if (newInput != null) {
			div.dataset.paircount = newPairCount;
		}

		div.appendChild(newInput);
		return;
	}

	let newSiteCount = parseInt(div.dataset.sitecount)
	if (isNaN(newSiteCount)) {
		console.log("Failed to make newInput from 'more' button, the sitecount is not a number");
		return;
	}
	newSiteCount++;


	// otherwise, the type will be site or exclude and a text input is made
	newInput = textInputDiv(type, newSiteCount, "domain", groupNum, "", div);

	// if failed to make a new element, return
	if (newInput == null) {
		console.log("Failed to make newInput while drawing new input from 'more' button, likely type wrong");
		return;
	}

	div.dataset.sitecount = newSiteCount;
	div.appendChild(newInput);
}

// Returns a text input div with a text input, delete button, and newline. 
// It must be in a div so that the delete button will work on the entire
// thing, including the newline. 
function textInputDiv(type, siteNum, matchType, groupNum, value, parentDiv) {
	let newInput = textInput(type, groupNum, value, 400)
	newInput.dataset.sitenum = siteNum;

	let div = document.createElement("div");
	div.appendChild(matchTypeDropdown(type, siteNum, matchType, groupNum, newInput));
	div.appendChild(newInput);
	div.appendChild(deleteElementButton(div, parentDiv, "x"));
	div.appendChild(blankLineElement());

	return div;
}
 
// Type is exclude or site, siteNum is the count within its list of sites to
// block or exclude within its group, siteType is the method of blocking, 
// char, domain, or regex, textInput is the input itself which is used to set
// the placeholder for. 
function matchTypeDropdown(type, siteNum, siteType, groupNum, textInput) {
	let select = document.createElement("select");
	// for example, of group 2, exclude, 4th site: 2exclude4
	select.id = "" + groupNum + type + siteNum;

	let charOption = new Option("has characters:", "char");
	let domainOption = new Option("domain match:", "domain");
	let regexOption = new Option("regex match:", "regex");

	if (siteType === "char") {
		charOption.selected = "selected";
	} else if (siteType === "regex") {
		regexOption.selected = "selected";
	} else {
		// default is that domain is selected
		domainOption.selected = "selected";
	}

	select.options.add(domainOption);
	select.options.add(charOption);
	select.options.add(regexOption);

	setSiteTypePlaceholder(siteType, textInput)

	if (!(change)) {
		select.style.pointerEvents = "none";
	}

	if (change) {
		select.addEventListener("change", function() {
			setSiteTypePlaceholder(select.value, textInput);
		});
	}

	return select;
}

const placeholderSiteType = {
	char: "eg: example",
	domain: "eg: example.com",
	regex: "eg: /(.*)example\\.com(\/*)$/ig"
};
// Sets the placeholder text for text input so that it can change as 
// which dropdown is selected changes. 
function setSiteTypePlaceholder(type, textInput) {
	switch (type) {
	case "char":
		textInput.placeholder = placeholderSiteType.char;
		return;
	case "domain":
		textInput.placeholder = placeholderSiteType.domain;
		return;
	case "regex":
		textInput.placeholder = placeholderSiteType.regex;
		return;
	}
}

// Returns a new text input element. Type is "site", "exclude", or "name", 
// to determine the placeholder. Value is the text that it should start off 
// being set as. The width is in pixels. The groupNum is needed to mark its 
// data for later saving.
function textInput(type, groupNum, value, width) {
	let newInput = document.createElement("input");
	newInput.type = "text";
	newInput.style.cssText = "width: " + width + "px;";

	newInput.dataset.type = type;
	newInput.dataset.group = groupNum;
	newInput.value = value;

	if (!(change)) {
		newInput.style.pointerEvents = "none";
	}

	if (type === "site") {
		newInput.placeholder = "eg: example.com";
	} else if (type === "exclude") {
		newInput.placeholder = "eg: blog.example.com";
	} else if (type === "name") {
		newInput.placeholder = "group " + groupNum;
	} else {
		console.log("Failed making new text input as given bad input group type");
		return null;
	}

	return newInput;
}

// Returns a button that swaps between green (selected) and blue (unselected).
// The text inputted is "on" or the days of the week, "Su" ... "Sa". 
// groupNum is needed to mark its data for later saving. clickedButton is 
// whether or not the button should start as selected. activeButton is true 
// if the button is on or off - a button to show if the group is active or if
// the block all sites is active. If the button is an activeButton type, its 
// text needs to change when it swaps. 
function buttonElement(text, groupNum, clickedButton, activeButton) {
	let newButton = document.createElement("button");
	newButton.style.cssText = "display: inline-block; margin: 3px;";
	newButton.innerHTML = text;
	newButton.dataset.group = groupNum;
	newButton.dataset.type = text;

	// setup initial color and text
	if (clickedButton) {
		buttonOn(newButton, activeButton);
	} else {
		buttonOff(newButton, activeButton);
	}

	if (change) {
		newButton.addEventListener("click", function() {
			swapClicked(newButton, activeButton);
		});
	} else {
		newButton.classList.add("disabled");
	}

	return newButton;
}

// Returns new time input div containing a start time, end time, and delete
// button. groupNum and pairNum are needed to mark its data for later saving.
// startTime and endTime are the values to start as, "" if empty. parentDiv
// is necessary to set up the delete button. 
function timeInputsDiv(groupNum, pairNum, startTime, endTime, parentDiv) {
	let div = document.createElement("div");

	let startText = paragraphElement(" start: ");
	startText.className = "timeDiv";
	div.appendChild(startText);

	div.appendChild(timeInputElement("start", startTime, groupNum, pairNum));

	let endText = paragraphElement(" end:");
	endText.className = "timeDiv";
	div.appendChild(endText);

	div.appendChild(timeInputElement("end", endTime, groupNum, pairNum));
	div.appendChild(deleteElementButton(div, parentDiv, "x"));

	return div;
}

// Returns a new time input element. type is "start" or "end". value is the
// time value in "hh:mm", or "" if blank. groupNum and pairNum are needed to 
// mark its data for later saving. 
function timeInputElement(type, value, groupNum, pairNum) {
	let newTime = document.createElement("input");
	newTime.type = "time";
	newTime.dataset.type = type + "Time";
	newTime.dataset.group = groupNum;
	newTime.dataset.timepair = pairNum;
	newTime.value = value;

	if (!(change)) {
		newTime.style.pointerEvents = "none";
	}

	return newTime;
}

// Returns new button that on click will delete the inputted element by removing
// it from its parent div. text is the text of the delete button, either "delete
// group" or "x"
function deleteElementButton(element, div, text) {
	let newButton = document.createElement("button");
	newButton.innerHTML = text;

	if (change) {
		newButton.addEventListener('click', function() {
			div.removeChild(element);
		});
	} else {
		newButton.className = "disabled";
	}

	return newButton;
}

// Returns blank line <br> element.
function blankLineElement() {
	return document.createElement("br");
}

// Returns paragraph <p> element with the specified text in it
function paragraphElement(text) {
	let newPara = document.createElement("p");
	newPara.innerText = text;
	return newPara;
}