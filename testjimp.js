const Jimp = require('@jimp/core');
require('@jimp/plugins').default(Jimp);
require('@jimp/types').default(Jimp);

async function testJimp() {
    try {
        const image = await Jimp.read('https://via.placeholder.com/150'); // テスト用の画像URL
        console.log('画像が正常に読み込まれました:', image.bitmap);
    } catch (error) {
        console.error('Jimpの読み込み中にエラーが発生しました:', error);
    }
}

testJimp();