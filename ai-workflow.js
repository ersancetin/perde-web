// Perde Web - AI İş Akışı (geri-döndürülebilir takma adlandırma)
// DOM'a bağlı değildir; saf fonksiyonlardan oluşur ve birim testlerle kapsanır.
// app.js bu fonksiyonları çağırır; ters harita (token -> gerçek değer) yalnızca
// çağıranın belleğinde tutulur, bu dosya hiçbir kalıcı durum tutmaz.

const AIWF_TR_ASCII = { 'ç':'c','Ç':'C','ğ':'g','Ğ':'G','ı':'i','İ':'I','ö':'o','Ö':'O','ş':'s','Ş':'S','ü':'u','Ü':'U' };

// Türkçe etiketi AI turundan sağ çıkan ASCII bir token tabanına çevirir.
// "Kişi" -> "KISI", "Kredi Kartı" -> "KREDI_KARTI"
function asciiToken(s) {
    return String(s).replace(/[çÇğĞıİöÖşŞüÜ]/g, m => AIWF_TR_ASCII[m])
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

// Anonimleştirilmiş metni ([KISI_1] tarzı geri-döndürülebilir token'larla) ve
// ters haritayı üretir. Korunan (kept) bulgular açık bırakılır.
// Token'lar belge genelinde benzersizdir (aynı taban -> artan numara) ve
// aynı değer her yerde aynı token'a eşlenir.
//
// Parametreler:
//   text          : kaynak metin
//   findings      : [{ entity, value, start, end, score }]
//   isKeptFn(i,e) : i. bulgunun (entity e) korunup korunmadığını döndürür
//   friendlyLabels: { ENTITY: 'Okunur Etiket' }  (ASCII tabanı bundan türetilir)
//   entityLabels  : { ENTITY: 'Etiket' }         (friendly yoksa yedek)
function buildPseudonymized(text, findings, isKeptFn, friendlyLabels, entityLabels) {
    friendlyLabels = friendlyLabels || {};
    entityLabels = entityLabels || {};
    const sorted = [...findings].map((f, i) => ({ ...f, _i: i })).sort((a, b) => a.start - b.start || b.score - a.score);
    const deduped = [];
    for (const f of sorted) { if (!deduped.length || f.start >= deduped[deduped.length - 1].end) deduped.push(f); }
    const map = new Map();          // token -> orijinal değer
    const assigned = new Map();      // entity|value -> token (tutarlı tekrar)
    const baseCount = new Map();     // taban -> sayaç (belge geneli benzersizlik)
    let out = '', pos = 0;
    for (const f of deduped) {
        out += text.substring(pos, f.start);
        if (isKeptFn && isKeptFn(f._i, f.entity)) {
            out += text.substring(f.start, f.end);
        } else {
            const key = f.entity + '|' + f.value;
            let token = assigned.get(key);
            if (!token) {
                const base = asciiToken(friendlyLabels[f.entity] || entityLabels[f.entity] || f.entity) || 'VERI';
                const n = (baseCount.get(base) || 0) + 1;
                baseCount.set(base, n);
                token = '[' + base + '_' + n + ']';
                assigned.set(key, token);
                map.set(token, f.value);
            }
            out += token;
        }
        pos = f.end;
    }
    out += text.substring(pos);
    return { text: out, map };
}

// Yapıştırılan YZ cevabındaki token'ları gerçek değerlere çevirir.
// Boşluk/ayraç/büyük-küçük harf toleranslı eşleştirme yapar.
// Döndürür: { text, resolved, total, missed, leftover }
//   resolved : cevapta bulunup geri çevrilen token sayısı
//   missed   : cevapta hiç geçmeyen token'lar (normaldir, uyarı değil)
//   leftover : geri çevrilemeyen ama bizim şekle ([TABAN_sayı]) uyan etiketler (YZ bozmuş)
function deAnonymize(aiText, map) {
    let result = String(aiText), resolved = 0;
    const missed = [];
    for (const [token, value] of map) {
        const inner = token.slice(1, -1); // örn. KISI_1
        const m = inner.match(/^(.*)_(\d+)$/);
        let re;
        if (m) {
            const base = m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/_/g, '[\\s_\\-]*');
            re = new RegExp('\\[\\s*' + base + '[\\s_\\-]*' + m[2] + '\\s*\\]', 'gi');
        } else {
            re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        }
        const before = result;
        result = result.replace(re, () => value); // fonksiyon: değerdeki $ güvenli
        if (result !== before) resolved++; else missed.push(token);
    }
    // Çözülemeden kalan, bizim token şekline ([TABAN_sayı]) uyan etiketleri tespit et
    const leftover = (result.match(/\[[A-Z][A-Z0-9_]*_\d+\]/g) || []);
    return { text: result, resolved, total: map.size, missed, leftover };
}

// "Göndermeden önce son kontrol" özeti: hangi türler maskelenecek, hangi veriler
// açık (kept) gidecek, kaç tane düşük güvenli tespit var.
function reviewSummary(findings, isKeptFn, friendlyLabels, lowThreshold) {
    friendlyLabels = friendlyLabels || {};
    const low = typeof lowThreshold === 'number' ? lowThreshold : 0.5;
    const maskedMap = new Map();
    const openItems = [];
    let lowCount = 0;
    findings.forEach((f, i) => {
        const label = friendlyLabels[f.entity] || f.entity;
        if (isKeptFn && isKeptFn(i, f.entity)) {
            openItems.push({ label, value: f.value, entity: f.entity });
        } else {
            maskedMap.set(label, (maskedMap.get(label) || 0) + 1);
        }
        if (typeof f.score === 'number' && f.score < low) lowCount++;
    });
    const masked = [...maskedMap.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    return {
        masked,
        openItems,
        maskedCount: masked.reduce((s, m) => s + m.count, 0),
        openCount: openItems.length,
        lowCount,
    };
}

// Tespit raporunu metin (txt) veya yapısal (json) olarak üretir.
// UYARI: rapor gerçek kişisel veri içerir; yalnızca yerel kullanım içindir.
function buildReport(findings, isKeptFn, friendlyLabels, format) {
    friendlyLabels = friendlyLabels || {};
    const rows = findings.map((f, i) => ({
        type: f.entity,
        label: friendlyLabels[f.entity] || f.entity,
        value: f.value,
        masked: !(isKeptFn && isKeptFn(i, f.entity)),
        score: typeof f.score === 'number' ? f.score : null,
    }));
    if (format === 'json') {
        return JSON.stringify({
            tool: 'Perde Web',
            warning: 'Bu rapor kişisel veri içerir. Dışarı paylaşmayın; yalnızca yerel kullanım içindir.',
            total: rows.length,
            masked: rows.filter(r => r.masked).length,
            kept: rows.filter(r => !r.masked).length,
            findings: rows,
        }, null, 2);
    }
    const lines = [
        'Perde Web — Tespit Raporu',
        'UYARI: Bu dosya kişisel veri içerir. Yalnızca yerel kullanım içindir.',
        'Toplam tespit: ' + rows.length + ' (maskelenecek: ' + rows.filter(r => r.masked).length +
            ', korunacak: ' + rows.filter(r => !r.masked).length + ')',
        '',
    ];
    for (const r of rows) {
        const tag = r.masked ? '[MASKELENECEK]' : '[KORUNACAK]  ';
        const sc = r.score != null ? '  (güven %' + Math.round(r.score * 100) + ')' : '';
        lines.push(tag + ' ' + r.label + ': ' + r.value + sc);
    }
    return lines.join('\n');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { asciiToken, buildPseudonymized, deAnonymize, reviewSummary, buildReport };
}
