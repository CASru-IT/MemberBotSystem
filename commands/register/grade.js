const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

async function grade(interaction) {
    const select = new StringSelectMenuBuilder()
        .setCustomId('starter')
        .setPlaceholder('学年を選択してください')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('1年生')
                .setValue('1'),
            new StringSelectMenuOptionBuilder()
                .setLabel('2年生')
                .setValue('2'),
            new StringSelectMenuOptionBuilder()
                .setLabel('3年生')
                .setValue('3'),
            new StringSelectMenuOptionBuilder()
                .setLabel('4年生')
                .setValue('4'),
            new StringSelectMenuOptionBuilder()
                .setLabel('院生またはその他')
                .setValue('5')
        );

    const row = new ActionRowBuilder()
        .addComponents(select);

    const message = await interaction.followUp({
        content: '学年を選択してください',
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

module.exports = { grade };