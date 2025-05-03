require('dotenv').config(); // .envファイルを読み込む
const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');

// JSONファイルのパス
const allowedUsersPath = './allowedUsers.json';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('管理者用コマンド。ユーザーを許可リストに追加します。')
        .addStringOption(option =>
            option.setName('password')
                .setDescription('管理者パスワードを入力してください')
                .setRequired(true)
        )
        ,
    async execute(interaction) {
        try {
            // 引数を取得
            const password = interaction.options.getString('password');
            const discordId = interaction.user.id; // 実行者のDiscord IDを取得
            // パスワードを検証
            if (password !== process.env.PASSWORD) {
                await interaction.reply({ content: 'パスワードが間違っています。', ephemeral: true });
                return;
            }

            // allowedUsers.jsonを読み込む
            const allowedUsersData = JSON.parse(fs.readFileSync(allowedUsersPath, 'utf8'));

            // Discord IDがすでにリストに存在するか確認
            if (allowedUsersData.allowed_users.includes(discordId)) {
                await interaction.reply({ content: 'あなたはすでに許可リストに追加されています。', ephemeral: true });
                return;
            }

            // Discord IDをリストに追加
            allowedUsersData.allowed_users.push(discordId);

            // JSONファイルを更新
            fs.writeFileSync(allowedUsersPath, JSON.stringify(allowedUsersData, null, 4), 'utf8');

            // 成功メッセージを返信
            await interaction.reply({ content: `あなたを許可リストに追加しました。`, ephemeral: true });
        } catch (error) {
            console.error('エラーが発生しました:', error);
            await interaction.reply({ content: 'エラーが発生しました。管理者に連絡してください。', ephemeral: true });
        }
    }
};