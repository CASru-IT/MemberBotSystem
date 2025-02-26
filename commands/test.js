const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')//これが/userというコマンドを作成
        .setDescription('ユーザーの情報を表示します。')//discordに表示されるコマンドの説明
        //discordに表示されるコマンドのオプションとその説明
        .addUserOption(option => option.setName('ユーザー').setDescription('情報を表示したいユーザーを指定。')),
    async execute(interaction) {
        //変数userに指定されたユーザーを代入
        const user = interaction.options.getUser('ユーザー');
        //もしユーザーが指定されていない場合は、ユーザーが指定されていませんと表示
        if (!user) {
            await interaction.reply({ content: 'ユーザーが指定されていません。', ephemeral: true });
            return;
        }
        //ユーザーが指定されていた場合は、ユーザーの名前、ID、アバターURLを表示
        await interaction.reply(
            `ユーザーの名前：${user.username}
            \n
            ユーザーID：${user.id}
            \n
            アバター -> [アバターURL](${user.avatarURL({ format: 'png' })})`
        );
    },
};