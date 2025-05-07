const fs = require('fs');

// JSONファイルのパス
const allowedUsersPath = 'data\\allowedUsers.json';

/**
 * 指定されたユーザー名がallowedUsers.jsonに存在するか確認する関数
 * @param {string} username - チェックするユーザー名
 * @returns {boolean} - ユーザー名が存在する場合はtrue、存在しない場合はfalse
 */
function isUserAllowed(username) {
    try {
        // allowedUsers.jsonを読み込む
        const allowedUsersData = JSON.parse(fs.readFileSync(allowedUsersPath, 'utf8'));
        const allowedUsers = allowedUsersData.allowed_users;

        // ユーザー名がリストに含まれているか確認
        return allowedUsers.includes(username);
    } catch (error) {
        console.error('allowedUsers.jsonの読み込み中にエラーが発生しました:', error);
        return false;
    }
}

module.exports = { isUserAllowed };
