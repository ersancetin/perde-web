// Perde Eklenti — saf karar mantığı (DOM'suz, birim testli)
//
// Bu dosya eklentinin "ne maskelenecek, ne maskelenmeyecek" kararlarını tutar.
// DOM'a veya chrome.* API'lerine dokunmaz; content.js ve popup.js bunu çağırır,
// extension/test.js de doğrudan node içinde yükleyip test eder.
//
// Motor dosyaları (dictionaries/recognizers/ner-engine/ai-workflow) kök dizinden
// tools/sync-engine.js ile kopyalanır — tek kaynak kökte kalır, burada kopya tutulmaz.

// ─── Profiller ───────────────────────────────────────────────────────────────
//
// Web'de rastgele metin (kod parçası, sohbet, İngilizce prose) yapıştırılır.
// Bu türler genel metinde sürekli tetiklendiği ve tek başına kimliklendirici
// olmadığı için varsayılan profillerin hiçbirinde yok:
const EXT_LOW_SIGNAL = [
    'URL', 'DOMAIN', 'DATE_TIME', 'TIME',
];

// Bunlar hukuk metninde kimliklendiricidir ama günlük sohbette gürültüdür
// (ör. "45.000 TL", "avukat", "35 yaşında"). Yalnızca "hukuk" profilinde açılır.
const EXT_CONTEXT_ONLY = [
    'COURT', 'NOTARY', 'LOCATION', 'CONTEXTUAL_DATE', 'LEGAL_CITATION',
    'MONETARY_AMOUNT', 'SALARY_AMOUNT', 'OCCUPATION', 'AGE', 'GENDER',
    'NATIONALITY', 'MARITAL_STATUS', 'EDUCATION_LEVEL', 'MILITARY_STATUS',
    'BIRTH_PLACE',
];

const EXT_PROFILES = {
    guvenli: {
        label: 'Güvenli',
        hint: 'Doğrudan kimliklendiriciler: TC, IBAN, telefon, e-posta, kişi, kurum, adres, sağlık. Günlük sohbette yanlış alarm vermez.',
        exclude: EXT_LOW_SIGNAL.concat(EXT_CONTEXT_ONLY),
    },
    hukuk: {
        label: 'Hukuk',
        hint: 'Güvenli profil + mahkeme, dosya no, tutar, tarih, meslek gibi dava metnini kimliklendiren alanlar.',
        exclude: EXT_LOW_SIGNAL,
    },
    tumu: {
        label: 'Tümü',
        hint: 'Motorun bildiği 102 türün hepsi. En kapsamlı, en gürültülü — URL ve tarihler de maskelenir.',
        exclude: [],
    },
};

const EXT_DEFAULT_SETTINGS = {
    enabled: true,
    profile: 'guvenli',
    // 'preview' → yapıştırmayı durdur, listeyi göster, kullanıcı onaylasın
    // 'silent'  → sormadan maskele, sadece kısa bir bildirim göster
    mode: 'preview',
    // 'token' → [KISI_1] (geri çevrilebilir), 'label' → <Kişi>, 'star' → ****
    style: 'token',
    threshold: 0.4,
    minLength: 12,
    typingHints: true,
    disabledEntities: [],
    perSite: {},
};

// Profil + kullanıcının kapattığı türlerden nihai açık tür kümesini üretir.
function extResolveEntities(settings, allEntities) {
    const profile = EXT_PROFILES[settings && settings.profile] || EXT_PROFILES.guvenli;
    const excluded = new Set(profile.exclude);
    for (const e of (settings && settings.disabledEntities) || []) excluded.add(e);
    const out = new Set();
    for (const e of allEntities) if (!excluded.has(e)) out.add(e);
    return out;
}

// ─── Site kapsamı ────────────────────────────────────────────────────────────

// "https://chatgpt.com/c/abc" -> "chatgpt.com" (www. atılır)
function extHostOf(url) {
    try {
        return String(new URL(url).hostname).replace(/^www\./, '').toLowerCase();
    } catch (_) {
        return '';
    }
}

function extSiteEnabled(settings, host) {
    if (!settings || !settings.enabled) return false;
    const per = settings.perSite || {};
    const h = String(host || '').replace(/^www\./, '').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(per, h)) return per[h] !== false;
    // Üst alan adı kaydı varsa onu miras al (ör. "google.com" -> "gemini.google.com")
    const parts = h.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
        const parent = parts.slice(i).join('.');
        if (Object.prototype.hasOwnProperty.call(per, parent)) return per[parent] !== false;
    }
    return true;
}

// ─── Bulgu seçimi ────────────────────────────────────────────────────────────

// Yapıştırılan metni maskelemeye değer mi? (çok kısa metinde ve bulgu yoksa karışma)
function extShouldIntercept(text, findings, settings) {
    const s = settings || EXT_DEFAULT_SETTINGS;
    if (!text || text.length < (s.minLength || 0)) return false;
    return findings.length > 0;
}

// Aynı yeri kaplayan bulguları teke indirir (buildPseudonymized ile aynı kural):
// soldan sağa, çakışanlarda yüksek skorlu kazanır.
function extDedupe(findings) {
    const sorted = [...findings]
        .map((f, i) => ({ ...f, _i: i }))
        .sort((a, b) => a.start - b.start || b.score - a.score);
    const out = [];
    for (const f of sorted) {
        if (!out.length || f.start >= out[out.length - 1].end) out.push(f);
    }
    return out;
}

// Önizleme paneli için: her bulgu tek tek listelenir (kullanıcı tek tek açabilir).
function extSummarize(findings, friendlyLabels) {
    const labels = friendlyLabels || {};
    const items = extDedupe(findings).map(f => ({
        index: f._i,
        entity: f.entity,
        label: labels[f.entity] || f.entity,
        value: f.value,
        score: typeof f.score === 'number' ? f.score : null,
        start: f.start,
        end: f.end,
    }));
    const counts = new Map();
    for (const it of items) counts.set(it.label, (counts.get(it.label) || 0) + 1);
    const groups = [...counts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'tr'));
    return { items, groups, total: items.length };
}

// Kısa özet metni: "3 kişi, 1 TC Kimlik, 1 IBAN"
function extGroupText(groups, limit) {
    const max = limit || 3;
    const shown = groups.slice(0, max).map(g => (g.count > 1 ? g.count + ' ' : '') + g.label);
    const rest = groups.length - shown.length;
    return shown.join(', ') + (rest > 0 ? ' +' + rest : '');
}

// ─── Maskeleme ───────────────────────────────────────────────────────────────

function extStarMask(value) {
    const len = [...value].length;
    if (len <= 4) return '*'.repeat(Math.max(3, len));
    return '*'.repeat(Math.min(len, 12));
}

// Seçili stile göre metni maskeler.
// keptIndices: orijinal findings dizisindeki, AÇIK bırakılacak bulgu indeksleri.
// Döner: { text, map }  — map yalnızca 'token' stilinde doludur (geri çevirim için).
function extMaskText(text, findings, opts) {
    const o = opts || {};
    const style = o.style || 'token';
    const kept = o.keptIndices instanceof Set ? o.keptIndices : new Set(o.keptIndices || []);
    const isKept = (i) => kept.has(i);

    if (style === 'token') {
        // Token üretimini ai-workflow.js'e devrediyoruz ki web uygulamasıyla
        // numaralandırma birebir aynı kalsın (ve deAnonymize onu çözebilsin).
        return buildPseudonymized(text, findings, isKept, o.friendlyLabels, o.entityLabels);
    }

    const labels = o.friendlyLabels || {};
    let out = '', pos = 0;
    for (const f of extDedupe(findings)) {
        out += text.substring(pos, f.start);
        if (isKept(f._i)) {
            out += text.substring(f.start, f.end);
        } else if (style === 'star') {
            out += extStarMask(f.value);
        } else {
            out += '<' + (labels[f.entity] || f.entity) + '>';
        }
        pos = f.end;
    }
    out += text.substring(pos);
    return { text: out, map: new Map() };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EXT_PROFILES, EXT_DEFAULT_SETTINGS, EXT_LOW_SIGNAL, EXT_CONTEXT_ONLY,
        extResolveEntities, extHostOf, extSiteEnabled, extShouldIntercept,
        extDedupe, extSummarize, extGroupText, extMaskText, extStarMask,
    };
}
