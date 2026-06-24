// Perde Web — Benchmark & Evaluation Framework
// Entity başına precision/recall/F1 ölçümü

const fs = require('fs');
let dict = fs.readFileSync('dictionaries.js', 'utf8').replace(/^const /gm, 'var ');
let rec = fs.readFileSync('recognizers.js', 'utf8').replace(/^const /gm, 'var ');
let ner = fs.readFileSync('ner-engine.js', 'utf8').replace(/^const /gm, 'var ');
global.document = { createElement: () => ({ set textContent(v) { this._t = v; }, get innerHTML() { return this._t || ''; } }) };
eval(dict); eval(rec); eval(ner);
const ALL = new Set(Object.keys(ENTITY_LABELS));

// Ground-truth annotated test documents
const BENCHMARK_DOCS = [

// ---- 1. İDARİ İŞLEM VE TAM YARGI DOSYASI ----
{
    name: 'İdari İşlem ve Tam Yargı Dosyası',
    category: 'idari',
    text: `İDARİ İŞLEM VE TAM YARGI DOSYASI
Ankara 7. İdare Mahkemesi

Esas No: 2026/1184 E.
Karar No: 2026/2447 K.
UYAP Evrak No: UYP-2026-551882

Ad Soyad: Elif Arslan
T.C. Kimlik No: 44718273956
Doğum Tarihi: 14.07.1988
Adres: Çukurambar Mah. 1427. Cad. No:14/8 Çankaya/Ankara
Telefon: 0312 441 88 22
E-posta: elif.arslan@gmail.com
IBAN: TR77 0006 2000 4418 8122 7744 51

Avukat: Av. Murat Özkan
Baro Sicil No: 557812
TBB Sicil No: 118472

Kurum: Ankara Büyükşehir Belediye Başkanlığı
Vergi No: 1234567890
MERSİS No: 0572184963100001

İşlem No: ABB-2026-771184
Encümen Karar No: 2026/447
Tebligat Barkod No: 2791845527714
Tebliğ Tarihi: 12.04.2026
İtiraz Başvuru No: ITR-2026-118472
CİMER Başvuru No: CMR-2026-44812

Hasta No: HST-2026-88412
Protokol No: PRK-2026-44187
Rapor No: SKR-2026-118742
Doktor: Dr. Ayşe Çelik
Diploma No: 441882

SGK VE İŞ BİLGİLERİ
İşveren: Arel Proje Mimarlık A.Ş.
Vergi No: 9876543210
MERSİS No: 0887412963200001
SGK İşyeri Sicil No: 1088447-12-12
Çalışan Sicil No: PRS-2026-44812
SGK Sicil No: 1122334
İşe Giriş Tarihi: 15.09.2021

Banka: İNG Bank A.Ş.
IBAN: TR77 0006 2000 4418 8122 7744 51
Şube Kodu: 1124
Hesap No: 77841122
Müşteri No: MUS-771244

15.02.2026    Arel Proje maaş ödemesi    82.400 TL

Ad Soyad: Kemal Aydın
T.C. Kimlik No: 55712394876
Telefon: 0532 441 77 88
E-posta: kemal.aydin@hotmail.com

Ad Soyad: Zeynep Kara
T.C. Kimlik No: 33891247756
Telefon: 0545 882 11 44

Kamera Kayıt ID: CAM-2026-118742
IP Adresi: 192.168.1.100
MAC Adresi: 00:1A:2B:3C:4D:5E
Cihaz Seri No: SN-TR-771184
E-imza Sertifika No: EIS-2026-771884
e-Devlet Kullanıcı İşlem No: EDV-2026-441882

Noter: Ankara 15. Noterliği
Yevmiye No: 2026/44821
Tespit No: TSP-2026-118742`,
    expected: [
        { entity: 'COURT', value: 'Ankara 7. İdare Mahkemesi' },
        { entity: 'CASE_NUMBER', value: '2026/1184' },
        { entity: 'CASE_NUMBER', value: '2026/2447' },
        { entity: 'GOV_DOCUMENT_ID', value: 'UYP-2026-551882' },
        { entity: 'PERSON_NAME', value: 'Elif Arslan' },
        { entity: 'TR_NATIONAL_ID', value: '44718273956' },
        { entity: 'CONTEXTUAL_DATE', value: '14.07.1988' },
        { entity: 'ADDRESS', value: 'Çukurambar Mah. 1427. Cad. No:14/8 Çankaya/Ankara' },
        { entity: 'PHONE_NUMBER', value: '0312 441 88 22' },
        { entity: 'EMAIL_ADDRESS', value: 'elif.arslan@gmail.com' },
        { entity: 'IBAN_CODE', value: 'TR77 0006 2000 4418 8122 7744 51' },
        { entity: 'PERSON_NAME', value: 'Murat Özkan' },
        { entity: 'BARO_SICIL', value: '557812' },
        { entity: 'LICENSE_ID', value: '118472' },
        { entity: 'ORGANIZATION', value: 'Ankara Büyükşehir Belediye Başkanlığı' },
        { entity: 'TR_VERGI_NO', value: '1234567890' },
        { entity: 'TR_MERSIS_NO', value: '0572184963100001' },
        { entity: 'GOV_DOCUMENT_ID', value: 'ABB-2026-771184' },
        { entity: 'GOV_DOCUMENT_ID', value: '2026/447' },
        { entity: 'GOV_DOCUMENT_ID', value: '2791845527714' },
        { entity: 'CONTEXTUAL_DATE', value: '12.04.2026' },
        { entity: 'GOV_DOCUMENT_ID', value: 'ITR-2026-118472' },
        { entity: 'GOV_DOCUMENT_ID', value: 'CMR-2026-44812' },
        { entity: 'MEDICAL_ID', value: 'HST-2026-88412' },
        { entity: 'MEDICAL_ID', value: 'PRK-2026-44187' },
        { entity: 'MEDICAL_ID', value: 'SKR-2026-118742' },
        { entity: 'PERSON_NAME', value: 'Ayşe Çelik' },
        { entity: 'LICENSE_ID', value: '441882' },
        { entity: 'ORGANIZATION', value: 'Arel Proje Mimarlık A.Ş.' },
        { entity: 'TR_VERGI_NO', value: '9876543210' },
        { entity: 'TR_MERSIS_NO', value: '0887412963200001' },
        { entity: 'TR_SGK_NO', value: '1088447-12-12' },
        { entity: 'EMPLOYEE_ID', value: 'PRS-2026-44812' },
        { entity: 'TR_SGK_NO', value: '1122334' },
        { entity: 'CONTEXTUAL_DATE', value: '15.09.2021' },
        { entity: 'ORGANIZATION', value: 'İNG Bank A.Ş.' },
        { entity: 'IBAN_CODE', value: 'TR77 0006 2000 4418 8122 7744 51' },
        { entity: 'BANK_BRANCH_CODE', value: '1124' },
        { entity: 'BANK_ACCOUNT_NO', value: '77841122' },
        { entity: 'FINANCIAL_ID', value: 'MUS-771244' },
        { entity: 'DATE_TIME', value: '15.02.2026' },
        { entity: 'ORGANIZATION', value: 'Arel Proje' },
        { entity: 'PERSON_NAME', value: 'Kemal Aydın' },
        { entity: 'TR_NATIONAL_ID', value: '55712394876' },
        { entity: 'PHONE_NUMBER', value: '0532 441 77 88' },
        { entity: 'EMAIL_ADDRESS', value: 'kemal.aydin@hotmail.com' },
        { entity: 'PERSON_NAME', value: 'Zeynep Kara' },
        { entity: 'TR_NATIONAL_ID', value: '33891247756' },
        { entity: 'PHONE_NUMBER', value: '0545 882 11 44' },
        { entity: 'DEVICE_ID', value: 'CAM-2026-118742' },
        { entity: 'IP_ADDRESS', value: '192.168.1.100' },
        { entity: 'MAC_ADDRESS', value: '00:1A:2B:3C:4D:5E' },
        { entity: 'DEVICE_ID', value: 'SN-TR-771184' },
        { entity: 'DEVICE_ID', value: 'EIS-2026-771884' },
        { entity: 'GOV_DOCUMENT_ID', value: 'EDV-2026-441882' },
        { entity: 'NOTARY', value: 'Ankara 15. Noterliği' },
        { entity: 'NOTARY_RECORD', value: '2026/44821' },
        { entity: 'GOV_DOCUMENT_ID', value: 'TSP-2026-118742' },
    ]
},

// ---- 2. SİGORTA HASAR DOSYASI ----
{
    name: 'Sigorta Hasar Dosyası',
    category: 'sigorta',
    text: `SİGORTA HASAR DOSYASI
Axa Sigorta A.Ş.
Hasar Dosya No: HDS-2026-887714

Sigortalı: Mehmet Demir
T.C. Kimlik No: 28174539622
Poliçe No: POL-2026/44812
Poliçe Başlangıç: 01.01.2026
Poliçe Bitiş: 01.01.2027

Kaza Tarihi: 15.03.2026
Kaza Saati: 09:45
Kaza Yeri: Kadıköy, İstanbul

Araç Bilgileri:
Plaka: 34 ABC 1234
Şasi No: WVWZZZ3CZWE123456
Motor No: CAX471228
Ruhsat Seri No: AA1234567

Eksper Raporu No: EKS-2026-441882
Hasar Tutarı: 45.800 TL
Sigorta Bedeli: 350.000 TL

Karşı Taraf:
Ad Soyad: Fatma Yılmaz
T.C. Kimlik No: 16293847561
Telefon: 0532 881 22 44
Plaka: 06 DEF 5678

Tanık: Ali Koç
Telefon: 0555 441 77 88

Banka Bilgileri:
IBAN: TR33 0001 0009 8844 1122 3344 55
Garanti BBVA
Hesap Sahibi: Mehmet Demir`,
    expected: [
        { entity: 'ORGANIZATION', value: 'Axa Sigorta' },
        { entity: 'INSURANCE_FILE_NO', value: 'HDS-2026-887714' },
        { entity: 'PERSON_NAME', value: 'Mehmet Demir' },
        { entity: 'TR_NATIONAL_ID', value: '28174539622' },
        { entity: 'POLICY_NUMBER', value: 'POL-2026/44812' },
        { entity: 'DATE_TIME', value: '01.01.2026' },
        { entity: 'DATE_TIME', value: '01.01.2027' },
        { entity: 'CONTEXTUAL_DATE', value: '15.03.2026' },
        { entity: 'TIME', value: '09:45' },
        { entity: 'LOCATION', value: 'Kadıköy' },
        { entity: 'LOCATION', value: 'İstanbul' },
        { entity: 'TR_LICENSE_PLATE', value: '34 ABC 1234' },
        { entity: 'VEHICLE_ID', value: 'WVWZZZ3CZWE123456' },
        { entity: 'VEHICLE_ID', value: 'CAX471228' },
        { entity: 'FINANCIAL_ID', value: 'AA1234567' },
        { entity: 'PERSON_NAME', value: 'Fatma Yılmaz' },
        { entity: 'TR_NATIONAL_ID', value: '16293847561' },
        { entity: 'PHONE_NUMBER', value: '0532 881 22 44' },
        { entity: 'TR_LICENSE_PLATE', value: '06 DEF 5678' },
        { entity: 'PERSON_NAME', value: 'Ali Koç' },
        { entity: 'PHONE_NUMBER', value: '0555 441 77 88' },
        { entity: 'IBAN_CODE', value: 'TR33 0001 0009 8844 1122 3344 55' },
        { entity: 'ORGANIZATION', value: 'Garanti BBVA' },
        { entity: 'PERSON_NAME', value: 'Mehmet Demir' },
    ]
},

// ---- 3. İCRA TAKİP DOSYASI ----
{
    name: 'İcra Takip Dosyası',
    category: 'icra',
    text: `İSTANBUL 12. İCRA DAİRESİ
Dosya No: 2026/44812 E.

Alacaklı: Türkiye İş Bankası A.Ş.
Vekili: Av. Hakan Güneş
Baro Sicil No: 44812

Borçlu: Ahmet Yıldız
T.C. Kimlik No: 77412938654
Adres: Ataşehir Mah. Palmiye Cad. No:7/3 Ataşehir/İstanbul
Telefon: 0216 441 88 22
E-posta: ahmet.yildiz@gmail.com

Takip Tarihi: 20.02.2026
Takip Tutarı: 185.400,00 TL
Faiz Başlangıcı: 01.11.2025

Kredi Sözleşme No: KRD-2026-44812
Hesap No: 44188122
Müşteri No: MUS-881244

Haciz Uygulanan Araç:
Plaka: 34 GHI 9012
Şasi No: NMTBA3BE60R123456
Yakalama Tarihi: 05.04.2026

Ödeme Emri Tebliğ Tarihi: 25.02.2026
İtiraz Tarihi: 02.03.2026
İcra Mahkemesi Kararı: 2026/8812`,
    expected: [
        { entity: 'COURT', value: 'İSTANBUL 12. İCRA DAİRESİ' },
        { entity: 'CASE_NUMBER', value: '2026/44812' },
        { entity: 'ORGANIZATION', value: 'Türkiye İş Bankası' },
        { entity: 'PERSON_NAME', value: 'Hakan Güneş' },
        { entity: 'BARO_SICIL', value: '44812' },
        { entity: 'PERSON_NAME', value: 'Ahmet Yıldız' },
        { entity: 'TR_NATIONAL_ID', value: '77412938654' },
        { entity: 'ADDRESS', value: 'Ataşehir Mah. Palmiye Cad. No:7/3 Ataşehir/İstanbul' },
        { entity: 'PHONE_NUMBER', value: '0216 441 88 22' },
        { entity: 'EMAIL_ADDRESS', value: 'ahmet.yildiz@gmail.com' },
        { entity: 'CONTEXTUAL_DATE', value: '20.02.2026' },
        { entity: 'DATE_TIME', value: '01.11.2025' },
        { entity: 'BANK_ACCOUNT_NO', value: '44188122' },
        { entity: 'GOV_DOCUMENT_ID', value: 'KRD-2026-44812' },
        { entity: 'FINANCIAL_ID', value: 'MUS-881244' },
        { entity: 'TR_LICENSE_PLATE', value: '34 GHI 9012' },
        { entity: 'VEHICLE_ID', value: 'NMTBA3BE60R123456' },
        { entity: 'DATE_TIME', value: '05.04.2026' },
        { entity: 'CONTEXTUAL_DATE', value: '25.02.2026' },
        { entity: 'DATE_TIME', value: '02.03.2026' },
        { entity: 'COURT', value: 'İcra Mahkemesi' },
    ]
},

// ---- 4. TIBBI RAPOR ----
{
    name: 'Tıbbi Rapor',
    category: 'sağlık',
    text: `ANKARA ŞEHİR HASTANESİ
Ortopedi ve Travmatoloji Kliniği

Hasta Adı: Elif Arslan
Hasta No: HST-2026-88412
Protokol No: PRK-2026-44187
T.C. Kimlik No: 44718273956
Doğum Tarihi: 14.07.1988
Telefon: 0312 441 88 22

Başvuru Tarihi: 08.03.2026
Taburcu Tarihi: 12.03.2026
Yatış Süresi: 4 gün

Tanı: Sol ayak bileği kırığı (S82.6)
Ameliyat: Açık redüksiyon + internal fiksasyon
Ameliyat Tarihi: 09.03.2026

Rapor No: SKR-2026-118742
Rapor Tarihi: 12.03.2026
Maluliyet Oranı: %9
İyileşme Süresi: 6 Ay

Sorumlu Hekim: Dr. Ayşe Çelik
Diploma No: 441882
Uzmanlık Belgesi No: UZM-2018-44812

Reçete No: REC-2026-88412
İlaç: Diklofenak 75mg
SGK Takip No: 2026441882`,
    expected: [
        { entity: 'LOCATION', value: 'ANKARA' },
        { entity: 'ORGANIZATION', value: 'Travmatoloji Kliniği' },
        { entity: 'PERSON_NAME', value: 'Elif Arslan' },
        { entity: 'MEDICAL_ID', value: 'HST-2026-88412' },
        { entity: 'MEDICAL_ID', value: 'PRK-2026-44187' },
        { entity: 'TR_NATIONAL_ID', value: '44718273956' },
        { entity: 'CONTEXTUAL_DATE', value: '14.07.1988' },
        { entity: 'PHONE_NUMBER', value: '0312 441 88 22' },
        { entity: 'CONTEXTUAL_DATE', value: '08.03.2026' },
        { entity: 'CONTEXTUAL_DATE', value: '12.03.2026' },
        { entity: 'CONTEXTUAL_DATE', value: '12.03.2026' },
        { entity: 'HEALTH_CONDITION', value: 'Sol ayak bileği kırığı (S82' },
        { entity: 'HEALTH_CONDITION', value: 'S82.6' },
        { entity: 'CONTEXTUAL_DATE', value: '09.03.2026' },
        { entity: 'MEDICAL_ID', value: 'SKR-2026-118742' },
        { entity: 'PERSON_NAME', value: 'Ayşe Çelik' },
        { entity: 'LICENSE_ID', value: '441882' },
        { entity: 'MEDICAL_ID', value: 'REC-2026-88412' },
        { entity: 'ORGANIZATION', value: 'SGK' },
        { entity: 'TR_SGK_NO', value: '2026441882' },
        { entity: 'DISABILITY_STATUS', value: '%9' },
    ]
},

// ---- 5. VEKALETNAME ----
{
    name: 'Vekaletname',
    category: 'noter',
    text: `GENEL VEKALETNAME

Vekalet Veren:
Ad Soyad: Mustafa Korkmaz
T.C. Kimlik No: 11223344556
Doğum Tarihi: 22.06.1975
Anne Adı: Hatice
Baba Adı: İbrahim
Adres: Kozyatağı Mah. Değirmen Sok. No:15/4 Kadıköy/İstanbul

Vekil:
Ad Soyad: Av. Serpil Acar
Baro Sicil No: 332147
TBB Sicil No: 88412
Adres: Bağdat Cad. No:442/12 Kadıköy/İstanbul
Telefon: 0216 441 77 88
E-posta: serpil.acar@avukat.org.tr

Noter: İstanbul 22. Noterliği
Yevmiye No: 2026/18844
Tarih: 05.02.2026`,
    expected: [
        { entity: 'PERSON_NAME', value: 'Mustafa Korkmaz' },
        { entity: 'TR_NATIONAL_ID', value: '11223344556' },
        { entity: 'CONTEXTUAL_DATE', value: '22.06.1975' },
        { entity: 'PERSON_NAME', value: 'Hatice' },
        { entity: 'PERSON_NAME', value: 'İbrahim' },
        { entity: 'ADDRESS', value: 'Kozyatağı Mah. Değirmen Sok. No:15/4 Kadıköy/İstanbul' },
        { entity: 'PERSON_NAME', value: 'Serpil Acar' },
        { entity: 'BARO_SICIL', value: '332147' },
        { entity: 'LICENSE_ID', value: '88412' },
        { entity: 'ADDRESS', value: 'Bağdat Cad. No:442/12 Kadıköy/İstanbul' },
        { entity: 'PHONE_NUMBER', value: '0216 441 77 88' },
        { entity: 'EMAIL_ADDRESS', value: 'serpil.acar@avukat.org.tr' },
        { entity: 'NOTARY', value: 'İstanbul 22. Noterliği' },
        { entity: 'NOTARY_RECORD', value: '2026/18844' },
        { entity: 'DATE_TIME', value: '05.02.2026' },
    ]
},

// ---- 6. DİLEKÇE ----
{
    name: 'Dava Dilekçesi',
    category: 'dilekçe',
    text: `İSTANBUL NÖBETÇİ ASLİYE HUKUK MAHKEMESİNE

Davacı: Ayşe Korkmaz (T.C. 66778899011)
Adres: Beşiktaş Mah. Yıldız Cad. No:88/3 Beşiktaş/İstanbul
Telefon: 0532 441 88 22
Vekili: Av. Emre Doğan, İstanbul Barosu Sicil No: 77412

Davalı: Mega İnşaat ve Ticaret A.Ş.
Vergi No: 3344556677
MERSİS No: 0447812963100001
Adres: Maslak Mah. Büyükdere Cad. No:122 Sarıyer/İstanbul

Konu: Tazminat Davası
Dava Değeri: 550.000 TL

Olay Tarihi: 10.01.2026
Davacı Ayşe Korkmaz, 10.01.2026 tarihinde İstanbul ili Beşiktaş ilçesinde meydana gelen iş kazası sonucu yaralanmıştır.

Hastane: Beşiktaş Safa Hastanesi
Rapor No: RPR-2026-44812
SGK İş Kazası Bildirim No: 2026-IK-44812

E-posta: ayse.korkmaz@gmail.com`,
    expected: [
        { entity: 'COURT', value: 'İSTANBUL NÖBETÇİ ASLİYE HUKUK MAHKEMESİ' },
        { entity: 'PERSON_NAME', value: 'Ayşe Korkmaz' },
        { entity: 'TR_NATIONAL_ID', value: '66778899011' },
        { entity: 'ADDRESS', value: 'Beşiktaş Mah. Yıldız Cad. No:88/3 Beşiktaş/İstanbul' },
        { entity: 'PHONE_NUMBER', value: '0532 441 88 22' },
        { entity: 'PERSON_NAME', value: 'Emre Doğan' },
        { entity: 'ORGANIZATION', value: 'İstanbul Barosu' },
        { entity: 'BARO_SICIL', value: '77412' },
        { entity: 'ORGANIZATION', value: 'Mega İnşaat ve Ticaret A.Ş.' },
        { entity: 'TR_VERGI_NO', value: '3344556677' },
        { entity: 'TR_MERSIS_NO', value: '0447812963100001' },
        { entity: 'ADDRESS', value: 'Maslak Mah. Büyükdere Cad. No:122 Sarıyer/İstanbul' },
        { entity: 'CONTEXTUAL_DATE', value: '10.01.2026' },
        { entity: 'PERSON_NAME', value: 'Ayşe Korkmaz' },
        { entity: 'DATE_TIME', value: '10.01.2026' },
        { entity: 'LOCATION', value: 'İstanbul' },
        { entity: 'LOCATION', value: 'Beşiktaş' },
        { entity: 'ORGANIZATION', value: 'Beşiktaş Safa Hastanesi' },
        { entity: 'MEDICAL_ID', value: 'RPR-2026-44812' },
        { entity: 'ORGANIZATION', value: 'SGK' },
        { entity: 'GOV_DOCUMENT_ID', value: '2026-IK-44812' },
        { entity: 'EMAIL_ADDRESS', value: 'ayse.korkmaz@gmail.com' },
    ]
},
// ---- 7. TİCARİ ALACAK VE İCRA TAKİBİ DOSYASI ----
{
    name: 'Ticari Alacak ve İcra Takibi',
    category: 'ticari',
    text: `TİCARİ ALACAK VE İCRA TAKİBİ DOSYASI
İstanbul 5. Asliye Ticaret Mahkemesi

Esas No: 2026/55118 E.

Davacı: Armoni Endüstriyel Ürünler Sanayi ve Ticaret A.Ş.
Vergi No: 1188447722
MERSİS No: 0774812963100001
Ticaret Sicil No: TS-441882
Adres: Ataşehir Mah. Palmiye Cad. No:7/3 Ataşehir/İstanbul
KEP Adresi: armoni@hs03.kep.tr

Şirket Ünvanı: Yıldız Demir Çelik Ltd. Şti.
Vergi No: 9988776655
MERSİS No: 0662948371500001
Ticaret Sicil No: TS-778412
Adres: Kozyatağı Mah. Değirmen Sok. No:15/4 Kadıköy/İstanbul
Telefon: 0216 441 88 22
E-posta: info@yildizdemircelik.com.tr

Ad Soyad: Mehmet Kaya
T.C. Kimlik No: 11223344556
Telefon: 0532 771 44 88
E-posta: mehmet.kaya@gmail.com

Ad Soyad: Fatma Aydın
T.C. Kimlik No: 99887766554
Telefon: 0533 448 77 11
E-posta: fatma.aydin@outlook.com

Fatura No: FTR202600001188
ETTN: 7d48a1b7-c5d9-4f21-a882-11874a551882
Fatura Tarihi: 15.03.2026

Fatura No: FTR202600001244
ETTN: d1c8f882-77aa-4cb0-bb77-551188aa7712
Fatura Tarihi: 28.03.2026

Banka: Türkiye İş Bankası
Çek Seri No: CK-77118824
Keşide Tarihi: 01.05.2026
Keşideci: Yıldız Demir Çelik Ltd. Şti.
Lehtar: Armoni Endüstriyel Ürünler Sanayi ve Ticaret A.Ş.

İcra Müdürlüğü: İstanbul 12. İcra Müdürlüğü
Dosya No: 2026/55118 E.
Takip Talebi No: TKP-2026-118742
Ödeme Emri Barkod No: 551188774411
Takip Tarihi: 15.05.2026

Banka: Türkiye İş Bankası
IBAN: TR77 0006 2000 4418 8122 7744 51
Şube Kodu: 4418
Hesap No: 77841122
Müşteri No: MUS-771244

Tarih: 10.04.2026
Açıklama: EFT - Yıldız Demir Çelik Ltd. Şti.
Referans No: REF-2026-441882

Kimden: mehmet.kaya@gmail.com
Kime: info@yildizdemircelik.com.tr
CC: fatma.aydin@outlook.com
Tarih: 20.04.2026
Konu: Çek ödemesi hakkında

CK-77118824 seri numaralı çek ile ilgili ödeme planı hakkında görüşmek isteriz.

Mehmet Kaya

E-İmza Sertifika No: EIS-2026-CERT-441882
Mali Mühür Seri No: SN-44188271
IP Adresi: 85.105.122.47
MAC Adresi: 00:1A:2B:3C:4D:5E
Kullanıcı Adı: mkaya_armoni

Ortak 1: Mehmet Kaya - %60
Ortak 2: Fatma Aydın - %40
Tescil Tarihi: 15.06.2020`,
    expected: [
        { entity: 'COURT', value: 'İstanbul 5. Asliye Ticaret Mahkemesi' },
        { entity: 'CASE_NUMBER', value: '2026/55118' },
        { entity: 'ORGANIZATION', value: 'Armoni Endüstriyel Ürünler Sanayi ve Ticaret A.Ş.' },
        { entity: 'TR_VERGI_NO', value: '1188447722' },
        { entity: 'TR_MERSIS_NO', value: '0774812963100001' },
        { entity: 'FINANCIAL_ID', value: 'TS-441882' },
        { entity: 'ADDRESS', value: 'Ataşehir Mah. Palmiye Cad. No:7/3 Ataşehir/İstanbul' },
        { entity: 'KEP_ADDRESS', value: 'armoni@hs03.kep.tr' },
        { entity: 'ORGANIZATION', value: 'Yıldız Demir Çelik Ltd. Şti.' },
        { entity: 'TR_VERGI_NO', value: '9988776655' },
        { entity: 'TR_MERSIS_NO', value: '0662948371500001' },
        { entity: 'FINANCIAL_ID', value: 'TS-778412' },
        { entity: 'ADDRESS', value: 'Kozyatağı Mah. Değirmen Sok. No:15/4 Kadıköy/İstanbul' },
        { entity: 'PHONE_NUMBER', value: '0216 441 88 22' },
        { entity: 'EMAIL_ADDRESS', value: 'info@yildizdemircelik.com.tr' },
        { entity: 'PERSON_NAME', value: 'Mehmet Kaya' },
        { entity: 'TR_NATIONAL_ID', value: '11223344556' },
        { entity: 'PHONE_NUMBER', value: '0532 771 44 88' },
        { entity: 'EMAIL_ADDRESS', value: 'mehmet.kaya@gmail.com' },
        { entity: 'PERSON_NAME', value: 'Fatma Aydın' },
        { entity: 'TR_NATIONAL_ID', value: '99887766554' },
        { entity: 'PHONE_NUMBER', value: '0533 448 77 11' },
        { entity: 'EMAIL_ADDRESS', value: 'fatma.aydin@outlook.com' },
        { entity: 'INVOICE_NO', value: 'FTR202600001188' },
        { entity: 'EINVOICE_UUID', value: '7d48a1b7-c5d9-4f21-a882-11874a551882' },
        { entity: 'CONTEXTUAL_DATE', value: '15.03.2026' },
        { entity: 'INVOICE_NO', value: 'FTR202600001244' },
        { entity: 'EINVOICE_UUID', value: 'd1c8f882-77aa-4cb0-bb77-551188aa7712' },
        { entity: 'CONTEXTUAL_DATE', value: '28.03.2026' },
        { entity: 'ORGANIZATION', value: 'Türkiye İş Bankası' },
        { entity: 'ORGANIZATION', value: 'Yıldız Demir Çelik Ltd. Şti.' },
        { entity: 'ORGANIZATION', value: 'Armoni Endüstriyel Ürünler Sanayi ve Ticaret A.Ş.' },
        { entity: 'CHECK_SERIAL_NO', value: 'CK-77118824' },
        { entity: 'CONTEXTUAL_DATE', value: '01.05.2026' },
        { entity: 'ORGANIZATION', value: 'İstanbul 12. İcra Müdürlüğü' },
        { entity: 'CASE_NUMBER', value: '2026/55118' },
        { entity: 'ENFORCEMENT_ID', value: 'TKP-2026-118742' },
        { entity: 'BARCODE_ID', value: '551188774411' },
        { entity: 'CONTEXTUAL_DATE', value: '15.05.2026' },
        { entity: 'IBAN_CODE', value: 'TR77 0006 2000 4418 8122 7744 51' },
        { entity: 'BANK_BRANCH_CODE', value: '4418' },
        { entity: 'BANK_ACCOUNT_NO', value: '77841122' },
        { entity: 'FINANCIAL_ID', value: 'MUS-771244' },
        { entity: 'DATE_TIME', value: '10.04.2026' },
        { entity: 'CASE_NUMBER', value: 'REF-2026-441882' },
        { entity: 'EMAIL_ADDRESS', value: 'mehmet.kaya@gmail.com' },
        { entity: 'EMAIL_ADDRESS', value: 'info@yildizdemircelik.com.tr' },
        { entity: 'EMAIL_ADDRESS', value: 'fatma.aydin@outlook.com' },
        { entity: 'DATE_TIME', value: '20.04.2026' },
        { entity: 'CHECK_SERIAL_NO', value: 'CK-77118824' },
        { entity: 'ORGANIZATION', value: 'Türkiye İş Bankası' },
        { entity: 'ORGANIZATION', value: 'Yıldız Demir Çelik Ltd.' },
        { entity: 'PERSON_NAME', value: 'Mehmet Kaya' },
        { entity: 'DEVICE_ID', value: 'EIS-2026-CERT-441882' },
        { entity: 'DEVICE_ID', value: 'SN-44188271' },
        { entity: 'IP_ADDRESS', value: '85.105.122.47' },
        { entity: 'MAC_ADDRESS', value: '00:1A:2B:3C:4D:5E' },
        { entity: 'USERNAME', value: 'mkaya_armoni' },
        { entity: 'PERSON_NAME', value: 'Mehmet Kaya' },
        { entity: 'PERSON_NAME', value: 'Fatma Aydın' },
        { entity: 'CONTEXTUAL_DATE', value: '15.06.2020' },
    ]
},

// ---- 8. GAYRİMENKUL SATIŞ VAADİ VE TAPU DEVİR DOSYASI ----
{
    name: 'Gayrimenkul Satış Vaadi ve Tapu Devir',
    category: 'gayrimenkul',
    text: `GAYRİMENKUL SATIŞ VAADİ VE TAPU DEVİR DOSYASI

TAPU MÜDÜRLÜĞÜ BAŞVURUSU

Başvuru No: TPU-2026-884177
Tapu Web Başvuru No: TWB-2026-441882
Randevu No: RND-2026-118842
İşlem No: ISL-2026-551144

Satıcı:
Ad Soyad: Ali Yılmaz
T.C. Kimlik No: 33445566778
Adres: Bahçelievler Mah. Akasya Sok. No:5/2 Bakırköy/İstanbul
Telefon: 0532 884 11 77
E-posta: ali.yilmaz@gmail.com

Alıcı:
Ad Soyad: Zeynep Karagöz
T.C. Kimlik No: 88776655443
Adres: Ataköy 7-8. Kısım Mah. Çobançeşme Cad. No:18/A Bakırköy/İstanbul
Telefon: 0533 771 44 88
E-posta: zeynep.karagoz@outlook.com

Gayrimenkul Bilgileri:
İl: İstanbul
İlçe: Bakırköy
Mahalle: Bahçelievler
Ada/Parsel: 1188/44
Tapu Tarihi: 15.03.2015

Kredi Bilgileri:
Banka: Garanti BBVA
Kredi No: KRD-2026-991188
Ekspertiz Referans No: EKS-2026-441882
Eksper Sicil No: EXP-44812

Dekont No: DKT-2026-551882

Sözleşme No: SVS-2025-118742

KON-2026-771188 numaralı kredi başvurusu değerlendirilmiştir.
Bakırköy Tapu Müdürlüğü nezdindeki TPU-2026-884177 başvuru numaralı işlem tamamlanmıştır.`,
    expected: [
        { entity: 'GOV_DOCUMENT_ID', value: 'TPU-2026-884177' },
        { entity: 'GOV_DOCUMENT_ID', value: 'TWB-2026-441882' },
        { entity: 'GOV_DOCUMENT_ID', value: 'RND-2026-118842' },
        { entity: 'GOV_DOCUMENT_ID', value: 'ISL-2026-551144' },
        { entity: 'PERSON_NAME', value: 'Ali Yılmaz' },
        { entity: 'TR_NATIONAL_ID', value: '33445566778' },
        { entity: 'ADDRESS', value: 'Bahçelievler Mah. Akasya Sok. No:5/2 Bakırköy/İstanbul' },
        { entity: 'PHONE_NUMBER', value: '0532 884 11 77' },
        { entity: 'EMAIL_ADDRESS', value: 'ali.yilmaz@gmail.com' },
        { entity: 'PERSON_NAME', value: 'Zeynep Karagöz' },
        { entity: 'TR_NATIONAL_ID', value: '88776655443' },
        { entity: 'ADDRESS', value: 'Ataköy 7-8. Kısım Mah. Çobançeşme Cad. No:18/A Bakırköy/İstanbul' },
        { entity: 'PHONE_NUMBER', value: '0533 771 44 88' },
        { entity: 'EMAIL_ADDRESS', value: 'zeynep.karagoz@outlook.com' },
        { entity: 'LOCATION', value: 'İstanbul' },
        { entity: 'LOCATION', value: 'Bakırköy' },
        { entity: 'LOCATION', value: 'Bahçelievler' },
        { entity: 'PROPERTY_ID', value: '1188' },
        { entity: 'CONTEXTUAL_DATE', value: '15.03.2015' },
        { entity: 'ORGANIZATION', value: 'Garanti BBVA' },
        { entity: 'FINANCIAL_ID', value: 'KRD-2026-991188' },
        { entity: 'FINANCIAL_ID', value: 'EKS-2026-441882' },
        { entity: 'LICENSE_ID', value: 'EXP-44812' },
        { entity: 'FINANCIAL_ID', value: 'DKT-2026-551882' },
        { entity: 'GOV_DOCUMENT_ID', value: 'SVS-2025-118742' },
        { entity: 'GOV_DOCUMENT_ID', value: 'KON-2026-771188' },
        { entity: 'ORGANIZATION', value: 'Bakırköy Tapu Müdürlüğü' },
        { entity: 'GOV_DOCUMENT_ID', value: 'TPU-2026-884177' },
    ]
},

// ---- 9. TÜKETİCİ HAKEM HEYETİ ----
{
    name: 'Tüketici Hakem Heyeti Kararı',
    category: 'tüketici',
    text: `TÜKETİCİ HAKEM HEYETİ KARARI

Başvuru No: THH-2026-00847
Karar No: 2026/3451
Karar Tarihi: 15.04.2026

Şikayet Eden: Ayşe Kara
TC Kimlik No: 10000000146
Adres: Bağdat Cad. No:128/3, Kadıköy/İstanbul
Telefon: 0535 444 55 66
E-posta: ayse.kara@email.com

Şikayet Edilen: Teknosa İç ve Dış Ticaret A.Ş.
Vergi No: 1234567890
MERSİS No: 0648-0199-3890-0017

Fatura No: FTR-2026-00234567
Fatura Tarihi: 01.02.2026
Garanti Sertifika No: GSN-2026-78901234
IMEI: 353456789012345

Servis Kayıt No: SRV-2026-44128 ile işlem açıldı.

IBAN: TR33 0006 1005 1978 6457 8413 26
Hesap Sahibi: Ayşe Kara

Baro Sicil No: 45678`,
    expected: [
        { entity: 'GOV_DOCUMENT_ID', value: 'THH-2026-00847' },
        { entity: 'CASE_NUMBER', value: '2026/3451' },
        { entity: 'CONTEXTUAL_DATE', value: '15.04.2026' },
        { entity: 'PERSON_NAME', value: 'Ayşe Kara' },
        { entity: 'PERSON_NAME', value: 'Ayşe Kara' },
        { entity: 'TR_NATIONAL_ID', value: '10000000146' },
        { entity: 'ADDRESS', value: 'Bağdat Cad. No:128/3' },
        { entity: 'PHONE_NUMBER', value: '0535 444 55 66' },
        { entity: 'EMAIL_ADDRESS', value: 'ayse.kara@email.com' },
        { entity: 'ORGANIZATION', value: 'Teknosa İç ve Dış Ticaret A.Ş.' },
        { entity: 'TR_VERGI_NO', value: '1234567890' },
        { entity: 'INVOICE_NO', value: 'FTR-2026-00234567' },
        { entity: 'CONTEXTUAL_DATE', value: '01.02.2026' },
        { entity: 'DEVICE_ID', value: 'GSN-2026-78901234' },
        { entity: 'IMEI', value: '353456789012345' },
        { entity: 'GOV_DOCUMENT_ID', value: 'SRV-2026-44128' },
        { entity: 'IBAN_CODE', value: 'TR33 0006 1005 1978 6457 8413 26' },
        { entity: 'BARO_SICIL', value: '45678' },
        { entity: 'ORGANIZATION', value: 'TÜKETİCİ HAKEM HEYETİ' },
    ]
},

// ---- 10. VERASET İLAMI (MİRAS HUKUKU) ----
{
    name: 'Veraset İlamı',
    category: 'miras',
    text: `VERASET İLAMI

Dosya No: 2026/8901
Karar Tarihi: 10.05.2026

Mahkeme: Bakırköy 3. Sulh Hukuk Mahkemesi

Müteveffa:
Adı Soyadı: Ahmet Yılmaz
TC Kimlik No: 10000000146
Vefat Tarihi: 01.01.2026
Son İkametgah: Atatürk Mah. Cumhuriyet Cad. No:5, Bakırköy/İstanbul

Mirasçılar:
1) Fatma Yılmaz (eş) - TC: 22222222222
2) Ali Yılmaz (oğul) - TC: 33333333338

Ada/Parsel: 4567/89
Pafta No: G22-A-15-B
Tapu Tarihi: 20.08.2015

IBAN: TR33 0006 1005 1978 6457 8413 26

Plaka: 34 XYZ 456
Şasi No: WVWZZZ3CZWE654321

Beyanname No: VIV-2026-00123
Vergi Tahakkuk Tarihi: 15.06.2026`,
    expected: [
        { entity: 'CASE_NUMBER', value: '2026/8901' },
        { entity: 'CONTEXTUAL_DATE', value: '10.05.2026' },
        { entity: 'COURT', value: 'Bakırköy 3. Sulh Hukuk Mahkemesi' },
        { entity: 'PERSON_NAME', value: 'Ahmet Yılmaz' },
        { entity: 'TR_NATIONAL_ID', value: '10000000146' },
        { entity: 'CONTEXTUAL_DATE', value: '01.01.2026' },
        { entity: 'PERSON_NAME', value: 'Fatma Yılmaz' },
        { entity: 'PERSON_NAME', value: 'Ali Yılmaz' },
        { entity: 'TR_NATIONAL_ID', value: '22222222222' },
        { entity: 'TR_NATIONAL_ID', value: '33333333338' },
        { entity: 'PROPERTY_ID', value: '4567/89' },
        { entity: 'PROPERTY_ID', value: 'G22-A-15-B' },
        { entity: 'CONTEXTUAL_DATE', value: '20.08.2015' },
        { entity: 'IBAN_CODE', value: 'TR33 0006 1005 1978 6457 8413 26' },
        { entity: 'TR_LICENSE_PLATE', value: '34 XYZ 456' },
        { entity: 'VEHICLE_ID', value: 'WVWZZZ3CZWE654321' },
        { entity: 'GOV_DOCUMENT_ID', value: 'VIV-2026-00123' },
        { entity: 'CONTEXTUAL_DATE', value: '15.06.2026' },
        { entity: 'LOCATION', value: 'Atatürk Mah.' },
        { entity: 'LOCATION', value: 'Cumhuriyet Cad.' },
        { entity: 'LOCATION', value: 'Bakırköy' },
        { entity: 'LOCATION', value: 'İstanbul' },
    ]
},

// ---- 11. KVKK VERİ ENVANTERİ ----
{
    name: 'KVKK Veri Envanteri',
    category: 'kvkk',
    text: `KVKK VERİ ENVANTERİ — ÖZEL NİTELİKLİ KİŞİSEL VERİ FORMU

Veri Sahibi: Fatma Demir
35 yaşında
Cinsiyeti: Kadın
Uyruğu: T.C.
Medeni Hali: Evli
Mesleği: Avukat
Doğum Yeri: Trabzon
Eğitim Durumu: Lisans
Askerlik Durumu: Muaf

Nüfus Kayıt Bilgileri:
Cilt No: 45
Aile Sıra No: 12
Birey Sıra No: 3

Özel Nitelikli Kişisel Veriler:
Kan Grubu: A Rh+
Dini: İslam
Etnik Kökeni: Türk
Siyasi Görüşü: Sosyal Demokrat
Eğitim-Sen sendikası üyesi
Sabıka Kaydı: Var, 2018 tarihli
Cinsel Yönelimi: Heteroseksüel
Biyometrik Veri No: BIO-2024-55812
Engel Oranı: %40`,
    expected: [
        { entity: 'PERSON_NAME', value: 'Fatma Demir' },
        { entity: 'AGE', value: '35' },
        { entity: 'GENDER', value: 'Kadın' },
        { entity: 'NATIONALITY', value: 'T.C.' },
        { entity: 'MARITAL_STATUS', value: 'Evli' },
        { entity: 'OCCUPATION', value: 'Avukat' },
        { entity: 'BIRTH_PLACE', value: 'Trabzon' },
        { entity: 'EDUCATION_LEVEL', value: 'Lisans' },
        { entity: 'MILITARY_STATUS', value: 'Muaf' },
        { entity: 'REGISTRY_NO', value: '45' },
        { entity: 'REGISTRY_NO', value: '12' },
        { entity: 'REGISTRY_NO', value: '3' },
        { entity: 'BLOOD_TYPE', value: 'A Rh+' },
        { entity: 'RELIGION', value: 'İslam' },
        { entity: 'ETHNICITY', value: 'Türk' },
        { entity: 'POLITICAL_VIEW', value: 'Sosyal Demokrat' },
        { entity: 'UNION_MEMBERSHIP', value: 'Eğitim-Sen' },
        { entity: 'CRIMINAL_RECORD', value: 'Var' },
        { entity: 'SEXUAL_LIFE', value: 'Heteroseksüel' },
        { entity: 'BIOMETRIC_DATA', value: 'BIO-2024-55812' },
        { entity: 'DISABILITY_STATUS', value: '%40' },
    ]
},

// ---- 12. ALTERNATİF UYUŞMAZLIK VE CEZA İNFAZ DOSYASI ----
{
    name: 'Alternatif Uyuşmazlık ve Ceza İnfaz',
    category: 'hukuk',
    text: `ALTERNATİF UYUŞMAZLIK ÇÖZÜM VE CEZA İNFAZ DOSYASI

İstanbul Tahkim Merkezi
Tahkim Dosya No: THK-2024-33445
Arabuluculuk Dosya No: ARB-2024-88712

Sanık Bilgileri:
Ehliyet No: B-34-771234
Askerlik No: ASK-2024-55123
Diploma No: DIP-2024-44812
Emekli Sicil No: EMK-2024-77123

Ceza İnfaz:
Yakalama Kararı No: YAK-2024-11234
Denetimli Serbestlik No: DS-2024-88712

Ticari Belgeler:
Ticaret Sicil Gazetesi İlan No: TSG-2024-55812
Senet No: SNT-2024-44123`,
    expected: [
        { entity: 'ARBITRATION_NO', value: 'THK-2024-33445' },
        { entity: 'LOCATION', value: 'İstanbul' },
        { entity: 'MEDIATION_NO', value: 'ARB-2024-88712' },
        { entity: 'DRIVER_LICENSE', value: 'B-34-771234' },
        { entity: 'MILITARY_ID', value: 'ASK-2024-55123' },
        { entity: 'EDUCATION_ID', value: 'DIP-2024-44812' },
        { entity: 'PENSION_ID', value: 'EMK-2024-77123' },
        { entity: 'WARRANT_NO', value: 'YAK-2024-11234' },
        { entity: 'PAROLE_ID', value: 'DS-2024-88712' },
        { entity: 'COMMERCIAL_GAZETTE', value: 'TSG-2024-55812' },
        { entity: 'BOND_PROMISSORY', value: 'SNT-2024-44123' },
    ]
},

// ---- 13. DIŞ TİCARET VE FİNANS DOSYASI ----
{
    name: 'Dış Ticaret ve Finans Dosyası',
    category: 'finans',
    text: `DIŞ TİCARET VE FİNANS DOSYASI

İhracatçı: Marmara Tekstil A.Ş.
Ticaret Sicil No: 887714
Alan adı: marmaratekstil.com.tr
Profil: https://linkedin.com/in/ahmetyilmaz

Sevkiyat Belgeleri:
Gümrük Beyannamesi No: GB-2024-IM-55812
Akreditif No: LC-2024-88712
Konşimento No: BL-2024-TR-55812

Ödeme Bilgileri:
Kredi kartı numarası: 4111 1111 1111 1111
SWIFT Kodu: AKBKTRIS
Çalışan aylık maaşı: 45.000 TL
Detaylı bilgi: https://portal.example.com/fatura/2024`,
    expected: [
        { entity: 'ORGANIZATION', value: 'Marmara Tekstil A.Ş.' },
        { entity: 'TRADE_REGISTRY_NO', value: '887714' },
        { entity: 'DOMAIN', value: 'marmaratekstil.com.tr' },
        { entity: 'SOCIAL_PROFILE', value: 'https://linkedin.com/in/ahmetyilmaz' },
        { entity: 'URL', value: 'https://linkedin.com/in/ahmetyilmaz' },
        { entity: 'CUSTOMS_DECLARATION', value: 'GB-2024-IM-55812' },
        { entity: 'LETTER_OF_CREDIT', value: 'LC-2024-88712' },
        { entity: 'BILL_OF_LADING', value: 'BL-2024-TR-55812' },
        { entity: 'CREDIT_CARD', value: '4111 1111 1111 1111' },
        { entity: 'SWIFT_BIC', value: 'AKBKTRIS' },
        { entity: 'SALARY_AMOUNT', value: '45.000 TL' },
        { entity: 'URL', value: 'https://portal.example.com/fatura/2024' },
    ]
},

// ---- 14. GÖÇMEN DOSYASI VE FİKRİ MÜLKİYET ----
{
    name: 'Göçmen Dosyası ve Fikri Mülkiyet',
    category: 'göçmen',
    text: `GÖÇMEN VE FİKRİ MÜLKİYET DOSYASI

Başvuru Sahibi: Ahmad Khalil
Pasaport No: U12345678

Göçmen numarası: 99100000000
İkamet İzni No: IKM-2024-55812
Çalışma İzni No: CIZ-2024-44123

Fikri Mülkiyet Portföyü:
Patent No: TR 2024/55812
Marka Tescil No: 2024/887714
FSEK Tescil No: TEL-2024-55812

Kripto cüzdan adresi: bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4`,
    expected: [
        { entity: 'TR_PASAPORT', value: 'U12345678' },
        { entity: 'FOREIGN_ID', value: '99100000000' },
        { entity: 'RESIDENCE_PERMIT', value: 'IKM-2024-55812' },
        { entity: 'WORK_PERMIT', value: 'CIZ-2024-44123' },
        { entity: 'PATENT_NO', value: 'TR 2024/55812' },
        { entity: 'TRADEMARK_NO', value: '2024/887714' },
        { entity: 'COPYRIGHT_ID', value: 'TEL-2024-55812' },
        { entity: 'CRYPTO', value: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4' },
    ]
},

// ---- 15. ULUSLARARASI KİMLİK DOĞRULAMA ----
{
    name: 'Uluslararası Kimlik Doğrulama',
    category: 'uluslararası',
    text: `ULUSLARARASI KİMLİK DOĞRULAMA RAPORU

ABD Vatandaşları:
Social Security Number (SSN): 219-09-9999
Taxpayer ITIN: 900-70-1234
US Passport No: 512345678
US Bank Account No: 12345678901

İngiltere:
NHS Number: 943 476 5919

İspanya:
DNI/NIF: 12345678-Z

Almanya:
Alman Vergi Steuernummer: 12345678911

Fransa:
INSEE numarası: 1850175123456

İtalya:
Codice Fiscale: RSSMRA85M01H501Z

Hindistan:
Aadhaar numarası: 2345 6789 0123

ABD Sağlık:
DEA Medical License: AJ1234563`,
    expected: [
        { entity: 'US_SSN', value: '219-09-9999' },
        { entity: 'US_ITIN', value: '900-70-1234' },
        { entity: 'US_PASSPORT', value: '512345678' },
        { entity: 'US_BANK_NUMBER', value: '12345678901' },
        { entity: 'UK_NHS', value: '943 476 5919' },
        { entity: 'ES_NIF', value: '12345678-Z' },
        { entity: 'DE_TAX_ID', value: '12345678911' },
        { entity: 'FR_INSEE', value: '1850175123456' },
        { entity: 'IT_FISCAL_CODE', value: 'RSSMRA85M01H501Z' },
        { entity: 'IN_AADHAAR', value: '2345 6789 0123' },
        { entity: 'MEDICAL_LICENSE', value: 'AJ1234563' },
    ]
},
];

// ---- EVALUATION ENGINE (paylaşılan: bench-lib.js) ----

const { evaluate, precision, recall, f1 } = require('./bench-lib.js');

// ---- RUN BENCHMARK ----

console.log('═'.repeat(80));
console.log('  PERDE WEB — BENCHMARK RAPORU');
console.log('═'.repeat(80));
console.log();

const globalStats = {};
const docResults = [];

for (const doc of BENCHMARK_DOCS) {
    const result = evaluate(doc, analyzeText, ALL);
    docResults.push(result);

    console.log(`▸ ${result.name} (${result.category})`);
    console.log(`  Bulunan: ${result.totalFindings}, Beklenen: ${result.totalExpected}`);

    for (const [entity, stats] of Object.entries(result.entityStats)) {
        if (!globalStats[entity]) globalStats[entity] = { tp: 0, fp: 0, fn: 0 };
        globalStats[entity].tp += stats.tp;
        globalStats[entity].fp += stats.fp;
        globalStats[entity].fn += stats.fn;

        if (stats.fn > 0 || stats.fp > 0) {
            for (const d of stats.details) {
                if (d.type === 'FN') {
                    console.log(`  ✗ MISS ${entity}: "${d.value}"`);
                } else {
                    console.log(`  ⚠ EXTRA ${entity}: "${d.value}" (score: ${d.score})`);
                }
            }
        }
    }
    console.log();
}

// ---- GLOBAL SUMMARY ----

console.log('═'.repeat(80));
console.log('  ENTITY BAZINDA PRECISION / RECALL / F1');
console.log('═'.repeat(80));
console.log();

const rows = Object.entries(globalStats)
    .map(([entity, s]) => {
        const p = precision(s.tp, s.fp);
        const r = recall(s.tp, s.fn);
        const f = f1(p, r);
        return { entity, ...s, p, r, f };
    })
    .sort((a, b) => a.f - b.f);

console.log(`${'Entity'.padEnd(25)} ${'TP'.padStart(4)} ${'FP'.padStart(4)} ${'FN'.padStart(4)}  ${'Prec'.padStart(6)} ${'Recall'.padStart(6)} ${'F1'.padStart(6)}`);
console.log('─'.repeat(70));

for (const r of rows) {
    const pStr = (r.p * 100).toFixed(1) + '%';
    const rStr = (r.r * 100).toFixed(1) + '%';
    const fStr = (r.f * 100).toFixed(1) + '%';
    const flag = r.f < 0.8 ? ' ◄' : '';
    console.log(`${r.entity.padEnd(25)} ${String(r.tp).padStart(4)} ${String(r.fp).padStart(4)} ${String(r.fn).padStart(4)}  ${pStr.padStart(6)} ${rStr.padStart(6)} ${fStr.padStart(6)}${flag}`);
}

console.log('─'.repeat(70));

const totalTP = rows.reduce((s, r) => s + r.tp, 0);
const totalFP = rows.reduce((s, r) => s + r.fp, 0);
const totalFN = rows.reduce((s, r) => s + r.fn, 0);
const totalP = precision(totalTP, totalFP);
const totalR = recall(totalTP, totalFN);
const totalF = f1(totalP, totalR);

console.log(`${'MICRO'.padEnd(25)} ${String(totalTP).padStart(4)} ${String(totalFP).padStart(4)} ${String(totalFN).padStart(4)}  ${(totalP * 100).toFixed(1).padStart(5)}% ${(totalR * 100).toFixed(1).padStart(5)}% ${(totalF * 100).toFixed(1).padStart(5)}%`);

const macroP = rows.reduce((s, r) => s + r.p, 0) / rows.length;
const macroR = rows.reduce((s, r) => s + r.r, 0) / rows.length;
const macroF = f1(macroP, macroR);
console.log(`${'MACRO'.padEnd(25)} ${' '.repeat(14)} ${(macroP * 100).toFixed(1).padStart(5)}% ${(macroR * 100).toFixed(1).padStart(5)}% ${(macroF * 100).toFixed(1).padStart(5)}%`);
console.log();

const CRITICAL = ['TR_NATIONAL_ID', 'PERSON_NAME', 'PHONE_NUMBER', 'EMAIL_ADDRESS', 'CREDIT_CARD', 'IBAN_CODE', 'ADDRESS', 'HEALTH_CONDITION', 'BLOOD_TYPE'];
const critRows = rows.filter(r => CRITICAL.includes(r.entity));
if (critRows.length > 0) {
    console.log('Kritik Entity Recall:');
    for (const r of critRows) {
        const status = r.r >= 1.0 ? '✓' : '⚠';
        console.log(`  ${status} ${r.entity}: ${(r.r * 100).toFixed(0)}% recall (${r.tp}/${r.tp + r.fn})`);
    }
    console.log();
}

const low = rows.filter(r => r.f < 0.8);
if (low.length > 0) {
    console.log('⚠ F1 < 80% olan entity\'ler (öncelikli iyileştirme):');
    for (const r of low) {
        console.log(`  • ${r.entity}: F1=${(r.f * 100).toFixed(1)}% (${r.fn} miss, ${r.fp} extra)`);
    }
} else {
    console.log('✓ Tüm entity\'ler F1 ≥ 80%');
}

console.log();
console.log('Metodoloji: position-based IoU>0.5, one-to-one eşleşme, 15 belge');
console.log('Not: Co-developed benchmark — holdout veri seti değildir');
console.log();
console.log('═'.repeat(80));
