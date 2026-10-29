require('dotenv').config();
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageFlags } = require('discord.js');
const fs = require('node:fs');
const { generateRandomString, insertQRCode, generateQRCodes } = require('../sqlite.js');
const { isUserAllowed } = require('../allowedUsers.js');
const MAX_COUNT = 100;
let generating = false;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qrcode')
        .setDescription('指定した個数のQRコードを生成します。')
        .addIntegerOption(option => option.setName('count')
            .setDescription('生成するQRコードの個数（1〜100）')
            .setMinValue(1).setMaxValue(MAX_COUNT).setRequired(true))
        .addStringOption(option => option.setName('yen')
            .setDescription('5000円か2500円を選択してください')
            .addChoices({ name: '5000円', value: '5000' }, { name: '2500円', value: '2500' })
            .setRequired(true)),
    async execute(interaction) {
        if (!isUserAllowed(interaction.user.id, true)) {
            await interaction.reply({ content: 'このコマンドを実行する権限がありません。', flags: MessageFlags.Ephemeral });
            return;
        }
        const count = interaction.options.getInteger('count');
        const price = Number(interaction.options.getString('yen'));
        if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT || ![2500, 5000].includes(price)) {
            await interaction.reply({ content: '生成数は1〜100、金額は2500円または5000円を指定してください。', flags: MessageFlags.Ephemeral });
            return;
        }
        if (generating) {
            await interaction.reply({ content: '別のQRコードを生成・送信中です。完了後にもう一度実行してください。', flags: MessageFlags.Ephemeral });
            return;
        }
        generating = true;
        const rows = [];
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            for (let i = 0; i < count; i++) {
                const qr_code = generateRandomString(30);
                const id = insertQRCode('none', qr_code, price);
                rows.push({ id, qr_code, price });
            }
            const images = await generateQRCodes(rows);
            const list = Buffer.from(rows.map(row => row.qr_code).join('\n'), 'utf8');
            const limit = interaction.attachmentSizeLimit || 8 * 1024 * 1024;
            const batches = [];
            let files = [{ attachment: list, name: `qrcodes-${rows[0].id}-${rows.at(-1).id}.txt` }];
            let bytes = list.length;
            if (bytes > limit) throw new Error('QR list exceeds attachment size limit');
            for (const image of images) {
                const size = fs.statSync(image).size;
                if (size > limit) throw new Error('QR image exceeds attachment size limit');
                if (files.length === 10 || bytes + size > limit) {
                    batches.push(files);
                    files = [];
                    bytes = 0;
                }
                files.push(image);
                bytes += size;
            }
            if (files.length) batches.push(files);
            for (let i = 0; i < batches.length; i++) {
                const payload = {
                    content: `QRコード${rows.length}件（No. ${rows[0].id}〜${rows.at(-1).id}）のPNG画像と一覧です。添付 ${i + 1}/${batches.length}`,
                    files: batches[i],
                };
                if (i === 0) await interaction.editReply(payload);
                else await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            console.error('QRコードの生成・送信に失敗:', error);
            const recovery = rows.length
                ? ` No. ${rows[0].id}〜${rows.at(-1).id}は登録済みです。重複発行を避けるため再実行せず、管理者に画像の再取得を依頼してください。`
                : ' もう一度お試しください。';
            const payload = { content: `QRコードの生成または画像送信に失敗しました。${recovery}` };
            try {
                if (interaction.deferred || interaction.replied) await interaction.editReply(payload);
                else await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
            } catch (replyError) {
                console.error('QRコードのエラー通知に失敗:', replyError);
            }
        } finally {
            generating = false;
        }
    },
};
