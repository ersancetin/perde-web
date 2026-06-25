// Perde Web v15

const NERWorker = (() => {
    let worker = null, ready = false, counter = 0;
    const pending = new Map();
    function init() {
        if (typeof Worker === 'undefined') return;
        try {
            worker = new Worker('ner-worker.js?v=15.0');
            ready = false;
            worker.onmessage = e => {
                if (e.data.type === 'ready') { ready = true; return; }
                const r = pending.get(e.data.requestId);
                if (!r) return;
                pending.delete(e.data.requestId);
                r.resolve(e.data.type === 'result' ? e.data.findings : []);
            };
            worker.onerror = () => { ready = false; };
        } catch (_) {}
    }
    function analyze(text, enabled, threshold) {
        if (!worker || !ready) return Promise.resolve(analyzeText(text, enabled, threshold));
        const id = ++counter;
        return new Promise(resolve => {
            const t = setTimeout(() => { pending.delete(id); worker.terminate(); init(); resolve(analyzeText(text, enabled, threshold)); }, 15000);
            pending.set(id, { resolve: r => { clearTimeout(t); resolve(r); } });
            worker.postMessage({ type: 'analyze', text, requestId: id, threshold, enabledEntities: [...enabled] });
        });
    }
    init();
    return { analyze };
})();

const SHIELD_SVG = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1L3 3.5v4c0 3.5 2.3 6.8 5 7.5 2.7-.7 5-4 5-7.5v-4L8 1zm-.5 10.3L5 8.8l1-1 1.5 1.5 3.5-3.5 1 1-4.5 4.5z"/></svg>';
const MASK_SVG = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v2H2zM2 7h12v2H2zM2 11h8v2H2z"/></svg>';
const _ED = typeof ENTITY_DESCRIPTIONS !== 'undefined' ? ENTITY_DESCRIPTIONS : {};

const FRIENDLY_LABELS = {
    TR_NATIONAL_ID: 'TC Kimlik', TR_LICENSE_PLATE: 'Plaka', TR_VERGI_NO: 'Vergi No',
    TR_SGK_NO: 'SGK No', TR_MERSIS_NO: 'MERSİS', TR_PASAPORT: 'Pasaport',
    PERSON_NAME: 'Kişi', ORGANIZATION: 'Kurum', LOCATION: 'Konum', ADDRESS: 'Adres',
    PHONE_NUMBER: 'Telefon', EMAIL_ADDRESS: 'E-posta', CREDIT_CARD: 'Kredi Kartı',
    IBAN_CODE: 'IBAN', BANK_ACCOUNT_NO: 'Hesap No', BANK_BRANCH_CODE: 'Şube Kodu',
    IP_ADDRESS: 'IP', URL: 'URL', DATE_TIME: 'Tarih', DOMAIN: 'Alan Adı',
    CASE_NUMBER: 'Dosya No', COURT: 'Mahkeme', NOTARY: 'Noter',
    NOTARY_RECORD: 'Noter Kayıt', DRIVER_LICENSE: 'Ehliyet', CONTEXTUAL_DATE: 'Tarih',
    TIME: 'Saat', AGE: 'Yaş', OCCUPATION: 'Meslek', POLICY_NUMBER: 'Poliçe',
    MEDICAL_ID: 'Sağlık No', INVOICE_NO: 'Fatura No', LICENSE_ID: 'Sicil/Lisans',
    VEHICLE_ID: 'Araç No', EMPLOYEE_ID: 'Personel No', PROPERTY_ID: 'Tapu No',
    INSURANCE_FILE_NO: 'Sigorta Dosya', REGISTRY_NO: 'Nüfus Kayıt',
    GOV_DOCUMENT_ID: 'Resmi Belge', EINVOICE_UUID: 'e-Fatura', CHECK_SERIAL_NO: 'Çek No',
    BARCODE_ID: 'Barkod', ENFORCEMENT_ID: 'İcra No', BARO_SICIL: 'Baro Sicil',
    TRADE_REGISTRY_NO: 'Ticaret Sicil', MEDIATION_NO: 'Arabuluculuk',
    ARBITRATION_NO: 'Tahkim No', WARRANT_NO: 'Tutuklama', PAROLE_ID: 'Denetim No',
    COMMERCIAL_GAZETTE: 'Ticaret Gazetesi', BOND_PROMISSORY: 'Senet/Bono',
    SALARY_AMOUNT: 'Maaş', SWIFT_BIC: 'SWIFT', MAC_ADDRESS: 'MAC', IMEI: 'IMEI',
    USERNAME: 'Kullanıcı Adı', SOCIAL_PROFILE: 'Sosyal Profil', DEVICE_ID: 'Cihaz ID',
    KEP_ADDRESS: 'KEP', CRYPTO: 'Kripto', FINANCIAL_ID: 'Mali No',
    CUSTOMS_DECLARATION: 'Gümrük Beyanı', LETTER_OF_CREDIT: 'Akreditif',
    BILL_OF_LADING: 'Konşimento', GENDER: 'Cinsiyet', NATIONALITY: 'Uyruk',
    MARITAL_STATUS: 'Medeni Hal', BIRTH_PLACE: 'Doğum Yeri',
    EDUCATION_LEVEL: 'Eğitim', MILITARY_STATUS: 'Askerlik', BLOOD_TYPE: 'Kan Grubu',
    HEALTH_CONDITION: 'Sağlık Durumu', RELIGION: 'Din', ETHNICITY: 'Etnisite',
    POLITICAL_VIEW: 'Siyasi Görüş', UNION_MEMBERSHIP: 'Sendika',
    CRIMINAL_RECORD: 'Sabıka', SEXUAL_LIFE: 'Cinsel Yaşam',
    BIOMETRIC_DATA: 'Biyometrik', DISABILITY_STATUS: 'Engellilik',
    US_SSN: 'US SSN', US_ITIN: 'US ITIN', US_PASSPORT: 'US Pasaport',
    US_BANK_NUMBER: 'US Banka', MEDICAL_LICENSE: 'Tıbbi Lisans',
    UK_NHS: 'UK NHS', ES_NIF: 'ES NIF', DE_TAX_ID: 'DE Vergi',
    FR_INSEE: 'FR INSEE', IT_FISCAL_CODE: 'IT Fiskal', IN_AADHAAR: 'IN Aadhaar',
    LEGAL_CITATION: 'Yargı Atfı', MONETARY_AMOUNT: 'Tutar',
    MANUAL: 'Manuel',
};

function escapeHTML(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const inputView = $('inputView');
    const resultsView = $('resultsView');
    const resultsSummary = $('resultsSummary');
    const inputText = $('inputText');
    const outputText = $('outputText');
    const analyzeBtn = $('analyzeBtn');
    const newBtn = $('newBtn');
    const copyBtn = $('copyBtn');
    const downloadBtn = $('downloadBtn');
    const findingsList = $('findingsList');
    const findingsCount = $('findingsCount');
    const entityTogglesEl = $('entityToggles');
    const entityTotalBadge = $('entityTotalBadge');
    const entitySearch = $('entitySearch');
    const profileSelect = $('profileSelect');
    const profileSummary = $('profileSummary');
    const anonymizeMethod = $('anonymizeMethod');
    const scanWarning = $('scanWarning');
    const resultMethod = $('resultMethod');
    const maskChar = $('maskChar');
    const maskCharGroup = $('maskCharGroup');
    const thresholdSlider = $('thresholdSlider');
    const thresholdValue = $('thresholdValue');
    const settingsToggle = $('settingsToggle');
    const settingsPanel = $('settingsPanel');
    const pdfBtn = $('pdfBtn');
    const pdfFileInput = $('pdfFileInput');
    const findingsSearch = $('findingsSearch');
    const findingsFilter = $('findingsFilter');
    const textareaWrap = $('textareaWrap');
    const siteFooter = $('siteFooter');
    const mobileTabs = $('mobileTabs');
    const mobileTabCount = $('mobileTabCount');
    const aiBtn = $('aiBtn');
    const aiPanel = $('aiPanel');
    const aiClose = $('aiClose');
    const promptSelect = $('promptSelect');
    const promptDesc = $('promptDesc');
    const promptOutput = $('promptOutput');
    const promptCopyBtn = $('promptCopyBtn');
    const aiTokenInfo = $('aiTokenInfo');
    const optParty = $('optParty');
    const optLang = $('optLang');
    const optExtra = $('optExtra');
    const aiLegend = $('aiLegend');
    const legendList = $('legendList');
    const legendCount = $('legendCount');
    const aiReview = $('aiReview');
    const aiResponse = $('aiResponse');
    const deanonBtn = $('deanonBtn');
    const deanonResultStep = $('deanonResultStep');
    const deanonOutput = $('deanonOutput');
    const deanonWarn = $('deanonWarn');
    const deanonStats = $('deanonStats');
    const deanonCopyBtn = $('deanonCopyBtn');

    // Mobile tabs
    if (mobileTabs) {
        mobileTabs.addEventListener('click', e => {
            const btn = e.target.closest('.mobile-tab');
            if (!btn) return;
            mobileTabs.querySelectorAll('.mobile-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            const fp = document.querySelector('.findings-panel');
            const op = document.querySelector('.output-panel');
            if (fp) fp.classList.toggle('tab-hidden', tab !== 'findings');
            if (op) op.classList.toggle('tab-hidden', tab !== 'output');
        });
    }

    const PROFILES = {
        temel: ['TR_NATIONAL_ID','TR_LICENSE_PLATE','TR_VERGI_NO','TR_SGK_NO','TR_MERSIS_NO','TR_PASAPORT','PERSON_NAME','ORGANIZATION','LOCATION','ADDRESS','PHONE_NUMBER','EMAIL_ADDRESS','CREDIT_CARD','IBAN_CODE','BANK_ACCOUNT_NO','BANK_BRANCH_CODE','IP_ADDRESS','URL','DATE_TIME','DOMAIN','CASE_NUMBER','COURT','NOTARY','NOTARY_RECORD','DRIVER_LICENSE','CONTEXTUAL_DATE','TIME','LEGAL_CITATION','MONETARY_AMOUNT'],
        hukuk: ['TR_NATIONAL_ID','TR_LICENSE_PLATE','TR_VERGI_NO','TR_SGK_NO','TR_MERSIS_NO','TR_PASAPORT','PERSON_NAME','ORGANIZATION','LOCATION','ADDRESS','AGE','OCCUPATION','PHONE_NUMBER','EMAIL_ADDRESS','IBAN_CODE','BANK_ACCOUNT_NO','DATE_TIME','CONTEXTUAL_DATE','TIME','CASE_NUMBER','POLICY_NUMBER','MEDICAL_ID','INVOICE_NO','LICENSE_ID','VEHICLE_ID','COURT','EMPLOYEE_ID','PROPERTY_ID','NOTARY_RECORD','INSURANCE_FILE_NO','NOTARY','DRIVER_LICENSE','REGISTRY_NO','GOV_DOCUMENT_ID','EINVOICE_UUID','CHECK_SERIAL_NO','BARCODE_ID','ENFORCEMENT_ID','BARO_SICIL','TRADE_REGISTRY_NO','MEDIATION_NO','ARBITRATION_NO','WARRANT_NO','PAROLE_ID','COMMERCIAL_GAZETTE','BOND_PROMISSORY','SALARY_AMOUNT','SWIFT_BIC','LEGAL_CITATION','MONETARY_AMOUNT'],
        finans: ['TR_NATIONAL_ID','TR_VERGI_NO','TR_MERSIS_NO','PERSON_NAME','ORGANIZATION','ADDRESS','PHONE_NUMBER','EMAIL_ADDRESS','CREDIT_CARD','IBAN_CODE','BANK_ACCOUNT_NO','BANK_BRANCH_CODE','SWIFT_BIC','SALARY_AMOUNT','INVOICE_NO','EINVOICE_UUID','CHECK_SERIAL_NO','FINANCIAL_ID','CUSTOMS_DECLARATION','LETTER_OF_CREDIT','BILL_OF_LADING','DATE_TIME','CONTEXTUAL_DATE'],
        saglik: ['TR_NATIONAL_ID','TR_SGK_NO','PERSON_NAME','ADDRESS','PHONE_NUMBER','EMAIL_ADDRESS','DATE_TIME','CONTEXTUAL_DATE','MEDICAL_ID','LICENSE_ID','EMPLOYEE_ID','BLOOD_TYPE','HEALTH_CONDITION','DISABILITY_STATUS','AGE','GENDER'],
        kvkk: ['TR_NATIONAL_ID','PERSON_NAME','ADDRESS','PHONE_NUMBER','EMAIL_ADDRESS','AGE','GENDER','NATIONALITY','MARITAL_STATUS','OCCUPATION','BIRTH_PLACE','EDUCATION_LEVEL','MILITARY_STATUS','BLOOD_TYPE','HEALTH_CONDITION','RELIGION','ETHNICITY','POLITICAL_VIEW','UNION_MEMBERSHIP','CRIMINAL_RECORD','SEXUAL_LIFE','BIOMETRIC_DATA','DISABILITY_STATUS'],
        teknik: ['IP_ADDRESS','URL','DOMAIN','MAC_ADDRESS','IMEI','USERNAME','SOCIAL_PROFILE','DEVICE_ID','KEP_ADDRESS','CRYPTO','EMAIL_ADDRESS'],
        uluslararasi: ['US_SSN','US_ITIN','US_PASSPORT','US_BANK_NUMBER','MEDICAL_LICENSE','UK_NHS','ES_NIF','DE_TAX_ID','FR_INSEE','IT_FISCAL_CODE','IN_AADHAAR','PERSON_NAME','EMAIL_ADDRESS','PHONE_NUMBER','CREDIT_CARD','IBAN_CODE'],
        'tumunu-sec': Object.keys(ENTITY_LABELS),
    };

    const PROFILE_NAMES = {
        temel: 'Temel', hukuk: 'Hukuk', finans: 'Finans', saglik: 'Sağlık',
        kvkk: 'KVKK', teknik: 'Teknik', uluslararasi: 'Uluslararası', 'tumunu-sec': 'Tümü'
    };

    const enabled = new Set(Object.keys(ENTITY_LABELS));
    let threshold = 0.35, lastFindings = [], lastText = '';
    const keptFindings = new Set(), keptTypes = new Set();
    const totalCount = Object.keys(ENTITY_LABELS).length;
    let hashCache = new Map();

    let entityCounter = new Map();
    let lastPdfDoc = null;
    let lastPdfLib = null;
    let lastPdfPageTexts = [];
    let ocrProcessed = false;

    function updateBadge() { entityTotalBadge.textContent = enabled.size + ' / ' + totalCount; }
    function updateProfileSummary() {
        const pName = PROFILE_NAMES[profileSelect.value] || 'Özel';
        profileSummary.textContent = pName + ' · ' + enabled.size + ' entity · ' + threshold.toFixed(2);
    }
    updateBadge();
    updateProfileSummary();

    function buildEntityCounter(findings) {
        entityCounter.clear();
        for (const f of findings) {
            if (!entityCounter.has(f.entity)) entityCounter.set(f.entity, new Map());
            const m = entityCounter.get(f.entity);
            if (!m.has(f.value)) m.set(f.value, m.size + 1);
        }
    }

    function friendlyLabel(entity, value) {
        const base = FRIENDLY_LABELS[entity] || (ENTITY_LABELS[entity] || entity);
        const m = entityCounter.get(entity);
        if (!m) return base;
        const num = m.get(value) || 1;
        return base + ' ' + num;
    }

    // View switching
    function showInput() {
        resultsView.style.display = 'none';
        inputView.style.display = '';
        if (siteFooter) siteFooter.style.display = '';
        lastFindings = []; lastText = '';
        keptFindings.clear(); keptTypes.clear();
        hashCache.clear();
        if (aiPanel) { aiPanel.style.display = 'none'; aiReverseMap.clear(); if (legendList) legendList.innerHTML = ''; }
        lastImageOnlyPages = [];
        lastPdfDoc = null; lastPdfLib = null; lastPdfPageTexts = []; ocrProcessed = false;
        if (scanWarning) scanWarning.style.display = 'none';
        if (findingsSearch) findingsSearch.value = '';
        if (findingsFilter) findingsFilter.value = 'all';
    }

    function showInputKeepText() {
        resultsView.style.display = 'none';
        inputView.style.display = '';
        lastFindings = [];
        keptFindings.clear(); keptTypes.clear();
        hashCache.clear();
        if (aiPanel) { aiPanel.style.display = 'none'; aiReverseMap.clear(); if (legendList) legendList.innerHTML = ''; }
    }

    function showResults() {
        inputView.style.display = 'none';
        if (siteFooter) siteFooter.style.display = 'none';
        resultsView.style.display = '';
        resultsView.style.opacity = '0';
        resultsView.style.transform = 'translateY(20px)';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resultsView.style.transition = 'opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)';
                resultsView.style.opacity = '1';
                resultsView.style.transform = 'translateY(0)';
            });
        });
    }

    newBtn.addEventListener('click', showInputKeepText);

    // Settings toggle
    settingsToggle.addEventListener('click', () => {
        const open = settingsPanel.style.display !== 'none';
        settingsPanel.style.display = open ? 'none' : '';
        settingsToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });

    profileSelect.addEventListener('change', () => {
        const p = PROFILES[profileSelect.value];
        if (!p) return;
        enabled.clear(); p.forEach(e => enabled.add(e));
        updateBadge(); updateProfileSummary(); renderToggles(entitySearch.value);
    });

    thresholdSlider.addEventListener('input', () => {
        threshold = parseFloat(thresholdSlider.value);
        thresholdValue.textContent = threshold.toFixed(2);
        updateProfileSummary();
    });

    anonymizeMethod.addEventListener('change', () => {
        maskCharGroup.style.display = anonymizeMethod.value === 'mask' ? '' : 'none';
        const hw = $('hashWarning');
        if (hw) hw.style.display = anonymizeMethod.value === 'hash' ? '' : 'none';
        resultMethod.value = anonymizeMethod.value;
    });

    resultMethod.addEventListener('change', async () => {
        anonymizeMethod.value = resultMethod.value;
        if (lastFindings.length) {
            await precomputeHashes(lastFindings);
            renderOutput(lastText, lastFindings);
        }
    });

    // Entity toggles
    function renderToggles(filter) {
        entityTogglesEl.innerHTML = '';
        const fl = (filter || '').toLowerCase().trim();
        for (const [cat, catData] of Object.entries(ENTITY_CATEGORIES)) {
            const entities = Array.isArray(catData) ? catData : catData.entities;
            const filtered = entities.filter(k => {
                if (!ENTITY_LABELS[k]) return false;
                if (!fl) return true;
                return ENTITY_LABELS[k].toLowerCase().includes(fl) || k.toLowerCase().includes(fl);
            });
            if (fl && !filtered.length) continue;
            const group = document.createElement('div');
            group.className = 'category-group collapsed';
            const ac = entities.filter(k => enabled.has(k)).length;
            const hdr = document.createElement('div');
            hdr.className = 'category-header';
            hdr.setAttribute('role', 'button');
            hdr.innerHTML = '<div class="category-header-left"><span>' + cat + '</span><span class="category-count">' + ac + '/' + entities.length + '</span></div>' +
                '<div class="category-actions"><button class="category-toggle-btn" data-action="t">' + (ac === entities.length ? 'Kapat' : 'Seç') + '</button>' +
                '<svg class="category-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div>';
            hdr.querySelector('[data-action]').addEventListener('click', e => {
                e.stopPropagation();
                const all = entities.every(k => enabled.has(k));
                entities.forEach(k => all ? enabled.delete(k) : enabled.add(k));
                profileSelect.value = ''; updateBadge(); updateProfileSummary(); renderToggles(entitySearch.value);
            });
            hdr.addEventListener('click', e => { if (!e.target.closest('[data-action]')) group.classList.toggle('collapsed'); });
            if (fl) group.classList.remove('collapsed');
            group.appendChild(hdr);
            const items = document.createElement('div');
            items.className = 'category-items';
            for (const key of filtered) {
                const active = enabled.has(key);
                const item = document.createElement('label');
                item.className = 'toggle-item' + (active ? ' active' : '');
                item.innerHTML = '<input type="checkbox" ' + (active ? 'checked' : '') + '><span class="entity-info"><span class="entity-label">' + ENTITY_LABELS[key] + '</span></span>';
                item.querySelector('input').addEventListener('change', e => {
                    if (e.target.checked) { enabled.add(key); item.classList.add('active'); }
                    else { enabled.delete(key); item.classList.remove('active'); }
                    profileSelect.value = ''; updateBadge(); updateProfileSummary();
                    group.querySelector('.category-count').textContent = entities.filter(k => enabled.has(k)).length + '/' + entities.length;
                });
                items.appendChild(item);
            }
            group.appendChild(items); entityTogglesEl.appendChild(group);
        }
    }
    renderToggles();
    entitySearch.addEventListener('input', () => renderToggles(entitySearch.value));
    $('selectAll').addEventListener('click', () => { Object.keys(ENTITY_LABELS).forEach(k => enabled.add(k)); profileSelect.value = 'tumunu-sec'; updateBadge(); updateProfileSummary(); renderToggles(entitySearch.value); });
    $('deselectAll').addEventListener('click', () => { enabled.clear(); profileSelect.value = ''; updateBadge(); updateProfileSummary(); renderToggles(entitySearch.value); });

    // Text sanitization
    function sanitize(text) {
        return text
            .replace(/൴/g, 'i')
            .replace(/൵/g, 'ii')
            .replace(/ﬁ/g, 'fi')
            .replace(/ﬂ/g, 'fl')
            .replace(/ﬀ/g, 'ff')
            .replace(/ﬃ/g, 'ffi')
            .replace(/ﬄ/g, 'ffl')
            .replace(/[​-‍﻿]/g, '');
    }

    // Sample
    $('sampleBtn').addEventListener('click', () => {
        inputText.value = "⚠ Bu metin gerçek değildir, yalnızca örnek amaçlıdır.\n\nİSTANBUL 3. ASLİYE HUKUK MAHKEMESİ\nDOSYA NO: 2024/12345 E.\n\nDAVACI: Ayşe Kara\nTC Kimlik No: 10000000146\nAdres: Örnek Mah. Deneme Sok. No:7 D:3, Kadıköy/İstanbul\nTelefon: 0532 123 45 67\nE-posta: ayse.kara@example.com\n\nDAVALI: Yılmaz İnşaat Ltd. Şti.\nVergi No: 1234567890\nMERSİS No: 0123456789012345\n\nKONU: Tazminat talebi hk.\n\nDavacı vekili Av. Mehmet Demir tarafından 15.03.2024 tarihinde açılan davada;\ndavacının 22.06.1985 doğumlu olduğu, SGK No: 1234567 ile kayıtlı bulunduğu,\nolay tarihinde 34 ABC 123 plakalı araçta yolcu olarak bulunduğu anlaşılmıştır.\n\nBanka Bilgileri:\nIBAN: TR33 0006 1005 1978 6457 8413 26\nAlacak tutarı: 150.000,00 TL\n\nDuruşma Tarihi: 10.09.2024 Saat: 14:30\nIP Adresi: 192.168.1.100\n\nBu belge örnek amaçlı oluşturulmuştur. Gerçek kişi ve kurumlarla ilgisi yoktur.";
        inputText.scrollIntoView({ behavior: 'smooth', block: 'start' });
        inputText.focus();
    });

    // DOCX text extraction
    async function readDocx(buf) {
        const zip = await JSZip.loadAsync(buf);
        const docXml = await zip.file('word/document.xml').async('string');
        const parser = new DOMParser();
        const doc = parser.parseFromString(docXml, 'application/xml');
        const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
        const paragraphs = doc.getElementsByTagNameNS(ns, 'p');
        const lines = [];
        for (const p of paragraphs) {
            const texts = p.getElementsByTagNameNS(ns, 't');
            let line = '';
            for (const t of texts) line += t.textContent || '';
            lines.push(line);
        }
        return sanitize(lines.join('\n'));
    }

    // UYAP UDF text extraction
    function extractUdfText(node) {
        const parts = [];
        for (const child of node.childNodes) {
            if (child.nodeType === 3 || child.nodeType === 4) {
                parts.push(child.nodeValue || child.textContent);
            } else if (child.nodeType === 1) {
                const tag = child.localName || child.nodeName;
                const inner = extractUdfText(child);
                if (/^(paragraph|p|br|div|section|content)$/i.test(tag)) {
                    parts.push('\n' + inner + '\n');
                } else {
                    parts.push(inner);
                }
            }
        }
        return parts.join('');
    }

    function splitUdfLines(text) {
        text = text.replace(/[​‌‍﻿]+/g, '\n');
        text = text.replace(/\t+/g, '  ');
        text = text.replace(/ /g, ' ');
        text = text.replace(/(\S)((?:DOSYA\s*NO|ESAS\s*NO|KARAR\s*NO|KONU|AÇIKLAMALAR|NETİCE\s+VE\s+TALEP|NETİCE|TALEP|SONUÇ|HÜKÜM|GEREKÇELİ|GEREKÇE|DAVACI|DAVALI)(?:\s|:|$))/gm, '$1\n$2');
        var dateDay = '(?:0[1-9]|[12]\\d|3[01])';
        var dateMon = '(?:0[1-9]|1[0-2])';
        var dateRe = new RegExp('(\\d)(' + dateDay + '\\.' + dateMon + '\\.\\d{4})', 'g');
        text = text.replace(dateRe, '$1\n$2');
        text = text.replace(/(\d{4})([A-ZÇĞİÖŞÜa-zçğıöşü])/g, '$1\n$2');
        text = text.replace(/(:\d{2})([A-ZÇĞİÖŞÜa-zçğıöşü])/g, '$1\n$2');
        text = text.replace(/(\d)([A-ZÇĞİÖŞÜ])/g, '$1\n$2');
        text = text.replace(/([a-zçğıöşü])(\d)/g, '$1\n$2');
        text = text.replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, '$1\n$2');
        text = text.replace(/([A-ZÇĞİÖŞÜ])([A-ZÇĞİÖŞÜ][a-zçğıöşü])/g, '$1\n$2');
        text = text.replace(/([a-zçğıöşü][.!?])([A-ZÇĞİÖŞÜ])/g, '$1\n$2');
        text = text.replace(/^(.)\n/gm, '$1');
        return text.replace(/\n{3,}/g, '\n\n').trim();
    }

    async function readUdf(buf) {
        let zip;
        try {
            zip = await JSZip.loadAsync(buf);
        } catch (_) {
            const dec = new TextDecoder('utf-8');
            const raw = dec.decode(buf);
            if (raw.trim().charAt(0) === '<') {
                const parser = new DOMParser();
                const doc = parser.parseFromString(raw, 'application/xml');
                const text = extractUdfText(doc.documentElement);
                if (text.trim()) return sanitize(text.replace(/\n{3,}/g, '\n\n').trim());
            }
            if (raw.trim()) return sanitize(raw.trim());
            throw new Error('UDF dosyası ZIP arşivi değil ve metin olarak da okunamadı');
        }
        const fileList = [];
        zip.forEach((path, entry) => { if (!entry.dir) fileList.push({ path, entry }); });
        if (!fileList.length) throw new Error('UDF arşivi boş');
        const results = [];
        for (const { path, entry } of fileList) {
            const raw = await entry.async('string');
            if (!raw.trim()) continue;
            if (raw.trim().charAt(0) === '<') {
                const parser = new DOMParser();
                const doc = parser.parseFromString(raw, 'application/xml');
                const text = extractUdfText(doc.documentElement);
                if (text.trim()) results.push(text.trim());
            } else if (raw.trim().length > 10) {
                results.push(raw.trim());
            }
        }
        if (!results.length) {
            for (const { path, entry } of fileList) {
                const raw = await entry.async('string');
                if (raw.trim()) results.push(raw.replace(/<[^>]+>/g, ' ').trim());
            }
        }
        if (!results.length) throw new Error('UDF dosyasından metin çıkarılamadı');
        return sanitize(splitUdfLines(results.join('\n\n')));
    }

    // File loading
    async function loadFile(file) {
        if (!file) return;
        if (pdfBtn) pdfBtn.disabled = true;
        const ext = file.name.split('.').pop().toLowerCase();
            try {
                const buf = await file.arrayBuffer();

                if (ext === 'docx') {
                    inputText.value = await readDocx(buf);
                    lastImageOnlyPages = [];
                    if (scanWarning) scanWarning.style.display = 'none';
                    inputText.focus();
                } else if (ext === 'udf') {
                    inputText.value = await readUdf(buf);
                    lastImageOnlyPages = [];
                    if (scanWarning) scanWarning.style.display = 'none';
                    inputText.focus();
                } else {
                    const lib = await import('./lib/pdf.min.mjs');
                    lib.GlobalWorkerOptions.workerSrc = './lib/pdf.worker.min.mjs';
                    if (typeof Worker === 'undefined') lib.GlobalWorkerOptions.workerSrc = '';
                    const pdf = await lib.getDocument({ data: buf }).promise;
                    lastPdfDoc = pdf;
                    lastPdfLib = lib;
                    ocrProcessed = false;
                    const pages = [];
                    const imagOnlyPages = [];
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        const lines = []; let lastY = null;
                        for (const item of content.items) {
                            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 2) lines.push('\n');
                            lines.push(item.str); lastY = item.transform[5];
                        }
                        const text = sanitize(lines.join(''));
                        if (text.replace(/\s/g, '').length < 10) {
                            try {
                                const ops = await page.getOperatorList();
                                const hasImage = ops.fnArray.some(fn => fn === lib.OPS.paintImageXObject || fn === lib.OPS.paintJpegXObject || fn === lib.OPS.paintImageMaskXObject);
                                if (hasImage) imagOnlyPages.push(i);
                            } catch (_) {}
                        }
                        pages.push(text);
                    }
                    lastPdfPageTexts = pages.slice();
                    const imgSet = new Set(imagOnlyPages);
                    inputText.value = pages.map((p, i) => {
                        if (pages.length <= 1) return p;
                        const hdr = '--- Sayfa ' + (i+1) + '/' + pdf.numPages + (imgSet.has(i+1) ? ' [GÖRÜNTÜ - METİN YOK]' : '') + ' ---\n';
                        return hdr + p;
                    }).join('\n\n');
                    showScanWarning(imagOnlyPages, pdf.numPages);
                    inputText.focus();
                }
        } catch (err) {
            inputText.value = 'Dosya okunamadı (' + ext.toUpperCase() + '): ' + err.message;
            inputText.focus();
        } finally { if (pdfBtn) pdfBtn.disabled = false; if (pdfFileInput) pdfFileInput.value = ''; }
    }

    if (pdfBtn && pdfFileInput) {
        pdfBtn.addEventListener('click', () => pdfFileInput.click());
        pdfFileInput.addEventListener('change', e => { loadFile(e.target.files[0]); });
    }

    // Drag-drop
    if (textareaWrap) {
        let dragCount = 0;
        textareaWrap.addEventListener('dragenter', e => { e.preventDefault(); dragCount++; textareaWrap.classList.add('dragging'); });
        textareaWrap.addEventListener('dragleave', e => { e.preventDefault(); dragCount--; if (dragCount <= 0) { dragCount = 0; textareaWrap.classList.remove('dragging'); } });
        textareaWrap.addEventListener('dragover', e => e.preventDefault());
        textareaWrap.addEventListener('drop', e => {
            e.preventDefault(); dragCount = 0; textareaWrap.classList.remove('dragging');
            const file = e.dataTransfer.files[0];
            if (file && /\.(pdf|docx|udf)$/i.test(file.name)) loadFile(file);
        });
    }

    // State
    function isKept(idx, entity) { return keptFindings.has(idx) || keptTypes.has(entity); }

    function toggleSingle(idx) {
        if (keptFindings.has(idx)) keptFindings.delete(idx); else keptFindings.add(idx);
    }

    function toggleAllSame(idx) {
        const f = lastFindings[idx];
        if (!f) return;
        const wasKept = isKept(idx, f.entity);
        lastFindings.forEach((o, i) => {
            if (o.entity === f.entity && o.value === f.value) {
                if (wasKept) keptFindings.delete(i); else keptFindings.add(i);
            }
        });
    }

    function countSame(idx) {
        const f = lastFindings[idx];
        if (!f) return 0;
        let n = 0;
        lastFindings.forEach((o, i) => { if (i !== idx && o.entity === f.entity && o.value === f.value) n++; });
        return n;
    }

    async function renderAll() {
        await precomputeHashes(lastFindings);
        buildEntityCounter(lastFindings);
        renderFindings(lastFindings);
        renderOutput(lastText, lastFindings);
        renderSummary(lastFindings);
        copyBtn.disabled = lastFindings.length === 0;
        downloadBtn.disabled = lastFindings.length === 0;
        if (aiBtn) aiBtn.disabled = lastFindings.length === 0;
        if (aiPanel && aiPanel.style.display !== 'none') refreshPrompt();
    }

    function renderSummary(findings) {
        if (!findings.length) { resultsSummary.innerHTML = ''; return; }
        const masked = findings.filter((f, i) => !isKept(i, f.entity)).length;
        const kept = findings.length - masked;
        const types = new Set(findings.map(f => f.entity)).size;
        const warnHtml = lastImageOnlyPages.length
            ? '<span class="summary-sep"></span><span class="summary-stat summary-warn" title="' + lastImageOnlyPages.length + ' sayfa taranmış görüntü — analiz edilemedi">⚠ ' + lastImageOnlyPages.length + ' görüntü sayfa</span>'
            : '';
        resultsSummary.innerHTML =
            '<span class="summary-stat">' + findings.length + ' bulgu</span>' +
            '<span class="summary-sep"></span>' +
            '<span class="summary-stat"><span class="summary-dot masked"></span>' + masked + ' maskelenecek</span>' +
            (kept > 0 ? '<span class="summary-stat"><span class="summary-dot kept"></span>' + kept + ' korunacak</span>' : '') +
            '<span class="summary-sep"></span>' +
            '<span class="summary-stat">' + types + ' tür</span>' +
            warnHtml;
    }

    function focusChip(idx) {
        findingsList.querySelectorAll('.finding-item').forEach(el => el.classList.remove('active-highlight'));
        const fi = findingsList.querySelector('[data-idx="' + idx + '"]');
        if (fi) { fi.classList.add('active-highlight'); fi.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        outputText.querySelectorAll('.pii-chip').forEach(el => el.classList.remove('pulsing'));
        const chip = outputText.querySelector('.pii-chip[data-idx="' + idx + '"]');
        if (chip) { chip.scrollIntoView({ behavior: 'smooth', block: 'center' }); void chip.offsetWidth; chip.classList.add('pulsing'); }
    }

    function focusFinding(idx) {
        outputText.querySelectorAll('.pii-chip').forEach(el => el.classList.remove('pulsing'));
        const chip = outputText.querySelector('.pii-chip[data-idx="' + idx + '"]');
        if (chip) { void chip.offsetWidth; chip.classList.add('pulsing'); }
        findingsList.querySelectorAll('.finding-item').forEach(el => el.classList.remove('active-highlight'));
        const fi = findingsList.querySelector('[data-idx="' + idx + '"]');
        if (fi) { fi.classList.add('active-highlight'); fi.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    }

    // Adaptive scan overlay
    function showScanOverlay(count, analysisDuration) {
        if (analysisDuration < 300) return Promise.resolve();
        const fast = analysisDuration < 1000;
        const totalTime = fast ? 900 : 1600;
        return new Promise(resolve => {
            const ov = document.createElement('div');
            ov.className = 'scan-overlay';
            const speed = fast ? 'fast' : 'slow';
            ov.innerHTML =
                '<svg class="scan-shield" viewBox="0 0 32 32" fill="none">' +
                '<path d="M16 3L5 8.5v9c0 7.18 4.87 13.9 11 15.5 6.13-1.6 11-8.32 11-15.5v-9L16 3z" stroke="rgba(255,255,255,0.2)" stroke-width="0.8" fill="none"/>' +
                '<path d="M13 18l-3-3-1.5 1.5L13 21l9-9-1.5-1.5L13 18z" fill="rgba(255,255,255,0.08)"/></svg>' +
                '<div class="scan-bar"><div class="scan-bar-fill ' + speed + '"></div></div>' +
                '<div class="scan-count ' + speed + '">' + count + '</div>' +
                '<div class="scan-label ' + speed + '">tespit edildi</div>';
            document.body.appendChild(ov);
            setTimeout(() => {
                ov.style.transition = 'opacity 0.35s cubic-bezier(0.4,0,0.2,1)';
                ov.style.opacity = '0';
                setTimeout(() => { ov.remove(); resolve(); }, 350);
            }, totalTime);
        });
    }

    // Scan warning for image-only pages
    let lastImageOnlyPages = [];
    function showScanWarning(imagePages, totalPages) {
        lastImageOnlyPages = imagePages;
        if (!scanWarning) return;
        if (!imagePages.length) {
            if (ocrProcessed) {
                // Tüm sayfalar OCR ile okundu — kalite uyarısı göster
                scanWarning.style.display = '';
                scanWarning.innerHTML =
                    '<svg width="16" height="16" viewBox="0 0 16 16" fill="#f59e0b"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>' +
                    '<div class="scan-warning-body">' +
                    '<div class="scan-warning-title">✓ OCR ile okundu — sonuçları kontrol edin</div>' +
                    'OCR ile çıkarılan metin hatalı olabilir (düşük çözünürlük, el yazısı, tablolar). ' +
                    'Bazı kişisel veriler yanlış okunmuş ve maskelenmemiş olabilir; çıktıyı mutlaka gözden geçirin.' +
                    '</div>';
            } else {
                scanWarning.style.display = 'none';
            }
            return;
        }
        const pageList = imagePages.length <= 5
            ? imagePages.join(', ')
            : imagePages.slice(0, 5).join(', ') + ' (+' + (imagePages.length - 5) + ')';
        scanWarning.style.display = '';
        const ocrBtn = lastPdfDoc && !ocrProcessed
            ? '<button id="ocrBtn" class="ocr-btn">OCR ile Oku</button>'
            : (ocrProcessed ? '<span class="ocr-done">✓ OCR tamamlandı — OCR metni hatalı olabilir, kontrol edin</span>' : '');
        scanWarning.innerHTML =
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="#f59e0b"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>' +
            '<div class="scan-warning-body">' +
            '<div class="scan-warning-title">' + imagePages.length + '/' + totalPages + ' sayfa taranmış görüntü içeriyor</div>' +
            'Bu sayfalar metin katmanı içermiyor, içerdikleri kişisel veriler analiz edilemedi. ' +
            'Güvenli çıktı için OCR işlenmeli veya bu sayfalar manuel kontrol edilmelidir.' +
            '<div class="scan-warning-pages">Sayfalar: ' + pageList + '</div>' +
            ocrBtn +
            '</div>';
        const btn = document.getElementById('ocrBtn');
        if (btn) btn.addEventListener('click', runOCR);
    }

    // OCR processing
    async function runOCR() {
        if (!lastPdfDoc || !lastImageOnlyPages.length) return;
        const btn = document.getElementById('ocrBtn');
        if (btn) { btn.disabled = true; btn.textContent = 'OCR başlatılıyor...'; }

        try {
            let currentOcrPage = 0;
            const totalOcrPages = lastImageOnlyPages.length;
            const TesseractModule = await import('./lib/tesseract.esm.min.js');
            const createWorker = TesseractModule.default.createWorker;
            const worker = await createWorker('tur', 1, {
                workerPath: './lib/tesseract.worker.min.js',
                corePath: './lib',
                langPath: './lib',
                gzip: false,
                logger: m => {
                    if (btn && m.status === 'recognizing text') {
                        const pct = Math.round(m.progress * 100);
                        btn.textContent = 'OCR: ' + currentOcrPage + '/' + totalOcrPages + ' (' + pct + '%)';
                    }
                },
            });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            for (const pageNum of lastImageOnlyPages) {
                currentOcrPage++;
                if (btn) btn.textContent = 'OCR: ' + currentOcrPage + '/' + lastImageOnlyPages.length + '...';

                const page = await lastPdfDoc.getPage(pageNum);
                const scale = 2;
                const viewport = page.getViewport({ scale });
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: ctx, viewport }).promise;

                const { data: { text } } = await worker.recognize(canvas);
                const ocrText = sanitize(text.trim());

                if (ocrText.length > 0) {
                    lastPdfPageTexts[pageNum - 1] = ocrText;
                }
            }

            await worker.terminate();
            ocrProcessed = true;

            // Rebuild inputText with OCR results
            const totalPages = lastPdfDoc.numPages;
            const remainingImagePages = lastImageOnlyPages.filter(p => !lastPdfPageTexts[p - 1] || lastPdfPageTexts[p - 1].replace(/\s/g, '').length < 10);
            inputText.value = lastPdfPageTexts.map((p, i) => {
                if (lastPdfPageTexts.length <= 1) return p;
                const wasImage = lastImageOnlyPages.includes(i + 1);
                const hasText = p && p.replace(/\s/g, '').length >= 10;
                let tag = '';
                if (wasImage && hasText) tag = ' [OCR]';
                else if (wasImage) tag = ' [GÖRÜNTÜ - METİN YOK]';
                const hdr = '--- Sayfa ' + (i + 1) + '/' + totalPages + tag + ' ---\n';
                return hdr + p;
            }).join('\n\n');

            lastImageOnlyPages = remainingImagePages;
            showScanWarning(remainingImagePages, totalPages);
            analyzeBtn.click();
        } catch (err) {
            if (btn) { btn.disabled = false; btn.textContent = 'OCR Hatası — Tekrar Dene'; }
            console.error('OCR error:', err);
        }
    }

    // HMAC pre-computation
    async function precomputeHashes(findings) {
        if (resultMethod.value !== 'hash') { hashCache.clear(); return; }
        hashCache.clear();
        const unique = [...new Set(findings.map(f => f.value))];
        await Promise.all(unique.map(async val => {
            const h = await hmacSha256(val, SESSION_SALT);
            hashCache.set(val, h.substring(0, 16));
        }));
    }

    // Analyze
    analyzeBtn.addEventListener('click', async () => {
        if (!inputText.value.trim()) return;
        lastText = sanitize(inputText.value);
        keptFindings.clear(); keptTypes.clear(); hashCache.clear();

        resultMethod.value = anonymizeMethod.value;

        analyzeBtn.disabled = true;
        analyzeBtn.textContent = '...';

        try {
            const t0 = performance.now();
            lastFindings = await NERWorker.analyze(lastText, enabled, threshold);
            const duration = performance.now() - t0;
            lastFindings.forEach((f, i) => { if (f.entity === 'LEGAL_CITATION') keptFindings.add(i); });
            await showScanOverlay(lastFindings.length, duration);
            showResults();
            await renderAll();
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analiz Et';
        }
    });

    function confirmUnscanWarning() {
        if (!lastImageOnlyPages.length) return true;
        return confirm(
            lastImageOnlyPages.length + ' sayfa taranmış görüntü içeriyor ve analiz edilemedi.\n' +
            'Bu sayfalar kişisel veri barındırabilir.\n\n' +
            'Yine de devam etmek istiyor musunuz?'
        );
    }

    // Copy
    copyBtn.addEventListener('click', () => {
        if (!confirmUnscanWarning()) return;
        const text = getOutputText();
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = 'Tamam';
            setTimeout(() => { copyBtn.textContent = 'Kopyala'; }, 1000);
        });
    });

    // Download TXT
    downloadBtn.addEventListener('click', () => {
        if (!confirmUnscanWarning()) return;
        let text = getOutputText();
        if (lastImageOnlyPages.length) {
            text = '⚠ UYARI: ' + lastImageOnlyPages.length + ' sayfa taranmış görüntü içeriyor ve analiz edilemedi (sayfa: ' + lastImageOnlyPages.join(', ') + ').\nBu sayfalar kişisel veri barındırabilir. Güvenli çıktı için manuel kontrol gereklidir.\n\n' + text;
        }
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'anonim-belge.txt';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Download detection report (JSON) — contains real PII, local only
    function getOutputText() {
        let text = '';
        outputText.childNodes.forEach(n => {
            if (n.nodeType === 3) text += n.textContent;
            else if (n.classList && n.classList.contains('plain-seg')) text += n.textContent;
            else if (n.classList && n.classList.contains('pii-chip')) {
                const s = n.querySelector('span');
                if (s) text += s.textContent;
            }
        });
        return text;
    }

    // Findings
    function renderFindings(findings) {
        if (!findings.length) {
            findingsCount.textContent = '';
            findingsList.innerHTML = '<div class="no-findings">Tespit bulunamadı, manuel kontrol önerilir.</div>';
            return;
        }
        findingsCount.textContent = findings.length;
        if (mobileTabCount) mobileTabCount.textContent = findings.length;
        findingsList.innerHTML = '';

        const q = (findingsSearch ? findingsSearch.value.trim().toLowerCase() : '');
        const flt = findingsFilter ? findingsFilter.value : 'all';

        const visible = findings.map((f, i) => ({ ...f, _i: i })).filter(f => {
            if (q && !f.value.toLowerCase().includes(q) && !(ENTITY_LABELS[f.entity] || f.entity).toLowerCase().includes(q)) return false;
            if (flt === 'masked') return !isKept(f._i, f.entity);
            if (flt === 'kept') return isKept(f._i, f.entity);
            if (flt === 'manual') return f.entity === 'MANUAL' || (f.source && f.source === 'manual');
            if (flt === 'low') return f.score < 0.5;
            return true;
        });

        const types = [...new Set(visible.map(f => f.entity))];
        for (const type of types) {
            const items = visible.filter(f => f.entity === type);
            const label = ENTITY_LABELS[type] || type;
            const hdr = document.createElement('div');
            hdr.className = 'finding-type-header';
            hdr.innerHTML = '<span class="type-label">' + escapeHTML(label) + '</span><span class="type-count">' + items.length + '</span>';
            findingsList.appendChild(hdr);
            for (const f of items) {
                const k = isKept(f._i, f.entity);
                const row = document.createElement('div');
                row.className = 'finding-item' + (k ? ' kept' : '');
                row.setAttribute('data-idx', f._i);
                const same = countSame(f._i);
                row.innerHTML = '<span class="finding-value">' + escapeHTML(f.value) + '</span>' +
                    '<span class="finding-score">' + Math.round(f.score * 100) + '%</span>' +
                    (same > 0 ? '<button class="finding-toggle-all' + (k ? ' is-kept' : '') + '" title="' + (k ? 'Tümünü maskele' : 'Tümünü koru') + ' (' + (same + 1) + ')">Tümü</button>' : '') +
                    '<button class="finding-toggle' + (k ? ' is-kept' : '') + '" title="' + (k ? 'Maskele' : 'Koru') + '">' + (k ? MASK_SVG : SHIELD_SVG) + '</button>';
                row.addEventListener('click', e => { if (!e.target.closest('.finding-toggle') && !e.target.closest('.finding-toggle-all')) focusChip(f._i); });
                row.querySelector('.finding-toggle').addEventListener('click', e => {
                    e.stopPropagation();
                    toggleSingle(f._i);
                    renderAll();
                });
                const allBtn = row.querySelector('.finding-toggle-all');
                if (allBtn) allBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    toggleAllSame(f._i);
                    renderAll();
                });
                findingsList.appendChild(row);
            }
        }
        if (!visible.length && findings.length) {
            findingsList.innerHTML = '<div class="no-findings">Filtreyle eşleşen tespit yok.</div>';
        }
    }

    if (findingsSearch) findingsSearch.addEventListener('input', () => { if (lastFindings.length) renderFindings(lastFindings); });
    if (findingsFilter) findingsFilter.addEventListener('change', () => { if (lastFindings.length) renderFindings(lastFindings); });

    // Output
    function makeSeg(text, start) {
        const seg = document.createElement('span');
        seg.className = 'plain-seg';
        seg.dataset.start = start;
        seg.textContent = text;
        return seg;
    }

    function renderOutput(text, findings) {
        outputText.innerHTML = '';
        if (!findings.length) { outputText.appendChild(makeSeg(text, 0)); return; }
        const sorted = [...findings].map((f, i) => ({ ...f, _i: i })).sort((a, b) => a.start - b.start || b.score - a.score);
        const deduped = [];
        for (const f of sorted) { if (!deduped.length || f.start >= deduped[deduped.length - 1].end) deduped.push(f); }
        const method = resultMethod.value, mc = maskChar.value;
        let pos = 0;
        for (const f of deduped) {
            if (f.start > pos) outputText.appendChild(makeSeg(text.substring(pos, f.start), pos));
            const kept = isKept(f._i, f.entity);
            const chip = document.createElement('span');
            chip.className = 'pii-chip' + (kept ? ' is-kept' : '');
            chip.setAttribute('data-idx', f._i);
            const txt = document.createElement('span');
            txt.textContent = kept ? f.value : replacement(f, method, mc);
            chip.title = (ENTITY_LABELS[f.entity] || f.entity) + (kept ? ' (korunuyor)' : ': ' + f.value);
            chip.appendChild(txt);
            const btn = document.createElement('button');
            btn.className = 'chip-toggle';
            btn.title = kept ? 'Maskele' : 'Koru';
            btn.setAttribute('aria-label', kept ? 'Maskele' : 'Koru');
            btn.innerHTML = kept ? MASK_SVG : SHIELD_SVG;
            btn.addEventListener('click', e => {
                e.stopPropagation();
                toggleSingle(f._i);
                renderAll(); focusFinding(f._i);
            });
            chip.appendChild(btn);
            chip.addEventListener('click', e => { if (!e.target.closest('.chip-toggle')) focusFinding(f._i); });
            outputText.appendChild(chip);
            pos = f.end;
        }
        if (pos < text.length) outputText.appendChild(makeSeg(text.substring(pos), pos));
    }

    function replacement(f, method, mc) {
        switch (method) {
            case 'replace': return '<' + friendlyLabel(f.entity, f.value) + '>';
            case 'mask': return mc.repeat(f.value.length);
            case 'partial': { const v = f.value; return v.length <= 3 ? mc.repeat(v.length) : v[0] + mc.repeat(v.length - 2) + v[v.length - 1]; }
            case 'redact': return '[SİLİNDİ]';
            case 'hash': return hashCache.get(f.value) || '[HASH]';
            default: return '<' + friendlyLabel(f.entity, f.value) + '>';
        }
    }

    inputText.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') analyzeBtn.click(); });

    // ─── Yapay Zeka İş Akışı (anonimleştir → prompt → çöz) ───
    let aiReverseMap = new Map(); // token -> orijinal değer (bellek + localStorage'a yedeklenir)

    // asciiToken / buildPseudonymized / deAnonymize artık ai-workflow.js'te
    // (DOM-bağımsız, birim testli). Burada yalnızca çağrılırlar.

    // Kullanıcı tercihlerinden ({{SECENEKLER}}) enjekte edilecek blok. Hiçbiri
    // seçili değilse boş döner (placeholder temizce kaybolur).
    function buildOptionsBlock() {
        const lines = [];
        if (optParty && optParty.value) {
            lines.push('- Müvekkil tarafı: ' + optParty.value + ' (değerlendirmeyi ve talepleri bu taraf lehine kur).');
        }
        if (optLang && optLang.value) {
            lines.push('- Yanıt dili: ' + optLang.value + ' (yanıtın tamamını bu dilde ver; ancak [KISI_1] gibi etiketleri ÇEVİRME, aynen bırak).');
        }
        if (optExtra && optExtra.value.trim()) {
            lines.push('- Ek talimat: ' + optExtra.value.trim());
        }
        if (!lines.length) return '';
        return '# KULLANICI TERCİHLERİ\n' + lines.join('\n');
    }

    function renderLegend(map) {
        if (!legendList) return;
        legendList.innerHTML = '';
        if (legendCount) legendCount.textContent = '(' + map.size + ')';
        for (const [token, value] of map) {
            const row = document.createElement('div');
            row.className = 'ai-legend-row';
            const t = document.createElement('span');
            t.className = 'ai-legend-token';
            t.textContent = token;
            const v = document.createElement('span');
            v.className = 'ai-legend-val';
            v.textContent = value;
            row.appendChild(t); row.appendChild(v);
            legendList.appendChild(row);
        }
    }

    // Sade kontrol: yalnızca gerçekten açık (kept) veri varsa kırmızı tek satır uyarı.
    // Aksi halde boş kalır (kutu gizlenir). Maskelenen tür/düşük güven/taranmış bilgisi
    // sonuç özet çubuğunda zaten var; burada tekrarlanmaz.
    function renderReview() {
        if (!aiReview) return;
        const rs = reviewSummary(lastFindings, isKept, FRIENDLY_LABELS, 0.5);
        if (rs.openCount) {
            aiReview.innerHTML = '<div class="ai-review-warn">⚠ ' + rs.openCount +
                ' veri maskelenmeden açık gidecek: ' +
                rs.openItems.slice(0, 6).map(o => '<b>' + escapeHTML(o.value) + '</b>').join(', ') +
                (rs.openCount > 6 ? '…' : '') +
                ' — Tespitler\'den maskeleyebilirsiniz.</div>';
        } else {
            aiReview.innerHTML = '';
        }
    }

    function refreshPrompt() {
        if (!lastFindings.length) return;
        const { text, map } = buildPseudonymized(lastText, lastFindings, isKept, FRIENDLY_LABELS, ENTITY_LABELS);
        aiReverseMap = map;
        // Geri-çözme haritasını tarayıcıya kaydet: sekme yenilense/kapansa da
        // AI cevabı sonradan çözülebilsin (yalnızca bu tarayıcıda; Temizle ile silinir).
        try { localStorage.setItem('perde_deanon_map', JSON.stringify([...map])); } catch (e) {}
        if (typeof refreshSavedMapBar === 'function') refreshSavedMapBar();
        const p = LEGAL_PROMPTS.find(x => x.id === promptSelect.value) || LEGAL_PROMPTS[0];
        promptDesc.textContent = p.desc;
        promptOutput.value = p.body
            .replace('{{SECENEKLER}}', buildOptionsBlock())
            .replace('{{BELGE}}', text);
        renderLegend(map);
        renderReview();
        aiTokenInfo.textContent = map.size + ' veri maskelendi';
    }

    function openAiPanel() {
        if (!lastFindings.length) return;
        if (!promptSelect.options.length) {
            // Kategoriye göre optgroup'larla doldur
            const byCat = {};
            LEGAL_PROMPTS.forEach(p => { (byCat[p.category] = byCat[p.category] || []).push(p); });
            const catKeys = (typeof PROMPT_CATEGORIES !== 'undefined') ? Object.keys(PROMPT_CATEGORIES) : Object.keys(byCat);
            catKeys.forEach(cat => {
                if (!byCat[cat]) return;
                const og = document.createElement('optgroup');
                og.label = (typeof PROMPT_CATEGORIES !== 'undefined' && PROMPT_CATEGORIES[cat]) || cat;
                byCat[cat].forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id; opt.textContent = p.name;
                    og.appendChild(opt);
                });
                promptSelect.appendChild(og);
            });
        }
        aiPanel.style.display = '';
        deanonResultStep.style.display = 'none';
        aiResponse.value = '';
        if (aiLegend) aiLegend.open = false;
        refreshPrompt();
        aiPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function closeAiPanel() {
        aiPanel.style.display = 'none';
        aiReverseMap.clear();
        aiResponse.value = '';
        deanonOutput.textContent = '';
        deanonResultStep.style.display = 'none';
        if (legendList) legendList.innerHTML = '';
        if (aiLegend) aiLegend.open = false;
    }

    if (aiBtn) aiBtn.addEventListener('click', () => {
        if (aiPanel.style.display === 'none') openAiPanel(); else closeAiPanel();
    });
    if (aiClose) aiClose.addEventListener('click', closeAiPanel);
    if (promptSelect) promptSelect.addEventListener('change', refreshPrompt);
    if (optParty) optParty.addEventListener('change', refreshPrompt);
    if (optLang) optLang.addEventListener('change', refreshPrompt);
    if (optExtra) optExtra.addEventListener('input', refreshPrompt);

    if (promptCopyBtn) promptCopyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(promptOutput.value).then(() => {
            promptCopyBtn.textContent = 'Kopyalandı ✓';
            setTimeout(() => { promptCopyBtn.textContent = 'Promptu Kopyala'; }, 1200);
        });
    });

    if (deanonBtn) deanonBtn.addEventListener('click', () => {
        const txt = aiResponse.value;
        if (!txt.trim()) { aiResponse.focus(); return; }
        if (!aiReverseMap.size) { refreshPrompt(); }
        const r = deAnonymize(txt, aiReverseMap);
        deanonOutput.textContent = r.text;
        deanonResultStep.style.display = '';

        // Ana istatistik: kaç etiket geri çevrildi. Cevapta hiç geçmeyen
        // etiketler (missed) normaldir — YZ her veriye atıf yapmak zorunda değil.
        const absent = r.missed.length;
        deanonStats.textContent = r.resolved + ' etiket çözüldü' + (absent ? ' · ' + absent + ' kullanılmamış' : '');

        // Gerçek uyarı yalnızca çözülemeyen Perde-token kaldıysa: YZ token'ı bozmuş demektir.
        const stray = [...new Set(r.leftover)];
        if (stray.length) {
            deanonWarn.style.display = '';
            deanonWarn.className = 'ai-warn';
            deanonWarn.innerHTML = '⚠ Yapay zeka şu etiketleri tanınmaz hale getirmiş ve geri çevrilemedi: <b>' +
                stray.slice(0, 8).map(escapeHTML).join(', ') + (stray.length > 8 ? '…' : '') +
                '</b>. Bu kişisel verileri elle düzeltmeniz veya istemi tekrar çalıştırmanız gerekir.';
        } else if (absent && r.resolved === 0) {
            // Hiçbir etiket çözülmedi — büyük ihtimalle yanlış metin yapıştırıldı veya YZ tüm etiketleri bozdu.
            deanonWarn.style.display = '';
            deanonWarn.className = 'ai-warn ai-warn-soft';
            deanonWarn.innerHTML = 'Hiçbir etiket bulunamadı. Doğru cevabı yapıştırdığınızdan ve etiketlerin ([KISI_1] gibi) korunduğundan emin olun.';
        } else {
            deanonWarn.style.display = 'none';
        }
        deanonResultStep.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // ── Geri-çözme haritası kalıcılığı (basit: tarayıcı hafızası) ──
    // Reload/kapanış sonrası orijinal belge gitse bile, ana ekranda küçük bir
    // kutu çıkar: AI cevabını yapıştır → kayıtlı haritayla gerçek değerleri al.
    const SAVED_MAP_KEY = 'perde_deanon_map';
    const savedMapBar = $('savedMapBar');
    function refreshSavedMapBar() {
        if (!savedMapBar) return;
        let entries = [];
        try { entries = JSON.parse(localStorage.getItem(SAVED_MAP_KEY) || '[]'); } catch (e) { entries = []; }
        if (!Array.isArray(entries) || !entries.length) { savedMapBar.style.display = 'none'; savedMapBar._map = null; return; }
        savedMapBar._map = new Map(entries);
        const cnt = $('savedMapCount'); if (cnt) cnt.textContent = '(' + savedMapBar._map.size + ' etiket)';
        savedMapBar.style.display = '';
    }
    refreshSavedMapBar();
    if ($('savedMapDeanon')) $('savedMapDeanon').addEventListener('click', () => {
        const sm = savedMapBar && savedMapBar._map; if (!sm) return;
        const ta = $('savedMapResponse');
        if (!ta.value.trim()) { ta.focus(); return; }
        const r = deAnonymize(ta.value, sm);
        $('savedMapResult').textContent = r.text;
        const stray = [...new Set(r.leftover)];
        $('savedMapStats').textContent = r.resolved + ' etiket çözüldü'
            + (stray.length ? ' · ⚠ ' + stray.length + ' etiket çözülemedi (AI bozmuş olabilir)' : '');
        $('savedMapResultWrap').style.display = '';
        $('savedMapResultWrap').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    if ($('savedMapClear')) $('savedMapClear').addEventListener('click', () => {
        try { localStorage.removeItem(SAVED_MAP_KEY); } catch (e) {}
        if (savedMapBar) { savedMapBar.style.display = 'none'; savedMapBar._map = null; }
    });
    if ($('savedMapCopy')) $('savedMapCopy').addEventListener('click', () => {
        navigator.clipboard.writeText($('savedMapResult').textContent).then(() => {
            $('savedMapCopy').textContent = 'Kopyalandı ✓';
            setTimeout(() => { $('savedMapCopy').textContent = 'Sonucu kopyala'; }, 1200);
        });
    });

    if (deanonCopyBtn) deanonCopyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(deanonOutput.textContent).then(() => {
            deanonCopyBtn.textContent = 'Tamam';
            setTimeout(() => { deanonCopyBtn.textContent = 'Kopyala'; }, 1000);
        });
    });

    // ─── Manual selection masking ───
    const MANUAL_TYPES = ['PERSON_NAME','TR_NATIONAL_ID','CASE_NUMBER','ADDRESS','PHONE_NUMBER','DATE_TIME','ORGANIZATION','MONETARY_AMOUNT','MANUAL'];
    const selPopup = document.createElement('div');
    selPopup.className = 'sel-popup';
    selPopup.style.display = 'none';
    const typeSelect = '<select class="sel-popup-type">' + MANUAL_TYPES.map(t => '<option value="' + t + '">' + (ENTITY_LABELS[t] || t) + '</option>').join('') + '</select>';
    selPopup.innerHTML = typeSelect +
        '<button class="sel-popup-btn">' + MASK_SVG + ' Maskele</button>' +
        '<button class="sel-popup-btn-all" style="display:none">' + MASK_SVG + ' Tümünü</button>';
    document.body.appendChild(selPopup);
    let pendingSel = null;

    function findSegPos(node, offset) {
        const seg = node.nodeType === 3 ? node.parentElement : node;
        if (!seg || !seg.classList.contains('plain-seg')) return -1;
        return parseInt(seg.dataset.start) + offset;
    }

    function countTextOccurrences(val) {
        if (!val || val.length < 2) return 0;
        let count = 0, pos = 0;
        while ((pos = lastText.indexOf(val, pos)) !== -1) { count++; pos += val.length; }
        return count;
    }

    outputText.addEventListener('mouseup', () => {
        setTimeout(() => {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) { selPopup.style.display = 'none'; return; }
            const str = sel.toString().trim();
            if (!str || str.length < 2) { selPopup.style.display = 'none'; return; }
            const range = sel.getRangeAt(0);
            if (!outputText.contains(range.commonAncestorContainer)) { selPopup.style.display = 'none'; return; }
            const start = findSegPos(range.startContainer, range.startOffset);
            const end = findSegPos(range.endContainer, range.endOffset);
            if (start < 0 || end < 0 || end <= start) { selPopup.style.display = 'none'; return; }
            const rect = range.getBoundingClientRect();
            selPopup.style.left = Math.max(4, rect.left + rect.width / 2 - 80) + 'px';
            selPopup.style.top = (rect.top - 44 + window.scrollY) + 'px';
            selPopup.style.display = '';
            const val = lastText.substring(start, end);
            pendingSel = { value: val, start, end };
            const occ = countTextOccurrences(val);
            const allBtn = selPopup.querySelector('.sel-popup-btn-all');
            if (occ > 1) {
                allBtn.style.display = '';
                allBtn.textContent = '';
                allBtn.innerHTML = MASK_SVG + ' Tümü (' + occ + ')';
            } else {
                allBtn.style.display = 'none';
            }
        }, 10);
    });

    function addManualFinding(entity, value, start, end) {
        const exists = lastFindings.some(f => f.start === start && f.end === end);
        if (!exists) lastFindings.push({ entity, value, start, end, score: 1.0 });
    }

    selPopup.querySelector('.sel-popup-btn').addEventListener('click', () => {
        if (!pendingSel) return;
        const entity = selPopup.querySelector('.sel-popup-type').value;
        addManualFinding(entity, pendingSel.value, pendingSel.start, pendingSel.end);
        selPopup.style.display = 'none';
        window.getSelection().removeAllRanges();
        pendingSel = null;
        renderAll();
    });

    selPopup.querySelector('.sel-popup-btn-all').addEventListener('click', () => {
        if (!pendingSel) return;
        const entity = selPopup.querySelector('.sel-popup-type').value;
        const val = pendingSel.value;
        let pos = 0;
        while ((pos = lastText.indexOf(val, pos)) !== -1) {
            addManualFinding(entity, val, pos, pos + val.length);
            pos += val.length;
        }
        selPopup.style.display = 'none';
        window.getSelection().removeAllRanges();
        pendingSel = null;
        renderAll();
    });

    document.addEventListener('mousedown', e => {
        if (!selPopup.contains(e.target)) selPopup.style.display = 'none';
    });

    // Ctrl/Cmd+M → mask selection
    document.addEventListener('keydown', e => {
        if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'm') return;
        if (!pendingSel && resultsView.style.display !== 'none') {
            const sel = window.getSelection();
            if (sel && !sel.isCollapsed) {
                const str = sel.toString().trim();
                if (str.length >= 2) {
                    const range = sel.getRangeAt(0);
                    if (outputText.contains(range.commonAncestorContainer)) {
                        const start = findSegPos(range.startContainer, range.startOffset);
                        const end = findSegPos(range.endContainer, range.endOffset);
                        if (start >= 0 && end > start) pendingSel = { value: lastText.substring(start, end), start, end };
                    }
                }
            }
        }
        if (!pendingSel) return;
        e.preventDefault();
        const entity = selPopup.style.display !== 'none' ? selPopup.querySelector('.sel-popup-type').value : 'MANUAL';
        addManualFinding(entity, pendingSel.value, pendingSel.start, pendingSel.end);
        selPopup.style.display = 'none';
        window.getSelection().removeAllRanges();
        pendingSel = null;
        renderAll();
    });
});
