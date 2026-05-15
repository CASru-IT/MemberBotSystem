const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageFlags } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { updatePaymentByQRCode } = require('../sqlite');

const execFileAsync = promisify(execFile);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('会費を支払います。DMで受信した画像のQRコードを外部デコーダーで読み取ります。'),
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

                    const paymentResult = updatePaymentByQRCode(interaction.user.id, decodeResult.data);
                    
                    if (!paymentResult) {
                        await interaction.followUp({
                            content: 'システムエラーが発生しました。もう一度お試しください。',
                            flags: MessageFlags.Ephemeral,
                        });
                        return;
                    }
                    
                    await interaction.followUp({
                        content: paymentResult.message,
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
        const { stdout } = await runZbarimg(tempFilePath);
        const decodedText = extractDecodedText(stdout);

        if (!decodedText) {
            return {
                ok: false,
                message: 'QRコードを読み取れませんでした。少しQRコードを遠ざけて、画面中央にQRコードが収まるようにして、明るい場所で再度写真を撮ってみてください。',
            };
        }

        return {
            ok: true,
            data: decodedText,
        };
    } catch (error) {
        if (error.code === 'ZBARIMG_WSL_DISTRO_NOT_FOUND') {
            return {
                ok: false,
                message: '指定したWSLディストリが見つかりません。環境変数 ZBARIMG_WSL_DISTRO を確認してください。',
            };
        }

        if (error.code === 'ZBARIMG_EXECUTABLE_NOT_FOUND') {
            return {
                ok: false,
                message: '指定した zbarimg 実行ファイルが見つかりません。環境変数 ZBARIMG_EXECUTABLE を確認してください。',
            };
        }

        if (error.code === 'ENOENT' || error.code === 'ZBARIMG_NOT_FOUND') {
            return {
                ok: false,
                message: 'zbarimg が見つかりません。PATHを通すか、環境変数 ZBARIMG_EXECUTABLE に実行ファイルの絶対パスを指定してください。',
            };
        }

        const stderrText = sanitizeWslStderr(normalizeErrorText(error.stderr));
        const stdoutText = normalizeErrorText(error.stdout);
        const mergedText = `${stderrText}\n${stdoutText}`.trim();
        const decodedText = extractDecodedText(stdoutText);

        if (decodedText) {
            return {
                ok: true,
                data: decodedText,
            };
        }

        if (
            error.code === 4 ||
            /No symbol|no symbol|scanned 0 symbols|not found a symbol/i.test(mergedText)
        ) {
            return {
                ok: false,
                message: 'QRコードを読み取れませんでした。少しQRコードを遠ざけて、画面中央にQRコードが収まるようにして、明るい場所で再度写真を撮ってみてください。',
            };
        }

        if (typeof error.message === 'string' && error.message.includes('timed out')) {
            return {
                ok: false,
                message: 'QR読み取りがタイムアウトしました。別の画像でお試しください。',
            };
        }

        const briefDetail = mergedText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find((line) => line.length > 0);

        return {
            ok: false,
            message: briefDetail
                ? `QRコード解析中にエラーが発生しました: ${briefDetail}`
                : 'QRコード解析中にエラーが発生しました。',
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

function normalizeErrorText(value) {
    if (typeof value === 'string') {
        return value;
    }
    if (Buffer.isBuffer(value)) {
        return value.toString('utf8');
    }
    return '';
}

async function runZbarimg(filePath) {
    const executable = (process.env.ZBARIMG_EXECUTABLE || '').trim();

    if (executable) {
        try {
            return await execFileAsync(executable, ['--quiet', '--raw', filePath], {
                windowsHide: true,
                timeout: 5000,
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                const wrapped = new Error('Configured zbarimg executable was not found.');
                wrapped.code = 'ZBARIMG_EXECUTABLE_NOT_FOUND';
                throw wrapped;
            }
            throw error;
        }
    }

    try {
        return await execFileAsync('zbarimg', ['--quiet', '--raw', filePath], {
            windowsHide: true,
            timeout: 5000,
        });
    } catch (error) {
        // Windowsでzbarimgが見つからない場合、WSL上のzbarimgを試す。
        if (process.platform === 'win32' && error.code === 'ENOENT') {
            return runZbarimgViaWsl(filePath);
        }
        throw error;
    }
}

async function runZbarimgViaWsl(windowsPath) {
    try {
        const linuxPath = convertWindowsPathToWslPath(windowsPath);
        if (!linuxPath) {
            const error = new Error('Failed to convert path for WSL.');
            error.code = 'ZBARIMG_NOT_FOUND';
            throw error;
        }

        const distroName = process.env.ZBARIMG_WSL_DISTRO || process.env.WSL_DISTRO_NAME;
        const wslArgs = distroName
            ? ['-d', distroName, 'sh', '-lc', `zbarimg --quiet --raw ${shellEscapeForSh(linuxPath)}`]
            : ['sh', '-lc', `zbarimg --quiet --raw ${shellEscapeForSh(linuxPath)}`];

        return await execFileAsync('wsl.exe', wslArgs, {
            windowsHide: true,
            timeout: 5000,
        });
    } catch (error) {
        const stderrText = sanitizeWslStderr(normalizeErrorText(error.stderr));
        if (/distribution.*not found|There is no distribution with the supplied name/i.test(stderrText)) {
            const wrapped = new Error('Configured WSL distribution was not found.');
            wrapped.code = 'ZBARIMG_WSL_DISTRO_NOT_FOUND';
            throw wrapped;
        }

        if (
            error.code === 'ENOENT' ||
            error.code === 127 ||
            /not found|command not found|No such file/i.test(stderrText)
        ) {
            const wrapped = new Error('zbarimg not found in both native env and WSL.');
            wrapped.code = 'ZBARIMG_NOT_FOUND';
            throw wrapped;
        }
        throw error;
    }
}

function sanitizeWslStderr(text) {
    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .filter((line) => !/^wsl:\s+Unknown key\s+'.+'\s+in\s+\/etc\/wsl\.conf:\d+$/i.test(line))
        .join('\n');
}

function extractDecodedText(text) {
    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0);
}

function convertWindowsPathToWslPath(windowsPath) {
    if (typeof windowsPath !== 'string' || windowsPath.length < 3) {
        return '';
    }

    const normalized = windowsPath.replace(/\\/g, '/');
    const driveMatch = normalized.match(/^([a-zA-Z]):\/(.*)$/);
    if (!driveMatch) {
        return normalized;
    }

    const driveLetter = driveMatch[1].toLowerCase();
    const rest = driveMatch[2];
    return `/mnt/${driveLetter}/${rest}`;
}

function shellEscapeForSh(value) {
    return `'${value.replace(/'/g, `'"'"'`)}'`;
}
