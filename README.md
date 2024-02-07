# Discord Notify Webhook

This is a tool that will work in conjunction with Chrome on Linux variants that use dbus to push the desktop notifications from Chrome's Discord onto a webhook in Discord. This way you won't miss any more notifications; or at least have a log of them.

## Installation

```
git clone https://github.com/i4ybrid/discord-notify-webhook.git
cd discord-notify-webhook
npm install
```

## Usage
This only works on Linux variants that use dbus, and on Google Chrome right now. If you want more support for another OS or browser, please let me know. Ubuntu Desktop is supported.

* Set up a webhook in a Discord channel of your choosing to receive your notifications. YOU MUST TURN OFF NOTIFICATIONS in this channel. Otherwise you could be running in an infinite loop. You could also mute it for safe measure, but I haven't.
* Copy the .env_sample to .env locally, and fill in your webhook. The optional Discord token is used to fetch all your guild information and try to generate a link to a the correct channel
* Run npm install on the root directory. This was tested with node version 14.17.0, so if there are compatibility issues, you can revert to that version.
* Open Chrome, log into Discord, and turn on your desktop notifications in the settings. Make sure you can get a desktop notification.
* Run node `sendWebhookOnNotify.js`. Optionally you can spit the console out into a log using `sendWebhookOnNotify.js > webhookNotify.log`

# Optional
* Set your token in the .env file, this is not needed. You can search online for "How to get my Discord token" to get it.
* Enter discord guild names in config/priorityGuilds.txt

## Open Bugs
* The application will try to match the right channel and category as best as possible, but the channel is ambiguous, so it can get this wrong. There is no fix at this time

## Roadmap
* Will update to automatically refresh channel list periodically. For now, the workaround is just to restart the script when new channels are created or new guilds are joined

## License
[ISC](https://opensource.org/licenses/ISC)
