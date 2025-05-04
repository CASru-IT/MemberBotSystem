const { SlashCommandBuilder } = require('@discordjs/builders');
const QRReader = require('qrcode-reader');
const JimpLib = require('jimp');
const Jimp = JimpLib.Jimp;
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
        const filter = (message) => {
            // ボット自身が送信したメッセージには反応しない
            return !message.author.bot && message.attachments.size > 0;
        };
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });

        collector.on('collect', async (message) => {
            console.log('collectorがトリガーされました'); // デバッグ用ログ

            let tempFilePath; // tempFilePathをスコープ内で定義

            try {
                const attachment = message.attachments.first();
                if (!attachment) {
                    await message.reply('画像が見つかりませんでした。');
                    return;
                }

                // 画像を取得
                const highResUrl = `${attachment.url}?size=2048`;
                const response = await fetch(highResUrl);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // 一時ファイルとして保存
                tempFilePath = './temp-image.png';
                fs.writeFileSync(tempFilePath, buffer);

                console.log('QRコードの処理を開始します'); // デバッグ用ログ

                // QRコードを処理
                const qrCodeData = await processQRCode(tempFilePath);

                if (qrCodeData) {
                    console.log('QRコードの内容:', qrCodeData);

                    // データベースと比較
                    const row = db.prepare('SELECT * FROM QRCode WHERE qr_code = ?').get(qrCodeData);

                    if (row) {
                        const discordid = interaction.user.id;

                        if (discordid === "none") {
                            await pay(message, db, discordid, qrCodeData, row.price);
                        } else {
                            console.log("このQRコードはすでに使用されています。");
                            await message.reply("このQRコードはすでに使用されています。");
                        }
                    } else {
                        await message.reply('QRコードがデータベースに存在しません。');
                    }
                } else {
                    console.log('QRコードの解析に失敗しました。');
                    await message.reply('QRコードの解析に失敗しました。');
                }
            } catch (error) {
                console.error('エラーが発生しました:', error);
                await message.reply('画像の処理中にエラーが発生しました。');
            } finally {
                if (tempFilePath) {
                    try {
                        if (fs.existsSync(tempFilePath)) {
                            fs.unlinkSync(tempFilePath);
                            console.log('一時ファイルを削除しました:', tempFilePath);
                        } else {
                            console.log('一時ファイルが存在しません:', tempFilePath);
                        }
                    } catch (unlinkError) {
                        console.error('一時ファイルの削除中にエラーが発生しました:', unlinkError);
                    }
                }
            }
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                await interaction.followUp({ content: '画像が送信されませんでした。タイムアウトしました。', flags: 64 });
            }
        });
    },
};

async function processQRCode(imagePath) {
    try {
        const image = await Jimp.read(imagePath); // Jimpで画像を読み込む
        const qr = new QRReader();

        const value = await new Promise((resolve, reject) => {
            qr.callback = (err, v) => (err != null ? reject(err) : resolve(v));
            qr.decode(image.bitmap); // QRコードをデコード
        });

        if (value && value.result) {
            console.log('QRコードの内容:', value.result);
            return value.result; // デコード結果を返す
        } else {
            console.log('QRコードが検出されませんでした。');
            return null;
        }
    } catch (error) {
        console.error('QRコードの処理中にエラーが発生しました:', error);
        return null;
    }
}

async function pay(message, db, discordid, qrdata, price) {
    // データベースに支払い情報を保存する処理を実装
    const row = db.prepare("SELECT * FROM Member_Information WHERE discord_id = ?").get(discordid);
    if (row) {
        const grade = row.grade;
        if (grade <= 4) {
            if (price == 5000) {
                db.prepare("UPDATE Member_Information SET last_payment_date = ? WHERE discord_id = ?").run(new Date(), discordid);
                db.prepare("UPDATE QRCode SET discord_id = ? WHERE qr_code = ?").run(discordid, qrdata);
                await message.reply("5000円の支払いが完了しました。");
            } else if (price == 2500) {
                await message.reply("このQRコードは院生または外部生用です。役員に問い合わせてください。");
            }
        } else if (grade > 4) {
            if (price == 2500) {
                db.prepare("UPDATE Member_Information SET last_payment_date = ? WHERE discord_id = ?").run(new Date(), discordid);
                db.prepare("UPDATE QRCode SET discord_id = ? WHERE qr_code = ?").run(discordid, qrdata);
                await message.reply("2500円の支払いが完了しました。");
            } else if (price == 5000) {
                await message.reply("このQRコードは学部生用です。役員に問い合わせてください。");
            }
        }
    }
}