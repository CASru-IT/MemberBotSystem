const fetch = require('node-fetch');
const { createCanvas, loadImage } = require('canvas');
const jsQR = require('jsqr');
const fs = require('fs');
const JimpLib = require('jimp');
const Jimp = JimpLib.Jimp;
const { arrayBuffer } = require('stream/consumers');
const { exec } = require('child_process');

const read = async (file) => {
    const image = await Jimp.read(Buffer.from(arrayBuffer));
    return image;
    }

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

async function onQR(filePath) {
    try {
        let res;
        const temp = './temp-image.png'; // 一時ファイルのパス

        console.log('ファイルパス:', filePath);

        // ローカルファイルから画像を読み込む
        const image = await Jimp.read(filePath);
        console.log('画像の幅:', image.bitmap.width);
        console.log('画像の高さ:', image.bitmap.height);

        if (image.bitmap.height > 1024) {
            // 高さが2048を超える場合はリサイズ
            image.resize({w: Jimp.AUTO, h: 1024});
            console.log('画像をリサイズしました。');
        }
        await image.write(temp);

        // QRコードをデコード
        const imageData = new Uint8ClampedArray(image.bitmap.data); // データをUint8ClampedArrayに変換
        res = jsQR(imageData, image.bitmap.width, image.bitmap.height);
        console.log('QRコードのデコード結果:', res);

        if (!res) {
            // 画像を拡大して再試行
            const newImage = new Jimp({ width: Math.round(image.bitmap.width * 1.2),
                 height: Math.round(image.bitmap.height * 1.2),color: 0xFFFFFFFF });
            newImage.blit(image, 0, 0);
            await newImage.write(temp);

            const newImageData = new Uint8ClampedArray(newImage.bitmap.data);
            res = jsQR(newImageData, newImage.bitmap.width, newImage.bitmap.height);
        }

        // 一時ファイルを削除
        fs.unlink(temp, (e) => undefined);

        if (!res) {
            console.log('❌ QRコードを読み取れませんでした。別の画像で試してください。');
            return;
        }

        console.log(`🔗 QRコードから以下の文字列を読み取りました:\n${res.data}`);
    } catch (error) {
        console.log('❌ QRコードを読み取れませんでした。ファイル形式がGIF、PNG、JPEG、BMPであることを確認してください。');
        console.error('エラー:', error);
    }
}

// ローカルファイルパスを指定して実行
onQR('G:\\github.documents\\MemberBotSystem\\debug-output.png');