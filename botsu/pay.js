const { SlashCommandBuilder } = require('@discordjs/builders');
const jsQR = require('jsqr');
const fetch = global.fetch;
const { createCanvas, loadImage } = require('canvas');
const Database = require('better-sqlite3');
const fs = require('fs');

// データベース接続
const db = new Database('./casru.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('QRコードを読み取り、会費の支払いを完了します。'),
    async execute(interaction) {
        await interaction.reply({ content: 'QRコードを含む画像を送信してください。', flags: 64 });

        // メッセージを待機
        const filter = (message) => message.attachments.size > 0;
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });

        collector.on('collect', async (message) => {
            const attachment = message.attachments.first();
            if (!attachment) {
                await message.reply('画像が見つかりませんでした。');
                return;
            }

            try {
                // 画像を取得
                const response = await fetch(attachment.url);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // 画像をcanvasに描画
                const image = await loadImage(buffer);
                const canvas = createCanvas(image.width, image.height);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0);

// デバッグ用にキャンバスの内容を保存
                const debugBuffer = canvas.toBuffer('image/png');
                fs.writeFileSync('debug-output.png', debugBuffer);
                console.log('デバッグ用の画像を保存しました: debug-output.png');

                preprocessImage(ctx, canvas);
                const debugBuffer2 = canvas.toBuffer('image/png');
                fs.writeFileSync('debug-output2.png', debugBuffer2);
                console.log('デバッグ用の画像を保存しました: debug-output2.png');

                // QRコードを解析
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const qrCodeData = jsQR(imageData.data, canvas.width, canvas.height);

                if (qrCodeData) {
                    console.log('QRコードの内容:', qrCodeData.data);

                    // データベースと比較
                    try {
                        const row = db.prepare('SELECT * FROM QRCode WHERE qr_code = ?').get(qrCodeData.data);

                        if (row) {
                            await message.reply(`QRコードが確認されました。\nID: ${row.id}\n価格: ${row.price}`);
// ここで支払い処理を行うことができます
discordid = interaction.user.id;
                            price = row.price;
                            if (discordid == "none") {
                                pay(message, db, discordid, qrCodeData.data, price); // 支払い処理を実行
                            } else {
                                await message.reply("このQRコードはすでに使用されています。");
                            }
                            // ここで支払い処理を行うことができます
                            discordid = interaction.user.id;
                            price = row.price;
                            if (discordid == "none") {
                                pay(message, db, discordid, qrCodeData.data, price); // 支払い処理を実行
                            } else {
                                await message.reply("このQRコードはすでに使用されています。");
                            }
                            // ここで支払い処理を行うことができます
                            discordid = interaction.user.id;
                            price = row.price;
                            if (discordid == "none") {
                                pay(message, db, discordid, qrCodeData.data, price); // 支払い処理を実行
                            } else {
                                await message.reply("このQRコードはすでに使用されています。");
                            }
                        } else {
                            await message.reply('QRコードがデータベースに存在しません。');
                        }
                    } catch (dbError) {
                        console.error('データベースエラー:', dbError);
                        await message.reply('データベースエラーが発生しました。');
                    }
                } else {
                    console.log('QRコードの解析に失敗しました。画像データを確認してください。');
                    console.log('Canvasサイズ:', canvas.width, canvas.height);
                    console.log('画像データ:', imageData.data.slice(0, 100)); // 画像データの一部を出力
                    await message.reply('QRコードの解析に失敗しました。画像が正しいか確認してください。');
                    return;
                }
            } catch (error) {
                console.error('エラーが発生しました:', error);
                await message.reply('画像の処理中にエラーが発生しました。');
            }
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                await interaction.followUp({ content: '画像が送信されませんでした。タイムアウトしました。', flags: 64 });
            }
        });
    },
};

// グレースケール化とコントラスト調整
function preprocessImage(ctx, canvas) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        // グレースケール化
        const gray = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
        data[i] = gray; // Red
        data[i + 1] = gray; // Green
        data[i + 2] = gray; // Blue

        // コントラスト調整（例: 値を強調）
        if (gray > 100) {
            data[i] = data[i + 1] = data[i + 2] = 255; // 白
        } else {
            data[i] = data[i + 1] = data[i + 2] = 0; // 黒
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

async function pay(message,db,discordid, qrdata, price) {
    // データベースに支払い情報を保存する処理を実装
    row = db.prepare("SELECT * FROM Member_Information WHERE discord_id = ?").get(discordid);
    if(row){
        grade = row.grade;
        if(grade <= 4){
            if(price == 5000){
                db.prepare("UPDATE Member_Information SET last_payment_date = ? WHERE discord_id = ?").run(new Date(), discordid);
                db.prepare("UPDATE QRCode SET discord_id = ? WHERE qr_code = ?").run(discordid, qrdata);
                await message.reply("5000円の支払いが完了しました。");
            }else if(price == 2500){
                await message.reply("このQRコードは院生または外部生用です。役員に問い合わせてください。");
            }
            if(price == 2500){
                db.prepare("UPDATE Member_Information SET last_payment_date = ? WHERE discord_id = ?").run(new Date(), discordid);
                db.prepare("UPDATE QRCode SET discord_id = ? WHERE qr_code = ?").run(discordid, qrdata);
                await message.reply("2500円の支払いが完了しました。");
            }else if(price == 5000){
                await message.reply("このQRコードは学部生用です。役員に問い合わせてください。");
            }
        }
    }
}