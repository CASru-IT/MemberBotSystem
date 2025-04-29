//このファイルは、/registerコマンドを処理します。
const { SlashCommandBuilder } = require('@discordjs/builders'); // SlashCommandBuilderを読み込む
const { getDataBydiscord_id } = require('../sqlite.js'); // sqlite.jsから関数を読み込む

module.exports = {
    data: new SlashCommandBuilder()
        .setName('get') // コマンド名を設定
        .setDescription('自分の情報を取得します'), // コマンドの説明を設定
    async execute(interaction) {
        // コマンド実行者のDiscord IDを取得
        const discord_id = interaction.user.id;

        // データベースからデータを取得
        const data = await getDataBydiscord_id(discord_id); // sqliteからデータを取得
        console.log("取得したデータ:", data); // デバッグ用

        // データが存在しない場合の処理
        if (!data || data.length === 0) {
            await interaction.reply({ content: 'データが見つかりませんでした', ephemeral: true });
            return;
        }

        // データを埋め込んで返信
        await interaction.reply({
            embeds: [{
                title: "登録内容",
                fields: [
                    {
                        name: "discordの名前",
                        value: data.discord_name || "未設定"
                    },
                    {
                        name: "名前",
                        value: data.name || "未設定"
                    },
                    {
                        name: "ふりがな",
                        value: data.furigana || "未設定"
                    },
                    {
                        name: "学籍番号",
                        value: data.student_number || "未設定"
                    },
                    {
                        name: "メールアドレス",
                        value: data.mail_address || "未設定"
                    },
                    {
                        name: "学年",
                        value: data.grade || "未設定"
                    },
                    {
                        name: "学類",
                        value: data.academic_department || "未設定"
                    },
                    {
                        name: "班",
                        value: data.team || "未設定"
                    }
                ]
            }],
            ephemeral: true // 他の人に見えないようにする
        });
    }
};