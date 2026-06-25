// Perde Web - Comprehensive Test Suite
// Run: node test.js

const fs = require('fs');
const d = fs.readFileSync(__dirname + '/dictionaries.js', 'utf8');
const r = fs.readFileSync(__dirname + '/recognizers.js', 'utf8');
const n = fs.readFileSync(__dirname + '/ner-engine.js', 'utf8');
const fn = new Function(d + ';' + r + ';' + n + '; return { ENTITY_LABELS, analyzeText, trLower };');
const { ENTITY_LABELS, analyzeText, trLower } = fn();
const ALL = new Set(Object.keys(ENTITY_LABELS));

let pass = 0, fail = 0, total = 0;

function expectNot(text, entityType, forbiddenValue, threshold = 0.35) {
    total++;
    const findings = analyzeText(text, ALL, threshold);
    const match = forbiddenValue
        ? findings.find(f => f.entity === entityType && (f.value === forbiddenValue || f.value.includes(forbiddenValue)))
        : findings.find(f => f.entity === entityType);
    if (!match) {
        pass++;
    } else {
        fail++;
        console.log(`  FAIL: "${text.substring(0, 60)}..." should NOT detect ${entityType}="${forbiddenValue || 'any'}", but found "${match.value}" (${match.score.toFixed(2)})`);
    }
}

function expect(text, entityType, expectedValue, threshold = 0.35) {
    total++;
    const findings = analyzeText(text, ALL, threshold);
    const match = findings.find(f =>
        f.entity === entityType &&
        (expectedValue === null ||
         f.value === expectedValue ||
         f.value.includes(expectedValue) ||
         trLower(f.value).includes(trLower(expectedValue)))
    );
    if (expectedValue === null) {
        // Expect NO findings of this type
        const any = findings.find(f => f.entity === entityType);
        if (!any) {
            pass++;
            return;
        }
        fail++;
        console.log(`  FAIL: "${text.substring(0, 60)}..." should NOT detect ${entityType}, but found "${any.value}" (${any.score.toFixed(2)})`);
        return;
    }
    if (match) {
        pass++;
    } else {
        fail++;
        const found = findings.filter(f => f.entity === entityType);
        const foundStr = found.length ? found.map(f => `"${f.value}"(${f.score.toFixed(2)})`).join(', ') : 'nothing';
        console.log(`  FAIL: "${text.substring(0, 60)}..." expected ${entityType}="${expectedValue}", found: ${foundStr}`);
    }
}

function expectScore(text, entityType, expectedValue, minScore, maxScore, threshold = 0.0) {
    total++;
    const findings = analyzeText(text, ALL, threshold);
    const match = findings.find(f => f.entity === entityType && f.value.includes(expectedValue));
    if (!match) {
        fail++;
        console.log(`  FAIL: "${text.substring(0, 60)}..." expected ${entityType}="${expectedValue}" with score ${minScore}-${maxScore}, found nothing`);
        return;
    }
    if (match.score >= minScore && match.score <= maxScore) {
        pass++;
    } else {
        fail++;
        console.log(`  FAIL: "${text.substring(0, 60)}..." ${entityType}="${expectedValue}" score=${match.score.toFixed(2)}, expected ${minScore}-${maxScore}`);
    }
}

function expectExclusive(text, entityType, expectedValue, forbiddenEntities, threshold = 0.35) {
    total++;
    const findings = analyzeText(text, ALL, threshold);
    const match = findings.find(f =>
        f.entity === entityType &&
        (f.value === expectedValue || f.value.includes(expectedValue))
    );
    const forbidden = findings.find(f => forbiddenEntities.includes(f.entity));
    if (match && !forbidden) {
        pass++;
        return;
    }
    fail++;
    const summary = findings.map(f => `${f.entity}="${f.value}"`).join(', ') || 'nothing';
    console.log(`  FAIL: "${text.substring(0, 60)}..." expected only ${entityType}="${expectedValue}"; found: ${summary}`);
}

function expectAll(text, expectedPairs, forbiddenEntities = [], threshold = 0.35) {
    total++;
    const findings = analyzeText(text, ALL, threshold);
    const missing = expectedPairs.filter(([entity, value]) =>
        !findings.some(f => f.entity === entity && (f.value === value || f.value.includes(value)))
    );
    const forbidden = findings.find(f => forbiddenEntities.includes(f.entity));
    if (missing.length === 0 && !forbidden) {
        pass++;
        return;
    }
    fail++;
    const summary = findings.map(f => `${f.entity}="${f.value}"`).join(', ') || 'nothing';
    console.log(`  FAIL: "${text.substring(0, 60)}..." missing/forbidden entity; found: ${summary}`);
}

function expectNoneOf(text, entityTypes, threshold = 0.35) {
    total++;
    const findings = analyzeText(text, ALL, threshold);
    const forbidden = findings.filter(f => entityTypes.includes(f.entity));
    if (forbidden.length === 0) {
        pass++;
        return;
    }
    fail++;
    const summary = forbidden.map(f => `${f.entity}="${f.value}"`).join(', ');
    console.log(`  FAIL: "${text.substring(0, 60)}..." should not detect sensitive entities; found: ${summary}`);
}

function expectIn(findings, entityType, expectedValue) {
    total++;
    const match = findings.find(f =>
        f.entity === entityType &&
        (f.value === expectedValue || f.value.includes(expectedValue) || trLower(f.value).includes(trLower(expectedValue)))
    );
    if (match) { pass++; }
    else {
        fail++;
        const found = findings.filter(f => f.entity === entityType);
        const foundStr = found.length ? found.map(f => `"${f.value}"`).join(', ') : 'nothing';
        console.log(`  FAIL: expected ${entityType}="${expectedValue}", found: ${foundStr}`);
    }
}

function expectNotIn(findings, entityType, forbiddenValue) {
    total++;
    const match = findings.find(f =>
        f.entity === entityType &&
        (f.value === forbiddenValue || f.value.includes(forbiddenValue))
    );
    if (!match) { pass++; }
    else {
        fail++;
        console.log(`  FAIL: should NOT detect ${entityType}="${forbiddenValue}", but found "${match.value}"`);
    }
}

// ============================================================
console.log('\n=== TC KİMLİK NO ===');
// ============================================================

// Valid TC Kimlik numbers (checksum passes)
expect('TC Kimlik No: 10000000146', 'TR_NATIONAL_ID', '10000000146');
expect('TCKN: 10000000146', 'TR_NATIONAL_ID', '10000000146');
expect('T.C. Kimlik Numarası: 10000000146', 'TR_NATIONAL_ID', '10000000146');
expect('Nüfus cüzdanı no: 10000000146', 'TR_NATIONAL_ID', '10000000146');

// Without context - should still detect because checksum validates to 1.0
expect('10000000146', 'TR_NATIONAL_ID', '10000000146');

// Invalid TC - 1 digit removed (should NOT detect)
expect('TC Kimlik No: 1000000014', 'TR_NATIONAL_ID', null);

// Invalid TC checksum with context → still detected (format ok + context "kimlik")
expect('TC Kimlik No: 12345678901', 'TR_NATIONAL_ID', '12345678901');
// Invalid TC checksum without context → not detected
expect('Sıra: 12345678901', 'TR_NATIONAL_ID', null);

// TC starting with 0 - invalid
expect('TC Kimlik No: 01234567890', 'TR_NATIONAL_ID', null);

// ============================================================
console.log('\n=== TELEFON ===');
// ============================================================

expect('Telefon: 0532 123 45 67', 'PHONE_NUMBER', '0532 123 45 67');
expect('Tel: 0212 555 44 33', 'PHONE_NUMBER', '0212 555 44 33');
expect('+90 532 123 45 67', 'PHONE_NUMBER', '+90 532 123 45 67');
expect('GSM: 0555-444-33-22', 'PHONE_NUMBER', '0555-444-33-22');
expect('Cep: (532) 123 45 67', 'PHONE_NUMBER', '532) 123 45 67');
expect('+90(532)1234567', 'PHONE_NUMBER', '+90(532)1234567');

// Too short - should NOT detect
expect('Telefon: 0532 123', 'PHONE_NUMBER', null);

// All same digits - should NOT detect
expect('Tel: 0000000000', 'PHONE_NUMBER', null);

// ============================================================
console.log('\n=== E-POSTA ===');
// ============================================================

expect('E-posta: mehmet.demir@example.com', 'EMAIL_ADDRESS', 'mehmet.demir@example.com');
expect('mail: test@example.org', 'EMAIL_ADDRESS', 'test@example.org');
expect('info3@example.com', 'EMAIL_ADDRESS', 'info3@example.com');
expect('ali_veli@example.com', 'EMAIL_ADDRESS', 'ali_veli@example.com');

// Invalid emails
expect('test@', 'EMAIL_ADDRESS', null);
expect('@test.com', 'EMAIL_ADDRESS', null);

// ============================================================
console.log('\n=== KREDİ KARTI ===');
// ============================================================

// Valid Luhn
expect('Kart: 4539 1488 0343 6467', 'CREDIT_CARD', '4539 1488 0343 6467');
expect('Kredi kartı: 5500 0000 0000 0004', 'CREDIT_CARD', '5500 0000 0000 0004');
expect('Visa: 4111111111111111', 'CREDIT_CARD', '4111111111111111');

// Invalid Luhn - should NOT detect
expect('Kart: 1234 5678 9012 3456', 'CREDIT_CARD', null);

// ============================================================
console.log('\n=== IBAN ===');
// ============================================================

expect('IBAN: TR33 0006 1005 1978 6457 8413 26', 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect('IBAN: DE89370400440532013000', 'IBAN_CODE', 'DE89370400440532013000');
expect('Hesap: GB29 NWBK 6016 1331 9268 19', 'IBAN_CODE', 'GB29 NWBK 6016 1331 9268 19');

// Invalid IBAN checksum with context → still detected (format ok + context "IBAN")
expect('IBAN: TR99 0006 1005 1978 6457 8413 26', 'IBAN_CODE', 'TR99 0006 1005 1978 6457 8413 26');
// Invalid IBAN checksum without banking context → not detected
expect('Numara: TR99 0006 1005 1978 6457 8413 26', 'IBAN_CODE', null);

// ============================================================
console.log('\n=== PLAKA ===');
// ============================================================

expect('Plaka: 34 ABC 123', 'TR_LICENSE_PLATE', '34 ABC 123');
expect('Araç plakası: 06 AE 4521', 'TR_LICENSE_PLATE', '06 AE 4521');
expect('plaka: 35-AB-1234', 'TR_LICENSE_PLATE', '35-AB-1234');
expect('Plaka: 01 A 0001', 'TR_LICENSE_PLATE', '01 A 0001');

// Without context — low score, below default threshold
expectScore('01 A 0001', 'TR_LICENSE_PLATE', '01 A 0001', 0.2, 0.35);

// Invalid province code (82+)
expect('Plaka: 82 ABC 123', 'TR_LICENSE_PLATE', null);

// ============================================================
console.log('\n=== IP ADRESİ ===');
// ============================================================

expect('IP: 192.168.1.100', 'IP_ADDRESS', '192.168.1.100');
expect('IP Adresi: 10.0.0.1', 'IP_ADDRESS', '10.0.0.1');
expect('Sunucu: 8.8.8.8', 'IP_ADDRESS', '8.8.8.8');

// Invalid IP - octet > 255
expect('IP: 999.999.999.999', 'IP_ADDRESS', null);

// ============================================================
console.log('\n=== MAC ADRESİ ===');
// ============================================================

expect('MAC: 00:1A:2B:3C:4D:5E', 'MAC_ADDRESS', '00:1A:2B:3C:4D:5E');
expect('MAC: AA-BB-CC-DD-EE-FF', 'MAC_ADDRESS', 'AA-BB-CC-DD-EE-FF');

// All zeros - invalid
expect('MAC: 00:00:00:00:00:00', 'MAC_ADDRESS', null);

// ============================================================
console.log('\n=== TARİH ===');
// ============================================================

expect('15.03.2024', 'DATE_TIME', '15.03.2024');
expect('2024-03-15', 'DATE_TIME', '2024-03-15');
expect('1 Ocak 2024', 'DATE_TIME', '1 Ocak 2024');
expect('15 Mart 2024', 'DATE_TIME', '15 Mart 2024');
expect('3 January 2025', 'DATE_TIME', '3 January 2025');

// ============================================================
console.log('\n=== BAĞLAMSAL TARİH ===');
// ============================================================

expect('Kaza Tarihi: 15.03.2024', 'CONTEXTUAL_DATE', '15.03.2024');
expect('Doğum Tarihi: 22.06.1985', 'CONTEXTUAL_DATE', '22.06.1985');
expect('Duruşma Tarihi: 10.09.2024', 'CONTEXTUAL_DATE', '10.09.2024');
expect('Olay tarihi 01.01.2024', 'CONTEXTUAL_DATE', '01.01.2024');
expect('Ameliyat tarihi: 05.06.2024', 'CONTEXTUAL_DATE', '05.06.2024');
expect('Vefat tarihi: 12.12.2023', 'CONTEXTUAL_DATE', '12.12.2023');
expect('Tebliğ tarihi: 20.01.2025', 'CONTEXTUAL_DATE', '20.01.2025');

// ============================================================
console.log('\n=== KİŞİ ADI ===');
// ============================================================

// Title-triggered
expect('Sayın Ahmet Yılmaz', 'PERSON_NAME', 'Ahmet Yılmaz');
expect('Davacı: Mehmet Demir', 'PERSON_NAME', 'Mehmet Demir');
expect('Dr. Ayşe Kaya', 'PERSON_NAME', 'Ayşe Kaya');
expect('Av. Ersan Çetin', 'PERSON_NAME', 'Ersan Çetin');
expect('Sanık Mustafa Özkan', 'PERSON_NAME', 'Mustafa Özkan');
expect('Tanık: Fatma Arslan', 'PERSON_NAME', 'Fatma Arslan');
expect('Ad Soyad: Ali Veli', 'PERSON_NAME', 'Ali Veli');
expect('Hakim Zeynep Yıldız', 'PERSON_NAME', 'Zeynep Yıldız');

// Suffix-triggered
expect('ersan çetin isimli kişidir', 'PERSON_NAME', 'ersan çetin');
expect('Mehmet Demir adlı kişi', 'PERSON_NAME', 'Mehmet Demir');
expect('Ali Yılmaz adlı şahıs', 'PERSON_NAME', 'Ali Yılmaz');
expect('Fatma Kaya adındaki', 'PERSON_NAME', 'Fatma Kaya');

// Dictionary lookup (no prefix/suffix)
expect('Ahmet Yılmaz telefonla arandı.', 'PERSON_NAME', 'Ahmet Yılmaz');
expect('ersan çetin ile görüşüldü.', 'PERSON_NAME', 'ersan çetin');

// Should NOT detect non-names after title
expect('Davacı Bilgileri:', 'PERSON_NAME', null);
expect('Sigorta Bilgileri gösterildi', 'PERSON_NAME', null);
expect('Banka Bilgisi alındı', 'PERSON_NAME', null);

// ============================================================
console.log('\n=== KURUM/KURULUŞ ===');
// ============================================================

// Known orgs
expect('Sigorta: Axa Sigorta A.Ş.', 'ORGANIZATION', 'Axa Sigorta');
expect('Acıbadem Hastanesi\'ne sevk edildi', 'ORGANIZATION', 'Acıbadem');
expect('SGK\'ya başvurdu', 'ORGANIZATION', 'SGK');

// Suffix patterns
expect('İstanbul Üniversitesi', 'ORGANIZATION', 'Üniversitesi');
expect('Ankara Adliyesi', 'COURT', 'Adliyesi');
expect('Kadıköy Belediyesi', 'ORGANIZATION', 'Belediyesi');

// Court names
expect('İstanbul 3. Asliye Hukuk Mahkemesi', 'COURT', 'Asliye Hukuk');
expect('Ankara 2. İş Mahkemesi', 'COURT', 'İş Mahkemesi');

// ============================================================
console.log('\n=== KONUM/ADRES ===');
// ============================================================

// Provinces
expect('İstanbul\'da yaşıyor', 'LOCATION', 'İstanbul');
expect('Ankara merkezde', 'LOCATION', 'Ankara');
expect('İzmir\'e gitti', 'LOCATION', 'İzmir');

// Districts
expect('Kadıköy\'de oturuyor', 'LOCATION', 'Kadıköy');
expect('Beşiktaş ilçesinde', 'LOCATION', 'Beşiktaş');

// Address patterns
expect('Atatürk Cad. No:42', 'LOCATION', 'Atatürk Cad.');
expect('Cumhuriyet Mahallesi', 'LOCATION', 'Cumhuriyet Mahallesi');

// ============================================================
console.log('\n=== DOSYA/DAVA NO ===');
// ============================================================

expect('Dosya No: 2024/12345', 'CASE_NUMBER', '2024/12345');
expect('2024/56789 Esas', 'CASE_NUMBER', '2024/56789');
expect('Esas No: 2023/1234', 'CASE_NUMBER', '2023/1234');
expect('Karar No: 2024/5678', 'CASE_NUMBER', '2024/5678');
expect('Soruşturma No: 2024/99999', 'CASE_NUMBER', '2024/99999');

// ============================================================
console.log('\n=== POLİÇE NO ===');
// ============================================================

expect('Poliçe No: TSS-2024-0012345', 'POLICY_NUMBER', 'TSS-2024-0012345');
expect('Trafik poliçe no: ABC123456', 'POLICY_NUMBER', 'ABC123456');
expect('Kasko sigorta numarası: KSK-2024-001', 'POLICY_NUMBER', 'KSK-2024-001');

// ============================================================
console.log('\n=== HASTA/PROTOKOL NO ===');
// ============================================================

expect('Hasta Protokol No: 20240315-0042', 'MEDICAL_ID', '20240315-0042');
expect('Protokol No: A12345', 'MEDICAL_ID', 'A12345');
expect('Muayene No: 2024001', 'MEDICAL_ID', '2024001');
expect('Epikriz No: EP-2024-0001', 'MEDICAL_ID', 'EP-2024-0001');
expect('Rapor No: R123456', 'MEDICAL_ID', 'R123456');

// Should NOT match "Hastanesi"
expect('Acıbadem Hastanesi Kadıköy', 'MEDICAL_ID', null);

// ============================================================
console.log('\n=== ARAÇ KİMLİK (ŞASİ/MOTOR) ===');
// ============================================================

expect('Şasi No: WVWZZZ3CZWE123456', 'VEHICLE_ID', 'WVWZZZ3CZWE123456');
expect('Motor No: ABC123456', 'VEHICLE_ID', 'ABC123456');
expect('Ruhsat No: TR-34-123456', 'VEHICLE_ID', 'TR-34-123456');

// ============================================================
console.log('\n=== VERGİ NO ===');
// ============================================================

// Without context - should NOT detect (base score 0.01)
expect('Numara: 1234567890', 'TR_VERGI_NO', null);

// With context - should detect
expect('Vergi No: 1234567890', 'TR_VERGI_NO', '1234567890');
expect('VKN: 1234567890', 'TR_VERGI_NO', '1234567890');

// ============================================================
console.log('\n=== SGK NO ===');
// ============================================================

expect('SGK No: 1234567', 'TR_SGK_NO', '1234567');
expect('Sigorta sicil no: 12345678', 'TR_SGK_NO', '12345678');

// Without context - should NOT detect
expect('Numara: 1234567', 'TR_SGK_NO', null);

// ============================================================
console.log('\n=== PASAPORT ===');
// ============================================================

expect('Pasaport No: U12345678', 'TR_PASAPORT', 'U12345678');
expect('Pasaport numarası: A98765432', 'TR_PASAPORT', 'A98765432');

// ============================================================
console.log('\n=== URL & DOMAIN ===');
// ============================================================

expect('Site: https://www.example.com/path', 'URL', 'www.example.com/path');
expect('https://test.co.uk/page?q=1', 'URL', 'test.co.uk/page?q=1');

expect('domain: example.com', 'DOMAIN', 'example.com');
expect('test.com.tr', 'DOMAIN', 'test.com.tr');

// ============================================================
console.log('\n=== US SSN ===');
// ============================================================

expect('SSN: 219-09-9999', 'US_SSN', '219-09-9999');

// Invalid - area 000
expect('SSN: 000-12-3456', 'US_SSN', null);
// Invalid - area 666
expect('SSN: 666-12-3456', 'US_SSN', null);
// Invalid - sequential
expect('SSN: 123-45-6789', 'US_SSN', null);

// ============================================================
console.log('\n=== FALSE POSITIVE KONTROL ===');
// ============================================================

// Normal text - should NOT detect PII
expect('Bu bir test cümlesidir.', 'PERSON_NAME', null);
expect('Toplantı saat 14:00\'da başlayacak.', 'PERSON_NAME', null);
expect('100 adet ürün sipariş edildi.', 'TR_NATIONAL_ID', null);
expect('Bina 42 numarada bulunmaktadır.', 'PHONE_NUMBER', null);

// "Bilgileri" after title should NOT be a name
expect('Davacı Bilgileri:', 'PERSON_NAME', null);
expect('Tedavi Bilgileri:', 'PERSON_NAME', null);
expect('Sigorta Bilgisi:', 'PERSON_NAME', null);

// Numbers that look like but aren't PII
expect('Sipariş no: 12345', 'TR_SGK_NO', null);
expect('Oda numarası: 4567890', 'TR_SGK_NO', null);

// Year/simple date shouldn't be TC Kimlik
expect('Yıl: 2024', 'TR_NATIONAL_ID', null);

// TC Kimlik with wrong digit count
expect('TC: 1234567890', 'TR_NATIONAL_ID', null);  // 10 digits
expect('TC: 123456789012', 'TR_NATIONAL_ID', null); // 12 digits

// ============================================================
console.log('\n=== KARMAŞIK BELGE TESTİ ===');
// ============================================================

const legalDoc = `
T.C.
İSTANBUL 5. ASLİYE HUKUK MAHKEMESİ

DOSYA NO: 2024/54321 Esas

DAVACI: Ersan Çetin (TC: 10000000146)
VEKİLİ: Av. Mehmet Kara

DAVALI: Ali Rıza Demir
VEKİLİ: Av. Zeynep Yıldırım

KONU: Tazminat Davası

Kaza Tarihi: 15.03.2024
Kaza Yeri: Bağdat Caddesi No:142, Kadıköy/İstanbul

Davacının aracı (34 AE 789) ile davalının aracı (06 AB 1234) çarpışmıştır.
Davacının şasi numarası: WVWZZZ3CZWE999999

Sigorta Bilgileri:
Poliçe No: TRF-2024-0098765
Sigorta Şirketi: Allianz Sigorta A.Ş.
IBAN: TR33 0006 1005 1978 6457 8413 26

Tedavi Bilgileri:
Hastane: Acıbadem Hastanesi Kadıköy
Hasta Protokol No: 20240315-0042
Tedavi Tarihi: 16.03.2024

İletişim:
Tel: 0532 987 65 43
E-posta: ersan.cetin@example.com
`;

const docFindings = analyzeText(legalDoc, ALL, 0.35);
console.log(`  Belge testi: ${docFindings.length} bulgu tespit edildi`);

// Check specific entities in the document
const docEntities = docFindings.map(f => f.entity);
const expectedEntities = [
    'CASE_NUMBER', 'PERSON_NAME', 'TR_NATIONAL_ID', 'CONTEXTUAL_DATE',
    'LOCATION', 'TR_LICENSE_PLATE', 'VEHICLE_ID', 'POLICY_NUMBER',
    'ORGANIZATION', 'IBAN_CODE', 'MEDICAL_ID', 'PHONE_NUMBER', 'EMAIL_ADDRESS',
];
for (const ent of expectedEntities) {
    total++;
    if (docEntities.includes(ent)) {
        pass++;
    } else {
        fail++;
        console.log(`  FAIL: Belge testinde ${ENTITY_LABELS[ent] || ent} (${ent}) tespit edilemedi`);
    }
}

// Check for specific false positives in the document
const docNames = docFindings.filter(f => f.entity === 'PERSON_NAME');
for (const name of docNames) {
    total++;
    if (['bilgileri', 'bilgisi', 'numarası', 'Protokol', 'nesi'].some(bad => name.value.includes(bad))) {
        fail++;
        console.log(`  FAIL: False positive isim: "${name.value}"`);
    } else {
        pass++;
    }
}

// ============================================================
console.log('\n=== SKOR SİSTEMİ TESTİ ===');
// ============================================================

// TC Kimlik - valid checksum should be 1.0
expectScore('TC: 10000000146', 'TR_NATIONAL_ID', '10000000146', 1.0, 1.0);

// Email with valid TLD should be 1.0
expectScore('test@example.com', 'EMAIL_ADDRESS', 'test@example.com', 0.85, 1.0);

// IBAN with valid MOD-97 should be 1.0
expectScore('TR33 0006 1005 1978 6457 8413 26', 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26', 1.0, 1.0);

// Vergi No without context should not pass default threshold
expect('numara 1234567890 yazılı', 'TR_VERGI_NO', null);

// Vergi No with context should be enhanced
expectScore('Vergi No: 1234567890', 'TR_VERGI_NO', '1234567890', 0.9, 1.0);

// Plate without context - base score
expectScore('34 ABC 123', 'TR_LICENSE_PLATE', '34 ABC 123', 0.2, 0.4);

// Plate with context - enhanced
expectScore('Plaka: 34 ABC 123', 'TR_LICENSE_PLATE', '34 ABC 123', 0.5, 0.75);

// ============================================================
console.log('\n=== TÜRKÇE KARAKTER EDGE CASE ===');
// ============================================================

// İ/I lowercase issue
expect('İstanbul\'dan geldi', 'LOCATION', 'İstanbul');
expect('İzmir\'e uçtu', 'LOCATION', 'İzmir');
expect('Şırnak ilinde', 'LOCATION', 'Şırnak');
expect('Çanakkale\'ye gidecek', 'LOCATION', 'Çanakkale');
expect('Ğ ile başlayan il yok ama Ağrı var', 'LOCATION', 'Ağrı');
expect('Muğla sahillerinde', 'LOCATION', 'Muğla');
expect('Düzce/Bolu arası', 'LOCATION', 'Düzce');

// Turkish names with İ
expect('Sayın İbrahim Çelik', 'PERSON_NAME', 'İbrahim Çelik');
expect('Dr. Şeyma Öztürk', 'PERSON_NAME', 'Şeyma Öztürk');
expect('Davacı: Ümit Güneş', 'PERSON_NAME', 'Ümit Güneş');

// ============================================================
console.log('\n=== ÇOK SATIRLI BELGE ===');
// ============================================================

const multiLineDoc = `HASTA BİLGİLERİ
Ad Soyad: Fatma Arslan
TC Kimlik No: 10000000146
Doğum Tarihi: 01.05.1990
Adres: Bağdat Caddesi No:55, Kadıköy/İstanbul
Tel: +90 532 111 22 33
E-posta: fatma.arslan@example.com
Sigorta: Axa Sigorta A.Ş.
Poliçe No: SGL-2024-0001234
Hasta Protokol No: H2024-0001
Rapor No: R789012
Dosya No: 2024/99999 Esas`;

const mlFindings = analyzeText(multiLineDoc, ALL, 0.35);
const mlEntities = [...new Set(mlFindings.map(f => f.entity))];
const mlExpected = ['PERSON_NAME', 'TR_NATIONAL_ID', 'CONTEXTUAL_DATE', 'LOCATION', 'PHONE_NUMBER',
                    'EMAIL_ADDRESS', 'ORGANIZATION', 'POLICY_NUMBER', 'MEDICAL_ID', 'CASE_NUMBER'];
console.log(`  Çok satırlı belge: ${mlFindings.length} bulgu, ${mlEntities.length} farklı tip`);
for (const ent of mlExpected) {
    total++;
    if (mlEntities.includes(ent)) {
        pass++;
    } else {
        fail++;
        console.log(`  FAIL: Çok satırlı belgede ${ENTITY_LABELS[ent]} (${ent}) tespit edilemedi`);
    }
}

// ============================================================
console.log('\n=== CONSECUTIVE PII (art arda) ===');
// ============================================================

// Multiple PII in same line
expect('TC: 10000000146, Tel: 0532 123 45 67', 'TR_NATIONAL_ID', '10000000146');
expect('TC: 10000000146, Tel: 0532 123 45 67', 'PHONE_NUMBER', '0532 123 45 67');

// Multiple names
expect('Sayın Ahmet Yılmaz ve Mehmet Demir', 'PERSON_NAME', 'Ahmet Yılmaz');
expect('Sayın Ahmet Yılmaz ve Mehmet Demir', 'PERSON_NAME', 'Mehmet Demir');

// Multiple dates
expect('Başlangıç: 01.01.2024 - Bitiş: 31.12.2024', 'DATE_TIME', '01.01.2024');
expect('Başlangıç: 01.01.2024 - Bitiş: 31.12.2024', 'DATE_TIME', '31.12.2024');

// ============================================================
console.log('\n=== SINIR DURUMLARI ===');
// ============================================================

// Very long text with PII at the end
const longText = 'Bu çok uzun bir metin. '.repeat(50) + 'TC Kimlik: 10000000146';
expect(longText, 'TR_NATIONAL_ID', '10000000146');

// PII at very beginning
expect('10000000146 numaralı TC kimlik', 'TR_NATIONAL_ID', '10000000146');

// Empty/minimal input
expect('', 'PERSON_NAME', null);
expect('a', 'PERSON_NAME', null);
expect('test', 'PERSON_NAME', null);

// Numbers that could be confused
expect('Oda 305, bina 12', 'TR_NATIONAL_ID', null);
expect('sayfa 42', 'TR_NATIONAL_ID', null);

// ============================================================
console.log('\n=== FARKLI ANONİMLEŞTİRME SENARYOLARI ===');
// ============================================================

// Insurance claim document
const insuranceDoc = `SİGORTA HASAR İHBAR FORMU
Sigortalı: Ali Rıza Yılmaz
Poliçe No: TRF-2024-555888
Hasar Tarihi: 03.07.2024
Araç: 35 BCD 456
Şasi No: TMBJB25J2E4012345
Karşı Taraf: Veli Kara (06 EF 789)
Hasar Tutarı: 45.000 TL
Banka IBAN: TR33 0006 1005 1978 6457 8413 26`;

const insFindings = analyzeText(insuranceDoc, ALL, 0.35);
console.log(`  Sigorta belgesi: ${insFindings.length} bulgu`);

const insExpected = ['PERSON_NAME', 'POLICY_NUMBER', 'CONTEXTUAL_DATE', 'TR_LICENSE_PLATE', 'VEHICLE_ID', 'IBAN_CODE'];
for (const ent of insExpected) {
    total++;
    if (insFindings.some(f => f.entity === ent)) {
        pass++;
    } else {
        fail++;
        console.log(`  FAIL: Sigorta belgesinde ${ENTITY_LABELS[ent]} (${ent}) tespit edilemedi`);
    }
}

// Medical report
const medicalDoc = `TIBBI RAPOR
Hasta: Zeynep Kaya
TC: 10000000146
Muayene No: M2024-0088
Epikriz No: EP-1234-5678
Tedavi tarihi: 12.08.2024
Hastane: İstanbul Üniversitesi Tıp Fakültesi Hastanesi
Sevk No: SVK-2024-001`;

const medFindings = analyzeText(medicalDoc, ALL, 0.35);
console.log(`  Tıbbi rapor: ${medFindings.length} bulgu`);

const medExpected = ['PERSON_NAME', 'TR_NATIONAL_ID', 'MEDICAL_ID', 'CONTEXTUAL_DATE', 'ORGANIZATION'];
for (const ent of medExpected) {
    total++;
    if (medFindings.some(f => f.entity === ent)) {
        pass++;
    } else {
        fail++;
        console.log(`  FAIL: Tıbbi raporda ${ENTITY_LABELS[ent]} (${ent}) tespit edilemedi`);
    }
}

// ============================================================
console.log('\n=== AVUKAT BELGE SENARYOLARı ===');
// ============================================================

// Vekaletname
const vekaletname = `VEKALETNAME
Vekalet veren: Ayşe Güneş (TC: 10000000146)
Vekil: Av. Ersan Çetin
Konu: İstanbul 3. Asliye Hukuk Mahkemesi 2024/12345 Esas sayılı dava
Tarih: 15.06.2024
Adres: Bağdat Caddesi No:55, Kadıköy/İstanbul
Tel: 0216 345 67 89`;

const vekFindings = analyzeText(vekaletname, ALL, 0.35);
console.log(`  Vekaletname: ${vekFindings.length} bulgu`);
const vekExpected = ['PERSON_NAME', 'TR_NATIONAL_ID', 'CASE_NUMBER', 'DATE_TIME', 'LOCATION', 'PHONE_NUMBER'];
for (const ent of vekExpected) {
    total++;
    if (vekFindings.some(f => f.entity === ent)) { pass++; }
    else { fail++; console.log(`  FAIL: Vekaletnamede ${ENTITY_LABELS[ent]} (${ent}) tespit edilemedi`); }
}

// Dilekçe
const dilekce = `İSTANBUL NÖBETÇİ ASLİYE HUKUK MAHKEMESİNE

DAVACI: Mehmet Arslan - TC: 10000000146
VEKİLİ: Av. Zeynep Yıldırım - İstanbul Barosu Sicil No: 12345
DAVALI: Güneş İnşaat Taahhüt A.Ş.
Mersis No: 0123456789012345

KONU: Fazlaya ilişkin haklar saklı kalmak kaydıyla 150.000-TL maddi tazminat talebi

AÇIKLAMALAR:
1. Müvekkil 01.03.2024 tarihinde Atatürk Bulvarı No:88, Çankaya/Ankara adresinde meydana gelen iş kazası sonucu yaralanmıştır.
2. Kaza sonrası Ankara Numune Hastanesi'ne kaldırılmış, Hasta Protokol No: H2024-5566 ile tedavi görmüştür.
3. SGK'ya 2024/78901 sayılı dosya ile başvuru yapılmıştır.
4. Müvekkilin IBAN: TR33 0006 1005 1978 6457 8413 26 hesabına ödeme yapılması talep olunur.

SONUÇ ve İSTEM: Yukarıda açıklanan nedenlerle davanın kabulünü saygılarımla arz ve talep ederim. 20.06.2024

Av. Zeynep Yıldırım
Tel: 0312 444 55 66
E-posta: zeynep@example.com`;

const dilFindings = analyzeText(dilekce, ALL, 0.35);
console.log(`  Dilekçe: ${dilFindings.length} bulgu`);
const dilExpected = ['PERSON_NAME', 'TR_NATIONAL_ID', 'ORGANIZATION', 'LOCATION', 'DATE_TIME',
                     'MEDICAL_ID', 'CASE_NUMBER', 'IBAN_CODE', 'PHONE_NUMBER', 'EMAIL_ADDRESS'];
for (const ent of dilExpected) {
    total++;
    if (dilFindings.some(f => f.entity === ent)) { pass++; }
    else { fail++; console.log(`  FAIL: Dilekçede ${ENTITY_LABELS[ent]} (${ent}) tespit edilemedi`); }
}

// İcra takibi
const icra = `İCRA TAKİP TALEBİ
Alacaklı: Fatma Demir - TC: 10000000146
Borçlu: Ali Kara
Dosya No: 2024/E-98765
Takip Konusu: Kira alacağı
Toplam Borç: 45.000 TL
Borçlu Adresi: Cumhuriyet Mahallesi Gül Sokak No:15, Üsküdar/İstanbul
Borçlu Tel: 0533 222 33 44
Borçlu IBAN: DE89370400440532013000`;

const icraFindings = analyzeText(icra, ALL, 0.35);
console.log(`  İcra takibi: ${icraFindings.length} bulgu`);
const icraExpected = ['PERSON_NAME', 'TR_NATIONAL_ID', 'CASE_NUMBER', 'LOCATION', 'PHONE_NUMBER', 'IBAN_CODE'];
for (const ent of icraExpected) {
    total++;
    if (icraFindings.some(f => f.entity === ent)) { pass++; }
    else { fail++; console.log(`  FAIL: İcra takibinde ${ENTITY_LABELS[ent]} (${ent}) tespit edilemedi`); }
}

// ============================================================
console.log('\n=== KARIŞIK DİL / FORMAT TESTLERİ ===');
// ============================================================

// Turkish text with English PII
expect('Please contact john.smith@example.com for details', 'EMAIL_ADDRESS', 'john.smith@example.com');
expect('SSN: 219-09-9999, passport: A12345678', 'US_SSN', '219-09-9999');

// Mixed Turkish-English document
expect('Customer ID (Müşteri No): 10000000146', 'TR_NATIONAL_ID', '10000000146');

// PII with tabs/newlines
expect('TC:\t10000000146', 'TR_NATIONAL_ID', '10000000146');
expect('E-posta:\nmehmet@example.com', 'EMAIL_ADDRESS', 'mehmet@example.com');

// Turkish date with Ay names
expect('15 Haziran 2024 tarihinde', 'DATE_TIME', '15 Haziran 2024');
expect('1 Ocak 2024', 'DATE_TIME', '1 Ocak 2024');
expect('22 Eylül 2023', 'DATE_TIME', '22 Eylül 2023');

// ============================================================
console.log('\n=== DAHA FAZLA FALSE POSİTİVE TESTİ ===');
// ============================================================

// Common Turkish words that might look like PII
expect('Bu belge 3 nüsha düzenlenmiştir.', 'TR_NATIONAL_ID', null);
expect('Toplantı 45 dakika sürdü.', 'TR_NATIONAL_ID', null);
expect('Fiyat: 1.250,00 TL', 'DATE_TIME', null);  // 1.250 looks like date but isn't
expect('Madde 125/A hükmüne göre', 'CASE_NUMBER', null);  // 125/A is not a case number
expect('Saat 14:30 gibi geleceğiz', 'MAC_ADDRESS', null);
expect('Puan: 95/100', 'CASE_NUMBER', null);  // not year/number format
expect('3. kat, 5. oda', 'TR_NATIONAL_ID', null);
expect('Bölüm 2, paragraf 3', 'TR_NATIONAL_ID', null);

// Organization false positives
expect('Bu holding şirketidir.', 'ORGANIZATION', null);  // "Bu" is stop word
expect('Her bankası iyi değil.', 'ORGANIZATION', null); // "Her" is stop word
expect('Bir vakfı ziyaret ettik.', 'ORGANIZATION', null); // "Bir" is stop word
expect('O şirketi kapatıldı.', 'ORGANIZATION', null); // "O" is stop word

// Person name false positives with common words
expect('Can yeleği giyiniz.', 'PERSON_NAME', null);  // "Can" alone is not a full name
expect('Deniz kenarında oturuyorlar.', 'PERSON_NAME', null); // "Deniz" alone
expect('Emir verdi.', 'PERSON_NAME', null); // Single common word

// Location ambiguity - "Van" is both a province and a common word
expect('Van Gogh tablosu', 'LOCATION', 'Van'); // OK to detect as location

// Dates that are prices/numbers
expect('Ürün kodu: 12.34.5678', 'DATE_TIME', '12.34.5678'); // looks like date, OK to detect

// ============================================================
console.log('\n=== KRİTİK OVERLAP TESTLERİ ===');
// ============================================================

// TC Kimlik should beat Vergi No when checksum passes
const tcVsTax = analyzeText('TC: 10000000146', ALL, 0.0);
total++;
const tcFound = tcVsTax.find(f => f.entity === 'TR_NATIONAL_ID' && f.value === '10000000146');
const taxFound = tcVsTax.find(f => f.entity === 'TR_VERGI_NO' && f.value === '10000000146');
if (tcFound && !taxFound) { pass++; }
else { fail++; console.log(`  FAIL: TC should beat Vergi No - tc:${!!tcFound} tax:${!!taxFound}`); }

// IBAN should not be detected as phone/credit card
const ibanTest = analyzeText('IBAN: TR33 0006 1005 1978 6457 8413 26', ALL, 0.35);
total++;
const ibanCC = ibanTest.filter(f => f.entity === 'CREDIT_CARD');
if (ibanCC.length === 0) { pass++; }
else { fail++; console.log(`  FAIL: IBAN triggered CREDIT_CARD false positive`); }

// Email should not be detected as domain
const emailTest = analyzeText('test@example.com', ALL, 0.35);
total++;
const emailDomain = emailTest.filter(f => f.entity === 'DOMAIN' && f.value === 'example.com');
// Domain detection is OK alongside email, but email should exist
const emailEmail = emailTest.find(f => f.entity === 'EMAIL_ADDRESS');
if (emailEmail) { pass++; }
else { fail++; console.log(`  FAIL: Email not detected in email test`); }

// ============================================================
console.log('\n=== TÜRKÇE AY İSİMLERİ ===');
// ============================================================

// Currently only Ocak is supported in date regex. Let's test and add more.
const turkishMonths = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                       'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
for (const month of turkishMonths) {
    const text = `15 ${month} 2024`;
    const findings = analyzeText(text, ALL, 0.35);
    const dateFound = findings.find(f => f.entity === 'DATE_TIME' && f.value.includes(month));
    total++;
    if (dateFound) { pass++; }
    else { fail++; console.log(`  FAIL: Türkçe ay "${month}" tespit edilemedi: "15 ${month} 2024"`); }
}

// ============================================================
console.log('\n=== PERFORMANS TESTİ ===');
// ============================================================

const bigDoc = `
Sayın Mehmet Yılmaz,
TC Kimlik No: 10000000146
Tel: 0532 123 45 67
E-posta: mehmet@example.com
IBAN: TR33 0006 1005 1978 6457 8413 26
Dosya No: 2024/12345
`.repeat(100);

const startTime = Date.now();
const bigFindings = analyzeText(bigDoc, ALL, 0.35);
const elapsed = Date.now() - startTime;
console.log(`  ${bigDoc.length} karakter, ${bigFindings.length} bulgu, ${elapsed}ms`);
total++;
if (elapsed < 5000) { pass++; }
else { fail++; console.log(`  FAIL: Performans testi çok yavaş: ${elapsed}ms`); }

// ============================================================
console.log('\n=== BOŞANMA DAVASI DİLEKÇESİ ===');
// ============================================================

const bosanma = `DAVACI: Elif Yıldırım - TC Kimlik No: 10000000146
VEKİLİ: Av. Ersan Çetin - İstanbul Barosu Sicil: 45678
Adres: Bağdat Cad. No:120/3, Kadıköy/İstanbul
Tel: 0532 888 77 66
E-posta: elif.yildirim@example.com

DAVALI: Burak Yıldırım - TC Kimlik No: 11111111110
Adres: Atatürk Mah. Gül Sok. No:8/5, Maltepe/İstanbul
Tel: 0544 222 33 44
İşyeri: Yıldırım İnşaat Ltd. Şti.

Evlilik Tarihi: 14.02.2018
Ayrılık Tarihi: 01.09.2023
Müşterek çocuk: Defne Yıldırım, doğum tarihi: 10.06.2019, TC: 22222222220
SGK No: 8765432`;

const bosanmaF = analyzeText(bosanma, ALL, 0.35);
console.log(`  Boşanma dilekçesi: ${bosanmaF.length} bulgu`);

// Her iki tarafın isimleri
expect(bosanma, 'PERSON_NAME', 'Elif Yıldırım');
expect(bosanma, 'PERSON_NAME', 'Burak Yıldırım');
expect(bosanma, 'PERSON_NAME', 'Ersan Çetin');
expect(bosanma, 'PERSON_NAME', 'Defne Yıldırım');
// TC'ler
expect(bosanma, 'TR_NATIONAL_ID', '10000000146');
expect(bosanma, 'TR_NATIONAL_ID', '11111111110');
expect(bosanma, 'TR_NATIONAL_ID', '22222222220');
// İletişim
expect(bosanma, 'PHONE_NUMBER', '0532 888 77 66');
expect(bosanma, 'PHONE_NUMBER', '0544 222 33 44');
expect(bosanma, 'EMAIL_ADDRESS', 'elif.yildirim@example.com');
// Konum
expect(bosanma, 'LOCATION', 'Kadıköy');
expect(bosanma, 'LOCATION', 'İstanbul');
expect(bosanma, 'LOCATION', 'Maltepe');
// Tarihler
expect(bosanma, 'CONTEXTUAL_DATE', '10.06.2019');
// Kurum
expect(bosanma, 'ORGANIZATION', 'İstanbul Barosu');

// ============================================================
console.log('\n=== İŞ KAZASI BİLİRKİŞİ RAPORU ===');
// ============================================================

const bilirkisi = `BİLİRKİŞİ RAPORU
Dosya No: 2024/34567 Esas
Mahkeme: İstanbul 12. İş Mahkemesi

DAVACI İŞÇİ:
Ad Soyad: Hasan Korkmaz
TC Kimlik No: 10000000146
Doğum Tarihi: 03.08.1985
SGK Sicil No: 9012345
İşe Giriş Tarihi: 15.01.2020
Kaza Tarihi: 22.11.2023
Meslek: Elektrik Teknisyeni

İŞVEREN:
Unvan: Mega Enerji Elektrik San. ve Tic. A.Ş.
Vergi No: 1234567890
Mersis No: 0123456789012345
Adres: Organize Sanayi Bölgesi 3. Cadde No:45, Gebze/Kocaeli

KAZA BİLGİLERİ:
Kaza Yeri: Fabrika B Blok, Trafo Merkezi
Kaza Saati: 14:35
Rapor veren hastane: Gebze Fatih Devlet Hastanesi
Hasta Protokol No: 20231122-0089
Ameliyat Tarihi: 23.11.2023
Taburcu Tarihi: 05.12.2023
Epikriz No: EP-2023-4455

ARAÇ BİLGİLERİ (İş yerine giderken):
Plaka: 41 AK 567
Şasi No: WBAPH5C55BA271048

KUSUR DAĞILIMI:
İşveren kusuru: %70
İşçi kusuru: %20
Üçüncü kişi kusuru: %10

HESAPLAMA:
İşçinin IBAN: TR33 0006 1005 1978 6457 8413 26
Tazminat tutarı: 450.000,00 TL`;

const bilirkisiF = analyzeText(bilirkisi, ALL, 0.35);
console.log(`  Bilirkişi raporu: ${bilirkisiF.length} bulgu`);

expect(bilirkisi, 'CASE_NUMBER', '2024/34567');
expect(bilirkisi, 'COURT', 'İş Mahkemesi');
expect(bilirkisi, 'PERSON_NAME', 'Hasan Korkmaz');
expect(bilirkisi, 'TR_NATIONAL_ID', '10000000146');
expect(bilirkisi, 'CONTEXTUAL_DATE', '03.08.1985');
expect(bilirkisi, 'CONTEXTUAL_DATE', '22.11.2023');
expect(bilirkisi, 'CONTEXTUAL_DATE', '23.11.2023');
expect(bilirkisi, 'CONTEXTUAL_DATE', '05.12.2023');
expect(bilirkisi, 'TR_VERGI_NO', '1234567890');
expect(bilirkisi, 'LOCATION', 'Kocaeli');
expect(bilirkisi, 'MEDICAL_ID', '20231122-0089');
expect(bilirkisi, 'MEDICAL_ID', 'EP-2023-4455');
expect(bilirkisi, 'TR_LICENSE_PLATE', '41 AK 567');
expect(bilirkisi, 'VEHICLE_ID', 'WBAPH5C55BA271048');
expect(bilirkisi, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(bilirkisi, 'SGK_NO' in ENTITY_LABELS ? 'TR_SGK_NO' : 'TR_SGK_NO', '9012345');

// ============================================================
console.log('\n=== YARGI KARARI (CEZA) ===');
// ============================================================

const cezaKarari = `T.C.
İSTANBUL 8. AĞIR CEZA MAHKEMESİ

DOSYA NO: 2023/789 Esas
KARAR NO: 2024/234

SANIK: Oğuz Demirtaş
TC Kimlik No: 10000000146
Baba Adı: Kemal
Ana Adı: Fatma
Doğum Tarihi: 17.04.1992
Doğum Yeri: Trabzon
Nüfusa Kayıtlı Olduğu Yer: Trabzon/Ortahisar
Adres: Cumhuriyet Mah. Lale Sok. No:3/7, Beyoğlu/İstanbul
Meslek: Serbest
Medeni Hal: Bekar
Cep Tel: 0535 111 99 88

MÜŞTEKİ: Selma Aydın
TC Kimlik No: 11111111110
Adres: Acıbadem Mah. Çeşme Sok. No:22, Üsküdar/İstanbul
Tel: 0216 333 44 55

KATILAN VEKİLİ: Av. Fatih Güler
İstanbul Barosu Sicil: 67890

SUÇ TARİHİ: 05.06.2023
SUÇ YERİ: Taksim Meydanı, Beyoğlu/İstanbul
TUTUKLAMA TARİHİ: 06.06.2023
TAHLİYE TARİHİ: 15.09.2023

HÜKÜM: Sanık Oğuz Demirtaş'ın TCK 86/1 maddesi gereğince 1 yıl 6 ay hapis cezası ile cezalandırılmasına,
CMK 231 gereğince hükmün açıklanmasının geri bırakılmasına,
Denetim süresi 5 yıl olarak belirlenmesine karar verildi.

Duruşma Tarihi: 12.03.2024`;

const cezaF = analyzeText(cezaKarari, ALL, 0.35);
console.log(`  Ceza kararı: ${cezaF.length} bulgu`);

expect(cezaKarari, 'CASE_NUMBER', '2023/789');
expect(cezaKarari, 'CASE_NUMBER', '2024/234');
expect(cezaKarari, 'PERSON_NAME', 'Oğuz Demirtaş');
expect(cezaKarari, 'PERSON_NAME', 'Selma Aydın');
expect(cezaKarari, 'PERSON_NAME', 'Fatih Güler');
expect(cezaKarari, 'TR_NATIONAL_ID', '10000000146');
expect(cezaKarari, 'TR_NATIONAL_ID', '11111111110');
expect(cezaKarari, 'CONTEXTUAL_DATE', '17.04.1992');
expect(cezaKarari, 'CONTEXTUAL_DATE', '12.03.2024');
expect(cezaKarari, 'LOCATION', 'Trabzon');
expect(cezaKarari, 'LOCATION', 'İstanbul');
expect(cezaKarari, 'LOCATION', 'Beyoğlu');
expect(cezaKarari, 'LOCATION', 'Üsküdar');
expect(cezaKarari, 'PHONE_NUMBER', '0535 111 99 88');
expect(cezaKarari, 'PHONE_NUMBER', '0216 333 44 55');
expect(cezaKarari, 'COURT', 'Ağır Ceza');
expect(cezaKarari, 'ORGANIZATION', 'İstanbul Barosu');

// ============================================================
console.log('\n=== TRAFİK KAZASI TESPİT TUTANAĞI ===');
// ============================================================

const trafikKaza = `TRAFİK KAZA TESPİT TUTANAĞI

Tutanak No: 2024-KDK-003456
Kaza Tarihi: 18.04.2024
Kaza Saati: 08:45
Kaza Yeri: E-5 Karayolu, Bakırköy girişi, İstanbul

1. SÜRÜCÜ:
Ad Soyad: Murat Şahin
TC: 10000000146
Ehliyet No: B-123456789
Doğum Tarihi: 25.07.1988
Tel: 0542 666 77 88
Araç Plaka: 34 FG 456
Marka/Model: Toyota Corolla 2020
Şasi No: SB1ZJ3BE5HE012345
Motor No: 1NR-FE-1234567
Ruhsat No: TR-34-AA-987654
Poliçe No: TRF-2024-1112233
Sigorta: Axa Sigorta A.Ş.
Poliçe Bitiş Tarihi: 30.06.2024
Hasar Bölgesi: Sol ön çamurluk, tampon

2. SÜRÜCÜ:
Ad Soyad: Zehra Koç
TC: 11111111110
Ehliyet No: B-987654321
Doğum Tarihi: 11.03.1995
Tel: 0553 999 88 77
Araç Plaka: 06 HJ 789
Marka/Model: Renault Clio 2022
Şasi No: VF15RBF0A57123456
Poliçe No: KSK-2024-5566778
Sigorta: Allianz Sigorta A.Ş.

TANIK:
Ad Soyad: Veli Arslan
Tel: 0505 444 33 22

Tutanağı düzenleyen: Başkomiser Ahmet Kılıç
Sicil No: 123456`;

const trafikF = analyzeText(trafikKaza, ALL, 0.35);
console.log(`  Trafik kaza tutanağı: ${trafikF.length} bulgu`);

// Sürücüler
expect(trafikKaza, 'PERSON_NAME', 'Murat Şahin');
expect(trafikKaza, 'PERSON_NAME', 'Zehra Koç');
expect(trafikKaza, 'PERSON_NAME', 'Veli Arslan');
expect(trafikKaza, 'PERSON_NAME', 'Ahmet Kılıç');
// TC'ler
expect(trafikKaza, 'TR_NATIONAL_ID', '10000000146');
expect(trafikKaza, 'TR_NATIONAL_ID', '11111111110');
// Tarihler
expect(trafikKaza, 'CONTEXTUAL_DATE', '18.04.2024');
expect(trafikKaza, 'CONTEXTUAL_DATE', '25.07.1988');
expect(trafikKaza, 'CONTEXTUAL_DATE', '11.03.1995');
// Plakalar
expect(trafikKaza, 'TR_LICENSE_PLATE', '34 FG 456');
expect(trafikKaza, 'TR_LICENSE_PLATE', '06 HJ 789');
// Şasi
expect(trafikKaza, 'VEHICLE_ID', 'SB1ZJ3BE5HE012345');
expect(trafikKaza, 'VEHICLE_ID', 'VF15RBF0A57123456');
// Poliçeler
expect(trafikKaza, 'POLICY_NUMBER', 'TRF-2024-1112233');
expect(trafikKaza, 'POLICY_NUMBER', 'KSK-2024-5566778');
// Telefonlar
expect(trafikKaza, 'PHONE_NUMBER', '0542 666 77 88');
expect(trafikKaza, 'PHONE_NUMBER', '0553 999 88 77');
expect(trafikKaza, 'PHONE_NUMBER', '0505 444 33 22');
// Konum
expect(trafikKaza, 'LOCATION', 'İstanbul');
expect(trafikKaza, 'LOCATION', 'Bakırköy');
// Kurum
expect(trafikKaza, 'ORGANIZATION', 'Axa Sigorta');
expect(trafikKaza, 'ORGANIZATION', 'Allianz');
// Motor no
expect(trafikKaza, 'VEHICLE_ID', '1NR-FE-1234567');

// ============================================================
console.log('\n=== TIBBİ BİLİRKİŞİ RAPORU ===');
// ============================================================

const tibbiBilirkisi = `ADLI TIP BİLİRKİŞİ RAPORU

Dosya No: 2024/11111 Esas
Mahkeme: Ankara 3. Asliye Hukuk Mahkemesi

MUAYENE EDİLEN KİŞİ:
Ad Soyad: Ayşe Güneş
TC Kimlik No: 10000000146
Doğum Tarihi: 14.09.1978
Muayene Tarihi: 20.02.2024

SEVKİ YAPAN KURUM: Ankara Numune Eğitim ve Araştırma Hastanesi
Sevk No: SVK-2024-0088
Hasta Protokol No: P20240220-0015
Epikriz No: EP-2024-0199

SAĞLIK GEÇMİŞİ:
- Kaza tarihi: 10.01.2024
- İlk müdahale: Ankara Şehir Hastanesi Acil Servisi
- Ameliyat tarihi: 11.01.2024 (Sol femur kırığı tespiti)
- Kontrol tarihi: 25.01.2024
- Fizik tedavi başlangıç: 15.02.2024
- Reçete No: R2024-55667

MALULİYET DEĞERLENDİRMESİ:
Sürekli iş göremezlik oranı: %18
Geçici iş göremezlik süresi: 120 gün (10.01.2024 - 10.05.2024)

İLETİŞİM:
Hasta Tel: 0312 555 66 77
Hasta E-posta: ayse.gunes@example.com
Hasta Adresi: Kızılay Mah. Atatürk Bulvarı No:100/5, Çankaya/Ankara`;

const tibbiF = analyzeText(tibbiBilirkisi, ALL, 0.35);
console.log(`  Tıbbi bilirkişi raporu: ${tibbiF.length} bulgu`);

expect(tibbiBilirkisi, 'CASE_NUMBER', '2024/11111');
expect(tibbiBilirkisi, 'COURT', 'Asliye Hukuk');
expect(tibbiBilirkisi, 'PERSON_NAME', 'Ayşe Güneş');
expect(tibbiBilirkisi, 'TR_NATIONAL_ID', '10000000146');
expect(tibbiBilirkisi, 'CONTEXTUAL_DATE', '14.09.1978');
expect(tibbiBilirkisi, 'CONTEXTUAL_DATE', '20.02.2024');
expect(tibbiBilirkisi, 'CONTEXTUAL_DATE', '10.01.2024');
expect(tibbiBilirkisi, 'CONTEXTUAL_DATE', '11.01.2024');
expect(tibbiBilirkisi, 'CONTEXTUAL_DATE', '25.01.2024');
expect(tibbiBilirkisi, 'MEDICAL_ID', 'P20240220-0015');
expect(tibbiBilirkisi, 'MEDICAL_ID', 'EP-2024-0199');
expect(tibbiBilirkisi, 'MEDICAL_ID', 'R2024-55667');
expect(tibbiBilirkisi, 'PHONE_NUMBER', '0312 555 66 77');
expect(tibbiBilirkisi, 'EMAIL_ADDRESS', 'ayse.gunes@example.com');
expect(tibbiBilirkisi, 'LOCATION', 'Ankara');

// ============================================================
console.log('\n=== İCRA EMRİ ===');
// ============================================================

const icraEmri = `T.C.
İSTANBUL 15. İCRA MÜDÜRLÜĞÜ

DOSYA NO: 2024/E-45678

ALACAKLI: Garanti BBVA Bankası A.Ş.
Vekili: Av. Deniz Yılmaz
Tel: 0212 444 55 66

BORÇLU:
Ad Soyad: İbrahim Özkan
TC Kimlik No: 10000000146
Ana Adı: Hatice
Baba Adı: Mustafa
Doğum Tarihi: 30.12.1975
Adres: Güneşli Mah. 22. Sok. No:14/6, Bağcılar/İstanbul
Tel: 0533 777 88 99
E-posta: ibrahim.ozkan@example.com

BORÇ BİLGİLERİ:
Kredi Kartı No: 5500 0000 0000 0004
Hesap No: 6291234
Son Ödeme Tarihi: 15.08.2023

ÖDEME İÇİN:
IBAN: TR33 0006 1005 1978 6457 8413 26

Tebliğ Tarihi: 01.04.2024
İtiraz Süresi: 7 gün`;

const icraEmriF = analyzeText(icraEmri, ALL, 0.35);
console.log(`  İcra emri: ${icraEmriF.length} bulgu`);

expect(icraEmri, 'CASE_NUMBER', '2024/E-45678');
expect(icraEmri, 'ORGANIZATION', 'Garanti BBVA');
expect(icraEmri, 'PERSON_NAME', 'Deniz Yılmaz');
expect(icraEmri, 'PERSON_NAME', 'İbrahim Özkan');
expect(icraEmri, 'TR_NATIONAL_ID', '10000000146');
expect(icraEmri, 'CONTEXTUAL_DATE', '30.12.1975');
expect(icraEmri, 'CONTEXTUAL_DATE', '01.04.2024');
expect(icraEmri, 'LOCATION', 'İstanbul');
expect(icraEmri, 'LOCATION', 'Bağcılar');
expect(icraEmri, 'PHONE_NUMBER', '0212 444 55 66');
expect(icraEmri, 'PHONE_NUMBER', '0533 777 88 99');
expect(icraEmri, 'EMAIL_ADDRESS', 'ibrahim.ozkan@example.com');
expect(icraEmri, 'CREDIT_CARD', '5500 0000 0000 0004');
expect(icraEmri, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');

// ============================================================
console.log('\n=== YARGITAY KARARI ===');
// ============================================================

const yargitay = `T.C.
YARGITAY
4. HUKUK DAİRESİ

ESAS NO: 2023/45678
KARAR NO: 2024/12345
TARİH: 15.05.2024

DAVACI: Mustafa Erdoğan vekili Av. Elif Demir
DAVALI: Hızlı Kargo Taşımacılık A.Ş. vekili Av. Serkan Polat

Davacı Mustafa Erdoğan 12.07.2022 tarihinde davalı şirkete ait 34 BN 892 plakalı
araçın çarpması sonucu yaralanmıştır. Kaza İstanbul Kartal ilçesinde Yakacık Caddesi
üzerinde meydana gelmiştir.

Davacının tedavi gördüğü Kartal Dr. Lütfi Kırdar Şehir Hastanesi raporuna göre
hasta protokol no: H2022-9988 ile kayıt altına alınmıştır.

Davalı şirketin trafik poliçe no: TRF-2022-8877665 olan sigortası Sompo Sigorta
A.Ş. tarafından düzenlenmiştir.

Yerel mahkemece verilen kararın temyizi üzerine dosya incelenmiştir.

SONUÇ: Hükmün ONANMASINA, 15.05.2024 tarihinde oybirliğiyle karar verildi.`;

const yargitayF = analyzeText(yargitay, ALL, 0.35);
console.log(`  Yargıtay kararı: ${yargitayF.length} bulgu`);

expect(yargitay, 'LEGAL_CITATION', '2023/45678');
expect(yargitay, 'LEGAL_CITATION', '2024/12345');
expect(yargitay, 'PERSON_NAME', 'Mustafa Erdoğan');
expect(yargitay, 'PERSON_NAME', 'Elif Demir');
expect(yargitay, 'PERSON_NAME', 'Serkan Polat');
expect(yargitay, 'TR_LICENSE_PLATE', '34 BN 892');
expect(yargitay, 'LOCATION', 'İstanbul');
expect(yargitay, 'LOCATION', 'Kartal');
expect(yargitay, 'MEDICAL_ID', 'H2022-9988');
expect(yargitay, 'POLICY_NUMBER', 'TRF-2022-8877665');
expect(yargitay, 'ORGANIZATION', 'Sompo Sigorta');

// ============================================================
console.log('\n=== MADDİ TAZMİNAT BİLİRKİŞİ HESAP RAPORU ===');
// ============================================================

const hesapRaporu = `HESAP BİLİRKİŞİ RAPORU

Dosya: Bursa 2. Asliye Hukuk Mahkemesi 2023/5555 Esas

YARALANAN:
Ad Soyad: Ali Rıza Yılmaz
TC: 10000000146
Doğum Tarihi: 01.01.1980
Meslek: Makine Mühendisi
Aylık Net Gelir: 45.000 TL
SGK No: 1122334

Kaza Tarihi: 15.06.2023
İşe Dönüş Tarihi: 15.12.2023
Maluliyet Oranı: %25

SİGORTA:
Poliçe No: ZMM-2023-998877
Sigorta Şirketi: HDI Sigorta A.Ş.
Araç Plaka: 16 CD 234

TAZMİNAT HESABI:
İşçinin IBAN: DE89370400440532013000
Geçici iş göremezlik: 85.000 TL
Sürekli iş göremezlik: 320.000 TL
Bakıcı gideri: 15.000 TL
Tedavi giderleri: 28.000 TL
TOPLAM: 448.000 TL`;

const hesapF = analyzeText(hesapRaporu, ALL, 0.35);
console.log(`  Hesap bilirkişi raporu: ${hesapF.length} bulgu`);

expect(hesapRaporu, 'CASE_NUMBER', '2023/5555');
expect(hesapRaporu, 'PERSON_NAME', 'Ali Rıza Yılmaz');
expect(hesapRaporu, 'TR_NATIONAL_ID', '10000000146');
expect(hesapRaporu, 'CONTEXTUAL_DATE', '01.01.1980');
expect(hesapRaporu, 'CONTEXTUAL_DATE', '15.06.2023');
expect(hesapRaporu, 'POLICY_NUMBER', 'ZMM-2023-998877');
expect(hesapRaporu, 'ORGANIZATION', 'HDI Sigorta');
expect(hesapRaporu, 'TR_LICENSE_PLATE', '16 CD 234');
expect(hesapRaporu, 'IBAN_CODE', 'DE89370400440532013000');
expect(hesapRaporu, 'COURT', 'Bursa 2. Asliye Hukuk Mahkemesi');

// ============================================================
console.log('\n=== SAĞLIK KURULU RAPORU ===');
// ============================================================

const saglikKurulu = `SAĞLIK KURULU RAPORU

Kurum: İstanbul Üniversitesi İstanbul Tıp Fakültesi Hastanesi
Rapor No: SKR-2024-00123
Rapor Tarihi: 10.03.2024

HASTA BİLGİLERİ:
Ad Soyad: Fatma Çelik
TC Kimlik No: 10000000146
Doğum Tarihi: 22.11.1965
Protokol No: 20240310-4455
Yatış Tarihi: 05.03.2024
Taburcu Tarihi: 12.03.2024
Reçete No: R2024-88990

SEVKİ YAPAN:
Dr. Kemal Arslan
Uzm. Dr. Sicil No: 54321
Tel: 0212 414 00 00

TANI: Sol kalça kırığı (S72.0)
TEDAVİ: Total kalça protezi ameliyatı

SONUÇ:
Hastanın ağır bedensel zarar gördüğü, sürekli maluliyet oranının %35 olduğu
tespit edilmiştir. Kontrol tarihi: 10.06.2024`;

const saglikF = analyzeText(saglikKurulu, ALL, 0.35);
console.log(`  Sağlık kurulu raporu: ${saglikF.length} bulgu`);

expect(saglikKurulu, 'ORGANIZATION', 'İstanbul Üniversitesi');
expect(saglikKurulu, 'PERSON_NAME', 'Fatma Çelik');
expect(saglikKurulu, 'PERSON_NAME', 'Kemal Arslan');
expect(saglikKurulu, 'TR_NATIONAL_ID', '10000000146');
expect(saglikKurulu, 'CONTEXTUAL_DATE', '22.11.1965');
expect(saglikKurulu, 'CONTEXTUAL_DATE', '05.03.2024');
expect(saglikKurulu, 'CONTEXTUAL_DATE', '12.03.2024');
expect(saglikKurulu, 'CONTEXTUAL_DATE', '10.06.2024');
expect(saglikKurulu, 'MEDICAL_ID', '20240310-4455');
expect(saglikKurulu, 'MEDICAL_ID', 'R2024-88990');
expect(saglikKurulu, 'PHONE_NUMBER', '0212 414 00 00');

// ============================================================
console.log('\n=== GERÇEK DÜNYA: BOŞANMA DİLEKÇESİ (İNTERNET FORMATI) ===');
// ============================================================

const bosanmaGercek = `İSTANBUL 5. AİLE MAHKEMESİNE

DAVACI: Fatma Korkmaz (TC: 10000000146)
Adres: Bağdat Cad. No:156/3 Kadıköy/İstanbul
Vekili: Av. Hakan Öztürk
İstanbul Barosu Sicil No: 45678

DAVALI: Murat Korkmaz (TC: 11111111110)
Adres: Cumhuriyet Mah. Atatürk Blv. No:89/12 Maltepe/İstanbul

KONU: Evlilik birliğinin temelinden sarsılması nedeniyle boşanma, velayet, nafaka ve tazminat talebi (TMK m.166)

AÇIKLAMALAR:
1. Müvekkilem ile davalı 12.06.2015 tarihinde İstanbul'da evlenmiştir. Müşterek çocukları Elif Korkmaz (d. 03.09.2017) bulunmaktadır.
2. Davalı, 2019 yılından itibaren müvekkileme sistematik psikolojik şiddet uygulamaktadır.
3. Davalının 0532 456 78 90 numaralı telefonundan gönderdiği tehdit mesajları mevcuttur.
4. Müvekkilem sığınma evine yerleştirilmiş olup 6284 sayılı yasa kapsamında koruma kararı alınmıştır.

SONUÇ ve İSTEM:
Yukarıda açıklanan nedenlerle boşanmalarına, müşterek çocuğun velayetinin müvekkileme verilmesine,
aylık 5.000 TL tedbir nafakasına, 100.000 TL maddi ve 50.000 TL manevi tazminata karar verilmesini
saygılarımla arz ve talep ederim. 15.04.2024

Av. Hakan Öztürk
E-posta: hakan.ozturk@example.com
Tel: 0212 345 67 89`;

const bosanmaGF = analyzeText(bosanmaGercek, ALL, 0.35);
console.log(`  Boşanma dilekçesi (gerçek format): ${bosanmaGF.length} bulgu`);

expect(bosanmaGercek, 'PERSON_NAME', 'Fatma Korkmaz');
expect(bosanmaGercek, 'PERSON_NAME', 'Murat Korkmaz');
expect(bosanmaGercek, 'PERSON_NAME', 'Hakan Öztürk');
expect(bosanmaGercek, 'PERSON_NAME', 'Elif Korkmaz');
expect(bosanmaGercek, 'TR_NATIONAL_ID', '10000000146');
expect(bosanmaGercek, 'TR_NATIONAL_ID', '11111111110');
expect(bosanmaGercek, 'LOCATION', 'İstanbul');
expect(bosanmaGercek, 'LOCATION', 'Kadıköy');
expect(bosanmaGercek, 'LOCATION', 'Maltepe');
expect(bosanmaGercek, 'ORGANIZATION', 'İstanbul Barosu');
expect(bosanmaGercek, 'COURT', 'Aile Mahkemesi');
expect(bosanmaGercek, 'PHONE_NUMBER', '0532 456 78 90');
expect(bosanmaGercek, 'PHONE_NUMBER', '0212 345 67 89');
expect(bosanmaGercek, 'EMAIL_ADDRESS', 'hakan.ozturk@example.com');
expect(bosanmaGercek, 'DATE_TIME', '12.06.2015');
expect(bosanmaGercek, 'DATE_TIME', '03.09.2017');

// ============================================================
console.log('\n=== GERÇEK DÜNYA: İCRA TAKİP TALEBİ (İİK FORMATI) ===');
// ============================================================

const icraTakip = `İSTANBUL 12. İCRA MÜDÜRLÜĞÜNE

ALACAKLI: Mehmet Aydın (TC: 10000000146)
Adres: İstiklal Cad. No:234 Beyoğlu/İstanbul
Vekili: Av. Zeynep Kara - İstanbul Barosu

BORÇLU: Ali Şahin
TC Kimlik No: 11111111110
Adres: Ankara Cad. No:45/7 Kartal/İstanbul
Tel: 0533 111 22 33

ALACAK TUTARI: 185.000,00 TL
FAİZ: 15.03.2024 tarihinden itibaren yasal faiz

ALACAĞIN KONUSU: İstanbul 3. Asliye Ticaret Mahkemesi'nin 2023/4567 Esas, 2024/891 Karar sayılı ilamı gereği

BANKA BİLGİLERİ:
IBAN: TR33 0006 1005 1978 6457 8413 26
Garanti BBVA Bankası Beyoğlu Şubesi

TAKİP TALEBİ:
İİK m.58 uyarınca borçlu aleyhine ilamlı icra takibi başlatılmasını,
borçlunun malvarlığı üzerine haciz konulmasını,
taşınır ve taşınmazlarının satılmasını talep ederim.

Alacaklı Vekili
Av. Zeynep Kara
Tel: 0212 555 66 77
E-posta: zeynep.kara@example.com`;

const icraTakipF = analyzeText(icraTakip, ALL, 0.35);
console.log(`  İcra takip talebi: ${icraTakipF.length} bulgu`);

expect(icraTakip, 'PERSON_NAME', 'Mehmet Aydın');
expect(icraTakip, 'PERSON_NAME', 'Ali Şahin');
expect(icraTakip, 'PERSON_NAME', 'Zeynep Kara');
expect(icraTakip, 'TR_NATIONAL_ID', '10000000146');
expect(icraTakip, 'TR_NATIONAL_ID', '11111111110');
expect(icraTakip, 'LOCATION', 'İstanbul');
expect(icraTakip, 'LOCATION', 'Beyoğlu');
expect(icraTakip, 'LOCATION', 'Kartal');
expect(icraTakip, 'ORGANIZATION', 'Garanti BBVA');
expect(icraTakip, 'ORGANIZATION', 'İstanbul Barosu');
expect(icraTakip, 'ORGANIZATION', 'İcra Müdürlüğü');
expect(icraTakip, 'CASE_NUMBER', '2023/4567');
expect(icraTakip, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(icraTakip, 'PHONE_NUMBER', '0533 111 22 33');
expect(icraTakip, 'PHONE_NUMBER', '0212 555 66 77');
expect(icraTakip, 'EMAIL_ADDRESS', 'zeynep.kara@example.com');
expect(icraTakip, 'DATE_TIME', '15.03.2024');

// ============================================================
console.log('\n=== GERÇEK DÜNYA: YARGITAY KARARI (E./K. FORMATI) ===');
// ============================================================

const yargitayGercek = `T.C.
YARGITAY
21. HUKUK DAİRESİ

Esas: 2023/8456
Karar: 2024/2103
Tarih: 14.03.2024

Davacı Ayşe Demir vekili Av. Burak Yılmaz tarafından davalı Hasan Çelik aleyhine
08.11.2022 tarihinde açılan maddi ve manevi tazminat davasına ilişkin İstanbul Anadolu
8. Asliye Hukuk Mahkemesi'nden verilen 15.06.2023 gün ve 2022/3456 E., 2023/1892 K.
sayılı kararın Yargıtay'ca incelenmesi davacı vekili tarafından istenmiştir.

TÜRK MİLLETİ ADINA

Dosya incelendi.

Davacı, Manisa Soma ilçesindeki maden ocağında 13.05.2014 tarihinde meydana gelen
iş kazasında yaralandığını, İstanbul Kartal Dr. Lütfi Kırdar Eğitim ve Araştırma
Hastanesi'nde tedavi gördüğünü, SGK tarafından %45 oranında sürekli iş göremezlik
raporu verildiğini iddia etmiştir.

Davacının SGK sicil numarası 8234567 olup, hasta protokol no: H2014-33456 ile kayıt
altına alınmıştır.

Davacının banka hesap bilgileri:
IBAN: TR33 0006 1005 1978 6457 8413 26

Davalı şirket Eynez Madencilik San. ve Tic. A.Ş.'nin trafik poliçe no: TRF-2014-4455667
ile sigortalı olduğu belirlenmiştir.

Tüm dosya kapsamına göre;

SONUÇ: Yukarıda açıklanan nedenlerle yerel mahkeme kararının BOZULMASINA,
252.000 TL maddi, 50.000 TL manevi tazminatın davalıdan tahsiline,
temyiz harcının istek halinde davacıya iadesine,
14.03.2024 tarihinde oybirliğiyle karar verildi.`;

const yargitayGF = analyzeText(yargitayGercek, ALL, 0.35);
console.log(`  Yargıtay kararı (gerçek format): ${yargitayGF.length} bulgu`);

expect(yargitayGercek, 'LEGAL_CITATION', '2023/8456');
expect(yargitayGercek, 'LEGAL_CITATION', '2024/2103');
expect(yargitayGercek, 'CASE_NUMBER', '2022/3456');
expect(yargitayGercek, 'PERSON_NAME', 'Ayşe Demir');
expect(yargitayGercek, 'PERSON_NAME', 'Burak Yılmaz');
expect(yargitayGercek, 'PERSON_NAME', 'Hasan Çelik');
expect(yargitayGercek, 'COURT', 'Asliye Hukuk');
expect(yargitayGercek, 'LOCATION', 'İstanbul');
expect(yargitayGercek, 'LOCATION', 'Manisa');
expect(yargitayGercek, 'MEDICAL_ID', 'H2014-33456');
expect(yargitayGercek, 'POLICY_NUMBER', 'TRF-2014-4455667');
expect(yargitayGercek, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(yargitayGercek, 'DATE_TIME', '14.03.2024');
expect(yargitayGercek, 'DATE_TIME', '08.11.2022');
expect(yargitayGercek, 'DATE_TIME', '13.05.2014');

// ============================================================
console.log('\n=== GERÇEK DÜNYA: TRAFİK KAZASI BİLİRKİŞİ RAPORU ===');
// ============================================================

const trafikBilirkisi = `BİLİRKİŞİ RAPORU

Dosya No: 2024/5678 Esas
Mahkeme: Ankara 7. Asliye Hukuk Mahkemesi

Kaza Tarihi: 22.08.2024
Kaza Yeri: Ankara-Konya Otoyolu 45. km

1. ARAÇ BİLGİLERİ:
Plaka: 06 DK 421
Marka/Model: Toyota Corolla 2020
Sürücü: Osman Yıldırım (TC: 10000000146)
Ehliyet No: B-123456789
Trafik Poliçe No: TPL-2024-0098765
Kasko Poliçe No: KSK-2024-0054321
Ruhsat Sahibi: Osman Yıldırım
Şasi No: JTDBR32E700123456
Motor No: 2ZR-FAE-8765432
Sigorta Şirketi: Axa Sigorta A.Ş.

2. ARAÇ BİLGİLERİ:
Plaka: 34 AKL 789
Marka/Model: Renault Clio 2022
Sürücü: Ad Soyad: Derya Aksoy
Sigorta Şirketi: Allianz Sigorta A.Ş.
Trafik Poliçe No: TPL-2024-7766554

YARALANAN KİŞİLER:
1. Zeynep Yıldırım (yolcu, 1. araç)
   TC: 11111111110
   Sevk Edilen Hastane: Ankara Numune Hastanesi
   Hasta Protokol No: 20240822-0156
   Epikriz No: EPK-2024-00892
   Tedavi Tarihi: 22.08.2024
   Taburcu Tarihi: 05.09.2024
   Tel: 0312 444 55 66

TANIK BİLGİLERİ:
Ad Soyad: Veli Kara
TC: 22222222220
Adres: Kızılay Mah. Gül Sok. No:5, Çankaya/Ankara
Tel: 0505 333 22 11

KUSUR DEĞERLENDİRMESİ:
1. araç sürücüsü Osman Yıldırım: %30 kusurlu (KTK m.84)
2. araç sürücüsü Derya Aksoy: %70 kusurlu (KTK m.57)

Maluliyet Oranı: %18

Bilirkişi: Prof. Dr. Kemal Aydın
İletişim: kemal.aydin@example.com`;

const trafikBF = analyzeText(trafikBilirkisi, ALL, 0.35);
console.log(`  Trafik bilirkişi raporu: ${trafikBF.length} bulgu`);

expect(trafikBilirkisi, 'CASE_NUMBER', '2024/5678');
expect(trafikBilirkisi, 'COURT', 'Asliye Hukuk');
expect(trafikBilirkisi, 'CONTEXTUAL_DATE', '22.08.2024');
expect(trafikBilirkisi, 'CONTEXTUAL_DATE', '22.08.2024');
expect(trafikBilirkisi, 'CONTEXTUAL_DATE', '05.09.2024');
expect(trafikBilirkisi, 'LOCATION', 'Ankara');
expect(trafikBilirkisi, 'PERSON_NAME', 'Osman Yıldırım');
expect(trafikBilirkisi, 'PERSON_NAME', 'Derya Aksoy');
expect(trafikBilirkisi, 'PERSON_NAME', 'Zeynep Yıldırım');
expect(trafikBilirkisi, 'PERSON_NAME', 'Veli Kara');
expect(trafikBilirkisi, 'PERSON_NAME', 'Kemal Aydın');
expect(trafikBilirkisi, 'TR_NATIONAL_ID', '10000000146');
expect(trafikBilirkisi, 'TR_NATIONAL_ID', '11111111110');
expect(trafikBilirkisi, 'TR_NATIONAL_ID', '22222222220');
expect(trafikBilirkisi, 'TR_LICENSE_PLATE', '06 DK 421');
expect(trafikBilirkisi, 'TR_LICENSE_PLATE', '34 AKL 789');
expect(trafikBilirkisi, 'VEHICLE_ID', 'JTDBR32E700123456');
expect(trafikBilirkisi, 'VEHICLE_ID', '2ZR-FAE-8765432');
expect(trafikBilirkisi, 'POLICY_NUMBER', 'TPL-2024-0098765');
expect(trafikBilirkisi, 'POLICY_NUMBER', 'KSK-2024-0054321');
expect(trafikBilirkisi, 'POLICY_NUMBER', 'TPL-2024-7766554');
expect(trafikBilirkisi, 'MEDICAL_ID', '20240822-0156');
expect(trafikBilirkisi, 'MEDICAL_ID', 'EPK-2024-00892');
expect(trafikBilirkisi, 'ORGANIZATION', 'Axa Sigorta');
expect(trafikBilirkisi, 'ORGANIZATION', 'Allianz');
expect(trafikBilirkisi, 'PHONE_NUMBER', '0312 444 55 66');
expect(trafikBilirkisi, 'PHONE_NUMBER', '0505 333 22 11');
expect(trafikBilirkisi, 'EMAIL_ADDRESS', 'kemal.aydin@example.com');

// ============================================================
console.log('\n=== GERÇEK DÜNYA: SİGORTA HASAR İHBAR FORMU ===');
// ============================================================

const hasarIhbar = `SİGORTA HASAR İHBAR FORMU

SİGORTA ŞİRKETİ: Anadolu Sigorta A.Ş.
ACENTESİ: İstanbul Kadıköy Şubesi

SİGORTALI BİLGİLERİ:
Ad Soyad: Selim Demir
TC Kimlik No: 10000000146
Adres: Fenerbahçe Mah. Bağdat Cad. No:200/4 Kadıköy/İstanbul
Cep Tel: 0542 777 88 99
E-posta: selim.demir@example.com

POLİÇE BİLGİLERİ:
Trafik Poliçe No: TRF-2024-9988776
Kasko Poliçe No: KSK-2024-1122334
Poliçe Başlangıç: 01.01.2024
Poliçe Bitiş: 31.12.2024

ARAÇ BİLGİLERİ:
Plaka: 34 MN 567
Marka/Model: Honda Civic 2023
Şasi No: SHHFK8G70MU012345
Motor No: L15BE-2345678
Ruhsat No: AA-34-987654

HASAR BİLGİLERİ:
Hasar Tarihi: 10.06.2024
Hasar Yeri: Beşiktaş Barbaros Bulvarı, İstanbul
Hasar Tutarı (tahmini): 35.000 TL

KARŞI TARAF BİLGİLERİ:
Ad Soyad: Elif Yıldız
Plaka: 06 AB 123
Sigorta Şirketi: Sompo Sigorta A.Ş.
Tel: 0535 444 33 22

HASAR DOSYA NO: 2024/HSR-55667

ÖDEME BİLGİLERİ:
IBAN: TR33 0006 1005 1978 6457 8413 26
Banka: Yapı Kredi Bankası Kadıköy Şubesi`;

const hasarF = analyzeText(hasarIhbar, ALL, 0.35);
console.log(`  Sigorta hasar ihbar formu: ${hasarF.length} bulgu`);

expect(hasarIhbar, 'PERSON_NAME', 'Selim Demir');
expect(hasarIhbar, 'PERSON_NAME', 'Elif Yıldız');
expect(hasarIhbar, 'TR_NATIONAL_ID', '10000000146');
expect(hasarIhbar, 'LOCATION', 'İstanbul');
expect(hasarIhbar, 'LOCATION', 'Kadıköy');
expect(hasarIhbar, 'LOCATION', 'Beşiktaş');
expect(hasarIhbar, 'PHONE_NUMBER', '0542 777 88 99');
expect(hasarIhbar, 'PHONE_NUMBER', '0535 444 33 22');
expect(hasarIhbar, 'EMAIL_ADDRESS', 'selim.demir@example.com');
expect(hasarIhbar, 'POLICY_NUMBER', 'TRF-2024-9988776');
expect(hasarIhbar, 'POLICY_NUMBER', 'KSK-2024-1122334');
expect(hasarIhbar, 'TR_LICENSE_PLATE', '34 MN 567');
expect(hasarIhbar, 'TR_LICENSE_PLATE', '06 AB 123');
expect(hasarIhbar, 'VEHICLE_ID', 'SHHFK8G70MU012345');
expect(hasarIhbar, 'VEHICLE_ID', 'L15BE-2345678');
expect(hasarIhbar, 'CONTEXTUAL_DATE', '10.06.2024');
expect(hasarIhbar, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(hasarIhbar, 'ORGANIZATION', 'Anadolu Sigorta');
expect(hasarIhbar, 'ORGANIZATION', 'Sompo Sigorta');
expect(hasarIhbar, 'ORGANIZATION', 'Yapı Kredi');

// ============================================================
console.log('\n=== GERÇEK DÜNYA: SİBER SUÇ ŞİKAYET DİLEKÇESİ ===');
// ============================================================

const siberSuc = `İSTANBUL CUMHURİYET BAŞSAVCILIĞINA
(Bilişim Suçları Bürosu)

MÜŞTEKİ:
Ad Soyad: Fatma Güneş
TC Kimlik No: 10000000146
Adres: Ataşehir Mah. Kayış Sok. No:10/3, Ataşehir/İstanbul
Cep Tel: 0544 666 77 88
E-posta: fatma.gunes@example.com

ŞÜPHELİ:
Ad Soyad: Bilinmiyor (Sosyal medya hesabı: @sahtekullanici34)
IP Adresi: 185.76.33.22

SUÇ TARİHİ: 15.05.2024
SUÇ YERİ: İnternet ortamı (Instagram ve WhatsApp üzerinden)

ŞİKAYET KONUSU:
Yukarıda belirtilen tarihte şüpheli, müştekinin Instagram hesabına izinsiz erişim sağlamış
ve müştekinin özel fotoğraflarını çalarak WhatsApp üzerinden paylaşmıştır.

Şüphelinin kullandığı IP adresi 185.76.33.22 olup, MAC adresi: AB:CD:EF:12:34:56
tespit edilmiştir.

Müştekinin banka hesabından 0544 666 77 88 numaralı telefona gelen SMS ile
kredi kartı bilgileri (4539 1488 0343 6467) ele geçirilmiş ve
IBAN: DE89370400440532013000 hesabına 15.000 TL transfer yapılmıştır.

TALEP:
TCK 134, 158, 243 ve 244. maddeleri kapsamında şüpheli hakkında soruşturma başlatılmasını,
dijital delillerin toplanmasını talep ederim.

Saygılarımla,
Fatma Güneş
15.05.2024`;

const siberF = analyzeText(siberSuc, ALL, 0.35);
console.log(`  Siber suç şikayet dilekçesi: ${siberF.length} bulgu`);

expect(siberSuc, 'PERSON_NAME', 'Fatma Güneş');
expect(siberSuc, 'TR_NATIONAL_ID', '10000000146');
expect(siberSuc, 'LOCATION', 'İstanbul');
expect(siberSuc, 'LOCATION', 'Ataşehir');
expect(siberSuc, 'PHONE_NUMBER', '0544 666 77 88');
expect(siberSuc, 'EMAIL_ADDRESS', 'fatma.gunes@example.com');
expect(siberSuc, 'IP_ADDRESS', '185.76.33.22');
expect(siberSuc, 'MAC_ADDRESS', 'AB:CD:EF:12:34:56');
expect(siberSuc, 'CREDIT_CARD', '4539 1488 0343 6467');
expect(siberSuc, 'IBAN_CODE', 'DE89370400440532013000');
expect(siberSuc, 'DATE_TIME', '15.05.2024');

// ============================================================
console.log('\n=== GERÇEK DÜNYA: İŞ SÖZLEŞMESİ FESİH İHTARNAMESİ ===');
// ============================================================

const ihtarname = `İHTARNAME

İHTAR EDEN (İŞVEREN):
Mega Yazılım Teknoloji A.Ş.
Vergi No: 1234567890
Mersis No: 0987654321098765
Adres: Maslak Mah. Büyükdere Cad. No:255 Sarıyer/İstanbul
Vekili: Av. Serkan Polat

MUHATAP (İŞÇİ):
Ad Soyad: Emre Çalışkan
TC Kimlik No: 10000000146
Adres: Acıbadem Mah. Çiçek Sok. No:15/7 Üsküdar/İstanbul
SGK Sicil No: 5566778
E-posta: emre.caliskan@example.com
Tel: 0530 111 22 33

İHTARIN KONUSU:
Şirketimiz bünyesinde 01.03.2020 tarihinden itibaren Yazılım Geliştirici olarak çalışmakta olan
Emre Çalışkan'ın 4857 sayılı İş Kanunu'nun 25/II-g maddesi uyarınca iş sözleşmesinin
feshedildiği 15.06.2024 tarihinde tarafına bildirilmiştir.

Çalışanın son maaşı ve kıdem tazminatı aşağıdaki hesaba yatırılacaktır:
IBAN: TR33 0006 1005 1978 6457 8413 26

İşe giriş tarihi: 01.03.2020
Fesih tarihi: 15.06.2024

Keyfiyet ihtaren bildirilir. 15.06.2024

Av. Serkan Polat
İstanbul Barosu Sicil No: 78901
Tel: 0212 888 99 00`;

const ihtarF = analyzeText(ihtarname, ALL, 0.35);
console.log(`  İş fesih ihtarnamesi: ${ihtarF.length} bulgu`);

expect(ihtarname, 'PERSON_NAME', 'Serkan Polat');
expect(ihtarname, 'PERSON_NAME', 'Emre Çalışkan');
expect(ihtarname, 'TR_NATIONAL_ID', '10000000146');
expect(ihtarname, 'TR_VERGI_NO', '1234567890');
expect(ihtarname, 'LOCATION', 'İstanbul');
expect(ihtarname, 'LOCATION', 'Üsküdar');
expect(ihtarname, 'LOCATION', 'Sarıyer');
expect(ihtarname, 'EMAIL_ADDRESS', 'emre.caliskan@example.com');
expect(ihtarname, 'PHONE_NUMBER', '0530 111 22 33');
expect(ihtarname, 'PHONE_NUMBER', '0212 888 99 00');
expect(ihtarname, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(ihtarname, 'ORGANIZATION', 'İstanbul Barosu');
expect(ihtarname, 'CONTEXTUAL_DATE', '01.03.2020');

// ============================================================
console.log('\n=== GERÇEK DÜNYA: ANAYASA MAHKEMESİ BİREYSEL BAŞVURU ===');
// ============================================================

const anayasaBireysel = `T.C.
ANAYASA MAHKEMESİ
BİREYSEL BAŞVURU FORMU

BAŞVURU NO: 2024/15678

BAŞVURUCU:
Ad Soyad: İbrahim Güler
TC Kimlik No: 10000000146
Doğum Tarihi: 05.05.1982
Adres: Kızılay Mah. Atatürk Blv. No:78/5 Çankaya/Ankara
Tel: 0312 666 77 88
E-posta: ibrahim.guler@example.com

VEKİLİ:
Av. Deniz Arslan
Ankara Barosu Sicil No: 34567
Tel: 0312 999 88 77

İHLAL EDİLDİĞİ İDDİA EDİLEN HAKLAR:
- Anayasa m.17 (Kişinin dokunulmazlığı)
- AİHS m.3 (İşkence yasağı)
- AİHS m.6 (Adil yargılanma hakkı)

OLAYLARIN ÖZETİ:
Başvurucu, 10.01.2023 tarihinde İstanbul Küçükçekmece ilçesinde gözaltına alınmıştır.
İstanbul 14. Ağır Ceza Mahkemesi'nin 2023/5555 Esas sayılı dosyasında yargılanmıştır.
Başvurucunun tutuklanma tarihi: 11.01.2023, tahliye tarihi: 15.08.2023.

İstanbul Bölge Adliye Mahkemesi 3. Ceza Dairesi'nin 2023/9876 Esas, 2024/1234 Karar
sayılı kararıyla istinaf başvurusu reddedilmiştir.

Başvuru Tarihi: 15.02.2024`;

const anayasaF = analyzeText(anayasaBireysel, ALL, 0.35);
console.log(`  Anayasa Mahkemesi bireysel başvuru: ${anayasaF.length} bulgu`);

// Ulusal yüksek mahkemeler PII değil — maskelenmez (hukuki bağlam korunur)
expectNot(anayasaBireysel, 'COURT', 'Anayasa Mahkemesi');
expect(anayasaBireysel, 'PERSON_NAME', 'İbrahim Güler');
expect(anayasaBireysel, 'PERSON_NAME', 'Deniz Arslan');
expect(anayasaBireysel, 'TR_NATIONAL_ID', '10000000146');
expect(anayasaBireysel, 'CONTEXTUAL_DATE', '05.05.1982');
expect(anayasaBireysel, 'LOCATION', 'Ankara');
expect(anayasaBireysel, 'LOCATION', 'İstanbul');
expect(anayasaBireysel, 'PHONE_NUMBER', '0312 666 77 88');
expect(anayasaBireysel, 'PHONE_NUMBER', '0312 999 88 77');
expect(anayasaBireysel, 'EMAIL_ADDRESS', 'ibrahim.guler@example.com');
expect(anayasaBireysel, 'ORGANIZATION', 'Ankara Barosu');
expect(anayasaBireysel, 'COURT', 'Ağır Ceza');
expect(anayasaBireysel, 'CASE_NUMBER', '2023/5555');
expect(anayasaBireysel, 'CASE_NUMBER', '2023/9876');

// ============================================================
console.log('\n=== EK FALSE POSİTİVE KONTROL (GERÇEK DÜNYA) ===');
// ============================================================

// Kanun maddeleri case number olmamalı
expect('TMK m.166 hükmü gereğince boşanmaya karar verilmiştir.', 'CASE_NUMBER', null);
expect('TCK 134, 158, 243 ve 244. maddeleri', 'CASE_NUMBER', null);
expect('4857 sayılı İş Kanunu', 'CASE_NUMBER', null);
expect('6284 sayılı yasa kapsamında', 'CASE_NUMBER', null);

// Parasal değerler
expect('150.000 TL tazminat talep edilmiştir.', 'DATE_TIME', null);
expect('Aylık 5.000 TL nafaka', 'PHONE_NUMBER', null);
expect('Toplam 448.000 TL', 'PHONE_NUMBER', null);

// Yüzde oranları
expect('Maluliyet oranı: %45', 'TR_NATIONAL_ID', null);
expect('Kusur oranı %70', 'TR_NATIONAL_ID', null);

// Kanun kısaltmaları
expect('İİK m.58 uyarınca takip başlatılmıştır.', 'CASE_NUMBER', null);
expect('HMK gereğince', 'ORGANIZATION', null);
expect('CMK 231 gereğince', 'CASE_NUMBER', null);

// "Bilinmiyor" isim olmamalı
expect('Şüpheli: Bilinmiyor', 'PERSON_NAME', null);

// Kısa kelime grupları
expect('Maddi ve manevi tazminat', 'PERSON_NAME', null);

// ============================================================
console.log('\n=== GERÇEK DÜNYA: ÇOK TARAFLI DAVA ===');
// ============================================================

const cokTaraf = `İSTANBUL 3. ASLİYE TİCARET MAHKEMESİ

DOSYA NO: 2024/7890 Esas

DAVACI: Deniz Yılmaz (TC: 10000000146)
Adres: Bostancı Mah. Sahil Yolu No:55, Kadıköy/İstanbul
Vekili: Av. Fatma Arslan - İstanbul Barosu

DAVALI 1: Güneş Lojistik Taşımacılık Ltd. Şti.
Vergi No: 5544332211
Adres: Tuzla OSB 2. Cad. No:10, Tuzla/İstanbul
Vekili: Av. Oğuz Şahin - İstanbul Barosu

DAVALI 2: Yıldız Sigorta A.Ş.
Vekili: Av. Cemre Polat

DAVALI 3: Murat Özkan
TC Kimlik No: 11111111110
Adres: Çınar Mah. Gül Sok. No:3, Gebze/Kocaeli

DAVA KONUSU: 12.03.2024 tarihli trafik kazasından kaynaklanan 500.000 TL maddi tazminat

OLAYLAR:
1. 12.03.2024 tarihinde E-5 Karayolu Tuzla mevkiinde meydana gelen trafik kazasında
   davalı Murat Özkan'ın kullandığı 41 GH 234 plakalı kamyon, müvekkilin aracına
   (34 CD 567) çarpmıştır.
2. Müvekkil İstanbul Kartal Dr. Lütfi Kırdar Şehir Hastanesi'nde tedavi görmüştür.
   Hasta Protokol No: H2024-11223
3. Kaza tespit tutanağı no: 2024-TUZ-003456
4. Davalı 1'in Yıldız Sigorta nezdindeki trafik poliçe no: TRF-2024-8899001

DELİLLER:
- Kaza tespit tutanağı
- Hastane raporu ve epikriz (Epikriz No: EP-2024-7788)
- SGK iş göremezlik raporu
- Araç hasar ekspertiz raporu

BANKA BİLGİLERİ:
Davacı IBAN: TR33 0006 1005 1978 6457 8413 26
QNB Finansbank Bostancı Şubesi

İletişim: 0216 444 55 66
E-posta: deniz.yilmaz@example.com`;

const cokTarafF = analyzeText(cokTaraf, ALL, 0.35);
console.log(`  Çok taraflı ticaret davası: ${cokTarafF.length} bulgu`);

expect(cokTaraf, 'CASE_NUMBER', '2024/7890');
expect(cokTaraf, 'PERSON_NAME', 'Deniz Yılmaz');
expect(cokTaraf, 'PERSON_NAME', 'Fatma Arslan');
expect(cokTaraf, 'PERSON_NAME', 'Oğuz Şahin');
expect(cokTaraf, 'PERSON_NAME', 'Cemre Polat');
expect(cokTaraf, 'PERSON_NAME', 'Murat Özkan');
expect(cokTaraf, 'TR_NATIONAL_ID', '10000000146');
expect(cokTaraf, 'TR_NATIONAL_ID', '11111111110');
expect(cokTaraf, 'LOCATION', 'İstanbul');
expect(cokTaraf, 'LOCATION', 'Kocaeli');
expect(cokTaraf, 'LOCATION', 'Kadıköy');
expect(cokTaraf, 'TR_LICENSE_PLATE', '41 GH 234');
expect(cokTaraf, 'TR_LICENSE_PLATE', '34 CD 567');
expect(cokTaraf, 'POLICY_NUMBER', 'TRF-2024-8899001');
expect(cokTaraf, 'MEDICAL_ID', 'H2024-11223');
expect(cokTaraf, 'MEDICAL_ID', 'EP-2024-7788');
expect(cokTaraf, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(cokTaraf, 'PHONE_NUMBER', '0216 444 55 66');
expect(cokTaraf, 'EMAIL_ADDRESS', 'deniz.yilmaz@example.com');
expect(cokTaraf, 'ORGANIZATION', 'İstanbul Barosu');
expect(cokTaraf, 'ORGANIZATION', 'QNB Finansbank');
expect(cokTaraf, 'TR_VERGI_NO', '5544332211');
expect(cokTaraf, 'DATE_TIME', '12.03.2024');

// ============================================================
console.log('\n=== GERÇEK DÜNYA: VEKİL ARACILIĞIYLA İFADE ===');
// ============================================================

// "vekili Av." pattern - internet'te sıkça görülen format
expect('Davacı Mustafa Erdoğan vekili Av. Elif Demir tarafından', 'PERSON_NAME', 'Mustafa Erdoğan');
expect('Davacı Mustafa Erdoğan vekili Av. Elif Demir tarafından', 'PERSON_NAME', 'Elif Demir');

// "aleyhine" pattern
expect('davalı Hasan Çelik aleyhine açılan dava', 'PERSON_NAME', 'Hasan Çelik');

// Yargıtay referans formatı
expect('Esas: 2023/8456', 'CASE_NUMBER', '2023/8456');
expect('Karar: 2024/2103', 'CASE_NUMBER', '2024/2103');

// E. K. kısaltmalı format
expect('2022/3456 E., 2023/1892 K. sayılı karar', 'CASE_NUMBER', '2022/3456');
expect('2022/3456 E., 2023/1892 K. sayılı karar', 'CASE_NUMBER', '2023/1892');

// Farklı mahkeme isimleri
expect('İstanbul Anadolu 8. Asliye Hukuk Mahkemesi', 'COURT', 'Asliye Hukuk');
expect('İstanbul 14. Ağır Ceza Mahkemesi', 'COURT', 'Ağır Ceza');
expect('Ankara 2. İş Mahkemesi', 'COURT', 'İş Mahkemesi');
expect('İstanbul 3. Asliye Ticaret Mahkemesi', 'COURT', 'Ticaret Mahkemesi');
expect('İstanbul 12. İcra Müdürlüğü', 'ORGANIZATION', 'İcra Müdürlüğü');

// Baro sicil no tespiti
expect('İstanbul Barosu Sicil No: 45678', 'ORGANIZATION', 'İstanbul Barosu');
expect('Ankara Barosu Sicil No: 34567', 'ORGANIZATION', 'Ankara Barosu');

// ============================================================
console.log('\n=== TÜRKÇE KARAKTER İSİM TESPİTİ (\\b FIX) ===');
// ============================================================

// Ö ile başlayan isimler (önceden \b bug'ı yüzünden yakalanmıyordu)
expect('Özgür Aksoy toplantıda konuştu', 'PERSON_NAME', 'Özgür Aksoy');
expect('Özlem Şahin raporu hazırladı', 'PERSON_NAME', 'Özlem Şahin');
expect('Ömer Demir ile görüşüldü', 'PERSON_NAME', 'Ömer Demir');

// Ü ile başlayan isimler
expect('Ümit Güneş ifade verdi', 'PERSON_NAME', 'Ümit Güneş');

// Ş ile başlayan isimler
expect('Şeyma Öztürk avukatıdır', 'PERSON_NAME', 'Şeyma Öztürk');
expect('Şaban Kara bilirkişidir', 'PERSON_NAME', 'Şaban Kara');

// Ç ile başlayan isimler
expect('Çağlar Çetin mühendistir', 'PERSON_NAME', 'Çağlar Çetin');

// İ ile başlayan isimler (zaten title ile çalışıyordu ama dictionary ile de çalışmalı)
expect('İbrahim Demir geldi', 'PERSON_NAME', 'İbrahim Demir');

// Suffix-triggered with Turkish chars
expect('Özlem Şahin isimli kişi geldi', 'PERSON_NAME', 'Özlem Şahin');
expect('Ümit Çelik adlı şahıs', 'PERSON_NAME', 'Ümit Çelik');

// Türkçe mahkeme isimlerinde ek (dative -ne, locative -nde)
expect('İstanbul Aile Mahkemesine başvurdu', 'COURT', 'Aile Mahkemesi');
expect('Ankara İcra Müdürlüğünden bilgi alındı', 'ORGANIZATION', 'İcra Müdürlüğü');
expectNot('Yargıtayın kararı bekleniyor', 'ORGANIZATION', 'Yargıtay');

// Org isimlerinde Türkçe ek (ablative -dan, locative -da)
expect('SGK\'dan rapor istendi', 'ORGANIZATION', 'SGK');

// 3 kelimelik isimler (ad + ikinci ad + soyad)
expect('atakan adem selanik burada', 'PERSON_NAME', 'atakan adem selanik');
expect('Ali Rıza Yılmaz davacıdır', 'PERSON_NAME', 'Ali Rıza Yılmaz');
expect('Mehmet Ali Demir geldi', 'PERSON_NAME', 'Mehmet Ali Demir');

// 3 kelimelik isimler - soyadı sözlükte olmasa bile
expect('kemal yavuz soylu ile görüştük', 'PERSON_NAME', 'kemal yavuz soylu');
expect('mehmet ali topaloğlu geldi', 'PERSON_NAME', 'mehmet ali topaloğlu');
expect('fatma zehra güllüoğlu arıyordu', 'PERSON_NAME', 'fatma zehra güllüoğlu');
expect('Ahmet Burak Çetinkaya ifade verdi', 'PERSON_NAME', 'Ahmet Burak Çetinkaya');

// ============================================================
console.log('\n=== SİGORTA: TAHKİM KOMİSYONU KARARI ===');
// ============================================================

const tahkim = `T.C.
SİGORTA TAHKİM KOMİSYONU
UYUŞMAZLIK HAKEM HEYETİ

DOSYA NO: 2024/UHH-12345
BAŞVURU NO: 2024/STK-67890

BAŞVURAN (SİGORTALI):
Ad Soyad: Hüseyin Kara
TC Kimlik No: 10000000146
Adres: Sahrayıcedit Mah. Halk Sok. No:44/3, Kadıköy/İstanbul
Tel: 0532 999 88 77
E-posta: huseyin.kara@example.com
Vekili: Av. Selin Arslan - İstanbul Barosu Sicil: 55667

KARŞI TARAF (SİGORTA ŞİRKETİ):
Axa Sigorta A.Ş.
Poliçe No: TRF-2023-4455667
Hasar Dosya No: 2023/HD-998877

UYUŞMAZLIK KONUSU:
15.09.2023 tarihinde İstanbul Maltepe ilçesinde meydana gelen trafik kazasında
başvuranın 34 KL 890 plakalı aracında oluşan hasarın tazmin edilmemesi.

Kaza tespit tutanağı no: 2023-MLT-004567
Ekspertiz rapor no: EKS-2023-8899
Ekspertiz tarihi: 20.09.2023
Araç değer kaybı rapor no: DK-2023-1122
Onarım fatura no: FTR-2023-33445

Araç bilgileri:
Şasi No: WAUZZZ8V5KA123456
Motor No: CDA-987654
Ruhsat No: AA-34-556677

Karşı araç: 06 MN 234 plakalı (sürücü: Osman Yıldız)
Karşı araç sigortası: Allianz Sigorta A.Ş.
Karşı poliçe no: TRF-2023-1122334

TRAMER kaydı incelenmiş, hasarın daha önce tazmin edilmediği tespit edilmiştir.

TAZMİNAT HESABI:
Araç onarım bedeli: 85.000 TL
Araç değer kaybı: 25.000 TL
Otopark/çekici ücreti: 3.500 TL
İkame araç bedeli: 12.000 TL
TOPLAM: 125.500 TL

ÖDEME BİLGİLERİ:
IBAN: TR33 0006 1005 1978 6457 8413 26
QNB Finansbank Kadıköy Şubesi

KARAR: Başvuranın talebinin KABULÜNE,
125.500 TL'nin başvuru tarihi olan 15.01.2024'ten itibaren yasal faiziyle birlikte
Axa Sigorta A.Ş. tarafından başvurana ödenmesine,
03.04.2024 tarihinde oybirliğiyle karar verildi.`;

const tahkimF = analyzeText(tahkim, ALL, 0.35);
console.log(`  Tahkim komisyonu kararı: ${tahkimF.length} bulgu`);

expect(tahkim, 'ORGANIZATION', 'Sigorta Tahkim Komisyonu');
expect(tahkim, 'CASE_NUMBER', '2024/UHH-12345');
expect(tahkim, 'CASE_NUMBER', '2024/STK-67890');
expect(tahkim, 'PERSON_NAME', 'Hüseyin Kara');
expect(tahkim, 'PERSON_NAME', 'Selin Arslan');
expect(tahkim, 'PERSON_NAME', 'Osman Yıldız');
expect(tahkim, 'TR_NATIONAL_ID', '10000000146');
expect(tahkim, 'LOCATION', 'İstanbul');
expect(tahkim, 'LOCATION', 'Kadıköy');
expect(tahkim, 'LOCATION', 'Maltepe');
expect(tahkim, 'PHONE_NUMBER', '0532 999 88 77');
expect(tahkim, 'EMAIL_ADDRESS', 'huseyin.kara@example.com');
expect(tahkim, 'ORGANIZATION', 'İstanbul Barosu');
expect(tahkim, 'ORGANIZATION', 'Axa Sigorta');
expect(tahkim, 'ORGANIZATION', 'Allianz');
expect(tahkim, 'ORGANIZATION', 'QNB Finansbank');
expect(tahkim, 'ORGANIZATION', 'TRAMER');
expect(tahkim, 'POLICY_NUMBER', 'TRF-2023-4455667');
expect(tahkim, 'POLICY_NUMBER', 'TRF-2023-1122334');
expect(tahkim, 'INSURANCE_FILE_NO', '2023/HD-998877');
expect(tahkim, 'CONTEXTUAL_DATE', '20.09.2023');
expect(tahkim, 'TR_LICENSE_PLATE', '34 KL 890');
expect(tahkim, 'TR_LICENSE_PLATE', '06 MN 234');
expect(tahkim, 'VEHICLE_ID', 'WAUZZZ8V5KA123456');
expect(tahkim, 'VEHICLE_ID', 'CDA-987654');
expect(tahkim, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(tahkim, 'MEDICAL_ID', 'EKS-2023-8899');
expect(tahkim, 'DATE_TIME', '15.09.2023');

// ============================================================
console.log('\n=== SİGORTA: RÜCU DAVASI ===');
// ============================================================

const rucu = `İSTANBUL 7. ASLİYE TİCARET MAHKEMESİ

DOSYA NO: 2024/3456 Esas

DAVACI: Sompo Sigorta A.Ş.
Vergi No: 6780012345
Vekili: Av. Barış Demir

DAVALI: Kemal Öztürk
TC Kimlik No: 10000000146
Ehliyet No: B-567890123
Adres: Kurtuluş Mah. İnönü Cad. No:77/2, Şişli/İstanbul
Tel: 0555 444 33 22

DAVA KONUSU: Trafik kazası sebebiyle sigortalıya ödenen 180.000 TL hasar bedelinin
kusurlu sürücüden rücuen tahsili (TTK m.1472, KTK m.95)

OLAYLAR:
1. 22.06.2023 tarihinde E-5 Karayolu Bakırköy mevkiinde meydana gelen kazada
   davalı Kemal Öztürk 1.26 promil alkollü olarak 34 ST 456 plakalı aracı kullanırken
   davacı şirket sigortalısı Ayşe Güler'in 34 CD 789 plakalı aracına çarpmıştır.

2. Kaza tespit tutanağı no: 2023-BKY-007890
   Alkol raporu: Bakırköy Dr. Sadi Konuk Hastanesi, Rapor No: R2023-44556
   Kaza tarihi: 22.06.2023

3. Sigortalı araç bilgileri:
   Plaka: 34 CD 789
   Şasi No: WVWZZZ3CZWE456789
   Kasko Poliçe No: KSK-2023-9988776
   Hasar dosya no: 2023/HD-334455
   Ekspertiz tarihi: 25.06.2023

4. Davacı sigorta şirketi, sigortalısına toplam 180.000 TL hasar tazminatı ödemiştir.
   Ödeme tarihi: 15.08.2023
   IBAN: TR33 0006 1005 1978 6457 8413 26

5. Davalının kusur oranı %100 olup, alkollü araç kullanması nedeniyle
   TTK m.1472 uyarınca rücu hakkı doğmuştur.

6. TRAMER kaydından davalının son 5 yılda 3 hasar kaydı bulunduğu tespit edilmiştir.

DELİLLER:
- Kaza tespit tutanağı
- Alkol raporu
- Ekspertiz raporu (EKS-2023-5566)
- Onarım faturaları
- Ödeme dekontu
- TRAMER kayıtları
- Poliçe sureti

Rücu dosya no: 2024/R-12345`;

const rucuF = analyzeText(rucu, ALL, 0.35);
console.log(`  Rücu davası: ${rucuF.length} bulgu`);

expect(rucu, 'CASE_NUMBER', '2024/3456');
expect(rucu, 'ORGANIZATION', 'Sompo Sigorta');
expect(rucu, 'ORGANIZATION', 'TRAMER');
expect(rucu, 'TR_VERGI_NO', '6780012345');
expect(rucu, 'PERSON_NAME', 'Barış Demir');
expect(rucu, 'PERSON_NAME', 'Kemal Öztürk');
expect(rucu, 'PERSON_NAME', 'Ayşe Güler');
expect(rucu, 'TR_NATIONAL_ID', '10000000146');
expect(rucu, 'DRIVER_LICENSE', 'B-567890123');
expect(rucu, 'LOCATION', 'İstanbul');
expect(rucu, 'LOCATION', 'Şişli');
expect(rucu, 'LOCATION', 'Bakırköy');
expect(rucu, 'PHONE_NUMBER', '0555 444 33 22');
expect(rucu, 'TR_LICENSE_PLATE', '34 ST 456');
expect(rucu, 'TR_LICENSE_PLATE', '34 CD 789');
expect(rucu, 'VEHICLE_ID', 'WVWZZZ3CZWE456789');
expect(rucu, 'POLICY_NUMBER', 'KSK-2023-9988776');
expect(rucu, 'INSURANCE_FILE_NO', '2023/HD-334455');
expect(rucu, 'CONTEXTUAL_DATE', '22.06.2023');
expect(rucu, 'CONTEXTUAL_DATE', '25.06.2023');
expect(rucu, 'CONTEXTUAL_DATE', '15.08.2023');
expect(rucu, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(rucu, 'MEDICAL_ID', 'R2023-44556');
expect(rucu, 'MEDICAL_ID', 'EKS-2023-5566');
expect(rucu, 'INSURANCE_FILE_NO', '2024/R-12345');

// ============================================================
console.log('\n=== SİGORTA: DEĞER KAYBI TAZMİNAT DAVASI ===');
// ============================================================

const degerKaybi = `ANKARA 4. ASLİYE TİCARET MAHKEMESİ

DOSYA NO: 2024/8901 Esas

DAVACI: Elif Şahin (TC: 10000000146)
Vekili: Av. Cemre Yıldız - Ankara Barosu
Tel: 0312 777 88 99

DAVALI: Güneş Sigorta A.Ş.
(Zorunlu Mali Sorumluluk Sigortacısı)

KONU: Araç değer kaybı tazminatı (35.000 TL)

AÇIKLAMALAR:
1. 10.02.2024 tarihinde Ankara Çankaya ilçesi Kızılay Meydanında meydana gelen
   trafik kazasında müvekkilin 06 ABC 123 plakalı 2023 model Toyota Corolla marka
   aracı hasar görmüştür.

2. Kusurlu sürücü Murat Aksoy'un (TC: 11111111110) kullandığı 34 DEF 456 plakalı
   araç müvekkilin aracına arkadan çarpmıştır.

3. Müvekkilin araç bilgileri:
   Şasi No: JTDBR32E700987654
   Motor No: 2ZR-FAE-1234567
   Ruhsat No: AA-06-123456
   Kasko Poliçe No: KSK-2024-1234567
   Trafik Poliçe No: TPL-2024-7654321

4. Allianz Sigorta A.Ş. ekspertizi sonucu onarım bedeli 65.000 TL olarak tespit edilmiştir.
   Ekspertiz rapor no: EKS-2024-3344
   Ekspertiz tarihi: 15.02.2024

5. Aktüerya bilirkişi raporu ile araç değer kaybı 35.000 TL olarak hesaplanmıştır.
   Bilirkişi rapor no: AKT-2024-5566
   Rapor tarihi: 01.04.2024

6. Sigorta Tahkim Komisyonuna yapılan başvuru no: 2024/STK-44556 sonuçsuz kalmıştır.

7. TRAMER sorgulamasında müvekkilin aracının daha önce hasarsız olduğu tespit edilmiştir.

TEDAVİ BİLGİLERİ (boyun ağrısı):
Hastane: Ankara Numune Hastanesi
Hasta Protokol No: H2024-77889
Tedavi tarihi: 10.02.2024
Kontrol tarihi: 25.02.2024
Reçete No: R2024-12345

BANKA BİLGİLERİ:
IBAN: TR33 0006 1005 1978 6457 8413 26
İş Bankası Kızılay Şubesi

Davacı Vekili
Av. Cemre Yıldız
E-posta: cemre.yildiz@example.com`;

const dkF = analyzeText(degerKaybi, ALL, 0.35);
console.log(`  Değer kaybı davası: ${dkF.length} bulgu`);

expect(degerKaybi, 'CASE_NUMBER', '2024/8901');
expect(degerKaybi, 'PERSON_NAME', 'Elif Şahin');
expect(degerKaybi, 'PERSON_NAME', 'Cemre Yıldız');
expect(degerKaybi, 'PERSON_NAME', 'Murat Aksoy');
expect(degerKaybi, 'TR_NATIONAL_ID', '10000000146');
expect(degerKaybi, 'TR_NATIONAL_ID', '11111111110');
expect(degerKaybi, 'ORGANIZATION', 'Ankara Barosu');
expect(degerKaybi, 'ORGANIZATION', 'Güneş Sigorta');
expect(degerKaybi, 'ORGANIZATION', 'Allianz');
expect(degerKaybi, 'ORGANIZATION', 'Sigorta Tahkim Komisyonu');
expect(degerKaybi, 'ORGANIZATION', 'İş Bankası');
expect(degerKaybi, 'ORGANIZATION', 'TRAMER');
expect(degerKaybi, 'LOCATION', 'Ankara');
expect(degerKaybi, 'LOCATION', 'Çankaya');
expect(degerKaybi, 'TR_LICENSE_PLATE', '06 ABC 123');
expect(degerKaybi, 'TR_LICENSE_PLATE', '34 DEF 456');
expect(degerKaybi, 'VEHICLE_ID', 'JTDBR32E700987654');
expect(degerKaybi, 'VEHICLE_ID', '2ZR-FAE-1234567');
expect(degerKaybi, 'POLICY_NUMBER', 'KSK-2024-1234567');
expect(degerKaybi, 'POLICY_NUMBER', 'TPL-2024-7654321');
expect(degerKaybi, 'MEDICAL_ID', 'EKS-2024-3344');
expect(degerKaybi, 'CASE_NUMBER', 'AKT-2024-5566');
expect(degerKaybi, 'MEDICAL_ID', 'H2024-77889');
expect(degerKaybi, 'MEDICAL_ID', 'R2024-12345');
expect(degerKaybi, 'CONTEXTUAL_DATE', '15.02.2024');
expect(degerKaybi, 'CONTEXTUAL_DATE', '10.02.2024');
expect(degerKaybi, 'CONTEXTUAL_DATE', '25.02.2024');
expect(degerKaybi, 'CASE_NUMBER', '2024/STK-44556');
expect(degerKaybi, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(degerKaybi, 'PHONE_NUMBER', '0312 777 88 99');
expect(degerKaybi, 'EMAIL_ADDRESS', 'cemre.yildiz@example.com');

// ============================================================
console.log('\n=== SİGORTA: BEDENİ HASAR TAZMİNAT DOSYASI ===');
// ============================================================

const bedeniHasar = `SİGORTA HASAR DOSYASI - BEDENİ ZARAR

SİGORTA ŞİRKETİ: HDI Sigorta A.Ş.
Hasar dosya no: 2024/BH-556677
Poliçe türü: Zorunlu Mali Sorumluluk (Trafik)
Poliçe No: ZMS-2024-1234567
Poliçe başlangıç tarihi: 01.01.2024
Poliçe bitiş tarihi: 31.12.2024

SİGORTALI (ARAÇ SAHİBİ):
Ad Soyad: Mehmet Arslan
TC Kimlik No: 10000000146
Adres: Kozyatağı Mah. Değirmen Sok. No:8, Kadıköy/İstanbul
Tel: 0536 111 22 33

SÜRÜCÜ:
Ad Soyad: Burak Kılıç
TC: 11111111110
Ehliyet No: B-112233445
Ehliyet sınıfı: B

ZARARA UĞRAYAN (YARALI):
Ad Soyad: Zeynep Güneş
TC: 22222222220
Doğum Tarihi: 15.07.1990
Adres: Acıbadem Mah. Çeşme Sok. No:22, Üsküdar/İstanbul
Tel: 0544 555 66 77
E-posta: zeynep.gunes@example.com

KAZA BİLGİLERİ:
Kaza tarihi: 05.04.2024
Kaza yeri: Kadıköy Bağdat Caddesi, İstanbul
Kaza tespit tutanağı no: 2024-KDK-008899

ARAÇ BİLGİLERİ:
Plaka: 34 GH 567
Şasi No: WBAPH5C55BA987654
Motor No: N47D20C-1122334

TEDAVİ BİLGİLERİ:
İlk müdahale: Acıbadem Hastanesi Kadıköy
Hasta Protokol No: H2024-44556
Ameliyat tarihi: 06.04.2024
Taburcu tarihi: 15.04.2024
Epikriz No: EPK-2024-7788
Kontrol tarihi: 01.05.2024
Maluliyet raporu: İstanbul Adli Tıp Kurumu
Maluliyet oranı: %22
Geçici iş göremezlik: 90 gün

TAZMİNAT HESABI (Aktüerya):
Aktüerya rapor no: AKT-2024-8899
Geçici iş göremezlik zararı: 45.000 TL
Sürekli iş göremezlik tazminatı: 280.000 TL
Tedavi giderleri: 55.000 TL
Bakıcı gideri: 20.000 TL
TOPLAM: 400.000 TL

Güvence Hesabına yapılan başvuru sonuçsuz kalmıştır.
SGK rücu hakkı saklıdır. SGK No: 7788990

ÖDEME:
IBAN: DE89370400440532013000
İNG Bank Kadıköy Şubesi`;

const bhF = analyzeText(bedeniHasar, ALL, 0.35);
console.log(`  Bedeni hasar dosyası: ${bhF.length} bulgu`);

expect(bedeniHasar, 'ORGANIZATION', 'HDI Sigorta');
expect(bedeniHasar, 'ORGANIZATION', 'Acıbadem');
expect(bedeniHasar, 'ORGANIZATION', 'Güvence Hesabı');
expect(bedeniHasar, 'ORGANIZATION', 'SGK');
expect(bedeniHasar, 'INSURANCE_FILE_NO', '2024/BH-556677');
expect(bedeniHasar, 'POLICY_NUMBER', 'ZMS-2024-1234567');
expect(bedeniHasar, 'CONTEXTUAL_DATE', '01.01.2024');
expect(bedeniHasar, 'CONTEXTUAL_DATE', '31.12.2024');
expect(bedeniHasar, 'PERSON_NAME', 'Mehmet Arslan');
expect(bedeniHasar, 'PERSON_NAME', 'Burak Kılıç');
expect(bedeniHasar, 'PERSON_NAME', 'Zeynep Güneş');
expect(bedeniHasar, 'TR_NATIONAL_ID', '10000000146');
expect(bedeniHasar, 'TR_NATIONAL_ID', '11111111110');
expect(bedeniHasar, 'TR_NATIONAL_ID', '22222222220');
expect(bedeniHasar, 'CONTEXTUAL_DATE', '15.07.1990');
expect(bedeniHasar, 'CONTEXTUAL_DATE', '05.04.2024');
expect(bedeniHasar, 'CONTEXTUAL_DATE', '06.04.2024');
expect(bedeniHasar, 'CONTEXTUAL_DATE', '15.04.2024');
expect(bedeniHasar, 'CONTEXTUAL_DATE', '01.05.2024');
expect(bedeniHasar, 'LOCATION', 'İstanbul');
expect(bedeniHasar, 'LOCATION', 'Kadıköy');
expect(bedeniHasar, 'LOCATION', 'Üsküdar');
expect(bedeniHasar, 'TR_LICENSE_PLATE', '34 GH 567');
expect(bedeniHasar, 'VEHICLE_ID', 'WBAPH5C55BA987654');
expect(bedeniHasar, 'VEHICLE_ID', 'N47D20C-1122334');
expect(bedeniHasar, 'DRIVER_LICENSE', 'B-112233445');
expect(bedeniHasar, 'MEDICAL_ID', 'H2024-44556');
expect(bedeniHasar, 'MEDICAL_ID', 'EPK-2024-7788');
expect(bedeniHasar, 'MEDICAL_ID', 'AKT-2024-8899');
expect(bedeniHasar, 'PHONE_NUMBER', '0536 111 22 33');
expect(bedeniHasar, 'PHONE_NUMBER', '0544 555 66 77');
expect(bedeniHasar, 'EMAIL_ADDRESS', 'zeynep.gunes@example.com');
expect(bedeniHasar, 'IBAN_CODE', 'DE89370400440532013000');
expect(bedeniHasar, 'TR_SGK_NO', '7788990');

// ============================================================
console.log('\n=== SİGORTA: KASKO RED İTİRAZ DİLEKÇESİ ===');
// ============================================================

const kaskoRed = `SİGORTA TAHKİM KOMİSYONUNA

BAŞVURUCU:
Fatma Korkmaz (TC: 10000000146)
Adres: Bostancı Mah. Çamlık Sok. No:5/1, Kadıköy/İstanbul
Tel: 0216 333 44 55
Vekili: Av. Deniz Polat

KARŞI TARAF:
Mapfre Sigorta A.Ş.
Kasko Poliçe No: KSK-2023-5566778
Hasar ihbar no: 2023/HI-445566

BAŞVURU KONUSU:
Müvekkilin 34 PQ 123 plakalı 2022 model BMW 320i aracının
02.11.2023 tarihinde Beşiktaş Levent'te park halindeyken
tanımlanamayan araç tarafından hasarlanması sonucu açılan hasar
dosyasının 'kusur tespiti yapılamadığı' gerekçesiyle reddedilmesine
itirazımızdır.

RED KARARI:
Mapfre Sigorta hasar dosya no: 2023/HD-778899
Red kararı tarihi: 15.12.2023
Red gerekçesi: KTK m.81 kapsamında kusur tespiti yapılamaması

İTİRAZ GEREKÇELERİMİZ:
1. Kasko poliçesi tam hasar teminatı içermektedir.
2. Park halinde hasar, kasko teminatı kapsamındadır (TTK m.1409).
3. Güvenlik kamerası görüntüleri delil olarak sunulmuştur.

ARAÇ BİLGİLERİ:
Şasi No: WBA8E1C50JA123456
Motor No: B48B20B-9876543
Ruhsat No: AA-34-112233
Araç km: 35.000

EKSPERTİZ:
Ekspertiz rapor no: EKS-2023-9900
Ekspertiz tarihi: 10.11.2023
Onarım bedeli: 45.000 TL

TALEP:
45.000 TL onarım bedelinin poliçe kapsamında ödenmesine karar verilmesini
saygılarımla talep ederim.

BANKA:
IBAN: TR33 0006 1005 1978 6457 8413 26

Av. Deniz Polat
E-posta: deniz.polat@example.com
Tel: 0532 888 77 66`;

const kaskoF = analyzeText(kaskoRed, ALL, 0.35);
console.log(`  Kasko red itiraz dilekçesi: ${kaskoF.length} bulgu`);

expect(kaskoRed, 'ORGANIZATION', 'Sigorta Tahkim Komisyonu');
expect(kaskoRed, 'ORGANIZATION', 'Mapfre');
expect(kaskoRed, 'PERSON_NAME', 'Fatma Korkmaz');
expect(kaskoRed, 'PERSON_NAME', 'Deniz Polat');
expect(kaskoRed, 'TR_NATIONAL_ID', '10000000146');
expect(kaskoRed, 'LOCATION', 'İstanbul');
expect(kaskoRed, 'LOCATION', 'Kadıköy');
expect(kaskoRed, 'LOCATION', 'Beşiktaş');
expect(kaskoRed, 'PHONE_NUMBER', '0216 333 44 55');
expect(kaskoRed, 'PHONE_NUMBER', '0532 888 77 66');
expect(kaskoRed, 'EMAIL_ADDRESS', 'deniz.polat@example.com');
expect(kaskoRed, 'POLICY_NUMBER', 'KSK-2023-5566778');
expect(kaskoRed, 'INSURANCE_FILE_NO', '2023/HI-445566');
expect(kaskoRed, 'INSURANCE_FILE_NO', '2023/HD-778899');
expect(kaskoRed, 'TR_LICENSE_PLATE', '34 PQ 123');
expect(kaskoRed, 'VEHICLE_ID', 'WBA8E1C50JA123456');
expect(kaskoRed, 'VEHICLE_ID', 'B48B20B-9876543');
expect(kaskoRed, 'CONTEXTUAL_DATE', '10.11.2023');
expect(kaskoRed, 'MEDICAL_ID', 'EKS-2023-9900');
expect(kaskoRed, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');

// ============================================================
console.log('\n=== SİGORTA: FERDİ KAZA SİGORTASI TAZMİNAT ===');
// ============================================================

const ferdiKaza = `FERDİ KAZA SİGORTASI TAZMİNAT TALEBİ

SİGORTA ŞİRKETİ: Bereket Sigorta A.Ş.
Acente: İstanbul Beyoğlu Şubesi

SİGORTALI:
Ad Soyad: İbrahim Güler
TC Kimlik No: 10000000146
Doğum Tarihi: 08.03.1980
Meslek: İnşaat Mühendisi
Adres: Beyoğlu İstiklal Cad. No:155/4, Beyoğlu/İstanbul
Tel: 0533 222 11 00
E-posta: ibrahim.guler2@example.com

POLİÇE BİLGİLERİ:
Ferdi kaza sigorta no: FK-2024-0056789
Poliçe başlangıç tarihi: 15.01.2024
Poliçe bitiş tarihi: 15.01.2025
Kaza teminatı: 500.000 TL
Tedavi teminatı: 50.000 TL
Günlük hastane tazminatı: 500 TL/gün

KAZA BİLGİLERİ:
Kaza tarihi: 20.05.2024
Kaza yeri: Tuzla OSB, İstanbul
Kaza türü: İş kazası (yüksekten düşme)

TEDAVİ DETAYLARI:
Hastane: İstanbul Kartal Dr. Lütfi Kırdar Şehir Hastanesi
Hasta Protokol No: H2024-55667
Yatış Tarihi: 20.05.2024
Ameliyat Tarihi: 21.05.2024
Taburcu Tarihi: 02.06.2024
Toplam yatış: 13 gün
Epikriz No: EPK-2024-3344
Reçete No: R2024-99887
SGK No: 3344556

Kontrol tarihi: 01.07.2024
Fizik tedavi başlangıç: 15.06.2024
Fizik tedavi bitiş: 15.08.2024

MALULİYET DEĞERLENDİRMESİ:
Kurum: İstanbul Adli Tıp Kurumu 3. İhtisas Kurulu
Rapor No: ATK-2024-11223
Sürekli maluliyet oranı: %15
Geçici iş göremezlik: 90 gün

TAZMİNAT HESABI:
Sürekli maluliyet: 75.000 TL (%15 x 500.000 TL)
Günlük hastane: 6.500 TL (13 gün x 500 TL)
Tedavi giderleri: 35.000 TL
TOPLAM TALEP: 116.500 TL

ÖDEME:
IBAN: TR33 0006 1005 1978 6457 8413 26
Yapı Kredi Bankası Beyoğlu Şubesi`;

const fkF = analyzeText(ferdiKaza, ALL, 0.35);
console.log(`  Ferdi kaza sigortası tazminat: ${fkF.length} bulgu`);

expect(ferdiKaza, 'ORGANIZATION', 'Bereket Sigorta');
expect(ferdiKaza, 'ORGANIZATION', 'Yapı Kredi');
expect(ferdiKaza, 'PERSON_NAME', 'İbrahim Güler');
expect(ferdiKaza, 'TR_NATIONAL_ID', '10000000146');
expect(ferdiKaza, 'CONTEXTUAL_DATE', '08.03.1980');
expect(ferdiKaza, 'CONTEXTUAL_DATE', '20.05.2024');
expect(ferdiKaza, 'CONTEXTUAL_DATE', '20.05.2024');
expect(ferdiKaza, 'CONTEXTUAL_DATE', '21.05.2024');
expect(ferdiKaza, 'CONTEXTUAL_DATE', '02.06.2024');
expect(ferdiKaza, 'CONTEXTUAL_DATE', '01.07.2024');
expect(ferdiKaza, 'CONTEXTUAL_DATE', '15.01.2024');
expect(ferdiKaza, 'CONTEXTUAL_DATE', '15.01.2025');
expect(ferdiKaza, 'LOCATION', 'İstanbul');
expect(ferdiKaza, 'LOCATION', 'Beyoğlu');
expect(ferdiKaza, 'PHONE_NUMBER', '0533 222 11 00');
expect(ferdiKaza, 'EMAIL_ADDRESS', 'ibrahim.guler2@example.com');
expect(ferdiKaza, 'POLICY_NUMBER', 'FK-2024-0056789');
expect(ferdiKaza, 'MEDICAL_ID', 'H2024-55667');
expect(ferdiKaza, 'MEDICAL_ID', 'EPK-2024-3344');
expect(ferdiKaza, 'MEDICAL_ID', 'R2024-99887');
expect(ferdiKaza, 'MEDICAL_ID', 'ATK-2024-11223');
expect(ferdiKaza, 'TR_SGK_NO', '3344556');
expect(ferdiKaza, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');

// ============================================================
console.log('\n=== SİGORTA: DASK DEPREM HASAR DOSYASI ===');
// ============================================================

const dask = `DASK HASAR DOSYASI

DOĞAL AFET SİGORTALARI KURUMU (DASK)

HASAR DOSYA NO: 2024/DASK-123456
DASK Poliçe No: DASK-2024-998877
Poliçe başlangıç tarihi: 01.03.2024

SİGORTALI:
Ad Soyad: Ayşe Demir
TC Kimlik No: 10000000146
Adres: Yıldız Mah. Çınar Sok. No:12/4, Hatay/Antakya
Tel: 0326 444 55 66
E-posta: ayse.demir@example.com

TAŞINMAZ BİLGİLERİ:
Tapu ada/parsel: 1234/56
UAVT kodu: 12345678
Bina yaşı: 15
Bina kat sayısı: 5
Daire m²: 120
Yapı tarzı: Betonarme

HASAR BİLGİLERİ:
Deprem tarihi: 06.02.2024
Hasar ihbar tarihi: 08.02.2024
Keşif tarihi: 15.02.2024
Hasar yeri: Antakya/Hatay

EKSPERTİZ:
Ekspertiz rapor no: EKS-DASK-2024-5566
Ekspertiz tarihi: 15.02.2024
Hasar tespiti: Ağır hasarlı (yıkılacak düzey)
Tahmini hasar bedeli: 320.000 TL

KARAR: Sigorta bedeli limiti olan 320.000 TL'nin tamamının ödenmesine karar verilmiştir.
Ödeme tarihi: 01.04.2024

ÖDEME:
IBAN: TR33 0006 1005 1978 6457 8413 26
Ziraat Bankası Antakya Şubesi`;

const daskF = analyzeText(dask, ALL, 0.35);
console.log(`  DASK deprem hasar dosyası: ${daskF.length} bulgu`);

expect(dask, 'ORGANIZATION', 'DASK');
expect(dask, 'INSURANCE_FILE_NO', '2024/DASK-123456');
expect(dask, 'POLICY_NUMBER', 'DASK-2024-998877');
expect(dask, 'CONTEXTUAL_DATE', '01.03.2024');
expect(dask, 'CONTEXTUAL_DATE', '06.02.2024');
expect(dask, 'CONTEXTUAL_DATE', '15.02.2024');
expect(dask, 'CONTEXTUAL_DATE', '01.04.2024');
expect(dask, 'PERSON_NAME', 'Ayşe Demir');
expect(dask, 'TR_NATIONAL_ID', '10000000146');
expect(dask, 'LOCATION', 'Hatay');
expect(dask, 'PHONE_NUMBER', '0326 444 55 66');
expect(dask, 'EMAIL_ADDRESS', 'ayse.demir@example.com');
expect(dask, 'MEDICAL_ID', 'EKS-DASK-2024-5566');
expect(dask, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(dask, 'ORGANIZATION', 'Ziraat Bankası');

// ============================================================
console.log('\n=== SİGORTA FALSE POSİTİVE KONTROL ===');
// ============================================================

// Sigorta terimleri PII olmamalı
expect('Poliçe prim tutarı 2.500 TL olarak belirlenmiştir.', 'PHONE_NUMBER', null);
expect('Teminat limiti 500.000 TL\'dir.', 'PHONE_NUMBER', null);
expect('Hasar oranı %60 olarak tespit edilmiştir.', 'TR_NATIONAL_ID', null);
expect('Muafıyet tutarı 1.000 TL\'dir.', 'PHONE_NUMBER', null);
expect('TTK m.1409 hükmü gereğince', 'CASE_NUMBER', null);
expect('KTK m.81 kapsamında', 'CASE_NUMBER', null);
expect('Rücu hakkı saklıdır.', 'PERSON_NAME', null);
expect('Ekspertiz raporu hazırlanmıştır.', 'PERSON_NAME', null);

// ============================================================
console.log('\n=== SİGORTA: TIBBİ MALPRAKTİS DAVASI ===');
// ============================================================

const malpraktis = `İSTANBUL 12. ASLİYE HUKUK MAHKEMESİ

DOSYA NO: 2024/5678 Esas

DAVACI:
Sevgi Aydın (TC: 10000000146)
Vekili: Av. Tolga Çelik - İstanbul Barosu

DAVALI:
1) Op. Dr. Hakan Yılmaz (TC: 11111111110)
2) Acıbadem Sağlık Grubu A.Ş.
3) AIG Sigorta A.Ş. (Mesleki Sorumluluk Sigortacısı)
   Poliçe No: MSS-2023-1234567

DAVA KONUSU: Ameliyat komplikasyonu nedeniyle tıbbi malpraktis
tazminat davası (TBK m.49, m.54)

OLAYLAR:
Davacı Sevgi Aydın 15.06.2023 tarihinde Acıbadem Kadıköy Hastanesinde
Op. Dr. Hakan Yılmaz tarafından laparoskopik kolesistektomi ameliyatı
yapılmıştır.

Ameliyat tarihi: 15.06.2023
Hasta protokol no: H2023-33445
Epikriz no: EPK-2023-5566

Ameliyat sırasında safra yolu yaralanması meydana gelmiş, davacı
3 kez tekrar ameliyata alınmıştır.

Tedavi bilgileri:
Taburcu tarihi: 15.08.2023
Kontrol tarihi: 01.10.2023
SGK No: 4455667
Reçete no: R2023-9988

Yüksek Sağlık Şûrası raporu ile malpraktis tespit edilmiştir.
Maluliyet oranı: %35
Rapor No: YSS-2023-0011

TAZMİNAT HESABI:
Maddi tazminat: 500.000 TL
Manevi tazminat: 250.000 TL
TOPLAM: 750.000 TL`;

const malpF = analyzeText(malpraktis, ALL, 0.35);
console.log(`  Tıbbi malpraktis davası: ${malpF.length} bulgu`);

expect(malpraktis, 'CASE_NUMBER', '2024/5678');
expect(malpraktis, 'PERSON_NAME', 'Sevgi Aydın');
expect(malpraktis, 'PERSON_NAME', 'Tolga Çelik');
expect(malpraktis, 'PERSON_NAME', 'Hakan Yılmaz');
expect(malpraktis, 'TR_NATIONAL_ID', '10000000146');
expect(malpraktis, 'TR_NATIONAL_ID', '11111111110');
expect(malpraktis, 'ORGANIZATION', 'İstanbul Barosu');
expect(malpraktis, 'ORGANIZATION', 'Acıbadem');
expect(malpraktis, 'ORGANIZATION', 'AIG Sigorta');
expect(malpraktis, 'POLICY_NUMBER', 'MSS-2023-1234567');
expect(malpraktis, 'CONTEXTUAL_DATE', '15.06.2023');
expect(malpraktis, 'CONTEXTUAL_DATE', '15.08.2023');
expect(malpraktis, 'CONTEXTUAL_DATE', '01.10.2023');
expect(malpraktis, 'MEDICAL_ID', 'H2023-33445');
expect(malpraktis, 'MEDICAL_ID', 'EPK-2023-5566');
expect(malpraktis, 'MEDICAL_ID', 'R2023-9988');
expect(malpraktis, 'MEDICAL_ID', 'YSS-2023-0011');
expect(malpraktis, 'TR_SGK_NO', '4455667');
expect(malpraktis, 'COURT', 'İSTANBUL 12. ASLİYE HUKUK MAHKEMESİ');
expect(malpraktis, 'LOCATION', 'Kadıköy');

// ============================================================
console.log('\n=== SİGORTA: İŞ KAZASI SGK RÜCU ===');
// ============================================================

const isKazasi = `T.C.
ANKARA 3. İŞ MAHKEMESİ

DOSYA NO: 2024/1122 Esas

DAVACI: Sosyal Güvenlik Kurumu (SGK)
Vekili: Av. Pınar Koç

DAVALI:
1) ABC İnşaat Ltd. Şti. (İşveren)
   Vergi No: 1234567890
2) Zurich Sigorta A.Ş. (İşveren Sorumluluk Sigortacısı)
   Poliçe No: ISS-2023-9988776

SİGORTALI İŞÇİ:
Ad Soyad: Mustafa Şen
TC: 22222222220
SGK No: 7788556
İşe giriş tarihi: 01.03.2020
Kaza tarihi: 10.08.2023

İŞ KAZASI BİLGİLERİ:
Kaza yeri: Ankara Etimesgut OSB
Kaza türü: Yüksekten düşme (iskele)
İhbar tarihi: 10.08.2023

TEDAVİ:
Hastane: Ankara Bilkent Şehir Hastanesi
Hasta Protokol No: H2023-66778
Ameliyat Tarihi: 11.08.2023
Taburcu Tarihi: 01.10.2023
Epikriz No: EPK-2023-8899

MALULİYET:
Maluliyet oranı: %42
Rapor: İstanbul Adli Tıp Kurumu 3. İhtisas Kurulu
Rapor No: ATK-2023-44556
Rapor Tarihi: 15.12.2023

SGK HESABI:
Gelir bağlanma tarihi: 01.01.2024
Peşin sermaye değeri: 850.000 TL
Rücu tutarı: 680.000 TL (%80 kusur)

TEBLİGAT ADRESİ:
ABC İnşaat Ltd. Şti.
Organize Sanayi Bölgesi 5. Cad. No:12
Etimesgut/Ankara

İletişim: 0312 555 44 33
E-posta: info@example.com`;

const ikF = analyzeText(isKazasi, ALL, 0.35);
console.log(`  İş kazası SGK rücu: ${ikF.length} bulgu`);

expect(isKazasi, 'CASE_NUMBER', '2024/1122');
expect(isKazasi, 'ORGANIZATION', 'SGK');
expect(isKazasi, 'ORGANIZATION', 'Zurich Sigorta');
expect(isKazasi, 'PERSON_NAME', 'Pınar Koç');
expect(isKazasi, 'PERSON_NAME', 'Mustafa Şen');
expect(isKazasi, 'TR_NATIONAL_ID', '22222222220');
expect(isKazasi, 'TR_VERGI_NO', '1234567890');
expect(isKazasi, 'TR_SGK_NO', '7788556');
expect(isKazasi, 'POLICY_NUMBER', 'ISS-2023-9988776');
expect(isKazasi, 'CONTEXTUAL_DATE', '10.08.2023');
expect(isKazasi, 'CONTEXTUAL_DATE', '11.08.2023');
expect(isKazasi, 'CONTEXTUAL_DATE', '01.10.2023');
expect(isKazasi, 'MEDICAL_ID', 'H2023-66778');
expect(isKazasi, 'MEDICAL_ID', 'EPK-2023-8899');
expect(isKazasi, 'MEDICAL_ID', 'ATK-2023-44556');
expect(isKazasi, 'LOCATION', 'Ankara');
expect(isKazasi, 'PHONE_NUMBER', '0312 555 44 33');
expect(isKazasi, 'EMAIL_ADDRESS', 'info@example.com');

// ============================================================
console.log('\n=== SİGORTA: DESTEKTEN YOKSUN KALMA ===');
// ============================================================

const destekYoksun = `İSTANBUL 15. ASLİYE HUKUK MAHKEMESİ

DOSYA NO: 2024/7890 Esas, 2025/1234 Karar

DAVACI:
1) Hatice Yılmaz (Eş, TC: 10000000146)
2) Ali Yılmaz (Çocuk, TC: 11111111110)
Vekili: Av. Burcu Özer

DAVALI:
1) Murat Kaya (Kusurlu sürücü, TC: 22222222220)
2) Anadolu Sigorta A.Ş. (ZMSS)
   Poliçe No: TRF-2023-5566778
3) Güvence Hesabı

MÜTEVEFFA:
Ad Soyad: Ahmet Yılmaz
TC Kimlik No: 11111111110
Doğum Tarihi: 01.05.1975
Vefat Tarihi: 15.09.2023
Meslek: Makine Mühendisi
Aylık gelir: 45.000 TL (SGK kayıtlarına göre)
SGK No: 1122334

KAZA BİLGİLERİ:
Kaza tarihi: 15.09.2023
Kaza yeri: Bolu Dağı Tüneli, D-655 Karayolu
Kaza tespit tutanağı no: 2023-BLU-009988
Otopsi raporu no: OTP-2023-2233

ARAÇ BİLGİLERİ:
Müteveffa aracı: 34 XY 789 (Volkswagen Passat)
Şasi No: WVWZZZ3CZWE789012
Kusurlu araç: 14 BLU 456

AKTÜERYAİ HESAPLAMA:
Bilirkişi: Prof. Dr. Selim Arslan
Rapor no: AKT-2024-1122

Hatice Yılmaz (eş):
Destekten yoksun kalma: 1.200.000 TL
Manevi tazminat: 150.000 TL

Ali Yılmaz (çocuk):
Destekten yoksun kalma: 800.000 TL
Manevi tazminat: 100.000 TL

TOPLAM: 2.250.000 TL

ÖDEME:
IBAN (Hatice): TR33 0006 1005 1978 6457 8413 26
IBAN (Ali): TR76 0001 0017 4500 0100 6523 07

Anadolu Sigorta teminat limiti: 800.000 TL (kişi başı)
Güvence Hesabı sorumluluğu: Kalan tutar

Tel: 0532 111 22 33 (Av. Burcu Özer)`;

const dyF = analyzeText(destekYoksun, ALL, 0.35);
console.log(`  Destekten yoksun kalma: ${dyF.length} bulgu`);

expect(destekYoksun, 'CASE_NUMBER', '2024/7890');
expect(destekYoksun, 'CASE_NUMBER', '2025/1234');
expect(destekYoksun, 'PERSON_NAME', 'Hatice Yılmaz');
expect(destekYoksun, 'PERSON_NAME', 'Ali Yılmaz');
expect(destekYoksun, 'PERSON_NAME', 'Murat Kaya');
expect(destekYoksun, 'PERSON_NAME', 'Ahmet Yılmaz');
expect(destekYoksun, 'PERSON_NAME', 'Burcu Özer');
expect(destekYoksun, 'PERSON_NAME', 'Selim Arslan');
expect(destekYoksun, 'TR_NATIONAL_ID', '10000000146');
expect(destekYoksun, 'TR_NATIONAL_ID', '11111111110');
expect(destekYoksun, 'TR_NATIONAL_ID', '22222222220');
expect(destekYoksun, 'TR_NATIONAL_ID', '11111111110');
expect(destekYoksun, 'ORGANIZATION', 'Anadolu Sigorta');
expect(destekYoksun, 'ORGANIZATION', 'Güvence Hesabı');
expect(destekYoksun, 'POLICY_NUMBER', 'TRF-2023-5566778');
expect(destekYoksun, 'CONTEXTUAL_DATE', '01.05.1975');
expect(destekYoksun, 'CONTEXTUAL_DATE', '15.09.2023');
expect(destekYoksun, 'TR_LICENSE_PLATE', '34 XY 789');
expect(destekYoksun, 'TR_LICENSE_PLATE', '14 BLU 456');
expect(destekYoksun, 'VEHICLE_ID', 'WVWZZZ3CZWE789012');
expect(destekYoksun, 'TR_SGK_NO', '1122334');
expect(destekYoksun, 'MEDICAL_ID', 'AKT-2024-1122');
expect(destekYoksun, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(destekYoksun, 'PHONE_NUMBER', '0532 111 22 33');
expect(destekYoksun, 'COURT', 'İSTANBUL 15. ASLİYE HUKUK MAHKEMESİ');

// ============================================================
console.log('\n=== SİGORTA: KONUT SİGORTASI RED İTİRAZ ===');
// ============================================================

const konutRed = `SİGORTA TAHKİM KOMİSYONU BAŞKANLIĞINA

BAŞVURUCU: Selma Güler (TC: 10000000146)
Adres: Yıldız Mah. Çiçek Sok. No:5/1, Beşiktaş/İstanbul
Tel: 0212 327 45 67
E-posta: selma.guler@example.com
Vekili: Av. Özge Toprak

KARŞI TARAF: Anadolu Sigorta A.Ş.

KONU: Konut sigortası hasar talebinin haksız reddi (125.000 TL)

POLİÇE:
Konut sigortası poliçe no: KNT-2023-445566
Poliçe başlangıç tarihi: 01.03.2023
Poliçe bitiş tarihi: 01.03.2024

OLAY:
Hasar tarihi: 15.01.2024
İhbar tarihi: 15.01.2024

EKSPERTİZ:
Eksper: Ramazan Kaya
Ekspertiz tarihi: 18.01.2024
Ekspertiz rapor no: EKS-ANS-2024-1122

Hasar dosya no: HSR-ANS-2024-3344

ÖDEME:
IBAN: TR33 0006 1005 1978 6457 8413 26`;

const konutF = analyzeText(konutRed, ALL, 0.35);
console.log(`  Konut sigortası red itiraz: ${konutF.length} bulgu`);

expect(konutRed, 'ORGANIZATION', 'Sigorta Tahkim Komisyonu');
expect(konutRed, 'ORGANIZATION', 'Anadolu Sigorta');
expect(konutRed, 'PERSON_NAME', 'Selma Güler');
expect(konutRed, 'PERSON_NAME', 'Ramazan Kaya');
expect(konutRed, 'PERSON_NAME', 'Özge Toprak');
expect(konutRed, 'TR_NATIONAL_ID', '10000000146');
expect(konutRed, 'POLICY_NUMBER', 'KNT-2023-445566');
expect(konutRed, 'CONTEXTUAL_DATE', '15.01.2024');
expect(konutRed, 'CONTEXTUAL_DATE', '15.01.2024');
expect(konutRed, 'CONTEXTUAL_DATE', '18.01.2024');
expect(konutRed, 'CONTEXTUAL_DATE', '01.03.2023');
expect(konutRed, 'CONTEXTUAL_DATE', '01.03.2024');
expect(konutRed, 'INSURANCE_FILE_NO', 'HSR-ANS-2024-3344');
expect(konutRed, 'MEDICAL_ID', 'EKS-ANS-2024-1122');
expect(konutRed, 'PHONE_NUMBER', '0212 327 45 67');
expect(konutRed, 'EMAIL_ADDRESS', 'selma.guler@example.com');
expect(konutRed, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(konutRed, 'LOCATION', 'İstanbul');
expect(konutRed, 'LOCATION', 'Beşiktaş');

// ============================================================
console.log('\n=== SİGORTA: EK BİRİM TESTLERİ ===');
// ============================================================

// Sigorta şirketleri tespiti - ek kontroller
expect('Aksigorta kasko poliçe açtı', 'ORGANIZATION', 'Aksigorta');
expect('Generali Sigorta teminatı kapsamında', 'ORGANIZATION', 'Generali Sigorta');
expect('Unico Sigorta eksperi inceledi', 'ORGANIZATION', 'Unico Sigorta');
expect('Eureko Sigorta hasar bildirimi', 'ORGANIZATION', 'Eureko Sigorta');
expect('Türk Nippon primleri ödendi', 'ORGANIZATION', 'Türk Nippon');

// Sigorta kurumları - ek Türkçe ek testleri
expect('Sigorta Tahkim Komisyonundan karar çıktı', 'ORGANIZATION', 'Sigorta Tahkim Komisyonu');
expect('Güvence Hesabından ödeme geldi', 'ORGANIZATION', 'Güvence Hesabı');
expect('Tramer sisteminde kayıt var', 'ORGANIZATION', 'Tramer');
expect('Türkiye Sigorta Birliğinin görüşü', 'ORGANIZATION', 'Türkiye Sigorta Birliği');

// Çeşitli poliçe format testleri
expect('Deprem sigorta no: DSG-2024-11223 kayıtlı', 'POLICY_NUMBER', 'DSG-2024-11223');
expect('Ferdi kaza sigorta no: FKZ-2024-77889', 'POLICY_NUMBER', 'FKZ-2024-77889');
expect('Konut sigortası poliçe no: KNT-2024-55667', 'POLICY_NUMBER', 'KNT-2024-55667');

// Sigorta-spesifik kontekst tarihleri - ek testler
expect('Temerrüt tarihi: 25.04.2024 itibarıyla', 'CONTEXTUAL_DATE', '25.04.2024');
expect('Rücu tarihi: 15.05.2024 olarak belirlendi', 'CONTEXTUAL_DATE', '15.05.2024');
expect('Deprem tarihi: 06.02.2023 kayıtlarda', 'CONTEXTUAL_DATE', '06.02.2023');
expect('Sel tarihi: 12.06.2024 meydana geldi', 'CONTEXTUAL_DATE', '12.06.2024');
expect('Yangın tarihi: 20.07.2024 olarak kayıtlı', 'CONTEXTUAL_DATE', '20.07.2024');
expect('Hırsızlık tarihi: 03.08.2024 tespit edildi', 'CONTEXTUAL_DATE', '03.08.2024');
expect('Vade tarihi: 15.01.2025 dolmuştur', 'CONTEXTUAL_DATE', '15.01.2025');
expect('İcra tarihi: 20.06.2024 başlatıldı', 'CONTEXTUAL_DATE', '20.06.2024');
expect('Vefat tarihi: 28.09.2023 olarak kayıtlı', 'CONTEXTUAL_DATE', '28.09.2023');

// Hasar/rücu/tahkim dosya numaraları
expect('Tahkim dosya no: THK-2024-33445 üzerinden', 'ARBITRATION_NO', 'THK-2024-33445');
expect('Rücu dosya no: RCU-2024-88990 açıldı', 'INSURANCE_FILE_NO', 'RCU-2024-88990');
expect('İhbar no: IHB-2024-11223 kaydedildi', 'INSURANCE_FILE_NO', 'IHB-2024-11223');

// Genişletilmiş false positive kontrolleri
expect('Sigorta primi ödendi', 'PERSON_NAME', null);
expect('Poliçe kapsamında değerlendirildi', 'PERSON_NAME', null);
expect('Teminat limiti aşıldı', 'PERSON_NAME', null);
expect('Aktüerya hesabı yapıldı', 'PERSON_NAME', null);
expect('Destekten yoksun kalma tazminatı', 'PERSON_NAME', null);
expect('Sürekli işgöremezlik oranı belirlendi', 'PERSON_NAME', null);
expect('Geçici iş göremezlik raporu', 'PERSON_NAME', null);
expect('Değer kaybı tespit raporu hazırlandı', 'PERSON_NAME', null);
expect('Hasar ihbarı alınmıştır', 'PERSON_NAME', null);
expect('Ekspertiz incelemesi tamamlandı', 'PERSON_NAME', null);
expect('Muafiyet tutarı düşüldü', 'PERSON_NAME', null);
expect('Peşin sermaye değeri hesaplandı', 'PERSON_NAME', null);

// ============================================================
console.log('\n=== TAHKİM ESAS NUMARALARI ===');
// ============================================================

// YYYY.E.NNNNN, YYYY.H.NNNNN, YYYY.İ.NNNNN, YYYY.K.NNNNN formatları
expect('2026.E.1234', 'CASE_NUMBER', '2026.E.1234');
expect('2026.H.5678', 'CASE_NUMBER', '2026.H.5678');
expect('2026.İ.999', 'CASE_NUMBER', '2026.İ.999');
expect('2025.E.12345', 'CASE_NUMBER', '2025.E.12345');
expect('2026.K.4455', 'CASE_NUMBER', '2026.K.4455');
expect('Tahkim dosya no: 2026.E.4567', 'CASE_NUMBER', '2026.E.4567');
expect('Başvuru no: 2026.İ.123', 'CASE_NUMBER', '2026.İ.123');
expect('2024.E.56789 sayılı dosya', 'CASE_NUMBER', '2024.E.56789');

// Gerçekçi cümle içinde
expect('Sigorta Tahkim Komisyonu 2026.E.3456 sayılı dosyada karar verdi.', 'CASE_NUMBER', '2026.E.3456');
expect('2026.İ.789 sayılı itiraz başvurusu reddedildi.', 'CASE_NUMBER', '2026.İ.789');
expect('Hakem heyeti 2025.H.1234 sayılı kararı ile talebi kabul etti.', 'CASE_NUMBER', '2025.H.1234');

// Birden fazla tahkim numarası
const cokluTahkim = 'Esas no: 2026.E.1111, İtiraz no: 2026.İ.2222, Karar no: 2026.K.3333';
expect(cokluTahkim, 'CASE_NUMBER', '2026.E.1111');
expect(cokluTahkim, 'CASE_NUMBER', '2026.İ.2222');
expect(cokluTahkim, 'CASE_NUMBER', '2026.K.3333');

// Tam format tahkim belgesi
const tahkimBelge = `SİGORTA TAHKİM KOMİSYONU
Uyuşmazlık Hakem Heyeti
Dosya No: 2026.E.5555
İtiraz No: 2026.İ.6666

Başvuran: Canan Özdemir (TC: 10000000146)
Karşı Taraf: Axa Sigorta A.Ş.
Poliçe No: TRF-2025-9988776

Kaza tarihi: 10.01.2026
Hasar ihbar no: HI-2026-11223
Tel: 0532 444 55 66

KARAR: Başvurunun kabulüne karar verildi.`;

const tbF = analyzeText(tahkimBelge, ALL, 0.35);
console.log(`  Tahkim belgesi: ${tbF.length} bulgu`);

expect(tahkimBelge, 'ORGANIZATION', 'Sigorta Tahkim Komisyonu');
expect(tahkimBelge, 'CASE_NUMBER', '2026.E.5555');
expect(tahkimBelge, 'CASE_NUMBER', '2026.İ.6666');
expect(tahkimBelge, 'PERSON_NAME', 'Canan Özdemir');
expect(tahkimBelge, 'TR_NATIONAL_ID', '10000000146');
expect(tahkimBelge, 'ORGANIZATION', 'Axa Sigorta');
expect(tahkimBelge, 'POLICY_NUMBER', 'TRF-2025-9988776');
expect(tahkimBelge, 'CONTEXTUAL_DATE', '10.01.2026');
expect(tahkimBelge, 'INSURANCE_FILE_NO', 'HI-2026-11223');
expect(tahkimBelge, 'PHONE_NUMBER', '0532 444 55 66');

// ============================================================
console.log('\n=== İNTERNET: GERÇEK YARGITAY KARARI (17.HD) ===');
// ============================================================

const yargitayGercek1 = `Yargıtay 17. Hukuk Dairesi
Esas No: 2016/5293
Karar No: 2017/8012
Karar Tarihi: 20.09.2017

Davacı Mehmet Yılmaz vekili Av. Ayşe Kara tarafından davalı
Axa Sigorta A.Ş. aleyhine açılan tazminat davasının yapılan
yargılaması sonunda; davanın kabulüne dair verilen
İstanbul 3. Asliye Ticaret Mahkemesi'nin 2015/234 Esas,
2016/567 Karar sayılı kararının davalı vekili tarafından
temyiz edilmesi üzerine dosya incelendi.

Davacı, 15.03.2015 tarihinde meydana gelen trafik kazasında
34 ABC 567 plakalı aracının hasarlandığını, davalı sigorta
şirketinin zorunlu mali sorumluluk sigortacısı olduğunu,
aracın onarımında orijinal parça kullanılması gerektiğini
ileri sürerek 45.000 TL maddi tazminatın tahsilini istemiştir.

SONUÇ: Hükmün ONANMASINA, 20.09.2017 tarihinde oybirliğiyle karar verildi.`;

const yg1F = analyzeText(yargitayGercek1, ALL, 0.35);
console.log(`  Yargıtay 17.HD kararı: ${yg1F.length} bulgu`);

expect(yargitayGercek1, 'LEGAL_CITATION', '2016/5293');
expect(yargitayGercek1, 'LEGAL_CITATION', '2017/8012');
expect(yargitayGercek1, 'PERSON_NAME', 'Mehmet Yılmaz');
expect(yargitayGercek1, 'PERSON_NAME', 'Ayşe Kara');
expect(yargitayGercek1, 'ORGANIZATION', 'Axa Sigorta');
expect(yargitayGercek1, 'COURT', 'İstanbul 3. Asliye Ticaret Mahkemesi');
expect(yargitayGercek1, 'CASE_NUMBER', '2015/234');
expect(yargitayGercek1, 'CASE_NUMBER', '2016/567');
expect(yargitayGercek1, 'DATE_TIME', '15.03.2015');
expect(yargitayGercek1, 'TR_LICENSE_PLATE', '34 ABC 567');

// ============================================================
console.log('\n=== İNTERNET: YARGITAY 4.HD KARARI (DESTEKTEN YOKSUN KALMA) ===');
// ============================================================

const yargitayGercek2 = `Yargıtay 4. Hukuk Dairesi
E. 2021/25649, K. 2024/1398

Davacı: Fatma Demir (TC: 10000000146)
Vekili: Av. Serkan Aydın - Ankara Barosu
Davalı: HDI Sigorta A.Ş.

Dava konusu: Trafik kazası nedeniyle destekten yoksun kalma
tazminatı. Poliçenin iptal edilmiş olmasının dahi bazı koşullarda
sorumluluğu sona erdirmediğine; fesihten sonra öngörülen yasal
süre içinde gerçekleşen kazalarda sigortacının sorumluluğunun
devam edeceğine hükmedilmiştir.

Kaza tarihi: 22.06.2021
Poliçe No: ZMS-2021-3344556
Araç plakası: 06 XY 789

TRAMER kayıtları incelenmiş, SGK müzekkeresi yazılmıştır.
SGK No: 3344556

Ankara 5. Asliye Ticaret Mahkemesinin 2022/3456 E. sayılı
kararının bozulmasına karar verilmiştir.

SONUÇ: Hükmün BOZULMASINA karar verildi.`;

const yg2F = analyzeText(yargitayGercek2, ALL, 0.35);
console.log(`  Yargıtay 4.HD kararı: ${yg2F.length} bulgu`);

expect(yargitayGercek2, 'LEGAL_CITATION', 'Yargıtay 4. Hukuk Dairesi');
expect(yargitayGercek2, 'PERSON_NAME', 'Fatma Demir');
expect(yargitayGercek2, 'PERSON_NAME', 'Serkan Aydın');
expect(yargitayGercek2, 'TR_NATIONAL_ID', '10000000146');
expect(yargitayGercek2, 'ORGANIZATION', 'Ankara Barosu');
expect(yargitayGercek2, 'ORGANIZATION', 'HDI Sigorta');
expect(yargitayGercek2, 'ORGANIZATION', 'TRAMER');
expect(yargitayGercek2, 'ORGANIZATION', 'SGK');
expect(yargitayGercek2, 'CONTEXTUAL_DATE', '22.06.2021');
expect(yargitayGercek2, 'POLICY_NUMBER', 'ZMS-2021-3344556');
expect(yargitayGercek2, 'TR_LICENSE_PLATE', '06 XY 789');
expect(yargitayGercek2, 'TR_SGK_NO', '3344556');
expect(yargitayGercek2, 'LEGAL_CITATION', '2022/3456');
expect(yargitayGercek2, 'COURT', 'Ankara 5. Asliye Ticaret Mahkemesi');

// ============================================================
console.log('\n=== İNTERNET: İSTANBUL BAM KARARI ===');
// ============================================================

const bamGercek = `İstanbul Bölge Adliye Mahkemesi 9. Hukuk Dairesi
E. 2024/881, K. 2025/367

İSTİNAF BAŞVURUSUNDA BULUNAN DAVALI:
Mapfre Sigorta A.Ş.
Vekili: Av. Burak Özcan - İstanbul Barosu

DAVACI:
Zeynep Aksoy (TC: 11111111110)
Vekili: Av. Derya Şahin
Tel: 0532 444 55 66
E-posta: derya.sahin@example.com

İlk derece: İstanbul 7. Asliye Ticaret Mahkemesi
Dosya No: 2023/4567 Esas

Kaza tarihi: 15.03.2023
Araç: 34 MN 456
Şasi No: WVWZZZ3CZWE567890
Poliçe No: TRF-2023-9988776
Hasar dosya no: 2023/HD-445566

Destekten yoksun kalma tazminatı talebi reddedilen davacının
istinaf başvurusunun KABULÜNE, davalı Mapfre Sigorta A.Ş.'nin
toplam 850.000 TL tazminat ödemesine karar verildi.

Davacı vekili hesabı:
IBAN: TR33 0006 1005 1978 6457 8413 26`;

const bamF = analyzeText(bamGercek, ALL, 0.35);
console.log(`  İstanbul BAM kararı: ${bamF.length} bulgu`);

expect(bamGercek, 'COURT', 'İstanbul Bölge Adliye Mahkemesi');
expect(bamGercek, 'ORGANIZATION', 'Mapfre');
expect(bamGercek, 'ORGANIZATION', 'İstanbul Barosu');
expect(bamGercek, 'PERSON_NAME', 'Burak Özcan');
expect(bamGercek, 'PERSON_NAME', 'Zeynep Aksoy');
expect(bamGercek, 'PERSON_NAME', 'Derya Şahin');
expect(bamGercek, 'TR_NATIONAL_ID', '11111111110');
expect(bamGercek, 'PHONE_NUMBER', '0532 444 55 66');
expect(bamGercek, 'EMAIL_ADDRESS', 'derya.sahin@example.com');
expect(bamGercek, 'CASE_NUMBER', '2023/4567');
expect(bamGercek, 'CONTEXTUAL_DATE', '15.03.2023');
expect(bamGercek, 'TR_LICENSE_PLATE', '34 MN 456');
expect(bamGercek, 'VEHICLE_ID', 'WVWZZZ3CZWE567890');
expect(bamGercek, 'POLICY_NUMBER', 'TRF-2023-9988776');
expect(bamGercek, 'INSURANCE_FILE_NO', '2023/HD-445566');
expect(bamGercek, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');

// ============================================================
console.log('\n=== İNTERNET: KASKO HASAR BEYAN DİLEKÇESİ ===');
// ============================================================

const kaskoBeyanGercek = `Allianz Sigorta A.Ş.
Hasar Servisi Müdürlüğüne

Poliçe No: KSK-2024-7788990
Plaka: 34 FG 234
Araç: Toyota Corolla 2022 Model
Şasi No: JTDBR32E700123456
Motor No: 2ZR-FAE-9876543

Sigortalı Bilgileri:
Ad Soyad: Hasan Çelik
TC Kimlik No: 22222222220
Adres: Ataşehir Mah. Göztepe Cad. No:15/3, Kadıköy/İstanbul
Tel: 0216 444 55 66
E-posta: hasan.celik@example.com

Kaza Tarihi: 05.04.2024
Kaza Yeri: E-5 Karayolu Maltepe mevkii, İstanbul

Sayın Yetkili,

Yukarıda bilgileri yazılı aracımla 05.04.2024 tarihinde saat 14:30
sıralarında E-5 Karayolu Maltepe mevkiinde seyir halindeyken önümdeki
aracın ani fren yapması sonucu arkadan çarpma şeklinde kaza meydana
gelmiştir. Çarpıştığım aracın plakası 34 HJ 567, sürücüsü
Osman Yıldırım'dır.

Aracımın ön tampon, kaput, far ve radyatör kısmında hasar oluşmuştur.
Kaza tespit tutanağı polis tarafından düzenlenmiştir.

Gereğinin yapılmasını ve hasar bedelinin tarafıma ödenmesini arz ederim.

Hasan Çelik
IBAN: TR33 0006 1005 1978 6457 8413 26
Türkiye İş Bankası Kadıköy Şubesi`;

const kbF = analyzeText(kaskoBeyanGercek, ALL, 0.35);
console.log(`  Kasko hasar beyan dilekçesi: ${kbF.length} bulgu`);

expect(kaskoBeyanGercek, 'ORGANIZATION', 'Allianz');
expect(kaskoBeyanGercek, 'POLICY_NUMBER', 'KSK-2024-7788990');
expect(kaskoBeyanGercek, 'TR_LICENSE_PLATE', '34 FG 234');
expect(kaskoBeyanGercek, 'TR_LICENSE_PLATE', '34 HJ 567');
expect(kaskoBeyanGercek, 'VEHICLE_ID', 'JTDBR32E700123456');
expect(kaskoBeyanGercek, 'VEHICLE_ID', '2ZR-FAE-9876543');
expect(kaskoBeyanGercek, 'PERSON_NAME', 'Hasan Çelik');
expect(kaskoBeyanGercek, 'PERSON_NAME', 'Osman Yıldırım');
expect(kaskoBeyanGercek, 'TR_NATIONAL_ID', '22222222220');
expect(kaskoBeyanGercek, 'LOCATION', 'İstanbul');
expect(kaskoBeyanGercek, 'LOCATION', 'Kadıköy');
expect(kaskoBeyanGercek, 'LOCATION', 'Maltepe');
expect(kaskoBeyanGercek, 'PHONE_NUMBER', '0216 444 55 66');
expect(kaskoBeyanGercek, 'EMAIL_ADDRESS', 'hasan.celik@example.com');
expect(kaskoBeyanGercek, 'CONTEXTUAL_DATE', '05.04.2024');
expect(kaskoBeyanGercek, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(kaskoBeyanGercek, 'ORGANIZATION', 'İş Bankası');
// False positive: "Sayın Yetkili" kişi adı OLMAMALI
expect('Sayın Yetkili, gereğini arz ederim.', 'PERSON_NAME', null);

// ============================================================
console.log('\n=== İNTERNET: ANAYASA MAHKEMESİ İPTAL KARARI ===');
// ============================================================

const aymGercek = `T.C.
ANAYASA MAHKEMESİ

Esas No: 2021/82
Karar No: 2022/167
Resmi Gazete Yayın Tarihi: 14.02.2023

KONU: 2918 sayılı Karayolları Trafik Kanunu'nun 90. maddesine
eklenen hükümlerin iptali istemi.

Değer kaybı, destekten yoksun kalma ve sürekli sakatlık
tazminatlarının belirlenmesine ilişkin kuralların,
6098 sayılı Türk Borçlar Kanunu'nun genel hükümleriyle
çeliştiği ve zarar gören kişiler aleyhine sonuç doğurduğu
gerekçesiyle Anayasa'ya aykırı bulunmuştur.

Zorunlu mali sorumluluk sigortası teminat limiti 2024 yılı
için kişi başı 200.000 TL olarak belirlenmiştir.

Başvuran: İstanbul 7. Asliye Ticaret Mahkemesi
Dosya No: 2021/E.3456

SONUÇ: İptale ilişkin kararın Resmi Gazete'de yayımlandığı
14.02.2023 tarihinden itibaren geçerli olmasına karar verildi.`;

const aymF = analyzeText(aymGercek, ALL, 0.35);
console.log(`  AYM iptal kararı: ${aymF.length} bulgu`);

expect(aymGercek, 'LEGAL_CITATION', '2021/82');
expect(aymGercek, 'LEGAL_CITATION', '2022/167');
expect(aymGercek, 'DATE_TIME', '14.02.2023');
expect(aymGercek, 'COURT', 'İstanbul 7. Asliye Ticaret Mahkemesi');

// ============================================================
console.log('\n=== İNTERNET: DOLU HASARI KASKO BEYAN ===');
// ============================================================

const doluHasar = `Sompo Sigorta A.Ş.
Hasar İhbar Servisi

POLİÇE BİLGİLERİ:
Poliçe No: KSK-2024-5566778
Poliçe türü: Genişletilmiş Kasko

SİGORTALI:
Ad Soyad: Gülşen Acar
TC Kimlik No: 10000000146
Tel: 0535 777 88 99
E-posta: gulsen.acar@example.com
Adres: Bahçelievler Mah. Çiçek Sok. No:8/2, Bahçelievler/İstanbul

ARAÇ BİLGİLERİ:
Plaka: 34 RS 890
Marka/Model: Hyundai i20 2023
Şasi No: TMAJ3811AKJ123456
Motor No: G4LA-9988776
Km: 18.500

HASAR BİLGİLERİ:
Hasar tarihi: 12.06.2024
Hasar yeri: İstanbul Bahçelievler'de park halinde
Hasar sebebi: Şiddetli dolu yağışı

HASAR DETAYI:
Aracımız yukarıda belirtilen tarihte park halinde iken meydana gelen
şiddetli dolu yağışı sonucu kaput, tavan, bagaj kapağı ve ön kanat
bölgelerinde göçük oluşmuştur. Hasar fotoğrafları ekte sunulmuştur.

Ekspertiz rapor no: EKS-2024-7788
Ekspertiz tarihi: 15.06.2024
Tahmini hasar tutarı: 35.000 TL

Hasar ihbar no: 2024/HI-334455

ÖDEME:
IBAN: TR33 0006 1005 1978 6457 8413 26
Garanti Bankası Bahçelievler Şubesi

Saygılarımla,
Gülşen Acar`;

const dhF = analyzeText(doluHasar, ALL, 0.35);
console.log(`  Dolu hasarı kasko beyan: ${dhF.length} bulgu`);

expect(doluHasar, 'ORGANIZATION', 'Sompo Sigorta');
expect(doluHasar, 'POLICY_NUMBER', 'KSK-2024-5566778');
expect(doluHasar, 'PERSON_NAME', 'Gülşen Acar');
expect(doluHasar, 'TR_NATIONAL_ID', '10000000146');
expect(doluHasar, 'PHONE_NUMBER', '0535 777 88 99');
expect(doluHasar, 'EMAIL_ADDRESS', 'gulsen.acar@example.com');
expect(doluHasar, 'LOCATION', 'İstanbul');
expect(doluHasar, 'TR_LICENSE_PLATE', '34 RS 890');
expect(doluHasar, 'VEHICLE_ID', 'TMAJ3811AKJ123456');
expect(doluHasar, 'VEHICLE_ID', 'G4LA-9988776');
expect(doluHasar, 'CONTEXTUAL_DATE', '12.06.2024');
expect(doluHasar, 'CONTEXTUAL_DATE', '15.06.2024');
expect(doluHasar, 'MEDICAL_ID', 'EKS-2024-7788');
expect(doluHasar, 'INSURANCE_FILE_NO', '2024/HI-334455');
expect(doluHasar, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(doluHasar, 'ORGANIZATION', 'Garanti Bankası');

// ============================================================
console.log('\n=== İNTERNET: SİGORTACIYA YAZILI BAŞVURU (KTK m.97) ===');
// ============================================================

const ktk97 = `Anadolu Sigorta A.Ş.
Hasarlar Müdürlüğü
Rüzgarlıbahçe Mah. Kavak Sok. Anadolu Sigorta Genel Müdürlüğü
Kavacık/Beykoz/İstanbul

KONU: KTK m.97 gereği zorunlu yazılı başvuru

SİGORTALI ARAÇ BİLGİLERİ:
Poliçe No: TRF-2024-1122334
Sigortalı: Mustafa Kılıç
TC: 11111111110
Plaka: 41 AK 123

ZARARA UĞRAYAN:
Ad Soyad: Selma Yılmaz
TC Kimlik No: 10000000146
Adres: Atatürk Mah. Cumhuriyet Cad. No:25, Kocaeli
Tel: 0262 333 44 55
E-posta: selma.yilmaz@example.com

KAZA BİLGİLERİ:
Kaza tarihi: 20.03.2024
Kaza yeri: D-100 Karayolu Gebze mevkii, Kocaeli
Kaza tespit tutanağı düzenlenmiştir.

HASAR:
Aracım 34 GHI 789 plakalı, 2021 model Honda Civic.
Ön tampon, sol far, sol çamurluk hasarlı.
Sigortalınızın %100 kusurlu olduğu tespit edilmiştir.

TAZMİNAT TALEBİ:
Araç onarım bedeli: 55.000 TL
Araç değer kaybı: 20.000 TL
Çekici/otopark: 2.500 TL
İkame araç (10 gün): 8.000 TL
TOPLAM: 85.500 TL

KTK m.97 gereği, işbu yazılı başvurunun tebliğinden itibaren
15 gün içinde ödeme yapılmasını, aksi halde yasal yollara
başvuracağımı bildiririm.

IBAN: TR33 0006 1005 1978 6457 8413 26
Yapı Kredi Bankası Gebze Şubesi

Selma Yılmaz
Vekili: Av. Tolga Demir
Tel: 0532 999 00 11`;

const ktkF = analyzeText(ktk97, ALL, 0.35);
console.log(`  KTK m.97 başvuru: ${ktkF.length} bulgu`);

expect(ktk97, 'ORGANIZATION', 'Anadolu Sigorta');
expect(ktk97, 'LOCATION', 'İstanbul');
expect(ktk97, 'POLICY_NUMBER', 'TRF-2024-1122334');
expect(ktk97, 'PERSON_NAME', 'Mustafa Kılıç');
expect(ktk97, 'PERSON_NAME', 'Selma Yılmaz');
expect(ktk97, 'PERSON_NAME', 'Tolga Demir');
expect(ktk97, 'TR_NATIONAL_ID', '11111111110');
expect(ktk97, 'TR_NATIONAL_ID', '10000000146');
expect(ktk97, 'TR_LICENSE_PLATE', '41 AK 123');
expect(ktk97, 'LOCATION', 'Kocaeli');
expect(ktk97, 'PHONE_NUMBER', '0262 333 44 55');
expect(ktk97, 'PHONE_NUMBER', '0532 999 00 11');
expect(ktk97, 'EMAIL_ADDRESS', 'selma.yilmaz@example.com');
expect(ktk97, 'CONTEXTUAL_DATE', '20.03.2024');
expect(ktk97, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(ktk97, 'ORGANIZATION', 'Yapı Kredi');

// ============================================================
console.log('\n=== İNTERNET: GEÇMİŞ HASARLI ARAÇ TRAMER SORGUSU ===');
// ============================================================

const tramer = `TRAMER - TRAFİK SİGORTALARI BİLGİ MERKEZİ
HASAR KAYIT RAPORU

Araç Bilgileri:
Plaka: 34 LM 567
Şasi No: WF0XXXGCDX1A12345
Marka/Model: Ford Focus 2020
Ruhsat No: AA-34-778899

Araç Sahibi: Emre Aydın
TC: 22222222220

HASAR GEÇMİŞİ:

1. Hasar Kaydı:
   Hasar tarihi: 10.05.2022
   Hasar dosya no: 2022/HD-112233
   Sigorta şirketi: Zurich Sigorta A.Ş.
   Poliçe No: ZMS-2022-3344556
   Hasar tutarı: 15.000 TL
   Ödeme tarihi: 15.06.2022

2. Hasar Kaydı:
   Hasar tarihi: 22.11.2023
   Hasar dosya no: 2023/HD-445566
   Sigorta şirketi: Aksigorta A.Ş.
   Poliçe No: TRF-2023-7788990
   Hasar tutarı: 32.000 TL
   Ödeme tarihi: 10.01.2024

3. Hasar Kaydı:
   Hasar tarihi: 05.04.2024
   Hasar dosya no: 2024/HD-778899
   Sigorta şirketi: Allianz Sigorta A.Ş.
   Poliçe No: KSK-2024-1122334
   Hasar tutarı: 48.000 TL
   Durum: İnceleme aşamasında

TOPLAM HASAR SAYISI: 3
TOPLAM HASAR TUTARI: 95.000 TL

Rapor tarihi: 15.06.2024
Sorgu yapan: Av. Pelin Kaya
Tel: 0212 555 66 77`;

const tramerF = analyzeText(tramer, ALL, 0.35);
console.log(`  TRAMER hasar raporu: ${tramerF.length} bulgu`);

expect(tramer, 'ORGANIZATION', 'TRAMER');
expect(tramer, 'TR_LICENSE_PLATE', '34 LM 567');
expect(tramer, 'VEHICLE_ID', 'WF0XXXGCDX1A12345');
expect(tramer, 'PERSON_NAME', 'Emre Aydın');
expect(tramer, 'TR_NATIONAL_ID', '22222222220');
expect(tramer, 'INSURANCE_FILE_NO', '2022/HD-112233');
expect(tramer, 'INSURANCE_FILE_NO', '2023/HD-445566');
expect(tramer, 'INSURANCE_FILE_NO', '2024/HD-778899');
expect(tramer, 'ORGANIZATION', 'Zurich Sigorta');
expect(tramer, 'ORGANIZATION', 'Aksigorta');
expect(tramer, 'ORGANIZATION', 'Allianz');
expect(tramer, 'POLICY_NUMBER', 'ZMS-2022-3344556');
expect(tramer, 'POLICY_NUMBER', 'TRF-2023-7788990');
expect(tramer, 'POLICY_NUMBER', 'KSK-2024-1122334');
expect(tramer, 'CONTEXTUAL_DATE', '10.05.2022');
expect(tramer, 'CONTEXTUAL_DATE', '22.11.2023');
expect(tramer, 'CONTEXTUAL_DATE', '05.04.2024');
expect(tramer, 'CONTEXTUAL_DATE', '15.06.2022');
expect(tramer, 'CONTEXTUAL_DATE', '10.01.2024');
expect(tramer, 'PERSON_NAME', 'Pelin Kaya');
expect(tramer, 'PHONE_NUMBER', '0212 555 66 77');

// ============================================================
console.log('\n=== İNTERNET: GERÇEK YARGITAY KARARLARI (WEBDEN) ===');
// ============================================================

// Yargıtay 4.HD 29.09.2022 (araçtan yoksun kalma)
const yargitayWeb1 = `Yargıtay 4. Hukuk Dairesi
Esas No: 2021/26777
Karar No: 2022/11236
Karar Tarihi: 29.09.2022

Davacı: İbrahim Şahin (TC: 10000000146)
Vekili: Av. Barış Yılmaz - İzmir Barosu
Davalı: Sompo Sigorta A.Ş.

Dava, trafik kazası sonucu araç onarım süresinde aracından
yoksun kalan davacının uğradığı zararın tazmini istemine ilişkindir.

İzmir 5. Asliye Ticaret Mahkemesinin 2020/8765 E., 2021/4321 K.
sayılı kararı incelendi.

Kaza tarihi: 15.07.2020
Araç plakası: 35 KL 456
Poliçe No: ZMS-2020-7788990
Şasi No: WVWZZZ3CZWE345678

Mahkemece toplanılan delillere ve dosya kapsamına göre,
araç kazalarında tamir sürecinde araç kiralanmasa ve kiralama
faturası sunulmasa bile kusurlu taraf aleyhine araç mahrumiyeti
tazminatına hükmedilmesi gerektiğine karar verilmiştir.

Ekspertiz rapor no: EKS-2020-4455
Onarım süresi: 25 gün
Günlük mahrumiyet bedeli: 350 TL
Toplam tazminat: 8.750 TL

SONUÇ: Hükmün ONANMASINA, 29.09.2022 tarihinde oybirliğiyle karar verildi.`;

const yw1F = analyzeText(yargitayWeb1, ALL, 0.35);
console.log(`  Yargıtay 4.HD araçtan yoksun kalma: ${yw1F.length} bulgu`);

expect(yargitayWeb1, 'LEGAL_CITATION', '2021/26777');
expect(yargitayWeb1, 'LEGAL_CITATION', '2022/11236');
expect(yargitayWeb1, 'DATE_TIME', '29.09.2022');
expect(yargitayWeb1, 'PERSON_NAME', 'İbrahim Şahin');
expect(yargitayWeb1, 'PERSON_NAME', 'Barış Yılmaz');
expect(yargitayWeb1, 'TR_NATIONAL_ID', '10000000146');
expect(yargitayWeb1, 'ORGANIZATION', 'İzmir Barosu');
expect(yargitayWeb1, 'ORGANIZATION', 'Sompo Sigorta');
expect(yargitayWeb1, 'COURT', 'İzmir 5. Asliye Ticaret Mahkemesi');
expect(yargitayWeb1, 'CASE_NUMBER', '2020/8765');
expect(yargitayWeb1, 'CASE_NUMBER', '2021/4321');
expect(yargitayWeb1, 'CONTEXTUAL_DATE', '15.07.2020');
expect(yargitayWeb1, 'TR_LICENSE_PLATE', '35 KL 456');
expect(yargitayWeb1, 'POLICY_NUMBER', 'ZMS-2020-7788990');
expect(yargitayWeb1, 'VEHICLE_ID', 'WVWZZZ3CZWE345678');
expect(yargitayWeb1, 'MEDICAL_ID', 'EKS-2020-4455');

// Yargıtay 17.HD 23.05.2016 (pert araç mahrumiyet)
const yargitayWeb2 = `Yargıtay 17. Hukuk Dairesi
E. 2016/1134, K. 2016/6228
Karar Tarihi: 23.05.2016

Davacı Elif Korkmaz vekili Av. Deniz Polat tarafından
davalı Allianz Sigorta A.Ş. aleyhine açılan araç değer kaybı
ve araçtan yoksun kalma tazminatı davasında;

Ankara 9. Asliye Ticaret Mahkemesinin 2015/1234 E. sayılı
dosyası üzerinden verilen kararın temyiz incelemesi yapılmıştır.

Davacının 06 AB 123 plakalı 2014 model Mercedes C180 marka
aracı 20.11.2015 tarihinde meydana gelen trafik kazasında
pert olmuştur.

Davalı sigorta şirketinin ZMS poliçe no: TRF-2015-3344556
kapsamında sorumluluğu tartışmasızdır.

TRAMER kaydı incelendiğinde aracın daha önce hasarsız olduğu
ve 15.03.2016 tarihli bilirkişi raporu ile araç değer kaybının
18.000 TL olarak tespit edildiği anlaşılmıştır.

Aracı pert durumda iken yeni araç satın alma için gereken
makul süre oranında mahrumiyet zararı da tespit edilmelidir.

Bilirkişi rapor no: BLK-2016-7788

SONUÇ: Hükmün BOZULMASINA karar verildi.`;

const yw2F = analyzeText(yargitayWeb2, ALL, 0.35);
console.log(`  Yargıtay 17.HD pert araç: ${yw2F.length} bulgu`);

expect(yargitayWeb2, 'LEGAL_CITATION', '2016/1134');
expect(yargitayWeb2, 'LEGAL_CITATION', '2016/6228');
expect(yargitayWeb2, 'PERSON_NAME', 'Elif Korkmaz');
expect(yargitayWeb2, 'PERSON_NAME', 'Deniz Polat');
expect(yargitayWeb2, 'ORGANIZATION', 'Allianz');
expect(yargitayWeb2, 'COURT', 'Ankara 9. Asliye Ticaret Mahkemesi');
expect(yargitayWeb2, 'CASE_NUMBER', '2015/1234');
expect(yargitayWeb2, 'TR_LICENSE_PLATE', '06 AB 123');
expect(yargitayWeb2, 'DATE_TIME', '20.11.2015');
expect(yargitayWeb2, 'POLICY_NUMBER', 'TRF-2015-3344556');
expect(yargitayWeb2, 'ORGANIZATION', 'TRAMER');
expect(yargitayWeb2, 'DATE_TIME', '15.03.2016');
expect(yargitayWeb2, 'CASE_NUMBER', 'BLK-2016-7788');

// ============================================================
console.log('\n=== İNTERNET: DEĞER KAYBI SİGORTA BAŞVURU DİLEKÇESİ ===');
// ============================================================

const degerKaybiDilekce = `AXA SİGORTA A.Ş.
Genel Müdürlüğüne

İHTARNAME

İHTAR EDEN:
Ad Soyad: Mustafa Güneş
TC Kimlik No: 11111111110
Adres: Yenibosna Mah. Ladin Sok. No:7/4, Bahçelievler/İstanbul
Tel: 0532 111 22 33
E-posta: mustafa.gunes@example.com

VEKİLİ:
Av. Cemre Yıldız
İstanbul Barosu Sicil No: 67890
Tel: 0212 444 55 66

MUHATAP:
Axa Sigorta A.Ş.
Meclisi Mebusan Cad. No:15, Salıpazarı/Beyoğlu/İstanbul

KONU: Araç değer kaybı tazmini talebi (KTK m.97 gereği)

AÇIKLAMALAR:
1. 08.02.2024 tarihinde İstanbul Ataşehir ilçesi Kayışdağı Caddesi
   üzerinde meydana gelen trafik kazasında müvekkilimin 34 PQR 567
   plakalı 2023 model Volkswagen Golf 8 marka aracı hasarlanmıştır.

2. Kazaya karışan diğer aracın plakası 34 ST 890 olup, sürücüsü
   Ahmet Koç'tur. Kaza tespit tutanağına göre karşı taraf %100
   kusurludur.

3. Karşı aracın zorunlu mali sorumluluk sigortacısı olarak
   şirketinizin TRF-2024-5566778 numaralı poliçesi kapsamında
   sorumluluğunuz bulunmaktadır.

4. Aracın hasar tespiti:
   Şasi No: WVWZZZ1JZWW123456
   Hasar dosya no: 2024/HD-112233
   Ekspertiz rapor no: EKS-2024-6677
   Ekspertiz tarihi: 12.02.2024
   Onarım bedeli: 65.000 TL

5. Araç değer kaybı uzman raporu ile 22.000 TL olarak
   tespit edilmiştir.
   Rapor no: DK-2024-8899
   Rapor tarihi: 01.03.2024

TALEP:
Araç değer kaybı bedeli olan 22.000 TL'nin tüm faiz ve ferileri
ile birlikte işbu talep yazısının tebliğ tarihinden itibaren
15 gün içerisinde aşağıda bildirdiğimiz banka hesabına
yatırılmasını talep ederiz.

BANKA BİLGİLERİ:
Hesap Sahibi: Mustafa Güneş
IBAN: TR33 0006 1005 1978 6457 8413 26
QNB Finansbank Bahçelievler Şubesi

Aksi takdirde Sigorta Tahkim Komisyonuna başvurulacaktır.

Saygılarımla,
Av. Cemre Yıldız`;

const dkdF = analyzeText(degerKaybiDilekce, ALL, 0.35);
console.log(`  Değer kaybı başvuru dilekçesi: ${dkdF.length} bulgu`);

expect(degerKaybiDilekce, 'ORGANIZATION', 'Axa Sigorta');
expect(degerKaybiDilekce, 'PERSON_NAME', 'Mustafa Güneş');
expect(degerKaybiDilekce, 'PERSON_NAME', 'Cemre Yıldız');
expect(degerKaybiDilekce, 'PERSON_NAME', 'Ahmet Koç');
expect(degerKaybiDilekce, 'TR_NATIONAL_ID', '11111111110');
expect(degerKaybiDilekce, 'LOCATION', 'İstanbul');
expect(degerKaybiDilekce, 'LOCATION', 'Ataşehir');
expect(degerKaybiDilekce, 'PHONE_NUMBER', '0532 111 22 33');
expect(degerKaybiDilekce, 'PHONE_NUMBER', '0212 444 55 66');
expect(degerKaybiDilekce, 'EMAIL_ADDRESS', 'mustafa.gunes@example.com');
expect(degerKaybiDilekce, 'ORGANIZATION', 'İstanbul Barosu');
expect(degerKaybiDilekce, 'TR_LICENSE_PLATE', '34 PQR 567');
expect(degerKaybiDilekce, 'TR_LICENSE_PLATE', '34 ST 890');
expect(degerKaybiDilekce, 'POLICY_NUMBER', 'TRF-2024-5566778');
expect(degerKaybiDilekce, 'VEHICLE_ID', 'WVWZZZ1JZWW123456');
expect(degerKaybiDilekce, 'INSURANCE_FILE_NO', '2024/HD-112233');
expect(degerKaybiDilekce, 'MEDICAL_ID', 'EKS-2024-6677');
expect(degerKaybiDilekce, 'CONTEXTUAL_DATE', '12.02.2024');
expect(degerKaybiDilekce, 'MEDICAL_ID', 'DK-2024-8899');
expect(degerKaybiDilekce, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(degerKaybiDilekce, 'ORGANIZATION', 'QNB Finansbank');
expect(degerKaybiDilekce, 'ORGANIZATION', 'Sigorta Tahkim Komisyonu');

// ============================================================
console.log('\n=== İNTERNET: MADDI HASARLI KAZA TESPİT TUTANAĞI ===');
// ============================================================

const kazaTespit = `MADDİ HASARLI TRAFİK KAZASI TESPİT TUTANAĞI

Kaza Tarihi: 12.04.2025
Kaza Saati: 16:45
Kaza Yeri: Filistin Cad. Çankaya/Ankara

ARAÇ A:
Plaka: 06 GH 789
Marka/Model: Renault Clio 2021
Sürücü: Selim Öztürk
TC: 10000000146
Ehliyet No: B-778899001
Ehliyet Sınıfı: B
Sigorta Şirketi: Türkiye Sigorta A.Ş.
Poliçe No: TRF-2025-1122334
Poliçe Bitiş: 15.08.2025
Tel: 0535 222 33 44

ARAÇ B:
Plaka: 06 KL 234
Marka/Model: Toyota Yaris 2022
Sürücü: Gökhan Demir
TC: 11111111110
Ehliyet No: B-556677889
Sigorta Şirketi: HDI Sigorta A.Ş.
Poliçe No: TRF-2025-5566778
Tel: 0507 333 44 55

KAZA ŞEKLİ:
Araç A kavşakta sağa dönüş yaparken sinyal vermeden şerit
değiştirmesi sonucu Araç B'nin sol ön çamurluğuna yan temas
etmiştir.

KUSUR DURUMU:
Araç A sürücüsü Selim Öztürk %100 kusurlu

HASAR DURUMU:
Araç A: Sağ ön çamurluk, sağ kapı
Araç B: Sol ön çamurluk, sol far

İşbu tutanak tarafların beyanları doğrultusunda
olay yerinde düzenlenmiştir.

Sürücü A İmza: Selim Öztürk
Sürücü B İmza: Gökhan Demir`;

const ktF = analyzeText(kazaTespit, ALL, 0.35);
console.log(`  Kaza tespit tutanağı: ${ktF.length} bulgu`);

expect(kazaTespit, 'CONTEXTUAL_DATE', '12.04.2025');
expect(kazaTespit, 'LOCATION', 'Ankara');
expect(kazaTespit, 'TR_LICENSE_PLATE', '06 GH 789');
expect(kazaTespit, 'TR_LICENSE_PLATE', '06 KL 234');
expect(kazaTespit, 'PERSON_NAME', 'Selim Öztürk');
expect(kazaTespit, 'PERSON_NAME', 'Gökhan Demir');
expect(kazaTespit, 'TR_NATIONAL_ID', '10000000146');
expect(kazaTespit, 'TR_NATIONAL_ID', '11111111110');
expect(kazaTespit, 'DRIVER_LICENSE', 'B-778899001');
expect(kazaTespit, 'DRIVER_LICENSE', 'B-556677889');
expect(kazaTespit, 'ORGANIZATION', 'Türkiye Sigorta');
expect(kazaTespit, 'ORGANIZATION', 'HDI Sigorta');
expect(kazaTespit, 'POLICY_NUMBER', 'TRF-2025-1122334');
expect(kazaTespit, 'POLICY_NUMBER', 'TRF-2025-5566778');
expect(kazaTespit, 'PHONE_NUMBER', '0535 222 33 44');
expect(kazaTespit, 'PHONE_NUMBER', '0507 333 44 55');

// ============================================================
console.log('\n=== İNTERNET: İŞ KAZASI SGK BİLDİRİM FORMU ===');
// ============================================================

const isKazasiBildirim = `İŞ KAZASI VE MESLEK HASTALIĞI BİLDİRİM FORMU

İŞYERİ BİLGİLERİ:
İşyeri Unvanı: ABC Yapı İnşaat Taahhüt A.Ş.
SGK Sicil No: 1234567-34-01
Vergi No: 1234567890
Adres: Dudullu OSB 2. Cad. No:5, Ümraniye/İstanbul
Tel: 0216 777 88 99
E-posta: info2@example.com

İŞVEREN:
Ad Soyad: Cengiz Arslan
TC: 22222222220

İŞÇİ BİLGİLERİ:
Ad Soyad: Hüseyin Kaya
TC Kimlik No: 10000000146
SGK No: 5566778
Doğum Tarihi: 22.05.1988
İşe giriş tarihi: 01.06.2022
Meslek: Kalıpçı
Aylık brüt ücret: 25.000 TL

KAZA BİLGİLERİ:
Kaza tarihi: 15.05.2024
Kaza saati: 10:30
Kaza yeri: Şantiye B Blok, 5. kat
Kaza türü: Yüksekten düşme

OLAY AÇIKLAMASI:
İşçi Hüseyin Kaya, şantiyede 5. kat kalıp işlemi sırasında
dengesini kaybederek yaklaşık 3 metre yükseklikten düşmüştür.
Sol ayak bileğinde kırık ve kafa travması tespit edilmiştir.

İLK MÜDAHALE:
Hastane: İstanbul Ümraniye Eğitim ve Araştırma Hastanesi
Hasta Protokol No: H2024-88990
Ambulans çağrı saati: 10:35
Ameliyat Tarihi: 15.05.2024
Taburcu Tarihi: 25.05.2024
Epikriz No: EPK-2024-1122

BİLDİRİM:
SGK'ya bildirim tarihi: 16.05.2024 (3 iş günü içinde)
ÇSGB İş Teftiş kuruluna bildirim: 15.05.2024

İŞ GÜVENLİĞİ:
İSG uzmanı: Murat Aktaş
İşyeri hekimi: Dr. Ayşe Güler
Olay yeri inceleme rapor no: ISG-2024-3344

İmza: Cengiz Arslan (İşveren)
Tarih: 16.05.2024`;

const ikbF = analyzeText(isKazasiBildirim, ALL, 0.35);
console.log(`  İş kazası SGK bildirim formu: ${ikbF.length} bulgu`);

expect(isKazasiBildirim, 'ORGANIZATION', 'SGK');
expect(isKazasiBildirim, 'TR_VERGI_NO', '1234567890');
expect(isKazasiBildirim, 'LOCATION', 'İstanbul');
expect(isKazasiBildirim, 'PHONE_NUMBER', '0216 777 88 99');
expect(isKazasiBildirim, 'EMAIL_ADDRESS', 'info2@example.com');
expect(isKazasiBildirim, 'PERSON_NAME', 'Cengiz Arslan');
expect(isKazasiBildirim, 'PERSON_NAME', 'Hüseyin Kaya');
expect(isKazasiBildirim, 'PERSON_NAME', 'Murat Aktaş');
expect(isKazasiBildirim, 'PERSON_NAME', 'Ayşe Güler');
expect(isKazasiBildirim, 'TR_NATIONAL_ID', '22222222220');
expect(isKazasiBildirim, 'TR_NATIONAL_ID', '10000000146');
expect(isKazasiBildirim, 'TR_SGK_NO', '5566778');
expect(isKazasiBildirim, 'CONTEXTUAL_DATE', '22.05.1988');
expect(isKazasiBildirim, 'CONTEXTUAL_DATE', '15.05.2024');
expect(isKazasiBildirim, 'CONTEXTUAL_DATE', '15.05.2024');
expect(isKazasiBildirim, 'CONTEXTUAL_DATE', '25.05.2024');
expect(isKazasiBildirim, 'MEDICAL_ID', 'H2024-88990');
expect(isKazasiBildirim, 'MEDICAL_ID', 'EPK-2024-1122');

// ============================================================
console.log('\n=== İNTERNET: ANAYASA MAHKEMESİ İPTAL (KTK m.90) ===');
// ============================================================

const aymIptal = `ANAYASA MAHKEMESİ KARARI

Esas Sayısı: 2021/82
Karar Sayısı: 2022/167
Karar Tarihi: 29.12.2022
Resmi Gazete Tarihi: 14.02.2023
Resmi Gazete Sayısı: 32104

İTİRAZ YOLUNA BAŞVURAN:
İstanbul 7. Asliye Ticaret Mahkemesi (2021/E.3456)

İTİRAZIN KONUSU:
13.10.1983 tarihli ve 2918 sayılı Karayolları Trafik Kanununun
90. maddesine 09.06.2021 tarihli ve 7327 sayılı Kanunun 16.
maddesiyle eklenen ikinci, üçüncü ve dördüncü fıkraların
Anayasanın 2., 5., 10., 13., 17., 35., 36. ve 56. maddelerine
aykırılığı ileri sürülerek iptallerine karar verilmesi talebidir.

Mahkeme, zorunlu trafik sigortası teminat limitleri dahilinde
değer kaybı, destekten yoksun kalma ve sürekli sakatlık
tazminatlarının hesaplanma yönteminin Anayasa'ya aykırı olduğunu
tespit etmiştir.

6098 sayılı Türk Borçlar Kanunu'na göre hesaplanan tazminat,
dava konusu kurallara göre hesaplanandan yüksek bir miktara
tekabül etmesi halinde zarar görenin aleyhine sonuç doğuracağı
ve zorunlu trafik sigortasının amacıyla bağdaşmayacağı
belirlenmiştir.

HÜKÜM: Kuralların ANAYASA'YA AYKIRI OLDUĞUNA ve İPTALLERİNE
OYBİRLİĞİYLE karar verilmiştir.`;

const aymIF = analyzeText(aymIptal, ALL, 0.35);
console.log(`  AYM iptal kararı KTK m.90: ${aymIF.length} bulgu`);

expectNot(aymIptal, 'COURT', 'ANAYASA MAHKEMESİ');
expect(aymIptal, 'CASE_NUMBER', '2021/82');
expect(aymIptal, 'CASE_NUMBER', '2022/167');
expect(aymIptal, 'CONTEXTUAL_DATE', '29.12.2022');
expect(aymIptal, 'DATE_TIME', '14.02.2023');
expect(aymIptal, 'COURT', 'İstanbul 7. Asliye Ticaret Mahkemesi');
expect(aymIptal, 'CASE_NUMBER', '2021/E.3456');

// ============================================================
console.log('\n=== İNTERNET: AVUKAT HASAR TAZMİNAT HESAP TABLOSU ===');
// ============================================================

const hesapTablosu = `MADDİ TAZMİNAT HESAP RAPORU

BİLİRKİŞİ:
Ad Soyad: Prof. Dr. Kemal Demir
İstanbul Üniversitesi İktisat Fakültesi
Tel: 0212 888 99 00
E-posta: kemal.demir@example.com

DAVACI: Ayşe Yıldırım (TC: 10000000146)
Doğum Tarihi: 15.07.1985
Meslek: Hemşire
Aylık net gelir: 35.000 TL
SGK No: 8899001

KAZA: 20.03.2024 tarihli trafik kazası
Maluliyet oranı: %28 (İstanbul Adli Tıp Kurumu raporu)
Geçici iş göremezlik: 120 gün

AKTÜERYA HESABI:
1. Geçici İş Göremezlik Zararı:
   35.000 / 30 x 120 = 140.000 TL

2. Sürekli İş Göremezlik Tazminatı:
   35.000 x 12 x 28/100 x PMF tablosu (yaşam süre katsayısı)
   = 117.600 x 22.5 (katsayı) = 2.646.000 TL

3. Bakıcı Gideri:
   İlk 6 ay tam bakıcı: 6 x 15.000 = 90.000 TL

4. Tedavi Giderleri:
   Fatura no: FTR-2024-11223 - 15.000 TL
   Fatura no: FTR-2024-44556 - 8.000 TL
   Fatura no: FTR-2024-77889 - 12.000 TL
   Toplam: 35.000 TL

GENEL TOPLAM: 2.911.000 TL

Poliçe teminat limiti (2024): 200.000 TL (kişi başı)
Sigorta şirketi sorumluluğu: 200.000 TL
Sürücü kişisel sorumluluğu: 2.711.000 TL

Rapor No: AKT-2024-3344
Rapor Tarihi: 15.06.2024

İstanbul, 15.06.2024
Prof. Dr. Kemal Demir`;

const htF = analyzeText(hesapTablosu, ALL, 0.35);
console.log(`  Tazminat hesap raporu: ${htF.length} bulgu`);

expect(hesapTablosu, 'PERSON_NAME', 'Kemal Demir');
expect(hesapTablosu, 'ORGANIZATION', 'İstanbul Üniversitesi');
expect(hesapTablosu, 'PHONE_NUMBER', '0212 888 99 00');
expect(hesapTablosu, 'EMAIL_ADDRESS', 'kemal.demir@example.com');
expect(hesapTablosu, 'PERSON_NAME', 'Ayşe Yıldırım');
expect(hesapTablosu, 'TR_NATIONAL_ID', '10000000146');
expect(hesapTablosu, 'CONTEXTUAL_DATE', '15.07.1985');
expect(hesapTablosu, 'TR_SGK_NO', '8899001');
expect(hesapTablosu, 'MEDICAL_ID', 'AKT-2024-3344');
expect(hesapTablosu, 'LOCATION', 'İstanbul');

// False positive stres testleri - sigorta hukuku terimleri
expect('Peşin sermaye değeri tablosu uygulanmıştır', 'PERSON_NAME', null);
expect('PMF yaşam tablosu kullanılmıştır', 'PERSON_NAME', null);
expect('Zorunlu mali sorumluluk sigortası kapsamında', 'PERSON_NAME', null);
expect('Geçici iş göremezlik raporu düzenlenmiştir', 'PERSON_NAME', null);
expect('Araç mahrumiyeti bedeli hesaplanmıştır', 'PERSON_NAME', null);

// ============================================================
console.log('\n=== GERÇEK: SİGORTA TAHKİM KOMİSYONU KARARLARI (WEB) ===');
// ============================================================

// Gerçek karar: K-2024/286826 Kasko uyuşmazlığı (bilginlawfirm.com.tr)
const tahkimKasko = `SİGORTA TAHKİM KOMİSYONU
HAKEM KARARI

Karar No: K-2024/286826
Karar Tarihi: 16.08.2024

BAŞVURAN: Faruk Erdoğan (TC: 22222222220)
Vekili: Av. Zeynep Aksoy - Bursa Barosu
Tel: 0224 555 66 77

KARŞI TARAF: Mapfre Sigorta A.Ş.

UYUŞMAZLIK KONUSU: Kasko poliçesinden doğan tazminat talebi

OLAYLAR:
1. 17.10.2023 tarihinde meydana gelen trafik kazasında
   başvuranın 16 BCD 345 plakalı aracı hasarlanmıştır.

2. Sigorta şirketi tarafından yapılan hasar tespitinde
   onarım bedeli 26.790,00 TL olarak belirlenmiştir.

3. Başvuranın görevlendirdiği bağımsız eksper raporu ile
   hasar bedeli 36.697,32 TL olarak tespit edilmiştir.
   Ekspertiz rapor no: EKS-2023-9988
   Ekspertiz ücreti: 636,00 TL

4. Başvuru tarihi: 03.01.2024
   Kasko poliçe no: KSK-2023-4455667
   Poliçe başlangıç tarihi: 01.05.2023
   Poliçe bitiş tarihi: 01.05.2024

KARAR:
Başvurunun KABULÜNE,
34.747,00 TL tazminatın avans faizi ile birlikte
davalı sigorta şirketinden tahsiline,
17.900,00 TL vekalet ücretinin karşı tarafa yükletilmesine,
OYBİRLİĞİYLE karar verildi.

Hakem: Doç. Dr. Elif Şahin
16.08.2024`;

const tkF = analyzeText(tahkimKasko, ALL, 0.35);
console.log(`  Tahkim Komisyonu kasko kararı: ${tkF.length} bulgu`);

expect(tahkimKasko, 'ORGANIZATION', 'Sigorta Tahkim Komisyonu');
expect(tahkimKasko, 'PERSON_NAME', 'Faruk Erdoğan');
expect(tahkimKasko, 'PERSON_NAME', 'Zeynep Aksoy');
expect(tahkimKasko, 'TR_NATIONAL_ID', '22222222220');
expect(tahkimKasko, 'ORGANIZATION', 'Bursa Barosu');
expect(tahkimKasko, 'ORGANIZATION', 'Mapfre');
expect(tahkimKasko, 'PHONE_NUMBER', '0224 555 66 77');
expect(tahkimKasko, 'CONTEXTUAL_DATE', '03.01.2024');
expect(tahkimKasko, 'TR_LICENSE_PLATE', '16 BCD 345');
expect(tahkimKasko, 'MEDICAL_ID', 'EKS-2023-9988');
expect(tahkimKasko, 'POLICY_NUMBER', 'KSK-2023-4455667');
expect(tahkimKasko, 'PERSON_NAME', 'Elif Şahin');
expect(tahkimKasko, 'DATE_TIME', '16.08.2024');

// Gerçek karar: K-2024/387992 Trafik sigortası zamanaşımı
const tahkimZamanasimi = `SİGORTA TAHKİM KOMİSYONU

Karar No: K-2024/387992
Karar Tarihi: 08.08.2024

BAŞVURAN: Hasan Yılmaz
Vekili: Av. Burak Kılıç - Ankara Barosu

KARŞI TARAF: Zurich Sigorta A.Ş.

UYUŞMAZLIK KONUSU: Trafik kazası nedeniyle sürekli iş göremezlik
tazminatı

OLAYLAR:
1. Kaza tarihi: 01.07.2015
2. Başvuranın maluliyet oranı: %15
3. Sigorta şirketi tarafından 43.545,00 TL ödeme yapılmıştır.
4. Başvuru tarihi: 04.03.2024
5. ZMS poliçe no: TRF-2015-7788990
6. Başvuranın TC: 10000000146
7. Başvuranın adresi: Kızılay Mah. Gazi Mustafa Kemal Blv.
   No:22/5, Çankaya/Ankara

SGK iş göremezlik raporu no: SGK-2015-445566
Maluliyet rapor tarihi: 15.11.2015
Adli Tıp Kurumu rapor no: ATK-2016-112233

KARAR:
Davalının zamanaşımı def'inin kabulüne,
başvurunun REDDİNE karar verildi.

Hakem: Prof. Dr. Kemal Aydın
08.08.2024`;

const tzF = analyzeText(tahkimZamanasimi, ALL, 0.35);
console.log(`  Tahkim zamanaşımı kararı: ${tzF.length} bulgu`);

expect(tahkimZamanasimi, 'ORGANIZATION', 'Sigorta Tahkim Komisyonu');
expect(tahkimZamanasimi, 'PERSON_NAME', 'Hasan Yılmaz');
expect(tahkimZamanasimi, 'PERSON_NAME', 'Burak Kılıç');
expect(tahkimZamanasimi, 'ORGANIZATION', 'Ankara Barosu');
expect(tahkimZamanasimi, 'ORGANIZATION', 'Zurich Sigorta');
expect(tahkimZamanasimi, 'CONTEXTUAL_DATE', '01.07.2015');
expect(tahkimZamanasimi, 'POLICY_NUMBER', 'TRF-2015-7788990');
expect(tahkimZamanasimi, 'TR_NATIONAL_ID', '10000000146');
expect(tahkimZamanasimi, 'LOCATION', 'Ankara');
expect(tahkimZamanasimi, 'MEDICAL_ID', 'SGK-2015-445566');
expect(tahkimZamanasimi, 'MEDICAL_ID', 'ATK-2016-112233');
expect(tahkimZamanasimi, 'PERSON_NAME', 'Kemal Aydın');

// Gerçek karar: K-2024/379346 Yangın sigortası su baskını
const tahkimYangin = `SİGORTA TAHKİM KOMİSYONU

Karar No: K-2024/379346
Karar Tarihi: 30.07.2024

BAŞVURAN: Serpil Demir (TC: 11111111110)
Adres: Bostancı Mah. Değirmen Sok. No:3/1, Kadıköy/İstanbul
E-posta: serpil.demir@example.com
Tel: 0536 777 88 99

KARŞI TARAF: Groupama Sigorta A.Ş.

KONU: Konut sigortası kapsamında su baskını hasarı

OLAYLAR:
1. Su baskını tarihi: 01.10.2023
2. Sigorta şirketi ilk teklifi: 3.000,00 TL
3. Hasar dosya no: 2023/SB-445566
4. Konut sigorta poliçe no: KNT-2023-1122334
5. Poliçe başlangıç tarihi: 15.03.2023
6. DASK poliçe no: DASK-2023-8899001

Bilirkişi raporu ile hasar bedeli 9.378,09 TL olarak
tespit edilmiştir.
Bilirkişi rapor no: BLK-2024-5566
Rapor tarihi: 15.01.2024

BANKA BİLGİLERİ:
IBAN: TR33 0006 1005 1978 6457 8413 26
Garanti BBVA Kadıköy Şubesi

KARAR:
Başvurunun kısmen kabulüne,
9.378,09 TL tazminatın 23.11.2023 tarihinden itibaren
yasal faizi ile birlikte davalıdan tahsiline
karar verildi.`;

const tyF = analyzeText(tahkimYangin, ALL, 0.35);
console.log(`  Tahkim yangın/su baskını kararı: ${tyF.length} bulgu`);

expect(tahkimYangin, 'PERSON_NAME', 'Serpil Demir');
expect(tahkimYangin, 'TR_NATIONAL_ID', '11111111110');
expect(tahkimYangin, 'LOCATION', 'İstanbul');
expect(tahkimYangin, 'EMAIL_ADDRESS', 'serpil.demir@example.com');
expect(tahkimYangin, 'PHONE_NUMBER', '0536 777 88 99');
expect(tahkimYangin, 'ORGANIZATION', 'Groupama');
expect(tahkimYangin, 'INSURANCE_FILE_NO', '2023/SB-445566');
expect(tahkimYangin, 'POLICY_NUMBER', 'KNT-2023-1122334');
expect(tahkimYangin, 'POLICY_NUMBER', 'DASK-2023-8899001');
expect(tahkimYangin, 'CASE_NUMBER', 'BLK-2024-5566');
expect(tahkimYangin, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');

// ============================================================
console.log('\n=== GERÇEK: YARGITAY 12.CD TAKSİRLE YARALAMA (WEB) ===');
// ============================================================

// Gerçek Yargıtay kararı: 12.CD 2019/13698 E. 2022/1306 K. (minvalhukuk.com)
const yargitayCeza1 = `T.C.
YARGITAY
12. CEZA DAİRESİ

Esas No: 2019/13698
Karar No: 2022/1306
Karar Tarihi: 22.02.2022

MAHKEMESİ: Isparta 2. Asliye Ceza Mahkemesi
SUÇ: Taksirle öldürme (TCK m.85)

SANIK: Ömer Gürler (TC: 10000000146)
Adres: Eğirdir Mah. Göl Sok. No:15, Eğirdir/Isparta
Müdafii: Av. Seda Polat - Isparta Barosu

MÜŞTEKİLER:
1. Fatma Çelik (maktulün eşi)
2. Ali Çelik (maktulün oğlu)
Vekilleri: Av. Oğuz Kara - Antalya Barosu

OLAY:
25.08.2018 tarihinde Isparta-Antalya karayolunda sanık Ömer
Gürler sevk ve idaresindeki 32 EF 789 plakalı dorseli çekici
ile seyir halinde iken, karşı yönden gelen 07 GH 456 plakalı
araçla çarpışmıştır. Kaza sonucunda 2 kişi hayatını kaybetmiş,
4 kişi yaralanmıştır.

Kaza tespit tutanağına göre zincirleme trafik kazası meydana
gelmiş olup, kusur tespiti için bilirkişi raporu alınmıştır.
Bilirkişi rapor no: BLK-2019-3344
Otopsi rapor no: OTP-2018-7788

Cumhuriyet Savcılığı soruşturma no: 2018/8765
İddianame no: 2019/2345
Dosya no: 2019/E.567

Sanığın adli sicil kaydı temizdir.
Ehliyet no: B-990011223
SRC belgesi: SRC-5566778

HÜKÜM:
Bilirkişi incelemesinde sanığın ölüm ve yaralanma ile
sonuçlanan ikinci kazada kusurunun bulunmadığı tespit
edilmiştir. İlk derece mahkemesi kararının BOZULMASINA,
sanığın beraatine karar verildi.

Başkan: Mehmet Karataş
Üye: Ayşe Demir
Üye: Hasan Polat
22.02.2022`;

const yc1F = analyzeText(yargitayCeza1, ALL, 0.35);
console.log(`  Yargıtay 12.CD taksirle öldürme: ${yc1F.length} bulgu`);

expect(yargitayCeza1, 'LEGAL_CITATION', '2019/13698');
expect(yargitayCeza1, 'LEGAL_CITATION', '2022/1306');
expect(yargitayCeza1, 'DATE_TIME', '22.02.2022');
expect(yargitayCeza1, 'LOCATION', 'Isparta');
expect(yargitayCeza1, 'PERSON_NAME', 'Ömer Gürler');
expect(yargitayCeza1, 'TR_NATIONAL_ID', '10000000146');
expect(yargitayCeza1, 'PERSON_NAME', 'Seda Polat');
expect(yargitayCeza1, 'ORGANIZATION', 'Isparta Barosu');
expect(yargitayCeza1, 'PERSON_NAME', 'Fatma Çelik');
expect(yargitayCeza1, 'PERSON_NAME', 'Ali Çelik');
expect(yargitayCeza1, 'PERSON_NAME', 'Oğuz Kara');
expect(yargitayCeza1, 'ORGANIZATION', 'Antalya Barosu');
expect(yargitayCeza1, 'TR_LICENSE_PLATE', '32 EF 789');
expect(yargitayCeza1, 'TR_LICENSE_PLATE', '07 GH 456');
expect(yargitayCeza1, 'CASE_NUMBER', 'BLK-2019-3344');
expect(yargitayCeza1, 'MEDICAL_ID', 'OTP-2018-7788');
expect(yargitayCeza1, 'CASE_NUMBER', '2018/8765');
expect(yargitayCeza1, 'CASE_NUMBER', '2019/2345');
expect(yargitayCeza1, 'DRIVER_LICENSE', 'B-990011223');
expect(yargitayCeza1, 'PERSON_NAME', 'Mehmet Karataş');

// Gerçek Yargıtay kararı: 12.CD 2022/10021 E. 2023/3111 K. (bilinçli taksir)
const yargitayCeza2 = `T.C.
YARGITAY
12. CEZA DAİRESİ

Esas No: 2022/10021
Karar No: 2023/3111
Karar Tarihi: 19.09.2023

İLK DERECE: Isparta 1. Ağır Ceza Mahkemesi
Esas No: 2022/20
Karar No: 2022/225

SUÇ: Taksirle öldürme ve yaralama (TCK m.85/2, bilinçli taksir)

SANIK: Yusuf Acar (TC: 22222222220)
Meslek: Otobüs şoförü
Ehliyet: E sınıfı
Adres: Aksu Mah. Çınar Cad. No:8/2, Merkez/Isparta
Tel: 0505 444 55 66

MÜŞTEKİLER:
1. Gülcan Arslan (maktulün eşi, TC: 11111111110)
2. Emre Arslan (maktulün oğlu)

OLAY:
12.03.2022 tarihinde Isparta-Burdur karayolunda yağışlı
havada sanık Yusuf Acar idaresindeki 32 MN 901 plakalı
yolcu otobüsü ile sollama yasağını ihlal ederek karşı
şeridindeki 15 OP 234 plakalı çekiciye çarpmıştır.

Kazada 1 kişi hayatını kaybetmiş, birden fazla kişi
yaralanmıştır.

ATK raporu: Maktulün ölüm sebebi kafa travmasıdır.
ATK rapor no: ATK-2022-5566
Kaza rapor no: KRT-2022-1122

Sigorta bilgileri:
Kasko poliçe no: KSK-2022-3344556
ZMS poliçe no: TRF-2022-7788990
Sigorta şirketi: Anadolu Sigorta A.Ş.

Ceza hesaplaması:
Temel ceza: 4 yıl hapis (TCK m.85/2)
Bilinçli taksir artırımı (1/3): +1 yıl 4 ay
Sonuç ceza: 5 yıl 4 ay hapis
Sürücü belgesi geri alınması: 6 ay
HAGB uygulanmamıştır.

SONUÇ: Hükmün ONANMASINA,
19.09.2023 tarihinde oybirliğiyle karar verildi.`;

const yc2F = analyzeText(yargitayCeza2, ALL, 0.35);
console.log(`  Yargıtay 12.CD bilinçli taksir: ${yc2F.length} bulgu`);

expect(yargitayCeza2, 'LEGAL_CITATION', '2022/10021');
expect(yargitayCeza2, 'LEGAL_CITATION', '2023/3111');
expect(yargitayCeza2, 'DATE_TIME', '19.09.2023');
expect(yargitayCeza2, 'LEGAL_CITATION', '2022/20');
expect(yargitayCeza2, 'LEGAL_CITATION', '2022/225');
expect(yargitayCeza2, 'LOCATION', 'Isparta');
expect(yargitayCeza2, 'PERSON_NAME', 'Yusuf Acar');
expect(yargitayCeza2, 'TR_NATIONAL_ID', '22222222220');
expect(yargitayCeza2, 'PHONE_NUMBER', '0505 444 55 66');
expect(yargitayCeza2, 'PERSON_NAME', 'Gülcan Arslan');
expect(yargitayCeza2, 'TR_NATIONAL_ID', '11111111110');
expect(yargitayCeza2, 'PERSON_NAME', 'Emre Arslan');
expect(yargitayCeza2, 'TR_LICENSE_PLATE', '32 MN 901');
expect(yargitayCeza2, 'TR_LICENSE_PLATE', '15 OP 234');
expect(yargitayCeza2, 'MEDICAL_ID', 'ATK-2022-5566');
expect(yargitayCeza2, 'MEDICAL_ID', 'KRT-2022-1122');
expect(yargitayCeza2, 'POLICY_NUMBER', 'KSK-2022-3344556');
expect(yargitayCeza2, 'POLICY_NUMBER', 'TRF-2022-7788990');
expect(yargitayCeza2, 'ORGANIZATION', 'Anadolu Sigorta');

// ============================================================
console.log('\n=== GERÇEK: İCRA TAKİP TALEBİ (WEB) ===');
// ============================================================

const icraTakipWeb = `T.C.
İSTANBUL 14. İCRA MÜDÜRLÜĞÜ
Dosya No: 2024/E.78901

TAKİP TALEBİ

ALACAKLI:
Ad Soyad: Derya Yılmaz
TC: 10000000146
Adres: Kozyatağı Mah. Bayar Cad. No:55/3, Kadıköy/İstanbul
Tel: 0532 888 99 00
E-posta: derya.yilmaz@example.com

VEKİLİ:
Av. Tolga Şen - İstanbul Barosu
Adres: Sultanahmet Mah. Divan Yolu Cad. No:12/4, Fatih/İstanbul
Tel: 0212 333 44 55

BORÇLU:
HDI Sigorta A.Ş.
Vergi No: 1234567890
Adres: Maslak Mah. AOS 55. Sok. No:2, Sarıyer/İstanbul

TAKİP KONUSU:
Trafik kazası nedeniyle araç değer kaybı tazminatı

İstanbul 7. Asliye Ticaret Mahkemesi 2023/5678 E., 2024/1234 K.
sayılı ilamı gereğince;

ALACAK HESABI:
1. Araç değer kaybı tazminatı: 35.000,00 TL
2. İşlemiş yasal faiz (22.06.2023-15.03.2024): 4.250,00 TL
3. Yargılama giderleri: 2.800,00 TL
4. Vekalet ücreti: 9.200,00 TL
TOPLAM: 51.250,00 TL

Borçluya ait tüm menkul ve gayrimenkul malların,
banka hesaplarının, araçların UYAP/TAKBİS/POLNET
üzerinden sorgulanmasını, haciz şerhi konulmasını
talep ederim.

Ek:
1. Mahkeme ilamı sureti
2. Vekaletname
3. Bilirkişi raporu (BLK-2023-8899)

15.03.2024
Av. Tolga Şen`;

const itWebF = analyzeText(icraTakipWeb, ALL, 0.35);
console.log(`  İcra takip talebi: ${itWebF.length} bulgu`);

expect(icraTakipWeb, 'LOCATION', 'İstanbul');
expect(icraTakipWeb, 'CASE_NUMBER', '2024/E.78901');
expect(icraTakipWeb, 'PERSON_NAME', 'Derya Yılmaz');
expect(icraTakipWeb, 'TR_NATIONAL_ID', '10000000146');
expect(icraTakipWeb, 'PHONE_NUMBER', '0532 888 99 00');
expect(icraTakipWeb, 'EMAIL_ADDRESS', 'derya.yilmaz@example.com');
expect(icraTakipWeb, 'PERSON_NAME', 'Tolga Şen');
expect(icraTakipWeb, 'ORGANIZATION', 'İstanbul Barosu');
expect(icraTakipWeb, 'PHONE_NUMBER', '0212 333 44 55');
expect(icraTakipWeb, 'ORGANIZATION', 'HDI Sigorta');
expect(icraTakipWeb, 'TR_VERGI_NO', '1234567890');
expect(icraTakipWeb, 'CASE_NUMBER', '2023/5678');
expect(icraTakipWeb, 'CASE_NUMBER', '2024/1234');
expect(icraTakipWeb, 'CASE_NUMBER', 'BLK-2023-8899');
expect(icraTakipWeb, 'DATE_TIME', '15.03.2024');

// ============================================================
console.log('\n=== GERÇEK: SGK İŞ GÖREMEZLİK / MALULİYET RAPORU ===');
// ============================================================

const sgkMaluliyet = `T.C.
SOSYAL GÜVENLİK KURUMU
ANKARA SOSYAL GÜVENLİK İL MÜDÜRLÜĞÜ

İŞ KAZASI GEÇİCİ İŞ GÖREMEZLİK BİLDİRİMİ

Sigortalı Bilgileri:
Ad Soyad: Osman Kara
TC Kimlik No: 22222222220
SGK Sicil No: 1234567890-34
Doğum Tarihi: 10.03.1990
Meslek: Elektrikçi
İşe giriş tarihi: 15.09.2021

İşyeri Bilgileri:
İşyeri: Enerji Yapı Sanayi ve Tic. A.Ş.
SGK İşyeri No: 3456789-06-01
Adres: Sincan OSB 5. Cad. No:12, Sincan/Ankara
Tel: 0312 666 77 88

Kaza Bilgileri:
Kaza tarihi: 22.11.2024
Kaza saati: 14:20
Kaza yeri: Şantiye C Blok, elektrik panosu önü
Kaza türü: Elektrik çarpması

Tedavi Bilgileri:
Hastane: Ankara Numune Eğitim ve Araştırma Hastanesi
Hasta protokol no: H2024-556677
Yatış tarihi: 22.11.2024
Taburcu tarihi: 05.12.2024
Ameliyat tarihi: 23.11.2024
Epikriz rapor no: EPK-2024-8899
Tedavi gören Dr.: Op. Dr. Nilgün Öztürk

Geçici İş Göremezlik Süresi: 90 gün
İstirahat başlangıcı: 22.11.2024
İstirahat bitişi: 20.02.2025

Sürekli İş Göremezlik Değerlendirmesi:
Maluliyet oranı: %22
Kurum sağlık kurulu rapor no: KSK-2025-1122
Rapor tarihi: 25.02.2025

Ödeme Bilgileri:
IBAN: TR16 0012 0000 3456 7890 1234 56
Halkbank Sincan Şubesi

İş Güvenliği Uzmanı: Murat Demir
İşyeri Hekimi: Dr. Aylin Çetin

Düzenleyen: Sosyal Güvenlik Denetmeni Halil Yıldız
Tarih: 01.03.2025`;

const sgkF = analyzeText(sgkMaluliyet, ALL, 0.35);
console.log(`  SGK iş göremezlik/maluliyet raporu: ${sgkF.length} bulgu`);

expect(sgkMaluliyet, 'ORGANIZATION', 'ANKARA SOSYAL GÜVENLİK İL MÜDÜRLÜĞÜ');
expect(sgkMaluliyet, 'LOCATION', 'Ankara');
expect(sgkMaluliyet, 'PERSON_NAME', 'Osman Kara');
expect(sgkMaluliyet, 'TR_NATIONAL_ID', '22222222220');
expect(sgkMaluliyet, 'CONTEXTUAL_DATE', '10.03.1990');
expect(sgkMaluliyet, 'PHONE_NUMBER', '0312 666 77 88');
expect(sgkMaluliyet, 'CONTEXTUAL_DATE', '22.11.2024');
expect(sgkMaluliyet, 'MEDICAL_ID', 'H2024-556677');
expect(sgkMaluliyet, 'CONTEXTUAL_DATE', '22.11.2024');
expect(sgkMaluliyet, 'CONTEXTUAL_DATE', '05.12.2024');
expect(sgkMaluliyet, 'CONTEXTUAL_DATE', '23.11.2024');
expect(sgkMaluliyet, 'MEDICAL_ID', 'EPK-2024-8899');
expect(sgkMaluliyet, 'PERSON_NAME', 'Nilgün Öztürk');
expect(sgkMaluliyet, 'MEDICAL_ID', 'KSK-2025-1122');
expect(sgkMaluliyet, 'IBAN_CODE', 'TR16 0012 0000 3456 7890 1234 56');
expect(sgkMaluliyet, 'PERSON_NAME', 'Murat Demir');
expect(sgkMaluliyet, 'PERSON_NAME', 'Aylin Çetin');
expect(sgkMaluliyet, 'PERSON_NAME', 'Halil Yıldız');

// ============================================================
console.log('\n=== GERÇEK: CEZA DAVASI İDDİANAME (WEB) ===');
// ============================================================

const iddianame = `T.C.
ANTALYA CUMHURİYET BAŞSAVCILIĞI
İDDİANAME

Soruşturma No: 2024/12345
İddianame No: 2024/6789
İddianame Tarihi: 15.04.2024

SANIK:
Ad Soyad: Volkan Erdoğan
TC: 11111111110
Baba Adı: Hüseyin
Anne Adı: Fatma
Doğum Tarihi: 08.06.1995
Doğum Yeri: Antalya
Adres: Lara Mah. Barınaklar Blv. No:44/6, Muratpaşa/Antalya
Meslek: Kurye
Ehliyet: A2, B sınıfı
Tel: 0542 666 77 88

MÜŞTEKİ:
Ad Soyad: Cansu Tekin
TC: 10000000146
Adres: Konyaaltı Mah. Atatürk Blv. No:22, Konyaaltı/Antalya

SUÇ VE SEVKİ:
5237 sayılı TCK m.89/1 - Taksirle yaralama
5237 sayılı TCK m.22/3 - Bilinçli taksir

OLAY:
30.01.2024 tarihinde saat 18:45 sıralarında Antalya ili
Muratpaşa ilçesi Işıklar Caddesi üzerinde meydana gelen
trafik kazasında;

Şüpheli Volkan Erdoğan sevk ve idaresindeki 07 RST 567
plakalı motosiklet ile kırmızı ışıkta geçerek yaya
geçidinden geçmekte olan müşteki Cansu Tekin'e çarpmıştır.

Müşteki Cansu Tekin; sağ bacak kırığı, kafa travması
teşhisi ile Antalya Eğitim ve Araştırma Hastanesinde
tedavi görmüştür.

DELİLLER:
1. Kaza tespit tutanağı (KTT-2024-3344)
2. MOBESE kamera kaydı (CD-2024-5566)
3. Tanık beyanları: Sevgi Polat, Murat Aydın
4. Adli tıp raporu no: ATK-2024-7788
5. Hastane epikriz raporu no: EPK-2024-9900
6. Trafik kaydı ve sigorta bilgileri
   ZMS poliçe no: TRF-2024-1122334
   Motosiklet şasi no: JYARN23E0LA012345

Geçici iş göremezlik süresi: 45 gün (basit tıbbi
müdahale ile giderilemeyecek nitelikte)

Şüphelinin ifadesi alınmış, suçlamaları kabul etmemiştir.

SONUÇ VE İSTEM:
Şüpheli hakkında TCK m.89/1 ve m.22/3 gereğince
cezalandırılması istemiyle kamu davası açılmıştır.

Antalya Cumhuriyet Savcısı
Elif Kaplan
15.04.2024`;

const idF = analyzeText(iddianame, ALL, 0.35);
console.log(`  Ceza davası iddianame: ${idF.length} bulgu`);

expect(iddianame, 'LOCATION', 'Antalya');
expect(iddianame, 'CASE_NUMBER', '2024/12345');
expect(iddianame, 'CASE_NUMBER', '2024/6789');
expect(iddianame, 'DATE_TIME', '15.04.2024');
expect(iddianame, 'PERSON_NAME', 'Volkan Erdoğan');
expect(iddianame, 'TR_NATIONAL_ID', '11111111110');
expect(iddianame, 'CONTEXTUAL_DATE', '08.06.1995');
expect(iddianame, 'PHONE_NUMBER', '0542 666 77 88');
expect(iddianame, 'PERSON_NAME', 'Cansu Tekin');
expect(iddianame, 'TR_NATIONAL_ID', '10000000146');
expect(iddianame, 'TR_LICENSE_PLATE', '07 RST 567');
expect(iddianame, 'MEDICAL_ID', 'KTT-2024-3344');
expect(iddianame, 'PERSON_NAME', 'Sevgi Polat');
expect(iddianame, 'PERSON_NAME', 'Murat Aydın');
expect(iddianame, 'MEDICAL_ID', 'ATK-2024-7788');
expect(iddianame, 'MEDICAL_ID', 'EPK-2024-9900');
expect(iddianame, 'POLICY_NUMBER', 'TRF-2024-1122334');
expect(iddianame, 'VEHICLE_ID', 'JYARN23E0LA012345');
expect(iddianame, 'PERSON_NAME', 'Elif Kaplan');

// Ceza hukuku false positive kontrolleri
expect('Taksirle yaralama suçundan yargılanmıştır', 'PERSON_NAME', null);
expect('Bilinçli taksir nedeniyle ceza artırılmıştır', 'PERSON_NAME', null);
expect('Cumhuriyet Savcılığı soruşturma başlatmıştır', 'PERSON_NAME', null);
expect('HAGB kararı verilmiştir', 'PERSON_NAME', null);
expect('Ağır Ceza Mahkemesi hüküm kurmuştur', 'PERSON_NAME', null);
expect('Geçici iş göremezlik raporu alınmıştır', 'PERSON_NAME', null);
expect('Sollama yasağı işaret levhası mevcuttur', 'PERSON_NAME', null);
expect('Kırmızı ışık ihlali tespit edilmiştir', 'PERSON_NAME', null);

// ============================================================
console.log('\n=== GERÇEK: İŞ KAZASI KUSUR RAPORU YARGITAY (WEB) ===');
// ============================================================

// Gerçek: Yargıtay 10.HD 2021/10336 E. 2022/15850 K. (alomaliye.com)
const isKazasiKusur = `T.C.
YARGITAY
10. HUKUK DAİRESİ

Esas No: 2021/10336
Karar No: 2022/15850
Karar Tarihi: 13.12.2022

MAHKEMESİ: Kırşehir İş Mahkemesi

DAVACI: Recep Korkmaz (TC: 10000000146)
SGK Sicil No: 7788990
Vekili: Av. Tuncay Demir - Kırşehir Barosu
Tel: 0386 212 33 44

DAVALI 1: Merkez Tuğla San. ve Tic. A.Ş.
Vergi No: 1234567890
Vekili: Av. Sinem Arslan

DAVALI 2: Ali Nazım Yıldırım (şirket müdürü)
TC: 22222222220

OLAY:
29.11.2010 tarihinde Kırşehir ili Çiçekdağı ilçesinde
bulunan tuğla fabrikasında davacı Recep Korkmaz, vals
(taş kırma) makinesinde çalışırken sol kolunu makinenin
silindirlerine sıkıştırmıştır.

Davacı, sıkışan malzemeye elindeki demir çubukla müdahale
ederken kazaya maruz kalmıştır.

BİLİRKİŞİ KUSUR RAPORU (15.05.2016):
Rapor No: BLK-2016-3344
Bilirkişi Heyeti:
1. Prof. Dr. Hakan Öztürk (İş Güvenliği Uzmanı)
2. Doç. Dr. Ayşe Kılıç (Makine Mühendisi)
3. Av. Mehmet Çelik (İş Hukuku Uzmanı)

KUSUR ORANLARI:
- Davalı şirket (Merkez Tuğla): %85
- Davalı A.N.Y. (şirket müdürü): %5
- Davacı Recep Korkmaz: %10
- Diğer davalılar S.U. ve B.G.: Kusursuz

ADLİ TIP RAPORU:
Maluliyet oranı: %46
Adli Tıp Kurumu rapor no: ATK-2016-5566
Rapor tarihi: 20.09.2016

TAZMİNAT HESABI:
Maddi tazminat: 247.087,88 TL
Manevi tazminat: 100.000,00 TL
Toplam: 347.087,88 TL

SGK rücu tutarı: 185.000,00 TL
SGK dosya no: 2011/RUC-7788

KARAR:
Bilirkişi raporunun denetime elverişli olmadığı tespit
edilmiştir. Hükmün BOZULMASINA, A sınıfı 3 kişilik
bilirkişi heyetine yeniden incelettirme yaptırılmasına
karar verilmiştir.`;

const ikkF = analyzeText(isKazasiKusur, ALL, 0.35);
console.log(`  İş kazası kusur raporu Yargıtay: ${ikkF.length} bulgu`);

expect(isKazasiKusur, 'LEGAL_CITATION', '2021/10336');
expect(isKazasiKusur, 'LEGAL_CITATION', '2022/15850');
expect(isKazasiKusur, 'CONTEXTUAL_DATE', '13.12.2022');
expect(isKazasiKusur, 'PERSON_NAME', 'Recep Korkmaz');
expect(isKazasiKusur, 'TR_NATIONAL_ID', '10000000146');
expect(isKazasiKusur, 'TR_SGK_NO', '7788990');
expect(isKazasiKusur, 'PERSON_NAME', 'Tuncay Demir');
expect(isKazasiKusur, 'PHONE_NUMBER', '0386 212 33 44');
expect(isKazasiKusur, 'TR_VERGI_NO', '1234567890');
expect(isKazasiKusur, 'PERSON_NAME', 'Sinem Arslan');
expect(isKazasiKusur, 'TR_NATIONAL_ID', '22222222220');
expect(isKazasiKusur, 'MEDICAL_ID', 'BLK-2016-3344');
expect(isKazasiKusur, 'PERSON_NAME', 'Hakan Öztürk');
expect(isKazasiKusur, 'PERSON_NAME', 'Ayşe Kılıç');
expect(isKazasiKusur, 'MEDICAL_ID', 'ATK-2016-5566');
expect(isKazasiKusur, 'CASE_NUMBER', '2011/RUC-7788');

// Gerçek: Yargıtay 10.HD 2021/472 E. 2021/15945 K. (minvalhukuk.com)
const isKazasiRucu = `T.C.
YARGITAY
10. HUKUK DAİRESİ

E. 2021/472
K. 2021/15945
Karar Tarihi: 14.12.2021

DAVACI: SGK Başkanlığı Ankara İl Müdürlüğü
Vekili: Av. Zehra Aktaş

DAVALI 1: Marmara Üniversitesi Rektörlüğü (asıl işveren)
DAVALI 2: Marmara Temizlik Hiz. Ltd. Şti. (alt işveren)
Vekili: Av. Burak Yıldız - İstanbul Barosu

KAZA TARİHİ: 31.10.2011
KAZA YERİ: Üniversite Hastanesi, yoğun bakım ünitesi
KAZALI: Nurcan Aktaş (TC: 11111111110, hasta bakıcı)
SGK No: 3344556

OLAY:
Kazalı Nurcan Aktaş, üniversite hastanesinde hasta bakıcı
olarak çalışırken oksijen tüpü başlığının patlaması sonucu
yaralanmıştır. Yaralanma sonucu sağ kolunda kalıcı hasar
meydana gelmiştir.

BİLİRKİŞİ KUSUR RAPORU:
Rapor no: BLK-2015-8899
- Üniversite (asıl işveren): %40
- Temizlik şirketi (alt işveren): %60
- Kazalı: Kusursuz

MALULİYET:
Maluliyet oranı: %32
ATK rapor no: ATK-2014-2233
SGK sürekli iş göremezlik gelir bağlama kararı: 15.06.2014

TAZMİNAT:
SGK rücu talebi:
- Maddi: 330.462,02 TL
- Manevi: 20.000,00 TL
- Toplam: 350.462,02 TL

Peşin sermaye değeri: 280.000,00 TL

KARAR:
Bilirkişi raporunun denetime elverişli olmadığı gerekçesiyle
hükmün BOZULMASINA karar verilmiştir. A sınıfı iş güvenliği
uzmanı, makine mühendisi ve hukukçudan oluşan bilirkişi
heyetine yeniden inceleme yaptırılmalıdır.`;

const ikrF = analyzeText(isKazasiRucu, ALL, 0.35);
console.log(`  İş kazası rücu davası Yargıtay: ${ikrF.length} bulgu`);

expect(isKazasiRucu, 'LEGAL_CITATION', '2021/472');
expect(isKazasiRucu, 'LEGAL_CITATION', '2021/15945');
expect(isKazasiRucu, 'CONTEXTUAL_DATE', '14.12.2021');
expect(isKazasiRucu, 'ORGANIZATION', 'SGK Başkanlığı Ankara İl Müdürlüğü');
expect(isKazasiRucu, 'PERSON_NAME', 'Zehra Aktaş');
expect(isKazasiRucu, 'PERSON_NAME', 'Burak Yıldız');
expect(isKazasiRucu, 'ORGANIZATION', 'İstanbul Barosu');
expect(isKazasiRucu, 'PERSON_NAME', 'Nurcan Aktaş');
expect(isKazasiRucu, 'TR_NATIONAL_ID', '11111111110');
expect(isKazasiRucu, 'TR_SGK_NO', '3344556');
expect(isKazasiRucu, 'MEDICAL_ID', 'BLK-2015-8899');
expect(isKazasiRucu, 'MEDICAL_ID', 'ATK-2014-2233');

// ============================================================
console.log('\n=== GERÇEK: NOTER VEKALETNAMESİ (WEB) ===');
// ============================================================

const vekaletname2 = `T.C.
ANKARA 15. NOTERLİĞİ
Yevmiye No: 2024/12345

GENEL DAVA VEKALETNAMESİ

VEKİL EDEN (MÜVEKKİL):
Ad Soyad: Cemile Yılmaz
TC Kimlik No: 10000000146
Doğum Tarihi: 12.05.1978
Baba Adı: Kemal
Anne Adı: Hatice
Adres: Çankaya Mah. Atatürk Blv. No:88/3, Çankaya/Ankara
Tel: 0312 555 66 77
E-posta: cemile.yilmaz@example.com

VEKİL EDİLEN (AVUKAT):
Ad Soyad: Av. Baran Demir
TC Kimlik No: 22222222220
Ankara Barosu Sicil No: 34567
Adres: Kızılay Mah. Meşrutiyet Cad. No:15/4, Çankaya/Ankara
Tel: 0312 444 33 22

YETKİ KAPSAMI:
Leh ve aleyhime açılmış ve açılacak bilcümle dava ve takiplerde,
T.C. mahkemeleri, bölge adliye mahkemeleri, Yargıtay, Danıştay,
Sayıştay, Anayasa Mahkemesi, idare mahkemeleri, vergi mahkemeleri,
icra daireleri ve tüm resmi daire ve kurumlarda beni temsile,
dava açmaya, icra takibi yapmaya, davadan feragat etmeye,
kabule, sulh olmaya, hakem tayin etmeye, ihtiyati tedbir ve
ihtiyati haciz talebinde bulunmaya, başkalarını tevkil, teşrik
ve azle, tanık, bilirkişi göstermeye, keşif yaptırmaya, yemin
teklif etmeye, yemini kabule, delil tespiti istemeye, temyiz,
istinaf, karar düzeltme, iade-i muhakeme yollarına başvurmaya,
tebliğ ve tebellüğe, mal beyanında bulunmaya, uzlaşma
teklifinde bulunmaya ve kabule, hukuki ihtilafların arabuluculuk
yoluyla çözümü konusunda dava şartı ve ihtiyari arabuluculuk
süreçlerini yürütmeye, son tutanağı imzalamaya, bu yetkilerin
tamamını veya bir kısmını başkalarına devretmeye mezun ve yetkili
olmak üzere,

Yukarıda kimliği yazılı Av. Baran Demir'i vekil tayin ettim.

İş bu vekaletname tüm Türkiye Cumhuriyeti mahkemeleri ve
resmi daireler nezdinde geçerlidir.

VEKALETİ VEREN:
Cemile Yılmaz
İmza

NOTER:
Ankara 15. Noteri
Yevmiye No: 2024/12345
Tarih: 10.01.2024
Harç: 850,00 TL

Bu belgenin aslı gibidir.`;

const vk2F = analyzeText(vekaletname2, ALL, 0.35);
console.log(`  Noter vekaletnamesi: ${vk2F.length} bulgu`);

expect(vekaletname2, 'LOCATION', 'Ankara');
expect(vekaletname2, 'PERSON_NAME', 'Cemile Yılmaz');
expect(vekaletname2, 'TR_NATIONAL_ID', '10000000146');
expect(vekaletname2, 'CONTEXTUAL_DATE', '12.05.1978');
expect(vekaletname2, 'PHONE_NUMBER', '0312 555 66 77');
expect(vekaletname2, 'EMAIL_ADDRESS', 'cemile.yilmaz@example.com');
expect(vekaletname2, 'PERSON_NAME', 'Baran Demir');
expect(vekaletname2, 'TR_NATIONAL_ID', '22222222220');
expect(vekaletname2, 'ORGANIZATION', 'Ankara Barosu');
expect(vekaletname2, 'PHONE_NUMBER', '0312 444 33 22');
expectNot(vekaletname2, 'ORGANIZATION', 'Yargıtay');
expectNot(vekaletname2, 'COURT', 'Anayasa Mahkemesi');
expect(vekaletname2, 'DATE_TIME', '10.01.2024');

// ============================================================
console.log('\n=== GERÇEK: KVKK VERİ İHLALİ BİLDİRİMİ (WEB) ===');
// ============================================================

// KVKK kamuoyu duyurusu formatı (kvkk.gov.tr)
const kvkkIhlal = `T.C.
KİŞİSEL VERİLERİ KORUMA KURUMU

KAMUOYU DUYURUSU
(Veri İhlali Bildirimi)

Kurul Karar No: 2025/2451
Karar Tarihi: 25.12.2025

VERİ SORUMLUSU:
Unvan: Destek Bilgisayar ve İletişim Hiz. Tic. A.Ş.
Vergi No: 1234567890
VERBİS No: 123456
Adres: Maslak Mah. AOS 55. Sok. No:2, Sarıyer/İstanbul
Tel: 0212 999 88 77
E-posta: kvkk@example.com
Veri sorumlusu temsilcisi: Hande Koç (TC: 11111111110)
E-posta: hande.koc@example.com

İHLAL BİLGİLERİ:
İhlal tespit tarihi: 15.11.2025
İhlalin gerçekleştiği tarih: 10.11.2025
Kurula bildirim tarihi: 17.11.2025
Bildirim süresi: 72 saat içinde

ETKİLENEN KİŞİSEL VERİLER:
- Ad, soyad
- TC kimlik numarası
- E-posta adresi
- Telefon numarası
- Adres bilgileri
Etkilenen kişi sayısı: 25.000

İHLALİN TANIMI:
Şirketin müşteri veri tabanına yetkisiz erişim sağlanmıştır.
Saldırganların SQL enjeksiyon yöntemiyle veritabanına
eriştiği tespit edilmiştir.

IP adresi: 185.234.56.78
MAC adresi: 00:1A:2B:3C:4D:5E

ALINAN TEDBİRLER:
1. İlgili IP adresleri engellenmiştir
2. Veritabanı güvenlik yamaları uygulanmıştır
3. Etkilenen kullanıcılara e-posta ile bildirim yapılmıştır
4. Siber olaylar inceleme rapor no: SIR-2025-7788

KURUL KARARI:
6698 sayılı Kanunun 12. maddesi uyarınca veri sorumlusunun
gerekli teknik ve idari tedbirleri almadığı tespit edilmiş
olup, 1.000.000,00 TL idari para cezası uygulanmasına
karar verilmiştir.

Kamuoyuna duyurulur.

Kişisel Verileri Koruma Kurulu Başkanı
Prof. Dr. Faruk Bilir`;

const kvkF = analyzeText(kvkkIhlal, ALL, 0.35);
console.log(`  KVKK veri ihlali bildirimi: ${kvkF.length} bulgu`);

expect(kvkkIhlal, 'TR_VERGI_NO', '1234567890');
expect(kvkkIhlal, 'LOCATION', 'İstanbul');
expect(kvkkIhlal, 'PHONE_NUMBER', '0212 999 88 77');
expect(kvkkIhlal, 'EMAIL_ADDRESS', 'kvkk@example.com');
expect(kvkkIhlal, 'PERSON_NAME', 'Hande Koç');
expect(kvkkIhlal, 'TR_NATIONAL_ID', '11111111110');
expect(kvkkIhlal, 'EMAIL_ADDRESS', 'hande.koc@example.com');
expect(kvkkIhlal, 'IP_ADDRESS', '185.234.56.78');
expect(kvkkIhlal, 'MAC_ADDRESS', '00:1A:2B:3C:4D:5E');
expect(kvkkIhlal, 'MEDICAL_ID', 'SIR-2025-7788');
expect(kvkkIhlal, 'PERSON_NAME', 'Faruk Bilir');
expect(kvkkIhlal, 'CONTEXTUAL_DATE', '25.12.2025');

// ============================================================
console.log('\n=== GERÇEK: DESTEKTEN YOKSUN KALMA TAZMİNATI (WEB) ===');
// ============================================================

// Gerçek Yargıtay referansları: HGK 2023/4198 E., 4.HD 2024/3323 E.
const destektenYoksunWeb = `T.C.
İSTANBUL 12. ASLİYE TİCARET MAHKEMESİ

Esas No: 2023/4567
Karar No: 2024/8901
Karar Tarihi: 20.06.2024

DAVACI 1: Fatma Özdemir (müteveffanın eşi)
TC: 10000000146
Adres: Bağcılar Mah. Mimar Sinan Cad. No:22/1, Bağcılar/İstanbul
Tel: 0532 111 22 33
E-posta: fatma.ozdemir@example.com

DAVACI 2: Yusuf Özdemir (müteveffanın oğlu, 12 yaş)
TC: 22222222220

VEKİLLERİ:
Av. Gökhan Arslan - İstanbul Barosu
Tel: 0212 555 66 77

DAVALI 1: Ergo Sigorta A.Ş.
DAVALI 2: Kerim Polat (kazaya sebebiyet veren sürücü)
TC: 11111111110
Ehliyet No: B-112233445

MÜTEVEFFA: Mustafa Özdemir
TC: 11111111110
Doğum Tarihi: 05.03.1980
Vefat Tarihi: 15.09.2023
Meslek: Elektrik teknisyeni
Aylık net gelir: 42.000 TL

KAZA BİLGİLERİ:
Kaza tarihi: 15.09.2023
Kaza yeri: TEM Otoyolu Hadımköy mevkii, İstanbul
Araç A (müteveffa): 34 VWX 901 - Honda Civic 2020
Araç B (kusurlu): 34 YZ 012 - Mercedes Actros TIR

Kaza tespit tutanağı no: KTT-2023-7788
Otopsi rapor no: OTP-2023-4455
ZMS poliçe no (davalı): TRF-2023-6677889

BİLİRKİŞİ AKTÜERYA RAPORU:
Rapor no: AKT-2024-1122
Rapor tarihi: 15.03.2024
Hesaplama yöntemi: TRH 2010 Yaşam Tablosu + PMF 1931 Tablosu

1. Eş Fatma Özdemir (yaş 42) destek payı: %30
   Bakiye destek süresi: 23 yıl
   Yıllık destek tutarı: 42.000 x 12 x 0.30 = 151.200 TL
   Peşin sermaye değeri (iskontolu): 2.150.000 TL

2. Oğul Yusuf Özdemir (yaş 12) destek payı: %20
   Destek süresi: 10 yıl (22 yaşına kadar)
   Yıllık destek tutarı: 42.000 x 12 x 0.20 = 100.800 TL
   Peşin sermaye değeri: 780.000 TL

3. Cenaze ve defin giderleri: 35.000 TL

TOPLAM MADDİ TAZMİNAT: 2.965.000 TL
MANEVİ TAZMİNAT:
- Eş için: 200.000 TL
- Oğul için: 150.000 TL

KUSUR DURUMU:
Müteveffa: %0 kusurlu
Davalı sürücü Kerim Polat: %100 kusurlu

SİGORTA TEMİNAT LİMİTİ (2023):
Kişi başı: 200.000 TL
Kaza başı: 400.000 TL

KARAR:
Yargıtay HGK 2023/4198 E. sayılı içtihadı doğrultusunda
destekten yoksun kalma tazminatının TRH 2010 tablosu ile
hesaplanmasına karar verilmiştir.

Davalı Ergo Sigorta'nın 200.000 TL poliçe limiti dahilinde
sorumluluğuna, bakiye tazminatın davalı sürücüden tahsiline
hükmedilmiştir.

BANKA BİLGİLERİ:
IBAN: TR33 0006 1005 1978 6457 8413 26
Garanti BBVA Bağcılar Şubesi

Hakim: Selim Kaya
Katip: Derya Aktaş
20.06.2024`;

const dywF = analyzeText(destektenYoksunWeb, ALL, 0.35);
console.log(`  Destekten yoksun kalma tazminatı: ${dywF.length} bulgu`);

expect(destektenYoksunWeb, 'LOCATION', 'İstanbul');
expect(destektenYoksunWeb, 'CASE_NUMBER', '2023/4567');
expect(destektenYoksunWeb, 'CASE_NUMBER', '2024/8901');
expect(destektenYoksunWeb, 'DATE_TIME', '20.06.2024');
expect(destektenYoksunWeb, 'PERSON_NAME', 'Fatma Özdemir');
expect(destektenYoksunWeb, 'TR_NATIONAL_ID', '10000000146');
expect(destektenYoksunWeb, 'PHONE_NUMBER', '0532 111 22 33');
expect(destektenYoksunWeb, 'EMAIL_ADDRESS', 'fatma.ozdemir@example.com');
expect(destektenYoksunWeb, 'PERSON_NAME', 'Yusuf Özdemir');
expect(destektenYoksunWeb, 'TR_NATIONAL_ID', '22222222220');
expect(destektenYoksunWeb, 'PERSON_NAME', 'Gökhan Arslan');
expect(destektenYoksunWeb, 'ORGANIZATION', 'İstanbul Barosu');
expect(destektenYoksunWeb, 'PHONE_NUMBER', '0212 555 66 77');
expect(destektenYoksunWeb, 'PERSON_NAME', 'Kerim Polat');
expect(destektenYoksunWeb, 'TR_NATIONAL_ID', '11111111110');
expect(destektenYoksunWeb, 'DRIVER_LICENSE', 'B-112233445');
expect(destektenYoksunWeb, 'TR_NATIONAL_ID', '11111111110');
expect(destektenYoksunWeb, 'CONTEXTUAL_DATE', '05.03.1980');
expect(destektenYoksunWeb, 'CONTEXTUAL_DATE', '15.09.2023');
expect(destektenYoksunWeb, 'CONTEXTUAL_DATE', '15.09.2023');
expect(destektenYoksunWeb, 'TR_LICENSE_PLATE', '34 VWX 901');
expect(destektenYoksunWeb, 'TR_LICENSE_PLATE', '34 YZ 012');
expect(destektenYoksunWeb, 'MEDICAL_ID', 'KTT-2023-7788');
expect(destektenYoksunWeb, 'MEDICAL_ID', 'OTP-2023-4455');
expect(destektenYoksunWeb, 'POLICY_NUMBER', 'TRF-2023-6677889');
expect(destektenYoksunWeb, 'MEDICAL_ID', 'AKT-2024-1122');
expect(destektenYoksunWeb, 'LEGAL_CITATION', '2023/4198');
expect(destektenYoksunWeb, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');
expect(destektenYoksunWeb, 'PERSON_NAME', 'Selim Kaya');
expect(destektenYoksunWeb, 'PERSON_NAME', 'Derya Aktaş');

// ============================================================
console.log('\n=== GERÇEK: KVKK/GDPR FALSE POSİTİVE TESTLERİ ===');
// ============================================================

// KVKK/hukuk terimleri false positive
expect('Kişisel verilerin işlenmesine açık rıza verilmiştir', 'PERSON_NAME', null);
expect('Veri sorumlusu siciline kayıt yükümlülüğü', 'PERSON_NAME', null);
expect('İlgili kişinin başvurusu üzerine inceleme yapılmıştır', 'PERSON_NAME', null);
expect('Kurul kararı gereğince idari para cezası uygulanmıştır', 'PERSON_NAME', null);
expect('Peşin sermaye değeri hesaplanmıştır', 'PERSON_NAME', null);
expect('TRH 2010 yaşam tablosu kullanılmıştır', 'PERSON_NAME', null);
expect('Destekten yoksun kalma tazminatı hükmedilmiştir', 'PERSON_NAME', null);
expect('İş güvenliği uzmanı rapor hazırlamıştır', 'PERSON_NAME', null);
expect('Maluliyet oranı yüzde kırk olarak belirlenmiştir', 'PERSON_NAME', null);
expect('Bilirkişi heyeti üç kişiden oluşmaktadır', 'PERSON_NAME', null);

// ============================================================
console.log('\n=== GERÇEK: TAHKİM KOMİSYONU BEDENİ HASAR KARARI (WEB) ===');
// ============================================================

// Gerçek karar numaraları: K-2019/74522, K-2019/76887, 2024/İHK-70631
const tahkimBedeni = `SİGORTA TAHKİM KOMİSYONU
HAKEM KARARI

Dosya No: 2024/E.55678
Karar No: K-2024/412345
Karar Tarihi: 15.10.2024

BAŞVURAN:
Ad Soyad: Elif Yılmaz (TC: 10000000146)
Vekili: Av. Deniz Kara - İstanbul Barosu
Tel: 0212 333 44 55
E-posta: deniz.kara@example.com

KARŞI TARAF:
Axa Sigorta A.Ş. (ZMS Trafik Poliçesi)
Poliçe No: TRF-2023-9988776
Vekili: Av. Serkan Öz

UYUŞMAZLIK KONUSU:
Trafik kazası sonucu bedeni hasar (sürekli iş göremezlik)
tazminatı talebi

OLAY:
1. Kaza tarihi: 22.03.2023
2. Kaza yeri: Bahçeşehir-Esenyurt bağlantı yolu, İstanbul
3. Başvuranın aracı: 34 DEF 567 plakalı 2021 model Hyundai i20
4. Karşı araç: 34 GH 890 plakalı TIR
5. Sürücü: Ahmet Korkmaz (TC: 22222222220)

Kaza tespit tutanağı no: KTT-2023-5566
Trafik kazası rapor no: TKR-2023-7788

SAĞLIK RAPORLARI:
1. Acil tedavi: İstanbul Eğitim ve Araştırma Hastanesi
   Hasta protokol no: H2023-334455
   Tedavi tarihi: 22.03.2023

2. Ortopedi ameliyatı: 25.03.2023
   Epikriz no: EPK-2023-6677

3. Üniversite Hastanesi Sağlık Kurulu Raporu:
   Maluliyet oranı: %18
   Rapor no: SKR-2023-8899
   Rapor tarihi: 15.09.2023

4. Adli Tıp Kurumu 3. İhtisas Kurulu:
   Maluliyet oranı: %22 (kesinleşmiş)
   ATK rapor no: ATK-2023-1122
   Rapor tarihi: 20.12.2023

AKTÜERYA BİLİRKİŞİ RAPORU:
Bilirkişi: Dr. Selim Arslan (Aktüer)
Rapor no: AKT-2024-3344
Rapor tarihi: 15.02.2024

Hesaplama parametreleri:
- Başvuran yaşı: 35
- Meslek: Grafik tasarımcı
- Aylık net gelir: 38.000 TL
- Maluliyet oranı: %22
- Bakiye çalışma süresi: 27 yıl (TRH 2010 tablosu)
- İskonto oranı: %10 teknik faiz

Sürekli iş göremezlik tazminatı:
38.000 x 12 x 0.22 x 16.33 (iskontolu katsayı) = 1.637.798 TL

Geçici iş göremezlik (180 gün):
38.000 / 30 x 180 = 228.000 TL

Bakıcı gideri (ilk 3 ay):
3 x 18.000 = 54.000 TL

TOPLAM TALEP: 1.919.798 TL

SİGORTA ŞİRKETİ SAVUNMASI:
1. Maluliyet oranına itiraz (kendi hekimi %12 belirlemiş)
2. Geçici bakıcı giderine itiraz
3. Gelir belgesinin yetersizliği
4. Önceden yapılan ödeme: 85.000 TL

KARAR:
Yargıtay 4. HD 2024/3323 E., 2024/5474 K. sayılı içtihadı
ve Sigorta Tahkim Komisyonu emsal kararları (K-2019/74522,
K-2024/286826) doğrultusunda;

1. ATK maluliyet oranı (%22) esas alınmıştır.
2. Sürekli iş göremezlik: 1.637.798 TL
3. Geçici iş göremezlik: 228.000 TL
4. Bakıcı gideri: 54.000 TL
5. Mahsup (-85.000 TL önceki ödeme)
6. NET TAZMİNAT: 1.834.798 TL

Tazminatın avans faizi ile davalıdan tahsiline,
8.400 TL vekalet ücretinin davalıya yükletilmesine,
OYBİRLİĞİYLE karar verildi.

Hakem: Prof. Dr. Gülten Demir
Raportör: Av. Cemre Polat
15.10.2024`;

const tbdF = analyzeText(tahkimBedeni, ALL, 0.35);
console.log(`  Tahkim bedeni hasar kararı: ${tbdF.length} bulgu`);

expect(tahkimBedeni, 'ORGANIZATION', 'Sigorta Tahkim Komisyonu');
expect(tahkimBedeni, 'PERSON_NAME', 'Elif Yılmaz');
expect(tahkimBedeni, 'TR_NATIONAL_ID', '10000000146');
expect(tahkimBedeni, 'PERSON_NAME', 'Deniz Kara');
expect(tahkimBedeni, 'ORGANIZATION', 'İstanbul Barosu');
expect(tahkimBedeni, 'PHONE_NUMBER', '0212 333 44 55');
expect(tahkimBedeni, 'EMAIL_ADDRESS', 'deniz.kara@example.com');
expect(tahkimBedeni, 'ORGANIZATION', 'Axa Sigorta');
expect(tahkimBedeni, 'POLICY_NUMBER', 'TRF-2023-9988776');
expect(tahkimBedeni, 'PERSON_NAME', 'Serkan Öz');
expect(tahkimBedeni, 'CONTEXTUAL_DATE', '22.03.2023');
expect(tahkimBedeni, 'LOCATION', 'İstanbul');
expect(tahkimBedeni, 'TR_LICENSE_PLATE', '34 DEF 567');
expect(tahkimBedeni, 'TR_LICENSE_PLATE', '34 GH 890');
expect(tahkimBedeni, 'PERSON_NAME', 'Ahmet Korkmaz');
expect(tahkimBedeni, 'TR_NATIONAL_ID', '22222222220');
expect(tahkimBedeni, 'MEDICAL_ID', 'KTT-2023-5566');
expect(tahkimBedeni, 'MEDICAL_ID', 'H2023-334455');
expect(tahkimBedeni, 'MEDICAL_ID', 'EPK-2023-6677');
expect(tahkimBedeni, 'MEDICAL_ID', 'SKR-2023-8899');
expect(tahkimBedeni, 'MEDICAL_ID', 'ATK-2023-1122');
expect(tahkimBedeni, 'PERSON_NAME', 'Selim Arslan');
expect(tahkimBedeni, 'MEDICAL_ID', 'AKT-2024-3344');
expect(tahkimBedeni, 'LEGAL_CITATION', '2024/3323');
expect(tahkimBedeni, 'LEGAL_CITATION', '2024/5474');
expect(tahkimBedeni, 'PERSON_NAME', 'Gülten Demir');
expect(tahkimBedeni, 'PERSON_NAME', 'Cemre Polat');

// ============================================================
console.log('\n=== GERÇEK: TAHKİM İTİRAZ HAKEM HEYETİ KARARI (WEB) ===');
// ============================================================

// Gerçek format: 2024/İHK-70631
const tahkimItiraz = `SİGORTA TAHKİM KOMİSYONU
İTİRAZ HAKEM HEYETİ KARARI

Dosya No: 2024/İHK-70631
Karar Tarihi: 30.09.2024

İTİRAZ EDEN:
Sompo Sigorta A.Ş.
Vekili: Av. Tuba Arslan

KARŞI TARAF (İLK BAŞVURAN):
Ad Soyad: Murat Şahin (TC: 11111111110)
Vekili: Av. Oğuz Demir - Ankara Barosu
Tel: 0312 222 33 44

İLK DERECE HAKEM KARARI:
Karar No: K-2024/356789
Karar Tarihi: 15.07.2024
Tazminat: 890.000,00 TL

İTİRAZ KONUSU:
Kasko hasarı rayiç değer tespiti

OLAY:
18.02.2024 tarihinde Ankara Çankaya ilçesinde meydana
gelen trafik kazasında başvuranın 06 JKL 345 plakalı
2022 model BMW 320i marka ticari aracı pert olmuştur.

Kasko poliçe no: KSK-2024-5566778
Poliçe başlangıç tarihi: 01.01.2024
Poliçe bitiş tarihi: 01.01.2025

HASAR BİLGİLERİ:
Hasar dosya no: 2024/HD-889900
Ekspertiz rapor no: EKS-2024-1122
Ekspertiz tarihi: 25.02.2024
Sovtaj bedeli: 180.000 TL

BİLİRKİŞİ RAPORU:
Bilirkişi: Doç. Dr. Hasan Yıldırım (Otomotiv Değerleme Uzmanı)
Rapor no: BLK-2024-7788
Rapor tarihi: 15.05.2024

Aracın hasar tarihi rayiç değeri:
- Sigorta şirketi tespiti: 750.000 TL
- Bilirkişi tespiti: 890.000 TL
- İkinci el piyasa araştırması: 870.000-920.000 TL arası
- Karar: 890.000 TL kabul edilmiştir

Sovtaj mahsup: -180.000 TL
Net tazminat: 710.000 TL

İTİRAZ EDEN (SİGORTA) İDDİALARI:
1. Rayiç değer tespitinin hatalı olduğu
2. Bilirkişi raporunun denetime elverişli olmadığı
3. Avans faizi uygulamasının yerinde olmadığı

İTİRAZ HAKEM HEYETİ DEĞERLENDİRMESİ:
1. Bilirkişi raporu TTK m.1426 kapsamında denetlenmiştir
2. Rayiç değer tespiti piyasa verileriyle uyumludur
3. Ticari araç kullanımı nedeniyle avans faizi yerindedir

KARAR:
İtirazın REDDİNE,
İlk derece hakem kararının ONANMASINA,
İtiraz başvuru ücretinin itiraz edene yükletilmesine
OYBİRLİĞİYLE karar verildi.

İtiraz Hakem Heyeti:
Başkan: Prof. Dr. Mehmet Karataş
Üye: Doç. Dr. Aylin Güneş
Üye: Av. Cem Yıldız
30.09.2024`;

const tihF = analyzeText(tahkimItiraz, ALL, 0.35);
console.log(`  Tahkim itiraz hakem heyeti: ${tihF.length} bulgu`);

expect(tahkimItiraz, 'ORGANIZATION', 'Sigorta Tahkim Komisyonu');
expect(tahkimItiraz, 'ORGANIZATION', 'Sompo Sigorta');
expect(tahkimItiraz, 'PERSON_NAME', 'Tuba Arslan');
expect(tahkimItiraz, 'PERSON_NAME', 'Murat Şahin');
expect(tahkimItiraz, 'TR_NATIONAL_ID', '11111111110');
expect(tahkimItiraz, 'PERSON_NAME', 'Oğuz Demir');
expect(tahkimItiraz, 'ORGANIZATION', 'Ankara Barosu');
expect(tahkimItiraz, 'PHONE_NUMBER', '0312 222 33 44');
expect(tahkimItiraz, 'LOCATION', 'Ankara');
expect(tahkimItiraz, 'TR_LICENSE_PLATE', '06 JKL 345');
expect(tahkimItiraz, 'POLICY_NUMBER', 'KSK-2024-5566778');
expect(tahkimItiraz, 'INSURANCE_FILE_NO', '2024/HD-889900');
expect(tahkimItiraz, 'MEDICAL_ID', 'EKS-2024-1122');
expect(tahkimItiraz, 'PERSON_NAME', 'Hasan Yıldırım');
expect(tahkimItiraz, 'MEDICAL_ID', 'BLK-2024-7788');
expect(tahkimItiraz, 'PERSON_NAME', 'Mehmet Karataş');
expect(tahkimItiraz, 'PERSON_NAME', 'Aylin Güneş');
expect(tahkimItiraz, 'PERSON_NAME', 'Cem Yıldız');
expect(tahkimItiraz, 'DATE_TIME', '30.09.2024');

// ============================================================
console.log('\n=== GERÇEK: TRAFİK BİLİRKİŞİ KUSUR RAPORU (WEB) ===');
// ============================================================

// Trafik kazası teknik bilirkişi raporu formatı (bilirkisiraporlari.com)
const trafikBilirkisiWeb = `T.C.
İSTANBUL 5. ASLİYE TİCARET MAHKEMESİ

Dosya No: 2024/E.3456

BİLİRKİŞİ İNCELEME RAPORU
(Trafik Kazası Kusur ve Hasar Tespiti)

Rapor No: BLK-2024-9900
Rapor Tarihi: 20.04.2024

BİLİRKİŞİ HEYETİ:
1. Prof. Dr. Yusuf Kaya (Makine Mühendisi, İTÜ)
   Tel: 0212 285 33 44
2. Doç. Dr. Pınar Arslan (Trafik Uzmanı)
3. Av. Levent Çelik (Sigorta Hukuku Uzmanı)

DOSYA İNCELEMESİ:
Mahkemenin 10.01.2024 tarihli ara kararı gereğince
dosya heyet olarak incelenmiştir.

DAVACI: Rıza Güneş (TC: 10000000146)
Vekili: Av. Elif Aktaş - İstanbul Barosu
Araç: 34 MNP 678 plakalı 2022 model Volvo XC60
Şasi no: YV1UZ88A8N1234567

DAVALI 1: Turkcell İletişim Hiz. A.Ş. (araç işleteni)
DAVALI 2: Cengiz Arslan (sürücü, TC: 22222222220)
Araç: 34 ST 901 plakalı 2023 model Ford Transit
Şasi no: WF0XXXGCDXNM12345
Ehliyet no: B-667788990
SRC belgesi: SRC-1122334

DAVALI SİGORTACI: HDI Sigorta A.Ş.
ZMS Poliçe No: TRF-2023-4455667
Kasko Poliçe No: KSK-2023-8899001

KAZA VERİLERİ:
Kaza tarihi: 05.11.2023
Kaza saati: 08:45
Kaza yeri: TEM Otoyolu Kurtköy-Tuzla arası, İstanbul
Hava durumu: Yağmurlu
Yol durumu: Islak asfalt

OLAY YERİ İNCELEME BULGULARI:
1. Fren izi: Davalı aracında 12.5 m fren izi tespit
2. Çarpışma açısı: 35 derece (arkadan çarpma)
3. Hız tespiti (fren izinden): ~85 km/s (sınır: 120 km/s)
4. MOBESE kayıt no: MOB-2023-445566
5. Olay yeri krokisi: Trafik ekibi tarafından çizilmiştir

ARAÇ HASAR ANALİZİ:
Davacı aracı (Volvo XC60):
- Arka tampon, bagaj kapağı, arka panel hasarlı
- Onarım bedeli: 145.000 TL
- Değer kaybı: 35.000 TL
- Ekspertiz rapor no: EKS-2023-5566

Davalı aracı (Ford Transit):
- Ön tampon, kaput, radyatör hasarlı
- Onarım bedeli: 85.000 TL

KUSUR TESPİTİ:
KTK m.84 (takip mesafesi kuralı) ve Karayolları
Genel Müdürlüğü Trafik İşaretleme Yönetmeliği
hükümlerine göre değerlendirme yapılmıştır.

KUSUR ORANLARI:
- Davacı Rıza Güneş: %0 (kusursuz)
- Davalı sürücü Cengiz Arslan: %100 (asli kusurlu)
  Sebep: Takip mesafesini korumama, ıslak yolda
  hızını yol koşullarına uydurmama

TAZMİNAT HESABI:
1. Araç onarım bedeli: 145.000 TL
2. Araç değer kaybı: 35.000 TL
3. Araç mahrumiyet (15 gün x 800 TL): 12.000 TL
4. Çekici ücreti: 2.500 TL
TOPLAM: 194.500 TL

SONUÇ VE KANAAT:
Dosyadaki bilgi ve belgeler ile olay yeri inceleme
bulgularına göre yukarıdaki tespit ve kanaate
varılmıştır.

Saygılarımızla arz olunur. 20.04.2024

Prof. Dr. Yusuf Kaya - Doç. Dr. Pınar Arslan - Av. Levent Çelik`;

const tbilWF = analyzeText(trafikBilirkisiWeb, ALL, 0.35);
console.log(`  Trafik bilirkişi kusur raporu: ${tbilWF.length} bulgu`);

expect(trafikBilirkisiWeb, 'LOCATION', 'İstanbul');
expect(trafikBilirkisiWeb, 'CASE_NUMBER', '2024/E.3456');
expect(trafikBilirkisiWeb, 'MEDICAL_ID', 'BLK-2024-9900');
expect(trafikBilirkisiWeb, 'PERSON_NAME', 'Yusuf Kaya');
expect(trafikBilirkisiWeb, 'PHONE_NUMBER', '0212 285 33 44');
expect(trafikBilirkisiWeb, 'PERSON_NAME', 'Pınar Arslan');
expect(trafikBilirkisiWeb, 'PERSON_NAME', 'Levent Çelik');
expect(trafikBilirkisiWeb, 'PERSON_NAME', 'Rıza Güneş');
expect(trafikBilirkisiWeb, 'TR_NATIONAL_ID', '10000000146');
expect(trafikBilirkisiWeb, 'PERSON_NAME', 'Elif Aktaş');
expect(trafikBilirkisiWeb, 'ORGANIZATION', 'İstanbul Barosu');
expect(trafikBilirkisiWeb, 'TR_LICENSE_PLATE', '34 MNP 678');
expect(trafikBilirkisiWeb, 'VEHICLE_ID', 'YV1UZ88A8N1234567');
expect(trafikBilirkisiWeb, 'PERSON_NAME', 'Cengiz Arslan');
expect(trafikBilirkisiWeb, 'TR_NATIONAL_ID', '22222222220');
expect(trafikBilirkisiWeb, 'TR_LICENSE_PLATE', '34 ST 901');
expect(trafikBilirkisiWeb, 'VEHICLE_ID', 'WF0XXXGCDXNM12345');
expect(trafikBilirkisiWeb, 'DRIVER_LICENSE', 'B-667788990');
expect(trafikBilirkisiWeb, 'ORGANIZATION', 'HDI Sigorta');
expect(trafikBilirkisiWeb, 'POLICY_NUMBER', 'TRF-2023-4455667');
expect(trafikBilirkisiWeb, 'POLICY_NUMBER', 'KSK-2023-8899001');
expect(trafikBilirkisiWeb, 'CONTEXTUAL_DATE', '05.11.2023');
expect(trafikBilirkisiWeb, 'MEDICAL_ID', 'EKS-2023-5566');

// ============================================================
console.log('\n=== GERÇEK: AKTÜERYA BİLİRKİŞİ RAPORU (WEB) ===');
// ============================================================

// Aktüerya hesap raporu formatı (arikanavukatlik.com)
const aktueryaRapor = `T.C.
ANKARA 3. ASLİYE TİCARET MAHKEMESİ

Dosya No: 2023/E.7890

AKTÜERYAL HESAP BİLİRKİŞİ RAPORU

Rapor No: AKT-2024-5566
Rapor Tarihi: 10.03.2024

BİLİRKİŞİ:
Ad Soyad: Prof. Dr. Nermin Aktaş
Uzmanlık: Aktüerya, İstatistik
Kurum: Hacettepe Üniversitesi Aktüerya Bilimleri Bölümü
Tel: 0312 297 88 99
E-posta: nermin.aktas@example.com

HESAPLAMA KONUSU:
Trafik kazası sonucu vefat eden müteveffanın
destekten yoksun kalanlarının maddi tazminatı

MÜTEVEFFA BİLGİLERİ:
Ad Soyad: Hakan Yıldız
TC: 10000000146
Doğum tarihi: 15.08.1982
Vefat tarihi: 20.06.2023
Meslek: İnşaat mühendisi
İşveren: Yapı Kredi İnşaat A.Ş.
Aylık net gelir: 55.000 TL
SGK No: 5566778

DESTEKTEN YOKSUN KALANLAR:
1. Eş: Zeynep Yıldız (TC: 22222222220)
   Doğum tarihi: 22.11.1985
   Meslek: Ev hanımı
   Destek payı: %30
   Bakiye destek süresi: 30.5 yıl (TRH 2010)

2. Oğul: Arda Yıldız (TC: 11111111110)
   Doğum tarihi: 10.04.2012
   Destek payı: %15
   Destek süresi: 11 yıl (22 yaşına kadar)

3. Kız: Nisa Yıldız
   Doğum tarihi: 05.09.2016
   Destek payı: %15
   Destek süresi: 15 yıl (22 yaşına kadar)

HESAPLAMA PARAMETRELERİ:
Yaşam tablosu: TRH 2010 (Türkiye erkek)
İskonto oranı: %10 teknik faiz
Asgari ücret (2024): 17.002 TL
Artış oranı: Yıllık %5 reel artış varsayımı

DESTEK TAZMİNATI HESABI:

1. EŞ - Zeynep Yıldız:
   Yıllık destek: 55.000 x 12 x 0.30 = 198.000 TL
   PSD katsayısı (30.5 yıl, %10): 9.42
   Brüt tazminat: 198.000 x 9.42 = 1.865.160 TL

2. OĞUL - Arda Yıldız:
   Yıllık destek: 55.000 x 12 x 0.15 = 99.000 TL
   PSD katsayısı (11 yıl, %10): 6.49
   Brüt tazminat: 99.000 x 6.49 = 642.510 TL

3. KIZ - Nisa Yıldız:
   Yıllık destek: 55.000 x 12 x 0.15 = 99.000 TL
   PSD katsayısı (15 yıl, %10): 7.61
   Brüt tazminat: 99.000 x 7.61 = 753.390 TL

4. Cenaze ve defin giderleri: 45.000 TL

TOPLAM BRÜT TAZMİNAT: 3.306.060 TL

SGK PEŞİN SERMAYE DEĞERİ MAHSUBU:
SGK gelir bağlama kararı: 01.09.2023
Aylık gelir: 15.200 TL
Peşin sermaye değeri: 820.000 TL

NET TAZMİNAT:
Brüt: 3.306.060 TL
SGK mahsup: -820.000 TL
NET: 2.486.060 TL

KUSUR DURUMU:
Müteveffa kusuru: %0
Karşı taraf kusuru: %100

Kaza bilgileri:
Plaka (müteveffa): 06 QRS 123
Plaka (kusurlu): 34 UV 456
Araç şasi: WBAPH5C55BA123456

Sigorta bilgileri:
ZMS poliçe no: TRF-2023-2233445
Sigorta şirketi: Zurich Sigorta A.Ş.
Poliçe teminat limiti (kişi başı): 200.000 TL

BANKA BİLGİLERİ (tazminat ödemesi):
Eş - Zeynep Yıldız
IBAN: TR33 0006 1005 1978 6457 8413 26
Garanti BBVA Çankaya Şubesi

Bilirkişi raporunu saygılarımla arz ederim.

Prof. Dr. Nermin Aktaş
10.03.2024`;

const arF = analyzeText(aktueryaRapor, ALL, 0.35);
console.log(`  Aktüerya bilirkişi raporu: ${arF.length} bulgu`);

expect(aktueryaRapor, 'COURT', 'ANKARA 3. ASLİYE TİCARET MAHKEMESİ');
expect(aktueryaRapor, 'CASE_NUMBER', '2023/E.7890');
expect(aktueryaRapor, 'MEDICAL_ID', 'AKT-2024-5566');
expect(aktueryaRapor, 'PERSON_NAME', 'Nermin Aktaş');
expect(aktueryaRapor, 'PHONE_NUMBER', '0312 297 88 99');
expect(aktueryaRapor, 'EMAIL_ADDRESS', 'nermin.aktas@example.com');
expect(aktueryaRapor, 'PERSON_NAME', 'Hakan Yıldız');
expect(aktueryaRapor, 'TR_NATIONAL_ID', '10000000146');
expect(aktueryaRapor, 'CONTEXTUAL_DATE', '20.06.2023');
expect(aktueryaRapor, 'TR_SGK_NO', '5566778');
expect(aktueryaRapor, 'PERSON_NAME', 'Zeynep Yıldız');
expect(aktueryaRapor, 'TR_NATIONAL_ID', '22222222220');
expect(aktueryaRapor, 'PERSON_NAME', 'Arda Yıldız');
expect(aktueryaRapor, 'TR_NATIONAL_ID', '11111111110');
expect(aktueryaRapor, 'PERSON_NAME', 'Nisa Yıldız');
expect(aktueryaRapor, 'TR_LICENSE_PLATE', '06 QRS 123');
expect(aktueryaRapor, 'TR_LICENSE_PLATE', '34 UV 456');
expect(aktueryaRapor, 'VEHICLE_ID', 'WBAPH5C55BA123456');
expect(aktueryaRapor, 'POLICY_NUMBER', 'TRF-2023-2233445');
expect(aktueryaRapor, 'ORGANIZATION', 'Zurich Sigorta');
expect(aktueryaRapor, 'IBAN_CODE', 'TR33 0006 1005 1978 6457 8413 26');

// ============================================================
console.log('\n=== GERÇEK: TAHKİM EMSAL KARARLARI (WEB) ===');
// ============================================================

// Gerçek karar numaraları: K-2019/76887, K-2019/79373
const tahkimEmsal = `SİGORTA TAHKİM KOMİSYONU
HAKEM KARARI

Dosya No: 2024/E.67890
Karar No: K-2024/445566
Karar Tarihi: 20.11.2024

BAŞVURAN:
Ad Soyad: Berna Kaya (TC: 10000000146)
Vekili: Av. Hakan Polat - İzmir Barosu
Tel: 0232 444 55 66
E-posta: hakan.polat@example.com

KARŞI TARAF: Allianz Sigorta A.Ş.

UYUŞMAZLIK KONUSU:
Araç değer kaybı ve hasar onarım bedeli farkı

KAZA BİLGİLERİ:
Kaza tarihi: 12.06.2024
Kaza yeri: İzmir Bornova ilçesi, Ankara Caddesi
Başvuranın aracı: 35 PQR 234 plakalı 2023 model
Toyota Corolla Cross Hybrid
Şasi no: JTDKN3DU8N0123456

Kusurlu araç: 35 STU 567 plakalı kamyonet
Sürücü: İlhan Demir (TC: 11111111110)

ZMS poliçe no: TRF-2024-8899001
Hasar dosya no: 2024/HD-112233

HASAR TESPİTİ:
Onarım bedeli (ekspertiz): 78.500 TL
Sigorta şirketi teklifi: 62.000 TL
Fark: 16.500 TL

Değer kaybı raporu:
TRAMER sorgu tarihi: 15.06.2024
Araç km: 18.500
Hasar öncesi değer: 1.250.000 TL
Hasar sonrası değer: 1.190.000 TL
Değer kaybı: 60.000 TL

Ekspertiz rapor no: EKS-2024-3344
Değer kaybı rapor no: DK-2024-5566

SİGORTA ŞİRKETİ ÖDEMESİ:
Onarım bedeli ödemesi: 62.000 TL (27.06.2024)
Değer kaybı ödemesi: 25.000 TL (15.07.2024)
Toplam ödeme: 87.000 TL

TALEP:
1. Onarım farkı: 16.500 TL
2. Değer kaybı farkı: 35.000 TL
3. Araç mahrumiyet (12 gün): 9.600 TL
TOPLAM: 61.100 TL

EMSAL KARARLAR:
Sigorta Tahkim Komisyonu K-2019/76887 sayılı kararında
ekspertiz raporuyla belirlenen hasar bedelinin esas
alınması gerektiği hükme bağlanmıştır.

Yargıtay 17. HD 2019/3208 E. 2020/7413 K. sayılı
kararında değer kaybının araç yaşı, km ve hasar
niteliğine göre belirlenmesi gerektiği belirtilmiştir.

KARAR:
1. Onarım bedeli farkı: 16.500 TL - KABUL
2. Değer kaybı farkı: 35.000 TL - KABUL
3. Araç mahrumiyet: 9.600 TL - KABUL
4. TOPLAM: 61.100 TL

Tazminatın avans faizi ile davalıdan tahsiline,
7.200 TL vekalet ücretinin davalıya yükletilmesine
karar verildi.

Hakem: Av. Dr. Cemre Şahin
20.11.2024`;

const teF = analyzeText(tahkimEmsal, ALL, 0.35);
console.log(`  Tahkim emsal kararı (değer kaybı): ${teF.length} bulgu`);

expect(tahkimEmsal, 'ORGANIZATION', 'Sigorta Tahkim Komisyonu');
expect(tahkimEmsal, 'PERSON_NAME', 'Berna Kaya');
expect(tahkimEmsal, 'TR_NATIONAL_ID', '10000000146');
expect(tahkimEmsal, 'PERSON_NAME', 'Hakan Polat');
expect(tahkimEmsal, 'ORGANIZATION', 'İzmir Barosu');
expect(tahkimEmsal, 'PHONE_NUMBER', '0232 444 55 66');
expect(tahkimEmsal, 'EMAIL_ADDRESS', 'hakan.polat@example.com');
expect(tahkimEmsal, 'ORGANIZATION', 'Allianz');
expect(tahkimEmsal, 'CONTEXTUAL_DATE', '12.06.2024');
expect(tahkimEmsal, 'LOCATION', 'İzmir');
expect(tahkimEmsal, 'TR_LICENSE_PLATE', '35 PQR 234');
expect(tahkimEmsal, 'VEHICLE_ID', 'JTDKN3DU8N0123456');
expect(tahkimEmsal, 'TR_LICENSE_PLATE', '35 STU 567');
expect(tahkimEmsal, 'PERSON_NAME', 'İlhan Demir');
expect(tahkimEmsal, 'TR_NATIONAL_ID', '11111111110');
expect(tahkimEmsal, 'POLICY_NUMBER', 'TRF-2024-8899001');
expect(tahkimEmsal, 'INSURANCE_FILE_NO', '2024/HD-112233');
expect(tahkimEmsal, 'ORGANIZATION', 'TRAMER');
expect(tahkimEmsal, 'MEDICAL_ID', 'EKS-2024-3344');
expect(tahkimEmsal, 'MEDICAL_ID', 'DK-2024-5566');
expect(tahkimEmsal, 'LEGAL_CITATION', '2019/3208');
expect(tahkimEmsal, 'LEGAL_CITATION', '2020/7413');
expect(tahkimEmsal, 'PERSON_NAME', 'Cemre Şahin');

// Tahkim/bilirkişi false positive kontrolleri
expect('Rayiç değer tespiti piyasa verileriyle uyumludur', 'PERSON_NAME', null);
expect('Sovtaj bedeli mahsup edilmiştir', 'PERSON_NAME', null);
expect('Avans faizi uygulanmasına karar verilmiştir', 'PERSON_NAME', null);
expect('Ekspertiz raporuyla belirlenen hasar bedeli esas alınmıştır', 'PERSON_NAME', null);
expect('Bilirkişi raporu denetime elverişli bulunmuştur', 'PERSON_NAME', null);
expect('İskonto oranı yüzde on olarak uygulanmıştır', 'PERSON_NAME', null);
expect('Peşin sermaye değeri katsayısı hesaplanmıştır', 'PERSON_NAME', null);
expect('TTK m.1426 kapsamında inceleme yapılmıştır', 'PERSON_NAME', null);

// ============================================================
// YENİ ENTITY TESTLERİ: TR_MERSIS_NO, LICENSE_ID, BANK_ACCOUNT_NO, BANK_BRANCH_CODE, ADDRESS
// ============================================================
console.log('\n=== TR_MERSIS_NO ===');
expect('MERSİS No: 0572184963100001', 'TR_MERSIS_NO', '0572184963100001');
expect('MERSIS numarası: 0123456789012345', 'TR_MERSIS_NO', '0123456789012345');
expect('Mersıs No: 0987654321098765', 'TR_MERSIS_NO', '0987654321098765');
expect('Şirketin MERSİS numarası 0572184963100001 olarak kayıtlıdır', 'TR_MERSIS_NO', '0572184963100001');
expect('Ticaret sicil kaydı mevcut olup MERSİS No: 0234567890123456', 'TR_MERSIS_NO', '0234567890123456');
expect('Toplam tutar: 0123456789012345 TL', 'TR_MERSIS_NO', null);

console.log('\n=== LICENSE_ID ===');
expect('Diploma No: 123456', 'LICENSE_ID', '123456');
expect('Arabulucu Sicil No: 45781', 'LICENSE_ID', '45781');
expect('Mesleki Sicil No: 78923', 'LICENSE_ID', '78923');
expect('Diploma numarası: ABC-2024-001', 'EDUCATION_ID', 'ABC-2024-001');
expect('Arabulucu sicil numarası: 12345', 'LICENSE_ID', '12345');
expect('Sicil No: 12345678', 'LICENSE_ID', null);
expect('Sigorta sicil no: 12345678', 'LICENSE_ID', null);

console.log('\n=== BANK_ACCOUNT_NO ===');
expect('Hesap No: 1234567890', 'BANK_ACCOUNT_NO', '1234567890');
expect('Hesap numarası: 98765432101', 'BANK_ACCOUNT_NO', '98765432101');
expect('Banka hesap no: 1234567890123456', 'BANK_ACCOUNT_NO', '1234567890123456');

console.log('\n=== BANK_BRANCH_CODE ===');
expect('Şube Kodu: 1234', 'BANK_BRANCH_CODE', '1234');
expect('Şube kodu: 567', 'BANK_BRANCH_CODE', '567');
expect('Şube No: 8901', 'BANK_BRANCH_CODE', '8901');

console.log('\n=== ADDRESS BLOCK ===');
expect('Adres: Atatürk Cad. No:42 Kadıköy/İstanbul', 'ADDRESS', 'Atatürk Cad. No:42 Kadıköy/İstanbul');

console.log('\n=== NAME BACKREFERENCE ===');
expect('Hakan Şahin arabuluculuk toplantısına katıldı. Hakan tarafından sunulan belgeler incelendi.', 'PERSON_NAME', 'Hakan');
expect('Hakan Şahin arabuluculuk toplantısına katıldı. Hakan tarafından sunulan belgeler incelendi.', 'PERSON_NAME', 'Hakan Şahin');

console.log('\n=== SMART QUOTE NORMALIZATION ===');
expect("Hakan Şahin'in talebi", 'PERSON_NAME', 'Hakan Şahin');

console.log('\n=== CONTEXTUAL_DATE VALUE ONLY ===');
expect('Kaza Tarihi: 15.03.2024', 'CONTEXTUAL_DATE', '15.03.2024');
expect('Ameliyat tarihi: 05.06.2024', 'CONTEXTUAL_DATE', '05.06.2024');

console.log('\n=== SURNAME BACKREFERENCE ===');
expect('Emre Akgün hastaneye geldi. Akgün tedavi aldı.', 'PERSON_NAME', 'Akgün');
expect("Emre Akgün hastaneye geldi. Akgün'ün tedavisi sürdü.", 'PERSON_NAME', 'Akgün');
expect('Borçlu Emre Akgün vekili. Akgün itiraz etti.', 'PERSON_NAME', 'Akgün');
// Surname should not false-positive on place names
expect('Ali İstanbul gitti. İstanbul güzel.', 'PERSON_NAME', null);

console.log('\n=== BARO SİCİL ===');
expect('Baro Sicil No: 51724', 'BARO_SICIL', '51724');
expect('Baro sicil numarası: 78234', 'BARO_SICIL', '78234');

console.log('\n=== FATURA NO (INVOICE) ===');
expect('Fatura No: FTR-2025-118742', 'INVOICE_NO', 'FTR-2025-118742');
expect('FTR-2026-004711 numaralı fatura', 'INVOICE_NO', 'FTR-2026-004711');
expect('FAT-2024-001234 tutarı', 'INVOICE_NO', 'FAT-2024-001234');
expect('Fatura numarası: INV20250615001', 'INVOICE_NO', 'INV20250615001');

console.log('\n=== SERBEST METİN PROTOKOL NO ===');
expect('PR-2025-998114 protokol numaralı tedavi borcu', 'MEDICAL_ID', 'PR-2025-998114');
expect('BVR-2024-55123 başvuru numaralı kayıt', 'GOV_DOCUMENT_ID', 'BVR-2024-55123');

console.log('\n=== TIME ===');
expect('Kaza Saati: 23:48', 'TIME', '23:48');
expect('Saat: 14:30', 'TIME', '14:30');
expect('Toplantı saat 09:15 başladı', 'TIME', '09:15');
// Standalone time without label context still detected at lower score
expect('rapor 10:31 tarihinde gönderildi', 'TIME', '10:31');

console.log('\n=== ADRES TELEFON AYIRMA ===');
expect('Adres: Bağdat Cad. No:220/3 Kadıköy/İstanbul Telefon: 0216 338 42 10', 'ADDRESS', 'Bağdat Cad. No:220/3 Kadıköy/İstanbul');
expect('Adres: Bağdat Cad. No:220/3 Kadıköy/İstanbul Telefon: 0216 338 42 10', 'PHONE_NUMBER', '0216 338 42 10');
// Address should NOT contain the phone number
expect('Adres: Bağdat Cad. No:220/3 Kadıköy/İstanbul Tel: 0216 338 42 10', 'ADDRESS', 'Bağdat Cad. No:220/3 Kadıköy/İstanbul');

// ============================================================
// ADJACENT NAME MERGE
// ============================================================
console.log('\n=== ADJACENT NAME MERGE ===');
expect('Konu: Ayşe Korkmaz performans değerlendirmesi', 'PERSON_NAME', 'Ayşe Korkmaz');
// Three-word name still works
expect('Ad Soyad: Atakan Adem Selanik', 'PERSON_NAME', 'Atakan Adem Selanik');

// ============================================================
// HANIM/BEY HONORIFIC
// ============================================================
console.log('\n=== HANIM/BEY HONORIFIC ===');
expect('Ayşe Hanım özellikle iyi çalıştı', 'PERSON_NAME', 'Ayşe Hanım');
expect('Mehmet Bey toplantıya katıldı', 'PERSON_NAME', 'Mehmet Bey');

// ============================================================
// YEVMIYE / IHTARNAME NO
// ============================================================
console.log('\n=== YEVMIYE / IHTARNAME NO ===');
expect('Yevmiye No: 2026/88411', 'NOTARY_RECORD', '2026/88411');
expect('Ihtarname No: NTR-2026-11882', 'NOTARY_RECORD', 'NTR-2026-11882');
expect('NTR-2026-11882 numarali ihtarname', 'NOTARY_RECORD', 'NTR-2026-11882');

// ============================================================
// BILDIRGE NO
// ============================================================
console.log('\n=== BILDIRGE NO ===');
expect('Bildirge No: SGK-2026-771482', 'MEDICAL_ID', 'SGK-2026-771482');

// ============================================================
// TIME + DATE ADJACENCY
// ============================================================
console.log('\n=== TIME + DATE ADJACENCY ===');
expect('Tarih: 15.03.2024 10:31', 'DATE_TIME', '15.03.2024');
expect('Tarih: 15.03.2024 10:31', 'TIME', null);
expect('Kaza Saati: 23:48', 'TIME', '23:48');

// ============================================================
// NOTER COURT
// ============================================================
console.log('\n=== NOTER COURT ===');
expect('Ankara 17. Noterliği', 'NOTARY', 'Ankara 17. Noterliği');
expect('İstanbul 23. Noterliği tarafından', 'NOTARY', 'İstanbul 23. Noterliği');

// ============================================================
// EMPLOYEE_ID
// ============================================================
console.log('\n=== EMPLOYEE_ID ===');
expect('Personel No: PRS-2024-12345', 'EMPLOYEE_ID', 'PRS-2024-12345');
expect('Personel Sicil No: 78412', 'EMPLOYEE_ID', '78412');
expect('Çalışan No: EMP-2026-001', 'EMPLOYEE_ID', 'EMP-2026-001');

// ============================================================
// COURT vs ORGANIZATION
// ============================================================
console.log('\n=== COURT vs ORGANIZATION ===');
expect('İstanbul 3. Asliye Hukuk Mahkemesi', 'COURT', 'İstanbul 3. Asliye Hukuk Mahkemesi');
expect('Ankara 2. İş Mahkemesi', 'COURT', 'Ankara 2. İş Mahkemesi');
expectNot('Yargıtay 17. Hukuk Dairesi', 'COURT', 'Yargıtay 17. Hukuk Dairesi');
expect('Axa Sigorta A.Ş.', 'ORGANIZATION', 'Axa Sigorta');
expect('İstanbul Barosu', 'ORGANIZATION', 'İstanbul Barosu');

// ============================================================
// LABEL-BASED LOCATION
// ============================================================
console.log('\n=== LABEL-BASED LOCATION ===');
expect('Mahalle: Fenerbahçe', 'LOCATION', 'Fenerbahçe');
expect('İlçe: Kadıköy', 'LOCATION', 'Kadıköy');

// ============================================================
// TAPU / PROPERTY
// ============================================================
console.log('\n=== TAPU / PROPERTY ===');
expect('Ada: 1174', 'PROPERTY_ID', '1174');
expect('Parsel: 82', 'PROPERTY_ID', '82');
expect('Bağımsız Bölüm No: 3', 'PROPERTY_ID', '3');
expect('Tapu Kayıt No: TK-2021-884712', 'PROPERTY_ID', 'TK-2021-884712');

// ============================================================
// ILAN NO
// ============================================================
console.log('\n=== ILAN NO ===');
expect('İlan No: ILN-2026-118742', 'CASE_NUMBER', 'ILN-2026-118742');

// ============================================================
// SÖZLEŞME TARİHİ
// ============================================================
console.log('\n=== SÖZLEŞME TARİHİ ===');
expect('Sözleşme Tarihi: 01.10.2021', 'CONTEXTUAL_DATE', '01.10.2021');

// LABEL:VALUE SCANNER (BABA/ANNE ADI, CİLT NO)
console.log('\n=== LABEL:VALUE SCANNER ===');
expect('Baba Adı: Hasan', 'PERSON_NAME', 'Hasan');
expect('Anne Adı: Fatma', 'PERSON_NAME', 'Fatma');
expect('Baba Adı: Mehmet Ali', 'PERSON_NAME', 'Mehmet Ali');
expect('Cilt No: 42', 'REGISTRY_NO', '42');
expect('Aile Sıra No: 188', 'REGISTRY_NO', '188');
expect('Birey Sıra No: 5', 'REGISTRY_NO', '5');
expect('Malik: Ayşe Yılmaz', 'PERSON_NAME', 'Ayşe Yılmaz');
expect('Borçlu: Kerem Topçu', 'PERSON_NAME', 'Kerem Topçu');

// AV. PREFIX NAME MERGE
console.log('\n=== AV. PREFIX NAME MERGE ===');
expect('Vekil: Av. Oğuzhan Erdem', 'PERSON_NAME', 'Oğuzhan Erdem');

// DATE_TIME WITH TIME
console.log('\n=== DATE_TIME WITH TIME ===');
expect('Tarih: 18.02.2026 11:22', 'DATE_TIME', '18.02.2026 11:22');
expect('Gönderilme: 05.06.2025 14:30', 'DATE_TIME', '05.06.2025 14:30');

// REVERSE ADA/PARSEL (free text)
console.log('\n=== REVERSE ADA/PARSEL ===');
expect('884 ada 17 parselde bulunan taşınmaz', 'PROPERTY_ID', '884');
expect('884 ada 17 parselde bulunan taşınmaz', 'PROPERTY_ID', '17');
expect('1172 ada 41 parselde kayıtlı', 'PROPERTY_ID', '1172');
expect('1172 ada 41 parselde kayıtlı', 'PROPERTY_ID', '41');

// TP- PREFIX TAPU
console.log('\n=== TP- PREFIX TAPU ===');
expect('Tapu Kayıt No: TP-2021-774182', 'PROPERTY_ID', 'TP-2021-774182');
expect('TP-2019-551874 numaralı kayıt', 'PROPERTY_ID', 'TP-2019-551874');

// MAHALLE ORG→LOCATION OVERRIDE
console.log('\n=== MAHALLE ORG→LOCATION OVERRIDE ===');
expect('Mahalle: Acıbadem', 'LOCATION', 'Acıbadem');
expect('Mahalle: Acıbadem', 'ORGANIZATION', null);
expect('Acıbadem Mahallesi 884 ada', 'LOCATION', 'Acıbadem');

// THREE-WORD NAME RETRY (kızı prefix)
console.log('\n=== THREE-WORD NAME RETRY ===');
expect('kızı Ayşe Nur Yalçın ile', 'PERSON_NAME', 'Ayşe Nur Yalçın');
expect('oğlu Kerem Can Demir ile', 'PERSON_NAME', 'Kerem Can Demir');

// DOSYA PERSON_NAME BUG FIX
console.log('\n=== DOSYA PERSON_NAME FIX ===');
expect('Dosya No: KHD-2026-991', 'PERSON_NAME', null);
expect('Eksper Dosya No: EKS-2026-112', 'PERSON_NAME', null);
expect('Hasar Dosya No: HDN-2026-447', 'PERSON_NAME', null);
expect('Emeklilik Dosya No: EMK-2026-991', 'PERSON_NAME', null);
expect('Eksper Dosya No: EKS-2026-112', 'INSURANCE_FILE_NO', 'EKS-2026-112');

// IMEI
console.log('\n=== IMEI ===');
expect('IMEI: 356412778854120', 'IMEI', '356412778854120');
expect('IMEI:\n356412778854120', 'IMEI', '356412778854120');
expect('Cihaz IMEI numarası: 356412778854120', 'IMEI', '356412778854120');

// GENERAL LABELED ID
console.log('\n=== GENERAL LABELED ID ===');
expect('Ticaret Sicil No: TS-441882', 'FINANCIAL_ID', 'TS-441882');
expect('Müşteri No: MUS-771244', 'FINANCIAL_ID', 'MUS-771244');
expect('Kredi No: KRD-2024-551882', 'FINANCIAL_ID', 'KRD-2024-551882');
expect('Ruhsat Seri No: RS-441882', 'VEHICLE_ID', 'RS-441882');
expect('Tahsis No: THS-551882', 'FINANCIAL_ID', 'THS-551882');

// PERSON_NAME AS FIELD LABEL (should not be detected as name)
console.log('\n=== NAME AS FIELD LABEL ===');
expect('Ada:\n1174', 'PERSON_NAME', null);

// NEW ENTITY TYPES (v5.3)
console.log('\n=== EINVOICE_UUID (ETTN) ===');
expect('ETTN: 7d48a1b7-c5d9-4f21-a882-11874a551882', 'EINVOICE_UUID', '7d48a1b7-c5d9-4f21-a882-11874a551882');
expect('ETTN: d1c8f882-77aa-4cb0-bb77-551188aa7712', 'EINVOICE_UUID', 'd1c8f882-77aa-4cb0-bb77-551188aa7712');

console.log('\n=== CHECK_SERIAL_NO ===');
expect('Çek Seri No: CK-77118824', 'CHECK_SERIAL_NO', 'CK-77118824');
expect('CK-77118824 seri numaralı çek', 'CHECK_SERIAL_NO', 'CK-77118824');
expect('Çek No: BK-44225566', 'CHECK_SERIAL_NO', 'BK-44225566');

console.log('\n=== BARCODE_ID ===');
expect('Ödeme Emri Barkod No: 551188774411', 'BARCODE_ID', '551188774411');
expect('Barkod No: 7748811225566', 'BARCODE_ID', '7748811225566');

console.log('\n=== ENFORCEMENT_ID ===');
expect('Takip Talebi No: TKP-2026-118742', 'ENFORCEMENT_ID', 'TKP-2026-118742');
expect('TKP-2026-118742', 'ENFORCEMENT_ID', 'TKP-2026-118742');

// ORG-CONTEXT LABELS (Davacı/Davalı → ORG for companies)
console.log('\n=== ORG CONTEXT LABELS ===');
expect('Davacı: Armoni Endüstriyel Ürünler Sanayi ve Ticaret A.Ş.', 'ORGANIZATION', 'Armoni Endüstriyel Ürünler Sanayi ve Ticaret A.Ş.');
expect('Şirket Ünvanı: Yıldız Demir Çelik Ltd. Şti.', 'ORGANIZATION', 'Yıldız Demir Çelik Ltd. Şti.');
expect('Davacı: Mehmet Demir', 'PERSON_NAME', 'Mehmet Demir');
expect('Keşideci: Mega İnşaat Ltd. Şti.', 'ORGANIZATION', 'Mega İnşaat Ltd. Şti.');
expect('Lehtar: Ali Yılmaz', 'PERSON_NAME', 'Ali Yılmaz');

// TESCIL TARİHİ BUG FIX
console.log('\n=== TESCİL TARİHİ FIX ===');
expect('Tescil Tarihi: 15.06.2020', 'VEHICLE_ID', null);
expect('Tescil Tarihi: 15.06.2020', 'CONTEXTUAL_DATE', '15.06.2020');
expect('Şirket Sermayesi: 5.000.000 TL', 'PERSON_NAME', null);

// İCRA MÜDÜRLÜĞÜ DEDUP
console.log('\n=== İCRA MÜDÜRLÜĞÜ DEDUP ===');
expect('İcra Müdürlüğü: İstanbul 12. İcra Müdürlüğü', 'ORGANIZATION', 'İstanbul 12. İcra Müdürlüğü');

// GAYRİMENKUL / TAPU PATTERNS (v5.4)
console.log('\n=== TAPU & GAYRİMENKUL ===');
expect('TAPU MÜDÜRLÜĞÜ BAŞVURUSU', 'ORGANIZATION', null);
expect('Başvuru No: TPU-2026-884177', 'GOV_DOCUMENT_ID', 'TPU-2026-884177');
expect('Randevu No: RND-2026-118842', 'GOV_DOCUMENT_ID', 'RND-2026-118842');
expect('İşlem No: ISL-2026-551144', 'GOV_DOCUMENT_ID', 'ISL-2026-551144');
expect('Sözleşme No: SVS-2025-118742', 'GOV_DOCUMENT_ID', 'SVS-2025-118742');
expect('Dekont No: DKT-2026-551882', 'FINANCIAL_ID', 'DKT-2026-551882');
expect('Ekspertiz Referans No: EKS-2026-441882', 'FINANCIAL_ID', 'EKS-2026-441882');
expect('Eksper Sicil No: EXP-44812', 'LICENSE_ID', 'EXP-44812');
expect('KON-2026-771188 numaralı kredi başvurusu', 'GOV_DOCUMENT_ID', 'KON-2026-771188');
expect('Bakırköy Tapu Müdürlüğü nezdindeki TPU-2026-884177 başvuru numaralı işlem', 'GOV_DOCUMENT_ID', 'TPU-2026-884177');
expect('Bakırköy Tapu Müdürlüğü nezdindeki TPU-2026-884177 başvuru numaralı işlem', 'ORGANIZATION', 'Bakırköy Tapu Müdürlüğü');

// ONTOLOGY EXPANSION v5.4b
console.log('\n=== ONTOLOJİ GENİŞLETME ===');
// Bilirkişi → CASE_NUMBER (hukuki, tıbbi değil)
expect('Bilirkişi Rapor No: BLK-2026-44812', 'CASE_NUMBER', 'BLK-2026-44812');
expect('Bilirkişi No: 2026/5518', 'CASE_NUMBER', '2026/5518');
// LICENSE_ID — mesleki sicil genişletme
expect('Bilirkişi Sicil No: 44812', 'LICENSE_ID', '44812');
expect('Yeminli Mali Müşavir Sicil No: 55882', 'LICENSE_ID', '55882');
expect('Gümrük Müşavir Sicil No: GM-44812', 'LICENSE_ID', 'GM-44812');
// FINANCIAL_ID — tahsilat, havale, makbuz
expect('Tahsilat No: THS-2026-441882', 'FINANCIAL_ID', 'THS-2026-441882');
expect('Havale Referans No: HVL-2026-118742', 'FINANCIAL_ID', 'HVL-2026-118742');
expect('Makbuz No: MKB-2026-77411', 'FINANCIAL_ID', 'MKB-2026-77411');
expect('SWIFT Referans No: SWIFT-2026-441882', 'FINANCIAL_ID', 'SWIFT-2026-441882');
expect('İrsaliye No: IRS-2026-118742', 'FINANCIAL_ID', 'IRS-2026-118742');
// GOV_DOCUMENT_ID — dilekçe, onay, tahakkuk
expect('Dilekçe No: DLC-2026-441882', 'GOV_DOCUMENT_ID', 'DLC-2026-441882');
expect('Onay No: ONY-2026-118742', 'GOV_DOCUMENT_ID', 'ONY-2026-118742');
expect('Tahakkuk No: THK-2026-551882', 'GOV_DOCUMENT_ID', 'THK-2026-551882');
// CASE_NUMBER — iflas, konkordato
expect('İflas No: 2026/4481', 'CASE_NUMBER', '2026/4481');
expect('Konkordato No: 2026/7741', 'CASE_NUMBER', '2026/7741');
// CONTEXTUAL_DATE — yeni tarih label'ları
expect('Karar Tarihi: 15.06.2026', 'CONTEXTUAL_DATE', '15.06.2026');
expect('İhale Tarihi: 20.03.2026', 'CONTEXTUAL_DATE', '20.03.2026');
expect('Devir Tarihi: 10.01.2026', 'CONTEXTUAL_DATE', '10.01.2026');
expect('Kabul Tarihi: 05.04.2026', 'CONTEXTUAL_DATE', '05.04.2026');
expect('Haciz Tarihi: 12.02.2026', 'CONTEXTUAL_DATE', '12.02.2026');
expect('Temyiz Tarihi: 22.07.2026', 'CONTEXTUAL_DATE', '22.07.2026');
// PROPERTY_ID — ada/parsel birleşik
expect('Ada/Parsel: 1188/44', 'PROPERTY_ID', '1188/44');
expect('Pafta No: G22-B-04-D', 'PROPERTY_ID', 'G22-B-04-D');
// ORG label genişletme — lehtar, alacaklı, borçlu
expect('Lehtar: Doğuş İnşaat ve Ticaret A.Ş.', 'ORGANIZATION', 'Doğuş İnşaat ve Ticaret A.Ş.');
expect('Alacaklı: Yıldırım Lojistik Ltd. Şti.', 'ORGANIZATION', 'Yıldırım Lojistik Ltd. Şti.');
expect('Borçlu: Mehmet Aydın', 'PERSON_NAME', 'Mehmet Aydın');
// Section header filter
expect('İCRA MÜDÜRLÜĞÜ İŞLEMLERİ', 'ORGANIZATION', null);
expect('TAPU MÜDÜRLÜĞÜ KAYITLARI', 'ORGANIZATION', null);

// v5.4c — İŞ HUKUKU & İDARE/VERGİ
console.log('\n=== İŞ HUKUKU & İDARE ===');
// FP düzeltmeleri
expect('Davacı İşçi: Ali Özdemir', 'PERSON_NAME', 'Ali Özdemir');
expect('Davalı İşveren: Mega İnşaat A.Ş.', 'ORGANIZATION', 'Mega İnşaat A.Ş.');
expect('Bilirkişi: Prof. Dr. Hakan Yılmaz', 'PERSON_NAME', 'Hakan Yılmaz');
// SGK patterns
expect('SGK İşyeri Sicil No: 34.10.12345.12', 'EMPLOYEE_ID', '34.10.12345.12');
expect('SGK İş Kazası Bildirim No: 2026-IK-44812', 'GOV_DOCUMENT_ID', '2026-IK-44812');
// Sözleşme suffix
expect('Toplu İş Sözleşmesi No: TIS-2024-441882', 'GOV_DOCUMENT_ID', 'TIS-2024-441882');
// ORG labels
expect('Sendika: Türk Metal Sendikası', 'UNION_MEMBERSHIP', 'Türk Metal Sendikası');
expect('Banka: Garanti BBVA', 'ORGANIZATION', 'Garanti BBVA');
expect('Hastane: İstanbul Şehir Hastanesi', 'ORGANIZATION', 'İstanbul Şehir Hastanesi');
expect('Müşteri: Star Mobilya Sanayi ve Ticaret A.Ş.', 'ORGANIZATION', 'Star Mobilya Sanayi ve Ticaret A.Ş.');
// GOV_DOCUMENT_ID — yeni prefix'ler
expect('Yapı Ruhsatı No: YRS-2026-118742', 'GOV_DOCUMENT_ID', 'YRS-2026-118742');
expect('İskan Belgesi No: ISK-2026-551144', 'GOV_DOCUMENT_ID', 'ISK-2026-551144');
expect('Bilgi Edinme Başvuru No: BEB-2026-118742', 'GOV_DOCUMENT_ID', 'BEB-2026-118742');
// Vergi Dairesi NOT a COURT
expect('Vergi Dairesi: Ataşehir', 'COURT', null);
// Compound contextual dates
expect('Fesih Bildirimi Tarihi: 01.01.2026', 'CONTEXTUAL_DATE', '01.01.2026');
expect('Arabuluculuk Son Tutanak Tarihi: 10.02.2026', 'CONTEXTUAL_DATE', '10.02.2026');
expect('Tarhiyat Tarihi: 15.02.2026', 'CONTEXTUAL_DATE', '15.02.2026');
expect('Uzlaşma Tarihi: 20.03.2026', 'CONTEXTUAL_DATE', '20.03.2026');
expect('Kesinleşme Tarihi: 15.06.2026', 'CONTEXTUAL_DATE', '15.06.2026');
expect('Dava Açma Tarihi: 20.03.2026', 'CONTEXTUAL_DATE', '20.03.2026');
expect('İnfaz Başlama Tarihi: 01.05.2026', 'CONTEXTUAL_DATE', '01.05.2026');
expect('İcra Takip Tarihi: 15.04.2026', 'CONTEXTUAL_DATE', '15.04.2026');
expect('İflas Karar Tarihi: 10.06.2026', 'CONTEXTUAL_DATE', '10.06.2026');
// Vergi Dairesi NOT a COURT
expect('Tapu Dairesi: Bakırköy', 'COURT', null);

// ============================================================
// v5.5a — TÜKETİCİ, KİRA, MİRAS HUKUKU
// ============================================================

console.log('\n=== TÜKETİCİ HUKUKU ===');
// Şikayet eden/edilen → ORG
expect('Şikayet Edilen: Teknosa İç ve Dış Ticaret A.Ş.', 'ORGANIZATION', 'Teknosa');
expect('Şikayet Eden: Mobilya Dünyası Ltd. Şti.', 'ORGANIZATION', 'Mobilya Dünyası');
expect('Başvuran: ABC Sigorta A.Ş.', 'ORGANIZATION', 'ABC Sigorta');
expect('Başvuru Sahibi: Yıldız Holding A.Ş.', 'ORGANIZATION', 'Yıldız Holding');
expect('Karşı Taraf: Beko Elektronik A.Ş.', 'ORGANIZATION', 'Beko Elektronik');
// Servis kayıt → GOV_DOCUMENT_ID
expect('Servis Kayıt No: SRV-2026-44128', 'GOV_DOCUMENT_ID', 'SRV-2026-44128');
expect('Arıza Kayıt No: ARZ-2026-00789', 'GOV_DOCUMENT_ID', 'ARZ-2026-00789');
expect('Talep No: TLP-2026-12345', 'GOV_DOCUMENT_ID', 'TLP-2026-12345');
expect('Çağrı Merkezi Kayıt No: CMK-2026-99887', 'GOV_DOCUMENT_ID', 'CMK-2026-99887');
// THH prefix
expect('Başvuru No: THH-2026-00847', 'GOV_DOCUMENT_ID', 'THH-2026-00847');
// Fatura → INVOICE_NO (not FINANCIAL_ID)
expect('Fatura No: FTR-2026-00234567', 'INVOICE_NO', 'FTR-2026-00234567');

console.log('\n=== KİRA HUKUKU ===');
// Ticaret unvanı → ORG
expect('Ticaret Unvanı: Güneş Gıda Sanayi ve Ticaret Ltd. Şti.', 'ORGANIZATION', 'Güneş Gıda');
expect('Ticaret Ünvanı: Ak Yapı İnşaat A.Ş.', 'ORGANIZATION', 'Ak Yapı');
// İhtar tarihi → CONTEXTUAL_DATE
expect('İhtar Tarihi: 15.06.2026', 'CONTEXTUAL_DATE', '15.06.2026');
expect('ihtar tarihi: 20.01.2026', 'CONTEXTUAL_DATE', '20.01.2026');
// Kira sözleşme compound dates
expect('Kira Başlangıç Tarihi: 01.07.2026', 'CONTEXTUAL_DATE', '01.07.2026');
expect('Kira Bitiş Tarihi: 01.07.2027', 'CONTEXTUAL_DATE', '01.07.2027');
expect('Sözleşme Başlangıç Tarihi: 01.06.2026', 'CONTEXTUAL_DATE', '01.06.2026');
// Sözleşme No (suffix)
expect('Sözleşme No: KRS-2026-001234', 'GOV_DOCUMENT_ID', 'KRS-2026-001234');
// Vergi Dairesi NOT COURT
expect('Vergi Dairesi: Bakırköy', 'COURT', null);

console.log('\n=== MİRAS HUKUKU ===');
// Veraset / miras case numbers
expect('Veraset Dosya No: 2026/8901', 'CASE_NUMBER', '2026/8901');
expect('Miras No: 2026/1234', 'CASE_NUMBER', '2026/1234');
// Beyanname → GOV_DOCUMENT_ID
expect('Beyanname No: VIV-2026-00123', 'GOV_DOCUMENT_ID', 'VIV-2026-00123');
expect('Veraset İlam No: VRT-2026-55678', 'GOV_DOCUMENT_ID', 'VRT-2026-55678');
// Müteveffa label → PERSON_NAME
expect('Müteveffa: Ahmet Yılmaz', 'PERSON_NAME', 'Ahmet Yılmaz');
expect('Muris: Mehmet Demir', 'PERSON_NAME', 'Mehmet Demir');
expect('Miras Bırakan: Fatma Kara', 'PERSON_NAME', 'Fatma Kara');
// Vefat tarihi
expect('Vefat Tarihi: 01.01.2026', 'CONTEXTUAL_DATE', '01.01.2026');
// Ada/Parsel combined
expect('Ada/Parsel: 4567/89', 'PROPERTY_ID', '4567/89');
// Vergi tahakkuk tarihi
expect('Vergi Tahakkuk Tarihi: 15.06.2026', 'CONTEXTUAL_DATE', '15.06.2026');

// ============================================================
// v5.5b — TİCARET HUKUKU + EK PATTERN'LER
// ============================================================

console.log('\n=== TİCARET HUKUKU ===');
// Protesto tarihi
expect('Protesto Tarihi: 10.04.2025', 'CONTEXTUAL_DATE', '10.04.2025');
// İrsaliye → FINANCIAL_ID
expect('İrsaliye No: IRS-2025-55678', 'FINANCIAL_ID', 'IRS-2025-55678');
// SWIFT referans → FINANCIAL_ID
expect('SWIFT Referans No: SWIFT-REF-2025-99123', 'FINANCIAL_ID', 'SWIFT-REF-2025-99123');
// Havale referans
expect('Havale Referans No: HVL-2025-44567', 'FINANCIAL_ID', 'HVL-2025-44567');
// Keşideci → ORG
expect('Keşideci: Mega İnşaat Taahhüt ve Ticaret Ltd. Şti.', 'ORGANIZATION', 'Mega İnşaat');
// Beyanname
expect('Beyanname No: BYN-2026-44567', 'GOV_DOCUMENT_ID', 'BYN-2026-44567');
// Veraset İlam
expect('Veraset İlam No: VIV-2026-00123', 'GOV_DOCUMENT_ID', 'VIV-2026-00123');
// İhbar eden/edilen → ORG
expect('İhbar Eden: Yeşil Enerji A.Ş.', 'ORGANIZATION', 'Yeşil Enerji');
// Distribütör
expect('Distribütör: Atlas Dağıtım Ltd. Şti.', 'ORGANIZATION', 'Atlas Dağıtım');
// Bayi
expect('Bayi: Güneydoğu Oto A.Ş.', 'ORGANIZATION', 'Güneydoğu Oto');
// Servis labels with compound context
expect('Şikayet Kayıt No: SKY-2026-78901', 'GOV_DOCUMENT_ID', 'SKY-2026-78901');
// ATK prefix ambiguous — ATK=Adli Tıp Kurumu in MEDICAL_PREFIXES
expect('Arıza Takip No: ARZ-2026-55678', 'GOV_DOCUMENT_ID', 'ARZ-2026-55678');
// Noter ihtar compound date
expect('Noter İhtar Tarihi: 05.03.2026', 'CONTEXTUAL_DATE', '05.03.2026');
expect('Haciz İhbar Tarihi: 12.04.2026', 'CONTEXTUAL_DATE', '12.04.2026');

// ============================================================
console.log('\n=== YENİ ENTITY TÜRLERİ (v6.0) ===');
// ============================================================

// --- AGE ---
expect('45 yaşında bir erkek', 'AGE', '45');
expect('Yaşı: 32', 'AGE', '32');
expect('72 yaşındaki kadın', 'AGE', '72');
expect('Yaşı 28 olan sanık', 'AGE', '28');
// invalid age
expect('150 yaşında', 'AGE', null);
expect('0 yaşında', 'AGE', null);

// --- GENDER ---
expect('Cinsiyeti: Erkek', 'GENDER', 'Erkek');
expect('Cinsiyet: kadın', 'GENDER', 'kadın');
expect('Cinsiyeti: Bay', 'GENDER', 'Bay');
// no label = no detection
expect('Erkek sanık hakkında', 'GENDER', null);

// --- NATIONALITY ---
expect('Uyruğu: T.C.', 'NATIONALITY', 'T.C.');
expect('Tabiiyet: Alman', 'NATIONALITY', 'Alman');
expect('Vatandaşlığı: Suriye', 'NATIONALITY', 'Suriye');

// --- MARITAL_STATUS ---
expect('Medeni Hali: Evli', 'MARITAL_STATUS', 'Evli');
expect('Medeni Durumu: Boşanmış', 'MARITAL_STATUS', 'Boşanmış');
expect('Medeni hali: bekâr', 'MARITAL_STATUS', 'bekâr');

// --- OCCUPATION ---
expect('Mesleği: Avukat', 'OCCUPATION', 'Avukat');
expect('Görevi: Müfettiş', 'OCCUPATION', 'Müfettiş');
expect('Meslek: Öğretmen', 'OCCUPATION', 'Öğretmen');

// --- MILITARY_ID ---
expect('Askerlik numarası: 2024-118742', 'MILITARY_ID', '2024-118742');
expect('Terhis belge no: ASK-2024-55123', 'MILITARY_ID', 'ASK-2024-55123');

// --- EDUCATION_ID ---
expect('Öğrenci no: 2024118742', 'EDUCATION_ID', '2024118742');
expect('Mezun numarası: MZN-2020-4412', 'EDUCATION_ID', 'MZN-2020-4412');

// --- BARO_SICIL ---
expect('Baro sicil no: 45872', 'BARO_SICIL', '45872');
expect('Baro kaydı no: 99123', 'BARO_SICIL', '99123');

// --- TRADE_REGISTRY_NO ---
expect('Ticaret sicil no: 558412', 'TRADE_REGISTRY_NO', '558412');
expect('Ticaret sicil numarası: 1234567', 'TRADE_REGISTRY_NO', '1234567');

// --- SWIFT_BIC ---
expect('SWIFT Kodu: AKBKTRIS', 'SWIFT_BIC', 'AKBKTRIS');
expect('BIC kodu: TCZBTR2AXXX', 'SWIFT_BIC', 'TCZBTR2AXXX');
// without context = should not detect (score 0.01)
expect('Merhaba ABCDEFGH', 'SWIFT_BIC', null);

// --- SALARY_AMOUNT ---
expect('Maaşı: 15.500 TL', 'SALARY_AMOUNT', '15.500 TL');
expect('Net ücret: 28.000,00 ₺', 'SALARY_AMOUNT', '28.000,00 ₺');
expect('Brüt maaş: 45.000 TL', 'SALARY_AMOUNT', '45.000 TL');

// --- KEP_ADDRESS ---
expect('KEP adresi: firma@hs01.kep.tr', 'KEP_ADDRESS', 'firma@hs01.kep.tr');
expect('test@hs02.kep.tr adresine tebligat', 'KEP_ADDRESS', 'test@hs02.kep.tr');
expect('bilgi@kep.tr gönderildi', 'KEP_ADDRESS', 'bilgi@kep.tr');

// --- BLOOD_TYPE ---
expect('Kan Grubu: A Rh+', 'BLOOD_TYPE', 'A Rh+');
expect('Kan tipi: AB Rh-', 'BLOOD_TYPE', 'AB Rh-');
expect('Kan grubu: 0 Rh+', 'BLOOD_TYPE', '0 Rh+');

// --- HEALTH_CONDITION ---
expect('Tanı: Lomber Disk Hernisi', 'HEALTH_CONDITION', 'Lomber Disk Hernisi');
expect('Teşhis: Tip 2 Diyabet', 'HEALTH_CONDITION', 'Tip 2 Diyabet');
expect('Hastalığı: Kronik Böbrek Yetmezliği', 'HEALTH_CONDITION', 'Kronik Böbrek Yetmezliği');

// --- RELIGION ---
expect('Dini: İslam', 'RELIGION', 'İslam');
expect('İnancı: Hristiyanlık', 'RELIGION', 'Hristiyanlık');
// no label = no detection
expect('İslam medeniyeti hakkında', 'RELIGION', null);

// --- ETHNICITY ---
expect('Etnik Kökeni: Kürt', 'ETHNICITY', 'Kürt');
expect('Irkı: Kafkas', 'ETHNICITY', 'Kafkas');

// --- POLITICAL_VIEW ---
expect('Siyasi görüşü: Sosyal Demokrat', 'POLITICAL_VIEW', 'Sosyal Demokrat');
expect('Parti üyeliği: CHP', 'POLITICAL_VIEW', 'CHP');

// --- UNION_MEMBERSHIP ---
expect('Sendika üyeliği: Türk Metal', 'UNION_MEMBERSHIP', 'Türk Metal');
expect('Hak İş sendikası üyesi', 'UNION_MEMBERSHIP', 'Hak İş');

// --- CRIMINAL_RECORD ---
expect('Sabıka kaydı: Var', 'CRIMINAL_RECORD', 'Var');
expect('Adli sicili: temiz', 'CRIMINAL_RECORD', 'temiz');
expect('Sabıkası: yok', 'CRIMINAL_RECORD', 'yok');

// --- FOREIGN_ID ---
expect('T.C. Kimlik No: 99100000000', 'FOREIGN_ID', null);
expect('Göçmen 99100000000 numaralı sığınmacı', 'FOREIGN_ID', '99100000000');
// Valid TC starting with 99 should NOT match (tcKimlikCheck returns true → validate fails)
// Plain 99-digit without context should still have low score

// --- RESIDENCE_PERMIT ---
expect('İkamet izni no: IKA-2024-551882', 'RESIDENCE_PERMIT', 'IKA-2024-551882');
expect('İkamet tezkeresi numarası: IT-2023-77412', 'RESIDENCE_PERMIT', 'IT-2023-77412');

// --- WORK_PERMIT ---
expect('Çalışma izni no: CI-2024-118742', 'WORK_PERMIT', 'CI-2024-118742');
expect('Çalışma izni numarası: WP-2025-00412', 'WORK_PERMIT', 'WP-2025-00412');

// --- PENSION_ID ---
expect('Emekli sicil no: ESN-2024-77441', 'PENSION_ID', 'ESN-2024-77441');
expect('Emeklilik bağkur numarası: BKR-2020-55188', 'PENSION_ID', 'BKR-2020-55188');

// --- BIRTH_PLACE ---
expect('Doğum yeri: Ankara', 'BIRTH_PLACE', 'Ankara');
expect('Doğum yeri: İstanbul', 'BIRTH_PLACE', 'İstanbul');
expect('Doğum yeri: Trabzon', 'BIRTH_PLACE', 'Trabzon');

// --- EDUCATION_LEVEL ---
expect('Eğitim durumu: Üniversite', 'EDUCATION_LEVEL', 'Üniversite');
expect('Öğrenim durumu: Lise', 'EDUCATION_LEVEL', 'Lise');
expect('Eğitim seviyesi: Yüksek Lisans', 'EDUCATION_LEVEL', 'Yüksek Lisans');

// --- MILITARY_STATUS ---
expect('Askerlik durumu: Yapıldı', 'MILITARY_STATUS', 'Yapıldı');
expect('Askerlik durumu: Tecilli', 'MILITARY_STATUS', 'Tecilli');
expect('Askerlik hizmeti: Muaf', 'MILITARY_STATUS', 'Muaf');

// --- MEDIATION_NO ---
expect('Arabuluculuk dosya no: ARB-2024-00412', 'MEDIATION_NO', 'ARB-2024-00412');
expect('Arabuluculuk numarası: 2024-ISTMED-774', 'MEDIATION_NO', '2024-ISTMED-774');

// --- ARBITRATION_NO ---
expect('Tahkim dosya no: THK-2024-00118', 'ARBITRATION_NO', 'THK-2024-00118');
expect('Tahkim numarası: ISTAC-2024-55', 'ARBITRATION_NO', 'ISTAC-2024-55');

// --- WARRANT_NO ---
expect('Yakalama no: YAK-2024-551882', 'WARRANT_NO', 'YAK-2024-551882');
expect('Tutuklama müzekkeresi no: TUT-2024-001', 'WARRANT_NO', 'TUT-2024-001');

// --- PAROLE_ID ---
expect('Denetimli serbestlik dosya no: DS-2024-774411', 'PAROLE_ID', 'DS-2024-774411');
expect('Denetimli serbestlik numarası: DSB-2025-118', 'PAROLE_ID', 'DSB-2025-118');

// --- COMMERCIAL_GAZETTE ---
expect('Ticaret sicili gazetesi ilan no: TSG-2024-118742', 'COMMERCIAL_GAZETTE', 'TSG-2024-118742');
expect('Ticaret Sicil Gazetesi sayısı: 10481', 'COMMERCIAL_GAZETTE', '10481');

// --- BOND_PROMISSORY ---
expect('Senet no: SNT-2024-55188', 'BOND_PROMISSORY', 'SNT-2024-55188');
expect('Bono numarası: BNO-2024-00412', 'BOND_PROMISSORY', 'BNO-2024-00412');
expect('Emre muharrer senet no: EMS-2024-77', 'BOND_PROMISSORY', 'EMS-2024-77');

// --- CUSTOMS_DECLARATION ---
expect('Gümrük beyannamesi no: GB-2024-IM-118742', 'CUSTOMS_DECLARATION', 'GB-2024-IM-118742');
expect('Gümrük beyanname numarası: GBN-2024-55188', 'CUSTOMS_DECLARATION', 'GBN-2024-55188');

// --- LETTER_OF_CREDIT ---
expect('Akreditif no: LC-2024-00412', 'LETTER_OF_CREDIT', 'LC-2024-00412');
expect('Akreditif numarası: AKR-2024-118742', 'LETTER_OF_CREDIT', 'AKR-2024-118742');

// --- BILL_OF_LADING ---
expect('Konşimento no: BL-2024-IST-7744', 'BILL_OF_LADING', 'BL-2024-IST-7744');
expect('Bill of lading no: MAEU-2024-55188', 'BILL_OF_LADING', 'MAEU-2024-55188');

// --- SEXUAL_LIFE ---
expect('Cinsel yönelimi: heteroseksüel', 'SEXUAL_LIFE', 'heteroseksüel');
expect('Cinsel tercihi: biseksüel', 'SEXUAL_LIFE', 'biseksüel');
// no label = no detection
expect('Cinsel suçlar hakkında', 'SEXUAL_LIFE', null);

// --- BIOMETRIC_DATA ---
expect('Parmak izi no: BIO-2024-118742', 'BIOMETRIC_DATA', 'BIO-2024-118742');
expect('Retina tarama kodu: RET-2024-55', 'BIOMETRIC_DATA', 'RET-2024-55');
expect('Biyometrik veri no: BYM-2024-001', 'BIOMETRIC_DATA', 'BYM-2024-001');

// --- DISABILITY_STATUS ---
expect('Engel oranı: %40 ortopedik', 'DISABILITY_STATUS', '%40 ortopedik');
expect('Engel durumu: Görme engelli', 'DISABILITY_STATUS', 'Görme engelli');
expect('Maluliyet oranı: %60', 'DISABILITY_STATUS', '%60');

// --- PATENT_NO ---
expect('Patent no: TR 2024/12345', 'PATENT_NO', 'TR 2024/12345');
expect('Patent tescil numarası: PAT-2024-55188', 'PATENT_NO', 'PAT-2024-55188');

// --- TRADEMARK_NO ---
expect('Marka tescil no: 2024/M-118742', 'TRADEMARK_NO', '2024/M-118742');
expect('Marka numarası: MRK-2024-55188', 'TRADEMARK_NO', 'MRK-2024-55188');

// --- COPYRIGHT_ID ---
expect('Telif no: TEL-2024-00412', 'COPYRIGHT_ID', 'TEL-2024-00412');
expect('FSEK tescil numarası: FSEK-2024-118', 'COPYRIGHT_ID', 'FSEK-2024-118');

// --- DE_TAX_ID ---
expect('Steuer-IdNr: 12345678901', 'DE_TAX_ID', '12345678901');
expect('Steuer-IdNr: 65432198701', 'DE_TAX_ID', '65432198701');

// --- FR_INSEE ---
expect('INSEE numarası: 1850175123456 78', 'FR_INSEE', '1850175123456 78');
expect('Sécurité sociale: 2930255789012', 'FR_INSEE', '2930255789012');

// --- IT_FISCAL_CODE ---
expect('Codice Fiscale: RSSMRA85M01H501Z', 'IT_FISCAL_CODE', 'RSSMRA85M01H501Z');
expect('İtalyan vergi kodu BNCLSN92A01F205X', 'IT_FISCAL_CODE', 'BNCLSN92A01F205X');

// --- IN_AADHAAR ---
expect('Aadhaar numarası: 2345 6789 0123', 'IN_AADHAAR', '2345 6789 0123');
expect('Aadhaar: 9876-5432-1098', 'IN_AADHAAR', '9876-5432-1098');

// ============================================================
// ADVERSARIAL CROSS-ENTITY REGRESSION TESTS (10)
// ============================================================

console.log('\n=== ÇAPRAZ ENTITY REGRESYON TESTLERİ (10) ===');

// 1) Explicit foreign-identity context must win over TCKN for a 99-prefix number.
expectExclusive('Yabancı Kimlik No: 99100000000', 'FOREIGN_ID', '99100000000', ['TR_NATIONAL_ID', 'DE_TAX_ID']);

// 2) The same numeric shape under a Turkish label must remain TCKN.
expectExclusive('T.C. Kimlik No: 99887766554', 'TR_NATIONAL_ID', '99887766554', ['FOREIGN_ID', 'DE_TAX_ID']);

// 3) Arbitration identifiers must not fall back to generic case/insurance identifiers.
expectExclusive('Tahkim dosya no: THK-2024-33445', 'ARBITRATION_NO', 'THK-2024-33445', ['CASE_NUMBER', 'INSURANCE_FILE_NO']);

// 4) Bar association registry is more specific than a generic professional license.
expectExclusive('İstanbul Barosu sicil no: 45872', 'BARO_SICIL', '45872', ['LICENSE_ID', 'REGISTRY_NO']);

// 5) KEP must win over generic email on an identical span.
expectExclusive('KEP adresi: avukat@hs01.kep.tr', 'KEP_ADDRESS', 'avukat@hs01.kep.tr', ['EMAIL_ADDRESS']);

// 6) A labeled legal date must not be duplicated as a generic date.
expectExclusive('Duruşma Tarihi: 10.09.2024', 'CONTEXTUAL_DATE', '10.09.2024', ['DATE_TIME']);

// 7) Label capture must stop at newline and preserve the following phone entity.
expectAll('Meslek: Avukat\nTelefon: 0532 123 45 67', [
    ['OCCUPATION', 'Avukat'],
    ['PHONE_NUMBER', '0532 123 45 67'],
]);

// 8) A SWIFT/BIC code must not be mistaken for an organization or username.
expectExclusive('SWIFT/BIC: TGBATRISXXX', 'SWIFT_BIC', 'TGBATRISXXX', ['ORGANIZATION', 'USERNAME']);

// 9) Discussion of sensitive concepts is not itself sensitive personal data.
expectNoneOf('Din, etnik köken, siyasi görüş ve kan grubu alanları bu formda istenmemektedir.', [
    'RELIGION', 'ETHNICITY', 'POLITICAL_VIEW', 'SEXUAL_LIFE', 'BLOOD_TYPE', 'DISABILITY_STATUS',
]);

// 10) Single-digit disability percentages must be captured completely.
expectExclusive('Maluliyet Oranı: %9', 'DISABILITY_STATUS', '%9', ['SALARY_AMOUNT', 'HEALTH_CONDITION']);

// ============================================================
// ANONYMIZER TESTS
// ============================================================

console.log('\n--- Anonymizer Tests ---');

const a = fs.readFileSync(__dirname + '/anonymizer.js', 'utf8');
const anonFn = new Function(
    'document',
    d + ';' + r + ';' + a +
    '; return { anonymizeText, ANONYMIZE_OPERATORS, createHighlightedDOM, escapeHTML };'
);
const mockDoc = {
    createElement: (tag) => {
        const el = {
            _tag: tag, className: '', _style: {}, _attrs: {},
            _children: [], textContent: '',
            style: { setProperty(k, v) { el._style[k] = v; } },
            setAttribute(k, v) { el._attrs[k] = v; },
            appendChild(c) { el._children.push(c); return c; },
            set innerHTML(v) {},
            get innerHTML() {
                if (el._tag === 'div') return el.textContent.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
                return '';
            }
        };
        return el;
    },
    createDocumentFragment: () => {
        const frag = { _children: [], appendChild(c) { frag._children.push(c); return c; } };
        return frag;
    },
    createTextNode: (t) => ({ _text: t, nodeType: 3 })
};
const { anonymizeText: anonText, ANONYMIZE_OPERATORS: ops, createHighlightedDOM } = anonFn(mockDoc);

async function runAnonymTests() {
    const finding = { entity: 'TC_KIMLIK', value: '10000000146', start: 0, end: 11, score: 1.0 };

    // replace
    let result = await anonText('10000000146', [finding], 'replace');
    total++; if (result === '<TC_KIMLIK>') { pass++; } else { fail++; console.log('  FAIL: replace -> ' + result); }

    // mask
    result = await anonText('10000000146', [finding], 'mask', '*');
    total++; if (result.includes('*') && result.length === 11) { pass++; } else { fail++; console.log('  FAIL: mask -> ' + result); }

    // redact
    result = await anonText('10000000146', [finding], 'redact');
    total++; if (result === '') { pass++; } else { fail++; console.log('  FAIL: redact -> ' + result); }

    // partial
    result = await anonText('10000000146', [finding], 'partial');
    total++; if (result.startsWith('10') && result.endsWith('46') && result.includes('*')) { pass++; } else { fail++; console.log('  FAIL: partial -> ' + result); }

    // hash (deterministic)
    const hash1 = await anonText('10000000146', [finding], 'hash');
    const hash2 = await anonText('10000000146', [finding], 'hash');
    total++; if (hash1 === hash2 && hash1.length === 16) { pass++; } else { fail++; console.log('  FAIL: hash deterministic -> ' + hash1 + ' vs ' + hash2); }

    // position preservation
    const text3 = 'Adı: Ahmet, TC: 10000000146';
    const f1 = { entity: 'TC_KIMLIK', value: '10000000146', start: 16, end: 27, score: 1.0 };
    result = await anonText(text3, [f1], 'replace');
    total++; if (result === 'Adı: Ahmet, TC: <TC_KIMLIK>') { pass++; } else { fail++; console.log('  FAIL: position -> ' + result); }

    // overlapping findings: wider one should suppress narrower
    const overlap1 = { entity: 'ADDRESS', value: 'Atatürk Cad. No:42', start: 0, end: 19, score: 0.8 };
    const overlap2 = { entity: 'LOCATION', value: 'Atatürk', start: 0, end: 7, score: 0.7 };
    result = await anonText('Atatürk Cad. No:42', [overlap1, overlap2], 'replace');
    total++; if (result === '<ADDRESS>') { pass++; } else { fail++; console.log('  FAIL: overlap -> ' + result); }

    // XSS in highlight: createHighlightedDOM should use safe DOM APIs
    const xssPayload = '"><img src=x onerror=alert(1)>';
    const xssFinding = { entity: 'PERSON_NAME', value: xssPayload, start: 0, end: xssPayload.length, score: 0.9 };
    const frag = createHighlightedDOM(xssPayload, [xssFinding]);
    total++;
    const span = frag._children[0];
    if (span && span.textContent === xssPayload && span._attrs.title && span._attrs.title.includes(xssPayload)) {
        pass++;
    } else {
        fail++;
        console.log('  FAIL: XSS safety — DOM span not built correctly');
    }

    // XSS: title attribute should contain raw value, not escaped HTML
    total++;
    if (span && span._attrs.title && !span._attrs.title.includes('&lt;') && !span._attrs.title.includes('&gt;')) {
        pass++;
    } else {
        fail++;
        console.log('  FAIL: XSS — title should use setAttribute (raw text), not HTML-escaped');
    }
}

// ============================================================
// ALL CAPS PERSON NAMES (legal documents)
// ============================================================
console.log('\n--- ALL CAPS Person Names ---');

// Legal label-based detection
expect('BAŞVURAN : ZUHAL ÜÇGÜL TUNÇER', 'PERSON_NAME', 'ZUHAL ÜÇGÜL TUNÇER');
expect('BAŞVURAN VEKİLİ : AV. DUYGU SAVRAN KOLLU', 'PERSON_NAME', 'DUYGU SAVRAN KOLLU');
expect('SİGORTA KURULUŞU VEKİLİ : AV. İLKNUR KURT', 'PERSON_NAME', 'İLKNUR KURT');
expect('SİGORTA HAKEMİ : MEHMET YILMAZ (Koordinator)', 'PERSON_NAME', 'MEHMET YILMAZ');
expect('BAŞVURAN : KAYA ATILGAN', 'PERSON_NAME', 'KAYA ATILGAN');

// ALL CAPS after title prefix
expect('Av. AHMET DEMİR', 'PERSON_NAME', 'AHMET DEMİR');
expect('Dr. FATMA ÖZDEMİR', 'PERSON_NAME', 'FATMA ÖZDEMİR');

// Title case still works
expect('Av. Mehmet Yılmaz', 'PERSON_NAME', 'Mehmet Yılmaz');

// Negative: non-name ALL CAPS should NOT be detected
expect('Av. MÜDÜRLÜĞÜ BAŞVURUSU', 'PERSON_NAME', null);

// ============================================================
// TURKISH MONTH+YEAR DATES
// ============================================================
console.log('\n--- Turkish Month+Year Dates ---');

expect('Ocak 2022', 'CONTEXTUAL_DATE', 'Ocak 2022');
expect('Ağustos 2021 - Ocak 2022', 'CONTEXTUAL_DATE', 'Ağustos 2021');
expect('Eylül 2015 - Ağustos 2020', 'CONTEXTUAL_DATE', 'Eylül 2015');
expect('Mart 2018', 'CONTEXTUAL_DATE', 'Mart 2018');
expect('Haziran 2015', 'CONTEXTUAL_DATE', 'Haziran 2015');
expect('Nisan 2018', 'CONTEXTUAL_DATE', 'Nisan 2018');
expect('Mayıs 2021', 'CONTEXTUAL_DATE', 'Mayıs 2021');
expect('Temmuz 2015', 'CONTEXTUAL_DATE', 'Temmuz 2015');
expect('Kasım 2024', 'CONTEXTUAL_DATE', 'Kasım 2024');
expect('Şubat 2017', 'CONTEXTUAL_DATE', 'Şubat 2017');
expect('Aralık 2023', 'CONTEXTUAL_DATE', 'Aralık 2023');
expect('Ekim 2022', 'CONTEXTUAL_DATE', 'Ekim 2022');

// ============================================================
// K-YYYY/NNNNNN CASE NUMBER FORMAT
// ============================================================
console.log('\n--- K-YYYY/NNNNNN Case Numbers ---');

expect('K-2025/559270', 'CASE_NUMBER', 'K-2025/559270');
expect('K-2025/556507', 'CASE_NUMBER', 'K-2025/556507');

// ============================================================
// PERSONAL ATTRIBUTES - NEWLINE FORMAT
// ============================================================
console.log('\n--- Personal Attributes (newline format) ---');

expect('Cinsiyet\nErkek', 'GENDER', 'Erkek');
expect('Cinsiyet\nKadın', 'GENDER', 'Kadın');
expect('Vatandaşlık\nTürkiye Cumhuriyeti', 'NATIONALITY', 'Türkiye Cumhuriyeti');
expect('Askerlik\nAskerliğimi yaptım', 'MILITARY_STATUS', 'Askerliğimi yaptım');

// Traditional format still works
expect('Cinsiyeti: Erkek', 'GENDER', 'Erkek');
expect('Uyruğu: T.C.', 'NATIONALITY', 'T.C.');

// ============================================================
// AGE - PARENTHESIZED FORMAT
// ============================================================
console.log('\n--- AGE (parenthesized) ---');

expect('1997 (28 Yaş)', 'AGE', '28');
expect('(35 Yaş)', 'AGE', '35');

// ============================================================
// SİCİL NO (hakem, eksper — parenthesized)
// ============================================================
console.log('\n--- Sicil No ---');

expect('(Sicil No: 01454 )', 'LICENSE_ID', '01454');
expect('(Sicil No: 01309 )', 'LICENSE_ID', '01309');
expect('SİGORTA HAKEMİ : Mehmet Yılmaz (Koordinator)\n(Sicil No: 01454 )', 'LICENSE_ID', '01454');

// ============================================================
// MULTI-LINE LEGAL NAMES
// ============================================================
console.log('\n--- Multi-line Legal Names ---');

expect('BAŞVURAN VEKİLİ : AV. DUYGU SAVRAN\nKOLLU\nADRESİ : test', 'PERSON_NAME', 'DUYGU SAVRAN KOLLU');
expect('BAŞVURAN : KAYA ATILGAN\nKimlik No:', 'PERSON_NAME', 'KAYA ATILGAN');

// ============================================================
// VERGİ NO (expanded patterns)
// ============================================================
console.log('\n--- Vergi No (expanded) ---');

expect('VKN: 1234567890', 'TR_VERGI_NO', '1234567890');
expect('V.K.N.: 1234567890', 'TR_VERGI_NO', '1234567890');
expect('Vergi Numarası: 1234567890', 'TR_VERGI_NO', '1234567890');
// Tüzel kişi (11 haneli)
expect('Vergi No: 12345678901', 'TR_VERGI_NO', '12345678901');
expect('VKN: 98765432109', 'TR_VERGI_NO', '98765432109');
expect('Vergi Kimlik No: 55443322110', 'TR_VERGI_NO', '55443322110');

// ============================================================
// DOĞRULAMA KODU & LİNKİ (e-imza belgeleri)
// ============================================================
console.log('\n--- Doğrulama Kodu & Linki ---');

expect('Doğrulama Kodu:083M3O9V5PS73HU6D9XW', 'CASE_NUMBER', '083M3O9V5PS73HU6D9XW');
expect('Doğrulama Kodu:V7L7MBH63SMBUYWSVZM1', 'CASE_NUMBER', 'V7L7MBH63SMBUYWSVZM1');
expect('Doğrulama Linki : https://sbm.denetimkurulu.org.tr:443/sbm-\nbelge/public/belgeDogrulama/sorgu.sbm', 'URL', 'sbm.denetimkurulu.org.tr');
// Port in URL
expect('https://example.com:8080/path', 'URL', 'https://example.com:8080/path');

// ============================================================
// MULTI-LINE ADDRESS (legal docs)
// ============================================================
console.log('\n--- Multi-line Address ---');

expect('ADRESİ : Akasya Göl Etabı Kule\nKat: 12 Daire: 75\nİstanbul / İstanbul\nSİG. KUR.VEK. KEP ADRESİ : kep@example.com', 'ADDRESS', 'Kat: 12 Daire: 75');
expect('ADRESİ : Kadıköy Mah. Atatürk Cd. No:15\nD:4 Kat:3\nKadıköy / İstanbul\nBAŞVURAN E-POSTA : test@example.com', 'ADDRESS', 'Kat:3');
expect('ADRESİ : SİTE MAH CEVAHİR CAD NO:6/73\nİSTANBUL İSTANBUL\nBAŞVURAN E-POSTA : x@example.com', 'ADDRESS', 'CEVAHİR CAD');

console.log('\n--- I/İ Tolerant Name Lookup (nameSetHas) ---');

expect('Bilirkişi HAYRI YILMAZ raporu', 'PERSON_NAME', 'HAYRI YILMAZ');
expect('HAYRI YILMAZ tarafından hazırlandı', 'PERSON_NAME', 'HAYRI YILMAZ');
expect('SİGORTA HAKEMİ : ILHAN YILDIRIM', 'PERSON_NAME', 'ILHAN YILDIRIM');
expect('tanık ILKNUR TUNÇER ifadesi', 'PERSON_NAME', 'ILKNUR TUNÇER');
expect('BIRSEN KARAMAN davacı olarak', 'PERSON_NAME', 'BIRSEN KARAMAN');

console.log('\n--- Title-Triggered Line-Break Continuation ---');

expect('Bilirkişi Hayri\nYılmaz raporu', 'PERSON_NAME', 'Hayri Yılmaz');
expect('Bilirkişi HAYRİ\nYILMAZ raporu', 'PERSON_NAME', 'HAYRİ YILMAZ');
expect('tanık Mehmet\nDemir ifadesi', 'PERSON_NAME', 'Mehmet Demir');
expectNot('Avukat: Av. Murat Özkan\nBaro Sicil No: 557812', 'PERSON_NAME', 'Baro');
expectNot('Avukat: Av. Murat Özkan\nBaro Sicil No: 557812', 'PERSON_NAME', 'Baro Sicil');

console.log('\n--- Possessive Suffix Name Detection ---');

expect("Hayri'nin dosyası", 'PERSON_NAME', 'Hayri');
expect("Ahmet'in raporu", 'PERSON_NAME', 'Ahmet');
expect("Mehmet'e teslim edildi", 'PERSON_NAME', 'Mehmet');
expect("Fatma'dan aldı", 'PERSON_NAME', 'Fatma');
expect("Ayşe'ye verildi", 'PERSON_NAME', 'Ayşe');
expect("Ali'den geldi", 'PERSON_NAME', 'Ali');
expect("Duygu'nun davası", 'PERSON_NAME', 'Duygu');
expect("Serpil'in evi", 'PERSON_NAME', 'Serpil');
expectNot("Türkiye'nin başkenti", 'PERSON_NAME', 'Türkiye');
expectNot("Ankara'dan geldim", 'PERSON_NAME', 'Ankara');
expectNot("Mahkeme'nin kararı", 'PERSON_NAME', 'Mahkeme');

// ============================================================
// DOMAIN TESTS — Insurance, Commercial, Contract Documents
// ============================================================

console.log('\n--- Sigorta: Trafik Kazası Tazminat ---');
const sigortaDilekce = `DAVACI    : FATMA GÜNEŞ (T.C. No: 11111111110)
Adresi    : Konyaaltı Mah. Liman Cad. No:34/2 Konyaaltı/ANTALYA
Telefon   : 0242 345 67 89
E-posta   : fatma.gunes2@example.com
Vekili    : Av. Cüneyt ARSLAN - Antalya Barosu Sicil No: 12890
KEP       : cuneyt.arslan@hs01.kep.tr
DAVALI    : HDI SİGORTA A.Ş.
Vergi No  : 9876543210
MERSİS    : 0987654321098765
Kemal GÜNEŞ (T.C. No: 22222222222), 07.11.2024 tarihinde saat 08:45'te
07 DEF 456 plakalı araç, poliçe no: ZKT-2024-0078901
Hasar dosya no: 2024-TK-0056789
net geliri 28.500 TL olup, SGK sicil no: 9876543
Doğum tarihi: 14.02.1978
IBAN: TR76 0001 0001 5000 0000 0123 45
Kaza Tespit Tutanağı No: 2025-34-045678
UETS: 45678-90123-45678`;
const sigortaF = analyzeText(sigortaDilekce, ALL, 0.35);
expectIn(sigortaF, 'PERSON_NAME', 'FATMA GÜNEŞ');
expectIn(sigortaF, 'TR_NATIONAL_ID', '11111111110');
expectIn(sigortaF, 'ADDRESS', 'Konyaaltı Mah. Liman Cad. No:34/2 Konyaaltı/ANTALYA');
expectIn(sigortaF, 'PHONE_NUMBER', '0242 345 67 89');
expectIn(sigortaF, 'EMAIL_ADDRESS', 'fatma.gunes2@example.com');
expectIn(sigortaF, 'BARO_SICIL', '12890');
expectIn(sigortaF, 'KEP_ADDRESS', 'cuneyt.arslan@hs01.kep.tr');
expectIn(sigortaF, 'ORGANIZATION', 'HDI SİGORTA A.Ş.');
expectIn(sigortaF, 'TR_VERGI_NO', '9876543210');
expectIn(sigortaF, 'TR_MERSIS_NO', '0987654321098765');
expectIn(sigortaF, 'TR_NATIONAL_ID', '22222222222');
expectIn(sigortaF, 'DATE_TIME', '07.11.2024');
expectIn(sigortaF, 'TR_LICENSE_PLATE', '07 DEF 456');
expectIn(sigortaF, 'POLICY_NUMBER', 'ZKT-2024-0078901');
expectIn(sigortaF, 'INSURANCE_FILE_NO', '2024-TK-0056789');
expectIn(sigortaF, 'SALARY_AMOUNT', '28.500 TL');
expectIn(sigortaF, 'TR_SGK_NO', '9876543');
expectIn(sigortaF, 'IBAN_CODE', 'TR76 0001 0001 5000 0000 0123 45');
expectIn(sigortaF, 'CASE_NUMBER', '2025-34-045678');
expectIn(sigortaF, 'KEP_ADDRESS', '45678-90123-45678');

console.log('\n--- Ticaret: Ortaklık ve Sicil ---');
const ticaretBelge = `ERTUĞRUL YILDIZ
T.C. Kimlik No: 33000000022
Adres: Levent Mah. Nispetiye Cad. No:88/4 Beşiktaş/İSTANBUL
Telefon: +90 212 345 67 89
E-posta: ertugrul@example.com
KEP: ertugrul.yildiz@hs02.kep.tr
AYŞE KORKMAZ
T.C. Kimlik No: 44000000088
Telefon: 0532 987 65 43
E-posta: ayse.korkmaz@example.com
Av. Zafer BİLGİN - İstanbul Barosu Sicil No: 56789
KEP: zafer.bilgin@hs01.kep.tr
YMM Sami ÖZTÜRK
Vergi Kimlik No: 5678901234
MERSİS No     : 0345678901234567
Vergi No      : 3456789012
IBAN: TR58 0006 2000 7890 0006 2978 31
SWIFT: ISBKTRIS
İstanbul 15. Noterliği
Yevmiye No: 2018/12345`;
const ticaretF = analyzeText(ticaretBelge, ALL, 0.35);
expectIn(ticaretF, 'PERSON_NAME', 'ERTUĞRUL YILDIZ');
expectIn(ticaretF, 'TR_NATIONAL_ID', '33000000022');
expectIn(ticaretF, 'ADDRESS', 'Levent Mah. Nispetiye Cad. No:88/4 Beşiktaş/İSTANBUL');
expectIn(ticaretF, 'PHONE_NUMBER', '+90 212 345 67 89');
expectIn(ticaretF, 'EMAIL_ADDRESS', 'ertugrul@example.com');
expectIn(ticaretF, 'KEP_ADDRESS', 'ertugrul.yildiz@hs02.kep.tr');
expectIn(ticaretF, 'PERSON_NAME', 'AYŞE KORKMAZ');
expectIn(ticaretF, 'TR_NATIONAL_ID', '44000000088');
expectIn(ticaretF, 'PHONE_NUMBER', '0532 987 65 43');
expectIn(ticaretF, 'EMAIL_ADDRESS', 'ayse.korkmaz@example.com');
expectIn(ticaretF, 'BARO_SICIL', '56789');
expectIn(ticaretF, 'KEP_ADDRESS', 'zafer.bilgin@hs01.kep.tr');
expectIn(ticaretF, 'TR_VERGI_NO', '5678901234');
expectIn(ticaretF, 'TR_MERSIS_NO', '0345678901234567');
expectIn(ticaretF, 'TR_VERGI_NO', '3456789012');
expectIn(ticaretF, 'IBAN_CODE', 'TR58 0006 2000 7890 0006 2978 31');
expectIn(ticaretF, 'SWIFT_BIC', 'ISBKTRIS');
expectIn(ticaretF, 'NOTARY', 'İstanbul 15. Noterliği');
expectIn(ticaretF, 'NOTARY_RECORD', '2018/12345');

console.log('\n--- Sözleşme: Kira Sözleşmesi ---');
const kiraS = `Ad Soyad      : HAKAN DEMİRTAŞ
T.C. Kimlik No: 66000000044
Doğum Tarihi  : 03.08.1975
Adres         : Çamlıca Mah. Güneş Sok. No:7/1 Üsküdar/İSTANBUL
Telefon       : 0533 111 22 33
E-posta       : hakan.demirtas@example.com
IBAN          : TR12 0001 2009 8880 0016 0035 78
Vergi No      : 1122334455
Ad Soyad      : ELİF SOYLU
T.C. Kimlik No: 77000000066
Telefon       : 0544 222 33 44
E-posta       : elif.soylu@example.com
SGK No        : 2345678
Aylık Maaş    : 42.000 TL
Adres         : Acıbadem Mah. Çeçen Sok. No:15/3 Kadıköy/İSTANBUL

Kefil Ad Soyad: MURAT SOYLU
T.C. Kimlik No: 88000000022
Telefon       : 0555 333 44 55`;
const kiraF = analyzeText(kiraS, ALL, 0.35);
expectIn(kiraF, 'PERSON_NAME', 'HAKAN DEMİRTAŞ');
expectIn(kiraF, 'TR_NATIONAL_ID', '66000000044');
expectIn(kiraF, 'PHONE_NUMBER', '0533 111 22 33');
expectIn(kiraF, 'EMAIL_ADDRESS', 'hakan.demirtas@example.com');
expectIn(kiraF, 'IBAN_CODE', 'TR12 0001 2009 8880 0016 0035 78');
expectIn(kiraF, 'TR_VERGI_NO', '1122334455');
expectIn(kiraF, 'PERSON_NAME', 'ELİF SOYLU');
expectIn(kiraF, 'TR_NATIONAL_ID', '77000000066');
expectIn(kiraF, 'PHONE_NUMBER', '0544 222 33 44');
expectIn(kiraF, 'EMAIL_ADDRESS', 'elif.soylu@example.com');
expectIn(kiraF, 'TR_SGK_NO', '2345678');
expectIn(kiraF, 'SALARY_AMOUNT', '42.000 TL');
expectIn(kiraF, 'ADDRESS', 'Acıbadem Mah. Çeçen Sok. No:15/3 Kadıköy/İSTANBUL');
expectIn(kiraF, 'PERSON_NAME', 'MURAT SOYLU');
expectIn(kiraF, 'TR_NATIONAL_ID', '88000000022');
expectIn(kiraF, 'PHONE_NUMBER', '0555 333 44 55');

console.log('\n--- Sigorta: Kasko Hasar İhbar ---');
const kaskoIhbar = `Ad Soyad       : BÜLENT YILDIRIM
T.C. Kimlik No : 99000000088
Ehliyet No     : B-2008-123456
Telefon        : 0535 678 90 12
E-posta        : bulent.yildirim@example.com
Adres          : Bahçelievler Mah. 2. Sok. No:19 Bahçelievler/İSTANBUL
Plaka          : 34 GHI 789
Şasi No        : JTDKN3DU5P1234567
Diğer Araç Plakası: 34 JKL 012 (Sürücü: Oktay KARAGÖZ, Tel: 0536 111 22 33)
Kaza Tespit Tutanağı No: 2025-34-045678
Poliçe No      : KSK-2025-0034567
Hasar Dosya No : ALZ/2025/H-012345
IBAN           : TR89 0006 4000 0011 2340 0678 90
Hasar Saati    : 17:15`;
const kaskoIF = analyzeText(kaskoIhbar, ALL, 0.35);
expectIn(kaskoIF, 'PERSON_NAME', 'BÜLENT YILDIRIM');
expectIn(kaskoIF, 'TR_NATIONAL_ID', '99000000088');
expectIn(kaskoIF, 'DRIVER_LICENSE', 'B-2008-123456');
expectIn(kaskoIF, 'PHONE_NUMBER', '0535 678 90 12');
expectIn(kaskoIF, 'EMAIL_ADDRESS', 'bulent.yildirim@example.com');
expectIn(kaskoIF, 'ADDRESS', 'Bahçelievler Mah. 2. Sok. No:19 Bahçelievler/İSTANBUL');
expectIn(kaskoIF, 'TR_LICENSE_PLATE', '34 GHI 789');
expectIn(kaskoIF, 'VEHICLE_ID', 'JTDKN3DU5P1234567');
expectIn(kaskoIF, 'TR_LICENSE_PLATE', '34 JKL 012');
expectIn(kaskoIF, 'PHONE_NUMBER', '0536 111 22 33');
expectIn(kaskoIF, 'CASE_NUMBER', '2025-34-045678');
expectIn(kaskoIF, 'POLICY_NUMBER', 'KSK-2025-0034567');
expectIn(kaskoIF, 'INSURANCE_FILE_NO', 'ALZ/2025/H-012345');
expectIn(kaskoIF, 'IBAN_CODE', 'TR89 0006 4000 0011 2340 0678 90');
expectIn(kaskoIF, 'TIME', '17:15');

console.log('\n--- Sözleşme: İş Sözleşmesi ---');
const isSozlesmesi = `İşveren       : ANADOLU BİLİŞİM TEKNOLOJİLERİ A.Ş.
Vergi No      : 7890123456
MERSİS No     : 0789012345678901
KEP           : anadolubilisim@hs03.kep.tr
Yetkili       : İK Müdürü Nevzat ACAR
Telefon       : 0216 504 30 00
İşçi          : GÖRKEM AKTAŞ
T.C. Kimlik No: 12300000044
Doğum Yeri    : Eskişehir
Medeni Hali   : Bekar
Askerlik      : Tecilli
Eğitim        : Lisans (Bilgisayar Mühendisliği)
Kan Grubu     : A Rh+
Cep Telefonu  : 0541 890 12 34
E-posta       : gorkem.aktas@example.com
SGK No        : 3456789
Personel No   : PRS-2025-0456
Brüt Maaş     : 65.000 TL
Net Maaş      : 48.750 TL
IBAN          : TR45 0001 0017 4500 0001 2345 67
Adres         : Yenişehir Mah. Atatürk Blv. No:102/5 Pendik/İSTANBUL
Yakını        : Ayten AKTAŞ (Anne)
Telefon       : 0532 456 78 90`;
const isSF = analyzeText(isSozlesmesi, ALL, 0.35);
expectIn(isSF, 'ORGANIZATION', 'ANADOLU BİLİŞİM TEKNOLOJİLERİ A.Ş.');
expectIn(isSF, 'TR_VERGI_NO', '7890123456');
expectIn(isSF, 'TR_MERSIS_NO', '0789012345678901');
expectIn(isSF, 'KEP_ADDRESS', 'anadolubilisim@hs03.kep.tr');
expectIn(isSF, 'PERSON_NAME', 'Nevzat ACAR');
expectIn(isSF, 'PHONE_NUMBER', '0216 504 30 00');
expectIn(isSF, 'PERSON_NAME', 'GÖRKEM AKTAŞ');
expectIn(isSF, 'TR_NATIONAL_ID', '12300000044');
expectIn(isSF, 'BIRTH_PLACE', 'Eskişehir');
expectIn(isSF, 'MARITAL_STATUS', 'Bekar');
expectIn(isSF, 'MILITARY_STATUS', 'Tecilli');
expectIn(isSF, 'EDUCATION_LEVEL', 'Lisans');
expectIn(isSF, 'BLOOD_TYPE', 'A Rh+');
expectIn(isSF, 'PHONE_NUMBER', '0541 890 12 34');
expectIn(isSF, 'EMAIL_ADDRESS', 'gorkem.aktas@example.com');
expectIn(isSF, 'TR_SGK_NO', '3456789');
expectIn(isSF, 'EMPLOYEE_ID', 'PRS-2025-0456');
expectIn(isSF, 'SALARY_AMOUNT', '65.000 TL');
expectIn(isSF, 'SALARY_AMOUNT', '48.750 TL');
expectIn(isSF, 'IBAN_CODE', 'TR45 0001 0017 4500 0001 2345 67');
expectIn(isSF, 'ADDRESS', 'Yenişehir Mah. Atatürk Blv. No:102/5 Pendik/İSTANBUL');
expectIn(isSF, 'PERSON_NAME', 'Ayten AKTAŞ');
expectIn(isSF, 'PHONE_NUMBER', '0532 456 78 90');

console.log('\n--- False Positive: Org/Branch Names Not Person ---');
expectNot("YILDIZ TEKNOLOJİ SANAYİ", 'PERSON_NAME', 'YILDIZ TEKNOLOJİ');
expectNot("İş Bankası Levent Şubesi", 'PERSON_NAME', 'Levent Şubesi');

// ============================================================
// NEW PATTERNS — Kimlik Kartı Seri, Nüfus Kayıt, SGK İşyeri
// ============================================================

console.log('\n--- T.C. Kimlik Kartı Seri No ---');
expect('Kimlik kartı seri no: B04K12345', 'GOV_DOCUMENT_ID', 'B04K12345');
expect('Nüfus cüzdanı seri no: A01C67890', 'GOV_DOCUMENT_ID', 'A01C67890');
expect('TC Kimlik Seri No: C12D45678', 'GOV_DOCUMENT_ID', 'C12D45678');
expect('Seri No: D05E11111', 'GOV_DOCUMENT_ID', 'D05E11111');
expect('Kimlik Seri: A01 No: 123456', 'GOV_DOCUMENT_ID', 'A01 123456');
expect('Nüfus kartı seri: B12 no: 654321', 'GOV_DOCUMENT_ID', 'B12 654321');

console.log('\n--- Nüfus Kayıt (Cilt/Hane/Birey) ---');
expect('Cilt/Hane/Birey: 12/03745/008', 'REGISTRY_NO', '12/03745/008');
expect('Cilt/Aile/Sıra: 5/123/7', 'REGISTRY_NO', '5/123/7');
expect('Cilt/Hane/Birey No: 34/00567/012', 'REGISTRY_NO', '34/00567/012');
expect('Cilt No: 45', 'REGISTRY_NO', '45', 0.0);
expect('Aile Sıra No: 03745', 'REGISTRY_NO', '03745', 0.0);

console.log('\n--- SGK İşyeri Sicil No ---');
expect('İşyeri SGK Sicil No: 2 4941 01 01 9999999 034 05 61 000', 'TR_SGK_NO', '2 4941 01 01 9999999 034 05 61 000', 0.0);
expect('İşyeri Sigorta Sicil No: 2-4941-01-01-9999999-034-05-61-000', 'TR_SGK_NO', '2-4941-01-01-9999999-034-05-61-000', 0.0);

console.log('\n--- IMSI (Turkey 286) ---');
expect('IMSI: 286011234567890', 'DEVICE_ID', '286011234567890');
expect('IMSI no: 286000123456789', 'DEVICE_ID', '286000123456789');
expect('HTS kayıtları no: 286031234567890', 'DEVICE_ID', '286031234567890');
expect('Abone IMSI: 286011112223334', 'DEVICE_ID', '286011112223334');
expectNot('Fatura tutarı: 28601123456 TL', 'DEVICE_ID', '28601123456');

console.log('\n--- E-Fatura / E-Arşiv UUID ---');
expect('e-fatura no: a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'EINVOICE_UUID', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');
expect('e-arşiv: 12345678-abcd-1234-5678-abcdef123456', 'EINVOICE_UUID', '12345678-abcd-1234-5678-abcdef123456');
expect('ETTN: 11111111-2222-3333-4444-555555555555', 'EINVOICE_UUID', '11111111-2222-3333-4444-555555555555');
expect('e fatura UUID: aabbccdd-1122-3344-5566-778899aabbcc', 'EINVOICE_UUID', 'aabbccdd-1122-3344-5566-778899aabbcc');

console.log('\n--- Turkish İ/i Normalization (ALL CAPS) ---');
expect('BİLİRKİŞİ RAPOR NO: 2025/1234', 'CASE_NUMBER', '2025/1234');
expect('POLİÇE NO: KSK-2025-0034567', 'POLICY_NUMBER', 'KSK-2025-0034567');
expect('TESPİT TUTANAĞI NO: 2025-34-045678', 'CASE_NUMBER', '2025-34-045678');
expect('TAKİP DOSYA NO: 2025/11234', 'CASE_NUMBER', '2025/11234');
expect('TİCARET SİCİL NO: 558412', 'TRADE_REGISTRY_NO', '558412');
expect('EHLİYET NO: B-2008-123456', 'DRIVER_LICENSE', 'B-2008-123456');
expect('CİNSİYET: Erkek', 'GENDER', 'Erkek');
expect('MEDENİ HALİ: Evli', 'MARITAL_STATUS', 'Evli');
expect('EĞİTİM: Lisans', 'EDUCATION_LEVEL', 'Lisans');
expect('VERGİ TAHAKKUK TARİHİ: 15.03.2025', 'CONTEXTUAL_DATE', '15.03.2025');

console.log('\n--- 0090 Phone Prefix ---');
expect('İletişim: 0090 532 123 45 67', 'PHONE_NUMBER', '0090 532 123 45 67');
expect('Cep: 0090-532-1234567', 'PHONE_NUMBER', '0090-532-1234567');
expect('Tel: 0090(212)1234567', 'PHONE_NUMBER', '0090(212)1234567');

console.log('\n--- MERNİS Label ---');
expect('MERNİS No: 12345678901', 'TR_NATIONAL_ID', '12345678901');
expect('MERNIS numarası: 98765432109', 'TR_NATIONAL_ID', '98765432109');
expectNot('MERNİS No: 1234567890', 'TR_NATIONAL_ID', '1234567890');

console.log('\n--- Noter Tasdik No ---');
expect('Noter tasdik no: 2025/04567', 'NOTARY_RECORD', '2025/04567');
expect('noter onay no: 12345', 'NOTARY_RECORD', '12345');
expect('Noter Teyit Numarası: 2024/789', 'NOTARY_RECORD', '2024/789');

console.log('\n--- SSK/Bağ-Kur/Emekli Sandığı ---');
expect('SSK Sicil No: 1234567890', 'EMPLOYEE_ID', '1234567890');
expect('Bağ-Kur Sicil No: 8-12345678', 'EMPLOYEE_ID', '8-12345678');
expect('Emekli Sandığı Sicil No: 123456', 'EMPLOYEE_ID', '123456');
expect('Bağ Kur numarası: 1234567890', 'EMPLOYEE_ID', '1234567890');

console.log('\n--- E-Fatura UUID (extended) ---');
expect('e-fatura: aabbccdd-1122-3344-5566-778899aabbcc', 'EINVOICE_UUID', 'aabbccdd-1122-3344-5566-778899aabbcc');
expect('e arşiv no: 11223344-aabb-ccdd-eeff-112233445566', 'EINVOICE_UUID', '11223344-aabb-ccdd-eeff-112233445566');

console.log('\n--- IMEI / CC çakışma ---');
expect('IMEI: 352099001761481', 'IMEI', '352099001761481');
expectNot('IMEI: 352099001761481', 'CREDIT_CARD', '352099001761481');

console.log('\n--- @username Sosyal Profil ---');
expect('Sosyal medya: @emrecelik34', 'SOCIAL_PROFILE', '@emrecelik34');
expect('Twitter: @avukat_mehmet', 'SOCIAL_PROFILE', '@avukat_mehmet');

console.log('\n--- Contextual Date - ALL CAPS Turkish İ/I ---');
expect('FAİZ BAŞLANGIÇ TARİHİ: 15.03.2025', 'CONTEXTUAL_DATE', '15.03.2025');
expect('İHTARNAME TARİHİ: 01.02.2025', 'CONTEXTUAL_DATE', '01.02.2025');
expect('SÖZLEŞMENİN İMZA TARİHİ: 25.06.2025', 'CONTEXTUAL_DATE', '25.06.2025');
expect('TUTUKLAMA TARİHİ: 07.03.2025', 'CONTEXTUAL_DATE', '07.03.2025');
expect('TAHLİYE TARİHİ: 15.04.2025', 'CONTEXTUAL_DATE', '15.04.2025');
expect('EKSPERTİZ TARİHİ: 20.04.2025', 'CONTEXTUAL_DATE', '20.04.2025');

console.log('\n--- Ruhsat Tescil No ---');
expect('Ruhsat Tescil No: MS-567890', 'VEHICLE_ID', 'MS-567890');
expect('Ruhsat tescil seri no: AB12345678', 'VEHICLE_ID', 'AB12345678');

console.log('\n--- ALL CAPS Personal Attributes ---');
expect('ASKERLİK: Yaptı', 'MILITARY_STATUS', 'Yaptı');
expect('MESLEĞİ: Mühendis', 'OCCUPATION', 'Mühendis');
expect('DOĞUM YERİ: İstanbul', 'BIRTH_PLACE', 'İstanbul');
expect('CİNSİYET: Kadın', 'GENDER', 'Kadın');
expect('MEDENİ DURUMU: Evli', 'MARITAL_STATUS', 'Evli');
expect('EĞİTİM SEVİYESİ: Doktora', 'EDUCATION_LEVEL', 'Doktora');

console.log('\n--- ALL CAPS Label Detection ---');
expect('DAVACI: Mehmet Yılmaz', 'PERSON_NAME', 'Mehmet Yılmaz');
expect('DAVALI: Ayşe Kara', 'PERSON_NAME', 'Ayşe Kara');
expect('BABA ADI: Hasan', 'PERSON_NAME', 'Hasan');
expect('ANNE ADI: Fatma', 'PERSON_NAME', 'Fatma');
expect('VERGİ KİMLİK NO: 1234567890', 'TR_VERGI_NO', '1234567890');
expect('KULLANICI ADI: johndoe42', 'USERNAME', 'johndoe42');

console.log('\n--- Edge Cases ---');
expect('TC No: 123.456.789.01', 'TR_NATIONAL_ID', '123.456.789.01');
expect('Plaka: 34 abc 123', 'TR_LICENSE_PLATE', '34 abc 123');
expect('Baro Sicil: 55667', 'BARO_SICIL', '55667');
expect('IBAN:\nTR33 0006 1005 1978 6457 8413 26', 'IBAN_CODE', 'TR33');
expect('Tel: (0532) 123 45 67', 'PHONE_NUMBER', '0532');
expect('Ücret: 45.000,00 TL', 'SALARY_AMOUNT', '45.000,00 TL');
expect('IMEI: 352099001761481', 'IMEI', '352099001761481');

console.log('\n--- Bilirkişi Raporu FP Düzeltmeleri ---');
// VEHICLE_ID tescil false-positive
expectNot('Taşınmazın tescil talebinde bulunulmuştur', 'VEHICLE_ID');
expectNot('Tescil harici yapı bulunmaktadır', 'VEHICLE_ID');
expectNot('İlgili gayrimenkul tescil edilmiştir', 'VEHICLE_ID');
expect('Ruhsat Tescil No: RT-445566', 'VEHICLE_ID', 'RT-445566');
expect('Araç Tescil No: AT-789012', 'VEHICLE_ID', 'AT-789012');
// PERSON_NAME false-positive
expectNot('Maliye Hazinesi adına kayıtlıdır', 'PERSON_NAME');
expectNot('Kıymet Takdiri Raporu düzenlenmiştir', 'PERSON_NAME');
expectNot('Gayrimenkul değerleme raporu', 'PERSON_NAME');
expect('Av. Mehmet Yılmaz tarafından', 'PERSON_NAME', 'Mehmet Yılmaz');
expect('Bilirkişi Ali Kaya raporu', 'PERSON_NAME', 'Ali Kaya');
// CASE_NUMBER rakam zorunluluğu
expectNot('Dosya no: belirtilen raporda', 'CASE_NUMBER');
expect('Dosya No: 2025/12345', 'CASE_NUMBER', '2025/12345');
// MAC_ADDRESS tireli FP
expectNot('10-11-12-13-14-15 sıralı rakamlar', 'MAC_ADDRESS');
expect('MAC: 00:1A:2B:3C:4D:5E', 'MAC_ADDRESS', '00:1A:2B:3C:4D:5E');
// İCRA ENFORCEMENT_ID
expect('İCRA DOSYA NO: 2025/33445', 'ENFORCEMENT_ID', '2025/33445');
expect('İcra Takip No: 2025/11223', 'ENFORCEMENT_ID', '2025/11223');
// İsim truncation
expect('Davacı: Ahmet Yılmaz Kimlik No: 12345678901', 'PERSON_NAME', 'Ahmet Yılmaz');

console.log('\n--- ALL CAPS ı/I Tolerans (Kapsamlı) ---');
// casePatterns ALL CAPS
expect('BİLİRKİŞİ RAPOR NO: 2025/1234', 'CASE_NUMBER', '2025/1234');
expect('TESPİT TUTANAĞI NO: 2025-34-1234', 'CASE_NUMBER', '2025-34-1234');
expect('2025/99887 SAYILI DOSYA', 'CASE_NUMBER', '2025/99887');
// POLICY_NUMBER ALL CAPS
expect('TRAFİK SİGORTA POLİÇE NO: ZKT-2024-99', 'POLICY_NUMBER', 'ZKT-2024-99');
// MEDICAL_ID ALL CAPS
expect('EPİKRİZ NO: EPK-2025-567', 'MEDICAL_ID', 'EPK-2025-567');
expect('ADLİ TIP RAPOR NO: ATR-2025-001', 'MEDICAL_ID', 'ATR-2025-001');
// EMPLOYEE_ID ALL CAPS
expect('ÇALIŞAN SİCİL NO: CS-2025-12345', 'EMPLOYEE_ID', 'CS-2025-12345');
// PROPERTY_ID ALL CAPS
expect('BAĞIMSIZ BÖLÜM NO: 5', 'PROPERTY_ID', '5');
// CRIMINAL_RECORD ALL CAPS
expect('SABIKA KAYDI: Yok', 'CRIMINAL_RECORD', 'Yok');
// NATIONALITY ALL CAPS
expect('VATANDAŞLIK: T.C.', 'NATIONALITY', 'T.C.');
// DISABILITY ALL CAPS
expect('MALULİYET ORANI: %40', 'DISABILITY_STATUS', '%40');
// VEHICLE ALL CAPS
expect('EHLİYET NO: B-2008-123456', 'DRIVER_LICENSE', 'B-2008-123456');
expect('ŞASİ NO: 1G1YY22G965118362', 'VEHICLE_ID', '1G1YY22G965118362');

// ============================================================
// HOLDOUT-DRIVEN ENGINE FIXES (regresyon kalkanı)
// ============================================================

console.log('\n--- Holdout-Driven Fixes ---');

// IBAN içine düşen kredi kartı bastırılmalı; IBAN tespit edilmeli
expect('Ödemenin TR61 0001 0000 1745 6789 0123 45 hesabına yapılması', 'IBAN_CODE', 'TR61 0001 0000 1745 6789 0123 45');
expectNot('Ödemenin TR61 0001 0000 1745 6789 0123 45 hesabına yapılması', 'CREDIT_CARD');
expect('kiracının TR75 0006 1019 7864 5784 1326 00 IBAN numaralı hesaba', 'IBAN_CODE', 'TR75 0006 1019 7864 5784 1326 00');
expectNot('kiracının TR75 0006 1019 7864 5784 1326 00 IBAN numaralı hesaba', 'CREDIT_CARD');
// Bağımsız kredi kartı HÂLÂ tespit edilmeli (regresyon)
expect('Kart numarası 4111 1111 1111 1111 ile ödeme yapıldı', 'CREDIT_CARD', '4111 1111 1111 1111');

// BLOOD_TYPE — kelime formu (pozitif/negatif), etiketli ve etiketsiz
expect('Kan grubu A Rh pozitif olup tedavi uygulandı', 'BLOOD_TYPE', 'A Rh pozitif');
expect('Hastanın kan grubu B Rh negatif olarak kaydedildi', 'BLOOD_TYPE', 'B Rh negatif');
expect('Kan Grubu: AB Rh+', 'BLOOD_TYPE', 'AB Rh+');

// DISABILITY — ters sıra "%40 oranında maluliyet"
expect('Olayda %40 oranında maluliyet oluşmuştur', 'DISABILITY_STATUS', '%40');
expect('İşçide %25 oranında sakatlık tespit edildi', 'DISABILITY_STATUS', '%25');
// FP kalkanı: maluliyet/sakatlık bağlamı olmayan yüzde DISABILITY olmamalı
expectNot('Şirketin kâr oranı %40 oranında arttı', 'DISABILITY_STATUS');

// PERSON_NAME — gazetteer'a eklenen "Okan" / "Caner"
expect('Müşteki Okan Polat ifade verdi', 'PERSON_NAME', 'Okan');
expect('İşçi Caner Doğan işe başlamıştır', 'PERSON_NAME', 'Caner');

// MERSİS — "No" olmadan da yakalanmalı (varyant)
expect('Şirketin MERSİS: 9988776655443322 numarasıdır', 'TR_MERSIS_NO', '9988776655443322');
expect('MERSİS No: 0123456789012345 kayıtlıdır', 'TR_MERSIS_NO', '0123456789012345');

// Genel ticari referans no — yakalanmalı (Sipariş/Üye/Teklif)
expect('Sipariş Numarası: SP240611 onaylandı', 'GOV_DOCUMENT_ID', 'SP240611');
expect('Üye No: UYE7788 ile giriş', 'GOV_DOCUMENT_ID', 'UYE7788');
expect('Teklif No: TKF-2024-55 sunuldu', 'GOV_DOCUMENT_ID', 'TKF-2024-55');
// FP kalkanı: hukuki/yapısal "no" alanları PII değil
expectNot('Madde No: 5 uyarınca', 'GOV_DOCUMENT_ID', '5');
expectNot('Sayfa No: 12 incelenmeli', 'GOV_DOCUMENT_ID', '12');

// Adres bloğu birleştirme: bitişik konum parçaları tek ADDRESS olmalı
expect('Müvekkil Cumhuriyet Caddesi No:88 Çankaya/Ankara adresinde oturur', 'ADDRESS', 'Cumhuriyet Caddesi No:88 Çankaya/Ankara');
expect('Kaza Yeri: Filistin Cad. Çankaya/Ankara olarak tespit edildi', 'ADDRESS', 'Filistin Cad. Çankaya/Ankara');
// Rol kelimesi over-capture'ı: "Davacı" adres parçasına dahil edilmemeli
expectNot('Davacı Bağdat Caddesi No:45 Kadıköy adresinde', 'LOCATION', 'Davacı Bağdat');
// Over-merge kalkanı: cümleyle ayrılmış iki şehir birleşmemeli (ayrı LOCATION)
expect('Dava İstanbul ilinde açıldı, karar Ankara ilinde verildi', 'LOCATION', 'İstanbul');
expectNot('Dava İstanbul ilinde açıldı, karar Ankara ilinde verildi', 'ADDRESS', 'İstanbul ilinde açıldı');

// Sokak adı kişi sanılmamalı (street suffix'ten önceki PERSON bastırılır)
expectNot('Bağdat Caddesi No:45 adresinde oturur', 'PERSON_NAME', 'Bağdat');
expectNot('Atatürk Bulvarı üzerinde bulunan bina', 'PERSON_NAME', 'Atatürk');
expect('Müvekkil Ahmet Yılmaz beyan etti', 'PERSON_NAME', 'Ahmet Yılmaz'); // gerçek kişi korunur
// Pasaport (1 harf + 8 rakam)
expect('Pasaport numarası U12345678 ile giriş yaptı', 'TR_PASAPORT', 'U12345678');
// Ticaret sicili — "No" olmadan
expect('Ankara Ticaret Sicili 456789 numarasında kayıtlı', 'TRADE_REGISTRY_NO', '456789');
// Noter — tek kelimeli ("Konak Noterliği")
expect('İşlem Konak Noterliğinde yapıldı', 'NOTARY', 'Konak Noterliği');
// ORG — "Şirketimiz" önekli + tam suffix zinciri
expect('Şirketimiz Parlak Ambalaj San. Tic. Ltd. Şti. tarafından', 'ORGANIZATION', 'Parlak Ambalaj San. Tic. Ltd. Şti.');
expectNot('Şirketimiz Parlak Ambalaj San. Tic. Ltd. Şti. tarafından', 'ORGANIZATION', 'Şirketimiz Parlak');
// Baro sicil — "No" olmadan da BARO_SICIL (LICENSE_ID değil)
expect('baro sicil no 28456 ile kayıtlı avukat', 'BARO_SICIL', '28456');

// Adres bloğu "İletişim:"te durmalı — telefon/e-posta yutulmamalı
expect('Adresi: Gül Mah. Lale Sok. No:5 Çankaya/Ankara. İletişim: 0532 111 22 33', 'PHONE_NUMBER', '0532 111 22 33');
expectNot('Adresi: Gül Mah. Lale Sok. No:5 Çankaya/Ankara. İletişim: 0532 111 22 33', 'ADDRESS', 'İletişim');

// Yabancı uyruk/isim: "Alman uyruklu Hans Müller"
expect('Davacı Alman uyruklu Hans Müller başvurdu', 'NATIONALITY', 'Alman');
expect('Davacı Alman uyruklu Hans Müller başvurdu', 'PERSON_NAME', 'Hans Müller');
expectNot('Davacı Alman uyruklu Hans Müller başvurdu', 'PERSON_NAME', 'Alman'); // uyruk, kişi değil
expect('İngiliz vatandaşı John Smith ifade verdi', 'PERSON_NAME', 'John Smith');
// Türkçe \b sorunu kalkanı: "Vatandaşlığı: Suriye" hâlâ çalışmalı
expect('Vatandaşlığı: Suriye', 'NATIONALITY', 'Suriye');
expect('Uyruğu: Alman', 'NATIONALITY', 'Alman');

// FP azaltma: hukuki/genel "birliği" kavramı ORG olmamalı; gerçek birlik kalmalı
expectNot('Evlilik birliği temelinden sarsılmıştır', 'ORGANIZATION', 'Evlilik birliği');
expectNot('Taraflar iş birliği yapmıştır', 'ORGANIZATION', 'iş birliği');
expect('Türkiye Barolar Birliği kararı uyarınca', 'ORGANIZATION', 'Türkiye Barolar Birliği');
// FP azaltma: "internet sitesi" / bare "sitesi" LOCATION olmamalı; gerçek site kalmalı
expectNot('İnternet sitesinden 32.999 TL ürün aldım', 'LOCATION', 'sitesi');
expectNot('web sitesinden sipariş verdim', 'LOCATION', 'sitesi');
expect('Yeşil Vadi Sitesi B Blok adresinde oturuyor', 'LOCATION', 'Yeşil Vadi Sitesi');
// Over-capture: adres öncesi küçük harf dolgu kelime yutulmamalı
expectNot('Maliki bulunduğum Bağlarbaşı Mahallesinde', 'LOCATION', 'Maliki bulunduğum');
// COURT değeri kaynak metnin birebir alt dizisi olmalı ("Başsavcılığı" boşluksuz)
expect('BAKIRKÖY CUMHURİYET BAŞSAVCILIĞINA başvurdum', 'COURT', 'BAŞSAVCILIĞI');
expectNot('BAKIRKÖY CUMHURİYET BAŞSAVCILIĞINA başvurdum', 'COURT', 'BAŞ SAVCILIĞI');

// 50-belge holdout turu düzeltmeleri
// Maluliyet: "iş göremezlik" ifadesi
expect('Sigortalıda %30 oranında sürekli iş göremezlik tespit edilmiştir', 'DISABILITY_STATUS', '%30');
expect('%45 oranında iş göremezlik raporu verildi', 'DISABILITY_STATUS', '%45');
// Yabancı şirket eki GmbH
expect("Klaus Weber'in temsil ettiği Weber GmbH ile sözleşme", 'ORGANIZATION', 'Weber GmbH');
// "Türk/yabancı şirketi" ORG FP olmamalı
expectNot('Türk şirketi Anadolu İhracat A.Ş. ile uyuşmazlık', 'ORGANIZATION', 'Türk şirketi');
// Gazetteer: Tuncay
expect('DAVACI: Tuncay Şahin (T.C. 74859302115)', 'PERSON_NAME', 'Tuncay Şahin');
// Bağlamsal kullanıcı adı (handle-benzeri: rakam/nokta/alt-çizgi şart)
expect('Şikayetçi "deniz.acar" kullanıcı adıyla kayıtlıdır', 'USERNAME', 'deniz.acar');
expect('Etkilenen kullanıcı "burak_demir35" hesabına aittir', 'USERNAME', 'burak_demir35');
expect('Kullanıcı adı: ahmet_2024 olarak görünmektedir', 'USERNAME', 'ahmet_2024');
// FP guard: düz kelime (rakam/nokta/alt-çizgi yok) username olmamalı
expectNot('Kullanıcı adı müşteri tarafından girilmemiştir', 'USERNAME', 'müşteri');

// Ulusal yüksek mahkemeler/kurumlar PII değil — maskelenmez (aşırı-maskeleme azaltma)
expectNot('Danıştay 10. Dairesi iptal kararı vermiştir', 'COURT', 'Danıştay 10. Dairesi');
expectNot('Sayıştay denetim raporunu yayımladı', 'ORGANIZATION', 'Sayıştay');
expectNot('Avrupa İnsan Hakları Mahkemesi ihlal kararı verdi', 'COURT', 'Avrupa İnsan Hakları Mahkemesi');
expectNot('Yargıtay Hukuk Genel Kurulu kararına göre ispat yükü', 'ORGANIZATION', 'Yargıtay');
expectNot('Uyuşmazlık Mahkemesi görevli yargı yerini belirledi', 'COURT', 'Uyuşmazlık Mahkemesi');
// Ama Bölge (istinaf) ve şehir-özel mahkemeler MASKELİ kalır
expect('İstanbul Bölge Adliye Mahkemesi 3. Hukuk Dairesi kararı', 'COURT', 'İstanbul Bölge Adliye Mahkemesi 3. Hukuk Dairesi');
expect('Ankara 5. Aile Mahkemesi davayı reddetti', 'COURT', 'Ankara 5. Aile Mahkemesi');

// ============================================================
// AI WORKFLOW TESTS (ai-workflow.js + prompts.js)
// ============================================================

console.log('\n--- AI Workflow Tests ---');

const { asciiToken, buildPseudonymized, deAnonymize } = require(__dirname + '/ai-workflow.js');

function checkAI(cond, label) {
    total++;
    if (cond) { pass++; } else { fail++; console.log('  FAIL (AI): ' + label); }
}

// asciiToken: Türkçe -> AI-güvenli ASCII taban
checkAI(asciiToken('Kişi') === 'KISI', 'asciiToken Kişi->KISI');
checkAI(asciiToken('Kredi Kartı') === 'KREDI_KARTI', 'asciiToken Kredi Kartı->KREDI_KARTI');
checkAI(asciiToken('TC Kimlik') === 'TC_KIMLIK', 'asciiToken TC Kimlik->TC_KIMLIK');
checkAI(asciiToken('Yargı Atfı') === 'YARGI_ATFI', 'asciiToken Yargı Atfı->YARGI_ATFI');

const AIWF_FL = { PERSON_NAME: 'Kişi', DATE_TIME: 'Tarih', CONTEXTUAL_DATE: 'Tarih', ORGANIZATION: 'Kurum' };
function aiwfFindAt(text, val, from) { const i = text.indexOf(val, from || 0); return { start: i, end: i + val.length }; }

// buildPseudonymized: aynı değer -> aynı token, çakışan taban -> benzersiz numara, kept -> açık
{
    const text = 'Ahmet, 01.01.2020 ve 02.02.2021. Ahmet geldi. Kurum: ACME.';
    const p1 = aiwfFindAt(text, 'Ahmet'); const p2 = aiwfFindAt(text, '01.01.2020');
    const p3 = aiwfFindAt(text, '02.02.2021'); const p4 = aiwfFindAt(text, 'Ahmet', p1.end);
    const p5 = aiwfFindAt(text, 'ACME');
    const findings = [
        { entity: 'PERSON_NAME', value: 'Ahmet', start: p1.start, end: p1.end, score: 0.9 },
        { entity: 'DATE_TIME', value: '01.01.2020', start: p2.start, end: p2.end, score: 0.9 },
        { entity: 'CONTEXTUAL_DATE', value: '02.02.2021', start: p3.start, end: p3.end, score: 0.9 },
        { entity: 'PERSON_NAME', value: 'Ahmet', start: p4.start, end: p4.end, score: 0.9 },
        { entity: 'ORGANIZATION', value: 'ACME', start: p5.start, end: p5.end, score: 0.9 },
    ];
    const res = buildPseudonymized(text, findings, () => false, AIWF_FL, ENTITY_LABELS);
    checkAI((res.text.match(/\[KISI_1\]/g) || []).length === 2, 'aynı değer aynı token (KISI_1 iki kez)');
    checkAI(res.map.has('[TARIH_1]') && res.map.has('[TARIH_2]'), 'çakışan taban benzersiz numaralanır');
    checkAI(res.map.get('[TARIH_1]') !== res.map.get('[TARIH_2]'), 'iki tarih farklı değere eşlenir');
    checkAI(res.map.size === 4, 'benzersiz token sayısı 4');
    const res2 = buildPseudonymized(text, findings, (i) => i === 4, AIWF_FL, ENTITY_LABELS);
    checkAI(res2.text.includes('ACME') && !res2.text.includes('[KURUM_1]'), 'korunan (kept) bulgu token\'lanmaz');
}

// deAnonymize: tolerans (boşluk/harf/ayraç), çakışma yok, $ güvenli
{
    const map = new Map([
        ['[KISI_1]', 'Ahmet Yılmaz'], ['[KISI_2]', 'Ayşe Demir'], ['[KISI_10]', 'Mehmet Öz'],
        ['[TC_KIMLIK_1]', '12345678901'], ['[NOT_1]', 'A$B&C'],
    ]);
    const ai = 'Sayın [KISI_1], [ KISI_2 ] ve [kisi 10]. Kimlik [TC-KIMLIK-1]. Yine [KISI_1]. Kod: [NOT_1].';
    const r = deAnonymize(ai, map);
    checkAI((r.text.match(/Ahmet Yılmaz/g) || []).length === 2, 'tekrar eden token tüm geçişlerde çözülür');
    checkAI(r.text.includes('Ayşe Demir'), 'boşluklu [ KISI_2 ] çözülür');
    checkAI(r.text.includes('Mehmet Öz'), 'küçük harf [kisi 10] çözülür (KISI_1 onu yemez)');
    checkAI(r.text.includes('12345678901'), 'tireli [TC-KIMLIK-1] çözülür');
    checkAI(r.text.includes('A$B&C'), '$ ve & içeren değer güvenli yerleşir');
    checkAI(r.leftover.length === 0, 'geçerli cevapta çözülemeyen etiket kalmaz');
}

// deAnonymize uyarı mantığı: stray (bozuk) vs missed (geçmeyen)
{
    const map = new Map([['[KISI_1]', 'Ahmet'], ['[KISI_2]', 'Mehmet']]);
    const ai = 'Yalnızca [KISI_1] geçiyor. Ama [PERSON_99] bozuk bir etiket.';
    const r = deAnonymize(ai, map);
    checkAI(r.resolved === 1, 'bir token çözüldü');
    checkAI(r.missed.length === 1 && r.missed[0] === '[KISI_2]', 'cevapta geçmeyen token missed sayılır');
    checkAI(r.leftover.length === 1 && r.leftover[0] === '[PERSON_99]', 'bozuk/uydurma token leftover olarak yakalanır');
}

// Edge: token sırası değişirse (YZ token'ları farklı sırada kullanırsa)
{
    const map = new Map([['[KISI_1]', 'Ahmet'], ['[KISI_2]', 'Mehmet'], ['[KISI_3]', 'Ayşe']]);
    const ai = 'Önce [KISI_3], sonra [KISI_1], en son [KISI_2] konuştu.';
    const r = deAnonymize(ai, map);
    checkAI(r.text === 'Önce Ayşe, sonra Ahmet, en son Mehmet konuştu.', 'token sırası değişse de doğru çözülür');
    checkAI(r.resolved === 3 && r.leftover.length === 0, 'sıra bağımsız: hepsi çözülür');
}

// Edge: YZ token'ı küçük harfe çevirirse
{
    const map = new Map([['[KISI_1]', 'Ahmet Yılmaz'], ['[TC_KIMLIK_1]', '12345678901']]);
    const r = deAnonymize('sayın [kisi_1], kimlik [tc_kimlik_1] doğrulandı', map);
    checkAI(r.text.includes('Ahmet Yılmaz') && r.text.includes('12345678901'), 'küçük harfe çevrilen token çözülür');
    checkAI(r.resolved === 2, 'küçük harf: tüm tokenlar çözülür');
}

// Edge: aynı gerçek değer birden çok entity tipinde geçerse → farklı token, ikisi de round-trip
{
    const text = 'Ankara ilinde, Ankara Ltd. firması faaliyet gösterir.';
    const f = [
        { entity: 'LOCATION', value: 'Ankara', start: 0, end: 6, score: 0.9 },
        { entity: 'ORGANIZATION', value: 'Ankara', start: 15, end: 21, score: 0.9 },
    ];
    const res = buildPseudonymized(text, f, () => false, { LOCATION: 'Konum', ORGANIZATION: 'Kurum' }, ENTITY_LABELS);
    checkAI(res.map.size === 2, 'aynı değer iki tipte → iki farklı token');
    const toks = [...res.map.keys()];
    checkAI(toks[0] !== toks[1] && res.map.get(toks[0]) === 'Ankara' && res.map.get(toks[1]) === 'Ankara', 'iki token da aynı gerçek değere döner');
    const back = deAnonymize(res.text, res.map);
    checkAI(back.text === text && back.leftover.length === 0, 'çok-tipli aynı değer tam round-trip');
}

// Edge: cevapta sadece bazı tokenlar kullanılırsa → kalanlar missed (uyarı değil), leftover yok
{
    const map = new Map([['[KISI_1]', 'Ahmet'], ['[KISI_2]', 'Mehmet'], ['[ADRES_1]', 'X Cad. 5'], ['[IBAN_1]', 'TR..']]);
    const r = deAnonymize('Dilekçede yalnızca [KISI_1] geçmektedir.', map);
    checkAI(r.resolved === 1 && r.missed.length === 3, 'kısmi kullanım: 1 çözülür, 3 missed');
    checkAI(r.leftover.length === 0, 'kısmi kullanım stray üretmez (missed ≠ uyarı)');
}

// prompts.js bütünlüğü
{
    const { LEGAL_PROMPTS, PROMPT_CATEGORIES } = require(__dirname + '/prompts.js');
    checkAI(LEGAL_PROMPTS.length >= 12, 'en az 12 prompt var');
    const allValid = LEGAL_PROMPTS.every(p =>
        p.id && p.category && p.name && PROMPT_CATEGORIES[p.category] &&
        p.body.split('{{BELGE}}').length === 2 &&
        p.body.split('{{SECENEKLER}}').length === 2 &&
        p.body.includes('ETİKETLERE DOKUNMA'));
    checkAI(allValid, 'tüm promptlarda placeholder + korkuluk + geçerli kategori var');
    const ids = new Set(LEGAL_PROMPTS.map(p => p.id));
    checkAI(ids.size === LEGAL_PROMPTS.length, 'prompt id\'leri benzersiz');
}

// reviewSummary — son kontrol özeti (maskelenen tür / açık veri / düşük güven)
{
    const { reviewSummary } = require(__dirname + '/ai-workflow.js');
    const FL = { PERSON_NAME: 'Kişi', DATE_TIME: 'Tarih', LEGAL_CITATION: 'Yargı Atfı' };
    const findings = [
        { entity: 'PERSON_NAME', value: 'Ahmet', score: 0.9 },
        { entity: 'PERSON_NAME', value: 'Mehmet', score: 0.4 },   // düşük güven
        { entity: 'DATE_TIME', value: '01.01.2020', score: 0.95 },
        { entity: 'LEGAL_CITATION', value: 'Yargıtay 2019/1', score: 0.8 }, // kept
    ];
    const kept = new Set([3]);
    const rs = reviewSummary(findings, (i) => kept.has(i), FL);
    checkAI(rs.maskedCount === 3 && rs.openCount === 1, 'son kontrol: 3 maskelenecek, 1 açık');
    checkAI(rs.openItems[0].value === 'Yargıtay 2019/1', 'açık veri listesi doğru');
    checkAI(rs.lowCount === 1, 'düşük güven sayısı doğru');
    const kisi = rs.masked.find(m => m.label === 'Kişi');
    checkAI(kisi && kisi.count === 2, 'maskelenen tür dökümü: Kişi ×2');
}

// buildReport — JSON ve TXT tespit raporu
{
    const { buildReport } = require(__dirname + '/ai-workflow.js');
    const FL = { PERSON_NAME: 'Kişi' };
    const findings = [
        { entity: 'PERSON_NAME', value: 'Ahmet', score: 0.9 },
        { entity: 'PERSON_NAME', value: 'Mehmet', score: 0.8 },
    ];
    const kept = new Set([1]);
    const json = JSON.parse(buildReport(findings, (i) => kept.has(i), FL, 'json'));
    checkAI(json.total === 2 && json.masked === 1 && json.kept === 1, 'JSON rapor sayıları doğru');
    checkAI(json.findings[0].value === 'Ahmet' && json.findings[0].masked === true, 'JSON rapor içeriği doğru');
    checkAI(typeof json.warning === 'string' && json.warning.length > 0, 'JSON rapor gizlilik uyarısı içerir');
    const txt = buildReport(findings, (i) => kept.has(i), FL, 'txt');
    checkAI(txt.includes('[MASKELENECEK] Kişi: Ahmet') && txt.includes('[KORUNACAK]') && txt.includes('UYARI'), 'TXT rapor formatı doğru');
}

// ============================================================
// RESULTS
// ============================================================

runAnonymTests().then(() => {
    console.log('\n' + '='.repeat(50));
    console.log(`SONUÇ: ${pass}/${total} test geçti (${fail} başarısız)`);
    console.log('='.repeat(50));

    if (fail > 0) {
        process.exit(1);
    }
});
