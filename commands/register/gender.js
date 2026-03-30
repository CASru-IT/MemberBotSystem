const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

async function gender(interaction) {
    const select = new StringSelectMenuBuilder()
        .setCustomId('starter')
        .setPlaceholder('性別を選択してください')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('男性')
                .setValue('男性'),
            new StringSelectMenuOptionBuilder()
                .setLabel('女性')
                .setValue('女性'),
            new StringSelectMenuOptionBuilder()
                .setLabel('その他')
                .setValue('その他')
        );

    const row = new ActionRowBuilder()
        .addComponents(select);

    const message = await interaction.followUp({
        content: '性別を選択してください',
        components: [row],
    });

    try {
        const collected = await interaction.channel.awaitMessageComponent({
            filter: i => i.customId === 'starter' && i.user.id === interaction.user.id,
            time: 60000
        });

        await collected.reply(`${collected.values[0]}が選択されました`);

        // セレクターを無効化する
        const disabledSelect = StringSelectMenuBuilder.from(select).setDisabled(true);
        const disabledRow = new ActionRowBuilder().addComponents(disabledSelect);

        await message.edit({
            components: [disabledRow],
        });

        return collected.values[0];
    } catch (error) {
        console.error(error);
        await interaction.followUp('時間切れです');
        return null;
    }
}

module.exports = { gender };