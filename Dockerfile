FROM node:alpine

ENV NODE_OPTIONS=--no-warnings

WORKDIR /usr/src/app
ADD ./app/ ./
RUN npm install --loglevel=error

CMD ["node", "index.js"]