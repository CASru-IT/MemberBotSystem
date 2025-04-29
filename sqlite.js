import Database from 'better-sqlite3';
import QRCode from 'qrcode';
import fs from 'fs';

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
    qr_code TEXT NOT NULL
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

function insertQRCode(discord_id, qr_code) {
    const insertQRCodeQuery = db.prepare(`
        INSERT INTO QRCode (discord_id, qr_code) VALUES (?, ?);
    `);
    insertQRCodeQuery.run(discord_id, qr_code);
}

// データベースからQRコードを取得してPNGファイルとして出力する関数
function generateQRCodePng(discord_id, outputDir = './qrcodes') {
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    // データベースからQRコードを取得
    const getQRCodeQuery = db.prepare(`
        SELECT qr_code FROM QRCode WHERE discord_id = ?;
    `);
    const result = getQRCodeQuery.get(discord_id);

    if (!result) {
        throw new Error(`指定されたDiscord ID (${discord_id}) に対応するQRコードが見つかりません。`);
    }

    const qrCodeData = result.qr_code;
    const outputFilePath = `${outputDir}/${discord_id}.png`;

    // QRコードをPNGファイルとして生成
    return QRCode.toFile(outputFilePath, qrCodeData, {
        type: 'png',
        width: 300,
        margin: 2,
    })
        .then(() => {
            console.log(`QRコードが生成されました: ${outputFilePath}`);
            return outputFilePath;
        })
        .catch((err) => {
            console.error('QRコード生成中にエラーが発生しました:', err);
            throw err;
        });
}

// データベース内のすべてのQRコードをPNGファイルとして生成する関数
function generateAllQRCodes(outputDir = './qrcodes') {
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    // データベースからすべてのQRコードを取得
    const getAllQRCodesQuery = db.prepare(`
        SELECT id, qr_code FROM QRCode;
    `);
    const results = getAllQRCodesQuery.all();

    if (results.length === 0) {
        console.log('データベースにQRコードが存在しません。');
        return [];
    }

    const generatedFiles = [];

    // 各QRコードをPNGファイルとして生成
    const promises = results.map(({ id, qr_code }) => {
        const outputFilePath = `${outputDir}/${id}.png`;

        return QRCode.toFile(outputFilePath, qr_code, {
            type: 'png',
            width: 300,
            margin: 2,
        })
            .then(() => {
                console.log(`QRコードが生成されました: ${outputFilePath}`);
                generatedFiles.push(outputFilePath);
            })
            .catch((err) => {
                console.error(`QRコード生成中にエラーが発生しました (ID: ${id}):`, err);
            });
    });

    return Promise.all(promises).then(() => generatedFiles);
}

export { executeQuery, insertData, getData, deleteData, getDataBydiscord_id, getDataByTeam, generateRandomString, insertQRCode, generateQRCodePng, generateAllQRCodes };