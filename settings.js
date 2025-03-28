
// do not let them store 10pm to 3am!!! when writing to storage, write that as 10pm to 11:59 then mightnight to 3am!!
// also if the input field for website is empty,, innerhtml === " " or "" then don't write it down,, if start & end time are same then don't write them down

// ; add block all sites forever button; write to storage!! figure out classes being made and buttons to add new groups and cycle through them when you hit save!!

// give everything titles so that they are clear to screen readers!!


// MAKE SURE THAT THE ON AND OFF BUTTONS ARE CORRECTLY COLORED AND THAT ALL THE FIELDS ARE FILLED IN!!
window.addEventListener("load", function() {

	// fill in all the input fields & buttons from storage....
});

const g1Mbutton = document.getElementById("g1M");
g1Mbutton.addEventListener("click", function() {
	swapClicked(g1Mbutton);
});


const saveButton = document.getElementById("save");
saveButton.addEventListener("click", function() {
	drawBlankGroup("2");
});

// let currentTime = document.getElementById("testingTime").value;

// console.log(currentTime);
// console.log(typeof currentTime);
// it's a string!!


const moreGroups = document.getElementById("moreGroups");
moreGroups.addEventListener("click", function() {
	chrome.storage.local.get("foo", function(results) {
		console.log("trying to get something not in storage gives: " + results);
			// object Object???? lol

		console.log("accessing the thing of the object gives: " + results.foo);
			// gives undefined!!! 
	});
});	



// the buttons are irritating to know if have been 
// pressed,, ig just need to check the background color? 


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

// also the buttons and stuff will have data-type = siteButton for more sites,, 
// so then we know what div to use to add more inputs to! 

// note that the id of the div for all the sites in group1 will be "siteDiv1"


// where all of the groups are in a div called allDiv (right now coded it for groupDiv1)
// give input of string num for the group being made
// repeated code between the new sites and new excludes buttons!!
// groupNum is a string
function drawBlankGroup(groupNum) {
	console.log("draw new group called");
	let groupDiv = document.createElement("div");
	groupDiv.id = "groupDiv1" + groupNum;

	groupDiv.appendChild(paragraphElement("group " + groupNum + ":"));

	// on and off buttons
	let onButton = document.createElement("button");
	onButton.style.cssText = "display: inline-block;";
	onButton.innerHTML = "on";
	onButton.dataset.group = groupNum;
	onButton.dataset.type = "onButton";
	onButton.addEventListener('click', function() {
		swapClicked(onButton);
	});
	groupDiv.appendChild(onButton);

	let offButton = document.createElement("button");
	offButton.style.cssText = "display: inline-block;";
	offButton.innerHTML = "off";
	offButton.dataset.group = groupNum;
	offButton.dataset.type = "offButton";
	offButton.addEventListener('click', function() {
		swapClicked(offButton);
	});
	groupDiv.appendChild(offButton);


	groupDiv.appendChild(blankLineElement());
	groupDiv.appendChild(blankLineElement());

	groupDiv.appendChild(paragraphElement("sites to block:"));

	// inputs for sites
	let sitesDiv = document.createElement("div");
	sitesDiv.id = "siteDiv" + groupNum;
	for (let i = 0; i < 2; i++) {
		let newSite = textInputElement("site", groupNum);
		// if not blank group edit inner html here,, 
		// if is blank then dont' need var newSite
		sitesDiv.appendChild(newSite);
		sitesDiv.appendChild(blankLineElement())
	} 
	groupDiv.appendChild(sitesDiv);

	// button for more sites
	let moreSitesButton = document.createElement("button");
	moreSitesButton.style.cssText = "display: block;";
	moreSitesButton.innerHTML = "more sites";
	moreSitesButton.addEventListener("click", function() {
		drawMoreInputs("site", groupNum);
	});
	groupDiv.appendChild(moreSitesButton);

	groupDiv.appendChild(blankLineElement());

	groupDiv.appendChild(paragraphElement("sites to exclude from blocking:"));
	let excludeDiv = document.createElement("div");
	excludeDiv.id = "excludeDiv" + groupNum;
	for (let i = 0; i < 1; i++) {
		let newExclude = textInputElement("exclude", groupNum);
		// if not blank group edit inner html here,, 
		// if is blank then dont' need var newExclude
		excludeDiv.appendChild(newExclude);
		excludeDiv.appendChild(blankLineElement())
	} 
	groupDiv.appendChild(excludeDiv);

	// button for more excludes
	let moreExcludesButton = document.createElement("button");
	moreExcludesButton.style.cssText = "display: block;";
	moreExcludesButton.innerHTML = "more sites";
	moreExcludesButton.addEventListener("click", function() {
		drawMoreInputs("exclude", groupNum);
	});
	groupDiv.appendChild(moreExcludesButton);
	groupDiv.appendChild(blankLineElement());


	// get timecount from config
	let timeCount = 1;
	let timeDiv = document.createElement("div");
	timeDiv.id = "timeDiv" + groupNum;
	timeDiv.dataset.paircount = timeCount;
	for (let i = 1; i < timeCount + 1; i++) {
		let newTime = timeInputsDiv(groupNum, i, "", "");
		timeDiv.appendChild(newTime);
		// timeDiv.appendChild(blankLineElement());
	}
	groupDiv.appendChild(timeDiv);

	// button for more times
	let moreTimesButton = document.createElement("button");
	moreTimesButton.style.cssText = "display: block;";
	moreTimesButton.innerHTML = "more times";
	moreTimesButton.addEventListener("click", function() {
		drawMoreInputs("time", groupNum);
	})
	groupDiv.appendChild(moreTimesButton);

	groupDiv.appendChild(blankLineElement());

	// right now does not look right with no spaces between them! 
	let dayDiv = document.createElement("div");
	dayDiv.appendChild(dayButtonElement("Su", groupNum, false));
	dayDiv.appendChild(dayButtonElement("Mo", groupNum, false));
	dayDiv.appendChild(dayButtonElement("Tu", groupNum, false));
	dayDiv.appendChild(dayButtonElement("We", groupNum, false));
	dayDiv.appendChild(dayButtonElement("Th", groupNum, false));
	dayDiv.appendChild(dayButtonElement("Fr", groupNum, false));
	dayDiv.appendChild(dayButtonElement("Sa", groupNum, false));

	groupDiv.appendChild(dayDiv);


	groupDiv.appendChild(blankLineElement());
	groupDiv.appendChild(blankLineElement());
	document.getElementById("groupDiv1").appendChild(groupDiv);
}

// where type is "site", "exclude", or "time"
// function called when button for more sites is pushed, more input 
// spaces are created for either the sites or the excludes
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

		newInput = timeInputsDiv(groupNum, newPairCount, "", "");
		if (newInput != null) {
			div.dataset.paircount = newPairCount;
		}
		// seperate return than for site or exclude as there should not be a blank line added
		div.appendChild(newInput);
		return;
	}

	// otherwise, the type will be 	site or exclude if (type === "site" || type === "exclude") {
	newInput = textInputElement(type, groupNum);

	// if failed to make a new element, return
	if (newInput == null) {
		console.log("Failed to make newInput while drawing new input from 'more' button, likely type wrong");
		return;
	}

	div.appendChild(newInput);
	div.appendChild(blankLineElement());
}

// returns a text input element made for sites or excludes, 
// or returns undefined and logs to console if failed
function textInputElement(type, groupNum) {
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
	return newInput;
}

// returns a new div of paragraph labels and time 
// entries for starting and ending times

// weirdly not doing spaces around the "start:" and "end:" like it does in .html??
function timeInputsDiv(groupNum, pairNum, startTime, endTime) {
	let div = document.createElement("div");

	let startText = paragraphElement(" start: ");
	startText.style.cssText = "display:inline-block; margin:0px;";
	div.appendChild(startText);

	div.appendChild(timeInputElement("start", startTime, groupNum, pairNum));

	let endText = paragraphElement("end:");
	endText.style.cssText = "display:inline-block; margin:0px;";
	div.appendChild(endText);

	div.appendChild(timeInputElement("end", endTime, groupNum, pairNum));

	return div;
}


// where type is "start" or "end"
function timeInputElement(type, time, groupNum, pairNum) {
	let newTime = document.createElement("input");
	newTime.type = "time";
	newTime.style.cssText = "width:120px;";
	newTime.dataset.type = type + "Time";
	newTime.dataset.group = groupNum;
	newTime.dataset.timePair = pairNum;

	if (time !== "") {
		newTime.value = time;
		return newTime;
	}

	if (type === "start") {
		newTime.value = "00:00";
	} else if (type === "end") {
		newTime.value = "23:59";
	} else {
		console.log("Bad type input given to create new time element");
		return;
	}
	return newTime;
}


// buttons work when clicked on for first time!! however 
// when hovered over they do not look right.... 
// returns a button for the days of the week div set up
function dayButtonElement(day, groupNum, active) {
	let newButton = document.createElement("button");
	newButton.style.cssText = "display: inline-block; margin: 3px;";
	newButton.innerHTML = day;
	newButton.dataset.group = groupNum;
	newButton.dataset.type = day + "Button";

	newButton.addEventListener('click', function() {
		swapClicked(newButton);
	});

	if (active) {
		clicked(newButton);
	} else {
		unclicked(newButton);
	}

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

// // Find all elements with data-columns="3"
// const threeColumnArticles = document.querySelectorAll('[data-columns="3"]');
// // You can then iterate over the results
// threeColumnArticles.forEach((article) => {
//   console.log(article.dataset.indexNumber);
// });


// MAYBE NO KEY?
// key is a string such as "1" for group 1; sites is an array of 
// strings; exclude is an array of strings times is an array of 
// two length arrays (first element is start time, second is end 
// time, ints); days is a 7-array of booleans; active is a boolean 
// true or false
function Group(key, active, sites, exclude, times, days) {
	this.key = key;
	this.sites = sites;
	this.exclude = exclude;
	this.times = times;
	this.days = days;
	this.active = active;
}
// then do const group1 = new Group(………)


// CURRENTLY ISN'T QUITE WORKING, NEEDS TO CLICK TWICE TO START IT FLIPPING BACK AND FORTH
// pass in button, check if it's already blue or green and does opposite
		// if start it off by clicked or unclicked then it works! :D
function swapClicked(button) {
	console.log(button.style.background);
	if (button.style.background == "rgb(106, 139, 166)") {
		clicked(button);
		console.log("unclicked!");
	} else {
		unclicked(button);
		console.log("clicked!");
	}
	button.style.color = "#e5e5e5";
}

// change color of the button to be green
// pass in the document.getElementById
function clicked(button) {
	button.style.background = "#38ec9c";
}

// change color of button to be default blue
function unclicked(button) {
	button.style.background = "#6a8ba6";
}


// idea!! classes and then just iterate through those that have that class! so keep making groups :D
// specific listener for each save button?? or only one save button at the top??? let them delete groups 2+

// make sure that if it's incognito it doesn't do anything!!!

// chrome.tabs.onUpdated.addListener(function(tabID, changeInfo, tab) {
// 	// chrome.tabs.create({ url: chrome.runtime.getURL("../blocked.html")});
// 	console.log("new tab updated!");
// 	console.log(tabID);
// 	console.log(changeInfo);
// 	console.log(tab);

// 	if (tab.url.includes("x.com")) {
// 		chrome.tabs.update(tab.id, {
// 			url: "../blocked.html",
// 			active: true
// 		});
// 	}
// });

// chrome.tabs.onActivated.addListener(function(activeInfo) {
// 	console.log(activeInfo.tabId);
// 	console.log(activeInfo.windowId);
// 	console.log("testing testing 123");
// 	console.log("onactivated!!");
// });
