// Perde Eklenti — sayfa üstü arayüz (shadow DOM)
//
// Panel ve rozet, sayfanın CSS'inden tamamen yalıtılmak için bir shadow root
// içinde yaşar. ChatGPT/Claude gibi siteler agresif global stiller uyguluyor;
// shadow DOM olmadan panel her sitede farklı görünürdü.
//
// Bu dosya yalnızca çizim yapar — hangi metnin maskeleneceğine content.js karar verir.

const PERDE_UI_CSS = `
:host { all: initial; }
* { margin: 0; padding: 0; box-sizing: border-box; }
.wrap {
  position: fixed; z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 13px; line-height: 1.5; color: #22211e;
  -webkit-font-smoothing: antialiased;
}

/* ─── Yazarken çıkan küçük rozet ─── */
.badge {
  display: flex; align-items: center; gap: 6px;
  background: #1a1917; color: #fff;
  padding: 5px 9px; border-radius: 7px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.22);
  cursor: pointer; user-select: none;
  font-size: 12px; font-weight: 500;
  border: none; transition: opacity .12s;
}
.badge:hover { opacity: .88; }
.badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #e0a33e; flex: none; }

/* ─── Panel ─── */
.panel {
  width: 420px; max-width: calc(100vw - 24px);
  background: #fff; border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.08),
              0 0 0 1px rgba(0,0,0,0.05);
  overflow: hidden;
  display: flex; flex-direction: column;
  max-height: min(78vh, 620px);
  animation: perde-in .16s cubic-bezier(.2,.8,.3,1);
}
@keyframes perde-in {
  from { opacity: 0; transform: translateY(6px) scale(.985); }
  to   { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) { .panel, .toast { animation: none; } }

.head {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 14px; background: #1a1917; color: #fff; flex: none;
}
.head .title { font-size: 12.5px; font-weight: 600; letter-spacing: -0.01em; }
.head .spacer { flex: 1; }
.head .x {
  background: none; border: none; color: rgba(255,255,255,0.5);
  cursor: pointer; font-size: 17px; line-height: 1;
  padding: 2px 5px; border-radius: 4px;
}
.head .x:hover { color: #fff; background: rgba(255,255,255,0.12); }
.lockicon { width: 13px; height: 13px; flex: none; }

.sub {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: #f7f6f3;
  border-bottom: 1px solid #eae9e5; flex: none;
  font-size: 12px; color: #5a5850;
}
.sub .count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; padding: 0 6px; flex: none;
  background: #1a1917; color: #fff; border-radius: 10px;
  font-size: 11.5px; font-weight: 600; font-variant-numeric: tabular-nums;
}
.sub .types { flex: 1; min-width: 0; }
.sub b { color: #22211e; font-weight: 600; }

.list { overflow-y: auto; flex: 1; min-height: 0; }
.list::-webkit-scrollbar { width: 10px; }
.list::-webkit-scrollbar-thumb {
  background: #dddcd7; border-radius: 5px; border: 3px solid #fff;
}
.list::-webkit-scrollbar-thumb:hover { background: #c8c7c1; }

.row {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 9px 14px; border-bottom: 1px solid #f2f1ed;
  cursor: pointer; transition: background .1s;
}
.row:last-child { border-bottom: none; }
.row:hover { background: #faf9f6; }
.row input {
  margin: 1px 0 0; flex: none; width: 15px; height: 15px;
  accent-color: #1a1917; cursor: pointer;
}
.row .body { flex: 1; min-width: 0; }
.row .val {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; line-height: 1.4; word-break: break-word; color: #22211e;
}
.row.open .val { text-decoration: line-through; text-decoration-color: #c4c2bb; color: #96948c; }
.row .meta {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: #96948c; margin-top: 3px;
}
.row .tag {
  display: inline-block; font-size: 10px; font-weight: 600;
  letter-spacing: .01em; background: #edece7; color: #4a4842;
  padding: 2px 6px; border-radius: 4px; flex: none;
}
.row.low .tag { background: #fdf3e3; color: #8a6420; }

/* Güven çubuğu — yüzdeyi okumaktan daha hızlı taranıyor.
   3px'te tire gibi görünüyordu; 5px + belirgin oluk daha okunur. */
.row .bar {
  width: 40px; height: 5px; border-radius: 3px; background: #e4e3dd;
  overflow: hidden; flex: none;
}
.row .bar i {
  display: block; height: 100%; border-radius: 3px;
  background: #6f9179; min-width: 3px;
}
.row.low .bar i { background: #cf9a3f; }
.row.open .bar i { background: #c4c2bb; }
.row .pct {
  font-variant-numeric: tabular-nums; min-width: 30px;
  color: #7d7b74;
}
.row .openflag { color: #a63d2f; font-weight: 600; }

.warn {
  display: flex; gap: 7px; align-items: flex-start;
  padding: 10px 14px; background: #fdf9f0; color: #7a5a18;
  font-size: 11.5px; line-height: 1.45; border-top: 1px solid #f0e3c8; flex: none;
}
.warn.risk { background: #fdf0ee; color: #8a3428; border-top-color: #f2d4cf; }
.warn .ico { flex: none; font-weight: 700; opacity: .75; }

.foot {
  display: flex; align-items: center; gap: 8px;
  padding: 11px 14px; border-top: 1px solid #eae9e5; flex: none;
  background: #fbfaf8;
}
.foot .spacer { flex: 1; }
button.b {
  font-family: inherit; font-size: 12.5px; font-weight: 500;
  padding: 8px 14px; border-radius: 8px; cursor: pointer;
  white-space: nowrap;                 /* "Olduğu gibi yapıştır" iki satıra kırılmasın */
  border: 1px solid #dddcd7; background: #fff; color: #22211e;
  transition: background .12s, border-color .12s, box-shadow .12s;
}
button.b:hover { background: #f4f3f0; border-color: #cfcec8; }
button.b:focus-visible { outline: 2px solid #4a6fa5; outline-offset: 1px; }
button.b.primary {
  background: #1a1917; color: #fff; border-color: #1a1917;
  box-shadow: 0 1px 2px rgba(0,0,0,0.12);
}
button.b.primary:hover { background: #333230; border-color: #333230; }
button.b.ghost { border-color: transparent; background: none; color: #5a5850; padding: 8px 10px; }
button.b.ghost:hover { background: #efeee9; }

/* Tümünü seç/bırak satırı */
.bulk {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 14px; border-bottom: 1px solid #f2f1ed; flex: none;
  font-size: 11.5px; color: #96948c;
}
.bulk button {
  font-family: inherit; font-size: 11.5px; font-weight: 500;
  background: none; border: none; padding: 0; cursor: pointer;
  color: #5a5850; text-decoration: underline;
  white-space: nowrap; flex: none;
}
.bulk > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bulk button:hover { color: #22211e; }
.bulk .spacer { flex: 1; }

/* ─── Kısa bildirim (sessiz mod) ─── */
.toast {
  display: flex; align-items: center; gap: 9px;
  background: #1a1917; color: #fff;
  padding: 10px 14px; border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06);
  font-size: 12.5px; max-width: 340px;
  animation: perde-in .16s cubic-bezier(.2,.8,.3,1);
}
.toast .u {
  background: none; border: none; color: #9fc3f5; cursor: pointer;
  font: inherit; font-weight: 600; text-decoration: underline; padding: 0;
  flex: none;
}

/* ─── Çözülmüş metin ─── */
.decoded {
  padding: 11px 13px; overflow-y: auto; flex: 1; min-height: 0;
  font-size: 12.5px; white-space: pre-wrap; word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.decoded mark { background: #dbeafe; color: #1e3a5f; border-radius: 3px; padding: 0 2px; }
`;

const PERDE_LOCK_SVG =
    '<svg class="lockicon" viewBox="0 0 32 32" fill="none" aria-hidden="true">' +
    '<rect x="4" y="14" width="24" height="16" rx="3" fill="currentColor"/>' +
    '<path d="M10 14V10a6 6 0 0 1 12 0v4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
    '</svg>';

function perdeEsc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Tek bir shadow host'u paylaşır; her çizimde içi temizlenir.
const PerdeUI = (() => {
    let host = null, root = null, wrap = null;
    let onDismiss = null;
    // O an ne gösteriliyor: 'badge' | 'panel' | 'toast' | 'decoded' | null.
    // Yalnızca 'badge' bir alana yapışık olduğu için kaydırmada kapanır; panel,
    // bildirim ve çözülmüş metin kapanmaz — yoksa akan bir sohbet sayfasında
    // (ChatGPT cevap yazarken sürekli kaydırıyor) kullanıcının gözü önünden
    // silinirler.
    let kind = null;

    function ensure() {
        if (host && host.isConnected) return;
        host = document.createElement('div');
        host.id = 'perde-ext-root';
        // Sayfa akışını hiç etkilememesi için host'un kendisi sıfır boyutlu
        host.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647';
        root = host.attachShadow({ mode: 'closed' });
        const style = document.createElement('style');
        style.textContent = PERDE_UI_CSS;
        root.appendChild(style);
        wrap = document.createElement('div');
        wrap.className = 'wrap';
        root.appendChild(wrap);
        (document.body || document.documentElement).appendChild(host);
    }

    function clear() {
        if (wrap) wrap.innerHTML = '';
        if (wrap) wrap.style.cssText = '';
        onDismiss = null;
        kind = null;
    }

    function hide() {
        clear();
        if (host && host.isConnected) host.remove();
        host = null; root = null; wrap = null;
    }

    // Panel/rozeti hedef alanın yakınına, ekran dışına taşmayacak şekilde koyar.
    function placeNear(el, w, h) {
        const pad = 8;
        let top, left;
        const r = el && el.getBoundingClientRect && el.getBoundingClientRect();
        if (r && r.width) {
            top = r.top - h - pad;
            if (top < pad) top = Math.min(r.bottom + pad, window.innerHeight - h - pad);
            left = r.left;
        } else {
            top = window.innerHeight - h - 24;
            left = window.innerWidth - w - 24;
        }
        left = Math.max(pad, Math.min(left, window.innerWidth - w - pad));
        top = Math.max(pad, Math.min(top, window.innerHeight - h - pad));
        wrap.style.top = Math.round(top) + 'px';
        wrap.style.left = Math.round(left) + 'px';
    }

    function centerBottom(w, h) {
        wrap.style.top = Math.max(8, window.innerHeight - h - 24) + 'px';
        wrap.style.left = Math.max(8, Math.round((window.innerWidth - w) / 2)) + 'px';
    }

    // ── Yazarken rozet ──
    function showBadge(anchorEl, text, onClick) {
        ensure(); clear(); kind = 'badge';
        const b = document.createElement('button');
        b.className = 'badge';
        b.innerHTML = '<span class="dot"></span><span>' + perdeEsc(text) + '</span>';
        b.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
        b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); onClick(); });
        wrap.appendChild(b);
        placeNear(anchorEl, 190, 30);
    }

    // ── Onay paneli ──
    // opts: { anchorEl, items, groups, mode:'paste'|'field', styleName,
    //         onConfirm(keptIndices), onCancel(), onSettings() }
    function showPanel(opts) {
        ensure(); clear(); kind = 'panel';
        const kept = new Set();
        const p = document.createElement('div');
        p.className = 'panel';

        const isPaste = opts.mode === 'paste';
        const actionLabel = isPaste ? 'Maskeli yapıştır' : 'Maskele';
        const cancelLabel = isPaste ? 'Olduğu gibi yapıştır' : 'Vazgeç';

        p.innerHTML =
            '<div class="head">' + PERDE_LOCK_SVG +
                '<span class="title">Perde — ' + (isPaste ? 'yapıştırma kontrolü' : 'alan kontrolü') + '</span>' +
                '<span class="spacer"></span>' +
                '<button class="x" data-act="close" title="Kapat (Esc)">&times;</button>' +
            '</div>' +
            '<div class="sub">' +
                '<span class="count" data-role="count">' + opts.items.length + '</span>' +
                '<span class="types">' + perdeEsc(opts.summaryText) + '</span>' +
            '</div>' +
            '<div class="bulk">' +
                '<span data-role="bulkinfo">Tümü maskelenecek</span>' +
                '<span class="spacer"></span>' +
                '<button data-act="all">tümünü maskele</button>' +
                '<span>·</span>' +
                '<button data-act="none">tümünü açık bırak</button>' +
            '</div>' +
            '<div class="list"></div>' +
            '<div class="warn" data-role="warn"></div>' +
            '<div class="foot">' +
                '<button class="b ghost" data-act="settings" title="Ayarlar">Ayarlar</button>' +
                '<span class="spacer"></span>' +
                '<button class="b" data-act="cancel">' + perdeEsc(cancelLabel) + '</button>' +
                '<button class="b primary" data-act="ok">' + perdeEsc(actionLabel) + '</button>' +
            '</div>';

        const list = p.querySelector('.list');
        const boxes = [];

        opts.items.forEach(it => {
            const low = it.score != null && it.score < 0.5;
            const pct = it.score != null ? Math.round(it.score * 100) : null;
            const row = document.createElement('label');
            row.className = 'row' + (low ? ' low' : '');
            row.innerHTML =
                '<input type="checkbox" checked>' +
                '<span class="body">' +
                    '<span class="val">' + perdeEsc(it.value) + '</span>' +
                    '<span class="meta">' +
                        '<span class="tag">' + perdeEsc(it.label) + '</span>' +
                        (pct != null
                            ? '<span class="bar"><i style="width:' + pct + '%"></i></span>' +
                              '<span class="pct">%' + pct + '</span>'
                            : '') +
                        (low ? '<span>düşük güven</span>' : '') +
                        '<span class="openflag" data-role="flag" hidden>açık gidecek</span>' +
                    '</span>' +
                '</span>';
            const cb = row.querySelector('input');
            const flag = row.querySelector('[data-role="flag"]');
            boxes.push(cb);
            cb.addEventListener('change', () => {
                if (cb.checked) kept.delete(it.index); else kept.add(it.index);
                row.classList.toggle('open', !cb.checked);
                flag.hidden = cb.checked;
                refresh();
            });
            list.appendChild(row);
        });

        const warn = p.querySelector('[data-role="warn"]');
        const countEl = p.querySelector('[data-role="count"]');
        const bulkInfo = p.querySelector('[data-role="bulkinfo"]');

        function refresh() {
            const maskCount = opts.items.length - kept.size;
            countEl.textContent = maskCount;
            // Kısa tutuluyor: uzun metin toplu seçim satırını iki satıra kırıyordu
            bulkInfo.textContent = kept.size === 0
                ? 'Tümü maskelenecek'
                : maskCount + '/' + opts.items.length + ' maskelenecek';

            if (kept.size > 0) {
                warn.className = 'warn risk';
                warn.innerHTML = '<span class="ico">!</span><span>' + kept.size +
                    ' veri <b>açık</b> gidecek — işaretini kaldırdığın satırlar ' +
                    'gerçek haliyle karşı tarafa ulaşır.</span>';
            } else {
                warn.className = 'warn';
                warn.innerHTML = '<span class="ico">i</span><span>' +
                    'Otomatik tespit eksik kalabilir; listeyi kendin de gözden geçir. ' +
                    (opts.styleName === 'token'
                        ? 'Cevabı Alt+Shift+D ile çözebilirsin.'
                        : 'Bu stil geri çevrilemez.') +
                    '</span>';
            }
        }
        refresh();

        function setAll(checked) {
            kept.clear();
            boxes.forEach((cb, i) => {
                cb.checked = checked;
                const row = cb.closest('.row');
                row.classList.toggle('open', !checked);
                row.querySelector('[data-role="flag"]').hidden = checked;
                if (!checked) kept.add(opts.items[i].index);
            });
            refresh();
        }

        p.addEventListener('click', e => {
            const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
            if (!act) return;
            e.preventDefault(); e.stopPropagation();
            if (act === 'ok') opts.onConfirm(kept);
            else if (act === 'cancel') opts.onCancel();
            else if (act === 'close') { hide(); if (opts.onClose) opts.onClose(); }
            else if (act === 'settings') opts.onSettings();
            else if (act === 'all') setAll(true);
            else if (act === 'none') setAll(false);
        });
        // Panelde tıklamak sayfanın odağını kaçırmasın (editörler odağı kaybedince
        // state bozuyor); onay kutuları ve düğmeler hariç.
        p.addEventListener('mousedown', e => {
            const t = e.target;
            if (t.tagName !== 'INPUT' && t.tagName !== 'BUTTON' && !t.closest('label.row')) {
                e.preventDefault();
            }
        });

        wrap.appendChild(p);
        const h = Math.min(p.offsetHeight || 340, Math.round(window.innerHeight * 0.78));
        placeNear(opts.anchorEl, 420, h);
        onDismiss = opts.onCancel ? () => { hide(); if (opts.onClose) opts.onClose(); } : null;
        return p;
    }

    // ── Sessiz modda kısa bildirim ──
    function showToast(text, undoLabel, onUndo, ms) {
        ensure(); clear(); kind = 'toast';
        const t = document.createElement('div');
        t.className = 'toast';
        t.innerHTML = PERDE_LOCK_SVG + '<span>' + perdeEsc(text) + '</span>';
        if (undoLabel) {
            const u = document.createElement('button');
            u.className = 'u';
            u.textContent = undoLabel;
            u.addEventListener('mousedown', e => e.preventDefault());
            u.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); hide(); onUndo(); });
            t.appendChild(u);
        }
        wrap.appendChild(t);
        centerBottom(330, 40);
        const timer = setTimeout(() => { if (wrap && wrap.contains(t)) hide(); }, ms || 5000);
        return () => clearTimeout(timer);
    }

    // ── Çözülmüş metin paneli ──
    function showDecoded(result, onCopy) {
        ensure(); clear(); kind = 'decoded';
        const p = document.createElement('div');
        p.className = 'panel';
        const leftover = result.leftover && result.leftover.length;
        p.innerHTML =
            '<div class="head">' + PERDE_LOCK_SVG +
                '<span class="title">Perde — çözülmüş metin</span>' +
                '<span class="spacer"></span>' +
                '<button class="x" data-act="close" title="Kapat">&times;</button>' +
            '</div>' +
            '<div class="sub"><b>' + result.resolved + '</b> token gerçek değerine çevrildi' +
                (result.total ? ' (haritada ' + result.total + ' token var)' : '') + '</div>' +
            '<div class="decoded"></div>' +
            (leftover
                ? '<div class="warn risk">' + leftover + ' token çözülemedi: ' +
                  perdeEsc(result.leftover.slice(0, 6).join(', ')) +
                  ' — model bozmuş olabilir, elle kontrol et.</div>'
                : '') +
            '<div class="foot"><span class="spacer"></span>' +
                '<button class="b primary" data-act="copy">Kopyala</button></div>';

        p.querySelector('.decoded').textContent = result.text;
        p.addEventListener('click', e => {
            const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
            if (act === 'close') hide();
            else if (act === 'copy') { onCopy(result.text); hide(); }
        });
        wrap.appendChild(p);
        const h = Math.min(p.offsetHeight || 380, Math.round(window.innerHeight * 0.78));
        centerBottom(420, h);
    }

    function dismissOutside() { if (onDismiss) onDismiss(); else hide(); }
    function isOpen() { return !!(host && host.isConnected && wrap && wrap.childElementCount); }
    function currentKind() { return isOpen() ? kind : null; }
    // Kaydırma/yeniden boyutlandırmada yalnızca alana yapışık rozeti kapat.
    function hideAnchoredHint() { if (kind === 'badge') hide(); }

    return { showBadge, showPanel, showToast, showDecoded, hide, isOpen,
             dismissOutside, currentKind, hideAnchoredHint };
})();
