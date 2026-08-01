// Perde Eklenti — service worker
//
// Görevleri:
//   • token → gerçek değer haritasını tutmak (chrome.storage.session: yalnızca
//     bellekte, diske YAZILMAZ, tarayıcı kapanınca kaybolur)
//   • sağ tık menüsü ve klavye kısayollarını sayfaya iletmek
//   • kullanıcının eklediği ek siteler için content script'i dinamik kaydetmek
//
// Not: harita bilerek kalıcı değil. Web uygulaması localStorage kullanıyor (sayfa
// yenilendikten sonra da çözebilmek için); eklentide oturum belleği yeterli ve
// gizlilik açısından daha iyi.

const DEFAULTS = {
    enabled: true,
    profile: 'guvenli',
    mode: 'preview',
    style: 'token',
    threshold: 0.4,
    minLength: 6,
    typingHints: true,
    disabledEntities: [],
    perSite: {},
};

const MAP_LIMIT = 4000;   // site başına saklanacak en fazla token sayısı

// ─── Kurulum ─────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
    const { settings } = await chrome.storage.local.get('settings');
    if (!settings) await chrome.storage.local.set({ settings: DEFAULTS });

    chrome.contextMenus.create({
        id: 'perde-decode',
        title: "Perde: seçili metindeki token'ları çöz",
        contexts: ['selection'],
    }, () => void chrome.runtime.lastError);

    chrome.contextMenus.create({
        id: 'perde-mask',
        title: 'Perde: bu alanı maskele',
        contexts: ['editable'],
    }, () => void chrome.runtime.lastError);
});

// ─── Menü + kısayollar ───────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || tab.id == null) return;
    const type = info.menuItemId === 'perde-decode'
        ? 'perde:decode-selection' : 'perde:mask-field';
    send(tab.id, type);
});

chrome.commands.onCommand.addListener(async (command) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id == null) return;
    if (command === 'perde-mask-field') send(tab.id, 'perde:mask-field');
    else if (command === 'perde-decode') send(tab.id, 'perde:decode-selection');
});

function send(tabId, type) {
    chrome.tabs.sendMessage(tabId, { type }, () => void chrome.runtime.lastError);
}

// ─── Mesajlar ────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
    if (!msg) return;

    if (msg.type === 'perde:store-map') {
        storeMap(msg.host, msg.entries).then(() => respond({ ok: true }));
        return true;
    }

    if (msg.type === 'perde:get-map') {
        getMap(msg.host).then(entries => respond({ entries }));
        return true;
    }

    if (msg.type === 'perde:clear-maps') {
        chrome.storage.session.clear().then(() => respond({ ok: true }));
        return true;
    }

    if (msg.type === 'perde:stat') {
        bumpStat(msg.masked || 0).then(() => respond({ ok: true }));
        return true;
    }

    if (msg.type === 'perde:open-options') {
        chrome.tabs.create({ url: chrome.runtime.getURL('src/popup.html?full=1') });
        respond({ ok: true });
        return true;
    }

    if (msg.type === 'perde:map-count') {
        getMap(msg.host).then(entries => respond({ count: entries.length }));
        return true;
    }
});

// ─── Token haritası (oturum belleği) ─────────────────────────────────────────

function mapKey(host) {
    return 'map:' + String(host || '').replace(/^www\./, '').toLowerCase();
}

async function storeMap(host, entries) {
    if (!Array.isArray(entries) || !entries.length) return;
    const key = mapKey(host);
    const cur = await chrome.storage.session.get(key);
    const merged = new Map(cur[key] || []);
    for (const [token, value] of entries) merged.set(token, value);
    // En eski kayıtları düşürerek sınırda tut
    let list = [...merged.entries()];
    if (list.length > MAP_LIMIT) list = list.slice(list.length - MAP_LIMIT);
    await chrome.storage.session.set({ [key]: list });
}

async function getMap(host) {
    const key = mapKey(host);
    const cur = await chrome.storage.session.get(key);
    return cur[key] || [];
}

// ─── Sayaç (sadece toplam; hiçbir içerik tutulmaz) ───────────────────────────

async function bumpStat(n) {
    const { stats } = await chrome.storage.local.get('stats');
    const s = stats || { masked: 0, since: new Date().toISOString().slice(0, 10) };
    s.masked += n;
    await chrome.storage.local.set({ stats: s });
}

// ─── Kullanıcının eklediği ek siteler ────────────────────────────────────────
//
// manifest'teki liste sabit; kullanıcı popup'tan başka bir site eklerse izin
// istenir ve content script o origin için çalışma zamanında kaydedilir.

const DYNAMIC_ID = 'perde-dynamic';

async function syncDynamicSites() {
    const { extraSites } = await chrome.storage.local.get('extraSites');
    const sites = Array.isArray(extraSites) ? extraSites : [];
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [DYNAMIC_ID] })
        .catch(() => []);
    if (existing.length) {
        await chrome.scripting.unregisterContentScripts({ ids: [DYNAMIC_ID] }).catch(() => {});
    }
    if (!sites.length) return;

    const matches = sites.map(h => 'https://' + h + '/*');
    const granted = await chrome.permissions.contains({ origins: matches }).catch(() => false);
    if (!granted) return;

    await chrome.scripting.registerContentScripts([{
        id: DYNAMIC_ID,
        matches,
        js: [
            'engine/dictionaries.js',
            'engine/recognizers.js',
            'engine/ner-engine.js',
            'engine/ai-workflow.js',
            'src/policy.js',
            'src/ui.js',
            'src/content.js',
        ],
        runAt: 'document_idle',
    }]).catch(err => console.warn('[Perde] dinamik kayıt başarısız:', err));
}

chrome.runtime.onStartup.addListener(syncDynamicSites);
chrome.runtime.onInstalled.addListener(syncDynamicSites);
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.extraSites) syncDynamicSites();
});
