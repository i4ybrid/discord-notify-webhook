const puppeteer = require('puppeteer-core');

/**
 * Logs in to discord. It also handles hCaptcha and any error messages. Error messages require a retrigger by the end-user
 * @param {*} page 
 * @param {number} attempts Defaults to 0 if it's not passed in
 * @returns 
 */
async function login(page, attempts = 0) {
  if (attempts >= 3) {
    global.logger.log('error', `Couldn't log in for username ${process.env.USERNAME} after 3 attempts`)
    return;
  }
  //Login if needed
  await page.type('input[type="text"][name="email"]', process.env.DISCORD_USERNAME);
  const emailElement = document.querySelector('input[type="text"][name="email"]');
  emailElement.value = process.env.DISCORD_USERNAME;
  await page.type('input[type="password"][name="password"]', process.env.DISCORD_PASSWORD);
  const passwordElewment = document.querySelector('input[type="password"][name="password"]');
  passwordElewment.value = process.env.DISCORD_PASSWORD;

  attempts++;
  global.logger.log('info', `Attempting login for ${process.env.USERNAME}. Attempt #${attempts}`);
  await page.click('button[type="submit"]');
  Promise.race([
    page.waitForSelector('button[aria-label="User Settings"]', { timeout: 29000 })
      .then(() => {
        global.logger.log('info', 'Successfully logged into Discord!');
        turnOnDesktopNotification(page);
      }).catch(async () => {
        //no-op
      }),
    page.waitForSelector('iframe[src*="hcaptcha.com"]', { timeout: 5000 })
      .then((captchaIframe) => {
        //TODO Implement this
        global.logger.log('info', 'Received hCaptcha trying to log into Discord');
        hCaptchaProcess(page, captchaIframe);
      }).catch(() => {
        //no-op
      }),
    page.waitForSelector('span[class^="errorMessage__"]', { timeout: 10000 })
      .then((errorMessageElement) => {
        const errorMessage = errorMessageElement.getProperty('innerText');
        global.logger.log('warning', `Received error message trying to log into Discord: ${errorMessage}`);
        alertUserWithError(page, errorMessage);
      }),
    new Promise(resolve => { //Fallback case after 30 seconds, to retry; only doing this because of Promise.race
      setTimeout(() => resolve(resolve, 30000)
        .then(async () => {
          await page.goto('https://discord.com/login');
          await page.waitForNavigation();
          login(page, attempts);
        }));
    }),
  ]);
}

/**
 * Reroute Captcha to user and send back token
 * @param {*} page 
 * @param {*} captchaIframe 
 */
function hCaptchaProcess(page, captchaIframe) {
  //TODO Implement this
}

/**
 * Send error message bacdk to user so they can re-trigger the login
 * @param {*} page 
 * @param {string} errorMessage 
 */
function alertUserWithError(page, errorMessage) {
  //TODO Implement this
}

async function turnOnDesktopNotification(page) {
  await page.waitForSelector('button[aria-label="User Settings"]')
    .then((settingsButton) => {
      settingsButton.click();
    });

  await page.evaluate(() => {
    $("div[class^='item__']:contains('Notifications')").click();
  });
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Navigate to the website
  await page.goto('https://discord.com/channels/@me');
  await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.7.1.min.js' });

  Promise.race([
    page.waitForSelector(emailInputSelector, { timeout: 5000 })
      .then(() => {
        login(page);
      }).catch(() => {

      }),
    page.waitForSelector(settingsSelector, { timeout: 5000 })
      .then(() => {
        turnOnDesktopNotification(page);
      }).catch(() => {

      })
  ]);

  // Close the browser
  await browser.close();
})();

