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
const { DeleteAllQRCodes } = require('../sqlite.js'); // sqlite.jsからDeleteAllQRCodes関数をインポート

const allowedUsersPath = 'data/allowedUsers.json';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset_qrcode')
    .setDescription('管理者用コマンド。QRコードをリセットします。'),
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
        .setDescription('本当に QRコードをリセットしますか？')
        .setColor(0xff9900);

      const yesBtn = new ButtonBuilder()
        .setCustomId('reset_qrcode_yes')
        .setLabel('はい')
        .setStyle(ButtonStyle.Danger);

      const noBtn = new ButtonBuilder()
        .setCustomId('reset_qrcode_no')
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
          (i.customId === 'reset_qrcode_yes' ||
            i.customId === 'reset_qrcode_no'),
        time: 30000,
      });

      if (buttonInteraction.customId === 'reset_qrcode_no') {
        await buttonInteraction.update({
          content: 'リセットをキャンセルしました。',
          embeds: [],
          components: [],
        });
        return;
      }

      // QRコードのリセット処理をここに実装
      await DeleteAllQRCodes();
      await DeleteQRCodesImages();// 画像も削除

      await buttonInteraction.update({
        content: 'QRコードをリセットしました。',
        embeds: [],
        components: [],
      });
    } catch (error) {
      console.error('reset_qrcode 実行中にエラー:', error);

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

async function DeleteQRCodesImages() {
  const qrCodesDir = 'qrcodes';
  try {
    if (!fs.existsSync(qrCodesDir)) return;
    const files = await fs.promises.readdir(qrCodesDir);
    for (const file of files) {
      // .gitkeep は残す
      if (file === '.gitkeep') continue;
      const filePath = `${qrCodesDir}/${file}`;
      try {
        const stat = await fs.promises.stat(filePath);
        if (stat.isFile()) await fs.promises.unlink(filePath);
      } catch (e) {
        console.error('Failed to delete file:', filePath, e);
      }
    }
  } catch (err) {
    console.error('DeleteQRCodesImages error:', err);
  }
}
  