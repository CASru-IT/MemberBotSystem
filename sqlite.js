import Database from 'better-sqlite3';
import QRCode from 'qrcode';
import fs from 'fs';
import { createCanvas, loadImage } from 'canvas'; // canvasライブラリを使用

const db = new Database('casru.db');

// テーブルが存在しない場合にのみ作成する
const createTweetTableQuery = db.prepare(`
CREATE TABLE IF NOT EXISTS Member_Information (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  discord_name TEXT NOT NULL,
  name TEXT NOT NULL,
  furigana TEXT NOT NULL,
  student_number TEXT NOT NULL,
  grade INTEGER NOT NULL,
  academic_department TEXT NOT NULL,
  mail_address TEXT NOT NULL,
  team TEXT NOT NULL,
  last_payment_date TEXT NOT NULL
);
`);
createTweetTableQuery.run();

const createTweetTableQuery2 = db.prepare(`
  CREATE TABLE IF NOT EXISTS QRCode (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT NOT NULL,
    qr_code TEXT NOT NULL,
    price INTEGER NOT NULL
  );
`);
createTweetTableQuery2.run();

// データベースのクエリを実行する関数を定義します
function executeQuery(query, params) {
    const stmt = db.prepare(query);
    return stmt.all(params);
}

// データを挿入する関数を定義します
function insertData(discord_id, discord_name, name, furigana, student_number, grade, academic_department, mail_address, team, last_payment_date) {
    console.log(discord_id, discord_name, name, furigana, student_number, grade, academic_department, mail_address, team, last_payment_date);
    const insertTweetQuery = db.prepare(`
    INSERT INTO Member_Information (discord_id, discord_name, name, furigana, student_number, grade, academic_department, mail_address, team, last_payment_date) VALUES (?, ?, ? ,?, ?, ?, ?, ?, ?, ?);
    `);
    insertTweetQuery.run(discord_id, discord_name, name, furigana, student_number, grade, academic_department, mail_address, team, last_payment_date);
}

// データを取得する関数を定義します
function getData() {
    const getTweetsQuery = db.prepare(`
      SELECT * FROM Member_Information;
    `);
    return getTweetsQuery.all();
}

function getDataBydiscord_id(discord_id) {
    const getTweetQuery = db.prepare(`
      SELECT * FROM Member_Information WHERE discord_id = ?;
    `);
    return getTweetQuery.get(discord_id);
}

function getDataByTeam(team) {
    const getTweetQuery = db.prepare(`
        SELECT * FROM Member_Information WHERE team LIKE ?;
    `);
    return getTweetQuery.all(`%${team}%`);
}

// データを削除する関数を定義します
function deleteData(id) {
    const deleteTweetQuery = db.prepare(`
    DELETE FROM Member_Information WHERE id = ?;
    `);
    deleteTweetQuery.run(id);
}

// QRコード用のランダムな文字列を生成する関数を定義します
function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    while (true) {
        let result = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            result += characters[randomIndex];
        }

        // データベース内で一意性を確認
        const existingQRCode = db.prepare(`
            SELECT * FROM QRCode WHERE qr_code = ?;
        `).get(result);

        if (!existingQRCode) {
            return result; // 一意性が確認できた場合に返す
        }
    }
}

function insertQRCode(discord_id, qr_code, price) {
    const insertQRCodeQuery = db.prepare(`
        INSERT INTO QRCode (discord_id, qr_code, price) VALUES (?, ?, ?);
    `);
    insertQRCodeQuery.run(discord_id, qr_code, price);
}

// データベース内のすべてのQRコードをPNGファイルとして生成する関数
function generateAllQRCodes(outputDir = './qrcodes') {
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    // データベースからすべてのQRコードを取得
    const getAllQRCodesQuery = db.prepare(`
        SELECT id, qr_code, price FROM QRCode;
    `);
    const results = getAllQRCodesQuery.all();

    if (results.length === 0) {
        console.log('データベースにQRコードが存在しません。');
        return [];
    }

    const generatedFiles = [];

    // 各QRコードをPNGファイルとして生成
    const promises = results.map(async ({ id, qr_code }) => {
        const outputFilePath = `${outputDir}/${id}.png`;

        try {
            // 一時的にQRコードを生成
            const tempFilePath = `${outputDir}/temp_${id}.png`;
            await QRCode.toFile(tempFilePath, qr_code, {
                type: 'png',
                width: 300,
                margin: 2,
            });

            // Canvasを作成
            const canvas = createCanvas(300, 350); // 高さを少し大きくする
            const ctx = canvas.getContext('2d');

            // 背景を白で塗りつぶす
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 日本語フォントを指定してテキストを描画
            ctx.fillStyle = '#000000';
            ctx.font = '20px "Yu Gothic", "Hiragino Sans", "Noto Sans JP", sans-serif'; // 日本語フォントを指定
            ctx.textAlign = 'center';
            ctx.fillText('Casるへようこそ！', canvas.width / 2, 30);

            // QRコード画像を読み込んで描画
            const qrImage = await loadImage(tempFilePath);
            ctx.drawImage(qrImage, 0, 50, 300, 300);

            // 最終的な画像を保存
            const out = fs.createWriteStream(outputFilePath);
            const stream = canvas.createPNGStream();
            stream.pipe(out);

            await new Promise((resolve) => out.on('finish', resolve));

            console.log(`QRコードが生成されました: ${outputFilePath}`);
            generatedFiles.push(outputFilePath);

            // 一時ファイルを削除
            fs.unlinkSync(tempFilePath);
        } catch (err) {
            console.error(`QRコード生成中にエラーが発生しました (ID: ${id}):`, err);
        }
    });

    return Promise.all(promises).then(() => generatedFiles);
}

export { executeQuery, insertData, getData, deleteData, getDataBydiscord_id, getDataByTeam, generateRandomString, insertQRCode, generateAllQRCodes };