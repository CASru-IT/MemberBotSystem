FROM node:slim

WORKDIR /app

COPY . .

RUN apt-get update && apt-get upgrade -y

COPY package.json package-lock.json ./

RUN npm ci

CMD ["npm", "start"]
