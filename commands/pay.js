const { SlashCommandBuilder } = require('@discordjs/builders');
const Database = require('better-sqlite3');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

// データベース接続
const db = new Database('./casru.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('QRコードを読み取り、会費の支払いを完了します。'),
    async execute(interaction) {
        try {
// チャンネルがDMであるかを確認
            //if (!interaction.channel.isDMBased()) {
            //    await interaction.reply({ content: 'このコマンドはDMでのみ使用可能です。', ephemeral: true });
            //    return;
            //}
            // モーダルを作成
            const modal = new ModalBuilder()
                .setCustomId('modalTest')
                .setTitle('会費支払用のページ');

            const text1 = new TextInputBuilder()
                .setCustomId('Input1')
                .setLabel("QRコードの内容を入力してください")
                .setStyle(TextInputStyle.Short);

            const firstActionRow = new ActionRowBuilder().addComponents(text1);
            modal.addComponents(firstActionRow);

            // モーダルを表示
            await interaction.showModal(modal);

            // モーダルが入力されるまで待機
            const submitted = await interaction.awaitModalSubmit({
                filter: i => i.customId === 'modalTest' && i.user.id === interaction.user.id,
                time: 60000, // タイムアウト時間（ミリ秒）
            });

            // 入力された情報を取得
            const qrCodeData = submitted.fields.getTextInputValue('Input1');
            const row = db.prepare('SELECT * FROM QRCode WHERE qr_code = ?').get(qrCodeData);
            console.log('QRコードの内容:', qrCodeData);
            console.log('データベースの内容:', row);

            if (row) {
                const discordid = row.discord_id;

                if (discordid === "none") {
                    console.log("QRコードは未使用です。支払いを処理します。");
                    await submitted.reply({ content: "QRコードは未使用です。支払いを処理します。", ephemeral: true });
                    console.log("pay関数を呼び出します"); // デバッグ用ログ
                    await pay(interaction, db, interaction.user.id, qrCodeData, row.price);
                } else {
                    console.log("このQRコードはすでに使用されています。");
                    await submitted.reply({ content: "このQRコードはすでに使用されています。", ephemeral: true });
                }
            } else {
                await submitted.reply({ content: 'QRコードがデータベースに存在しません。', ephemeral: true });
            }
        } catch (error) {
            console.error('モーダルの待機中にエラーが発生しました:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: 'モーダルの待機中にエラーが発生しました。', ephemeral: true });
            }
        }
    },
};

async function pay(interaction, db, discordid, qrdata, price) {
    console.log("pay関数が呼び出されました"); // デバッグ用ログ
    console.log("discordid:", discordid); // デバッグ用ログ

    const row = db.prepare("SELECT * FROM Member_Information WHERE discord_id = ?").get(discordid);
    console.log("Member_Informationの内容:", row); // デバッグ用ログ

    if (row) {
        const grade = row.grade;
        const currentDate = new Date().toISOString(); // ISO形式の文字列に変換

        if (grade <= 4) {
            if (price == 5000) {
                db.prepare("UPDATE Member_Information SET last_payment_date = ? WHERE discord_id = ?").run(currentDate, discordid);
                db.prepare("UPDATE QRCode SET discord_id = ? WHERE qr_code = ?").run(discordid, qrdata);
                await interaction.followUp({ content: "5000円の支払いが完了しました。", ephemeral: true });
            } else if (price == 2500) {
                await interaction.followUp({ content: "このQRコードは院生または外部生用です。役員に問い合わせてください。", ephemeral: true });
            }
        } else if (grade > 4) {
            if (price == 2500) {
                db.prepare("UPDATE Member_Information SET last_payment_date = ? WHERE discord_id = ?").run(currentDate, discordid);
                db.prepare("UPDATE QRCode SET discord_id = ? WHERE qr_code = ?").run(discordid, qrdata);
                await interaction.followUp({ content: "2500円の支払いが完了しました。", ephemeral: true });
            } else if (price == 5000) {
                await interaction.followUp({ content: "このQRコードは学部生用です。役員に問い合わせてください。", ephemeral: true });
            }
        }
    } else {
        console.log("Member_Informationに該当するデータが見つかりませんでした");
        await interaction.followUp({ content: "会員情報が見つかりませんでした。", ephemeral: true });
    }
}