//このファイルは、/registerコマンドを処理します。
const { SlashCommandBuilder } = require('@discordjs/builders');//SlashCommandBuilderを読み込む
const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');
//各ファイルから関数を読み込む
const { showModal } = require('./register/form');
const { grade } = require('./register/grade');
const { academic_department } = require('./register/academic_department');
const { team } = require('./register/team');
var list0 = []; //ここに名前とふりがなと学籍番号とメールアドレスが入る
var number_grade = null; //ここに学年が入る
var department = ""; //ここに学類が入る
var _team = []; //ここに班が入る
var discord_name = ""; //ここにdiscordのidが入る
var discord_id = ""; //ここにdiscordの名前が入る
const {insertData} = require('../sqlite.js'); //sqlite.jsから関数を読み込む

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register') //コマンド名を設定
        .setDescription('ユーザーの情報を登録します'), //コマンドの説明を設定
    async execute(interaction) {
        discord_name = interaction.user.tag; //discordの名前を取得
        discord_id = interaction.user.id; //discordのidを取得
        list0 = await showModal(interaction);
        if (list0.length == 0) return;
        number_grade = await grade(interaction);
        if (number_grade == null) return;
        department = await academic_department(interaction);
        if (department == null) return;
        _team = await team(interaction);
        if (_team.length == 0) return;
        await interaction.followUp({
            embeds: [{
                title: "登録内容",
                fields: [
                    {
                        name: "discordの名前",
                        value: discord_name
                    },
                    {
                        name: "名前",
                        value: list0[0]
                    },
                    {
                        name: "ふりがな",
                        value: list0[1]
                    },
                    {
                        name: "学籍番号",
                        value: list0[2]
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
        insertData(discord_id, discord_name, list0[0], list0[1], list0[2], number_grade, department, list0[3], _team.join(","), "none");
    },
};