// If the button is being hovered over when this function is called, 
// then it will no longer be inverted coloring. This is on purpose 
// so that the change in color between green and blue is more clear 
// than just the small text changing. 
export function swapClicked(button, activeButton) {
	if (button.className == "selected") {
		button.className = "unselected";
		if (activeButton) {
			button.innerHTML = "off";
		}
	} else {
		button.className = "selected";
		if (activeButton) {
			button.innerHTML = "on";
		}
	}
}

// returns config object from storage or null if it is not in storage
export async function getConfig() {
	let result = await chrome.storage.local.get("config");
	if (result == undefined) {
		return null;
	}
	return result.config;
}