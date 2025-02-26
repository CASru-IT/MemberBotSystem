import { ActionRowBuilder,StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } from 'discord.js';

async function academic_department(interaction) {//setLabelとsetValueを変更する必要あり
    const select = new StringSelectMenuBuilder()//setLabelとsetValueは同じでいい
        .setCustomId('starter')
        .setPlaceholder('Make a selection!')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('先導学類')
                .setValue('先導学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('観光デザイン学類')
                .setValue('観光デザイン学類'),
            new StringSelectMenuOptionBuilder()
                .setLabel('3')
                .setValue('3'),
            new StringSelectMenuOptionBuilder()
                .setLabel('4')
                .setValue('4'),
        );
        const row = new ActionRowBuilder()
			.addComponents(select);

		await interaction.followUp({
			content: 'Choose your starter!',
			components: [row],
		});
        try {
            const collected = await interaction.channel.awaitMessageComponent({
                filter: i => i.customId === 'starter' && i.user.id === interaction.user.id,
                time: 60000
            });
            await collected.reply(`You chose ${collected.values[0]}`);
            return collected.values[0];
        } catch (error) {
            console.error(error);
            await interaction.followUp('Time out.');
            return null;
        }
}
export { academic_department }