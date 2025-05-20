
// do not let them store 10pm to 3am!!! when writing to storage, write that as 
// 10pm to 11:59 then mightnight to 3am!!
// also if the input field for website is empty,, innerhtml === " " or "" then don't 
// write it down,, if start & end time are same then don't write them down?? (or set to all day??)
// if no times given,, then block entire day!??
// save group even if incomplete! 

// ; add block all sites forever button; write to storage!!!

// add to settings html a <p> saying that things have not loaded in correctly 
// as the default thing that then will be made invisable once things have 
// finished loading in.... + put all of them into a giant all groups div to 
// add more groups onto and make the div invisable until finished loading from config. 

// TO DO:
	// save input when press save button
	// add comments for all the functions && reorder them
	// make blockAllSites button on top left of settings.html and write to 
			// file (after pressing save)
	// give everything titles so they are clear to screen readers!
	// make sure everything in these files are less than 80 characters
	// make a "give me a break until midnight" button that sets off an alarm that that background js
		// listens for and then sets currentblock to empty and then sets its next alarm for midngith
		// ofc can be overrided by clicking the manual recheck button -- by designn! 
	// do we ever use time form in background js?? maybe go straight from date to minutes instead? 

// Creates new tab of help.html 
document.getElementById("helpButton").addEventListener("click", function() {
	chrome.tabs.create({ url: chrome.runtime.getURL("../help.html")});
});

const group1 = new Group("wikipedias",
	true, 
	["wikipedia.org", "mail.google.com"], 
	["en.wikipedia.org/wiki/California"], 
	// I think store it in minutes since 0:00,, bc then less computations on the
	// thing that is running a lot (background.js)
	// make helper function timeToMinutes(time) {} where time is a string, returns
	// an int representation of that time
	[[0, 190],[1260, 1435]], 
	[true, true, false, false, false, false, true]);

const group2 = new Group("socials",
	true, 
	["facebook.com", "gmail.com"], 
	["testingtesting123"], 
	[[5, 613],[1290, 1439]],
	[true, false, true, true, true, false, true]);

const tempconfig = {
	groups: [group1, group2, null],
	blockAll: false
}


// should be const?
let allGroupsDiv = document.getElementById("allGroupsDiv");

// if config is null then write two blank groups to the page!! 
window.addEventListener("load", function() {
	getConfig().then(function(value) {
		console.log("loaded config!");
		console.log(value);

		if (value == null || value.groups.length < 1) {
			drawGroup(1, null);
			drawGroup(2, null);
			allGroupsDiv.dataset.groupCount = 2;
		} else {
			let numGroups = value.groups.length;
			for (let i = 0; i < numGroups; i++) {
				console.log("loaded group:")
				console.log(value.groups[i]);
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

// returns config object from storage or null if it is not in storage
async function getConfig() {
	let result = await chrome.storage.local.get("config");
	if (result == undefined) {
		return null;
	}
	return result.config;
}

const testingbutton = document.getElementById("testingButton");
testingbutton.addEventListener("click", function() {
	chrome.alarms.create("updateBlockingAlarm", { 
		delayInMinutes: 0.5
	});

	// chrome.storage.local.set({
	// 	config: {
	// 		"blockAll": false,
	// 		"groups": [group1, group2, null]
	// 	}
	// });

	console.log("created alarm!");

	chrome.storage.local.get("foo", function(results) {
		console.log("trying to get something not in storage gives: " + results);
			// object Object???? lol

		console.log("accessing the thing of the object gives: " + results.foo);
			// gives undefined!!! 
	});
});

// if iterating over child list,, perhaps do not need to have the dataset.group!
const saveButton = document.getElementById("save");
saveButton.addEventListener("click", function() {

	// can do allGroupsDiv.children to get each of its children loop through and then loop through each of those children too!!?? 

	console.log("all groups div childdren:");
	// console.log(allGroupsDiv.children);


	const group1Elements = document.querySelectorAll('[data-group = "1"]');
	group1Elements.forEach(function(element) {
		console.log(element);
		console.log(element.dataset.type);
	});
});

// returns a static nodeList where changes in the nodeList do not affect the DOM!

/*
// Find all elements with data-columns="3"
const threeColumnArticles = document.querySelectorAll('[data-columns="3"]');
// You can then iterate over the results
threeColumnArticles.forEach((article) => {
  console.log(article.dataset.indexNumber);
});
*/

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
	for (let i = 0; i < 2; i++) {
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
	for (let i = 0; i < 2; i++) {
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

// okay once save button is pressed then:
// iterate through all the elements on the page (everything with a class "group")
// each element will have a data-group = "1", data-group = "2", etc to say what group it is in 
// each element will have a data-type = "site" data-type = "exclude" etc. so taht the correct arrays can be made! 
// the stand and end times will have data-type = "startTime" etc. and then also have data-timePair = "1", etc. for each pair 
	// only used in the process of making more time pairs is data-pairCount on each timeDivX (group x) 
	// which stores the total number of time pairs it has, so the button can make more
			// think to self maybe do id system of start1, end1, start2, end2 etc...?? but also group names in the id's....
			// also group names would be group1start1 etc.
// once the current data-group of the elements being iterated chagnes, send off the group method

// note that the id of the div for all the sites in group1 will be "siteDiv1"

// make it so that drawGroup takes in a group 

// where all of the groups are in a div called allGroupsDiv
// give input of string num for the group being made
// repeated code between the new sites and new excludes buttons!!
function drawGroup(groupNum, group) {
	// if group is null, then is creating a new group to be filled in. 
	// therefore, should have empty strings for all the values which 
	// the helper functions will correctly interpret

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

	let nameInput = textInput("name", groupNum, group.name, 200);
	nameInput.dataset.type = "groupName";
	leftGroupDiv.appendChild(nameInput);
	leftGroupDiv.appendChild(blankLineElement());

	leftGroupDiv.appendChild(buttonElement("on", groupNum, group.active, true));
	leftGroupDiv.appendChild(deleteElementButton(groupDiv, allGroupsDiv, "delete group"));

	leftGroupDiv.appendChild(blankLineElement());
	leftGroupDiv.appendChild(blankLineElement());

	rightGroupDiv.appendChild(paragraphElement("sites to block:"));

	// inputs for sites

	let siteDiv = document.createElement("div");
	siteDiv.id = "siteDiv" + groupNum;
	let sitesCount = group.sites.length;
	for (let i = 0; i < sitesCount; i++) {
		siteDiv.appendChild(textInputDiv("site", groupNum, group.sites[i], siteDiv));
	} 
	rightGroupDiv.appendChild(siteDiv);

	// button for more sites
	let moreSitesButton = document.createElement("button");
	moreSitesButton.style.cssText = "display: block;";
	moreSitesButton.className = "unselected";
	moreSitesButton.innerHTML = "more sites";
	moreSitesButton.addEventListener("click", function() {
		drawMoreInputs("site", groupNum);
	});
	rightGroupDiv.appendChild(moreSitesButton);

	rightGroupDiv.appendChild(blankLineElement());

	rightGroupDiv.appendChild(paragraphElement("sites to exclude from blocking:"));
	let excludeDiv = document.createElement("div");
	excludeDiv.id = "excludeDiv" + groupNum;
	let excludeCount = group.excludes.length;
	for (let i = 0; i < excludeCount; i++) {
		excludeDiv.appendChild(textInputDiv("exclude", groupNum, group.excludes[i], excludeDiv));
	} 
	rightGroupDiv.appendChild(excludeDiv);

	// button for more excludes
	let moreExcludesButton = document.createElement("button");
	moreExcludesButton.style.cssText = "display: block;";
	moreExcludesButton.innerHTML = "more sites";
	moreExcludesButton.className = "unselected";
	moreExcludesButton.addEventListener("click", function() {
		drawMoreInputs("exclude", groupNum);
	});
	rightGroupDiv.appendChild(moreExcludesButton);
	rightGroupDiv.appendChild(blankLineElement());


	leftGroupDiv.appendChild(paragraphElement("times to block:"));


	let timeCount = group.times.length;
	let timeDiv = document.createElement("div");
	timeDiv.id = "timeDiv" + groupNum;
	timeDiv.dataset.paircount = timeCount;
	// rename paircount to be nextId???
	for (let i = 0; i < timeCount; i++) {
		timeDiv.appendChild(timeInputsDiv(groupNum, i+1, group.times[i][0], group.times[i][1], timeDiv));
	}
	leftGroupDiv.appendChild(timeDiv);

	// button for more times
	let moreTimesButton = document.createElement("button");
	moreTimesButton.style.cssText = "display: block;";
	moreTimesButton.innerHTML = "more times";
	moreTimesButton.className = "unselected";
	moreTimesButton.addEventListener("click", function() {
		drawMoreInputs("time", groupNum);
	})
	leftGroupDiv.appendChild(moreTimesButton);

	leftGroupDiv.appendChild(blankLineElement());

	leftGroupDiv.appendChild(paragraphElement("days blocked: (green)"));

	// right now does not look right with no spaces between them! 
	let dayDiv = document.createElement("div");

	for (let i = 0; i < 7; i++){
		dayDiv.appendChild(buttonElement(daysOfWeek[i], groupNum, group.days[i], false));
	}
	leftGroupDiv.appendChild(dayDiv);

	thirdsDiv.appendChild(leftGroupDiv);
	thirdsDiv.appendChild(centerGroupDiv);
	thirdsDiv.appendChild(rightGroupDiv);

	groupDiv.appendChild(thirdsDiv);
	// groupDiv.appendChild(blankLineElement());
	groupDiv.appendChild(document.createElement("hr"));
	// groupDiv.appendChild(blankLineElement());
	allGroupsDiv.appendChild(groupDiv);
}

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

	if (group.times === undefined) {
		group.times = [["", ""]];
	} else {
		console.log("should be in minutes:");
		console.log(group.times);
		for (let i = 0; i < group.times.length; i++) {
			group.times[i] = minutesToTime(group.times[i]);
		}
		console.log("shouldbe in time:");
		console.log(group.times);
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
		console.log("Failed drawing inputs from more button as cannot find the div (group) supposed to attach to, " + type + "Div" + groupNum);
		return;
	}

	let newInput;

	if (type === "time") {
		// get the pair count from the div, if it's invalid then return
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
		// seperate return than for site or exclude as there should not be a blank line added
		div.appendChild(newInput);
		return;
	}

	// otherwise, the type will be 	site or exclude if (type === "site" || type === "exclude") {
	newInput = textInputDiv(type, groupNum, "", div);

	// if failed to make a new element, return
	if (newInput == null) {
		console.log("Failed to make newInput while drawing new input from 'more' button, likely type wrong");
		return;
	}

	div.appendChild(newInput);
}

// returns a text input element made for sites or excludes, 
// or returns null and logs to console if failed
function textInputDiv(type, groupNum, value, parentDiv) {
	let newInput = textInput(type, groupNum, value, 350)

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
	startText.style.cssText = "display:inline-block; margin:0px;";
	div.appendChild(startText);

	div.appendChild(timeInputElement(" start", startTime, groupNum, pairNum));

	let endText = paragraphElement(" end:");
	endText.style.cssText = "display:inline-block; margin:0px;";
	div.appendChild(endText);

	div.appendChild(timeInputElement("end", endTime, groupNum, pairNum));
	div.appendChild(deleteElementButton(div, parentDiv, "x"));

	return div;
}

// where type is "start" or "end"
function timeInputElement(type, value, groupNum, pairNum) {
	let newTime = document.createElement("input");
	newTime.type = "time";
	newTime.style.cssText = "width:120px;";
	newTime.dataset.type = type + "Time";
	newTime.dataset.group = groupNum;
	newTime.dataset.timePair = pairNum;
	newTime.value = value;

	return newTime;
}

// buttons work when clicked on for first time!! however 
// when hovered over they do not look right.... 
// returns a button for the days of the week div set up and the active: on
// where activeButton is true if it says "on" and false otherwise
// rename this function to be better!
function buttonElement(day, groupNum, clickedButton, activeButton) {
	let newButton = document.createElement("button");
	newButton.style.cssText = "display: inline-block; margin: 3px;";
	newButton.innerHTML = day;
	newButton.dataset.group = groupNum;
	newButton.dataset.type = day + "Button";

	newButton.addEventListener("click", function() {
		swapClicked(newButton, activeButton);
	});

	if (clickedButton) {
		newButton.dataset.clicked = "on"; 
		newButton.className = "selected";
	} else {
		newButton.className = "unselected";
		newButton.dataset.clicked = "off"
		if (activeButton) {
			newButton.innerHTML = "off";
		}
	}

	return newButton;
}

// input is the element that should be deleted and the div it belongs to
// text is either "x" for most buttons or "delete group" for deleting the group
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


// sites is an array of 
// strings; exclude is an array of strings times is an array of 
// two length arrays (first element is start time, second is end 
// time, ints); days is a 7-array of booleans; active is a boolean 
// true or false
function Group(name, active, sites, excludes, times, days) {
	this.name = name; 
	this.sites = sites;
	this.excludes = excludes;
	this.times = times;
	this.days = days;
	this.active = active;
}

// If the button is being hovered over when this function is called, 
// then it will no longer be inverted coloring. This is on purpose 
// so that the change in color between green and blue is more clear 
// than just the small text changing. 
function swapClicked(button, activeButton) {
	if (button.dataset.clicked == "on") {
		button.className = "unselected";
		if (activeButton) {
			button.innerHTML = "off";
		}
		button.dataset.clicked = "off"
	} else {
		button.className = "selected";
		if (activeButton) {
			button.innerHTML = "on";
		}
		button.dataset.clicked = "on"
	}
}