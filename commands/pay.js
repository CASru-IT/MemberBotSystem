const { SlashCommandBuilder } = require('@discordjs/builders');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { updatePaymentByQRCode } = require('../sqlite');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('QRコードを読み取り、会費の支払いを完了します。'),
    async execute(interaction) {
        try {
// チャンネルがDMであるかを確認
            if (!interaction.channel.isDMBased()) {
                await interaction.reply({ content: 'このコマンドはDMでのみ使用可能です。', ephemeral: true });
                return;
            }
            // モーダルを作成
            const modal = new ModalBuilder()
                .setCustomId('modalTest')
                .setTitle('会費支払用のページ');

            const text1 = new TextInputBuilder()
                .setCustomId('Input1')
                .setLabel("QRコードの内容を入力してください")
                .setStyle(TextInputStyle.Short);

            const firstActionRow = new ActionRowBuilder().addComponents(text1);
            modal.addComponents(firstActionRow);

            // モーダルを表示
            await interaction.showModal(modal);

            // モーダルが入力されるまで待機
            const submitted = await interaction.awaitModalSubmit({
                filter: i => i.customId === 'modalTest' && i.user.id === interaction.user.id,
                time: 60000, // タイムアウト時間（ミリ秒）
            });

            // 入力された情報を取得
            const qrCodeData = submitted.fields.getTextInputValue('Input1');
            console.log('QRコードの内容:', qrCodeData);
            const paymentResult = updatePaymentByQRCode(interaction.user.id, qrCodeData);
            await submitted.reply({ content: paymentResult.message, ephemeral: true });
        } catch (error) {
            console.error('モーダルの待機中にエラーが発生しました:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: 'モーダルの待機中にエラーが発生しました。', ephemeral: true });
            }
        }
    },
};
