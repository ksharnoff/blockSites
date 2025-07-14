# blockSites

Configurable Chrome extension to block groups of websites during set times and days. 

Unique Features:
- different groups of websites can be blocked for different times
- can match websites by domain, characters included, or regex as chosen
- can easily activate and deactivate groups of websites
- easy timed pausing of blocking
- block all websites until a certain date and time
- stop any settings changes until a certain date and time
- redirect to any chosen page when blocking
- can chose to exclude sites from blocking (eg: when blocking youtube.com don't block music.youtube.com)

All code is licensed under [MIT](https://github.com/ksharnoff/blockSites/blob/main/LICENSE), images are licensed under [CC BY-NC-SA 4.0](https://github.com/ksharnoff/blockSites/blob/main/images/LICENSE).

## usage: 

![Screenshot of the settings page. The top has buttons for global settings and under are two groups with different websites, times, and days of blocking.](https://github.com/ksharnoff/blockSites/blob/main/images/settingsExample.png)

- Open the popup by clicking the blockSites icon (a green square) under the list of extensions, by clicking the puzzle icon. 
- Navigate to the settings page when the extension is first installed or by clicking the `open settings` button in the popup. You can also block all sites or pause all sites from the popup. 
- Edit what websites are blocked and when on the settings page. 
- Open the help page by clicking the `open help page` button in the popup or settings page. 


## set up: 

1. Download the source code:
    - Download the [latest release](https://github.com/ksharnoff/blockSites/releases) and unzip OR
    - `git clone https://github.com/ksharnoff/blockSites.git`
2. Open chrome://extensions/.
3. Turn developer mode on. 
4. Click `Load unpacked` and upload the folder.
5. Click the puzzle icon in the top right and pin blockSites. 

--- 

No information or data is collected, all settings are stored only in the user's Chrome local storage. 
