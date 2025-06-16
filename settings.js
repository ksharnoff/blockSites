/*
	MIT License
	Copyright (c) 2025 Kezia Sharnoff

	- blockSites Chrome Extension
	- settings.js
	This is the functionality of the settings page: getting the previous settings
	from storage and saving changes.
*/

/*
// TO DO:
	- give things names || roles for screen readers
	- README example images
	- release on github!, change version number in manifest 
	- fix back button navigation so that it works!!
		- this is a known issue:
			- https://groups.google.com/a/chromium.org/g/chromium-extensions/c/n3vFlEYueyo?pli=1
			- https://issues.chromium.org/issues/40823321
		- thoughts to try next time: 
			- manually push same tab to history after setting the origin url? 
			- try to find more documentation for goBack()
				--> how / where does the history store what URLS were apart of
					the same tab? 
			- read more of the discussions on the chromium issues page
			- look at how other chrome extensions block theirs if not doing 
				chrome.tabs.update!
			- leave it? (already is improved because can back navigate and it does
				not delete the current tab!! :D)
*/
	
import { getConfig, swapClicked, isButtonOn } from "./sharedFunctions.js";

// Help button being clicked launches the help webpage. 
document.getElementById("helpButton").addEventListener("click", function() {
	chrome.tabs.create({ url: chrome.runtime.getURL("../help.html")});
});

// Div with all the divs of each website group
let allGroupsDiv = document.getElementById("allGroupsDiv");

// Once the page loads, get config from storage and fill in the groups with the
// data, or if config is null then make some empty groups to fill in. Also set
// up the blockAll button to be correctly selected or not. 
window.addEventListener("load", function() {
	getConfig()
	.then(function(value) {
		console.log("loaded config!");
		console.log(value);

		let blockAllButton = document.getElementById("blockAll");

		// if nothing stored for blockAll previously
		if (value === null || value.blockAll === undefined) {
			blockAllButton.className = "unselected";
			blockAllButton.innerHTML = "off";
		} else {
			if (value.blockAll) {
				blockAllButton.className = "selected";
				blockAllButton.innerHTML = "on";
			} else {
				blockAllButton.className = "unselected";
				blockAllButton.innerHTML = "off";
			}
		}
		blockAllButton.addEventListener("click", function() {
			swapClicked(blockAllButton, true);
		});

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
		hideLoadingMessage();
	})
});

// Upon successful loading, the initial loading message that says the page isn't
// loaded is hidden. 
function hideLoadingMessage() {
	document.getElementById("loadingMessage").style.visibility = "hidden";
}

// Once the save button is pressed, iterate through all the groups, get all the
// inputs, make it into Group objects, and save to storage as "config".
let saveButton = document.getElementById("save");
saveButton.addEventListener("click", function() {
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
	if (blockAllButton.className === "selected") {
		blockAll = true;
	}

	// create config object: list of groups and blockAll
	const config = {
		groups: groupsList,
		blockAll: blockAll
	}

	chrome.storage.local.set({
		config: config
	}).then(function () {
		// give the user feedback that it saved! 
		saveButton.innerHTML = "SAVED!";

		// then go back to normal text
		setTimeout(function () {
			saveButton.innerHTML = "SAVE GROUPS";
		}, 1500)
	});
});

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
	let timeNodes = []; // store time elements, deal with after
	let sites = [];
	let excludes = [];

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
				sites.push(site);
				changed = true; 
			}
			return;
		}

		// sites to exclude from blocking
		if (type == "exclude") {
			const exclude = element.value.trim();
			if (exclude !== "") {
				excludes.push(exclude);
				changed = true; 
			}
			return;
		}

		// shouldn't get here 
		console.log("While trying to save, ran into unfamiliar type of group");
		console.log(type);
	});

	// match the start and end times and translate to correct format
	let times = matchStartEndTimeNodes(timeNodes, groupNum);
	if (times.length > 0) {
		changed = true;
	}

	if (!changed) {
		return null;
	}

	return new Group(name, active, sites, excludes, times, days);
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
		let index = parseInt(element.dataset.timePair);
		if (isNaN(index)) {
			console.log("time pair count not an int");
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
	// list. 
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

// Returns a Group object where name is a string; active is a boolean; sites
// and excludes are arrays of strings; times is an array of two length arrays,
// where the first element is start time (in minutes since 12am) and the second
// element is end time; days is a 7-array of booleans. 
function Group(name, active, sites, excludes, times, days) {
	this.name = name;
	this.active = active;
	this.sites = sites;
	this.excludes = excludes;
	this.times = times;
	this.days = days;
}

// Inputs a two length int array (how time is stored in config) that represent
// the time after midnight in minutes. Returns a two length array that has 
// those same times translated to be strings in hours:minutes in
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

// Inputs a two length string array (how time is inputted on settings page)
// that represents the time in 24 hour time in the form "hh:mm". Returns a
// 2-array with those time values as ints as minutes after midnight. Any 
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

// Once more groups button is pressed, calculate the groupNum of the new group
// and then draw it. 
document.getElementById("moreGroups").addEventListener("click", function() {
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
});	

// Input a group number and group object (or null) and draw all the input fields
// and buttons necessary onto the settings page. 
function drawGroup(groupNum, group) {
	// if group is null or any fields are undefined, set to default values
	group = cleanGroupForDraw(groupNum, group);

	// Create divs for the entire group plus a new line and to hold the three
	// columns
	let groupDiv = document.createElement("div");
	let thirdsDiv = document.createElement("div");
	thirdsDiv.className = "container";

	// divs for each column
	let leftGroupDiv = document.createElement("div");
	let centerGroupDiv = document.createElement("div");
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
	let sitesCount = group.sites.length;

	for (let i = 0; i < sitesCount; i++) {
		siteDiv.appendChild(
			textInputDiv("site", groupNum, group.sites[i], siteDiv)
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

	for (let i = 0; i < excludeCount; i++) {
		excludeDiv.appendChild(
			textInputDiv("exclude", groupNum, group.excludes[i], excludeDiv)
		);
	} 
	rightGroupDiv.appendChild(excludeDiv);

	// button for more excludes
	rightGroupDiv.appendChild(moreInputsButton("exclude", "more sites", groupNum));

	thirdsDiv.appendChild(leftGroupDiv);
	thirdsDiv.appendChild(centerGroupDiv);
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
		group = new Group("group " + groupNum,
			true, 
			["", ""], 
			[""], 
			[["", ""]], 
			[false, true, true, true, true, true, false])
		return group;
	}

	// name, active, times, days should not be undefined, this is just in case
	if (group.name === undefined) {
		group.name = "group " + groupNum;
	}
	if (group.active === undefined) {
		group.active = true;
	}
	if (group.sites === undefined) {
		group.sites = ["", ""];
	} 
	if (group.excludes == undefined) {
		group.excludes = ["",""];
	}

	if (group.times === undefined || group.times.length < 1) {
		group.times = [["", ""]];
	} else {
		for (let i = 0; i < group.times.length; i++) {
			group.times[i] = minutesToTime(group.times[i]);
		}
	}

	if (group.days === undefined) {
		group.days = [false, true, true, true, true, true, false];
	}
	return group;
}

// Returns a "more <input>" button to be used for "sits", "exclude", "time"
// as specified in the type input. The buttonText is "more times" or "more
// sites"
function moreInputsButton(type, buttonText, groupNum) {
	let moreButton = document.createElement("button");
	moreButton.style.cssText = "display: block;";
	moreButton.innerHTML = buttonText;
	moreButton.className = "unselected";

	moreButton.addEventListener("click", function() {
		drawMoreInputs(type, groupNum);
	});
	return moreButton;
}

// Draws more input spaces to settings page, where type is "sits", "exclude", 
// or "time". groupNum is needed to find the parent div to append to. 
function drawMoreInputs(type, groupNum) {
	// The parent div of the rest of the inputs of that type
	let div = document.getElementById(type + "Div" + groupNum);

	if (div === null) {
		console.log("Failed drawing inputs from more button as cannot find \
		 			the div (group) supposed to attach to, " + type + "Div" + 
		 			groupNum);
		return;
	}

	let newInput;

	// time type
	if (type === "time") {
		// get the count of total time pairs from the div
		let newPairCount = parseInt(div.dataset.paircount);
		if (isNaN(newPairCount)) {
			console.log("Failed to draw more time inputs as the pair count of \
				the time div cannot be turned into an int");
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

	// otherwise, the type will be site or exclude and a text input is made
	newInput = textInputDiv(type, groupNum, "", div);

	// if failed to make a new element, return
	if (newInput == null) {
		console.log("Failed to make newInput while drawing new input from \
			'more' button, likely type wrong");
		return;
	}

	div.appendChild(newInput);
}

// Returns a text input div with a text input, delete button, and newline. 
// It must be in a div so that the delete button will work on the entire
// thing, including the newline. 
function textInputDiv(type, groupNum, value, parentDiv) {
	let newInput = textInput(type, groupNum, value, 400)

	let div = document.createElement("div");
	div.appendChild(newInput);
	div.appendChild(deleteElementButton(div, parentDiv, "x"));
	div.appendChild(blankLineElement());

	return div;
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

	if (type === "site") {
		newInput.placeholder = "eg: youtube.com";
	} else if (type === "exclude") {
		newInput.placeholder = "eg: music.youtube.com";
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
		newButton.className = "selected";
	} else {
		newButton.className = "unselected";
		if (activeButton) {
			newButton.innerHTML = "off";
		}
	}

	newButton.addEventListener("click", function() {
		swapClicked(newButton, activeButton);
	});

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
	newTime.dataset.timePair = pairNum;
	newTime.value = value;

	return newTime;
}

// Returns new button that on click will delete the inputted element by removing
// it from its parent div. text is the text of the delete button, either "delete
// group" or "x"
function deleteElementButton(element, div, text) {
	let newButton = document.createElement("button");
	newButton.innerHTML = text;
	newButton.className = "unselected";

	newButton.addEventListener('click', function() {
		div.removeChild(element);
	});

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
