//このファイルは、/registerコマンドを処理します。
const { SlashCommandBuilder } = require('@discordjs/builders');//SlashCommandBuilderを読み込む
const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');
//各ファイルから関数を読み込む
const { showModal } = require('./register/form');
const { grade } = require('./register/grade');
const { academic_department } = require('./register/academic_department');
const { team } = require('./register/team');
 //ここに名前とふりがなと学籍番号とメールアドレスが入る
//ここに学年が入る

const {insertData} = require('../sqlite.js'); //sqlite.jsから関数を読み込む

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register') //コマンド名を設定
        .setDescription('ユーザーの情報を登録します'), //コマンドの説明を設定
    async execute(interaction) {
        if (!interaction.channel.isDMBased()) {
            await interaction.reply({ content: 'このコマンドはDMでのみ使用可能です。', ephemeral: true });
            return;
        }
        
        const list0 = await showModal(interaction);
        if (list0.length == 0) return;
        const number_grade = await grade(interaction);
        if (number_grade == null) return;
        const department = await academic_department(interaction);
        if (department == null) return;
        const _team = await team(interaction);
        if (_team.length == 0) return;

        await interaction.followUp({
            embeds: [{
                title: "登録内容",
                fields: [
                    {
                        name: "discordの名前",
                        value: interaction.user.tag
                    },
                    {
                        name: "名前",
                        value: list0[1]
                    },
                    {
                        name: "ふりがな",
                        value: list0[2]
                    },
                    {
                        name: "学籍番号",
                        value: list0[0]
                    },
                    {
                        name: "メールアドレス",
                        value: list0[3]
                    },
                    {
                        name: "学年",
                        value: number_grade
                    },
                    {
                        name: "学類",
                        value: department
                    },
                    {
                        name: "班",
                        value: _team.join(",")
                    }
                ]
            }]
        ,emphemeral: true});
        //データベースに登録する
        insertData(interaction.user.id, interaction.user.tag, list0[1], list0[2], list0[0], number_grade, department, list0[3], _team.join(","), "none");
    },
};