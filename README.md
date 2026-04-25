# MemberBotSystem

Discordの会員管理用ボットです。DM上で会員登録を行い、SQLiteに保存した情報をもとに、会員情報の参照、支払い処理、CSV出力、QRコード管理を行います。

## 主な機能

- DMでの会員登録
- 自分の登録情報の確認
- QRコードを使った会費支払い管理
- 管理者向けの会員情報削除
- 全件CSV出力、班ごとのCSV出力
- 管理者の許可リスト登録
- QRコードの一括生成

## 必要環境

- Docker と Docker Compose
- Ubuntu（本番ホスト環境）
- Discord Botアプリケーション
- DiscordサーバーのギルドID
- SQLiteのデータを保存するための書き込み権限

## デプロイ方法

現在の運用では、この GitHub リポジトリをサーバー側に直接クローンし、そのまま Docker Compose で起動します。アプリ本体はコンテナ内で動作し、会員情報のDBと許可リストは Docker ボリューム `CasruDB` に、QRコード画像はホスト側の `qrcodes/` に保存されます。

1. リポジトリをクローンします。

```bash
git clone https://github.com/CASru-IT/MemberBotSystem.git
cd MemberBotSystem
```

2. リポジトリ直下に `.env` を用意します。`sample.env` を参考にして、実際の値を設定してください。

```env
DISCORD_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
GUILD_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
PASSWORD=xxxxxxxx
```

3. Docker Compose でビルドと起動を行います。

```bash
docker compose up --build -d
```

4. 停止するときは次のコマンドを使います。

```bash
docker compose down
```

コンテナ起動時に `npm start` が実行され、`deploy-commands.js` によるコマンド登録のあとに `index.js` が起動します。

ローカル環境で直接動かす場合は、別途 Node.js を用意したうえで `npm install` を実行してください。ただし、通常の運用は GitHub リポジトリをクローンして Docker Compose で起動する方法を推奨します。

## バージョン更新手順

サーバー上で運用中のインスタンスを新しいバージョンに更新する場合は、以下の手順を実行してください。

1. 最新のコードを取得します。

```bash
git pull
```

2. 新しいイメージで再ビルドして再起動します。

```bash
docker compose up --build -d --remove-orphans
```

3. ログを確認して正常起動を確認します。

```bash
docker compose logs -f bot
```

4. 停止するときは次のコマンドを使います。

```bash
docker compose down
```

`CasruDB` は名前付きボリュームのため、`docker compose up --build -d` でコンテナを作り直してもDBデータは保持されます。

## `CasruDB` の中身を読み出す方法（Ubuntu）

読み取り専用で確認する場合は、以下のコマンドを使用してください。

1. ファイル一覧を確認します。

```bash
docker run --rm -v CasruDB:/data:ro alpine ls -la /data
```

2. SQLiteのテーブル一覧を確認します。

```bash
docker run --rm -v CasruDB:/data:ro keinos/sqlite3 sqlite3 /data/casru.db ".tables"
```

3. 任意のホストディレクトリへ読み出します（バックアップ用途）。

```bash
mkdir -p ./casrudb_dump
docker run --rm --mount type=volume,src=CasruDB,dst=/in,readonly --mount type=bind,src="$(pwd)/casrudb_dump",dst=/out alpine sh -c "cp -a /in/. /out/"
```

4. 対話モードでDBを閲覧します（読み取り用）。

```bash
docker run --rm -it -v CasruDB:/data:ro keinos/sqlite3 sqlite3 /data/casru.db
```

対話モードでは、閲覧のみの場合は `SELECT` 系のSQLだけを実行してください。

## 旧構成（`./data`）から `CasruDB` への移行手順（Ubuntu）

以前の構成で `./data:/app/data` を使っていた場合は、最初の1回だけ次の移行を実施してください。

1. 既存コンテナを停止します。

```bash
docker compose down
```

2. ボリュームを作成します。

```bash
docker volume create CasruDB
```

3. `./data` の中身をボリュームへコピーします。

```bash
docker run --rm -v CasruDB:/to -v "$(pwd)/data:/from" alpine sh -c "cp -a /from/. /to/"
```

4. 起動して動作確認します。

```bash
docker compose up --build -d
docker compose logs -f bot
```

## 環境変数

- `DISCORD_TOKEN`  : Discord Botのトークン
- `CLIENT_ID`      : DiscordアプリケーションのクライアントID
- `GUILD_ID`       : コマンドを登録するギルドID
- `PASSWORD`       : `/admin` 実行時に必要なパスワード
- `ZBARIMG_EXECUTABLE` : `zbarimg` 実行ファイルの絶対パス。Docker運用では `/usr/bin/zbarimg` を指定します

`PASSWORD` は、`/csv` や `/team_csv`、`/deleteinfo`、`/qrcode` などの重要コマンドを実行できるユーザーを許可リストに追加するために使います。

## コマンド一覧

### `/register`

DMで会員登録を行います。入力項目は以下です。

- 学籍番号
- 氏名
- ふりがな
- メールアドレス
- 学年
- 学類または大学名
- 所属班

学年が「外部生またはその他」の場合は、学類の代わりに大学名を入力します。

### `/get`

自分の登録情報をDMで確認します。

### `/pay`

DMでQRコード文字列を入力して会費支払いを処理します。

- 学部生は 5000円のQRコードを使用します
- 院生、外部生、その他は 2500円のQRコードを使用します

### `/qrcode`

指定した個数のQRコードを生成します。

- `count` で生成数を指定します
- `yen` で `5000円` または `2500円` を指定します

生成したQRコードはデータベースに保存され、画像ファイルも作成されます。

### `/csv`

Member_Informationテーブルの内容をCSVとして出力します。

### `/team_csv`

指定した班のメンバーだけをCSVとして出力します。

### `/deleteinfo`

指定した `discord_id` の会員情報を削除します。

### `/admin`

パスワードを入力して、実行者を許可リストに追加します。

## CSV出力仕様

CSVの出力では、学年と学類の扱いに次のルールがあります。

- 1年から4年は、そのまま `1` から `4` を出力します
- 院生は `5` を出力します
- 外部生またはその他は `6` を出力します
- 外部生については、学類欄に大学名を出力します

## データ保存先

- 会員情報DB: Docker ボリューム `CasruDB` 内の `/app/data/casru.db`
- 許可リスト: Docker ボリューム `CasruDB` 内の `/app/data/allowedUsers.json`
- QRコード画像: ホスト側の `qrcodes/`

初回起動時に `/app/data/allowedUsers.json` が存在しない場合は、自動で作成されます。

Docker Compose では、これらの保存先がコンテナにマウントされているため、コンテナを作り直してもDBと許可リストは `CasruDB` に、QRコード画像はホスト側に残ります。

## 補足

- `/register` と `/pay` はDMでのみ使用できます
- `/csv`、`/team_csv`、`/deleteinfo`、`/qrcode` は許可リストに登録されたユーザーのみ実行できます
- `npm test` は現状未実装です
