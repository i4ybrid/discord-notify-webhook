const { Webhook, MessageBuilder } = require('discord-webhook-node');
const { spawn } = require('child_process');
require('dotenv').config();

let hook;

/**
 * Will process message, returns null if filtered or an error happens
 * 
 * @param {string[]} inputString 
 */
function processString(inputString) {
  if (inputString) {
    const lines = inputString.split(/\r?\n/);
    if (lines.length > 5) {
      const isMethodCall = lines[0].startsWith('method call');
      const isChromeNotification = lines[1].includes('"Google Chrome"');
      const isDiscordMessage = lines[5].includes('"discord.com');;
      //console.log(`Received Discord Message? {${isMethodCall}, ${isChromeNotification}, ${isDiscordMessage}} from ${lines[4]}`);

      if (isMethodCall && isChromeNotification && isDiscordMessage) {
        console.log(`Received Discord Message from ${lines[0]}`);
        const resultData = getSenderInfoFromString(lines[4]);
        const messageData = parseMessages(lines, 6);
        if (resultData) {
          return {...resultData, message: messageData};
        }
      }
    }
  }
  //console.log(`Received ${inputString}`);
}

/**
 * Parses the message out of the lines, and removes all other embedded junk
 * 
 * @param {string[]} lines 
 * @param {number} startIndex 
 */
function parseMessages(lines, startIndex) {
  let keepProcessing = startIndex < lines.length; //Don't process if we're already over the limit
  let resultString = '';
  if (keepProcessing !== true) {
    return resultString;
  }

  let lineIndex = startIndex
  while (keepProcessing === true && lineIndex < lines.length) {
    const s = lines[lineIndex];
    if (s) {
      const matchResults = s.match(/^ * array \[/);
      if (matchResults && matchResults[0]) { //If the string has ended, finish up
        keepProcessing = false;
        if (resultString.endsWith('"')) { //Remove trailing "
          resultString = resultString.substring(0, resultString.length-1);
        }
      } else if (s.length > 0) { //Otherwise keep appending
        
        resultString = resultString.length > 0 ? `${resultString}\n${s}` : s;
      }
    }
    lineIndex++;
    
    if (keepProcessing !== true || lineIndex >= lines.length) { //Terminating loop condition
      return resultString;
    }
  }
}

/**
 * Parses string to get the senderName, channelName, and categoryName. Then returns an object with all three. Returns null if un-parseable.
 * Expects the input string to be in the format: '   string "JeannieJoy (#moving-channel, dev2)"'
 * 
 * @param {string} senderLine 
 * @returns {Object} {sendName, channelName, categoryname}
 */
function getSenderInfoFromString(senderLine) {
  //
  const justData = senderLine.replace(/(^ *string ")|("$)/g,'');
  const matchResultsOfName = justData.match(/ \(#.+\)$/);
  if (matchResultsOfName && matchResultsOfName.length > 0 && matchResultsOfName.index > 0 && matchResultsOfName[0]?.length > 3) {
    const [channelName, categoryName] = matchResultsOfName[0].substring(2, matchResultsOfName[0].length-1).split(', ');
    const senderName = justData.substring(0, matchResultsOfName.index);
    return {senderName, channelName, categoryName};
  } else {
    return null;
  }
}

function sendWebhook(payload) {
  //Not using destructuring to allow nulls
  const senderName = payload.senderName;
  const channelName = payload.channelName;
  const categoryName = payload.categoryName;
  const message = payload.message;
  let channelHyperlink;

  if (global.channelMap?.[categoryName]?.[channelName]) {
    const channelInfo = global.channelMap[categoryName]?.[channelName];
    const guildId = channelInfo.guild_id;
    const channelId = channelInfo.id;
    if (guildId && channelId) {
      channelHyperlink = `[${channelName}](https://discord.com/channels/${guildId}/${channelId})`;
    }
  }

  const embed = new MessageBuilder()
    .setAuthor('Personal Notification Monitor')
    .addField('Sender', senderName || '.', true)
    .addField('Channel', channelName || '.', true)
    .addField('Category', channelHyperlink ? channelHyperlink : channelName, true)
    .addField('Message', message || '.')
    .setTimestamp();
  hook.send(embed)
    .catch((err) => {
      console.error(err.stack);
    });
}

function initialize() {
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK;
  if (!webhookUrl) {
    console.error('You need to set a discord webhook in an .env file. Use .env_sample as an example of what to do, just put your webhook after the NOTIFICATION_WEBHOOK=');
    process.exit(1);
  }
  hook = new Webhook(webhookUrl);

  const discordToken = process.env.DISCORD_TOKEN;
  if (discordToken) {
    //TODO Gather all messages and load data into a guild map
  }
}

function loadChannelMap(discordToken) {

}

(() => {
  initialize();
  //Adding the sender because I was getting duplicate notifications, there may be a better fix for this
  const command = spawn('dbus-monitor', ["interface='org.freedesktop.Notifications',sender=':1.50',member='Notify'"]);

  command.stdout.on('data', (output) => {
    const payload = processString(output.toString());
    if (payload) {
      sendWebhook(payload);
    }
  })
})();

