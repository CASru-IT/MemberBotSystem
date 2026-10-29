const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { MessageFlags, MessagePayload } = require('discord.js');

const originalCwd = process.cwd();
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'memberbot-test-'));
process.chdir(scratch);
fs.mkdirSync('data');
fs.writeFileSync('data/allowedUsers.json', JSON.stringify({ admin_users: ['admin'], allowed_users: [] }));
const db = require('../sqlite');
const command = require('../commands/generateQRcode');

function interaction(count, overrides = {}) {
    const messages = [];
    return {
        user: { id: 'admin' }, deferred: false, replied: false,
        attachmentSizeLimit: 8 * 1024 * 1024,
        options: { getInteger: () => count, getString: () => '5000' },
        messages,
        async deferReply(payload) { this.deferred = true; this.deferOptions = payload; },
        async reply(payload) { messages.push(payload); this.replied = true; },
        async editReply(payload) {
            const resolved = MessagePayload.create({}, payload);
            await resolved.resolveFiles();
            messages.push({ ...payload, resolvedFiles: resolved.files });
        },
        async followUp(payload) { await this.editReply(payload); },
        ...overrides,
    };
}

beforeEach(() => {
    db.DeleteAllQRCodes();
    fs.rmSync('qrcodes', { recursive: true, force: true });
});
after(() => { process.chdir(originalCwd); fs.rmSync(scratch, { recursive: true, force: true }); });

test('only requested QR images are generated and the PNG bytes are attached', async () => {
    for (let i = 0; i < 3; i++) db.insertQRCode('none', `OLD-${i}`, 2500);
    const call = interaction(2);
    await command.execute(call);
    const files = call.messages.flatMap(m => m.resolvedFiles || []);
    const pngs = files.filter(f => f.name.endsWith('.png'));
    assert.equal(pngs.length, 2, 'reply must include the requested PNG images');
    assert.equal(fs.readdirSync('qrcodes').length, 2, 'old QR codes must not be regenerated');
    for (const png of pngs) {
        const disk = path.join(scratch, png.name);
        fs.writeFileSync(disk, png.data);
        const code = execFileSync('zbarimg', ['--quiet', '--raw', disk], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        assert.ok(!code.startsWith('OLD-'));
        assert.equal(db.getQRCodeByCode(code).price, 5000);
    }
});

test('image replies stay within Discord file count and size limits', async () => {
    const call = interaction(12);
    await command.execute(call);
    assert.equal(call.messages.flatMap(m => m.resolvedFiles || []).filter(f => f.name.endsWith('.png')).length, 12);
    for (const message of call.messages) {
        assert.ok((message.files || []).length <= 10);
        assert.ok((message.resolvedFiles || []).reduce((size, f) => size + f.data.length, 0) <= call.attachmentSizeLimit);
    }
    assert.equal(call.deferOptions.flags, MessageFlags.Ephemeral);
    assert.ok(call.messages.slice(1).every(m => m.flags === MessageFlags.Ephemeral));
});

test('file generation failure finishes the deferred reply with a recovery message', async (t) => {
    t.mock.method(console, 'error', () => {});
    fs.writeFileSync('qrcodes', 'not a directory');
    const call = interaction(1);
    await command.execute(call);
    assert.match(call.messages.at(-1).content, /失敗|エラー/);
    assert.ok(!call.messages.at(-1).content.includes('生成しました。'));
});

test('large requests finish without regenerating the existing database', async () => {
    for (let i = 0; i < 300; i++) db.insertQRCode('none', `OLD-${i}`, 2500);
    const call = interaction(100);
    await command.execute(call);
    assert.equal(call.messages.flatMap(m => m.resolvedFiles || []).filter(f => f.name.endsWith('.png')).length, 100);
    assert.equal(fs.readdirSync('qrcodes').length, 100);
});

test('requests beyond the count limit do not issue codes', async () => {
    const call = interaction(101);
    await command.execute(call);
    assert.equal(db.executeQuery('SELECT COUNT(*) AS n FROM QRCode', [])[0].n, 0);
    assert.ok(!call.deferred);
});

test('concurrent commands are rejected before issuing more codes', async () => {
    let release;
    const first = interaction(1, { deferReply() { this.deferred = true; return new Promise(resolve => { release = resolve; }); } });
    const pending = command.execute(first);
    const second = interaction(1);
    await command.execute(second);
    assert.equal(db.executeQuery('SELECT COUNT(*) AS n FROM QRCode', [])[0].n, 0);
    assert.match(second.messages[0].content, /送信中/);
    release();
    await pending;
    assert.equal(db.executeQuery('SELECT COUNT(*) AS n FROM QRCode', [])[0].n, 1);
});

test('failed attachment upload preserves issued codes and releases the busy flag', async (t) => {
    t.mock.method(console, 'error', () => {});
    const call = interaction(1);
    const edit = call.editReply;
    call.editReply = async payload => {
        if (payload.files) throw new Error('simulated Discord upload failure');
        return edit.call(call, payload);
    };
    await command.execute(call);
    assert.match(call.messages.at(-1).content, /登録済み/);
    assert.equal(db.executeQuery('SELECT COUNT(*) AS n FROM QRCode', [])[0].n, 1);
    assert.equal(fs.readdirSync('qrcodes').length, 1);
    const retry = interaction(1);
    await command.execute(retry);
    assert.equal(retry.messages.flatMap(m => m.resolvedFiles || []).filter(f => f.name.endsWith('.png')).length, 1);
});

test('PNG stream write errors reject rather than leaving the command pending', async () => {
    fs.mkdirSync('qrcodes/1.png', { recursive: true });
    await assert.rejects(db.generateQRCodes([{ id: 1, qr_code: 'TEST-ONLY', price: 2500 }]), { code: 'EISDIR' });
});

test('generated PNG can be received over HTTP and decoded by the Linux payment command', async (t) => {
    t.mock.method(console, 'log', () => {});
    db.insertData('pay-test', 'test', 'Test', 'Test', 'TEST-ONLY', 1, 'Test', 'test@example.invalid', 'Test', 'none', 'none', 'none');
    const id = db.insertQRCode('none', 'TEST-ONLY-PAYMENT-CODE', 5000);
    const [file] = await db.generateQRCodes([{ id, qr_code: 'TEST-ONLY-PAYMENT-CODE', price: 5000 }]);
    const server = require('node:http').createServer((req, res) => {
        res.writeHead(200, { 'content-type': 'image/png' });
        fs.createReadStream(file).pipe(res);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/qr.png`;
    const handlers = {};
    const call = interaction(1, {
        user: { id: 'pay-test' },
        channel: { isDMBased: () => true, createMessageCollector: () => ({ on(event, fn) { handlers[event] = fn; } }) },
    });
    await require('../commands/newpay').execute(call);
    await handlers.collect({ attachments: { find: predicate => {
        const attachment = { name: 'qr.png', contentType: 'image/png', url, proxyURL: url };
        return predicate(attachment) ? attachment : undefined;
    } } });
    assert.equal(db.getQRCodeByCode('TEST-ONLY-PAYMENT-CODE').discord_id, 'pay-test');
    assert.match(call.messages.at(-1).content, /5000円の支払いが完了/);
    assert.ok(!fs.readdirSync(os.tmpdir()).some(name => name.startsWith('newpay-')));
});

test('unauthorized callers do not create payment codes', async () => {
    const call = interaction(1, { user: { id: 'outsider' } });
    await command.execute(call);
    assert.equal(db.executeQuery('SELECT COUNT(*) AS n FROM QRCode', []).at(0).n, 0);
    assert.ok(!call.deferred);
});
