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
// Profiller kapsamı ARTAN sırada: dar ⊂ dengeli ⊂ tumu. Adlar kapsamı dürüst
// anlatmalı — eski sürümde en DAR profilin adı "Güvenli"ydi ve kullanıcı en
// korumalı seçeneği seçtiğini sanıyordu; oysa yer adlarını hiç maskelemiyordu.
// Bir gizlilik aracında isim, kapsamı olduğundan geniş göstermemeli.

// Genel web metninde sürekli tetiklenen, tek başına kimseyi işaret etmeyen
// türler. Yalnızca "tumu" profilinde açık.
const EXT_LOW_SIGNAL = [
    'URL', 'DOMAIN', 'DATE_TIME', 'TIME',
];

// Zayıf niteleyiciler: tek başlarına kimliklendirici değil, günlük metinde ise
// sürekli tetikleniyorlar ("avukat", "35 yaşında", "evli", "45.000 TL").
// Yargı atfı da (Yargıtay 2. HD 2019/123) kamusal bilgi, kişisel veri değil.
const EXT_WEAK_ATTRS = [
    'AGE', 'GENDER', 'NATIONALITY', 'MARITAL_STATUS', 'OCCUPATION',
    'EDUCATION_LEVEL', 'MILITARY_STATUS', 'MONETARY_AMOUNT', 'LEGAL_CITATION',
];

// "dar" profilinin beyaz listesi: biçiminden tanınan, tartışmasız kimliklendiriciler.
// Burada isim/yer/kurum YOK — dar profil bilerek yalnızca numara ve iletişim bilgisi.
const EXT_HARD_IDS = [
    // TR kimlik & resmi
    'TR_NATIONAL_ID', 'TR_VERGI_NO', 'TR_SGK_NO', 'TR_MERSIS_NO', 'TR_PASAPORT',
    'TR_LICENSE_PLATE', 'FOREIGN_ID', 'RESIDENCE_PERMIT', 'WORK_PERMIT',
    'PENSION_ID', 'MILITARY_ID', 'EDUCATION_ID', 'DRIVER_LICENSE', 'REGISTRY_NO',
    // iletişim
    'PHONE_NUMBER', 'EMAIL_ADDRESS', 'KEP_ADDRESS',
    // finans
    'CREDIT_CARD', 'IBAN_CODE', 'BANK_ACCOUNT_NO', 'BANK_BRANCH_CODE',
    'SWIFT_BIC', 'CRYPTO', 'FINANCIAL_ID',
    // sağlık kimliği
    'MEDICAL_ID', 'MEDICAL_LICENSE',
    // teknik
    'IP_ADDRESS', 'MAC_ADDRESS', 'IMEI', 'DEVICE_ID',
    // uluslararası
    'US_SSN', 'US_ITIN', 'US_PASSPORT', 'US_BANK_NUMBER', 'UK_NHS', 'ES_NIF',
    'DE_TAX_ID', 'FR_INSEE', 'IT_FISCAL_CODE', 'IN_AADHAAR',
];

const EXT_PROFILES = {
    dar: {
        label: 'Dar',
        short: 'yalnızca numaralar',
        hint: 'Yalnızca biçiminden tanınan kesin kimliklendiriciler: TC, IBAN, telefon, ' +
              'e-posta, kart, pasaport, plaka. İsim, yer adı ve kurum MASKELENMEZ.',
        include: EXT_HARD_IDS,
    },
    dengeli: {
        label: 'Dengeli',
        short: 'önerilen',
        hint: 'Dar profil + kişi adı, kurum, yer adı, adres, doğum yeri, sağlık/KVKK ' +
              'verileri, dosya ve mahkeme bilgileri. KVKK açısından kimliklendirici ' +
              'sayılan her şey kapsamda.',
        exclude: EXT_LOW_SIGNAL.concat(EXT_WEAK_ATTRS),
    },
    tumu: {
        label: 'Tümü',
        short: '102 tür',
        hint: 'Motorun bildiği 102 türün hepsi — URL, tarih, saat, tutar, meslek, yaş ' +
              'dahil. En kapsamlı ama en çok yanlış alarm veren seçenek.',
        exclude: [],
    },
};

// Kullanıcının kayıtlı ayarını güncel profil adlarına taşır.
// Eski "guvenli" yer adlarını maskelemiyordu; kullanıcıyı sessizce daha DAR bir
// yerde bırakmamak için geniş tarafa, "dengeli"ye taşıyoruz.
const EXT_PROFILE_ALIASES = {
    guvenli: 'dengeli',   // eski varsayılan — LOCATION/ADDRESS eksikti
    hukuk: 'dengeli',     // eski "hukuk" ≈ yeni dengeli
};

function extMigrateSettings(s) {
    const out = { ...(s || {}) };
    const alias = EXT_PROFILE_ALIASES[out.profile];
    if (alias) out.profile = alias;
    if (!EXT_PROFILES[out.profile]) out.profile = 'dengeli';
    return out;
}

const EXT_DEFAULT_SETTINGS = {
    enabled: true,
    profile: 'dengeli',
    // 'preview' → yapıştırmayı durdur, listeyi göster, kullanıcı onaylasın
    // 'silent'  → sormadan maskele, sadece kısa bir bildirim göster
    mode: 'preview',
    // 'token' → [KISI_1] (geri çevrilebilir), 'label' → <Kişi>, 'star' → ****
    style: 'token',
    threshold: 0.4,
    // Önemsiz kısa metinlerde boşuna çalışmamak için alt sınır. Bu bir GÜVENLİK
    // eşiği DEĞİL — motorun tek başına yakalayabildiği en kısa kimliklendiriciye
    // eşit tutulur (bugün 6: "a@b.co"). Daha yükseğe çekmek doğrudan sızıntı
    // demek: 12 iken çıplak telefon (11 kr) ve kısa e-posta bakılmadan geçiyordu.
    minLength: 6,
    typingHints: true,
    disabledEntities: [],
    perSite: {},
};

// Profil + kullanıcının kapattığı türlerden nihai açık tür kümesini üretir.
// Profil ya beyaz liste (include) ya da kara liste (exclude) tanımlar.
function extResolveEntities(settings, allEntities) {
    const s = extMigrateSettings(settings);
    const profile = EXT_PROFILES[s.profile] || EXT_PROFILES.dengeli;
    const disabled = new Set(s.disabledEntities || []);
    const out = new Set();

    if (profile.include) {
        const allow = new Set(profile.include);
        for (const e of allEntities) if (allow.has(e) && !disabled.has(e)) out.add(e);
        return out;
    }

    const excluded = new Set(profile.exclude);
    for (const e of allEntities) if (!excluded.has(e) && !disabled.has(e)) out.add(e);
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
        EXT_PROFILES, EXT_DEFAULT_SETTINGS, EXT_LOW_SIGNAL, EXT_WEAK_ATTRS,
        EXT_HARD_IDS, EXT_PROFILE_ALIASES, extMigrateSettings,
        extResolveEntities, extHostOf, extSiteEnabled, extShouldIntercept,
        extDedupe, extSummarize, extGroupText, extMaskText, extStarMask,
    };
}
