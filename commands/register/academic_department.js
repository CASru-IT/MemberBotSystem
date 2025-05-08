const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

async function academic_department(interaction) {
    const select = new StringSelectMenuBuilder()
        .setCustomId('starter')
        .setPlaceholder('学類を選択してください')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('人文学類')
                .setValue('人文学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('法学類')
                .setValue('法学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('経済学類')
                .setValue('経済学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('学校教育学類')
                .setValue('学校教育学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('地域創造学類')
                .setValue('地域創造学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('国際学類')
                .setValue('国際学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('数物科学類')
                .setValue('数物科学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('物質化学類')
                .setValue('物質化学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('機械工学類')
                .setValue('機械工学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('フロンティア工学類')
                .setValue('フロンティア工学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('電子情報通信学類')
                .setValue('電子情報通信学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('地球社会基盤学類')
                .setValue('地球社会基盤学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('生命理工学類')
                .setValue('生命理工学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('医学類')
                .setValue('医学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('薬学類')
                .setValue('薬学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('医薬科学類')
                .setValue('医薬科学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('保健学類')
                .setValue('保健学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('先導学類')
                .setValue('先導学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('観光デザイン学類')
                .setValue('観光デザイン学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('スマート創成科学類')
                .setValue('スマート創成科学類')
        );

    const row = new ActionRowBuilder()
        .addComponents(select);

    const message = await interaction.followUp({
        content: '学類を選択してください',
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

module.exports = { academic_department };