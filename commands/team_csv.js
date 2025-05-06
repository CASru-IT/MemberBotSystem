const { SlashCommandBuilder } = require('@discordjs/builders');
const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const { getDataByTeam } = require('../sqlite.js'); // sqlite.jsに班でデータを取得する関数を追加する必要があります
const { isUserAllowed } = require('../allowedUsers.js'); // allowedUsers.jsをインポート

module.exports = {
    data: new SlashCommandBuilder()
        .setName('team_csv')
        .setDescription('選択した班に所属している人をCSVで出力します'),
    async execute(interaction) {
        // 実行者のユーザー名をチェック
        if (!isUserAllowed(interaction.user.id)) {
            await interaction.reply({ content: 'このコマンドを実行する権限がありません。', ephemeral: true });
            return;
        }
        // 班のセレクターを作成
        const select = new StringSelectMenuBuilder()
            .setCustomId('team_selector')
            .setPlaceholder('班を選択してください')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('ハリボテ班').setValue('ハリボテ班'),
                new StringSelectMenuOptionBuilder().setLabel('絵描き班').setValue('絵描き班'),
                new StringSelectMenuOptionBuilder().setLabel('TRPG班').setValue('TRPG班'),
                new StringSelectMenuOptionBuilder().setLabel('IT班').setValue('IT班'),
                new StringSelectMenuOptionBuilder().setLabel('衣装班').setValue('衣装班'),
                new StringSelectMenuOptionBuilder().setLabel('ゲーム班').setValue('ゲーム班'),
                new StringSelectMenuOptionBuilder().setLabel('DTM班').setValue('DTM班'),
                new StringSelectMenuOptionBuilder().setLabel('漫画班').setValue('漫画班'),
                new StringSelectMenuOptionBuilder().setLabel('アニメ班').setValue('アニメ班')
            );

        const row = new ActionRowBuilder().addComponents(select);

        // セレクターを送信
        const message = await interaction.reply({
            content: '班を選択してください',
            components: [row],
            ephemeral: true
        });

        try {
            // ユーザーの選択を待機
            const collected = await interaction.channel.awaitMessageComponent({
                filter: i => i.customId === 'team_selector' && i.user.id === interaction.user.id,
                time: 60000
            });

            const selectedTeam = collected.values[0];
            await collected.reply(`${selectedTeam}が選択されました`);

            // データベースから選択された班のデータを取得
            const data = await getDataByTeam(selectedTeam);

            if (data.length === 0) {
                await interaction.followUp({ content: '選択された班にはメンバーがいません。', ephemeral: true });
                return;
            }

            // CSVヘッダーを作成
            const headers = ['discord_id', 'discord_name', 'name', 'furigana', 'student_number', 'grade', 'academic_department', 'mail_address', 'team', 'last_payment_date'];
            const rows = data.map(row => [
                row.discord_id,
                row.discord_name,
                row.name,
                row.furigana,
                row.student_number,
                row.grade,
                row.academic_department,
                row.mail_address,
                row.team,
                row.last_payment_date
            ]);

            // CSV形式に変換
            const csvContent = [
                headers.join(','), // ヘッダー行
                ...rows.map(row => row.map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',')) // データ行
            ].join('\n');

            // CSVファイルに書き出し
            const filePath = `./${selectedTeam}_members.csv`;
            const bom = '\uFEFF'; // BOMを追加
            fs.writeFileSync(filePath, bom + csvContent, 'utf8');

            // ファイルを送信
            await interaction.followUp({
                content: `${selectedTeam}のメンバーリストをCSVで出力しました。`,
                files: [filePath],
                ephemeral: true
            });

            // 一時ファイルを削除
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error(error);
            await interaction.followUp({ content: '時間切れかエラーが発生しました。', ephemeral: true });
        }
    }
};

