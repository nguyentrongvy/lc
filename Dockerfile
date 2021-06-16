# Dockerfile
FROM node:10-alpine
RUN apk add python3 && apk add build-base
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
EXPOSE 80
CMD node bin/index.js