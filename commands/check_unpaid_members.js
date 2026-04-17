//このファイルは、/registerコマンドを処理します。
const { SlashCommandBuilder } = require('@discordjs/builders'); // SlashCommandBuilderを読み込む
const { MessageFlags } = require('discord.js');
const { getData } = require('../sqlite.js'); // sqlite.jsから関数を読み込む
const { isUserAllowed } = require('../allowedUsers.js'); // allowedUsers.jsをインポート

async function listAllGuildMembers(guild) {
    const allMembers = new Map();
    let after;

    while (true) {
        const batch = await guild.members.list({ limit: 1000, after });
        if (batch.size === 0) break;

        for (const [id, member] of batch) {
            allMembers.set(id, member);
        }

        if (batch.size < 1000) break;
        after = batch.lastKey();
    }

    return allMembers;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check_unpaid_members') // コマンド名を設定
        .setDescription('未払いのメンバーを確認します'), // コマンドの説明を設定
    async execute(interaction) {
        if (!isUserAllowed(interaction.user.id)) {
        await interaction.reply({
          content: 'このコマンドは管理者のみ実行できます。',
                    flags: MessageFlags.Ephemeral,
        });
        return;
      }

        // メンバー数が多いと3秒を超えるため、先にdeferしてタイムアウトを防ぐ
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (!interaction.guild) {
            await interaction.editReply({ content: 'このコマンドはサーバー内でのみ実行できます。' });
            return;
        }

        const namelist = [];
        const memberData = getData();
        const memberDataMap = new Map(memberData.map((row) => [row.discord_id, row]));

        let guildMembers;
        try {
            guildMembers = await listAllGuildMembers(interaction.guild);
        } catch (error) {
            console.error('サーバーメンバーの取得に失敗しました:', error);
            await interaction.editReply({ content: 'サーバーメンバーの取得に失敗しました。しばらくして再実行してください。' });
            return;
        }

        for (const member of guildMembers.values()) {
            if (member.user.bot) continue;

            const data = memberDataMap.get(member.user.id);
            const displayName = member.user.tag;

            if (!data) {
                namelist.push(displayName);
                continue;
            }

            const lastdate = data.last_payment_date;
            if (!lastdate || lastdate === 'none') {
                namelist.push(displayName);
                continue;
            }

            const today = new Date();
            const lastDateObj = new Date(lastdate);
            if (Number.isNaN(lastDateObj.getTime())) {
                namelist.push(displayName);
                continue;
            }

            const diffTime = Math.abs(today - lastDateObj);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 365) {
                namelist.push(displayName);
            }
        }

        if (namelist.length === 0) {
            await interaction.editReply({ content: '未払いのメンバーはいませんでした。' });
            return;
        }

        const content = `未払いのメンバー: ${namelist.join(', ')}`;
        if (content.length > 1900) {
            const previewCount = 50;
            const preview = namelist.slice(0, previewCount).join(', ');
            await interaction.editReply({
                content: `未払いのメンバーは ${namelist.length} 人です。先頭 ${previewCount} 人: ${preview}`
            });
            return;
        }

        await interaction.editReply({
            content
        });
    }
};