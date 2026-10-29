// Run in a disposable container with --memory=256m --memory-swap=256m.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'memberbot-memory-')));
fs.mkdirSync('data');
fs.writeFileSync('data/allowedUsers.json', JSON.stringify({ admin_users: ['test-admin'], allowed_users: [] }));
const db = require('../sqlite');
for (let i = 0; i < 300; i++) db.insertQRCode('none', `TEST-ONLY-${i}`, 5000);
require('../commands/generateQRcode').execute({
    user: { id: 'test-admin' },
    options: { getInteger: () => 10, getString: () => '5000' },
    async deferReply() { this.deferred = true; },
    async editReply() {}, async followUp() {},
}).then(() => console.log(JSON.stringify({ done: true, files: fs.readdirSync('qrcodes').length, maxRSSKiB: process.resourceUsage().maxRSS })));
