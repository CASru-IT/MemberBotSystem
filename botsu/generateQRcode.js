import QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import fs from 'fs';

// ランダムな文字列を生成
function generateRandomString(length) {
    return randomBytes(length).toString('hex');
}

// QRコードを生成して画像として保存
async function generateQrCode() {
    const randomString = generateRandomString(16); // 16バイトのランダム文字列
    console.log(`Generated String: ${randomString}`);

    const outputPath = './qrcode.png';

    try {
        await QRCode.toFile(outputPath, randomString, {
            type: 'png',
            width: 300,
            errorCorrectionLevel: 'H',
        });
        console.log(`QRコードが生成されました: ${outputPath}`);
    } catch (err) {
        console.error('QRコードの生成中にエラーが発生しました:', err);
    }
}

generateQrCode();