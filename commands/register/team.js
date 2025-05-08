const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

async function team(interaction) {
    const teamNames = {
        'button_1': 'ハリボテ班',
        'button_2': '絵描き班',
        'button_3': 'TRPG班',
        'button_4': 'IT班',
        'button_5': '衣装班',
        'button_6': 'ゲーム班',
        'button_7': 'DTM班',
        'button_8': '漫画班',
        'button_9': 'アニメ班'
    };

    // セレクターメニューを作成
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('team_select')
        .setPlaceholder('所属する班を選択してください')
        .setMinValues(1) // 最小選択数
        .setMaxValues(Object.keys(teamNames).length) // 最大選択数
        .addOptions(
            Object.keys(teamNames).map((customId) => ({
                label: teamNames[customId],
                value: customId
            }))
        );

    // セレクターメニューを行に追加
    const row = new ActionRowBuilder().addComponents(selectMenu);

    // メッセージを送信
    await interaction.followUp({
        content: '所属する班を選択してください（複数選択可能です）。',
        components: [row]
    });

    const collectedTeams = [];

    try {
        // セレクターメニューのインタラクションを収集
        const collected = await interaction.channel.awaitMessageComponent({
            filter: i => i.customId === 'team_select' && i.user.id === interaction.user.id,
            time: 60000 // 60秒間収集
        });

        const selectedValues = collected.values; // 選択された値を取得
        selectedValues.forEach((value) => {
            const teamName = teamNames[value];
            if (teamName && !collectedTeams.includes(teamName)) {
                collectedTeams.push(teamName);
            }
        });

        await collected.reply({ content: `選択された班: ${collectedTeams.join(', ')}`});
        return collectedTeams; // 選択された班の配列を返す
    } catch (error) {
        if (error.code === 'InteractionCollectorError') {
            await interaction.followUp({ content: 'タイムアウトしました。選択が完了しませんでした。'});
        } else {
            console.error('エラーが発生しました:', error);
            await interaction.followUp({ content: 'エラーが発生しました。もう一度お試しください。'});
        }
    }
}

module.exports = { team };