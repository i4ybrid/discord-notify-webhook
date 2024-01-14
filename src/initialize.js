const { createLogger, transports } = require("winston");
const constants = require("../../config/logger.json");

function getLoggerDir() {
  return global.rootDirectory ? `${global.rootDirectory}/` : '';
}

function makeLogger() {
  global.logger = createLogger({
    level: constants.LOG_LEVEL,
    format: winston.format.printf(({ timestamp, level, message, label }) => {
      return `${timestamp} <${label}> [${level}]: ${message}`;
    }),
    transports: [
      new transports.File({
        filename: `${getLoggerDir()}logs/error.log`,
        level: 'error',
        format: winston.format.combine(
          winston.format.label({ label: process.env.USERNAME }),
          winston.format.timestamp()
        )
      }),
      new transports.File({
        filename: `${getLoggerDir()}logs/combined.log`,
        maxsize: 10000000,
        maxFiles: 5,
        format: winston.format.combine(
          winston.format.label({ label: process.env.USERNAME }),
          winston.format.timestamp()
        )
      }),
      new transports.Console({
        format: winston.format.printf(({ level, message, label }) => {
          return `<${label}> [${level}]: ${message}`;
        }),
        level: 'info',
        format: winston.format.combine(
          winston.format.label({ label: process.env.USERNAME }),
          winston.format.timestamp()
        )
      }),
    ]
  });
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
  if (errorMessage.length > 0 && fatalError) {
    global.logger.log('crit', errorMessages.join('\n'));
  } else if (errorMessages.length > 0) {
    global.logger.log('warning', errorMessages.join('\n'));
  }
  if (fatalError) {
    process.exit(1);
  }
}

function initialize() {
  makeLogger();
  checkEnvVariables();
}

export default initialize();