FROM node:slim

WORKDIR /app

COPY . .

# 必要なシステムパッケージをインストール
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    locales \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ロケールを日本語に設定
RUN sed -i '/ja_JP.UTF-8/s/^# //g' /etc/locale.gen && \
    apt-get install -y locales && \
    locale-gen ja_JP.UTF-8 && \
    update-locale LANG=ja_JP.UTF-8

# 環境変数を設定
ENV LANG=ja_JP.UTF-8
ENV LANGUAGE=ja_JP:ja
ENV LC_ALL=ja_JP.UTF-8


COPY package.json package-lock.json ./

RUN npm ci

CMD ["npm", "start"]
