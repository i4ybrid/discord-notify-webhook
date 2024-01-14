const { Webhook, MessageBuilder } = require('discord-webhook-node');
const { spawn } = require('child_process');
const { initialize } = require('./src/initialize');
const fetch = require('node-fetch');
const fs = require('fs');
const { sendWebhook } = require('./src/webhookManager');
require('dotenv').config();

let hook;

const dupePrevention = new Set();
global.channelToId = {}; //map of { `${categoryName} | #${channelName}` : `${guildId}/${channelId}` }

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
      let isDiscordMessage = lines[5].includes('"discord.com');
      if (isMethodCall && isChromeNotification && !isDiscordMessage) {
        for (const line of lines) {
          if (line.includes('string "discord.com"')) {
            isDiscordMessage = true;
            //global.logger.log('debug', "Found it's a discord message!");
            break;
          }
        }
      }
      //global.logger.log('debug', `Received Discord Message? {${isMethodCall}, ${isChromeNotification}, ${isDiscordMessage}} from ${lines[4]}`);

      if (isMethodCall && isChromeNotification && isDiscordMessage) {
        global.logger.log('debug', `Received Discord Message from ${lines[0]}`);
        const resultData = getSenderInfoFromString(lines[4]);
        const messageData = parseMessages(lines, 6);
        if (resultData) {
          return { ...resultData, message: messageData };
        }
      }
    }
  }
  //global.logger.log('debug', `Received ${inputString}`);
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
          resultString = resultString.substring(0, resultString.length - 1);
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
  const justData = senderLine.replace(/(^ *string ")|("$)/g, '');
  const matchResultsOfName = justData.match(/ \(#.+\)$/);
  if (matchResultsOfName && matchResultsOfName.length > 0 && matchResultsOfName.index > 0 && matchResultsOfName[0]?.length > 3) {
    const [channelName, categoryName] = matchResultsOfName[0].substring(2, matchResultsOfName[0].length - 1).split(', ');
    const senderName = justData.substring(0, matchResultsOfName.index);
    return { senderName, channelName, categoryName };
  } else {
    return null;
  }
}

function checkUnique(payload) {
  const payloadString = JSON.stringify(payload);
  if (!dupePrevention.has(payloadString)) {
    dupePrevention.add(payloadString);
    setTimeout(() => {
      dupePrevention.delete(payloadString);
    }, 5000);
    return true;
  } else {
    return false;
  }
}

(async () => {
  await initialize();
  const command = spawn('dbus-monitor', ["interface='org.freedesktop.Notifications',member='Notify'"]);

  command.stdout.on('data', (output) => {
    const payload = processString(output.toString());
    if (payload) {
      sendWebhook(payload);
    }
  })
})();

