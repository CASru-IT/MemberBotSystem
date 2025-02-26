const fs = require('fs');
const { REST } = require('@discordjs/rest'); //RESTを読み込む
const { Routes } = require('discord-api-types/v9'); //Routesを読み込む
require('dotenv').config();

const client_id = process.env.CLIENT_ID; //クライアントIDをclient_idに代入
const guild_id = process.env.GUILD_ID; //サーバーIDをguild_idに代入
const token = process.env.DISCORD_TOKEN; //トークン

//コマンドファイルを読み込む
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

//コマンドファイルを読み込んでコレクションに追加
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(token);

///コマンドを登録する
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        // ギルドコマンドとして登録
        await rest.put(
            Routes.applicationGuildCommands(client_id, guild_id),
            { body: commands },
        );

        // グローバルコマンドとして登録
        await rest.put(
            Routes.applicationCommands(client_id),
            { body: commands },
        );

        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0); // スクリプトを終了させる
    }
})();