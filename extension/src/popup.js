// Perde Eklenti — popup denetleyicisi
//
// Varsayılanlar ve profil mantığı policy.js'ten gelir (popup.html motoru da
// yüklüyor), böylece burada ikinci bir kopya tutulmuyor.

const DEFAULTS = EXT_DEFAULT_SETTINGS;
const ALL_ENTITIES = Object.keys(ENTITY_LABELS);

const HINTS = {
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

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Yükleme ─────────────────────────────────────────────────────────────────

async function load() {
    const store = await chrome.storage.local.get(['settings', 'stats']);
    // Eski profil adları ("guvenli"/"hukuk") güncel adlara taşınır
    settings = extMigrateSettings({ ...DEFAULTS, ...(store.settings || {}) });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    host = tab && tab.url ? extHostOf(tab.url) : '';

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

    // Alan adı monospace görünür; "çalışmaz" mesajı normal metin olmalı
    $('host').textContent = host || 'bu sekmede çalışmaz';
    $('host').classList.toggle('site', !!host);
    const siteOn = extSiteEnabled({ ...settings, enabled: true }, host);
    $('siteOn').checked = siteOn && settings.enabled !== false;
    $('siteOn').disabled = !host || settings.enabled === false;
    $('siteHint').textContent = !host
        ? 'Eklenti yalnızca yapay zeka sitelerinde devreye girer.'
        : (siteOn ? 'Bu sitede yapıştırmalar denetleniyor.' : 'Bu site için kapalı.');

    for (const key of ['mode', 'style']) {
        for (const btn of $(key).querySelectorAll('button')) {
            btn.setAttribute('aria-pressed', String(btn.dataset.v === settings[key]));
        }
        $(key + 'Hint').textContent = HINTS[key][settings[key]] || '';
    }

    // Profil: etiketler ve ipuçları policy.js'teki tanımlardan gelir
    for (const btn of $('profile').querySelectorAll('button')) {
        const p = EXT_PROFILES[btn.dataset.v];
        if (p) btn.textContent = p.label;
        btn.setAttribute('aria-pressed', String(btn.dataset.v === settings.profile));
    }
    const prof = EXT_PROFILES[settings.profile] || EXT_PROFILES.dengeli;
    $('profileHint').textContent = prof.hint;
    const open = extResolveEntities(settings, ALL_ENTITIES).size;
    $('coverage').innerHTML = '<b>' + open + '</b> / ' + ALL_ENTITIES.length +
        ' veri türü açık' + (prof.short ? ' — ' + esc(prof.short) : '');

    runProbe();
}

async function save(patch) {
    settings = { ...settings, ...patch };
    await chrome.storage.local.set({ settings });
    render();
}

// ─── "Dene" — mevcut ayarlarla ne yakalanır? ─────────────────────────────────
//
// Kullanıcının en sık sorusu "bunu neden maskelemedi?" ve eklenti bunu
// cevaplayamıyordu: bir şey olmayınca tespit mi yok, profil mi kapatıyor belli
// değildi. Bu alan ikisini ayırt ediyor ve maskeli halini de gösteriyor.

let probeTimer = null;

function runProbe() {
    clearTimeout(probeTimer);
    probeTimer = setTimeout(doProbe, 150);
}

function doProbe() {
    const text = $('probe').value;
    const out = $('probeOut');
    if (!text.trim()) { out.innerHTML = ''; return; }

    const enabled = extResolveEntities(settings, ALL_ENTITIES);
    const findings = safeAnalyze(text, enabled);
    const { items, groups } = extSummarize(findings, FRIENDLY_LABELS);

    // Aynı metni en geniş profille de tara: fark varsa kullanıcıya söyle.
    const widest = extResolveEntities(
        { ...settings, profile: 'tumu', disabledEntities: [] }, ALL_ENTITIES);
    const seen = new Set(items.map(i => i.entity + '@' + i.start));
    const extra = extSummarize(safeAnalyze(text, widest), FRIENDLY_LABELS).items
        .filter(i => !seen.has(i.entity + '@' + i.start));

    let html = '';

    if (!items.length) {
        html += '<div class="none">Bu ayarlarla <b>hiçbir şey maskelenmez</b>' +
            (text.length < settings.minLength
                ? ' — metin ' + settings.minLength + ' karakterden kısa, hiç taranmıyor.'
                : '.') + '</div>';
    } else {
        html += '<div class="probe-sum"><b>' + items.length + '</b> tespit — ' +
            esc(extGroupText(groups, 4)) + '</div>';
        for (const it of items) {
            html += '<div class="probe-hit">' +
                '<span class="t">' + esc(it.label) + '</span>' +
                '<span class="v">' + esc(it.value) + '</span>' +
                '<span class="s">%' + Math.round((it.score || 0) * 100) + '</span>' +
                '</div>';
        }
        const masked = extMaskText(text, findings, {
            style: settings.style,
            friendlyLabels: FRIENDLY_LABELS,
            entityLabels: ENTITY_LABELS,
        });
        html += '<div class="probe-masked">' + esc(masked.text) + '</div>';
    }

    if (extra.length) {
        const labels = [...new Set(extra.map(e => e.label))].slice(0, 4).join(', ');
        html += '<div class="probe-miss">' +
            '<b>Tümü</b> profilinde ' + extra.length + ' tespit daha bulunur: ' +
            esc(labels) + '.' +
            '<button data-act="widen">Tümü profiline geç</button>' +
            '</div>';
    }

    out.innerHTML = html;
}

function safeAnalyze(text, enabled) {
    try {
        return analyzeText(text, enabled, settings.threshold) || [];
    } catch (err) {
        console.warn('[Perde] analiz hatası:', err);
        return [];
    }
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

$('probe').addEventListener('input', runProbe);

// Örnek metin: gerçekçi bir dilekçe cümlesi — kullanıcının kendi verisini
// yazmasını beklemeden ne olduğunu görmesi için. Sentetik, gerçek kişi değil.
const SAMPLE = 'Müvekkilim Ersan Çetin (TC 12345678901), cumayeri mahallesi, ' +
    'düzce adresinde ikamet etmekte olup, Ziraat Bankası ' +
    'TR33 0006 1005 1978 6457 8413 26 hesabına yapılan ödemeye ilişkin ' +
    'ihtarname 0532 123 45 67 numarası üzerinden tebliğ edilmiştir.';

$('probeSample').addEventListener('click', () => {
    $('probe').value = SAMPLE;
    runProbe();
});

$('probeOut').addEventListener('click', e => {
    if (e.target.dataset.act === 'widen') save({ profile: 'tumu' });
});

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
