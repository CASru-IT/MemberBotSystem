import { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } from 'discord.js';

async function team(interaction) {
    const reply=await interaction.followUp({ content: '所属する班に対応するスタンプをすべて選択！:\nハリボテ班:1️⃣\n絵描き班:2️⃣\nTRPG班:3️⃣\nIT班:4️⃣\n衣装班:5️⃣\nゲーム班:6️⃣\nDTM班:7️⃣\n漫画班:8️⃣\nアニメ班:9️⃣' });
    //const reply = await interaction.fetchReply();
    await reply.react('1️⃣');
    await reply.react('2️⃣');
    await reply.react('3️⃣');
    await reply.react('4️⃣');
    await reply.react('5️⃣');
    await reply.react('6️⃣');
    await reply.react('7️⃣');
    await reply.react('8️⃣');
    await reply.react('9️⃣');

    let collectedReactions = [];

    // リアクションが追加されたときのイベントリスナーを設定
    const reactionListener = (reaction, user) => {
        if (reaction.message.id === reply.id && !user.bot) {
            if (['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'].includes(reaction.emoji.name)) {
                collectedReactions.push(reaction.emoji.name);
                console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);
            }
        }
    };

    interaction.client.on('messageReactionAdd', reactionListener);

    async function ButtonCreate(interaction) {
        const Button = new ButtonBuilder()
            .setCustomId('button_1') // 固定のカスタムIDを設定
            .setStyle(ButtonStyle.Primary)
            .setLabel("完了したらここを押してください")
            //.setEmoji("🐈");

        await interaction.followUp({
            content: '',
            components: [
                new ActionRowBuilder().addComponents(Button)
            ]
        });
    }

    // 例としてButtonCreate関数を呼び出す
    await ButtonCreate(interaction);

    interaction.client.on("interactionCreate", async buttonInteraction => {
        if (!buttonInteraction.isButton()) return;
        if (buttonInteraction.customId === 'button_1') {
            // イベントリスナーを削除
            interaction.client.off('messageReactionAdd', reactionListener);

            // 収集されたリアクションを取得
            await buttonInteraction.update({ content: `完了しました！選択されたリアクション: ${collectedReactions.join(', ')}`, components: [] });
        }
    });
}

export { team };