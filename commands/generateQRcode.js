require('dotenv').config(); // dotenvを読み込む
const { SlashCommandBuilder } = require('@discordjs/builders');
const { generateRandomString, insertQRCode, generateAllQRCodes } = require('../sqlite.js'); // sqlite.jsからランダム文字列生成関数を読み込む
const { isUserAllowed } = require('../allowedUsers.js'); // allowedUsers.jsをインポート

const Number = 30; // QRコードの文字数

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qrcode')
        .setDescription('指定した個数のQRコードを生成します。')
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('生成するQRコードの個数')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("yen")
                .setDescription("5000円か2500円を選択してください")
                .addChoices(
                    { name: "5000円", value: "5000" },
                    { name: "2500円", value: "2500" }
                )
                .setRequired(true)
            ),
    async execute(interaction) {
        try {
            // 実行者のユーザー名をチェック
            if (!isUserAllowed(interaction.user.username)) {
                await interaction.reply({ content: 'このコマンドを実行する権限がありません。', ephemeral: true });
                return;
            }
            // 引数から生成する個数を取得
            const count = interaction.options.getInteger('count');
            if (count <= 0) {
                await interaction.reply({ content: '生成する個数は1以上で指定してください。', ephemeral: true });
                return;
            }
            const yen = interaction.options.getString("yen");
            const qrCodes = [];
            for (let i = 0; i < count; i++) {
                // ランダムな文字列を生成
                const randomString = generateRandomString(Number); // sqlite.jsの関数を使用
                console.log("生成されたQRコード:", randomString); // デバッグ用

                // QRコードをデータベースに保存
                await insertQRCode("none", randomString, yen);
                qrCodes.push(randomString);
            }

            // すべてのQRコードをPNG形式で生成
            const generatedFiles = await generateAllQRCodes();

            // 結果を返信
            await interaction.reply({
                content: `生成されたQRコード:\n${qrCodes.join('\n')}\nPNGファイルが生成されました (${generatedFiles.length} 件)。`,
                ephemeral: true // 他の人に見えないようにする
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'エラーが発生しました。', ephemeral: true });
        }
    }
};
