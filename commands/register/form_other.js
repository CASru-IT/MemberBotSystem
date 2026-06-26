const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, Collection } = require('discord.js');

async function askCollegeName(interaction) {
    // ユーザーにDMで質問を送る
    //await interaction.followUp({ content: '大学名を入力してください。', ephemeral: true });

    // ユーザーの返信を待つ
    // モーダルの作成と表示
    const modal = new ModalBuilder()
        .setCustomId('collegeForm')
        .setTitle('大学名の入力');

    const input = new TextInputBuilder()
        .setCustomId('collegeInput')
        .setLabel("あなたの大学名を入力してください")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const actionRow = new ActionRowBuilder().addComponents(input);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);

    // 送信の待機
    try {
        const submitted = await interaction.awaitModalSubmit({
            time: 60000,
            filter: i => i.customId === 'collegeForm'
        });
        
        const collegeName = submitted.fields.getTextInputValue('collegeInput');
        await submitted.reply({ content: `大学名「${collegeName}」が入力されました。`, ephemeral: true });
        return {
            college_name: collegeName,
            interaction: submitted // 👈 最新のインタラクションを親に引き継ぐ
        };
    } catch (err) {
        console.error('モーダル待機中にタイムアウトしました');
    }

}

module.exports = {askCollegeName };