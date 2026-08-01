// Perde Eklenti — popup denetleyicisi

const DEFAULTS = {
    enabled: true, profile: 'guvenli', mode: 'preview', style: 'token',
    threshold: 0.4, minLength: 6, typingHints: true,
    disabledEntities: [], perSite: {},
};

const HINTS = {
    profile: {
        guvenli: 'Doğrudan kimliklendiriciler: TC, IBAN, telefon, e-posta, kişi, kurum, adres, sağlık verisi. Günlük sohbette yanlış alarm vermez.',
        hukuk: 'Güvenli profil + mahkeme, dosya no, tutar, tarih, meslek gibi dava metnini kimliklendiren alanlar.',
        tumu: 'Motorun bildiği 102 türün hepsi — URL ve tarihler dahil. En kapsamlı, en gürültülü.',
    },
    mode: {
        preview: 'Yapıştırma durur, ne maskeleneceğini görüp onaylarsın. Tek tek satır açabilirsin.',
        silent: 'Sormadan maskeler, köşede kısa bir bildirim ve “geri al” çıkar. Akıcı ama tespit yanlışsa fark etmeyebilirsin.',
    },
    style: {
        token: 'Geri çevrilebilir. Yapay zekânın cevabını Alt+Shift+D ile gerçek isimlere döndürebilirsin.',
        label: 'Okunur ama geri çevrilemez — cevaptaki etiketleri elle eşlemen gerekir.',
        star: 'En sert seçenek. Yapay zeka verinin türünü bile görmez, bu yüzden cevap kalitesi düşebilir.',
    },
};

const $ = id => document.getElementById(id);
let settings = { ...DEFAULTS };
let host = '';

if (new URLSearchParams(location.search).get('full')) document.body.classList.add('full');

// ─── Yükleme ─────────────────────────────────────────────────────────────────

async function load() {
    const store = await chrome.storage.local.get(['settings', 'stats']);
    settings = { ...DEFAULTS, ...(store.settings || {}) };

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
        host = tab && tab.url ? new URL(tab.url).hostname.replace(/^www\./, '').toLowerCase() : '';
    } catch (_) { host = ''; }

    $('statMasked').textContent = (store.stats && store.stats.masked) || 0;
    if (host) {
        chrome.runtime.sendMessage({ type: 'perde:map-count', host }, res => {
            void chrome.runtime.lastError;
            $('statTokens').textContent = (res && res.count) || 0;
        });
    }
    render();
}

function render() {
    $('enabled').checked = settings.enabled !== false;
    $('typingHints').checked = settings.typingHints !== false;

    $('host').textContent = host || 'bu sekmede çalışmaz';
    const per = settings.perSite || {};
    const siteOn = !Object.prototype.hasOwnProperty.call(per, host) || per[host] !== false;
    $('siteOn').checked = siteOn && settings.enabled !== false;
    $('siteOn').disabled = !host || settings.enabled === false;
    $('siteHint').textContent = !host
        ? 'Eklenti yalnızca yapay zeka sitelerinde devreye girer.'
        : (siteOn ? 'Bu sitede yapıştırmalar denetleniyor.' : 'Bu site için kapalı.');

    for (const key of ['mode', 'profile', 'style']) {
        for (const btn of $(key).querySelectorAll('button')) {
            btn.setAttribute('aria-pressed', String(btn.dataset.v === settings[key]));
        }
        $(key + 'Hint').textContent = HINTS[key][settings[key]] || '';
    }
}

async function save(patch) {
    settings = { ...settings, ...patch };
    await chrome.storage.local.set({ settings });
    render();
}

// ─── Olaylar ─────────────────────────────────────────────────────────────────

$('enabled').addEventListener('change', e => save({ enabled: e.target.checked }));
$('typingHints').addEventListener('change', e => save({ typingHints: e.target.checked }));

$('siteOn').addEventListener('change', e => {
    if (!host) return;
    const per = { ...(settings.perSite || {}) };
    if (e.target.checked) delete per[host]; else per[host] = false;
    save({ perSite: per });
});

for (const key of ['mode', 'profile', 'style']) {
    $(key).addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (btn && btn.dataset.v) save({ [key]: btn.dataset.v });
    });
}

$('clearMaps').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'perde:clear-maps' }, () => {
        void chrome.runtime.lastError;
        $('statTokens').textContent = '0';
        const b = $('clearMaps');
        b.textContent = 'Temizlendi';
        setTimeout(() => { b.textContent = 'Token haritasını temizle'; }, 1400);
    });
});

load();
