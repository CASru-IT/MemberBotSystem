const { SlashCommandBuilder } = require('@discordjs/builders');
const Database = require('better-sqlite3');
const { isUserAllowed } = require('../allowedUsers.js'); // allowedUsers.jsをインポート

// データベース接続
const db = new Database('./casru.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deleteinfo')
        .setDescription('指定したdiscord_idの情報を削除します。')
        .addStringOption(option =>
            option.setName('discordid')
                .setDescription('削除するユーザーのdiscord_idを指定してください')
                .setRequired(true)
        ),
    async execute(interaction) {
        // 実行者のユーザー名をチェック
        if (!isUserAllowed(interaction.user.id)) {
            await interaction.reply({ content: 'このコマンドを実行する権限がありません。', ephemeral: true });
            return;
        }
        try {
            // 入力されたdiscord_idを取得
            const discordId = interaction.options.getString('discordid');

            // データベースから該当する情報を削除
            const query = `DELETE FROM Member_Information WHERE discord_id = ?`;
            const stmt = db.prepare(query);
            const result = stmt.run(discordId);

            if (result.changes > 0) {
                // 削除成功
                await interaction.reply({ content: `discord_id: ${discordId} の情報を削除しました。`, ephemeral: true });
            } else {
                // 該当するデータが見つからない場合
                await interaction.reply({ content: `discord_id: ${discordId} の情報は見つかりませんでした。`, ephemeral: true });
            }
        } catch (error) {
            console.error('情報削除中にエラーが発生しました:', error);
            await interaction.reply({ content: '情報削除中にエラーが発生しました。', ephemeral: true });
        }
    },
};