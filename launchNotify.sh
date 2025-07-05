#!/bin/bash

# Check if a screen session named 'discord-webhook' is already running
if screen -list | grep -q "discord-webhook"; then
  echo "Screen session 'discord-webhook' is already running. Reconnecting..."
  screen -S discord-webhook -X stuff "cd ~/development/discord-notify-webhook && npm start$(echo -ne '\015')"
  echo "Command executed in existing screen session 'discord-webhook'."
else
  # Start the screen session
  screen -S discord-webhook -d -m bash -c "cd ~/development/discord-notify-webhook && npm start"
  echo "Screen session 'discord-webhook' started."
fi

