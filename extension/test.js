// Perde Eklenti — birim testleri
// Çalıştırma: node extension/test.js   (npm test bunu da çağırır)
//
// Kapsam: extension/src/policy.js içindeki saf karar mantığı + motorla entegrasyon.
// DOM'a bağlı katmanlar (content.js / ui.js) burada test edilmez.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// Motoru ve policy'yi content script'teki gibi tek ortak kapsamda yükle
const src = [
    read('dictionaries.js'),
    read('recognizers.js'),
    read('ner-engine.js'),
    read('ai-workflow.js'),
    read('extension/src/policy.js'),
].join(';\n');

const api = new Function(src + `; return {
    ENTITY_LABELS, FRIENDLY_LABELS, analyzeText, deAnonymize,
    EXT_PROFILES, EXT_DEFAULT_SETTINGS,
    extResolveEntities, extHostOf, extSiteEnabled, extShouldIntercept,
    extDedupe, extSummarize, extGroupText, extMaskText, extStarMask,
};`)();

const {
    ENTITY_LABELS, FRIENDLY_LABELS, analyzeText, deAnonymize,
    EXT_PROFILES, EXT_DEFAULT_SETTINGS,
    extResolveEntities, extHostOf, extSiteEnabled, extShouldIntercept,
    extDedupe, extSummarize, extGroupText, extMaskText, extStarMask,
} = api;

const ALL = Object.keys(ENTITY_LABELS);

let pass = 0, fail = 0, total = 0;

function check(name, cond, detail) {
    total++;
    if (cond) { pass++; return; }
    fail++;
    console.log('  ✗ ' + name + (detail ? '\n      ' + detail : ''));
}

function eq(name, got, want) {
    check(name, got === want, 'beklenen: ' + JSON.stringify(want) + '  gelen: ' + JSON.stringify(got));
}

function section(t) { console.log('\n--- ' + t + ' ---'); }

// Belirli türün belirli değeri bulundu mu?
function findOf(findings, entity, value) {
    return findings.find(f => f.entity === entity && (value == null || f.value === value));
}

const settingsOf = over => ({ ...EXT_DEFAULT_SETTINGS, ...over });

// ─────────────────────────────────────────────────────────────────────────────
section('Profil çözümlemesi');

{
    const guvenli = extResolveEntities(settingsOf({ profile: 'guvenli' }), ALL);
    const hukuk = extResolveEntities(settingsOf({ profile: 'hukuk' }), ALL);
    const tumu = extResolveEntities(settingsOf({ profile: 'tumu' }), ALL);

    eq('tümü profili 102 türün hepsini açar', tumu.size, ALL.length);

    // Doğrudan kimliklendiriciler her profilde açık olmalı
    for (const e of ['TR_NATIONAL_ID', 'IBAN_CODE', 'PHONE_NUMBER', 'EMAIL_ADDRESS',
                     'PERSON_NAME', 'ADDRESS', 'CREDIT_CARD', 'HEALTH_CONDITION']) {
        check('güvenli profili ' + e + ' içerir', guvenli.has(e));
    }

    // Genel web metninde gürültü yapan türler hiçbir varsayılan profilde olmamalı
    for (const e of ['URL', 'DOMAIN', 'DATE_TIME', 'TIME']) {
        check('güvenli profili ' + e + ' içermez', !guvenli.has(e));
        check('hukuk profili ' + e + ' içermez', !hukuk.has(e));
        check('tümü profili ' + e + ' içerir', tumu.has(e));
    }

    // Bağlama bağlı türler yalnızca hukuk (ve tümü) profilinde
    for (const e of ['COURT', 'MONETARY_AMOUNT', 'OCCUPATION', 'AGE', 'LOCATION']) {
        check('güvenli profili ' + e + ' içermez', !guvenli.has(e));
        check('hukuk profili ' + e + ' içerir', hukuk.has(e));
    }

    check('hukuk profili güvenli profilin üst kümesi',
        [...guvenli].every(e => hukuk.has(e)));

    // Kullanıcının elle kapattığı tür profilden bağımsız kapanır
    const custom = extResolveEntities(
        settingsOf({ profile: 'tumu', disabledEntities: ['PERSON_NAME', 'IBAN_CODE'] }), ALL);
    check('kapatılan tür tümü profilinde de kapalı',
        !custom.has('PERSON_NAME') && !custom.has('IBAN_CODE'));
    eq('kapatılan tür sayısı düşer', custom.size, ALL.length - 2);

    // Profil listeleri gerçek tür adları içermeli (yazım hatası koruması)
    for (const [name, p] of Object.entries(EXT_PROFILES)) {
        const bogus = p.exclude.filter(e => !ALL.includes(e));
        check(name + ' profilinde geçersiz tür adı yok', bogus.length === 0, bogus.join(', '));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
section('Site kapsamı');

eq('host ayıklama', extHostOf('https://chatgpt.com/c/abc?x=1'), 'chatgpt.com');
eq('www ayıklanır', extHostOf('https://www.perplexity.ai/'), 'perplexity.ai');
eq('alt alan korunur', extHostOf('https://gemini.google.com/app'), 'gemini.google.com');
eq('bozuk url boş döner', extHostOf('şey değil'), '');

check('varsayılan olarak site açık', extSiteEnabled(settingsOf({}), 'chatgpt.com'));
check('ana şalter kapalıysa site kapalı',
    !extSiteEnabled(settingsOf({ enabled: false }), 'chatgpt.com'));
check('site tek tek kapatılabilir',
    !extSiteEnabled(settingsOf({ perSite: { 'claude.ai': false } }), 'claude.ai'));
check('bir sitenin kapatılması diğerini etkilemez',
    extSiteEnabled(settingsOf({ perSite: { 'claude.ai': false } }), 'chatgpt.com'));
check('üst alan adı kaydı alt alana miras kalır',
    !extSiteEnabled(settingsOf({ perSite: { 'google.com': false } }), 'gemini.google.com'));
check('www öneki site eşleşmesini bozmaz',
    !extSiteEnabled(settingsOf({ perSite: { 'perplexity.ai': false } }), 'www.perplexity.ai'));

// ─────────────────────────────────────────────────────────────────────────────
section('Yakalama eşiği');

{
    const f = [{ entity: 'PERSON_NAME', value: 'Ahmet Yılmaz', start: 0, end: 12, score: 0.9 }];
    check('bulgu varsa ve metin yeterince uzunsa yakala',
        extShouldIntercept('Ahmet Yılmaz ile görüştüm bugün', f, settingsOf({})));
    check('bulgu yoksa yakalama',
        !extShouldIntercept('merhaba dünya nasılsın', [], settingsOf({})));
    check('çok kısa metinde yakalama',
        !extShouldIntercept('Ahmet', f, settingsOf({ minLength: 12 })));
    check('boş metinde yakalama', !extShouldIntercept('', f, settingsOf({})));
}

// ─────────────────────────────────────────────────────────────────────────────
section('Çakışan bulguların ayıklanması');

{
    const findings = [
        { entity: 'ADDRESS', value: 'Bağdat Caddesi No:12 Kadıköy', start: 10, end: 38, score: 0.85 },
        { entity: 'LOCATION', value: 'Bağdat Caddesi', start: 10, end: 24, score: 0.75 },
        { entity: 'LOCATION', value: 'Kadıköy', start: 31, end: 38, score: 0.5 },
        { entity: 'PERSON_NAME', value: 'Ahmet Yılmaz', start: 45, end: 57, score: 0.9 },
    ];
    const kept = extDedupe(findings);
    eq('iç içe bulgular teke iner', kept.length, 2);
    eq('geniş olan (ADDRESS) kazanır', kept[0].entity, 'ADDRESS');
    eq('çakışmayan bulgu korunur', kept[1].entity, 'PERSON_NAME');
    eq('orijinal indeks korunur', kept[1]._i, 3);

    // Aynı yerde eşit sınırlar → yüksek skorlu kazanır
    const tie = extDedupe([
        { entity: 'LOCATION', value: 'İzmir', start: 0, end: 5, score: 0.5 },
        { entity: 'BIRTH_PLACE', value: 'İzmir', start: 0, end: 5, score: 0.8 },
    ]);
    eq('eşit sınırda yüksek skor kazanır', tie[0].entity, 'BIRTH_PLACE');
    eq('eşit sınırda tek bulgu kalır', tie.length, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
section('Özet ve rozet metni');

{
    const findings = [
        { entity: 'PERSON_NAME', value: 'Ahmet Yılmaz', start: 0, end: 12, score: 0.9 },
        { entity: 'PERSON_NAME', value: 'Ayşe Kaya', start: 20, end: 29, score: 0.9 },
        { entity: 'TR_NATIONAL_ID', value: '12345678901', start: 35, end: 46, score: 0.65 },
    ];
    const s = extSummarize(findings, FRIENDLY_LABELS);
    eq('özet toplam sayısı', s.total, 3);
    eq('en çok görülen tür başta', s.groups[0].label, 'Kişi');
    eq('grup sayımı doğru', s.groups[0].count, 2);
    eq('okunur etiket kullanılır', s.items[2].label, 'TC Kimlik');
    eq('rozet metni', extGroupText(s.groups, 3), '2 Kişi, TC Kimlik');
    eq('rozet limiti aşınca +n eklenir', extGroupText(s.groups, 1), '2 Kişi +1');
}

// ─────────────────────────────────────────────────────────────────────────────
section('Maskeleme stilleri');

{
    const text = 'Müvekkilim Ahmet Yılmaz, TC 12345678901, tel 0532 123 45 67.';
    const findings = [
        { entity: 'PERSON_NAME', value: 'Ahmet Yılmaz', start: 11, end: 23, score: 0.9 },
        { entity: 'TR_NATIONAL_ID', value: '12345678901', start: 28, end: 39, score: 1.0 },
        { entity: 'PHONE_NUMBER', value: '0532 123 45 67', start: 45, end: 59, score: 0.75 },
    ];
    const opts = { friendlyLabels: FRIENDLY_LABELS, entityLabels: ENTITY_LABELS };

    const tok = extMaskText(text, findings, { ...opts, style: 'token' });
    check('token stili gerçek veriyi bırakmaz',
        !tok.text.includes('Ahmet Yılmaz') && !tok.text.includes('12345678901'), tok.text);
    check('token stili [KISI_1] üretir', tok.text.includes('[KISI_1]'), tok.text);
    eq('token haritası 3 kayıt tutar', tok.map.size, 3);

    // Asıl kazanç: yapay zekânın cevabı gerçek değerlere geri çevrilebiliyor
    const reply = 'Sayın [KISI_1] adına dilekçe hazırlandı; [TC_KIMLIK_1] numarası doğrulanmalı.';
    const back = deAnonymize(reply, tok.map);
    check('cevaptaki kişi token\'ı çözülür', back.text.includes('Ahmet Yılmaz'), back.text);
    check('cevaptaki TC token\'ı çözülür', back.text.includes('12345678901'), back.text);
    eq('iki token çözüldü', back.resolved, 2);
    eq('çözülemeyen token kalmadı', back.leftover.length, 0);

    const lbl = extMaskText(text, findings, { ...opts, style: 'label' });
    check('etiket stili okunur etiket koyar', lbl.text.includes('<Kişi>'), lbl.text);
    check('etiket stili gerçek veriyi bırakmaz', !lbl.text.includes('Ahmet Yılmaz'));
    eq('etiket stili geri çevrilemez (harita boş)', lbl.map.size, 0);

    const star = extMaskText(text, findings, { ...opts, style: 'star' });
    check('yıldız stili tür bilgisini de saklar',
        !star.text.includes('Kişi') && !star.text.includes('Ahmet'), star.text);
    check('yıldız stili * kullanır', star.text.includes('*'));

    // Açık bırakılan (kept) bulgu maskelenmez
    const partial = extMaskText(text, findings, { ...opts, style: 'token', keptIndices: new Set([0]) });
    check('açık bırakılan kişi adı korunur', partial.text.includes('Ahmet Yılmaz'), partial.text);
    check('açık bırakılmayan TC yine maskelenir', !partial.text.includes('12345678901'));
    eq('açık bırakılan bulgu haritaya girmez', partial.map.size, 2);

    // Metnin maskelenmeyen kısmı bozulmamalı
    for (const style of ['token', 'label', 'star']) {
        const r = extMaskText(text, findings, { ...opts, style });
        check(style + ' stili çevre metni bozmaz',
            r.text.startsWith('Müvekkilim ') && r.text.endsWith('.'), r.text);
    }

    eq('kısa değer en az 3 yıldızla maskelenir', extStarMask('ab'), '***');
    eq('uzun değer 12 yıldızla sınırlanır', extStarMask('x'.repeat(80)).length, 12);
}

// ─────────────────────────────────────────────────────────────────────────────
section('Motorla uçtan uca (gerçek analyzeText)');

{
    const guvenli = extResolveEntities(settingsOf({ profile: 'guvenli' }), ALL);
    const hukuk = extResolveEntities(settingsOf({ profile: 'hukuk' }), ALL);
    const th = EXT_DEFAULT_SETTINGS.threshold;

    // 1) Tipik bir hukuk yapıştırması: kimliklendiriciler yakalanmalı
    const legal = 'Davacı Ahmet Yılmaz (TC: 12345678901), Ziraat Bankası ' +
        'TR330006100519786457841326 hesabına yatan tutar için, Bağdat Caddesi No:12 ' +
        'Kadıköy/İstanbul adresinde ikamet eden Ayşe Kaya\'ya ihtar gönderdi. ' +
        'İletişim: 0532 123 45 67, ahmet@example.com';

    const lf = analyzeText(legal, guvenli, th);
    check('TC kimlik yakalanır', !!findOf(lf, 'TR_NATIONAL_ID', '12345678901'));
    check('IBAN yakalanır', !!findOf(lf, 'IBAN_CODE'));
    check('telefon yakalanır', !!findOf(lf, 'PHONE_NUMBER'));
    check('e-posta yakalanır', !!findOf(lf, 'EMAIL_ADDRESS'));
    check('kişi adı yakalanır', !!findOf(lf, 'PERSON_NAME', 'Ahmet Yılmaz'));
    check('adres yakalanır', !!findOf(lf, 'ADDRESS'));
    check('bu metin yakalama eşiğini geçer', extShouldIntercept(legal, lf, settingsOf({})));

    const masked = extMaskText(legal, lf, {
        style: 'token', friendlyLabels: FRIENDLY_LABELS, entityLabels: ENTITY_LABELS,
    });
    for (const secret of ['12345678901', 'TR330006100519786457841326',
                          'ahmet@example.com', 'Ahmet Yılmaz', '0532 123 45 67']) {
        check('maskeli çıktıda "' + secret + '" kalmaz', !masked.text.includes(secret));
    }

    // 2) Kod parçası: güvenli profilde yanlış alarm vermemeli
    //    (eklenti her yapıştırmayı kesiyor; burada gürültü doğrudan kullanılabilirliği bozar)
    const code = 'async function fetchUser(id) {\n' +
        '  const res = await fetch(`https://api.example.com/v2/users/${id}`, {\n' +
        '    headers: { Authorization: `Bearer ${process.env.API_TOKEN}` },\n' +
        '    signal: AbortSignal.timeout(5000),\n' +
        '  });\n' +
        '  if (res.status === 429) return backoff(id);\n' +
        '  return res.json();\n' +
        '}\n' +
        '// TODO(2024-03-15): gRPC\'ye geç, RFC-8291 ve ENG-4471\n';
    const cf = analyzeText(code, guvenli, th);
    check('kod parçasında yanlış alarm yok', cf.length === 0,
        cf.map(f => f.entity + '=' + JSON.stringify(f.value)).join(', '));
    check('kod parçası yakalanmaz', !extShouldIntercept(code, cf, settingsOf({})));

    // 3) Sıradan Türkçe sohbet: kişisel veri yok, karışılmamalı
    const chat = 'Merhaba, geçen hafta konuştuğumuz konuyu güncelledim. Toplantıyı ' +
        'pazartesiye aldık, sunum yirmi beş dakika sürecek. Ekipten dört kişi katılacak, ' +
        'kalanlar uzaktan bağlanır. Ayrıntılar dokümanda yazıyor, bakabilirsin.';
    const chf = analyzeText(chat, guvenli, th);
    check('sıradan sohbette yanlış alarm yok', chf.length === 0,
        chf.map(f => f.entity + '=' + JSON.stringify(f.value)).join(', '));

    // 4) İngilizce sohbet: Türkçe sözlükler tetiklenmemeli
    const en = 'Hey team, quick update on the roadmap. We shipped the caching layer ' +
        'last Thursday and latency dropped at p99. Next up is the search rewrite, ' +
        'I would budget about three weeks for it. Let me know if the numbers look off.';
    const ef = analyzeText(en, guvenli, th);
    check('İngilizce sohbette yanlış alarm yok', ef.length === 0,
        ef.map(f => f.entity + '=' + JSON.stringify(f.value)).join(', '));

    // 5) Profil farkı gerçekten çıktıya yansıyor mu
    const courtText = 'İstanbul 3. Asliye Hukuk Mahkemesi 2023/456 E. sayılı dosyada ' +
        '45.000 TL vekalet ücretine hükmetti.';
    const cg = analyzeText(courtText, guvenli, th);
    const chk = analyzeText(courtText, hukuk, th);
    check('güvenli profilde mahkeme adı maskelenmez', !findOf(cg, 'COURT'));
    check('hukuk profilinde mahkeme adı maskelenir', !!findOf(chk, 'COURT'));
    check('hukuk profili güvenliden çok bulur', chk.length > cg.length,
        'güvenli=' + cg.length + ' hukuk=' + chk.length);
}

// ─────────────────────────────────────────────────────────────────────────────
section('Varsayılan ayarlar');

eq('varsayılan mod: önce sor', EXT_DEFAULT_SETTINGS.mode, 'preview');
eq('varsayılan profil: güvenli', EXT_DEFAULT_SETTINGS.profile, 'guvenli');
eq('varsayılan stil: geri çevrilebilir token', EXT_DEFAULT_SETTINGS.style, 'token');
check('varsayılan açık', EXT_DEFAULT_SETTINGS.enabled === true);
check('varsayılan eşik makul aralıkta',
    EXT_DEFAULT_SETTINGS.threshold >= 0.35 && EXT_DEFAULT_SETTINGS.threshold <= 0.6);

// ─────────────────────────────────────────────────────────────────────────────
section('manifest.json bütünlüğü');

{
    const manifest = JSON.parse(read('extension/manifest.json'));
    const ENGINE = ['dictionaries.js', 'recognizers.js', 'ner-engine.js', 'ai-workflow.js'];

    eq('manifest sürümü 3', manifest.manifest_version, 3);
    check('sürüm numarası var', /^\d+\.\d+\.\d+$/.test(manifest.version || ''), manifest.version);

    // Bildirilen her script gerçekten var mı? (engine/* build ile üretilir,
    // o yüzden kökteki kaynağına bakıyoruz — test build'e bağımlı olmasın.)
    const declared = [];
    for (const cs of manifest.content_scripts || []) declared.push(...(cs.js || []));
    declared.push(manifest.background.service_worker);

    for (const rel of declared) {
        const inEngine = rel.startsWith('engine/');
        const target = inEngine
            ? path.join(ROOT, rel.slice('engine/'.length))
            : path.join(ROOT, 'extension', rel);
        check('bildirilen dosya mevcut: ' + rel, fs.existsSync(target), target);
        if (inEngine) {
            check(rel + ' bilinen motor dosyası', ENGINE.includes(rel.slice('engine/'.length)));
        }
    }

    // Motor dosyaları policy/ui/content'ten ÖNCE yüklenmeli (global sıralaması)
    const js = (manifest.content_scripts[0].js || []);
    const lastEngine = Math.max(...ENGINE.map(f => js.indexOf('engine/' + f)));
    check('policy.js motordan sonra yüklenir', js.indexOf('src/policy.js') > lastEngine);
    check('content.js en sonda yüklenir', js.indexOf('src/content.js') === js.length - 1);

    // sync-engine.js ile manifest aynı dosya listesinde anlaşıyor mu?
    const syncSrc = read('extension/tools/sync-engine.js');
    for (const f of ENGINE) {
        check('sync-engine ' + f + ' dosyasını kopyalar', syncSrc.includes("'" + f + "'"));
    }

    // popup ve ikonlar
    check('popup.html bildirildi', manifest.action && manifest.action.default_popup === 'src/popup.html');
    check('popup.html mevcut', fs.existsSync(path.join(ROOT, 'extension/src/popup.html')));
    for (const size of Object.keys(manifest.icons || {})) {
        check('ikon boyutu ' + size + ' tanımlı', !!manifest.icons[size]);
    }

    // İzinler: geniş yetki istemediğimizi kilitle
    check('<all_urls> izni istenmiyor',
        !(manifest.permissions || []).includes('<all_urls>') &&
        !(manifest.host_permissions || []).includes('<all_urls>'));
    check('tabs izni istenmiyor', !(manifest.permissions || []).includes('tabs'));
    check('yalnızca https origin\'leri',
        (manifest.host_permissions || []).every(h => h.startsWith('https://')));
    check('bilinen YZ siteleri kapsamda',
        (manifest.host_permissions || []).some(h => h.includes('chatgpt.com')) &&
        (manifest.host_permissions || []).some(h => h.includes('claude.ai')));

    // content_scripts matches ile host_permissions tutarlı olmalı
    const hosts = new Set(manifest.host_permissions || []);
    for (const m of manifest.content_scripts[0].matches || []) {
        check('match host izniyle örtüşüyor: ' + m, hosts.has(m));
    }

    // Kısayollar
    check('maskeleme kısayolu tanımlı', !!(manifest.commands || {})['perde-mask-field']);
    check('çözme kısayolu tanımlı', !!(manifest.commands || {})['perde-decode']);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(50));
console.log('EKLENTİ: ' + pass + '/' + total + ' test geçti (' + fail + ' başarısız)');
console.log('='.repeat(50));
process.exit(fail === 0 ? 0 : 1);
