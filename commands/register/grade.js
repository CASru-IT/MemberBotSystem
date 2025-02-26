import { ActionRowBuilder,StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } from 'discord.js';

async function grade(interaction) {
    const select = new StringSelectMenuBuilder()
        .setCustomId('starter')
        .setPlaceholder('Make a selection!')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('1')
                .setValue('1'),
            new StringSelectMenuOptionBuilder()
                .setLabel('2')
                .setValue('2'),
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
export { grade }