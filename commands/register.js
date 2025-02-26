//このファイルは、/registerコマンドを処理します。
const { SlashCommandBuilder } = require('@discordjs/builders');//SlashCommandBuilderを読み込む
const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');
//各ファイルから関数を読み込む
const { showModal } = require('./register/form');
const {grade} = require('./register/grade');
var list0=[];//ここに名前とふりがなと学籍番号とメールアドレスが入る
number_grade=null;//ここに学年が入る

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')//コマンド名を設定
        .setDescription('ユーザーの情報を登録します'),//コマンドの説明を設定
    async execute(interaction) {
        list0=await showModal(interaction);
        if(list0.length==0) return;
        number_grade=await grade(interaction);
    },
};