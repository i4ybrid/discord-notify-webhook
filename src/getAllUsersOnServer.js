const { Webhook, MessageBuilder } = require('discord-webhook-node');
const fs = require('fs');
const users = require('../config/users.json');

const webhookUrl = 'https://discord.com/api/webhooks/1004377191821361203/LnKmCWtwDHD4rCuYfPvfhUUDz9f3nbzAAc2S_FallgWwLxkUEJc_Ak448cILauK0ZtTa'
const hook = new Webhook(webhookUrl);

const failures = [];

(() => {
  const userList = Object.values(users);

  const executionLoop = setInterval(() => {
    if (userList.length === 0) {
      clearInterval(executionLoop);
      console.log(`Completed pushing webhook for all users with ${failures.length} failures`);
      fs.writeFileSync('failures.json', JSON.stringify(failures));
    } else {
      const userData = userList.shift();
      const name = userData?.name || 'NULL';
      const discriminator = userData?.discriminator || '#????';
      const guildName = 'Syndicate X-IO';
      const imageUrl = userData?.imageUrl || 'https://www.svgrepo.com/show/353655/discord-icon.svg'
      const roles = userData?.roles || [];
      const roleText = `[${roles.join('], [')}]`;
      const fullUser = `${name}${discriminator}` || 'NULL#????';

      const embed = new MessageBuilder()
        .setTitle(fullUser)
        .setAuthor(fullUser, imageUrl, imageUrl)
        .addField('guild', guildName, true)
        .addField('handle', fullUser, true)
        .addField('roles', roleText)
        .setThumbnail(imageUrl)
        .setTimestamp();
      hook.send(embed)
      .catch((err) => {
        console.error(err.stack);
        failures.push(userData);
      })
    }
  }, 3500);
})();

