FROM node:slim

WORKDIR /app

RUN apt-get update && apt-get upgrade -y

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

CMD ["npm", "start"]