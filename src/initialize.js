const { createLogger, format, transports } = require("winston");
const { Webhook } = require('discord-webhook-node');
const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config();

const priorityGuilds = new Set();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
        return 0 === guildInfo?.type;
      });

      const categoryNameMap = await new Map(fetchedCategories.map((category) => {
        return [category.id, category.name];
      }));
      const textNameMap = await new Map(fetchedTextChannels.map((channel) => {
        const categoryName = categoryNameMap.get(channel.parent_id) || '';
        global.channelToId[`${categoryName} | #${channel.name}`] = `${guildInfo.id}/${channel.id}`;
        //global.logger.log('debug', `${categoryName} | #${channel.name} = ${guildInfo.id}/${channel.id}`);
        return [`${categoryName} | #${channel.name}`, `${guildInfo.id}/${channel.id}`];
      }));

      global.logger.log('info', `loadChannelMap Processed [${guildInfo.name}] /${guildInfo.id}; Fetched ${fetchedCategories.length} categories and ${fetchedTextChannels.length} text channels. Processed ${textNameMap.size} text channels`);

      await sleep(5000);
    });
  }, Promise.resolve());
}

function getLoggerDir() {
  return global.rootDirectory ? `${global.rootDirectory}/` : '';
}

function makeLogger() {
  let constants = {};
  fs.readFile('./config/logger.json', 'utf8', (err, jsonString) => {
    if (err) {
      global.logger.log('error', "File read failed:", err);
      return;
    }
    try {
      constants = JSON.parse(jsonString);
    } catch (err) {
      global.logger.log('error', 'Error parsing JSON string:', err);
    }
  });


  global.logger = createLogger({
    level: constants.LOG_LEVEL,
    format: format.printf(({ timestamp, level, message, label }) => {
      return `${timestamp} <${label}> [${level}]: ${message}`;
    }),
    transports: [
      new transports.File({
        filename: `${getLoggerDir()}logs/error.log`,
        level: 'error',
        format: format.combine(
          format.label({ label: process.env.USERNAME }),
          format.timestamp()
        )
      }),
      new transports.File({
        filename: `${getLoggerDir()}logs/combined.log`,
        maxsize: 10000000,
        maxFiles: 5,
        format: format.combine(
          format.label({ label: process.env.USERNAME }),
          format.timestamp()
        )
      }),
      new transports.Console({
        format: format.printf(({ level, message, label }) => {
          return `<${label}> [${level}]: ${message}`;
        }),
        level: 'info',
        format: format.combine(
          format.label({ label: process.env.USERNAME }),
          format.timestamp()
        )
      }),
    ]
  });
  return global.logger;
}


function checkEnvVariables() {
  let fatalError = false;
  const errorMessages = [];
  if (!process.env.NOTIFICATION_WEBHOOK) {
    errorMessages.push(`NOTIFICATION_WEBHOOK was not set in the environment variable`);
    fatalError = true;
  }
  if (!process.env.BROWSER_PATH) {
    errorMessages.push(`BROWSER_PATH was not set in the environment variable`);
    fatalError = true;
  }
  if (!process.env.USERNAME) {
    errorMessages.push(`USERNAME was not set in the environment variable`);
    fatalError = true;
  }
  if (!process.env.DISCORD_USERNAME) {
    errorMessages.push(`DISCORD_USERNAME was not set in the environment variable`);
    fatalError = true;
  }
  if (!process.env.DISCORD_PASSWORD) {
    errorMessages.push(`DISCORD_PASSWORD was not set in the environment variable`);
    fatalError = true;
  }
  if (!process.env.DISCORD_TOKEN) {
    errorMessages.push(`DISCORD_TOKEN was not set in the environment variable`);
  }
  if (errorMessages.length > 0 && fatalError) {
    global.logger.log('crit', errorMessages.join('\n'));
  } else if (errorMessages.length > 0) {
    global.logger.log('warning', errorMessages.join('\n'));
  }
  if (fatalError) {
    process.exit(1);
  }
}

function initializeWebhook() {

  const webhookUrl = process.env.NOTIFICATION_WEBHOOK;
  if (!webhookUrl) {
    const errorMessage = 'You need to set a discord webhook in an .env file. Use .env_sample as an example of what to do, just put your webhook after the NOTIFICATION_WEBHOOK=';
    if (global.logger) {
      global.logger.log('crit', errorMessage);
    }
    process.exit(1);
  }
  global.hook = new Webhook(webhookUrl);
}

function loadGuildData() {
  try {
    const priorityGuildsText = fs.readFileSync('../config/priorityGuilds.txt', 'utf8');
    const priorityGuildArray = priorityGuildsText.split(/(\r\n)+/g);
    priorityGuildArray.forEach((priorityGuild) => {
      priorityGuilds.add(priorityGuild);
    });
  } catch (e) {
    //no-op
  }

  const discordToken = process.env.DISCORD_TOKEN;
  if (discordToken) {
    loadChannelMap(discordToken);
  }
}

function initialize() {
  makeLogger();
  initializeWebhook();
  loadGuildData();
  checkEnvVariables();
}

module.exports = {
  initialize
};