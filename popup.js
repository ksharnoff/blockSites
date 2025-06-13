/*
to do :
- make th block every site get config from storage and change to unblock every site if
	all teh sites are currently blocked !
*/


// Creates new tab of settings.html
document.getElementById("settings").addEventListener("click", function() {
	chrome.tabs.create({ url: chrome.runtime.getURL("../settings.html")});
});


// Creates new tab of help.html 
document.getElementById("help").addEventListener("click", function() {
	chrome.tabs.create({ url: chrome.runtime.getURL("../help.html")});
});


async function sendMessageToBackground(message) {
	console.log("popup js is trying to send a message to background!");

	chrome.runtime.sendMessage(message)
		.then(function() {}, function (error) { 
			console.log("error in sending message from popup js to background")
			console.log(error); 
		});
}


let recheckButton = document.getElementById("recheck");
recheckButton.addEventListener("click", function() {
	sendMessageToBackground({task: "updateCurrentBlock"});
});



let blockAllButton = document.getElementById("blockAll");
// Sends message to tell background to block everything! 
blockAllButton.addEventListener("click", function() {
	console.log("popup demands block all!!");
	sendMessageToBackground({task: "blockAll"});
});


let pauseButton = document.getElementById("pauseButton");
pauseButton.addEventListener("click", async function() {
	console.log("pause button hit");
	let amountStr = document.getElementById("pauseAmount").value;
	let statusMessage = document.getElementById("pauseMessage");
	statusMessage.innerHTML = "";

	let amount = parseInt(amountStr);

	console.log(amount);

	if (isNaN(amount)) {
		console.log("does equal!!");
		statusMessage.innerHTML = "Can only give a numerical number to pause";
		return;
	}

	if (amount < 1) {
		amount = 1;
	}
	if (amount > 1440) {
		amount = 1440;
	}


	const message = {task: "pause", time: amount};
	await sendMessageToBackground(message);


	statusMessage.innerHTML = "Pausing blocking for " + amount + " minutes";
});


