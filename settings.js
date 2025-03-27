// DATE TIME TESTING NO LONGER USING IT RN WOOT WOOT 
// let timeTest = new Date(1970, 1, 1, 13, 30, 20, 10);

// 	//year, month, day, hours, minutes, seconds, milliseconds
// 	console.log(timeTest);
// 	console.log("hours: ", timeTest.getHours());
// 	console.log("minutes: ", timeTest.getMinutes());
// 	console.log("seconds: ", timeTest.getSeconds());

// 	const today = new Date();
// 	console.log("today:", today);
// 	console.log("to month:", today.getMonth());
// 	console.log("minutes:", today.getMinutes());
// 	console.log("hours:", today.getHours());

// 	if (timeTest < today) {
// 		console.log("less than!");
// 	} else {
// 		console.log("else!");



// maybe don't need active tabs persmission or any permission to get the crrent url!!


// to do: add help button!! say: need to save, maybe some about how it works idk

// ; add block all sites forever button; write to storage!! figure out classes being made and buttons to add new groups and cycle through them when you hit save!!
// make probably 5 save buttons for 5 possible groups, then have a message saying : if you want to add more sites it is relatily easy for kezia to do, they just didn't cause lazy but would be happy just ask them and they'll send you some code to paste in,, no probably at all 


// MAKE SURE THAT THE ON AND OFF BUTTONS ARE CORRECTLY COLORED AND THAT ALL THE FIELDS ARE FILLED IN!!
window.addEventListener("load", function() {
});

const g1Mbutton = document.getElementById("g1M");
g1Mbutton.addEventListener("click", function() {
	swapClicked(g1Mbutton);
});


// key is a string such as "g1" for group1; sites is an array of strings; times is an array of two length arrays (first element is start time, second is end time); days is a string of days that this group should apply to; active is a boolean true or false
function group(key, sites, times, days, active) {
	this.key = key;
	this.sites = sites;
	this.times = times;
	this.days = days;
	this.active = active;
}


// CURRENTLY ISN'T QUITE WORKING, NEEDS TO CLICK TWICE TO START IT FLIPPING BACK AND FORTH
// pass in button, check if it's already blue or green and does opposite
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