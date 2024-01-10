# Use a lightweight Linux distribution like Alpine
FROM alpine

# Install LXQt UI, Microsoft Edge, Node.js v20
RUN apk add --no-cache lxqt microsoft-edge nodejs

# Set the working directory
WORKDIR /home

# Clone the repository
RUN git clone https://github.com/i4ybrid/discord-notify-webhook.git

# Change the working directory
WORKDIR /home/discord-notify-webhook

# If node_modules folder doesn't exist, run npm install
RUN if [ ! -d "node_modules" ]; then npm install; fi

# Expose port for the app (if needed)
EXPOSE 8080
