//このファイルは、/registerコマンドを処理します。
const { SlashCommandBuilder } = require('@discordjs/builders'); // SlashCommandBuilderを読み込む
const { MessageFlags } = require('discord.js');
const { getDataBydiscord_id } = require('../sqlite.js'); // sqlite.jsから関数を読み込む
const { isUserAllowed } = require('../allowedUsers.js'); // allowedUsers.jsをインポート

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce_register') // コマンド名を設定
        .setDescription('まだ登録していない人に登録を催促します'), // コマンドの説明を設定
    async execute(interaction) {
        if (!isUserAllowed(interaction.user.id, true)) {
        await interaction.reply({
          content: 'このコマンドは管理者のみ実行できます。',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

        // 長時間処理の前に応答を確保して Unknown interaction を防ぐ
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const namelist = [];
        const members = await interaction.guild.members.fetch();

    await Promise.allSettled(
      members.map(async (member) => {
        if (member.user.bot) return;

        const data = getDataBydiscord_id(member.user.id); // 同期戻り値
        if (!data) {
          try {
            await member.send('登録がまだのようです。/register コマンドを使用して登録を完了してください。');
            namelist.push(member.user.tag);
          } catch (_) {
            //failedIds.push(member.user.id); // DM拒否など
          }
        }
      })
    );
        await interaction.editReply({
            content: `登録を催促したユーザーの名前: ${namelist.join(', ')}`
        })
    }
};