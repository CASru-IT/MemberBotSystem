const Database = require('better-sqlite3');
const QRCode = require('qrcode');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas'); // canvasライブラリを使用

const db = new Database('data/casru.db');
db.pragma('busy_timeout = 5000');  // SQLiteの同時書き込み時に5秒待機

// テーブルが存在しない場合にのみ作成する
const createTweetTableQuery = db.prepare(`
CREATE TABLE IF NOT EXISTS Member_Information (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL UNIQUE,
  discord_name TEXT NOT NULL,
  name TEXT NOT NULL,
  furigana TEXT NOT NULL,
  student_number TEXT NOT NULL,
  grade INTEGER NOT NULL,
  academic_department TEXT NOT NULL,
  mail_address TEXT NOT NULL,
  team TEXT NOT NULL,
  last_payment_date TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT '未登録',
  last_register_date TEXT NOT NULL DEFAULT 'none'
);
`);
createTweetTableQuery.run();

function ensureGenderColumnExists() {
    const pragmaQuery = db.prepare(`PRAGMA table_info(Member_Information);`);
    const columns = pragmaQuery.all();
    const genderColumn = columns.find(column => column.name === 'gender');
    
    if (!genderColumn) {
        //genderとlast_register_dateカラムを追加する
        const alterTableQuery = db.prepare(`ALTER TABLE Member_Information ADD COLUMN gender TEXT NOT NULL DEFAULT '未登録';`);
        const alterLastRegisterDateQuery = db.prepare(`ALTER TABLE Member_Information ADD COLUMN last_register_date TEXT NOT NULL DEFAULT 'none';`);
        alterTableQuery.run();
        alterLastRegisterDateQuery.run();
        console.log('genderカラムを追加しました。');
    } else {
        console.log('genderカラムはすでに存在しています。');
    }
}

// genderカラムが存在しない場合は追加する
ensureGenderColumnExists();

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
function insertData(discord_id, discord_name, name, furigana, student_number, grade, academic_department, mail_address, team, last_payment_date, gender, last_register_date) {
    console.log(discord_id, discord_name, name, furigana, student_number, grade, academic_department, mail_address, team, last_payment_date, gender, last_register_date);

    const query = `
        INSERT INTO Member_Information (discord_id, discord_name, name, furigana, student_number, grade, academic_department, mail_address, team, last_payment_date, gender, last_register_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(discord_id) DO UPDATE SET
            discord_name = excluded.discord_name,
            name = excluded.name,
            furigana = excluded.furigana,
            student_number = excluded.student_number,
            grade = excluded.grade,
            academic_department = excluded.academic_department,
            mail_address = excluded.mail_address,
            team = excluded.team,
            gender = excluded.gender,
            last_register_date = excluded.last_register_date,
            last_payment_date = CASE 
                WHEN Member_Information.last_payment_date = 'none' THEN excluded.last_payment_date
                ELSE Member_Information.last_payment_date
            END;
    `;

    const stmt = db.prepare(query);
    stmt.run(discord_id, discord_name, name, furigana, student_number, grade, academic_department, mail_address, team, last_payment_date, gender, last_register_date);
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
function deleteData(discordid) {
    const deleteTweetQuery = db.prepare(`
    DELETE FROM Member_Information WHERE id = ?;
    `);
    deleteTweetQuery.run(discordid);
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
    return insertQRCodeQuery.run(discord_id, qr_code, price).lastInsertRowid;
}

function getQRCodeByCode(qrCode) {
    const query = db.prepare(`
        SELECT * FROM QRCode WHERE qr_code = ?;
    `);
    return query.get(qrCode);
}

function updatePaymentByQRCode(discordId, qrCode) {
    try {
        const updatePaymentTransaction = db.transaction(() => {
            // ✅ トランザクション内ですべてのチェックを実行
            const qrRow = db.prepare(`
                SELECT * FROM QRCode WHERE qr_code = ?;
            `).get(qrCode);

            if (!qrRow) {
                throw { ok: false, message: 'QRコードがデータベースに存在しません。', code: 'QR_NOT_FOUND' };
            }

            if (qrRow.discord_id !== 'none') {
                throw { ok: false, message: 'このQRコードはすでに使用されています。', code: 'QR_ALREADY_USED' };
            }

            const memberRow = db.prepare(`
                SELECT * FROM Member_Information WHERE discord_id = ?;
            `).get(discordId);

            if (!memberRow) {
                throw { ok: false, message: '会員情報が見つかりませんでした。', code: 'MEMBER_NOT_FOUND' };
            }

            const grade = Number(memberRow.grade);
            const price = Number(qrRow.price);

            if (grade <= 4 && price !== 5000) {
                throw { ok: false, message: 'このQRコードは院生または外部生用です。役員に問い合わせてください。', code: 'PRICE_MISMATCH_UNDERGRAD' };
            }

            if (grade > 4 && price !== 2500) {
                throw { ok: false, message: 'このQRコードは学部生用です。役員に問い合わせてください。', code: 'PRICE_MISMATCH_GRAD' };
            }

            const currentDate = new Date().toISOString();

            // ✅ ここで初めてデータベースを更新
            db.prepare(`
                UPDATE Member_Information
                SET last_payment_date = ?
                WHERE discord_id = ?;
            `).run(currentDate, discordId);

            db.prepare(`
                UPDATE QRCode
                SET discord_id = ?
                WHERE qr_code = ?;
            `).run(discordId, qrCode);

            return { ok: true, message: `${price}円の支払いが完了しました。`, code: 'PAYMENT_UPDATED', paymentDate: currentDate, price };
        });

        return updatePaymentTransaction();
    } catch (error) {
        if (error && error.ok === false) {
            return error; // バリデーションエラー
        }
        // SQLITE_BUSY などのDBエラー
        console.error('updatePaymentByQRCode - DBエラー:', error);
        return { ok: false, message: '処理中にエラーが発生しました。もう一度お試しください。', code: 'DB_ERROR' };
    }
}

// Reuse canvases and render sequentially to bound native image memory.
async function generateQRCodes(rows, outputDir = './qrcodes') {
    const path = require('node:path');
    const { pipeline } = require('node:stream/promises');
    fs.mkdirSync(outputDir, { recursive: true });
    const generatedFiles = [];
    const canvas = createCanvas(1000, 400);
    const qrCanvas = createCanvas(300, 300);
    try {
        for (const { id, qr_code, price } of rows) {
            const outputFilePath = path.join(outputDir, `${id}.png`);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#000000';
            ctx.font = '30px "Noto Sans CJK JP", "Yu Gothic", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(Number(price) === 5000 ? '学部生用' : '院生用または外部生用', 50, 60);
            const now = new Date();
            const fiscalYear = now.getFullYear() - (now.getMonth() < 3 ? 1 : 0);
            ctx.fillText(`${fiscalYear}年度 会費`, 50, 100);
            ctx.fillText('金沢大学 CASる', 50, 140);
            ctx.fillText(`No. ${id}`, 50, 180);
            ctx.fillText(`支払額   ¥${price}`, 50, 220);
            await QRCode.toCanvas(qrCanvas, qr_code, { width: 300, margin: 2 });
            ctx.drawImage(qrCanvas, 570, 40);
            ctx.fillText('QRコードを写真に撮って', 50, 300);
            ctx.fillText('会員情報管理BOTに送ってください。', 50, 340);
            // Reject on encoding or write failure instead of waiting forever.
            await pipeline(canvas.createPNGStream(), fs.createWriteStream(outputFilePath));
            generatedFiles.push(outputFilePath);
        }
        return generatedFiles;
    } finally {
        canvas.width = canvas.height = 0;
        qrCanvas.width = qrCanvas.height = 0;
    }
}

function generateAllQRCodes(outputDir = './qrcodes') {
    return generateQRCodes(db.prepare('SELECT id, qr_code, price FROM QRCode ORDER BY id').all(), outputDir);
}

async function generateCustomQRCode(outputFilePath, qrCodeData, price) {
    try {
        const number = db.prepare(`
            SELECT MAX(id) FROM QRCode;
        `).get().max; // QRコードのIDを取得
        outputFilePath = outputFilePath.replace(/\.png$/, `_${number}.png`); // 会員番号をファイル名に追加
        // ディレクトリが存在しない場合は作成
        const dir = outputFilePath.substring(0, outputFilePath.lastIndexOf('/'));
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // 一時的にQRコードを生成
        const tempFilePath = `${outputFilePath}_temp.png`;
        await QRCode.toFile(tempFilePath, qrCodeData, {
            type: 'png',
            width: 300,
            margin: 2,
        });

        // Canvasを作成
        const canvas = createCanvas(600, 400); // キャンバスサイズを指定
        const ctx = canvas.getContext('2d');

        // 背景を白で塗りつぶす
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // テキストのスタイルを設定
        ctx.fillStyle = '#000000';
        ctx.font = '20px "Yu Gothic", "Hiragino Sans", "Noto Sans JP", sans-serif'; // 日本語フォントを指定
        ctx.textAlign = 'left';

        // テキストを描画
        ctx.fillText('2025年度 会費', 20, 40);
        ctx.fillText('金沢大学 CASる', 20, 80);
        ctx.fillText(`No. ${number}`, 20, 120);
        ctx.fillText(`支払額   ¥${price}`, 20, 160);

        // QRコード画像を読み込んで描画
        const qrImage = await loadImage(tempFilePath);
        ctx.drawImage(qrImage, 350, 40, 200, 200); // QRコードを右側に配置

        // QRコードの説明を描画
        ctx.fillText('QRコードを写真に撮って', 20, 300);
        ctx.fillText('会員情報管理BOTに送ってください。', 20, 340);

        // 最終的な画像を保存
        const out = fs.createWriteStream(outputFilePath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);

        await new Promise((resolve) => out.on('finish', resolve));

        console.log(`QRコードが生成されました: ${outputFilePath}`);

        // 一時ファイルを削除
        fs.unlinkSync(tempFilePath);
    } catch (err) {
        console.error('QRコード生成中にエラーが発生しました:', err);
    }
}

async function DeleteAllQRCodes() {
    const deleteAllQRCodesQuery = db.prepare(`
        DELETE FROM QRCode;
    `);
    deleteAllQRCodesQuery.run();
}

module.exports = {
    executeQuery,
    insertData,
    getData,
    deleteData,
    getDataBydiscord_id,
    getDataByTeam,
    generateRandomString,
    insertQRCode,
    getQRCodeByCode,
    updatePaymentByQRCode,
    generateAllQRCodes,
    generateQRCodes,
    generateCustomQRCode,
    DeleteAllQRCodes
};