/*
	MIT License
	Copyright (c) 2025 Kezia Sharnoff

	- blockSites Chrome Extension
	- settings.js
	This is the functionality of the settings page: getting the previous setings
	from storage and saving changes. 
*/


// TO DO:
	// add comments for all the functions && reorder them
	// change stuff to const if it can be
	// give things names || roles for screen readers
	// test with config and currentBlock being null or DNE in storage -- do the errors work? 


import { getConfig, swapClicked } from "./sharedFunctions.js";


// Creates new tab of help.html 
document.getElementById("helpButton").addEventListener("click", function() {
	chrome.tabs.create({ url: chrome.runtime.getURL("../help.html")});
});

// should be const?
let allGroupsDiv = document.getElementById("allGroupsDiv");

// if config is null then write two blank groups to the page!! 
window.addEventListener("load", function() {
	getConfig()
	.then(function(value) {
		console.log("loaded config!");
		console.log(value);

		let blockAllButton = document.getElementById("blockAll");

		if (value.blockAll) {
			blockAllButton.className = "selected";
			blockAllButton.innerHTML = "on";
		} else {
			blockAllButton.className = "unselected";
			blockAllButton.innerHTML = "off";
		}
		blockAllButton.addEventListener("click", function() {
			swapClicked(blockAllButton, true);
		});

		if (value == null || value.groups.length < 1) {
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

function hideLoadingMessage() {
	document.getElementById("loadingMessage").style.visibility = "hidden";
}

// iterate through groups, getting the input, and saving it to storage, after
// the save button is pressed
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
	console.log("config to write to stroage:");
	console.log(config);

	chrome.storage.local.set({
		config: config
	}).then(function () {
		// give the user feedback that it saved! 
		saveButton.innerHTML = "SAVED!";
		setTimeout(function () {
			saveButton.innerHTML = "SAVE GROUPS";
		}, 1500)
	});
});

// iterates through the group of groupNum and gets all information from all its
// fields. If that group has the default information (the user hasn't edited
// it) then null is returned. Helper function to on click save button. 
function saveGroupFromInputs(groupNum) {
	const groupElements = document.querySelectorAll(
			'[data-group = "' + groupNum + '"]'
		);

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
		switch(element.dataset.type) {
			case "groupName":
				name = element.value;
				break;
			case "onButton":
				active = isButtonOn(element);
				if (!active) { changed = true; }
				break;
			case "startTime":
				timeNodes.push(element);
				break;
			case "endTime":
				timeNodes.push(element);
				break;
			case "SuButton":
				days[0] = isButtonOn(element);
				if (days[0]) { changed = true; }
				break;
			case "MoButton":
				days[1] = isButtonOn(element);
				if (!days[1]) { changed = true; }
				break;
			case "TuButton":
				days[2] = isButtonOn(element);
				if (!days[2]) { changed = true; }
				break;
			case "WeButton":
				days[3] = isButtonOn(element);
				if (!days[3]) { changed = true; }
				break;
			case "ThButton":
				days[4] = isButtonOn(element);
				if (!days[4]) { changed = true; }
				break;
			case "FrButton":
				days[5] = isButtonOn(element);
				if (!days[5]) { changed = true; }
				break;
			case "SaButton":
				days[6] = isButtonOn(element);
				if (days[6]) { changed = true; }
				break;
			case "site":
				const site = element.value.trim();
				if (site !== "") {
					sites.push(site);
					changed = true; 
				}
				break;
			case "exclude":
				const exclude = element.value.trim();
				if (exclude !== "") {
					excludes.push(exclude);
					changed = true; 
				}
				break;
			default:
				break;
		}	

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

// Inputs a button element, returns true if it was selected and green, false
// otherwise. 
function isButtonOn(element) {
	if (element.className === "selected") {
		return true;
	} 
	return false;
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

	// for all the time nodes, fill in their positon on the timePairs array
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

// sites is an array of 
// strings; exclude is an array of strings times is an array of 
// two length arrays (first element is start time, second is end 
// time, ints); days is a 7-array of booleans; active is a boolean 
// true or false; name is a string
function Group(name, active, sites, excludes, times, days) {
	this.name = name;
	this.active = active;
	this.sites = sites;
	this.excludes = excludes;
	this.times = times;
	this.days = days;
}

const moreGroups = document.getElementById("moreGroups");
moreGroups.addEventListener("click", function() {
	let newGroupCount = parseInt(allGroupsDiv.dataset.groupCount);
	if (isNaN(newGroupCount)) {
		console.log("Failed to turn group count in allGroupsDiv into an int");
		// because we still want to make the div but it needs to have a unique 
		// id counter, we do a random number from 10000 to 11000, extemely 
		// unlikely to exist already. We do plus 1000 for if they already 
		// have a bunch of groups so it cannot overlap. I would not assume 
		// that people have more than 1000 groups.
		// also because this starts it as an int, this will fix future iterations
		newGroupCount = Math.floor(10000*Math.random()) + 1000;
	} else {
		newGroupCount++;
	}
	drawGroup(newGroupCount, null);
	allGroupsDiv.dataset.groupCount = newGroupCount;
});	

// inputs a two length array (as that is how all times are stored) as ints
// that represent the time after midnight in minutes. returns a two length
// array that has those same times translated to be string hours:minutes in
// 24 hour time.
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

// also need to include time to minutes for saving the others way!! 
// Time inputted will be of the form "hh:mm". Returns null if failed
// calculate minutes by hh*60 + mm
// example: ["00:05", "11:59"] --> [5, 1439]
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
	// javascript arrays are objects so, this return statement
	// is unneeded -- it's here to be clear what's changing
	return time;
}

const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];


// inputted group from config (or null) and the group number, draw all the input
// fields and buttons necessary
function drawGroup(groupNum, group) {
	// if group is null or any fiels are undefined, set to proper empty strings
	group = cleanGroupForDraw(groupNum, group);

	let groupDiv = document.createElement("div");
	let thirdsDiv = document.createElement("div");
	thirdsDiv.className = "container";

	let leftGroupDiv = document.createElement("div");
	let rightGroupDiv = document.createElement("div");
	let centerGroupDiv = document.createElement("div");

	let groupName = paragraphElement("name:");
	groupName.style.cssText = "display: inline-block;";
	leftGroupDiv.appendChild(groupName);

	let nameInput = textInput("name", groupNum, group.name, 250);
	nameInput.dataset.type = "groupName";
	leftGroupDiv.appendChild(nameInput);
	leftGroupDiv.appendChild(blankLineElement());

	leftGroupDiv.appendChild(buttonElement("on", groupNum, group.active, true));
	leftGroupDiv.appendChild(
		deleteElementButton(groupDiv, allGroupsDiv, "delete group")
	);

	leftGroupDiv.appendChild(blankLineElement());
	leftGroupDiv.appendChild(blankLineElement());

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

	// inputs for excludes
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

	leftGroupDiv.appendChild(paragraphElement("times to block:"));


	let timeCount = group.times.length;
	let timeDiv = document.createElement("div");
	timeDiv.id = "timeDiv" + groupNum;
	timeDiv.dataset.paircount = timeCount;
	// rename paircount to be nextId???
	for (let i = 0; i < timeCount; i++) {
		timeDiv.appendChild(
			timeInputsDiv(groupNum, i+1, group.times[i][0], group.times[i][1], timeDiv)
		);
	}
	leftGroupDiv.appendChild(timeDiv);

	// more times button
	leftGroupDiv.appendChild(moreInputsButton("time", "more times", groupNum));

	leftGroupDiv.appendChild(blankLineElement());

	leftGroupDiv.appendChild(paragraphElement("days blocked: (green)"));

	// right now does not look right with no spaces between them! 
	let dayDiv = document.createElement("div");

	for (let i = 0; i < 7; i++){
		dayDiv.appendChild(
			buttonElement(daysOfWeek[i], groupNum, group.days[i], false)
		);
	}
	leftGroupDiv.appendChild(dayDiv);

	thirdsDiv.appendChild(leftGroupDiv);
	thirdsDiv.appendChild(centerGroupDiv);
	thirdsDiv.appendChild(rightGroupDiv);

	groupDiv.appendChild(thirdsDiv);
	groupDiv.appendChild(blankLineElement());
	allGroupsDiv.appendChild(groupDiv);
}


// returns a more button to be used for "sites", "excludes", or "time",
// specified in the type input. The buttonText is "more times" or "more sites"
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


// inputs group from config and its number, returns a formatted group to replace
// any missing sections or to create a group from null. uses the group number
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

// where type is "site", "exclude", or "time"
// function called when button for more sites is pushed, more input 
// spaces are created for either the sites or the excludes,, blank spaces!
function drawMoreInputs(type, groupNum) {
	console.log("drawmoreinputs");
	let div = document.getElementById(type + "Div" + groupNum);

	if (div === null) {
		console.log("Failed drawing inputs from more button as cannot find \
		 			the div (group) supposed to attach to, " + type + "Div" + 
		 			groupNum);
		return;
	}

	let newInput;

	if (type === "time") {
		// get the pair count from the div, if it's invalid then return
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
		// seperate return than for site or exclude as there should not be a blank line added
		div.appendChild(newInput);
		return;
	}

	// otherwise, the type will be 	site or exclude if (type === "site" || type === "exclude") {
	newInput = textInputDiv(type, groupNum, "", div);

	// if failed to make a new element, return
	if (newInput == null) {
		console.log("Failed to make newInput while drawing new input from \
			'more' button, likely type wrong");
		return;
	}

	div.appendChild(newInput);
}

// returns a text input element made for sites or excludes, 
// or returns null and logs to console if failed
function textInputDiv(type, groupNum, value, parentDiv) {
	let newInput = textInput(type, groupNum, value, 400)

	let div = document.createElement("div");
	div.appendChild(newInput);
	div.appendChild(deleteElementButton(div, parentDiv, "x"));
	div.appendChild(blankLineElement());

	return div;
}

// width in pixels
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

// returns a new div of paragraph labels and time 
// entries for starting and ending times

// weirdly not doing spaces around the "start:" and "end:" like it does in .html??
// maybe need to add padding ?? 
function timeInputsDiv(groupNum, pairNum, startTime, endTime, parentDiv) {
	let div = document.createElement("div");

	let startText = paragraphElement(" start: ");
	// startText.style.cssText = "display:inline-block; margin:0px 8px 0px 5px;";
	startText.className = "timeDiv";
	div.appendChild(startText);

	div.appendChild(timeInputElement("start", startTime, groupNum, pairNum));

	let endText = paragraphElement(" end:");
	// endText.style.cssText = "display:inline-block; margin: 0px, 8px, 0px, 5px;";
	endText.className = "timeDiv";
	div.appendChild(endText);

	div.appendChild(timeInputElement("end", endTime, groupNum, pairNum));
	div.appendChild(deleteElementButton(div, parentDiv, "x"));

	return div;
}

// Returns a new time input element. type is "start" or "end". "value" is the
// starting time, or "" if blank time. groupNum and pairNum are needed to set
// up the .dataset's to be used by the save button later.
function timeInputElement(type, value, groupNum, pairNum) {
	let newTime = document.createElement("input");
	newTime.type = "time";
	newTime.dataset.type = type + "Time";
	newTime.dataset.group = groupNum;
	newTime.dataset.timePair = pairNum;
	newTime.value = value;

	return newTime;
}

// Returns a button that swaps between green (selected) and blue (unselected).
// The text inputted is "on" or the days of the week, "Su" ... "Sa". 
// clickedButton is whether or not the button should start as selected.
// activeButton is true if the button is on or off - a button to show if
// the group is active or if the block all sites is active. If the button
// is an activeButton type, its text needs to change when it swaps. 
function buttonElement(text, groupNum, clickedButton, activeButton) {
	let newButton = document.createElement("button");
	newButton.style.cssText = "display: inline-block; margin: 3px;";
	newButton.innerHTML = text;
	newButton.dataset.group = groupNum;
	newButton.dataset.type = text + "Button";

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

// Returns new button that on click will delete the inputted element by removing
// it from its parent div (inputted also). The text of the button will be 
// inputted as 'text'
function deleteElementButton(element, div, text) {
	let newButton = document.createElement("button");
	newButton.innerHTML = text;
	newButton.className = "unselected";

	newButton.addEventListener('click', function() {
		div.removeChild(element);
	});

	return newButton;
}

// returns blank line <br> element
function blankLineElement() {
	return document.createElement("br");
}

// returns paragraph <p> element with the specified text in it
function paragraphElement(text) {
	let newPara = document.createElement("p");
	newPara.innerText = text;
	return newPara;
}