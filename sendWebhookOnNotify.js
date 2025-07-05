const { Webhook, MessageBuilder } = require('discord-webhook-node');
const { spawn } = require('child_process');
const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config();

let hook;

const dupePrevention = new Set();
const channelToId = {}; //map of { `${categoryName} | #${channelName}` : `${guildId}/${channelId}` }
const priorityGuilds = new Set();
const browserAppName = '"Brave"'; //Google Chrome ?

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
      const isChromeNotification = lines[1].includes(browserAppName);
      let isDiscordMessage = lines[5].includes('>discord.com<');
      if (isMethodCall && isChromeNotification && !isDiscordMessage) {
        for (const line of lines) {
          if (line.includes('string "discord.com"')) {
            isDiscordMessage = true;
            //console.log("Found it's a discord message!");
            break;
          }
        }
      }
      //console.log(`Received Discord Message? {${isMethodCall}, ${isChromeNotification}, ${isDiscordMessage}} from ${lines[4]}`);

      if (isMethodCall && isChromeNotification && isDiscordMessage) {
        console.log(`Received Discord Message from ${lines[0]}`);
        const resultData = getSenderInfoFromString(lines[4]);
        const messageData = parseMessages(lines, 6);
        if (resultData) {
          return { ...resultData, message: messageData };
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

function sendWebhook(payload) {
  if (!checkUnique(payload)) {
    return;
  }

  //Not using destructuring to allow nulls
  const senderName = payload.senderName;
  const channelName = payload.channelName;
  const categoryName = payload.categoryName;
  const message = payload.message;
  const channelUrlSuffix = channelToId[`${categoryName} | ${channelName}`];
  let channelHyperlink;

  if (channelUrlSuffix) {
    channelHyperlink = `[${channelName}](https://discord.com/channels/${channelUrlSuffix})`;
  } else {
    console.log(`Couldn't find the channel for [${categoryName} | ${channelName}]`);
  }

  const embed = new MessageBuilder()
    .setAuthor('Personal Notification Monitor')
    .addField('Sender', senderName || '.', true)
    .addField('Channel', channelHyperlink ? channelHyperlink : (channelName || '.'), true)
    .addField('Category', categoryName || '.', true)
    .addField('Message', message || '.')
    .setTimestamp();
  hook.send(embed)
    .catch((err) => {
      console.error(err.stack);
    });
}

function initialize() {
  try {
    const priorityGuildsText = fs.readFileSync('./config/priorityGuilds.txt', 'utf8');
    const priorityGuildArray = priorityGuildsText.split(/(\r\n)+/g);
    priorityGuildArray.forEach((priorityGuild) => {
      priorityGuilds.add(priorityGuild);
    });
  } catch (e) {
    //no-op
  }

  const webhookUrl = process.env.NOTIFICATION_WEBHOOK;
  if (!webhookUrl) {
    console.error('You need to set a discord webhook in an .env file. Use .env_sample as an example of what to do, just put your webhook after the NOTIFICATION_WEBHOOK=');
    process.exit(1);
  }
  hook = new Webhook(webhookUrl);

  const discordToken = process.env.DISCORD_TOKEN;
  if (discordToken) {
    loadChannelMap(discordToken);
  }
}

function guildSorter(a, b) {
  if (priorityGuilds.has(a.id) || priorityGuilds.has(a.name)) {
    return -1;
  } else if (priorityGuilds.has(b.id) || priorityGuilds.has(b.name)) {
    return 1;
  } else {
    return 0;
  }
}

/**
 * Fetches all channel data periodically (rate limited), and then put it into the channelToId map.
 * Tuples in object are: [ `${categoryName} | #${channelName}`, `${guildId}/${channelId}` ]
 * 
 * @param {string} discordToken
 */
async function loadChannelMap(discordToken) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: discordToken,
  };

  const allGuilds = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    method: 'GET',
    headers
  }).then((res) => res.json())
    .then((json) => json) || [];

  const sortedGuilds = allGuilds.sort(guildSorter);
  
  const guildFetchPromise = sortedGuilds.reduce((promiseAccumulator, guildInfo) => {
    return promiseAccumulator.then(async () => {
      const fetchedChannels = await fetch(`https://discord.com/api/v10/guilds/${guildInfo.id}/channels`, {
        method: 'GET',
        headers
      }).then((res) => res.json())
        .then((json) => json);

      const fetchedCategories = await fetchedChannels.filter((guildInfo) => {
        return 4 === guildInfo?.type;
      });
      const fetchedTextChannels = await fetchedChannels.filter((guildInfo) => {
        return  0 === guildInfo?.type;
      });

      const categoryNameMap = await new Map(fetchedCategories.map((category) => {
        return [category.id, category.name];
      }));
      const textNameMap = await new Map(fetchedTextChannels.map((channel) => {
        const categoryName = categoryNameMap.get(channel.parent_id) || '';
        channelToId[`${categoryName} | #${channel.name}`] = `${guildInfo.id}/${channel.id}`;
        //console.log(`${categoryName} | #${channel.name} = ${guildInfo.id}/${channel.id}`);
        return [`${categoryName} | #${channel.name}`, `${guildInfo.id}/${channel.id}`];
      }));

      console.log(`loadChannelMap Processed [${guildInfo.name}] /${guildInfo.id}; Fetched ${fetchedCategories.length} categories and ${fetchedTextChannels.length} text channels. Processed ${textNameMap.size} text channels`);

      await sleep(5000);
    });
  }, Promise.resolve());
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

