const fs = require('fs');
const { Client, GatewayIntentBits, Partials, ApplicationCommandType, ApplicationCommandOptionType, Collection, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');
require('dotenv').config();
//必要なモジュールを読み込む

//コマンドの設定
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages], partials: [Partials.Channel]
});

client.commands = new Collection(); //新しいインスタンスを作成します

//コマンドファイルを読み込む
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

//コマンドファイルを読み込んでコレクションに追加
for (const file of commandFiles) {
    const command = require(`./commands/${file}`); //同じ階層にあるcommandフォルダの中にあるjsファイルを取得
    client.commands.set(command.data.name, command);
}

client.once('ready', () => { //ここにボットが起動した際のコードを書く(一度のみ実行)
    console.log('起動完了'); //黒い画面(コンソール)に「起動完了」と表示させる
});

client.on('interactionCreate', async interaction => { //メッセージを受け取ったら
    if (!interaction.isCommand()) return; //コマンド以外は無視
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'コマンド実行時にエラーが発生しました', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN); //ログインする