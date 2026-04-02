//このファイルは、/registerコマンドを処理します。
const { SlashCommandBuilder } = require('@discordjs/builders'); // SlashCommandBuilderを読み込む
const { getDataBydiscord_id } = require('../sqlite.js'); // sqlite.jsから関数を読み込む
const { isUserAllowed } = require('../allowedUsers.js'); // allowedUsers.jsをインポート

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check_stale_registration') // コマンド名を設定
        .setDescription('古い登録を確認します'), // コマンドの説明を設定
    async execute(interaction) {
        // コマンド実行者のDiscord IDを取得
        const discord_id = interaction.user.id;
        if (!isUserAllowed(interaction.user.id)) {
        await interaction.reply({
          content: 'このコマンドは管理者のみ実行できます。',
          ephemeral: true,
        });
        return;
      }
        const namelist = [];
        const members = await interaction.guild.members.fetch();

    await Promise.allSettled(
      members.map(async (member) => {
        if (member.user.bot) return;

        const data = getDataBydiscord_id(member.user.id); // 同期戻り値
        const lastdate = data.last_registration_date;
        const today = new Date();
        const lastDateObj = new Date(lastdate);
        const diffTime = Math.abs(today - lastDateObj);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 365 || !data) {
          try {
            namelist.push(member.user.tag);
          } catch (_) {
            //failedIds.push(member.user.id); // DM拒否など
          }
        }
      })
    );
        if (namelist.length === 0) {
            await interaction.reply({ content: '登録が古いまたは未登録のユーザーはいませんでした。', ephemeral: true });
        }else {
            await interaction.reply({ content: '登録が古いまたは未登録のユーザーを検出しました。', ephemeral: true });

            await interaction.editReply({
                content: `登録が古いまたは未登録のユーザー: ${namelist.join(', ')}`
            })
        }
    }
};