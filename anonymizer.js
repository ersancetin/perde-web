// Perde Web - Anonymizer Engine
// Ported from Microsoft Presidio's anonymizer operators

async function hmacSha256(text, keyBytes) {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
        'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(text));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const SESSION_SALT = crypto.getRandomValues(new Uint8Array(32));

const ANONYMIZE_OPERATORS = {
    replace(finding) {
        return `<${finding.entity}>`;
    },

    mask(finding, maskChar, fromEnd = false) {
        const len = finding.value.length;
        const mc = maskChar || '*';
        if (fromEnd) {
            const keep = Math.min(2, Math.floor(len / 4));
            return finding.value.substring(0, keep) + mc.repeat(len - keep);
        }
        const keep = Math.min(2, Math.floor(len / 4));
        return mc.repeat(len - keep) + finding.value.substring(len - keep);
    },

    redact() {
        return '';
    },

    async hash(finding) {
        const hmac = await hmacSha256(finding.value, SESSION_SALT);
        return hmac.substring(0, 16);
    },

    partial(finding) {
        const val = finding.value;
        const len = val.length;
        if (len <= 4) return '****';
        const showStart = Math.min(2, Math.floor(len / 4));
        const showEnd = Math.min(2, Math.floor(len / 4));
        return val.substring(0, showStart) + '*'.repeat(len - showStart - showEnd) + val.substring(len - showEnd);
    },
};

async function anonymizeText(text, findings, method, maskChar) {
    if (findings.length === 0) return text;

    // Remove findings fully contained within a wider finding of the same or related type
    const filtered = findings.filter(f => {
        return !findings.some(other =>
            other !== f &&
            other.start <= f.start && other.end >= f.end &&
            (other.start !== f.start || other.end !== f.end) &&
            !(f.entity === 'LOCATION' && other.entity === 'ADDRESS')
        );
    });

    // Remove LOCATION findings that are fully contained within an ADDRESS
    const noLocInAddr = filtered.filter(f => {
        if (f.entity === 'LOCATION') {
            return !filtered.some(a => a.entity === 'ADDRESS' && f.start >= a.start && f.end <= a.end);
        }
        return true;
    });

    // Presidio processes in reverse order to preserve positions
    const sorted = [...noLocInAddr].sort((a, b) => b.start - a.start);

    // Merge same-type adjacent entities separated by whitespace (Presidio behavior)
    const merged = mergeAdjacentSameType(sorted);

    let result = text;
    const replaced = [];

    for (const finding of merged) {
        // Skip if this finding overlaps with an already-replaced region
        if (replaced.some(r => finding.start < r.end && finding.end > r.start)) continue;

        let replacement;
        if (method === 'hash') {
            replacement = await ANONYMIZE_OPERATORS.hash(finding);
        } else if (method === 'mask') {
            replacement = ANONYMIZE_OPERATORS.mask(finding, maskChar || '*');
        } else if (method === 'redact') {
            replacement = ANONYMIZE_OPERATORS.redact();
        } else if (method === 'partial') {
            replacement = ANONYMIZE_OPERATORS.partial(finding);
        } else {
            replacement = ANONYMIZE_OPERATORS.replace(finding);
        }
        result = result.substring(0, finding.start) + replacement + result.substring(finding.end);

        const diff = replacement.length - (finding.end - finding.start);
        replaced.push({ start: finding.start, end: finding.end });
        // Adjust positions of already-recorded regions for the length change
        for (const r of replaced) {
            if (r !== replaced[replaced.length - 1] && r.start > finding.start) {
                r.start += diff;
                r.end += diff;
            }
        }
    }

    return result;
}

function mergeAdjacentSameType(findings) {
    // Already sorted reverse by start
    return findings;
}

function createHighlightedDOM(text, findings) {
    const frag = document.createDocumentFragment();
    if (findings.length === 0) {
        frag.appendChild(document.createTextNode(text));
        return frag;
    }

    const sorted = [...findings].sort((a, b) => a.start - b.start || b.score - a.score);
    const deduped = [];
    for (const f of sorted) {
        if (deduped.length === 0 || f.start >= deduped[deduped.length - 1].end) {
            deduped.push(f);
        }
    }
    let lastEnd = 0;

    for (const finding of deduped) {
        if (finding.start > lastEnd) {
            frag.appendChild(document.createTextNode(text.substring(lastEnd, finding.start)));
        }

        const color = ENTITY_COLORS[finding.entity] || '#6b7280';
        const label = ENTITY_LABELS[finding.entity] || finding.entity;
        const scorePercent = Math.round(finding.score * 100);

        const span = document.createElement('span');
        span.className = 'pii-highlight';
        span.style.setProperty('background', color + '20');
        span.style.setProperty('border-color', color);
        span.style.setProperty('color', color);
        span.setAttribute('title', `${label}: ${finding.value} (güven: ${scorePercent}%)`);
        span.textContent = finding.value;
        frag.appendChild(span);

        lastEnd = finding.end;
    }

    if (lastEnd < text.length) {
        frag.appendChild(document.createTextNode(text.substring(lastEnd)));
    }

    return frag;
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
