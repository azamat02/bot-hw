# Use an official Node.js runtime as the parent image
FROM node:14

# Set the working directory in the container
WORKDIR /app

# Copy package.json and yarn.lock files
COPY bot/package.json bot/yarn.lock ./
COPY bot/src/hello.mp4 /app/hello.mp4

# Install dependencies using yarn
RUN yarn install

# Copy the rest of your bot's source code
COPY bot/src ./src

# Set environment variables (use ARG if these values shouldn't persist in the image)
ENV NODE_ENV=production

# Your bot's main script
CMD node src/bot.js
