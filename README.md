# blockSites

Customizable Chrome extension to block groups of websites during set times and days. 

This solves the problems of having different websites blocked for different times, easy ability to activate or deactivate groups of websites, easy timed pausing of blocking (to avoid pausing by turning off the extension), and preserving back button navigation after a site was blocked. 

All code is licensed under [MIT](https://github.com/ksharnoff/blockSites/blob/main/LICENSE), images are licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
<!-- change the above link for CC license to link to the license in the repo -->

## features: 

This extension formats the websites into groups. Each group can have a list of websites to block, and to exclude from blocking. Each group has the days selected and which times within those days. You can pause groups or delete them. The groups can be modified on the settings page. 

From the popup, you can block all websites from all active groups or pause all blocking for a chosen amount of time. 

Once a website that is designated blocked is visited, the page will be reloaded with the block page of the extension. 

## usage: 

- Open the popup by clicking the blockSites icon (a green square) under the list of extensions, by clicking the puzzle icon. 
- Navigate to the settings page when the extension is first installed or by clicking the `open settings` button in the popup.
- Edit what websites are blocked and when on the settings page. 
- Open the help page by clicking the `help!` button in the popup or settings page. 


## set up: 

1. Download this repo as a zip, unzip it. 
2. Open chrome://extensions/.
3. Turn developer mode on. 
4. Click `Load unpacked` and upload the unzipped folder.
5. Make sure that the extension is turned on with the blue switch next to the reload button on the bottom right.
6. Click the puzzle icon in the top right and pin blockSites. 

--- 

No information or data is collected, all settings are stored only in Chrome's local storage. 
