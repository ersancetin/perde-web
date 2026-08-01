#!/usr/bin/env node
// Perde Eklenti — gerçek Chromium'da uçtan uca duman testi
//
// extension/test.js saf mantığı (policy.js) test eder. Bu dosya ise DOM katmanını
// test eder: yapıştırmanın gerçekten kesilip kesilmediği, panelin çizilip
// çizilmediği, maskeli metnin textarea/contenteditable'a doğru yazılıp
// yazılmadığı, şifre alanına dokunulmadığı, token round-trip'inin çalıştığı.
// Eklentinin en kırılgan kısmı burası — execCommand ve editör davranışları.
//
// npm test'in PARÇASI DEĞİL: playwright + indirilmiş bir Chromium gerektirir,
// ikisi de projenin bağımlılığı değil. Elle çalıştırılır:
//
//   npm i -D playwright && npx playwright install chromium
//   npm run build:ext
//   node extension/tools/e2e.js
//
// Başsız ortamda: xvfb-run -a node extension/tools/e2e.js
// (Chromium'u başka yerden kullanmak için PERDE_CHROME=/yol/chrome)

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

let chromium;
try {
    ({ chromium } = require('playwright'));
} catch (_) {
    console.error('playwright bulunamadı. Kurulum:\n' +
        '  npm i -D playwright && npx playwright install chromium');
    process.exit(2);
}

const REPO = path.resolve(__dirname, '..', '..');
const EXT_SRC = path.join(REPO, 'extension');
const PORT = 8731;
const ORIGIN = 'http://localhost:' + PORT;
const LOCAL_MATCH = ORIGIN + '/*';

let pass = 0, fail = 0;
function check(name, cond, detail) {
    if (cond) { pass++; console.log('  ✓ ' + name); }
    else { fail++; console.log('  ✗ ' + name + (detail ? '\n      ' + detail : '')); }
}
const section = t => console.log('\n--- ' + t + ' ---');

// Sentetik test verisi (gerçek kişiye ait değil)
const LEGAL = 'Davacı Ahmet Yılmaz (TC: 12345678901), Ziraat Bankası ' +
    'TR330006100519786457841326 hesabına yatan tutar için, Bağdat Caddesi No:12 ' +
    'Kadıköy/İstanbul adresinde ikamet eden Ayşe Kaya\'ya ihtar gönderdi. ' +
    'İletişim: 0532 123 45 67, ahmet@example.com';
const CLEAN = 'Merhaba, geçen hafta konuştuğumuz konuyu güncelledim. Toplantıyı ' +
    'pazartesiye aldık, sunum yirmi beş dakika sürecek, ekipten dört kişi katılacak.';
const SECRETS = ['12345678901', 'TR330006100519786457841326', 'ahmet@example.com',
                 'Ahmet Yılmaz', '0532 123 45 67'];

const PAGE_HTML = `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">
<title>Perde e2e</title><link rel="icon" href="data:,"></head><body>
<h1>Perde e2e</h1>
<textarea id="ta" rows="6" cols="70"></textarea>
<div id="ce" contenteditable="true" style="border:1px solid #999;min-height:80px;width:520px;padding:6px"></div>
<input id="pw" type="password">
</body></html>`;

// ─── Test eklentisi kopyası (manifest'e localhost eklenir) ───────────────────

function stageExtension() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'perde-ext-'));
    fs.cpSync(EXT_SRC, dir, { recursive: true });
    const mf = path.join(dir, 'manifest.json');
    const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
    m.host_permissions.push(LOCAL_MATCH);
    m.content_scripts[0].matches.push(LOCAL_MATCH);
    fs.writeFileSync(mf, JSON.stringify(m, null, 2));

    for (const f of ['dictionaries.js', 'recognizers.js', 'ner-engine.js', 'ai-workflow.js']) {
        if (!fs.existsSync(path.join(dir, 'engine', f))) {
            console.error('engine/' + f + ' yok — önce: npm run build:ext');
            process.exit(2);
        }
    }
    if (!fs.existsSync(path.join(dir, 'icons', 'icon16.png'))) {
        console.error('icons/ yok — önce: npm run build:ext');
        process.exit(2);
    }
    return dir;
}

// ─── Ana akış ───────────────────────────────────────────────────────────────

(async () => {
    const extDir = stageExtension();
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(PAGE_HTML);
    });
    await new Promise(r => server.listen(PORT, r));

    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perde-e2e-'));
    const launch = {
        headless: false,   // MV3 eklentileri headless shell'de yüklenmiyor
        args: [
            '--disable-extensions-except=' + extDir,
            '--load-extension=' + extDir,
            '--no-sandbox',
        ],
    };
    if (process.env.PERDE_CHROME) launch.executablePath = process.env.PERDE_CHROME;

    const context = await chromium.launchPersistentContext(userDataDir, launch);
    const page = await context.newPage();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN });

    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));

    await page.goto(ORIGIN + '/page.html');
    await page.waitForTimeout(1500);

    // Panel kapalı shadow root içinde (sayfanın PII'yi okumasını engellemek için),
    // bu yüzden içine CDP ile piercing yaparak bakıyoruz.
    const cdp = await context.newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('Runtime.enable');

    function walkAll(node, visit) {
        if (!node) return;
        visit(node);
        for (const c of node.children || []) walkAll(c, visit);
        for (const s of node.shadowRoots || []) walkAll(s, visit);
    }

    // YALNIZCA Perde'nin (yazar tarafından açılmış) shadow root'undaki metni döndürür.
    // İki şeyi dışarıda bırakmak şart, yoksa testler yanlışlıkla geçiyor:
    //   • sayfanın kendi DOM'u — textarea'nın .value'su değişse bile eski metin
    //     düğümü ağaçta kalabiliyor,
    //   • user-agent shadow root'ları — input/textarea'nın iç editörü, yani
    //     şifre alanına yapıştırdığımız metin de buradan görünüyor.
    async function shadowText() {
        const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
        const out = [];
        walkAll(root, n => {
            for (const sr of n.shadowRoots || []) {
                if (sr.shadowRootType === 'user-agent') continue;
                walkAll(sr, m => {
                    if (m.nodeType === 3 && m.nodeValue && m.nodeValue.trim()) {
                        out.push(m.nodeValue.trim());
                    }
                });
            }
        });
        return out.join(' | ');
    }

    async function clickInShadow(label) {
        const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
        let found = null;
        walkAll(root, n => {
            if (found || n.nodeName !== 'BUTTON') return;
            const txt = (n.children || []).filter(c => c.nodeType === 3)
                .map(c => c.nodeValue).join('').trim();
            if (txt === label) found = n.nodeId;
        });
        if (!found) throw new Error('buton bulunamadı: ' + label);
        const { object } = await cdp.send('DOM.resolveNode', { nodeId: found });
        await cdp.send('Runtime.callFunctionOn', {
            objectId: object.objectId,
            functionDeclaration: 'function(){ this.click(); }',
        });
        await page.waitForTimeout(500);
    }

    async function pasteInto(selector, text) {
        await page.evaluate(t => navigator.clipboard.writeText(t), text);
        await page.click(selector);
        await page.keyboard.press('Control+V');
        await page.waitForTimeout(700);
    }

    const worker = () => context.serviceWorkers()[0];

    async function setSettings(patch) {
        await worker().evaluate(async p => {
            const { settings } = await chrome.storage.local.get('settings');
            await chrome.storage.local.set({ settings: { ...(settings || {}), ...p } });
        }, patch);
        await page.waitForTimeout(400);
    }

    const val = sel => page.$eval(sel, e => (e.isContentEditable ? e.innerText : e.value));
    const clearField = sel => page.$eval(sel, e => {
        if (e.isContentEditable) e.innerText = ''; else e.value = '';
    });

    // ── 0) Yükleme ──
    section('yükleme');
    check('service worker ayakta', context.serviceWorkers().length > 0);
    check('content script sayfa dünyasından görünmüyor (isolated world)',
        (await page.evaluate(() => !!window.__perdeLoaded)) === false);

    // ── 1) Önizleme modu ──
    section('önizleme modu: yapıştırma kesilir');
    await pasteInto('#ta', LEGAL);
    check('textarea boş kaldı', (await val('#ta')) === '', JSON.stringify(await val('#ta')));
    let panel = await shadowText();
    check('panel açıldı', /yapıştırma kontrolü/.test(panel), panel.slice(0, 200));
    check('bulgu sayısı gösterildi', /kişisel veri/.test(panel));
    check('TC Kimlik etiketi listelendi', /TC Kimlik/.test(panel));
    check('IBAN etiketi listelendi', /IBAN/.test(panel));

    section('"Maskeli yapıştır"');
    await clickInShadow('Maskeli yapıştır');
    let v = await val('#ta');
    check('alan doldu', v.length > 40, JSON.stringify(v.slice(0, 80)));
    check('token yerleşti', /\[KISI_1\]/.test(v), v.slice(0, 160));
    check('maskelenmeyen metin korundu', v.includes('ihtar gönderdi'), v.slice(0, 200));
    for (const s of SECRETS) check('sızmadı: ' + s, !v.includes(s));

    section('"Olduğu gibi yapıştır"');
    await clearField('#ta');
    await pasteInto('#ta', LEGAL);
    await clickInShadow('Olduğu gibi yapıştır');
    check('orijinal metin aynen girdi', (await val('#ta')).trim() === LEGAL.trim());

    // ── 2) Karışmaması gereken durumlar ──
    section('temiz metne karışmıyor');
    await clearField('#ta');
    await pasteInto('#ta', CLEAN);
    check('temiz metin doğrudan yapıştı', (await val('#ta')).trim() === CLEAN.trim());

    section('şifre alanına dokunmuyor');
    await pasteInto('#pw', LEGAL);
    check('şifre alanı denetlenmedi', (await page.$eval('#pw', e => e.value)) === LEGAL);

    // ── 3) contenteditable ──
    section('contenteditable');
    await pasteInto('#ce', LEGAL);
    check('contenteditable boş kaldı', (await val('#ce')).trim() === '');
    await clickInShadow('Maskeli yapıştır');
    v = await val('#ce');
    check('maskeli metin yazıldı', /\[KISI_1\]/.test(v), JSON.stringify(v.slice(0, 160)));
    for (const s of SECRETS) check('ce sızmadı: ' + s, !v.includes(s));

    // ── 4) Sessiz mod ──
    section('sessiz mod');
    await setSettings({ mode: 'silent' });
    await clearField('#ta');
    await pasteInto('#ta', LEGAL);
    v = await val('#ta');
    check('sormadan maskeledi', /\[KISI_1\]/.test(v), JSON.stringify(v.slice(0, 120)));
    for (const s of SECRETS) check('sessiz mod sızmadı: ' + s, !v.includes(s));
    check('bildirim gösterildi', /maskelendi/.test(await shadowText()));

    // ── 5) Yıldız stili ──
    section('yıldız stili');
    await setSettings({ style: 'star' });
    await clearField('#ta');
    await pasteInto('#ta', LEGAL);
    v = await val('#ta');
    check('yıldızla maskeledi', v.includes('***'), JSON.stringify(v.slice(0, 120)));
    check('token üretilmedi', !/\[KISI_1\]/.test(v));
    for (const s of SECRETS) check('yıldız sızmadı: ' + s, !v.includes(s));

    // ── 6) Kapatma anahtarları ──
    section('site kapatma');
    await setSettings({ mode: 'preview', style: 'token', perSite: { localhost: false } });
    await clearField('#ta');
    await pasteInto('#ta', LEGAL);
    check('site kapalıyken karışmadı', (await val('#ta')).trim() === LEGAL.trim());

    section('ana şalter');
    await setSettings({ perSite: {}, enabled: false });
    await clearField('#ta');
    await pasteInto('#ta', LEGAL);
    check('kapalıyken karışmadı', (await val('#ta')).trim() === LEGAL.trim());

    // ── 7) Yazarken rozet ──
    section('yazarken rozet');
    await setSettings({ enabled: true, perSite: {}, mode: 'preview', style: 'token' });
    await clearField('#ta');
    await page.click('#ta');
    await page.keyboard.type('Muvekkilim Ahmet Yilmaz, TC 12345678901 numarali kisi.', { delay: 8 });
    await page.waitForTimeout(1400);   // debounce 600 ms + analiz
    check('rozet çıktı', /TC Kimlik|Kişi|Kisi/.test(await shadowText()), (await shadowText()).slice(0, 200));
    check('yazarken alan yeniden yazılmadı', (await val('#ta')).includes('12345678901'));

    // ── 8) Token round-trip ──
    section('token round-trip (decode)');
    await clearField('#ta');
    await pasteInto('#ta', LEGAL);
    await clickInShadow('Maskeli yapıştır');
    check('token üretildi', /\[KISI_1\]/.test(await val('#ta')));

    await page.evaluate(() => {
        const d = document.createElement('div');
        d.textContent = 'Sayin [KISI_1] adina dilekce hazirlandi. [TC_KIMLIK_1] dogrulanmali.';
        document.body.appendChild(d);
        const r = document.createRange();
        r.selectNodeContents(d);
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
    });
    // Sekmeyi URL ile bul: {active:true} kalıcı profildeki ilk boş sekmeye
    // düşebiliyor ve mesaj content script'e hiç ulaşmıyor.
    const tabId = await worker().evaluate(async match => {
        const tabs = await chrome.tabs.query({ url: match });
        return tabs.length ? tabs[0].id : null;
    }, LOCAL_MATCH);
    check('test sekmesi bulundu', tabId != null);
    await worker().evaluate(id => chrome.tabs.sendMessage(id, { type: 'perde:decode-selection' }), tabId);
    await page.waitForTimeout(900);
    const decoded = await shadowText();
    check('çözülmüş panel açıldı', /çözülmüş metin/.test(decoded), decoded.slice(0, 200));
    check('kişi adı geri geldi', /Ahmet Yılmaz/.test(decoded), decoded.slice(0, 300));
    check('TC geri geldi', /12345678901/.test(decoded), decoded.slice(0, 300));

    // ── 9) Konsol temizliği ──
    section('konsol');
    check('sayfada JS hatası yok', errors.length === 0, errors.slice(0, 5).join('\n      '));

    await context.close();
    server.close();
    fs.rmSync(extDir, { recursive: true, force: true });
    fs.rmSync(userDataDir, { recursive: true, force: true });

    console.log('\n' + '='.repeat(50));
    console.log('E2E: ' + pass + '/' + (pass + fail) + ' geçti (' + fail + ' başarısız)');
    console.log('='.repeat(50));
    process.exit(fail ? 1 : 0);
})().catch(e => {
    console.error('HARNESS HATASI:', e);
    process.exit(2);
});
