FROM node:slim

WORKDIR /app

COPY . .

# 必要なシステムパッケージをインストール
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
    
COPY package.json package-lock.json ./

RUN npm ci

CMD ["npm", "start"]
