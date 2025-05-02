require('dotenv').config(); // dotenvを読み込む
const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { getData } = require('../sqlite.js'); // sqlite.jsからデータ取得関数を読み込む
const { isUserAllowed } = require('../allowedUsers.js'); // allowedUsers.jsをインポート

module.exports = {
    data: new SlashCommandBuilder()
        .setName('csv')
        .setDescription('データベースの内容をCSVファイルとして出力します'),
    async execute(interaction) {
        try {
            // 実行者のユーザー名をチェック
            if (!isUserAllowed(interaction.user.username)) {
                await interaction.reply({ content: 'このコマンドを実行する権限がありません。', ephemeral: true });
                return;
            }

            // データベースからデータを取得
            const data = await getData();

            if (data.length === 0) {
                await interaction.reply({ content: 'データがありません。', ephemeral: true });
                return;
            }

            // CSVヘッダーを作成
            const headers = ['discord_id', 'discord_name', 'name', 'furigana', 'student_number', 'grade', 'academic_department', 'mail_address', 'team', 'last_payment_date'];
            const rows = data.map(row => [
                row.discord_id,
                row.discord_name,
                row.name,
                row.furigana,
                row.student_number,
                row.grade,
                row.academic_department,
                row.mail_address,
                row.team,
                row.last_payment_date
            ]);

            // CSV形式に変換
            const csvContent = [
                headers.join(','), // ヘッダー行
                ...rows.map(row =>
                    row.map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',') // 値を文字列化し、ダブルクォートをエスケープ
                )
            ].join('\n');

            // CSVファイルに書き出し（BOM付きUTF-8）
            const filePath = './output.csv';
            const bom = '\uFEFF'; // BOMを追加
            fs.writeFileSync(filePath, bom + csvContent, 'utf8');

            // ファイルをDiscordに送信
            await interaction.reply({
                content: 'データベースの内容をCSVファイルとして出力しました。',
                files: [filePath]
            });

            // ファイルを削除（必要に応じて）
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error('エラーが発生しました:', error);
            await interaction.reply({ content: 'エラーが発生しました。', ephemeral: true });
        }
    }
};