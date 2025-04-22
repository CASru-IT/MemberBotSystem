import Database from 'better-sqlite3';

const db = new Database('test1.db');

// テーブルが存在しない場合にのみ作成する
const createTweetTableQuery = db.prepare(`
CREATE TABLE IF NOT EXISTS tweets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  discord_name TEXT NOT NULL,
  name TEXT NOT NULL,
  furigana TEXT NOT NULL,
  student_number TEXT NOT NULL,
  grade INTEGER NOT NULL,
  academic_department TEXT NOT NULL,
  mail_address TEXT NOT NULL,
  team TEXT NOT NULL,
  last_payment_date TEXT NOT NULL
);
`);
createTweetTableQuery.run();

// データベースのクエリを実行する関数を定義します
function executeQuery(query, params) {
    const stmt = db.prepare(query);
    return stmt.all(params);
}

// データを挿入する関数を定義します
function insertData(discord_id, discord_name, name, furigana, student_number, grade, academic_department, mail_address, team, last_payment_date) {
    console.log(discord_id, discord_name, name, furigana, student_number, grade, academic_department, mail_address, team, last_payment_date);
    const insertTweetQuery = db.prepare(`
    INSERT INTO tweets (discord_id, discord_name, name, furigana, student_number, grade, academic_department, mail_address, team, last_payment_date) VALUES (?, ?, ? ,?, ?, ?, ?, ?, ?, ?);
    `);
    insertTweetQuery.run(discord_id, discord_name, name, furigana, student_number, grade, academic_department, mail_address, team, last_payment_date);
}

// データを取得する関数を定義します
function getData() {
    const getTweetsQuery = db.prepare(`
      SELECT * FROM tweets;
    `);
    return getTweetsQuery.all();
}

// データを削除する関数を定義します
function deleteData(id) {
    const deleteTweetQuery = db.prepare(`
    DELETE FROM tweets WHERE id = ?;
    `);
    deleteTweetQuery.run(id);
}

export { executeQuery, insertData, getData, deleteData };