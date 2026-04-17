const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageFlags } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('newpay')
        .setDescription('DMで受信した画像のQRコードを外部デコーダーで読み取ります。'),
    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            if (!interaction.channel || !interaction.channel.isDMBased()) {
                await interaction.editReply({
                    content: 'このコマンドはDMでのみ使用可能です。',
                });
                return;
            }

            await interaction.editReply({
                content: '画像を1枚送信してください。受信後に再送し、QR読取結果を返します。60秒待機します。',
            });

            const collector = interaction.channel.createMessageCollector({
                filter: (message) => !message.author.bot && message.author.id === interaction.user.id,
                time: 60000,
                max: 1,
            });

            collector.on('collect', async (message) => {
                // let tempFilePath;
                try {
                    const attachment = message.attachments.find((a) =>
                        a.contentType?.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(a.name || '')
                    );

                    if (!attachment) {
                        await interaction.followUp({
                            content: '画像が見つかりませんでした。画像ファイルを添付して送信してください。',
                            flags: MessageFlags.Ephemeral,
                        });
                        return;
                    }

                    await interaction.followUp({
                        content: '受信した画像を再送します。',
                        files: [attachment.url],
                        flags: MessageFlags.Ephemeral,
                    });

                    const decodeResult = await decodeQrWithExternalDecoder(attachment);

                    if (!decodeResult.ok) {
                        await interaction.followUp({
                            content: decodeResult.message,
                            flags: MessageFlags.Ephemeral,
                        });
                        return;
                    }

                    await interaction.followUp({
                        content: `読み取り結果: ${decodeResult.data}`,
                        flags: MessageFlags.Ephemeral,
                    });
                } catch (error) {
                    console.error('画像処理中にエラーが発生しました:', error);
                    await interaction.followUp({
                        content: '画像処理中にエラーが発生しました。もう一度お試しください。',
                        flags: MessageFlags.Ephemeral,
                    });
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'limit') {
                    return;
                }

                if (collected.size === 0) {
                    await interaction.followUp({
                        content: '画像が受信できなかったため、処理を終了しました。もう一度 /newpay を実行してください。',
                        flags: MessageFlags.Ephemeral,
                    });
                }
            });
        } catch (error) {
            console.error('newpay実行中にエラーが発生しました:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'エラーが発生しました。もう一度お試しください。',
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.followUp({
                    content: 'エラーが発生しました。もう一度お試しください。',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    },
};

async function decodeQrWithExternalDecoder(attachment) {
    const imageUrl = attachment.proxyURL || attachment.url;
    if (!imageUrl) {
        return {
            ok: false,
            message: '画像URLを取得できませんでした。',
        };
    }

    let tempFilePath;
    try {
        tempFilePath = await saveAttachmentToTemp(imageUrl, attachment.name);
        const { stdout } = await execFileAsync('zbarimg', ['--quiet', '--raw', tempFilePath], {
            windowsHide: true,
            timeout: 5000,
        });

        const decodedText = stdout
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find((line) => line.length > 0);

        if (!decodedText) {
            return {
                ok: false,
                message: 'QRコードを読み取れませんでした。',
            };
        }

        return {
            ok: true,
            data: decodedText,
        };
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {
                ok: false,
                message: 'zbarimg が見つかりません。zbar をインストールしてください。',
            };
        }

        if (typeof error.message === 'string' && error.message.includes('timed out')) {
            return {
                ok: false,
                message: 'QR読み取りがタイムアウトしました。別の画像でお試しください。',
            };
        }

        return {
            ok: false,
            message: 'QRコード解析中にエラーが発生しました。',
        };
    } finally {
        if (tempFilePath) {
            await safeDeleteTempFile(tempFilePath);
        }
    }
}

async function saveAttachmentToTemp(imageUrl, fileName) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`画像の取得に失敗しました: ${response.status}`);
    }

    const extension = path.extname(fileName || '').toLowerCase() || '.jpg';
    const tempFilePath = path.join(os.tmpdir(), `newpay-${randomUUID()}${extension}`);
    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(tempFilePath, Buffer.from(arrayBuffer));
    return tempFilePath;
}

async function safeDeleteTempFile(filePath) {
    try {
        await fs.unlink(filePath);
    } catch (_) {
        // 一時ファイル削除失敗は致命的ではない
    }
}
