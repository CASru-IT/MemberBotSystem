import { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } from 'discord.js';

async function showModal(interaction) {
    //入力された情報を格納するリスト
    var list = [];
    //モーダルを作成
    const modal = new ModalBuilder()
        .setCustomId('modalTest')
        .setTitle('会員情報の入力ページ');

    const text1 = new TextInputBuilder()//１つ目のテキストボックス
        .setCustomId('Input1')
        .setLabel("氏名")
        .setStyle(TextInputStyle.Short);

    const text2 = new TextInputBuilder()//２つ目のテキストボックス
        .setCustomId('Input2')
        .setLabel("氏名")
        .setStyle(TextInputStyle.Short);

    const text3 = new TextInputBuilder()//３つ目のテキストボックス
        .setCustomId('Input3')
        .setLabel("氏名")
        .setStyle(TextInputStyle.Short);

    const text4 = new TextInputBuilder()//４つ目のテキストボックス
        .setCustomId('Input4')
        .setLabel("氏名")
        .setStyle(TextInputStyle.Short);

    //各テキストボックスをモーダルという画面に追加
    const firstActionRow = new ActionRowBuilder().addComponents(text1);
    const secondActionRow = new ActionRowBuilder().addComponents(text2);
    const thirdActionRow = new ActionRowBuilder().addComponents(text3);
    const fourthActionRow = new ActionRowBuilder().addComponents(text4);
    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);

    //モーダルを表示
    await interaction.showModal(modal);

    try {//モーダルが入力されるまで待機
        const submitted = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'modalTest' && i.user.id === interaction.user.id,
            time: 60000
        });

        //入力された情報を取得
        const data1 = submitted.fields.getTextInputValue('Input1');
        const data2 = submitted.fields.getTextInputValue('Input2');
        const data3 = submitted.fields.getTextInputValue('Input3');
        const data4 = submitted.fields.getTextInputValue('Input4');
        list.push(data1);//リストに追加
        list.push(data2);
        list.push(data3);
        list.push(data4);

        //入力された情報を表示
        await submitted.reply(`あなたの入力した情報:\n氏名1: ${data1}\n氏名2: ${data2}\n氏名3: ${data3}\n氏名4: ${data4}`);
    } catch (error) {//エラーが発生した場合
        console.error(error);
        await interaction.followUp('時間切れです。追加情報が提供されませんでした。');
    }
    return list;//リストを返す
}

export { showModal };