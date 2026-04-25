require('dotenv').config();
const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { isUserAllowed } = require('../allowedUsers.js');

const allowedUsersPath = 'data/allowedUsers.json';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset_allowedusers')
    .setDescription('管理者用コマンド。管理者リストと許可リストをリセットします。'),
  async execute(interaction) {
    try {
      // 管理者のみ
      if (!isUserAllowed(interaction.user.id, true)) {
        await interaction.reply({
          content: 'このコマンドは管理者のみ実行できます。',
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('確認')
        .setDescription('本当に allowed_users と admin_users をリセットしますか？')
        .setColor(0xff9900);

      const yesBtn = new ButtonBuilder()
        .setCustomId('reset_allowedusers_yes')
        .setLabel('はい')
        .setStyle(ButtonStyle.Danger);

      const noBtn = new ButtonBuilder()
        .setCustomId('reset_allowedusers_no')
        .setLabel('いいえ')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(yesBtn, noBtn);

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });

      const msg = await interaction.fetchReply();

      const buttonInteraction = await msg.awaitMessageComponent({
        filter: i =>
          i.user.id === interaction.user.id &&
          (i.customId === 'reset_allowedusers_yes' ||
            i.customId === 'reset_allowedusers_no'),
        time: 30000,
      });

      if (buttonInteraction.customId === 'reset_allowedusers_no') {
        await buttonInteraction.update({
          content: 'リセットをキャンセルしました。',
          embeds: [],
          components: [],
        });
        return;
      }

      // yes の場合のみリセット
      const resetData = { allowed_users: [], admin_users: [] };
      fs.writeFileSync(allowedUsersPath, JSON.stringify(resetData, null, 4), 'utf8');

      await buttonInteraction.update({
        content: 'allowed_users と admin_users をリセットしました。',
        embeds: [],
        components: [],
      });
    } catch (error) {
      console.error('reset_allowedusers 実行中にエラー:', error);

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: '処理中にエラーが発生しました。',
          embeds: [],
          components: [],
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: '処理中にエラーが発生しました。',
          ephemeral: true,
        });
      }
    }
  },
};