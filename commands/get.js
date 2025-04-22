//このファイルは、/registerコマンドを処理します。
const { SlashCommandBuilder } = require('@discordjs/builders');//SlashCommandBuilderを読み込む
const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');
const {getData} = require('../sqlite.js'); //sqlite.jsから関数を読み込む

module.exports = {
    data: new SlashCommandBuilder()
        .setName('get') //コマンド名を設定
        .setDescription('ユーザーの情報を取得します') //コマンドの説明を設定
        .addStringOption(option => option.setName('id').setDescription('取得したいユーザーidを指定。')),
    async execute(interaction) {
        const discord_id = interaction.options.getString('id'); //引数からdiscordのidを取得
        const data = await getData(discord_id); //sqliteからデータを取得
        //console.log(data);
        console.log(data[0]);
        if (data.length == 0) {
            await interaction.reply({ content: 'データが見つかりませんでした', ephemeral: true });
            return;
        }
        await interaction.reply({
            embeds: [{
                title: "登録内容",
                fields: [
                    {
                        name: "discordの名前",
                        value: data[0].discord_name
                    },
                    {
                        name: "名前",
                        value: data[0].name
                    },
                    {
                        name: "ふりがな",
                        value: data[0].furigana
                    },
                    {
                        name: "学籍番号",
                        value: data[0].student_number
                    },
                    {
                        name: "メールアドレス",
                        value: data[0].mail_address
                    },
                    {
                        name: "学年",
                        value: data[0].grade
                    },
                    {
                        name: "学類",
                        value: data[0].academic_department
                    },
                    {
                        name: "班",
                        value: data[0].team
                    }
                ]
            }]
        });
    }
}