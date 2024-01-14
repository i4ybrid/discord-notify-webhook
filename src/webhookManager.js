const { MessageBuilder } = require('discord-webhook-node');

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
    global.logger.log('error', `Couldn't find the channel for [${categoryName} | ${channelName}]`);
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

module.exports = {
  sendWebhook,
}