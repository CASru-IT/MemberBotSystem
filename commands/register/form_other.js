const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, Collection } = require('discord.js');

async function askCollegeName(interaction) {
    // ユーザーにDMで質問を送る
    //await interaction.followUp({ content: '大学名を入力してください。', ephemeral: true });

    // ユーザーの返信を待つ
    try {
        const filter = m => m.author.id === interaction.user.id;
        const dmChannel = await interaction.user.createDM();
        await dmChannel.send('大学名を入力してください。');

        const collected = await dmChannel.awaitMessages({
            filter,
            max: 1,
            time: 60000,
            errors: ['time']
        });

        const college_name = collected.first().content;
        return college_name;
    } catch (error) {
        console.error(error);
        return null;
    }
}

module.exports = {askCollegeName };