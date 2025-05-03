const fetch = require('node-fetch');
const { createCanvas, loadImage } = require('canvas');
const jsQR = require('jsqr');

async function testJsQR() {
    try {
        // テスト用の画像パス
        const imagePath = 'G:\\github.documents\\MemberBotSystem\\debug-output.png';

        // 画像を読み込む
        const image = await loadImage(imagePath);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);

        // QRコードを解析
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCodeData = jsQR(imageData.data, canvas.width, canvas.height);

        if (qrCodeData) {
            console.log('QRコードの内容:', qrCodeData.data);
        } else {
            console.log('QRコードが検出されませんでした。');
        }
    } catch (error) {
        console.error('jsQRの処理中にエラーが発生しました:', error);
    }
}

testJsQR();