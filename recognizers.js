// Perde Web - PII Recognizers
// Ported from Microsoft Presidio's predefined recognizers
// Implements: base scores, context enhancement, validation/invalidation, score threshold

// ============================================================
// ENTITY DEFINITIONS
// ============================================================

const ENTITY_COLORS = {
    TR_NATIONAL_ID:     '#ef4444',
    TR_LICENSE_PLATE:    '#ec4899',
    PHONE_NUMBER:        '#f97316',
    EMAIL_ADDRESS:       '#eab308',
    CREDIT_CARD:         '#22c55e',
    IBAN_CODE:           '#06b6d4',
    IP_ADDRESS:          '#6366f1',
    URL:                 '#2563eb',
    DATE_TIME:           '#14b8a6',
    US_SSN:              '#dc2626',
    US_ITIN:             '#b91c1c',
    US_PASSPORT:         '#9f1239',
    US_BANK_NUMBER:      '#6d28d9',
    UK_NHS:              '#7c3aed',
    CRYPTO:              '#d946ef',
    DOMAIN:              '#0891b2',
    PERSON_NAME:         '#0d9488',
    ORGANIZATION:        '#f59e0b',
    LOCATION:            '#84cc16',
    ES_NIF:              '#a855f7',
    MAC_ADDRESS:         '#059669',
    MEDICAL_LICENSE:     '#78716c',
    TR_VERGI_NO:         '#8b5cf6',
    TR_SGK_NO:           '#a855f7',
    TR_PASAPORT:         '#0ea5e9',
    CASE_NUMBER:         '#be185d',
    POLICY_NUMBER:       '#9333ea',
    MEDICAL_ID:          '#dc2626',
    CONTEXTUAL_DATE:     '#0891b2',
    VEHICLE_ID:          '#78716c',
    ADDRESS:             '#65a30d',
    TR_MERSIS_NO:        '#7c3aed',
    LICENSE_ID:          '#d97706',
    BANK_ACCOUNT_NO:     '#0d9488',
    BANK_BRANCH_CODE:    '#6366f1',
    TIME:                '#8b5cf6',
    INVOICE_NO:          '#b45309',
    EMPLOYEE_ID:         '#ea580c',
    COURT:               '#c026d3',
    IMEI:                '#475569',
    PROPERTY_ID:         '#92400e',
    NOTARY_RECORD:       '#a21caf',
    FINANCIAL_ID:        '#0e7490',
    REGISTRY_NO:         '#6d28d9',
    INSURANCE_FILE_NO:   '#b91c1c',
    NOTARY:              '#7e22ce',
    DRIVER_LICENSE:      '#1e40af',
    USERNAME:            '#334155',
    SOCIAL_PROFILE:      '#0f766e',
    GOV_DOCUMENT_ID:     '#4338ca',
    DEVICE_ID:           '#57534e',
    EINVOICE_UUID:       '#7c2d12',
    CHECK_SERIAL_NO:     '#9f1239',
    BARCODE_ID:          '#4c1d95',
    ENFORCEMENT_ID:      '#1e3a5f',
    MILITARY_ID:         '#7e22ce',
    EDUCATION_ID:        '#6d28d9',
    AGE:                 '#ea580c',
    GENDER:              '#c026d3',
    NATIONALITY:         '#0d9488',
    MARITAL_STATUS:      '#6366f1',
    OCCUPATION:          '#b45309',
    BARO_SICIL:          '#9333ea',
    TRADE_REGISTRY_NO:   '#0e7490',
    SWIFT_BIC:           '#475569',
    SALARY_AMOUNT:       '#dc2626',
    KEP_ADDRESS:         '#059669',
    BLOOD_TYPE:          '#dc2626',
    HEALTH_CONDITION:    '#ef4444',
    RELIGION:            '#a855f7',
    ETHNICITY:           '#7c3aed',
    POLITICAL_VIEW:      '#6d28d9',
    UNION_MEMBERSHIP:    '#4338ca',
    CRIMINAL_RECORD:     '#991b1b',
    FOREIGN_ID:          '#b91c1c',
    RESIDENCE_PERMIT:    '#9f1239',
    WORK_PERMIT:         '#7e22ce',
    PENSION_ID:          '#6d28d9',
    BIRTH_PLACE:         '#059669',
    EDUCATION_LEVEL:     '#0891b2',
    MILITARY_STATUS:     '#475569',
    MEDIATION_NO:        '#be185d',
    ARBITRATION_NO:      '#9333ea',
    WARRANT_NO:          '#991b1b',
    PAROLE_ID:           '#4338ca',
    COMMERCIAL_GAZETTE:  '#7c2d12',
    BOND_PROMISSORY:     '#92400e',
    CUSTOMS_DECLARATION: '#1e40af',
    LETTER_OF_CREDIT:    '#0e7490',
    BILL_OF_LADING:      '#334155',
    SEXUAL_LIFE:         '#a21caf',
    BIOMETRIC_DATA:      '#78716c',
    DISABILITY_STATUS:   '#b45309',
    PATENT_NO:           '#0d9488',
    TRADEMARK_NO:        '#6366f1',
    COPYRIGHT_ID:        '#7c3aed',
    DE_TAX_ID:           '#dc2626',
    FR_INSEE:            '#1e40af',
    IT_FISCAL_CODE:      '#059669',
    IN_AADHAAR:          '#f97316',
    MONETARY_AMOUNT:     '#b91c1c',
    LEGAL_CITATION:      '#475569',
};

const ENTITY_LABELS = {
    TR_NATIONAL_ID:     'TC Kimlik No',
    TR_LICENSE_PLATE:    'Plaka (TR)',
    PHONE_NUMBER:        'Telefon',
    EMAIL_ADDRESS:       'E-posta',
    CREDIT_CARD:         'Kredi Kartı',
    IBAN_CODE:           'IBAN',
    IP_ADDRESS:          'IP Adresi',
    URL:                 'URL',
    DATE_TIME:           'Tarih',
    US_SSN:              'US SSN',
    US_ITIN:             'US ITIN',
    US_PASSPORT:         'US Pasaport',
    US_BANK_NUMBER:      'US Banka Hesabı',
    UK_NHS:              'UK NHS',
    CRYPTO:              'Kripto Cüzdan',
    DOMAIN:              'Domain',
    PERSON_NAME:         'Kişi Adı',
    ORGANIZATION:        'Kurum/Kuruluş',
    LOCATION:            'Konum/Adres',
    ES_NIF:              'ES NIF/DNI',
    MAC_ADDRESS:         'MAC Adresi',
    MEDICAL_LICENSE:     'Tıbbi Lisans (DEA)',
    TR_VERGI_NO:         'Vergi No (TR)',
    TR_SGK_NO:           'SGK No (TR)',
    TR_PASAPORT:         'Pasaport (TR)',
    CASE_NUMBER:         'Dosya/Dava No',
    POLICY_NUMBER:       'Poliçe No',
    MEDICAL_ID:          'Hasta/Protokol No',
    CONTEXTUAL_DATE:     'Bağlamsal Tarih',
    VEHICLE_ID:          'Araç Kimlik (Şasi/Motor)',
    ADDRESS:             'Adres',
    TR_MERSIS_NO:        'MERSİS No',
    LICENSE_ID:          'Mesleki Lisans/Sicil',
    BANK_ACCOUNT_NO:     'Banka Hesap No',
    BANK_BRANCH_CODE:    'Şube Kodu',
    TIME:                'Saat',
    INVOICE_NO:          'Fatura No',
    EMPLOYEE_ID:         'Personel/Sicil No',
    COURT:               'Mahkeme',
    IMEI:                'IMEI',
    PROPERTY_ID:         'Tapu/Gayrimenkul No',
    NOTARY_RECORD:       'Noter Kayıt No',
    FINANCIAL_ID:        'Mali Kayıt No',
    REGISTRY_NO:         'Nüfus Kayıt No',
    INSURANCE_FILE_NO:   'Sigorta Dosya No',
    NOTARY:              'Noterlik',
    DRIVER_LICENSE:      'Sürücü Belgesi',
    USERNAME:            'Kullanıcı Adı',
    SOCIAL_PROFILE:      'Sosyal Profil',
    GOV_DOCUMENT_ID:     'Kamu Belge/Başvuru No',
    DEVICE_ID:           'Cihaz/Kayıt ID',
    EINVOICE_UUID:       'E-Fatura UUID (ETTN)',
    CHECK_SERIAL_NO:     'Çek Seri No',
    BARCODE_ID:          'Barkod No',
    ENFORCEMENT_ID:      'İcra Takip Talebi No',
    MILITARY_ID:         'Askerlik No',
    EDUCATION_ID:        'Diploma/Öğrenci No',
    AGE:                 'Yaş',
    GENDER:              'Cinsiyet',
    NATIONALITY:         'Uyruk',
    MARITAL_STATUS:      'Medeni Hal',
    OCCUPATION:          'Meslek',
    BARO_SICIL:          'Baro Sicil No',
    TRADE_REGISTRY_NO:   'Ticaret Sicil No',
    SWIFT_BIC:           'SWIFT/BIC',
    SALARY_AMOUNT:       'Maaş/Gelir',
    KEP_ADDRESS:         'KEP Adresi',
    BLOOD_TYPE:          'Kan Grubu',
    HEALTH_CONDITION:    'Sağlık Durumu/Tanı',
    RELIGION:            'Din/İnanç',
    ETHNICITY:           'Irk/Etnik Köken',
    POLITICAL_VIEW:      'Siyasi Görüş',
    UNION_MEMBERSHIP:    'Sendika Üyeliği',
    CRIMINAL_RECORD:     'Sabıka/Adli Sicil',
    FOREIGN_ID:          'Yabancı Kimlik No',
    RESIDENCE_PERMIT:    'İkamet İzni No',
    WORK_PERMIT:         'Çalışma İzni No',
    PENSION_ID:          'Emekli Sicil No',
    BIRTH_PLACE:         'Doğum Yeri',
    EDUCATION_LEVEL:     'Eğitim Durumu',
    MILITARY_STATUS:     'Askerlik Durumu',
    MEDIATION_NO:        'Arabuluculuk Dosya No',
    ARBITRATION_NO:      'Tahkim Dosya No',
    WARRANT_NO:          'Yakalama/Tutuklama No',
    PAROLE_ID:           'Denetimli Serbestlik No',
    COMMERCIAL_GAZETTE:  'TSG İlan No',
    BOND_PROMISSORY:     'Senet/Bono No',
    CUSTOMS_DECLARATION: 'Gümrük Beyanname No',
    LETTER_OF_CREDIT:    'Akreditif No',
    BILL_OF_LADING:      'Konşimento No',
    SEXUAL_LIFE:         'Cinsel Hayat',
    BIOMETRIC_DATA:      'Biyometrik Veri',
    DISABILITY_STATUS:   'Engel Durumu',
    PATENT_NO:           'Patent No',
    TRADEMARK_NO:        'Marka Tescil No',
    COPYRIGHT_ID:        'Telif/FSEK No',
    DE_TAX_ID:           'Alman Vergi No',
    FR_INSEE:            'Fransız SG No',
    IT_FISCAL_CODE:      'İtalyan Vergi No',
    IN_AADHAAR:          'Hint Aadhaar No',
    MONETARY_AMOUNT:     'Parasal Tutar',
    LEGAL_CITATION:      'Yargı Atfı',
};

const ENTITY_CATEGORIES = {
    'Kimlik & Kamu': {
        icon: 'id',
        entities: ['TR_NATIONAL_ID', 'TR_LICENSE_PLATE', 'TR_VERGI_NO', 'TR_SGK_NO', 'TR_MERSIS_NO', 'TR_PASAPORT',
                   'MILITARY_ID', 'EDUCATION_ID', 'FOREIGN_ID', 'RESIDENCE_PERMIT', 'WORK_PERMIT', 'PENSION_ID'],
    },
    'Kişi & Kurum': {
        icon: 'people',
        entities: ['PERSON_NAME', 'ORGANIZATION', 'LOCATION', 'ADDRESS', 'AGE', 'GENDER', 'NATIONALITY',
                   'MARITAL_STATUS', 'OCCUPATION', 'BIRTH_PLACE', 'EDUCATION_LEVEL', 'MILITARY_STATUS'],
    },
    'Hukuk & Sigorta': {
        icon: 'legal',
        entities: ['CASE_NUMBER', 'POLICY_NUMBER', 'MEDICAL_ID', 'INVOICE_NO', 'LICENSE_ID', 'CONTEXTUAL_DATE', 'VEHICLE_ID', 'COURT', 'EMPLOYEE_ID',
                   'PROPERTY_ID', 'NOTARY_RECORD', 'INSURANCE_FILE_NO', 'NOTARY', 'DRIVER_LICENSE', 'REGISTRY_NO', 'GOV_DOCUMENT_ID',
                   'EINVOICE_UUID', 'CHECK_SERIAL_NO', 'BARCODE_ID', 'ENFORCEMENT_ID', 'BARO_SICIL', 'TRADE_REGISTRY_NO',
                   'MEDIATION_NO', 'ARBITRATION_NO', 'WARRANT_NO', 'PAROLE_ID', 'COMMERCIAL_GAZETTE', 'BOND_PROMISSORY', 'LEGAL_CITATION'],
    },
    'İletişim & Finans': {
        icon: 'finance',
        entities: ['PHONE_NUMBER', 'EMAIL_ADDRESS', 'CREDIT_CARD', 'IBAN_CODE', 'BANK_ACCOUNT_NO', 'BANK_BRANCH_CODE', 'TIME', 'FINANCIAL_ID',
                   'SWIFT_BIC', 'SALARY_AMOUNT', 'MONETARY_AMOUNT', 'CUSTOMS_DECLARATION', 'LETTER_OF_CREDIT', 'BILL_OF_LADING'],
    },
    'Teknik & Dijital': {
        icon: 'tech',
        entities: ['IP_ADDRESS', 'URL', 'DATE_TIME', 'DOMAIN', 'MAC_ADDRESS', 'CRYPTO', 'IMEI', 'USERNAME', 'SOCIAL_PROFILE', 'DEVICE_ID', 'KEP_ADDRESS'],
    },
    'KVKK Özel Nitelikli': {
        icon: 'kvkk',
        entities: ['BLOOD_TYPE', 'HEALTH_CONDITION', 'RELIGION', 'ETHNICITY', 'POLITICAL_VIEW', 'UNION_MEMBERSHIP', 'CRIMINAL_RECORD',
                   'SEXUAL_LIFE', 'BIOMETRIC_DATA', 'DISABILITY_STATUS'],
    },
    'Fikri Mülkiyet': {
        icon: 'patent',
        entities: ['PATENT_NO', 'TRADEMARK_NO', 'COPYRIGHT_ID'],
    },
    'Uluslararası': {
        icon: 'globe',
        entities: ['US_SSN', 'US_ITIN', 'US_PASSPORT', 'US_BANK_NUMBER', 'MEDICAL_LICENSE', 'UK_NHS', 'ES_NIF',
                   'DE_TAX_ID', 'FR_INSEE', 'IT_FISCAL_CODE', 'IN_AADHAAR'],
    },
};

const ENTITY_DESCRIPTIONS = {
    TR_NATIONAL_ID:     { desc: '11 haneli TC Kimlik Numarası (checksum doğrulamalı)', example: '10000000146' },
    TR_LICENSE_PLATE:    { desc: 'Türk araç tescil plakası (01-81 il kodu)', example: '34 ABC 123' },
    TR_VERGI_NO:        { desc: '10 haneli Vergi Kimlik Numarası', example: '1234567890' },
    TR_SGK_NO:          { desc: 'SGK Sicil / Sigorta Numarası', example: '1234567' },
    TR_PASAPORT:        { desc: 'Türk pasaport numarası (1 harf + 8 rakam)', example: 'U12345678' },
    PERSON_NAME:        { desc: 'Kişi ad-soyadları (5.800+ isim sözlüğü)', example: 'Mehmet Demir' },
    ORGANIZATION:       { desc: 'Şirket, kurum, baro, hastane adları', example: 'Axa Sigorta A.Ş.' },
    LOCATION:           { desc: 'İl, ilçe, mahalle ve adres bilgileri', example: 'Kadıköy/İstanbul' },
    CASE_NUMBER:        { desc: 'Esas, karar, dosya, hasar numaraları', example: '2024/12345 E.' },
    POLICY_NUMBER:      { desc: 'Sigorta poliçe numaraları (kasko, ZMS, DASK vb.)', example: 'TRF-2024-0012345' },
    MEDICAL_ID:         { desc: 'Hasta protokol, epikriz, rapor, bilirkişi no', example: 'EPK-2024-00892' },
    CONTEXTUAL_DATE:    { desc: 'Etiketli tarihler: kaza, doğum, vefat tarihi', example: 'Kaza Tarihi: <15.03.2024>' },
    VEHICLE_ID:         { desc: 'Şasi no, motor no, ruhsat no', example: 'WVWZZZ3CZWE123456' },
    ADDRESS:            { desc: 'Tam adres blokları (mah/cad/sok/ilçe/il)', example: 'Kızılay Mah. Atatürk Cad.' },
    TR_MERSIS_NO:       { desc: 'MERSİS Ticaret Sicil Numarası (16 hane)', example: '0572184963100001' },
    LICENSE_ID:         { desc: 'Diploma no, arabulucu sicil, mesleki lisans', example: '557812' },
    BANK_ACCOUNT_NO:    { desc: 'Banka hesap numarası', example: '77841122' },
    BANK_BRANCH_CODE:   { desc: 'Banka şube kodu', example: '1124' },
    TIME:               { desc: 'Saat bilgisi (HH:MM formatı)', example: '14:30' },
    INVOICE_NO:         { desc: 'Fatura numarası (FTR-YYYY-NNNNNN vb.)', example: 'FTR-2025-118742' },
    EMPLOYEE_ID:        { desc: 'Personel sicil/kayıt numarası', example: 'PRS-2024-12345' },
    COURT:              { desc: 'Mahkeme ve savcılık adları', example: 'İstanbul 3. Asliye Hukuk Mahkemesi' },
    IMEI:               { desc: 'Cihaz IMEI numarası', example: '356412778854120' },
    PROPERTY_ID:        { desc: 'Tapu ada, parsel, bağımsız bölüm, tapu kayıt no', example: 'Ada: 884, Parsel: 17' },
    NOTARY_RECORD:      { desc: 'Yevmiye no, ihtarname/ihbarname no, noter belge no', example: '2026/44821' },
    FINANCIAL_ID:       { desc: 'Müşteri, kredi, ticaret sicil, tahsis, ruhsat seri no', example: 'KRD-2024-551882' },
    REGISTRY_NO:        { desc: 'Nüfus kayıt numaraları (cilt, aile sıra, birey sıra)', example: 'Cilt No: 42' },
    INSURANCE_FILE_NO:  { desc: 'Hasar dosya no, eksper dosya no', example: 'HDN-2026-447' },
    NOTARY:             { desc: 'Noterlik adları', example: 'İstanbul 22. Noterliği' },
    GOV_DOCUMENT_ID:    { desc: 'UYAP, CİMER, e-Devlet, tebligat barkod, başvuru no', example: 'UYP-2026-551882' },
    DEVICE_ID:          { desc: 'Kamera kayıt ID, cihaz seri no, e-imza sertifika no', example: 'CAM-2026-118742' },
    EINVOICE_UUID:      { desc: 'E-fatura ETTN (UUID formatı)', example: '7d48a1b7-c5d9-4f21-a882-11874a551882' },
    CHECK_SERIAL_NO:    { desc: 'Çek seri numarası', example: 'CK-77118824' },
    BARCODE_ID:         { desc: 'Barkod numarası (ödeme emri, tebligat)', example: '551188774411' },
    ENFORCEMENT_ID:     { desc: 'İcra takip talebi numarası', example: 'TKP-2026-118742' },
    DRIVER_LICENSE:     { desc: 'Sürücü belgesi numarası', example: 'B-34-118822' },
    USERNAME:           { desc: 'Kullanıcı adları (hesap/platform)', example: 'hakanaydin88' },
    SOCIAL_PROFILE:     { desc: 'Sosyal medya profil URL', example: 'linkedin.com/in/username' },
    PHONE_NUMBER:       { desc: 'Sabit hat ve GSM numaraları', example: '0532 123 45 67' },
    EMAIL_ADDRESS:      { desc: 'E-posta adresleri', example: 'ad@example.com' },
    CREDIT_CARD:        { desc: 'Kredi/banka kartı (Luhn doğrulamalı)', example: '4539 1488 0343 6467' },
    IBAN_CODE:          { desc: 'IBAN hesap numarası (mod-97 doğrulamalı)', example: 'TR33 0006 1005 ...' },
    IP_ADDRESS:         { desc: 'IPv4 ve IPv6 ağ adresleri', example: '192.168.1.100' },
    URL:                { desc: 'Web site adresleri (http/https)', example: 'https://example.com' },
    DATE_TIME:          { desc: 'Tarih ve zaman bilgileri', example: '15.03.2024' },
    DOMAIN:             { desc: 'Alan adları (domain)', example: 'example.com.tr' },
    MAC_ADDRESS:        { desc: 'Ağ cihaz fiziksel adresleri', example: '00:1A:2B:3C:4D:5E' },
    CRYPTO:             { desc: 'Bitcoin/Ethereum cüzdan adresleri', example: 'bc1qar0srrr...' },
    US_SSN:             { desc: 'ABD Sosyal Güvenlik Numarası', example: '123-45-6789' },
    US_ITIN:            { desc: 'ABD Bireysel Vergi Kimlik No', example: '912-50-1234' },
    US_PASSPORT:        { desc: 'ABD Pasaport Numarası', example: '123456789' },
    US_BANK_NUMBER:     { desc: 'ABD Banka Hesap Numarası', example: '12345678' },
    MEDICAL_LICENSE:    { desc: 'ABD DEA İlaç Uygulama Lisansı', example: 'AB1234567' },
    UK_NHS:             { desc: 'İngiltere Ulusal Sağlık Servisi No', example: '943 476 5919' },
    ES_NIF:             { desc: 'İspanya Ulusal Kimlik Numarası', example: '12345678Z' },
    MILITARY_ID:        { desc: 'Askerlik/terhis belge numarası', example: '2024-118742' },
    EDUCATION_ID:       { desc: 'Diploma, öğrenci veya mezun numarası', example: '2024118742' },
    AGE:                { desc: 'Kişinin yaş bilgisi', example: '45 yaşında' },
    GENDER:             { desc: 'Cinsiyet bilgisi (etiketli)', example: 'Cinsiyeti: Erkek' },
    NATIONALITY:        { desc: 'Uyruk/tabiiyet bilgisi', example: 'Uyruğu: T.C.' },
    MARITAL_STATUS:     { desc: 'Medeni hal bilgisi', example: 'Medeni Hali: Evli' },
    OCCUPATION:         { desc: 'Meslek/görev bilgisi', example: 'Mesleği: Avukat' },
    BARO_SICIL:         { desc: 'Baro sicil numarası', example: '45872' },
    TRADE_REGISTRY_NO:  { desc: 'Ticaret sicil numarası', example: '558412' },
    SWIFT_BIC:          { desc: 'Banka SWIFT/BIC kodu (8-11 karakter)', example: 'AKBKTRIS' },
    SALARY_AMOUNT:      { desc: 'Maaş, ücret veya gelir tutarı', example: '15.500 TL' },
    MONETARY_AMOUNT:    { desc: 'Parasal tutar (tazminat, bedel, alacak, gider)', example: '135.000,00 TL' },
    LEGAL_CITATION:     { desc: 'Yargı kararı atfı (Yargıtay, Danıştay, AYM, İçtihat)', example: 'Yargıtay 4. HD 2021/5678 E., 2022/1234 K.' },
    KEP_ADDRESS:        { desc: 'Kayıtlı Elektronik Posta adresi', example: 'firma@hs01.kep.tr' },
    BLOOD_TYPE:         { desc: 'Kan grubu bilgisi', example: 'A Rh+' },
    HEALTH_CONDITION:   { desc: 'Sağlık durumu, tanı veya teşhis', example: 'Tanı: Lomber Disk Hernisi' },
    RELIGION:           { desc: 'Din veya inanç bilgisi (KVKK özel nitelikli)', example: 'Dini: İslam' },
    ETHNICITY:          { desc: 'Irk veya etnik köken bilgisi (KVKK özel nitelikli)', example: 'Etnik Köken: Kürt' },
    POLITICAL_VIEW:     { desc: 'Siyasi görüş veya parti üyeliği (KVKK özel nitelikli)', example: 'Siyasi Görüşü: Sosyal Demokrat' },
    UNION_MEMBERSHIP:   { desc: 'Sendika üyeliği bilgisi (KVKK özel nitelikli)', example: 'Sendika: Türk Metal' },
    CRIMINAL_RECORD:    { desc: 'Sabıka veya adli sicil bilgisi (KVKK özel nitelikli)', example: 'Sabıka Kaydı: Var' },
    FOREIGN_ID:         { desc: 'Yabancı kimlik numarası (99 ile başlayan 11 hane)', example: '99123456780' },
    RESIDENCE_PERMIT:   { desc: 'İkamet izni belge numarası', example: 'IKA-2024-551882' },
    WORK_PERMIT:        { desc: 'Çalışma izni belge numarası', example: 'CI-2024-118742' },
    PENSION_ID:         { desc: 'Emekli sicil veya bağkur numarası', example: 'ESN-2024-77441' },
    BIRTH_PLACE:        { desc: 'Doğum yeri bilgisi', example: 'Doğum Yeri: Ankara' },
    EDUCATION_LEVEL:    { desc: 'Eğitim seviyesi/durumu', example: 'Eğitim: Üniversite' },
    MILITARY_STATUS:    { desc: 'Askerlik durumu bilgisi', example: 'Askerlik Durumu: Yapıldı' },
    MEDIATION_NO:       { desc: 'Arabuluculuk dosya numarası', example: 'ARB-2024-00412' },
    ARBITRATION_NO:     { desc: 'Tahkim dosya numarası', example: 'THK-2024-00118' },
    WARRANT_NO:         { desc: 'Yakalama/tutuklama müzekkeresi numarası', example: 'YAK-2024-551882' },
    PAROLE_ID:          { desc: 'Denetimli serbestlik dosya numarası', example: 'DS-2024-774411' },
    COMMERCIAL_GAZETTE: { desc: 'Türkiye Ticaret Sicili Gazetesi ilan numarası', example: 'TSG-2024-118742' },
    BOND_PROMISSORY:    { desc: 'Senet veya bono numarası', example: 'SNT-2024-55188' },
    CUSTOMS_DECLARATION:{ desc: 'Gümrük beyanname numarası', example: 'GB-2024-IM-118742' },
    LETTER_OF_CREDIT:   { desc: 'Akreditif (Letter of Credit) numarası', example: 'LC-2024-00412' },
    BILL_OF_LADING:     { desc: 'Konşimento numarası', example: 'BL-2024-IST-7744' },
    SEXUAL_LIFE:        { desc: 'Cinsel yaşam bilgisi (KVKK özel nitelikli)', example: 'Cinsel Yönelim: Bilgi' },
    BIOMETRIC_DATA:     { desc: 'Biyometrik veri bilgisi (KVKK özel nitelikli)', example: 'Parmak İzi No: BIO-2024' },
    DISABILITY_STATUS:  { desc: 'Engel/sakatlık durumu (KVKK özel nitelikli)', example: 'Engel Oranı: %40' },
    PATENT_NO:          { desc: 'Patent başvuru veya tescil numarası', example: 'TR 2024/12345' },
    TRADEMARK_NO:       { desc: 'Marka tescil numarası', example: '2024/M-118742' },
    COPYRIGHT_ID:       { desc: 'Telif hakkı/FSEK tescil numarası', example: 'TEL-2024-00412' },
    DE_TAX_ID:          { desc: 'Alman vergi kimlik numarası (Steuer-IdNr, 11 hane)', example: '12345678901' },
    FR_INSEE:           { desc: 'Fransız sosyal güvenlik numarası (NIR, 13+2 hane)', example: '1850175123456 78' },
    IT_FISCAL_CODE:     { desc: 'İtalyan mali kimlik kodu (Codice Fiscale, 16 karakter)', example: 'RSSMRA85M01H501Z' },
    IN_AADHAAR:         { desc: 'Hint Aadhaar kimlik numarası (12 hane)', example: '2345 6789 0123' },
};

// ============================================================
// VALIDATION ALGORITHMS (from Presidio source)
// ============================================================

function luhnCheck(num) {
    const digits = num.replace(/\D/g, '');
    if (digits.length < 12 || digits.length > 19) return false;
    let sum = 0;
    let alternate = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let n = parseInt(digits[i], 10);
        if (alternate) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        sum += n;
        alternate = !alternate;
    }
    return sum % 10 === 0;
}

function tcKimlikCheck(num) {
    const digits = num.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (digits[0] === '0') return false;
    const d = digits.split('').map(Number);
    const oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
    const evenSum = d[1] + d[3] + d[5] + d[7];
    const check10 = (oddSum * 7 - evenSum) % 10;
    if (check10 < 0 ? check10 + 10 : check10 !== d[9]) return false;
    let total = 0;
    for (let i = 0; i < 10; i++) total += d[i];
    if (total % 10 !== d[10]) return false;
    return true;
}

function ibanMod97Check(iban) {
    const cleaned = iban.replace(/[\s\-]/g, '').toUpperCase();
    if (cleaned.length < 15 || cleaned.length > 34) return false;
    if (!/^[A-Z]{2}\d{2}/.test(cleaned)) return false;
    const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
    let numStr = '';
    for (const ch of rearranged) {
        if (ch >= '0' && ch <= '9') numStr += ch;
        else if (ch >= 'A' && ch <= 'Z') numStr += (ch.charCodeAt(0) - 55).toString();
        else return false;
    }
    let remainder = 0;
    for (let i = 0; i < numStr.length; i++) {
        remainder = (remainder * 10 + parseInt(numStr[i], 10)) % 97;
    }
    return remainder === 1;
}

function nhsCheck(num) {
    const digits = num.replace(/\D/g, '');
    if (digits.length !== 10) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(digits[i], 10) * (10 - i);
    }
    const check = 11 - (sum % 11);
    if (check === 11) return parseInt(digits[9], 10) === 0;
    if (check === 10) return false;
    return check === parseInt(digits[9], 10);
}

function abaRoutingCheck(num) {
    const digits = num.replace(/\D/g, '');
    if (digits.length !== 9) return false;
    const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1];
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i], 10) * weights[i];
    return sum % 10 === 0;
}

function deaCheck(num) {
    const cleaned = num.replace(/[\s\-]/g, '');
    if (cleaned.length < 9) return false;
    const digits = cleaned.slice(2);
    if (digits.length < 7) return false;
    let sum1 = 0, sum2 = 0;
    for (let i = 0; i < 6; i++) {
        const d = parseInt(digits[i], 10);
        if (isNaN(d)) return false;
        if (i % 2 === 0) sum1 += d;
        else sum2 += d;
    }
    const checkDigit = (sum1 + sum2 * 2) % 10;
    return checkDigit === parseInt(digits[6], 10);
}

function esNifCheck(text) {
    const cleaned = text.replace(/[\s\-]/g, '');
    const match = cleaned.match(/^(\d{1,8})([A-Z])$/);
    if (!match) return false;
    const num = parseInt(match[1], 10);
    const letter = match[2];
    const expected = 'TRWAGMYFPDXBNJZSQVHLCKE'[num % 23];
    return letter === expected;
}

// ============================================================
// CONTEXT-AWARE SCORE ENHANCEMENT (from Presidio's LemmaContextAwareEnhancer)
// ============================================================

const CONTEXT_SIMILARITY_FACTOR = 0.35;
const MIN_SCORE_WITH_CONTEXT = 0.4;
const CONTEXT_PREFIX_COUNT = 5;
const CONTEXT_SUFFIX_COUNT = 2;

function extractSurroundingWords(text, start, end) {
    const before = text.substring(0, start);
    const after = text.substring(end);

    // Collapse abbreviations: "T.C." → "TC", "A.Ş." → "AŞ"
    const collapse = s => s.replace(/\b([A-ZÇĞİÖŞÜa-zçğıöşü])\.([A-ZÇĞİÖŞÜa-zçğıöşü])\./g, '$1$2');
    const beforeWords = collapse(before).split(/[\s,.:;!?()[\]{}"'\/\-]+/).filter(w => w.length > 1);
    const afterWords = collapse(after).split(/[\s,.:;!?()[\]{}"'\/\-]+/).filter(w => w.length > 1);

    const prefix = beforeWords.slice(-CONTEXT_PREFIX_COUNT);
    const suffix = afterWords.slice(0, CONTEXT_SUFFIX_COUNT);

    return [...prefix, ...suffix].map(w => contextLower(w));
}

function contextLower(s) {
    return s.replace(/İ/g, 'i').replace(/I/g, 'i').toLowerCase();
}

function enhanceScoreWithContext(score, contextWords, surroundingWords) {
    if (!contextWords || contextWords.length === 0) return score;
    if (surroundingWords.length === 0) return score;

    const contextTokens = new Set();
    for (const cw of contextWords) {
        const tokens = contextLower(cw).split(/\s+/);
        if (tokens.length === 1) {
            if (tokens[0].length > 1) contextTokens.add(tokens[0]);
        } else {
            // Multi-word: only add tokens with 3+ chars to avoid "no", "id", etc.
            for (const token of tokens) {
                if (token.length > 2) contextTokens.add(token);
            }
        }
    }

    const hasContext = surroundingWords.some(sw =>
        [...contextTokens].some(ct => sw.includes(ct))
    );

    if (hasContext) {
        let newScore = score + CONTEXT_SIMILARITY_FACTOR;
        newScore = Math.max(newScore, MIN_SCORE_WITH_CONTEXT);
        newScore = Math.min(newScore, 1.0);
        return newScore;
    }

    return score;
}

// ============================================================
// RECOGNIZER DEFINITIONS (exact Presidio patterns & scores)
// ============================================================

const RECOGNIZERS = [

    // ---- TURKISH ----
    {
        entity: 'TR_NATIONAL_ID',
        patterns: [
            { regex: /\b([1-9][0-9]{10})\b/g, score: 0.3 },
            { regex: /\b([1-9]\d{2}[.\s]\d{3}[.\s]\d{3}[.\s]\d{2})\b/g, score: 0.3 },
        ],
        context: ['tc', 't.c.', 'kimlik', 'tckn', 'tc no', 'tc kimlik', 'kimlik no',
                  'kimlik numarası', 'nüfus cüzdanı', 'nüfus', 'national id', 'turkish id'],
        replacePairs: [['.', ''], [' ', '']],
        validate: (text) => tcKimlikCheck(text) ? true : null,
    },
    {
        entity: 'TR_LICENSE_PLATE',
        patterns: [
            { regex: /\b((?:0[1-9]|[1-7][0-9]|8[01])\s?[A-Za-z]{1,3}\s?\d{2,4})\b/g, score: 0.3 },
            { regex: /\b((?:0[1-9]|[1-7][0-9]|8[01])-[A-Za-z]{1,3}-\d{2,4})\b/g, score: 0.3 },
        ],
        context: ['plaka', 'araç', 'aracı', 'araç plakası', 'plaka numarası', 'kayıt plakası', 'license plate',
                  'plate', 'taşıt', 'kayıt'],
        validate: (text) => {
            const cleaned = text.replace(/[\s\-]/g, '').toUpperCase();
            if (!/^(?:0[1-9]|[1-7][0-9]|8[01])[A-Z]{1,3}\d{2,4}$/.test(cleaned)) return false;
            const province = parseInt(cleaned.match(/^\d{2}/)[0], 10);
            return province >= 1 && province <= 81 ? null : false;
        },
    },
    {
        entity: 'TR_VERGI_NO',
        patterns: [
            { regex: /\b(\d{10})\b/g, score: 0.01 },
        ],
        context: ['vergi', 'vkn', 'tax'],
        validate: (text) => {
            const digits = text.replace(/\D/g, '');
            return digits.length === 10 ? null : false;
        },
    },
    {
        entity: 'TR_SGK_NO',
        patterns: [
            { regex: /\b(\d{7,11})\b/g, score: 0.01 },
            { regex: /\b(\d{7}\-\d{2}\-\d{2})\b/g, score: 0.3 },
        ],
        context: ['sgk', 'sigorta', 'ssk', 'sicil', 'sigortalı', 'hizmet dökümü', 'işveren'],
    },
    {
        entity: 'TR_MERSIS_NO',
        patterns: [
            { regex: /\b(0\d{15})\b/g, score: 0.01 },
        ],
        context: ['mersis', 'mersıs', 'ticaret sicil', 'ticaret sicili'],
    },
    {
        entity: 'TR_PASAPORT',
        patterns: [
            { regex: /\b([A-Z]\d{8})\b/g, score: 0.1 },
        ],
        context: ['pasaport', 'passport', 'pasaport no', 'pasaport numarası',
                  'travel document', 'seyahat'],
    },

    // ---- GENERIC / INTERNATIONAL ----
    {
        entity: 'CREDIT_CARD',
        patterns: [
            {
                regex: /\b(?!1\d{12}(?!\d))(?:(?:4\d{3})|(?:5[0-5]\d{2})|(?:6\d{3})|(?:1\d{3})|(?:3\d{3}))[- ]?(?:\d{3,4})[- ]?(?:\d{3,4})[- ]?(\d{3,5})\b/g,
                score: 0.3,
                fullMatch: true,
            },
            {
                regex: /\b(\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4})\b/g,
                score: 0.3,
            },
        ],
        context: ['credit', 'card', 'visa', 'mastercard', 'cc', 'amex', 'discover',
                  'jcb', 'diners', 'maestro', 'kart', 'kredi', 'kredi kartı', 'banka kartı'],
        validate: (text) => luhnCheck(text) ? true : false,
        replacePairs: [['-', ''], [' ', '']],
    },
    {
        entity: 'EMAIL_ADDRESS',
        patterns: [
            {
                regex: /\b([a-zA-Z0-9.!#$%&'*+\-/=?^_`{|}~]+@[a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,})\b/g,
                score: 0.5,
            },
        ],
        context: ['email', 'e-posta', 'eposta', 'mail'],
        validate: (text) => {
            const parts = text.split('@');
            if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
            const domainParts = parts[1].split('.');
            const tld = domainParts[domainParts.length - 1];
            return tld.length >= 2 ? true : false;
        },
    },
    {
        entity: 'PHONE_NUMBER',
        patterns: [
            // Turkish formats: 0532 123 45 67, 0532-123-45-67, 0(532)123 45 67
            { regex: /(?<!\d)(\+90\s*\(?\s*[1-9]\d{2}\s*\)?\s*\d{3}\s*[\-\s]?\d{2}\s*[\-\s]?\d{2})(?!\d)/g, score: 0.4 },
            { regex: /(?<!\d)(0\s*\(?\s*[1-9]\d{2}\s*\)?\s*\d{3}\s*[\-\s]?\d{2}\s*[\-\s]?\d{2})(?!\d)/g, score: 0.4 },
            { regex: /(?<!\d)(\+90\s?[1-9]\d{2}\s?\d{3}\s?\d{4})(?!\d)/g, score: 0.4 },
            { regex: /(?<!\d)(0[1-9]\d{2}[\-\s]?\d{3}[\-\s]?\d{2}[\-\s]?\d{2})(?!\d)/g, score: 0.4 },
            { regex: /(?<!\d)(0[1-9]\d{2}[\-\s]?\d{3}[\-\s]?\d{4})(?!\d)/g, score: 0.4 },
            // Parenthesized area code: (532) 123 45 67
            { regex: /(?<!\d)(\(?0?[1-9]\d{2}\)\s*\d{3}\s*[\-\s]?\d{2}\s*[\-\s]?\d{2})(?!\d)/g, score: 0.35 },
            // 0090 prefix (international dial)
            { regex: /(?<!\d)(0090\s*\(?\s*[1-9]\d{2}\s*\)?\s*\d{3}\s*[\-\s]?\d{2}\s*[\-\s]?\d{2})(?!\d)/g, score: 0.4 },
            { regex: /(?<!\d)(0090[\-\s]?[1-9]\d{2}[\-\s]?\d{3}[\-\s]?\d{4})(?!\d)/g, score: 0.4 },
            // International formats
            { regex: /(?<!\d)(\+[1-9]\d{0,2}\s?\(?\d{1,4}\)?\s?[\d\s\-]{4,12})(?!\d)/g, score: 0.3 },
        ],
        context: ['phone', 'telephone', 'tel', 'cell', 'mobile', 'call', 'telefon',
                  'cep', 'gsm', 'iletişim', 'ara', 'numara', 'number'],
        validate: (text) => {
            const digits = text.replace(/\D/g, '');
            if (digits.length < 10 || digits.length > 15) return false;
            if (/^(.)\1+$/.test(digits)) return false;
            return null; // keep base score, let context decide
        },
    },
    {
        entity: 'IBAN_CODE',
        patterns: [
            {
                regex: /(?<![A-Z0-9])([A-Z]{2}\d{2}(?:[\s\-]?[A-Z0-9]{4}){2,7}(?:[\s\-]?[A-Z0-9]{1,4})?)(?![A-Z0-9])/g,
                score: 0.3,
            },
        ],
        context: ['iban', 'bank', 'transaction', 'banka', 'hesap', 'havale', 'transfer'],
        validate: (text) => ibanMod97Check(text) ? true : null,
        replacePairs: [['-', ''], [' ', '']],
    },
    {
        entity: 'IP_ADDRESS',
        patterns: [
            {
                regex: /\b((?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?:\/(?:[0-2]?\d|3[0-2]))?)\b/g,
                score: 0.6,
            },
            {
                regex: /\b((?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4})\b/g,
                score: 0.6,
            },
        ],
        context: ['ip', 'ipv4', 'ipv6', 'address', 'adres', 'sunucu', 'server'],
        invalidate: (text) => {
            if (text.includes(':')) return false;
            const parts = text.replace(/\/\d+$/, '').split('.');
            if (parts.length !== 4) return true;
            return !parts.every(p => {
                const n = parseInt(p, 10);
                return !isNaN(n) && n >= 0 && n <= 255 && p === n.toString();
            });
        },
    },
    {
        entity: 'URL',
        patterns: [
            { regex: /((?:https?|ftp|s3|file):\/\/(?:[a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}(?::\d{1,5})?(?:[\/?#][^\s<>"'{}|\\^`\[\];!),]*)?)/g, score: 0.6, prefixLen: 0 },
        ],
        context: ['url', 'website', 'link', 'web', 'site'],
        validate: (text) => text.includes('.') && text.length > 4 ? null : false,
    },
    {
        entity: 'DATE_TIME',
        patterns: [
            { regex: /\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:?\d{2})?)\b/g, score: 0.8 },
            { regex: /\b(\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4}\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?)\b/g, score: 0.7 },
            { regex: /\b(\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4})\b/g, score: 0.6 },
            { regex: /\b(\d{4}[\/\.\-]\d{2}[\/\.\-]\d{2}\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?)\b/g, score: 0.7 },
            { regex: /\b(\d{4}[\/\.\-]\d{2}[\/\.\-]\d{2})\b/g, score: 0.6 },
            { regex: /(\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+\d{4})/gi, score: 0.6 },
            { regex: /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/gi, score: 0.6 },
            { regex: /\b(\d{2}[\/\-]\d{4})\b/g, score: 0.2 },
            { regex: /\b(\d{2}[\/\-]\d{2})\b/g, score: 0.1 },
        ],
        context: ['date', 'tarih', 'doğum', 'birthday', 'born', 'doğum tarihi', 'birth'],
        validate: (text) => {
            const match = text.match(/(\d{1,4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,4})/);
            if (!match) return null;
            const parts = [parseInt(match[1],10), parseInt(match[2],10), parseInt(match[3],10)];
            const month = parts.find(p => p >= 1 && p <= 12);
            const day = parts.find(p => p >= 1 && p <= 31);
            if (!month || !day) return false;
            return null;
        },
    },
    {
        entity: 'MAC_ADDRESS',
        patterns: [
            { regex: /\b([0-9A-Fa-f]{2}:(?:[0-9A-Fa-f]{2}:){4}[0-9A-Fa-f]{2})\b/g, score: 0.5 },
            { regex: /\b([0-9A-Fa-f]{2}\-(?:[0-9A-Fa-f]{2}\-){4}[0-9A-Fa-f]{2})\b/g, score: 0.15 },
            { regex: /\b([0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4})\b/g, score: 0.6 },
        ],
        context: ['mac', 'mac address', 'hardware address', 'physical address', 'ethernet'],
        invalidate: (text) => {
            const cleaned = text.replace(/[\-:\.\s]/g, '').toUpperCase();
            return cleaned === 'FFFFFFFFFFFF' || cleaned === '000000000000';
        },
    },
    {
        entity: 'IMEI',
        patterns: [
            { regex: /(?<!\d)(\d{15})(?!\d)/g, score: 0.01 },
        ],
        context: ['imei', 'cihaz', 'telefon', 'device', 'seri no', 'serial'],
        validate: (text) => {
            if (!/^\d{15}$/.test(text)) return false;
            let sum = 0;
            for (let i = 0; i < 15; i++) {
                let d = parseInt(text[i]);
                if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
                sum += d;
            }
            return sum % 10 === 0 ? true : null;
        },
    },
    {
        entity: 'SOCIAL_PROFILE',
        patterns: [
            { regex: /\b((?:linkedin\.com|twitter\.com|x\.com|instagram\.com|facebook\.com|github\.com)\/(?:in\/|@)?[a-zA-Z0-9._\-]+)\b/g, score: 0.8 },
            { regex: /(?:^|[\s,;])(@[a-zA-Z0-9._]{3,30})\b/gm, score: 0.2 },
        ],
        context: ['linkedin', 'twitter', 'instagram', 'profil', 'profile', 'sosyal medya',
                  'hesap', 'kullanıcı', 'takip', 'mention', 'handle', 'x', 'tiktok'],
    },
    {
        entity: 'DOMAIN',
        patterns: [
            { regex: /\b((?:[a-zA-Z0-9\-]+\.)+(?:com|net|org|edu|gov|io|co|info|biz|me|tv|cc|tr|de|fr|uk|eu|ru|cn|jp|br|in|au|ca|us|nl|se|no|fi|dk|ch|at|be|es|it|pt|pl|cz|hu|ro|bg|hr|sk|si|lt|lv|ee|com\.tr|org\.tr|gov\.tr|co\.uk|com\.au|co\.in))\b/g, score: 0.5 },
        ],
        context: ['domain', 'website', 'site', 'web'],
        validate: (text) => text.includes('.') && text.length > 4 ? null : false,
    },
    {
        entity: 'CRYPTO',
        patterns: [
            { regex: /\b((?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,59})\b/g, score: 0.5 },
            { regex: /\b(0x[0-9a-fA-F]{40})\b/g, score: 0.5 },
        ],
        context: ['wallet', 'btc', 'bitcoin', 'crypto', 'ethereum', 'eth', 'cüzdan', 'kripto'],
    },

    // ---- KEP (Kayıtlı Elektronik Posta) ----
    {
        entity: 'KEP_ADDRESS',
        patterns: [
            { regex: /\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]*\.?kep\.tr)\b/g, score: 1.0 },
        ],
        context: ['kep', 'kayıtlı elektronik posta', 'tebligat'],
    },

    // ---- UETS (Ulusal Elektronik Tebligat Sistemi) — 15 haneli: XXXXX-XXXXX-XXXXX ----
    {
        entity: 'KEP_ADDRESS',
        patterns: [
            { regex: /\b(\d{5}[\-\s]\d{5}[\-\s]\d{5})\b/g, score: 0.4 },
        ],
        context: ['uets', 'elektronik tebligat', 'tebligat', 'e-tebligat', 'tebligat adresi'],
    },

    // ---- SWIFT/BIC ----
    {
        entity: 'SWIFT_BIC',
        patterns: [
            { regex: /\b([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/g, score: 0.01 },
        ],
        context: ['swift', 'bic', 'swift kodu', 'bic kodu', 'swift/bic', 'havale', 'uluslararası transfer'],
    },

    // ---- USA ----
    {
        entity: 'US_SSN',
        patterns: [
            { regex: /\b(\d{3}[- .]\d{2}[- .]\d{4})\b/g, score: 0.5 },
            { regex: /\b(\d{9})\b/g, score: 0.05 },
            { regex: /\b(\d{5})-(\d{4})\b/g, score: 0.05 },
        ],
        context: ['social', 'security', 'ssn', 'ssns', 'ssid'],
        validate: (text) => {
            const digits = text.replace(/\D/g, '');
            if (digits.length !== 9) return false;
            const area = parseInt(digits.substring(0, 3), 10);
            const group = parseInt(digits.substring(3, 5), 10);
            const serial = parseInt(digits.substring(5, 9), 10);
            if (area === 0 || area === 666 || area >= 900) return false;
            if (group === 0 || serial === 0) return false;
            return null;
        },
        invalidate: (text) => {
            const digits = text.replace(/\D/g, '');
            if (digits.length !== 9) return false;
            if (/^(.)\1{8}$/.test(digits)) return true;
            if (digits === '123456789' || digits === '987654321') return true;
            if (digits === '078051120') return true;
            const delimiters = text.match(/[\-\. ]/g);
            if (delimiters && delimiters.length >= 2) {
                if (new Set(delimiters).size > 1) return true;
            }
            return false;
        },
    },
    {
        entity: 'US_ITIN',
        patterns: [
            { regex: /\b(9\d{2}[- ](5\d|6[0-5]|7\d|8[0-8]|9[0-24-9])[- ]\d{4})\b/g, score: 0.5 },
            { regex: /\b(9\d{2}(5\d|6[0-5]|7\d|8[0-8]|9[0-24-9])\d{4})\b/g, score: 0.3 },
        ],
        context: ['individual', 'taxpayer', 'itin', 'tax', 'payer', 'taxid', 'tin'],
    },
    {
        entity: 'US_PASSPORT',
        patterns: [
            { regex: /\b(\d{9})\b/g, score: 0.05 },
            { regex: /\b([A-Z]\d{8})\b/g, score: 0.1 },
        ],
        context: ['us', 'united', 'states', 'passport', 'travel', 'document'],
    },
    {
        entity: 'US_BANK_NUMBER',
        patterns: [
            { regex: /\b(\d{8,17})\b/g, score: 0.05 },
        ],
        context: ['check', 'account', 'acct', 'bank', 'save', 'debit', 'routing'],
    },
    {
        entity: 'MEDICAL_LICENSE',
        patterns: [
            {
                regex: /\b([ABCDEFGHJKLMPRSTUXabcdefghjklmprstux][a-zA-Z]\d{7})\b/g,
                score: 0.4,
            },
        ],
        context: ['medical', 'certificate', 'dea', 'license', 'drug', 'enforcement'],
        validate: (text) => deaCheck(text) ? true : false,
        replacePairs: [['-', ''], [' ', '']],
    },

    // ---- EUROPE ----
    {
        entity: 'UK_NHS',
        patterns: [
            { regex: /\b(\d{3}[\s\-]?\d{3}[\s\-]?\d{4})\b/g, score: 0.5 },
        ],
        context: ['national health service', 'nhs', 'health services authority', 'health authority'],
        validate: (text) => nhsCheck(text) ? true : false,
        replacePairs: [['-', ''], [' ', '']],
    },
    {
        entity: 'ES_NIF',
        patterns: [
            { regex: /\b(\d{1,8}[\-]?[A-Z])\b/g, score: 0.5 },
        ],
        context: ['documento nacional de identidad', 'dni', 'nif', 'identificación',
                  'documento', 'identidad'],
        validate: (text) => esNifCheck(text) ? true : false,
    },

    // ---- FOREIGN_ID (99xxxxxxxxx, 11 digits starting with 99) ----
    // TCKN and foreign identity numbers can share the same checksum shape,
    // therefore classification must be driven by the surrounding label/context.
    {
        entity: 'FOREIGN_ID',
        patterns: [
            { regex: /\b(99\d{9})\b/g, score: 0.01 },
        ],
        // Keep tokens distinctive: the context enhancer splits phrases into
        // words, so a generic token such as "kimlik" would also match TCKN labels.
        context: ['yabancı', 'foreign', 'foreigners', 'göçmen', 'mülteci', 'sığınmacı',
                  'geçici koruma'],
    },

    // ---- GERMANY: Steuer-IdNr (11 digits) ----
    {
        entity: 'DE_TAX_ID',
        patterns: [
            { regex: /\b(\d{11})\b/g, score: 0.01 },
        ],
        context: ['steuer', 'steuernummer', 'identifikationsnummer', 'finanzamt', 'alman vergi',
                  'german tax', 'de tax', 'steuer-idnr', 'idnr'],
    },

    // ---- FRANCE: INSEE / NIR (1 or 2 + 12 digits + optional 2-digit key) ----
    {
        entity: 'FR_INSEE',
        patterns: [
            { regex: /\b([12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}(?:\s?\d{2})?)\b/g, score: 0.01 },
        ],
        context: ['insee', 'nir', 'sécurité sociale', 'numéro de sécurité', 'fransız',
                  'french social', 'social security france'],
    },

    // ---- ITALY: Codice Fiscale (16 alphanumeric) ----
    {
        entity: 'IT_FISCAL_CODE',
        patterns: [
            { regex: /\b([A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z])\b/g, score: 0.5 },
        ],
        context: ['codice fiscale', 'fiscal code', 'italia', 'italyan', 'italian tax',
                  'cf:', 'c.f.', 'cod.fisc'],
    },

    // ---- INDIA: Aadhaar (12 digits, starts with 2-9) ----
    {
        entity: 'IN_AADHAAR',
        patterns: [
            { regex: /\b([2-9]\d{3}[\s\-]?\d{4}[\s\-]?\d{4})\b/g, score: 0.01 },
        ],
        context: ['aadhaar', 'aadhar', 'uid', 'unique identification', 'hindistan',
                  'indian id', 'india id', 'hint kimlik'],
        replacePairs: [['-', ''], [' ', '']],
    },
];

// Name detection moved to ner-engine.js (dictionary + ML NER)

// ============================================================
// ANALYZER ENGINE (from Presidio's AnalyzerEngine)
// ============================================================

function analyzeText(text, enabledEntities, scoreThreshold = 0.35) {
    // Normalize smart quotes to ASCII for consistent word boundary matching
    text = text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

    const allFindings = [];

    for (const recognizer of RECOGNIZERS) {
        if (!enabledEntities.has(recognizer.entity)) continue;

        for (const pattern of recognizer.patterns) {
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
            let match;

            while ((match = regex.exec(text)) !== null) {
                let value = pattern.fullMatch ? match[0] : (match[1] || match[0]);
                let start = match.index + match[0].indexOf(value);
                let end = start + value.length;

                // Apply replacement pairs before validation
                let cleanedValue = value;
                if (recognizer.replacePairs) {
                    for (const [from, to] of recognizer.replacePairs) {
                        cleanedValue = cleanedValue.split(from).join(to);
                    }
                }

                // Start with base score from pattern
                let score = pattern.score;

                // Step 1: Invalidation check
                if (recognizer.invalidate) {
                    const invalidated = recognizer.invalidate(cleanedValue);
                    if (invalidated) {
                        score = 0;
                        continue;
                    }
                }

                // Step 2: Validation check (Presidio's 3-way: true/false/null)
                if (recognizer.validate) {
                    const validationResult = recognizer.validate(cleanedValue);
                    if (validationResult === true) {
                        score = 1.0; // MAX_SCORE
                    } else if (validationResult === false) {
                        score = 0; // MIN_SCORE - discard
                        continue;
                    }
                    // validationResult === null → keep base score
                }

                // Step 3: Context enhancement
                const surroundingWords = extractSurroundingWords(text, start, end);
                score = enhanceScoreWithContext(score, recognizer.context, surroundingWords);

                // Step 4: Apply score threshold
                if (score < scoreThreshold) continue;

                allFindings.push({
                    entity: recognizer.entity,
                    value: value,
                    start: start,
                    end: end,
                    score: score,
                });
            }
        }
    }

    // Dictionary-based NER (names, organizations, locations, legal entities)
    if (typeof runDictionaryNER === 'function') {
        const dictFindings = runDictionaryNER(text, enabledEntities, scoreThreshold);
        allFindings.push(...dictFindings);
    }

    // Prefer the explicit foreign-identity interpretation over TCKN when both
    // recognizers cover the exact same 99-prefix span.
    const foreignSpans = new Set(
        allFindings
            .filter(f => f.entity === 'FOREIGN_ID')
            .map(f => `${f.start}:${f.end}`)
    );
    for (let i = allFindings.length - 1; i >= 0; i--) {
        const f = allFindings[i];
        if (f.entity === 'TR_NATIONAL_ID' && foreignSpans.has(`${f.start}:${f.end}`)) {
            allFindings.splice(i, 1);
        }
    }

    // Suppress EMAIL_ADDRESS when overlapping KEP_ADDRESS
    for (let i = allFindings.length - 1; i >= 0; i--) {
        const f = allFindings[i];
        if (f.entity === 'EMAIL_ADDRESS') {
            const hasKep = allFindings.some(o =>
                o.entity === 'KEP_ADDRESS' && o.start === f.start && o.end === f.end
            );
            if (hasKep) { allFindings.splice(i, 1); }
        }
    }

    // Suppress TR_NATIONAL_ID when overlapping labeled TR_VERGI_NO
    const vergiSpans = new Set(
        allFindings
            .filter(f => f.entity === 'TR_VERGI_NO' && f.source === 'label')
            .map(f => `${f.start}:${f.end}`)
    );
    for (let i = allFindings.length - 1; i >= 0; i--) {
        const f = allFindings[i];
        if (f.entity === 'TR_NATIONAL_ID' && vergiSpans.has(`${f.start}:${f.end}`)) {
            allFindings.splice(i, 1);
        }
    }

    // Suppress UK_NHS when overlapping TR_VERGI_NO (Turkish tax context)
    for (let i = allFindings.length - 1; i >= 0; i--) {
        const f = allFindings[i];
        if (f.entity === 'UK_NHS') {
            const hasTurkishTax = allFindings.some(o =>
                o.entity === 'TR_VERGI_NO' && o.start === f.start && o.end === f.end
            );
            if (hasTurkishTax) { allFindings.splice(i, 1); continue; }
            const before = text.substring(Math.max(0, f.start - 40), f.start).toLowerCase();
            if (/vergi|vkn/.test(before)) { allFindings.splice(i, 1); }
        }
    }

    // Suppress CREDIT_CARD when IMEI label is in context (same span)
    for (let i = allFindings.length - 1; i >= 0; i--) {
        const f = allFindings[i];
        if (f.entity === 'CREDIT_CARD') {
            const before = contextLower(text.substring(Math.max(0, f.start - 30), f.start));
            if (/imei|cihaz\s*seri/.test(before)) {
                allFindings.splice(i, 1);
            }
        }
    }

    // Deduplication & overlap resolution (Presidio's algorithm)
    let results = removeDuplicates(allFindings);

    // Merge adjacent PERSON_NAME entities (e.g. "Ayşe" + "Korkmaz" → "Ayşe Korkmaz")
    const names = results.filter(f => f.entity === 'PERSON_NAME').sort((a, b) => a.start - b.start);
    const others = results.filter(f => f.entity !== 'PERSON_NAME');
    const merged = [];
    for (let i = 0; i < names.length; i++) {
        let cur = { ...names[i] };
        while (i + 1 < names.length) {
            const next = names[i + 1];
            const gap = text.substring(cur.end, next.start);
            if (gap === ' ' || gap === '' || gap === '. ') {
                cur = { entity: 'PERSON_NAME', value: text.substring(cur.start, next.end),
                        start: cur.start, end: next.end,
                        score: Math.max(cur.score, next.score),
                        source: cur.score >= next.score ? cur.source : next.source };
                i++;
            } else break;
        }
        merged.push(cur);
    }

    // Extend names with "Hanım"/"Bey" honorific
    for (const n of merged) {
        const after = text.substring(n.end, Math.min(text.length, n.end + 7));
        const hm = after.match(/^[ \t]+(Hanım|Bey)\b/);
        if (hm) {
            n.value = text.substring(n.start, n.end + hm[0].length);
            n.end += hm[0].length;
        }
    }

    return [...others, ...merged].sort((a, b) => a.start - b.start);
}

// Presidio's EntityRecognizer.remove_duplicates()
function removeDuplicates(results) {
    // Sort by score DESC, then start ASC, then length DESC
    results.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.start !== b.start) return a.start - b.start;
        return (b.end - b.start) - (a.end - a.start);
    });

    const kept = [];

    for (const result of results) {
        if (result.score <= 0) continue;

        let dominated = false;
        for (const existing of kept) {
            // Same entity type: drop if contained within existing
            if (result.entity === existing.entity) {
                if (result.start >= existing.start && result.end <= existing.end) {
                    dominated = true;
                    break;
                }
            }
            // Different entity type: drop if exact same span but lower score
            if (result.start === existing.start && result.end === existing.end) {
                if (result.score <= existing.score) {
                    dominated = true;
                    break;
                }
            }
            // Different entity type with overlap: drop if fully contained and equal-or-lower score
            // Prefer wider span when scores are equal
            // Exception: LOCATION inside ADDRESS can coexist (ADDRESS is a merged view)
            if (result.start >= existing.start && result.end <= existing.end && result.score <= existing.score) {
                if (result.start !== existing.start || result.end !== existing.end) {
                    if (!(result.entity === 'LOCATION' && existing.entity === 'ADDRESS')) {
                        dominated = true;
                        break;
                    }
                }
            }
        }

        if (!dominated) {
            kept.push(result);
        }
    }

    // Sort by position for output
    kept.sort((a, b) => a.start - b.start);
    return kept;
}
