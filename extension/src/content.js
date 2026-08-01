// Perde Eklenti — sayfa içi denetleyici
//
// İki iş yapar:
//   1) Yapıştırma yakalama — clipboard metnini yapıştırma DOM'a girmeden analiz eder,
//      kişisel veri varsa yapıştırmayı durdurur ve maskeli halini koyar.
//   2) Yazarken ipucu  — kullanıcı elle yazarken alanı arka planda tarar, bulgu
//      varsa alanın yanında küçük bir rozet gösterir (metne dokunmaz).
//
// Neden yazarken otomatik yeniden yazmıyoruz: kullanıcı yazarken alanın içeriğini
// değiştirmek imleci kaydırır ve React/ProseMirror gibi editörlerin state'ini bozar.
// Bu yüzden yazarken yalnızca ETİKETLERİZ; maskeleme tek tıkla/kısayolla olur.

(() => {
    'use strict';

    if (window.__perdeLoaded) return;
    window.__perdeLoaded = true;

    const ALL_ENTITIES = Object.keys(ENTITY_LABELS);
    const TYPING_DEBOUNCE_MS = 600;
    const MAX_TYPING_LEN = 20000;   // bu boyutun üstünde yazarken taramayı bırak (CPU)
    const MAX_PASTE_LEN = 400000;

    let settings = { ...EXT_DEFAULT_SETTINGS };
    let enabledEntities = extResolveEntities(settings, ALL_ENTITIES);
    let active = true;                  // bu site açık mı
    let typingTimer = null;
    let lastBadgeSig = '';
    let panelOpen = false;

    // ─── Ayarlar ──────────────────────────────────────────────────────────────

    function applySettings(s) {
        // extMigrateSettings: eski profil adlarını ("guvenli") güncel adlara taşır.
        // Service worker kaydı da güncelliyor ama content script daha önce
        // okuyabilir, o yüzden burada da çeviriyoruz.
        settings = extMigrateSettings({ ...EXT_DEFAULT_SETTINGS, ...(s || {}) });
        enabledEntities = extResolveEntities(settings, ALL_ENTITIES);
        active = extSiteEnabled(settings, location.hostname);
        if (!active) hideUI();
    }

    chrome.storage.local.get('settings', res => applySettings(res && res.settings));
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.settings) applySettings(changes.settings.newValue);
    });

    // ─── Hedef alan yardımcıları ──────────────────────────────────────────────

    const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'tel', 'url', 'number', '']);

    function isPlainField(el) {
        if (el instanceof HTMLTextAreaElement) return true;
        if (el instanceof HTMLInputElement) {
            const t = (el.type || '').toLowerCase();
            return TEXT_INPUT_TYPES.has(t);
        }
        return false;
    }

    function isPasswordField(el) {
        return el instanceof HTMLInputElement && (el.type || '').toLowerCase() === 'password';
    }

    // Olayın hedefinden yukarı çıkarak düzenlenebilir alanı bulur.
    function editableFrom(node) {
        let el = node;
        while (el && el !== document.documentElement) {
            if (el.nodeType === 1) {
                if (isPasswordField(el)) return null;              // şifre alanına asla karışma
                if (isPlainField(el)) return el;
                if (el.isContentEditable) {
                    // En dıştaki contenteditable kökünü al (ProseMirror iç düğümleri değil)
                    let root = el;
                    let p = el.parentElement;
                    while (p && p.isContentEditable) { root = p; p = p.parentElement; }
                    return root;
                }
            }
            el = el.parentNode && el.parentNode.host ? el.parentNode.host : el.parentNode;
        }
        return null;
    }

    function fieldText(el) {
        if (isPlainField(el)) return el.value;
        return el.innerText || '';
    }

    // Metni imleç konumuna yazar. execCommand deprecated ama React/ProseMirror'ın
    // duyduğu input olaylarını doğru üreten tek güvenilir yol; başarısız olursa
    // native setter + InputEvent'e düşüyoruz.
    function insertText(el, text) {
        el.focus();
        try {
            if (document.execCommand('insertText', false, text)) return true;
        } catch (_) { /* devam */ }

        if (isPlainField(el)) {
            const start = el.selectionStart != null ? el.selectionStart : el.value.length;
            const end = el.selectionEnd != null ? el.selectionEnd : start;
            const proto = el instanceof HTMLTextAreaElement
                ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
            setter.call(el, el.value.slice(0, start) + text + el.value.slice(end));
            const caret = start + text.length;
            try { el.setSelectionRange(caret, caret); } catch (_) { /* number input */ }
            el.dispatchEvent(new InputEvent('input', {
                bubbles: true, inputType: 'insertText', data: text,
            }));
            return true;
        }

        // contenteditable son çare: seçimi metin düğümüyle değiştir
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            sel.collapseToEnd();
            el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
            return true;
        }
        return false;
    }

    function selectAll(el) {
        el.focus();
        if (isPlainField(el)) { el.select(); return; }
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    function replaceAllText(el, text) {
        selectAll(el);
        return insertText(el, text);
    }

    // ─── Analiz ───────────────────────────────────────────────────────────────

    function analyze(text) {
        try {
            return analyzeText(text, enabledEntities, settings.threshold) || [];
        } catch (err) {
            // Motor patlarsa kullanıcının işini engellemeyelim; sessizce geç.
            console.warn('[Perde] analiz hatası:', err);
            return [];
        }
    }

    function maskOf(text, findings, keptIndices) {
        return extMaskText(text, findings, {
            style: settings.style,
            keptIndices,
            friendlyLabels: FRIENDLY_LABELS,
            entityLabels: ENTITY_LABELS,
        });
    }

    // Token haritasını service worker'a yollar (chrome.storage.session — diske yazılmaz).
    function storeMap(map) {
        if (!map || !map.size) return;
        try {
            chrome.runtime.sendMessage({
                type: 'perde:store-map',
                host: location.hostname,
                entries: [...map.entries()],
            });
        } catch (_) { /* SW uyanmamış olabilir; kritik değil */ }
    }

    function bumpStat(n) {
        try { chrome.runtime.sendMessage({ type: 'perde:stat', masked: n }); } catch (_) {}
    }

    function hideUI() { PerdeUI.hide(); panelOpen = false; lastBadgeSig = ''; }

    // Yalnızca alana yapışık rozeti kaldırır; açık panel/bildirim korunur.
    function clearBadge() { PerdeUI.hideAnchoredHint(); lastBadgeSig = ''; }

    function openSettings() {
        hideUI();
        try { chrome.runtime.sendMessage({ type: 'perde:open-options' }); } catch (_) {}
    }

    // ─── 1) Yapıştırma yakalama ───────────────────────────────────────────────

    document.addEventListener('paste', onPaste, true);

    function onPaste(e) {
        if (!active || panelOpen) return;
        const target = editableFrom(e.target);
        if (!target) return;

        const cd = e.clipboardData;
        if (!cd) return;
        const text = cd.getData('text/plain');
        if (!text || text.length > MAX_PASTE_LEN) return;

        // Analiz preventDefault'tan ÖNCE: motor hata verirse yapıştırma normal aksın.
        const findings = analyze(text);
        if (!extShouldIntercept(text, findings, settings)) return;

        // Buradan sonra yapıştırmayı biz yönetiyoruz.
        e.preventDefault();
        e.stopImmediatePropagation();

        const { items, groups } = extSummarize(findings, FRIENDLY_LABELS);

        if (settings.mode === 'silent') {
            const { text: masked, map } = maskOf(text, findings, new Set());
            insertText(target, masked);
            storeMap(map);
            bumpStat(items.length);
            // Geri alma: alanın yapıştırma SONRASI hali, içindeki maskeli parça
            // orijinaliyle değiştirilip bütün olarak yeniden yazılır.
            const afterPaste = fieldText(target);
            PerdeUI.showToast(
                items.length + ' veri maskelendi: ' + extGroupText(groups, 2),
                'geri al',
                () => replaceAllText(target, afterPaste.split(masked).join(text)),
            );
            return;
        }

        panelOpen = true;
        PerdeUI.showPanel({
            anchorEl: target,
            mode: 'paste',
            items,
            groups,
            summaryText: extGroupText(groups),
            styleName: settings.style,
            onConfirm: (kept) => {
                panelOpen = false; PerdeUI.hide();
                const { text: masked, map } = maskOf(text, findings, kept);
                insertText(target, masked);
                storeMap(map);
                bumpStat(items.length - kept.size);
            },
            onCancel: () => {
                panelOpen = false; PerdeUI.hide();
                insertText(target, text);   // olduğu gibi yapıştır
            },
            onClose: () => { panelOpen = false; },
            onSettings: () => { panelOpen = false; openSettings(); },
        });
    }

    // ─── 2) Yazarken ipucu ────────────────────────────────────────────────────

    document.addEventListener('input', onInput, true);

    function onInput(e) {
        if (!active || !settings.typingHints || panelOpen) return;
        const target = editableFrom(e.target);
        if (!target) return;
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => scanField(target), TYPING_DEBOUNCE_MS);
    }

    function scanField(target) {
        if (!active || panelOpen || !target.isConnected) return;
        // Bekleyen bir tarama zamanlayıcısı, bu arada açılmış bir paneli/bildirimi
        // silmemeli: yalnızca rozet gösteriliyorsa (ya da hiçbir şey yoksa) devam et.
        const showing = PerdeUI.currentKind();
        if (showing && showing !== 'badge') return;

        const text = fieldText(target);
        if (!text || text.length < settings.minLength || text.length > MAX_TYPING_LEN) {
            clearBadge();
            return;
        }
        const findings = analyze(text);
        if (!findings.length) {
            clearBadge();
            return;
        }
        const { items, groups } = extSummarize(findings, FRIENDLY_LABELS);
        const sig = items.length + '|' + items.map(i => i.entity + ':' + i.start).join(',');
        if (sig === lastBadgeSig && PerdeUI.isOpen()) return;
        lastBadgeSig = sig;

        PerdeUI.showBadge(target, extGroupText(groups, 2), () => {
            openFieldPanel(target, text, findings, items, groups);
        });
    }

    function openFieldPanel(target, text, findings, items, groups) {
        panelOpen = true;
        PerdeUI.showPanel({
            anchorEl: target,
            mode: 'field',
            items,
            groups,
            summaryText: extGroupText(groups),
            styleName: settings.style,
            onConfirm: (kept) => {
                panelOpen = false; PerdeUI.hide(); lastBadgeSig = '';
                const { text: masked, map } = maskOf(text, findings, kept);
                replaceAllText(target, masked);
                storeMap(map);
                bumpStat(items.length - kept.size);
            },
            onCancel: () => { panelOpen = false; PerdeUI.hide(); lastBadgeSig = ''; },
            onClose: () => { panelOpen = false; lastBadgeSig = ''; },
            onSettings: () => { panelOpen = false; openSettings(); },
        });
    }

    // ─── Kısayollar / menü komutları ──────────────────────────────────────────

    chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
        if (!msg) return;
        if (msg.type === 'perde:mask-field') { maskFocusedField(); }
        else if (msg.type === 'perde:decode-selection') { decodeSelection(); }
        else if (msg.type === 'perde:ping') { respond({ ok: true, active }); return true; }
    });

    function maskFocusedField() {
        const target = editableFrom(document.activeElement);
        if (!target) {
            PerdeUI.showToast('Önce bir metin alanına tıkla.', null, null, 2500);
            return;
        }
        const text = fieldText(target);
        const findings = analyze(text);
        if (!findings.length) {
            PerdeUI.showToast('Bu alanda kişisel veri bulunamadı.', null, null, 2500);
            return;
        }
        const { items, groups } = extSummarize(findings, FRIENDLY_LABELS);
        openFieldPanel(target, text, findings, items, groups);
    }

    function decodeSelection() {
        const sel = String(window.getSelection() || '');
        if (!sel.trim()) {
            PerdeUI.showToast('Önce çözmek istediğin metni seç.', null, null, 2500);
            return;
        }
        chrome.runtime.sendMessage({ type: 'perde:get-map', host: location.hostname }, res => {
            const entries = (res && res.entries) || [];
            if (!entries.length) {
                PerdeUI.showToast('Bu sitede kayıtlı token yok.', null, null, 3000);
                return;
            }
            const result = deAnonymize(sel, new Map(entries));
            PerdeUI.showDecoded(result, txt => {
                navigator.clipboard.writeText(txt).catch(() => {});
            });
        });
    }

    // ─── Paneli kapatma davranışı ─────────────────────────────────────────────

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && PerdeUI.isOpen()) { hideUI(); }
    }, true);

    // Yalnızca rozet kapanır. Panel/bildirim/çözülmüş metin kaydırmada AÇIK kalır:
    // YZ siteleri cevap akarken sayfayı sürekli kaydırıyor, aksi halde bu paneller
    // kullanıcı okumadan kaybolurdu.
    window.addEventListener('scroll', clearBadge, true);
    window.addEventListener('resize', clearBadge);
})();
