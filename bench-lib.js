// Perde Web - Ortak değerlendirme/skorlama kütüphanesi
// benchmark.js (co-developed set) ve holdout.js (bağımsız set) tarafından paylaşılır.
// Saf fonksiyonlardır; motoru (analyzeText) ve etiket kümesini (ALL) parametre alır.

function spanIoU(a0, a1, b0, b1) {
    const overlap = Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
    const union = Math.max(a1, b1) - Math.min(a0, b0);
    return union > 0 ? overlap / union : 0;
}

function matchScore(exp, f) {
    if (exp.start !== undefined && f.start !== undefined) {
        const iou = spanIoU(exp.start, exp.end, f.start, f.end);
        return iou > 0.5 ? iou : 0;
    }
    if (f.value === exp.value) return 1;
    if (f.value.includes(exp.value) || exp.value.includes(f.value)) return 0.8;
    return 0;
}

// Tek belgeyi değerlendirir; entity bazında tp/fp/fn ve FN/FP detaylarını döndürür.
// one-to-one eşleşme, position varsa IoU>0.5, yoksa değer eşleşmesi.
function evaluate(doc, analyzeText, ALL) {
    let findings = analyzeText(doc.text, ALL, 0.35);

    const addresses = findings.filter(f => f.entity === 'ADDRESS');
    findings = findings.filter(f => {
        if (f.entity !== 'LOCATION') return true;
        return !addresses.some(a => f.start >= a.start && f.end <= a.end);
    });

    const expected = doc.expected;
    const entityStats = {};
    const usedFindings = new Set();

    for (const exp of expected) {
        if (!entityStats[exp.entity]) entityStats[exp.entity] = { tp: 0, fp: 0, fn: 0, details: [] };
        let bestIdx = -1, bestScore = 0;

        for (let i = 0; i < findings.length; i++) {
            if (usedFindings.has(i)) continue;
            const f = findings[i];
            if (f.entity !== exp.entity) continue;
            const s = matchScore(exp, f);
            if (s > bestScore) { bestIdx = i; bestScore = s; }
        }

        if (bestIdx >= 0) {
            entityStats[exp.entity].tp++;
            usedFindings.add(bestIdx);
        } else {
            entityStats[exp.entity].fn++;
            entityStats[exp.entity].details.push({ type: 'FN', value: exp.value });
        }
    }

    for (let i = 0; i < findings.length; i++) {
        if (usedFindings.has(i)) continue;
        const f = findings[i];
        if (!entityStats[f.entity]) entityStats[f.entity] = { tp: 0, fp: 0, fn: 0, details: [] };
        entityStats[f.entity].fp++;
        entityStats[f.entity].details.push({ type: 'FP', value: f.value, score: f.score });
    }

    return { name: doc.name, category: doc.category, entityStats, totalFindings: findings.length, totalExpected: expected.length };
}

function precision(tp, fp) { return tp + fp === 0 ? 1 : tp / (tp + fp); }
function recall(tp, fn) { return tp + fn === 0 ? 1 : tp / (tp + fn); }
function f1(p, r) { return p + r === 0 ? 0 : 2 * p * r / (p + r); }

module.exports = { spanIoU, matchScore, evaluate, precision, recall, f1 };
