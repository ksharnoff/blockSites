
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
	// load config from file when window loading
	// make blockAllSites button on top left of settings.html and write to 
			// file (after pressing save)
	// line up some divs to be horizontal (sites on right, else on left? or 
			// just sites to block on right, everything else on left? experiment!)
	// give everything titles so they are clear to screen readers!
	// add button in settings html to launch help page!
	// when time is written to storage, store version of those 
		// numbers in the number of minutes per day way!
	// make sure everything in these files are less than 80 characters
	// let the user name the groups! they will be our default group1 name otherwise,
		// also will use groupx names internally regardless
	// add explanation of what is in storage and how alarms work to help.html!!
	// make a "give me a break until midnight" button that sets off an alarm that that background js
		// listens for and then sets currentblock to empty and then sets its next alarm for midngith
		// ofc can be overrided by cilcking the manual recheck button -- by designn! 
	// do we ever use time form in background js?? maybe go straight from date to minutes instead? 


const group1 = new Group(true, 
	["wikipedia.org", "mail.google.com"], 
	["en.wikipedia.org/wiki/California"], 
	// I think store it in minutes since 0:00,, bc then less computations on the
	// thing that is running a lot (background.js)
	// make helper function timeToMinutes(time) {} where time is a string, returns
	// an int representation of that time
	[[0, 190],[1260, 1435]], 
	[true, true, false, false, false, false, true]);

const group2 = new Group(true, 
	["facebook.com", "gmail.com"], 
	["testingtesting123"], 
	[[5, 613],[1290, 1439]],
	[true, false, true, true, true, false, true]);

const config = {
	groups: [group1, group2, null],
	blockAll: false
}


// should be const?
let allGroupsDiv = document.getElementById("allGroupsDiv");


// if config is null then write two blank groups to the page!! 

window.addEventListener("load", function() {
	// get config, once done then: write to screen! 

	// do logic here if config was empty from storage then write 2 groups that are null! 
	// mayhaps make a config object that contains a list groups that has [null, null]
	let numGroups = config.groups.length;
	for (let i = 0; i < numGroups; i++) {
		drawGroup(i + 1, config.groups[i])
	}
	allGroupsDiv.dataset.groupCount = numGroups;


	// fill in all the input fields & buttons from storage....
	// aka just call fillPage(); and fill page will need to sort out from storage...
});

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

// // Find all elements with data-columns="3"
// const threeColumnArticles = document.querySelectorAll('[data-columns="3"]');
// // You can then iterate over the results
// threeColumnArticles.forEach((article) => {
//   console.log(article.dataset.indexNumber);
// });

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
		let mm = minutes[i] % 60;
		minutes[i] = hh.toString() + ":" + mm.toString();
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
	if (group == null) {
		group = new Group(true, ["", ""], [""], [["", ""]], [false, true, true, true, true, true, false])
	}

	let groupDiv = document.createElement("div");
	groupDiv.id = "groupDiv" + groupNum;

	let nameText = paragraphElement("group " + groupNum + ":");
	nameText.style.cssText = "display:inline-block;";
	groupDiv.appendChild(nameText);

	groupDiv.appendChild(buttonElement("on", groupNum, group.active, true));
	groupDiv.appendChild(deleteElementButton(groupDiv, allGroupsDiv, "delete group"));

	groupDiv.appendChild(blankLineElement());
	groupDiv.appendChild(blankLineElement());

	groupDiv.appendChild(paragraphElement("sites to block:"));

	// inputs for sites

	let siteDiv = document.createElement("div");
	siteDiv.id = "siteDiv" + groupNum;
	let sitesCount = group.sites.length;
	for (let i = 0; i < sitesCount; i++) {
		siteDiv.appendChild(textInputDiv("site", groupNum, group.sites[i], siteDiv));
	} 
	groupDiv.appendChild(siteDiv);

	// button for more sites
	let moreSitesButton = document.createElement("button");
	moreSitesButton.style.cssText = "display: block;";
	moreSitesButton.className = "hoverable";
	moreSitesButton.innerHTML = "more sites";
	moreSitesButton.addEventListener("click", function() {
		drawMoreInputs("site", groupNum);
	});
	groupDiv.appendChild(moreSitesButton);

	groupDiv.appendChild(blankLineElement());

	groupDiv.appendChild(paragraphElement("sites to exclude from blocking:"));
	let excludeDiv = document.createElement("div");
	excludeDiv.id = "excludeDiv" + groupNum;
	let excludeCount = group.excludes.length;
	for (let i = 0; i < excludeCount; i++) {
		excludeDiv.appendChild(textInputDiv("exclude", groupNum, group.excludes[i], excludeDiv));
	} 
	groupDiv.appendChild(excludeDiv);

	// button for more excludes
	let moreExcludesButton = document.createElement("button");
	moreExcludesButton.style.cssText = "display: block;";
	moreExcludesButton.innerHTML = "more sites";
	moreExcludesButton.className = "hoverable";
	moreExcludesButton.addEventListener("click", function() {
		drawMoreInputs("exclude", groupNum);
	});
	groupDiv.appendChild(moreExcludesButton);
	groupDiv.appendChild(blankLineElement());


	groupDiv.appendChild(paragraphElement("times to block:"));


	let timeCount = group.times.length;
	let timeDiv = document.createElement("div");
	timeDiv.id = "timeDiv" + groupNum;
	timeDiv.dataset.paircount = timeCount;
	// rename paircount to be nextId???
	for (let i = 0; i < timeCount; i++) {
		timeDiv.appendChild(timeInputsDiv(groupNum, i+1, group.times[i][0], group.times[i][1], timeDiv));
	}
	groupDiv.appendChild(timeDiv);

	// button for more times
	let moreTimesButton = document.createElement("button");
	moreTimesButton.style.cssText = "display: block;";
	moreTimesButton.innerHTML = "more times";
	moreTimesButton.className = "hoverable";
	moreTimesButton.addEventListener("click", function() {
		drawMoreInputs("time", groupNum);
	})
	groupDiv.appendChild(moreTimesButton);

	groupDiv.appendChild(blankLineElement());

	groupDiv.appendChild(paragraphElement("days blocked: (green)"));

	// right now does not look right with no spaces between them! 
	let dayDiv = document.createElement("div");

	for (let i = 0; i < 7; i++){
		dayDiv.appendChild(buttonElement(daysOfWeek[i], groupNum, group.days[i], false));
	}
	groupDiv.appendChild(dayDiv);

	groupDiv.appendChild(blankLineElement());
	groupDiv.appendChild(document.createElement("hr"));
	groupDiv.appendChild(blankLineElement());
	allGroupsDiv.appendChild(groupDiv);
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
// or returns undefined and logs to console if failed
function textInputDiv(type, groupNum, value, parentDiv) {
	let newInput = document.createElement("input");
	newInput.type = "text";
	newInput.style.cssText = "width: 350px;";
	newInput.dataset.type = type;
	newInput.dataset.group = groupNum;

	if (type === "site") {
		newInput.placeholder = "ex: youtube.com";
	} else if (type === "exclude") {
		newInput.placeholder = "ex: music.youtube.com";
	} else {
		console.log("Failed making new text input as given bad input group type");
		return null;
	}

	newInput.value = value;

	let div = document.createElement("div");
	div.appendChild(newInput);
	div.appendChild(deleteElementButton(div, parentDiv, "x"));
	div.appendChild(blankLineElement());

	return div;
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

	div.appendChild(timeInputElement("start", startTime, groupNum, pairNum));

	let endText = paragraphElement("end:");
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

	newButton.addEventListener("mouseenter", function() {
		hover(newButton);
	});
	newButton.addEventListener("mouseout", function() {
		unhover(newButton);
	});

	if (clickedButton) {
		newButton.dataset.clicked = "on"; 
		clicked(newButton, activeButton);
	} else {
		newButton.dataset.clicked = "off"; 
		unclicked(newButton, activeButton);
	}

	return newButton;
}

// input is the element that should be deleted and the div it belongs to
// text is either "x" for most buttons or "delete group" for deleting the group
function deleteElementButton(element, div, text) {
	let newButton = document.createElement("button");
	newButton.innerHTML = text;
	newButton.className = "hoverable";

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
function Group(active, sites, excludes, times, days) {
	this.sites = sites;
	this.excludes = excludes;
	this.times = times;
	this.days = days;
	this.active = active;
}


const green = "rgb(35, 149, 96)";
const blue = "#6384A1";
const white = "#e5e5e5";


// If the button is being hovered over when this function is called, 
// then it will no longer be inverted coloring. This is on purpose 
// so that the change in color between green and blue is more clear 
// than just the small text changing. 
function swapClicked(button, activeButton) {
	if (button.dataset.clicked == "on") {
		unclicked(button, activeButton);
	} else {
		clicked(button, activeButton);
	}
}

// Change the colors to green background! Redefining the text color 
// here in case they were hovering after clicking so it updates 
// instead of staying blue. If it is an "active button" for setting
// a group being active or not, the text is swapped to "on"
function clicked(button, activeButton) {
	button.style.background = green;
	button.style.color = white;

	if (activeButton) {
		button.innerHTML = "on";
	}
	button.className = "onhover";
	button.dataset.clicked = "on"
}

// Change color of button to be default blue
// If it's the button saying if it's active, 
// then change the text to "on"
function unclicked(button, activeButton) {
	button.style.background = blue; 
	button.style.color = white; 

	if (activeButton) {
		button.innerHTML = "off";
	}
	button.style.cursor = "default"
	button.dataset.clicked = "off"
}

// Inverts the color of a button when mouse event is 
// fired from something hovering over it
function hover(button) {
	// if is green: 
	if (button.dataset.clicked == "on") {
		button.style.color = green;
	} else {
		button.style.color = blue;
	}
	button.style.cursor = "pointer"
	button.style.background = white;


}

// Sets the inverted colors back to normal
function unhover(button) {
	if (button.dataset.clicked == "on") {
		button.style.background = green;
	} else {
		button.style.background = blue;
	}
	button.style.color = white;
}