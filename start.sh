#!/bin/bash

if [ ! -f "./casru.db" ]; then
  echo "casru.db が見つかりません。新しいファイルを作成します。"
  touch ./casru.db
fi

docker-compose up -d
