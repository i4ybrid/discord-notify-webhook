# Discord Notify Webhook

This is a tool that will work in conjunction with Chrome on Linux variants that use dbus to push the desktop notifications from Chrome's Discord onto a webhook in Discord. This way you won't miss any more notifications; or at least have a log of them.

## Installation

```
git clone https://github.com/i4ybrid/discord-notify-webhook.git
cd discord-notify-webhook
npm install
```


## Usage

First of all, this only works on Linux variants that use dbus, and on Google Chrome right now. If you want more support for another OS or browser, please let me know.

* Setup a webhook in a Discord channel of your choosing to receive your notifications. YOU MUST TURN OFF NOTIFICATIONS in this channel. Otherwise you could be running in an infinite loop. You could also mute it for safe measure, but I haven't.
* Copy the .env_sample to .env locally, and fill in your webhook. The Discord token is not needed right now, but possibly in a future release, this will be needed for extra features.
* Run npm install on the root directory. This was tested with node version 14.17.0, so if there are compatibility issues, you can revert to that version.
* Open Chrome, log into Discord, and turn on your desktop notifications in the settings. Make sure you can get a desktop notification.
* Run node `sendWebhookOnNotify.js`. Optionally you can spit the console out into a log useing `sendWebhookOnNotify.js > webhookNotify.log`

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[ISC](https://opensource.org/licenses/ISC)