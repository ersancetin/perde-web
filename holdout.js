// Perde Web - BAĞIMSIZ HOLDOUT TEST SETİ
// Run: node holdout.js  (veya npm run holdout)
//
// Amaç: Motoru, geliştirme sırasında kullanılan benchmark.js'ten AYRI, elle
// etiketlenmiş belgelerle ölçmek. benchmark.js co-developed olduğu için gerçek
// performansı olduğundan iyi gösterebilir; bu set bağımsız bir kontroldür.
//
// METODOLOJİ NOTU (dürüstlük için):
// - Belgeler sentetiktir (gerçek kişisel veri içermez) ama gerçekçi yazılmıştır.
// - Altın etiketler "bir insanın kişisel veri sayacağı" ölçüte göre konmuştur,
//   motorun yakalayıp yakalamadığından BAĞIMSIZ olarak.
// - Motor bu belgelere göre AYARLANMAMIŞTIR. Çıkan kaçaklar (FN) ve fazlalar (FP)
//   olduğu gibi raporlanır; iyileştirme için sinyaldir, gizlenmez.

const fs = require('fs');
let dict = fs.readFileSync(__dirname + '/dictionaries.js', 'utf8').replace(/^const /gm, 'var ');
let rec = fs.readFileSync(__dirname + '/recognizers.js', 'utf8').replace(/^const /gm, 'var ');
let ner = fs.readFileSync(__dirname + '/ner-engine.js', 'utf8').replace(/^const /gm, 'var ');
global.document = { createElement: () => ({ set textContent(v) { this._t = v; }, get innerHTML() { return this._t || ''; } }) };
eval(dict); eval(rec); eval(ner);

const ALL = new Set(Object.keys(ENTITY_LABELS));
const { precision, recall, f1 } = require('./bench-lib.js');

// ─────────────────────────────────────────────────────────────────────────
// HOLDOUT BELGELERİ — hepsi sentetik, kişisel veriler uydurmadır.
// ─────────────────────────────────────────────────────────────────────────
const HOLDOUT_DOCS = [
    {
        name: 'İşe İade Dilekçesi', category: 'is-hukuku',
        text: `İSTANBUL 5. İŞ MAHKEMESİ'NE

DAVACI: Mehmet Kaya (T.C. 23456789012)
ADRES: Atatürk Mah. Gül Sok. No:12 D:4 Bahçelievler/İstanbul
VEKİLİ: Av. Zeynep Arslan
DAVALI: Yıldız Tekstil San. ve Tic. A.Ş.

Müvekkilim 15.06.2021 tarihinde işe başlamış, 03.02.2024 tarihinde haksız şekilde işten çıkarılmıştır. Aylık net ücreti 28.500 TL olup, kıdem ve ihbar tazminatı ödenmemiştir. İletişim için: mehmet.kaya@email.com, 0532 445 67 89.`,
        expected: [
            { entity: 'COURT', value: 'İstanbul 5. İş Mahkemesi' },
            { entity: 'PERSON_NAME', value: 'Mehmet Kaya' },
            { entity: 'TR_NATIONAL_ID', value: '23456789012' },
            { entity: 'ADDRESS', value: 'Atatürk Mah. Gül Sok. No:12 D:4 Bahçelievler/İstanbul' },
            { entity: 'PERSON_NAME', value: 'Zeynep Arslan' },
            { entity: 'ORGANIZATION', value: 'Yıldız Tekstil San. ve Tic. A.Ş.' },
            { entity: 'DATE_TIME', value: '15.06.2021' },
            { entity: 'DATE_TIME', value: '03.02.2024' },
            { entity: 'MONETARY_AMOUNT', value: '28.500 TL' },
            { entity: 'EMAIL_ADDRESS', value: 'mehmet.kaya@email.com' },
            { entity: 'PHONE_NUMBER', value: '0532 445 67 89' },
        ],
    },
    {
        name: 'Konut Kira Sözleşmesi', category: 'sozlesme',
        text: `KİRA SÖZLEŞMESİ

Kiraya veren Ayşe Demir ile kiracı Burak Şahin (T.C. 34567890123) arasında aşağıdaki şartlarla akdedilmiştir.

Kiralanan taşınmaz: Cumhuriyet Cad. No:88 Kat:3 Çankaya/Ankara adresindeki konuttur. Sözleşme 01.09.2024 tarihinde bir yıl süreyle başlar. Aylık kira bedeli 18.000 TL olup, her ayın 5'inde kiracının TR75 0006 1019 7864 5784 1326 00 IBAN numaralı hesaba yatırılacaktır. Depozito 36.000 TL'dir.`,
        expected: [
            { entity: 'PERSON_NAME', value: 'Ayşe Demir' },
            { entity: 'PERSON_NAME', value: 'Burak Şahin' },
            { entity: 'TR_NATIONAL_ID', value: '34567890123' },
            { entity: 'ADDRESS', value: 'Cumhuriyet Cad. No:88 Kat:3 Çankaya/Ankara' },
            { entity: 'DATE_TIME', value: '01.09.2024' },
            { entity: 'MONETARY_AMOUNT', value: '18.000 TL' },
            { entity: 'IBAN_CODE', value: 'TR75 0006 1019 7864 5784 1326 00' },
            { entity: 'MONETARY_AMOUNT', value: '36.000 TL' },
        ],
    },
    {
        name: 'Trafik Kazası Sigorta Hasar Bildirimi', category: 'sigorta',
        text: `HASAR BİLDİRİM FORMU

Sigortalı: Kemal Yıldırım
Poliçe No: 9087654321
Araç Plakası: 34 ABC 1453
Kaza Tarihi: 12.03.2024

20.000 TL hasar tespit edilmiştir. Karşı taraf sürücüsü Hasan Çelik'in aracı (06 DEF 7788) kırmızı ışıkta geçmiştir. Olay Eskişehir Yolu üzerinde meydana gelmiştir. Sigortalının iletişim numarası 0533 222 11 00, e-postası kemal.yildirim@sirket.com.tr şeklindedir.`,
        expected: [
            { entity: 'PERSON_NAME', value: 'Kemal Yıldırım' },
            { entity: 'POLICY_NUMBER', value: '9087654321' },
            { entity: 'TR_LICENSE_PLATE', value: '34 ABC 1453' },
            { entity: 'DATE_TIME', value: '12.03.2024' },
            { entity: 'MONETARY_AMOUNT', value: '20.000 TL' },
            { entity: 'PERSON_NAME', value: 'Hasan Çelik' },
            { entity: 'TR_LICENSE_PLATE', value: '06 DEF 7788' },
            { entity: 'LOCATION', value: 'Eskişehir' },
            { entity: 'PHONE_NUMBER', value: '0533 222 11 00' },
            { entity: 'EMAIL_ADDRESS', value: 'kemal.yildirim@sirket.com.tr' },
        ],
    },
    {
        name: 'İcra Takibi Ödeme Emri', category: 'icra',
        text: `ANKARA 12. İCRA DAİRESİ
Dosya No: 2024/8842

Alacaklı: Doğan İnşaat Ltd. Şti.
Borçlu: Ali Öztürk (T.C. 45678901234)
Borç Tutarı: 145.750 TL

İşbu ödeme emrinin tebliğinden itibaren yedi gün içinde borcun ödenmesi, aksi halde cebri icraya devam olunacağı ihtar olunur. Borçlunun bilinen adresi: Şehit Pilot Mah. 1450. Sok. No:7 Yenimahalle/Ankara.`,
        expected: [
            { entity: 'COURT', value: 'Ankara 12. İcra Dairesi' },
            { entity: 'ENFORCEMENT_ID', value: '2024/8842' },
            { entity: 'ORGANIZATION', value: 'Doğan İnşaat Ltd. Şti.' },
            { entity: 'PERSON_NAME', value: 'Ali Öztürk' },
            { entity: 'TR_NATIONAL_ID', value: '45678901234' },
            { entity: 'MONETARY_AMOUNT', value: '145.750 TL' },
            { entity: 'ADDRESS', value: 'Şehit Pilot Mah. 1450. Sok. No:7 Yenimahalle/Ankara' },
        ],
    },
    {
        name: 'KVKK Veri Sorumlusuna Başvuru', category: 'kvkk',
        text: `Veri Sorumlusu: Mavi Market A.Ş.
İlgili Kişi: Elif Korkmaz

6698 sayılı Kanun kapsamında, tarafıma ait kişisel verilerin işlenip işlenmediğini öğrenmek istiyorum. 18.04.2024 tarihinde mağazanızdan yaptığım alışverişte telefon numaram 0541 678 90 12 ve e-posta adresim elif.korkmaz@gmail.com alınmıştır. Bu verilerin silinmesini talep ederim. T.C. Kimlik No: 56789012345.`,
        expected: [
            { entity: 'ORGANIZATION', value: 'Mavi Market A.Ş.' },
            { entity: 'PERSON_NAME', value: 'Elif Korkmaz' },
            { entity: 'DATE_TIME', value: '18.04.2024' },
            { entity: 'PHONE_NUMBER', value: '0541 678 90 12' },
            { entity: 'EMAIL_ADDRESS', value: 'elif.korkmaz@gmail.com' },
            { entity: 'TR_NATIONAL_ID', value: '56789012345' },
        ],
    },
    {
        name: 'Boşanma Dava Dilekçesi', category: 'aile',
        text: `İZMİR 3. AİLE MAHKEMESİ'NE

DAVACI: Selin Aydın
DAVALI: Murat Aydın (T.C. 67890123456)

Taraflar 14.07.2018 tarihinde evlenmiştir. Evlilik birliği temelinden sarsılmış olup, müvekkil davacının müşterek konutu terk etmek zorunda kaldığı 22.11.2023 tarihinden bu yana taraflar ayrı yaşamaktadır. Müşterek çocuk Defne Aydın'ın velayetinin müvekkile verilmesini ve aylık 8.000 TL nafaka takdirini talep ederiz.`,
        expected: [
            { entity: 'COURT', value: 'İzmir 3. Aile Mahkemesi' },
            { entity: 'PERSON_NAME', value: 'Selin Aydın' },
            { entity: 'PERSON_NAME', value: 'Murat Aydın' },
            { entity: 'TR_NATIONAL_ID', value: '67890123456' },
            { entity: 'DATE_TIME', value: '14.07.2018' },
            { entity: 'DATE_TIME', value: '22.11.2023' },
            { entity: 'PERSON_NAME', value: 'Defne Aydın' },
            { entity: 'MONETARY_AMOUNT', value: '8.000 TL' },
        ],
    },
    {
        name: 'Ceza Şikayet Dilekçesi', category: 'ceza',
        text: `BAKIRKÖY CUMHURİYET BAŞSAVCILIĞI'NA

MÜŞTEKİ: Okan Polat (T.C. 78901234567)
ŞÜPHELİ: Serkan Güneş

Şüpheli, 05.05.2024 günü saat 14:30 sıralarında, müvekkile ait iş yerine gelerek tehditte bulunmuş ve 12.000 TL değerindeki malına zarar vermiştir. Olay, İstinye Mah. Deniz Cad. No:34 Sarıyer/İstanbul adresinde gerçekleşmiştir. Tanık Pınar Acar olayı görmüştür. Şüphelinin cezalandırılması için soruşturma açılmasını talep ederim.`,
        expected: [
            { entity: 'COURT', value: 'Bakırköy Cumhuriyet Başsavcılığı' },
            { entity: 'PERSON_NAME', value: 'Okan Polat' },
            { entity: 'TR_NATIONAL_ID', value: '78901234567' },
            { entity: 'PERSON_NAME', value: 'Serkan Güneş' },
            { entity: 'DATE_TIME', value: '05.05.2024' },
            { entity: 'MONETARY_AMOUNT', value: '12.000 TL' },
            { entity: 'ADDRESS', value: 'İstinye Mah. Deniz Cad. No:34 Sarıyer/İstanbul' },
            { entity: 'TIME', value: '14:30' },
            { entity: 'PERSON_NAME', value: 'Pınar Acar' },
        ],
    },
    {
        name: 'Vergi/İdari Para Cezası İtirazı', category: 'idari',
        text: `ANKARA 2. VERGİ MAHKEMESİ'NE

DAVACI: Yılmaz Otomotiv Ltd. Şti. (Vergi No: 4561237890)
DAVALI: Çankaya Vergi Dairesi Müdürlüğü

Müvekkil şirkete 30.01.2024 tarihli ve 2024/556 sayılı vergi/ceza ihbarnamesi ile 89.400 TL vergi ziyaı cezası kesilmiştir. Söz konusu tarhiyat hukuka aykırıdır. Cezanın kaldırılmasını talep ederiz.`,
        expected: [
            { entity: 'COURT', value: 'Ankara 2. Vergi Mahkemesi' },
            { entity: 'ORGANIZATION', value: 'Yılmaz Otomotiv Ltd. Şti.' },
            { entity: 'TR_VERGI_NO', value: '4561237890' },
            { entity: 'ORGANIZATION', value: 'Çankaya Vergi Dairesi Müdürlüğü' },
            { entity: 'DATE_TIME', value: '30.01.2024' },
            { entity: 'CASE_NUMBER', value: '2024/556' },
            { entity: 'MONETARY_AMOUNT', value: '89.400 TL' },
        ],
    },
    {
        name: 'Tıbbi Rapor / Malpraktis', category: 'saglik',
        text: `Hasta: Fatma Şen
T.C. Kimlik: 89012345678
Doğum Tarihi: 03.08.1979
Tanı: Tip 2 Diyabet ve hipertansiyon

Hasta 27.02.2024 tarihinde Özel Akdeniz Hastanesi'ne başvurmuştur. Kan grubu A Rh pozitif olup, uygulanan tedavi sonrası komplikasyon gelişmiştir. Tedaviyi yürüten Dr. Cem Aksoy'un işlemleri değerlendirilmektedir. Hastanın iletişim numarası: 0535 901 23 45.`,
        expected: [
            { entity: 'PERSON_NAME', value: 'Fatma Şen' },
            { entity: 'TR_NATIONAL_ID', value: '89012345678' },
            { entity: 'DATE_TIME', value: '03.08.1979' },
            { entity: 'HEALTH_CONDITION', value: 'Tip 2 Diyabet' },
            { entity: 'DATE_TIME', value: '27.02.2024' },
            { entity: 'ORGANIZATION', value: 'Özel Akdeniz Hastanesi' },
            { entity: 'BLOOD_TYPE', value: 'A Rh pozitif' },
            { entity: 'PERSON_NAME', value: 'Cem Aksoy' },
            { entity: 'PHONE_NUMBER', value: '0535 901 23 45' },
        ],
    },
    {
        name: 'Ticari Fatura Uyuşmazlığı', category: 'ticari',
        text: `İhtar konusu, Beyaz Lojistik A.Ş. tarafından 11.12.2023 tarihinde düzenlenen 2023000457821 numaralı e-faturadır. Fatura tutarı 234.500 TL olup vadesinde ödenmemiştir. Borçlu firma Kırmızı Gıda San. Tic. Ltd. Şti.'nin yetkilisi Ahmet Demirci ile yapılan görüşmeler sonuçsuz kalmıştır. Ödemenin TR61 0001 0000 1745 6789 0123 45 hesabına yapılması gerekmektedir.`,
        expected: [
            { entity: 'ORGANIZATION', value: 'Beyaz Lojistik A.Ş.' },
            { entity: 'DATE_TIME', value: '11.12.2023' },
            { entity: 'MONETARY_AMOUNT', value: '234.500 TL' },
            { entity: 'ORGANIZATION', value: 'Kırmızı Gıda San. Tic. Ltd. Şti.' },
            { entity: 'PERSON_NAME', value: 'Ahmet Demirci' },
            { entity: 'IBAN_CODE', value: 'TR61 0001 0000 1745 6789 0123 45' },
        ],
    },
    {
        name: 'Taşınmaz Satış Vaadi', category: 'gayrimenkul',
        text: `GAYRİMENKUL SATIŞ VAADİ SÖZLEŞMESİ

Satıcı Hüseyin Tuna, alıcı Gülay Erdoğan'a (T.C. 90123456789) maliki olduğu Bağcılar İlçesi, 2456 ada 17 parsel sayılı taşınmazı satmayı vaat etmiştir. Satış bedeli 4.250.000 TL olarak kararlaştırılmıştır. Kapora olarak 500.000 TL 09.06.2024 tarihinde ödenmiştir. Tapu devri en geç 09.09.2024 tarihinde yapılacaktır.`,
        expected: [
            { entity: 'PERSON_NAME', value: 'Hüseyin Tuna' },
            { entity: 'PERSON_NAME', value: 'Gülay Erdoğan' },
            { entity: 'TR_NATIONAL_ID', value: '90123456789' },
            { entity: 'LOCATION', value: 'Bağcılar' },
            { entity: 'PROPERTY_ID', value: '2456 ada 17 parsel' },
            { entity: 'MONETARY_AMOUNT', value: '4.250.000 TL' },
            { entity: 'MONETARY_AMOUNT', value: '500.000 TL' },
            { entity: 'DATE_TIME', value: '09.06.2024' },
            { entity: 'DATE_TIME', value: '09.09.2024' },
        ],
    },
    {
        name: 'Tüketici Hakem Heyeti Başvurusu', category: 'tuketici',
        text: `BAŞVURAN: Deniz Yalçın
ADRES: Fevzi Çakmak Mah. 1923. Cad. No:5 D:11 Konya
ŞİKAYET EDİLEN: Hızlı Elektronik Tic. A.Ş.

01.03.2024 tarihinde internet sitesinden 32.999 TL bedelle satın aldığım dizüstü bilgisayar arızalı çıkmıştır. İade talebim reddedilmiştir. Sipariş numaram HZ-2024-778451'dir. Bedelin iadesini talep ederim. Telefon: 0507 334 55 66.`,
        expected: [
            { entity: 'PERSON_NAME', value: 'Deniz Yalçın' },
            { entity: 'ADDRESS', value: 'Fevzi Çakmak Mah. 1923. Cad. No:5 D:11 Konya' },
            { entity: 'ORGANIZATION', value: 'Hızlı Elektronik Tic. A.Ş.' },
            { entity: 'DATE_TIME', value: '01.03.2024' },
            { entity: 'MONETARY_AMOUNT', value: '32.999 TL' },
            { entity: 'PHONE_NUMBER', value: '0507 334 55 66' },
        ],
    },
    {
        name: 'Veraset / Miras', category: 'miras',
        text: `Muris İbrahim Çetin 19.01.2024 tarihinde vefat etmiştir. Mirasçıları: eşi Hatice Çetin ile çocukları Yusuf Çetin (T.C. 11223344556) ve Merve Çetin'dir. Terekede bulunan Garanti Bankası'ndaki TR20 0006 2012 3456 7890 1234 00 numaralı hesapta 320.000 TL mevduat bulunmaktadır. Veraset ilamının düzenlenmesi talep edilir.`,
        expected: [
            { entity: 'PERSON_NAME', value: 'İbrahim Çetin' },
            { entity: 'DATE_TIME', value: '19.01.2024' },
            { entity: 'PERSON_NAME', value: 'Hatice Çetin' },
            { entity: 'PERSON_NAME', value: 'Yusuf Çetin' },
            { entity: 'TR_NATIONAL_ID', value: '11223344556' },
            { entity: 'PERSON_NAME', value: 'Merve Çetin' },
            { entity: 'ORGANIZATION', value: 'Garanti Bankası' },
            { entity: 'IBAN_CODE', value: 'TR20 0006 2012 3456 7890 1234 00' },
            { entity: 'MONETARY_AMOUNT', value: '320.000 TL' },
        ],
    },
    {
        name: 'Banka Kredi Sözleşmesi', category: 'finans',
        text: `Kredi kullanan Onur Bilgin (T.C. 22334455667), Akbank T.A.Ş. Kadıköy Şubesi'nden 850.000 TL tutarında konut kredisi kullanmıştır. Kredi 120 ay vadeli olup ilk taksit 15.07.2024 tarihinde başlayacaktır. Müşteri numarası 778899001, kartı 4111 1111 1111 1111 numaralıdır. İletişim: onur.bilgin@bilginmail.com.`,
        expected: [
            { entity: 'PERSON_NAME', value: 'Onur Bilgin' },
            { entity: 'TR_NATIONAL_ID', value: '22334455667' },
            { entity: 'ORGANIZATION', value: 'Akbank T.A.Ş.' },
            { entity: 'LOCATION', value: 'Kadıköy' },
            { entity: 'MONETARY_AMOUNT', value: '850.000 TL' },
            { entity: 'DATE_TIME', value: '15.07.2024' },
            { entity: 'CREDIT_CARD', value: '4111 1111 1111 1111' },
            { entity: 'EMAIL_ADDRESS', value: 'onur.bilgin@bilginmail.com' },
        ],
    },
    {
        name: 'Vekaletname (Noter)', category: 'noter',
        text: `VEKALETNAME

Vekalet veren: Ayhan Koç (T.C. 33445566778), Yeni Mah. Zafer Sok. No:21 Muratpaşa/Antalya adresinde mukim.
Vekil: Av. Sibel Yavuz

Beni temsile, dava açmaya ve takip etmeye yetkili kılıyorum. İşbu vekaletname 24.05.2024 tarihinde düzenlenmiştir. Antalya 8. Noterliği, yevmiye no 14523.`,
        expected: [
            { entity: 'PERSON_NAME', value: 'Ayhan Koç' },
            { entity: 'TR_NATIONAL_ID', value: '33445566778' },
            { entity: 'ADDRESS', value: 'Yeni Mah. Zafer Sok. No:21 Muratpaşa/Antalya' },
            { entity: 'PERSON_NAME', value: 'Sibel Yavuz' },
            { entity: 'DATE_TIME', value: '24.05.2024' },
            { entity: 'NOTARY', value: 'Antalya 8. Noterliği' },
        ],
    },
    {
        name: 'İş Kazası Tazminat', category: 'tazminat',
        text: `Müvekkil Ramazan Aktaş (T.C. 44556677889), 17.10.2023 tarihinde Çelik Yapı İnşaat A.Ş.'ye ait şantiyede iş kazası geçirmiştir. Olayda %40 oranında maluliyet oluşmuştur. SGK sicil numarası 1098765432'dir. Maddi ve manevi tazminat olarak toplam 600.000 TL talep edilmektedir. Müvekkilin mesleği inşaat işçisidir, yaşı 38'dir.`,
        expected: [
            { entity: 'PERSON_NAME', value: 'Ramazan Aktaş' },
            { entity: 'TR_NATIONAL_ID', value: '44556677889' },
            { entity: 'DATE_TIME', value: '17.10.2023' },
            { entity: 'ORGANIZATION', value: 'Çelik Yapı İnşaat A.Ş.' },
            { entity: 'DISABILITY_STATUS', value: '%40' },
            { entity: 'TR_SGK_NO', value: '1098765432' },
            { entity: 'MONETARY_AMOUNT', value: '600.000 TL' },
            { entity: 'AGE', value: '38' },
        ],
    },
    {
        name: 'Kişisel Veri İhlali Bildirimi', category: 'kvkk',
        text: `Şirketimiz Pırıltı Yazılım A.Ş.'nin müşteri veri tabanına 08.06.2024 tarihinde yetkisiz erişim sağlanmıştır. İhlalden etkilenen kullanıcılardan biri olan Canan Tekin'in e-posta adresi (canan.tekin@webmail.com) ve telefon numarası (0506 112 33 44) sızmıştır. Saldırı 185.93.2.114 IP adresinden gerçekleşmiştir. KVKK'ya bildirim yapılmıştır.`,
        expected: [
            { entity: 'ORGANIZATION', value: 'Pırıltı Yazılım A.Ş.' },
            { entity: 'DATE_TIME', value: '08.06.2024' },
            { entity: 'PERSON_NAME', value: 'Canan Tekin' },
            { entity: 'EMAIL_ADDRESS', value: 'canan.tekin@webmail.com' },
            { entity: 'PHONE_NUMBER', value: '0506 112 33 44' },
            { entity: 'IP_ADDRESS', value: '185.93.2.114' },
        ],
    },
    {
        name: 'Sağlık Sigortası Poliçe Reddi', category: 'sigorta',
        text: `Sigortalı Nalan Avcı'nın (T.C. 55667788990) 13.05.2024 tarihli ameliyat masraflarına ilişkin tazminat talebi reddedilmiştir. Poliçe numarası TSS-2023-664120'dir. Reddin gerekçesi "önceden var olan rahatsızlık" olarak gösterilmiştir. Talep edilen tutar 175.000 TL'dir. Sigorta şirketi: Güven Sağlık Sigorta A.Ş.`,
        expected: [
            { entity: 'PERSON_NAME', value: 'Nalan Avcı' },
            { entity: 'TR_NATIONAL_ID', value: '55667788990' },
            { entity: 'DATE_TIME', value: '13.05.2024' },
            { entity: 'POLICY_NUMBER', value: 'TSS-2023-664120' },
            { entity: 'MONETARY_AMOUNT', value: '175.000 TL' },
            { entity: 'ORGANIZATION', value: 'Güven Sağlık Sigorta A.Ş.' },
        ],
    },
    {
        name: 'Nafaka Artırım Davası', category: 'aile',
        text: `BURSA 1. AİLE MAHKEMESİ'NE

DAVACI: Esra Şimşek
DAVALI: Tolga Şimşek (T.C. 66778899001)

Taraflar arasında 10.02.2020 tarihinde verilen boşanma kararı ile aylık 3.500 TL iştirak nafakasına hükmedilmiştir. Aradan geçen sürede ekonomik koşullar değiştiğinden, nafakanın aylık 9.000 TL'ye yükseltilmesini talep ederiz. Müşterek çocuk Ada Şimşek halen ilkokula gitmektedir.`,
        expected: [
            { entity: 'COURT', value: 'Bursa 1. Aile Mahkemesi' },
            { entity: 'PERSON_NAME', value: 'Esra Şimşek' },
            { entity: 'PERSON_NAME', value: 'Tolga Şimşek' },
            { entity: 'TR_NATIONAL_ID', value: '66778899001' },
            { entity: 'DATE_TIME', value: '10.02.2020' },
            { entity: 'MONETARY_AMOUNT', value: '3.500 TL' },
            { entity: 'MONETARY_AMOUNT', value: '9.000 TL' },
            { entity: 'PERSON_NAME', value: 'Ada Şimşek' },
        ],
    },
    {
        name: 'Tahliye İhtarnamesi', category: 'gayrimenkul',
        text: `İHTARNAME

Keşideci: Levent Aslan
Muhatap: Gamze Doğan

Maliki bulunduğum Bağlarbaşı Mah. Çınar Sok. No:9 D:2 Üsküdar/İstanbul adresindeki konutu 01.10.2022 tarihinden bu yana kiracı olarak kullanmaktasınız. Son üç aydır toplam 54.000 TL kira borcunuzu ödememiş bulunmaktasınız. İşbu ihtarın tebliğinden itibaren 30 gün içinde borcun ödenmemesi halinde tahliye davası açılacaktır. Bilgi için: 0538 776 54 32.`,
        expected: [
            { entity: 'PERSON_NAME', value: 'Levent Aslan' },
            { entity: 'PERSON_NAME', value: 'Gamze Doğan' },
            { entity: 'ADDRESS', value: 'Bağlarbaşı Mah. Çınar Sok. No:9 D:2 Üsküdar/İstanbul' },
            { entity: 'DATE_TIME', value: '01.10.2022' },
            { entity: 'MONETARY_AMOUNT', value: '54.000 TL' },
            { entity: 'PHONE_NUMBER', value: '0538 776 54 32' },
        ],
    },
    {
        name: 'Tahkim Kararı', category: 'tahkim',
        text: `İSTANBUL TAHKİM MERKEZİ
Dosya No: 2024/THK-318

Davacı Akın Enerji A.Ş. ile davalı Batı Yapı Ltd. Şti. arasındaki uyuşmazlıkta hakem heyeti 22.04.2024 tarihinde karar vermiştir. Hakem Prof. Dr. Necla Tunç başkanlığındaki heyet, davalının davacıya 1.250.000 TL ödemesine hükmetmiştir. Karar taraflara tebliğ edilmiştir.`,
        expected: [
            { entity: 'LOCATION', value: 'İstanbul' },
            { entity: 'CASE_NUMBER', value: '2024/THK-318' },
            { entity: 'ORGANIZATION', value: 'İstanbul Tahkim Merkezi' },
            { entity: 'ORGANIZATION', value: 'Akın Enerji A.Ş.' },
            { entity: 'ORGANIZATION', value: 'Batı Yapı Ltd. Şti.' },
            { entity: 'DATE_TIME', value: '22.04.2024' },
            { entity: 'PERSON_NAME', value: 'Necla Tunç' },
            { entity: 'MONETARY_AMOUNT', value: '1.250.000 TL' },
        ],
    },
    {
        name: 'Gümrük / İthalat Uyuşmazlığı', category: 'gumruk',
        text: `İthalatçı firma Deniz Dış Ticaret A.Ş. (Vergi No: 7788990011) adına düzenlenen gümrük beyannamesi No: 24340100EX012345 kapsamında ihtilaf doğmuştur. Konşimento No: MAEU567890123 ile gelen yük 12.06.2024 tarihinde Mersin Limanı'na ulaşmıştır. Akreditif tutarı 95.000 USD olup, ödeme SWIFT kodu TGBATRISXXX üzerinden yapılacaktır.`,
        expected: [
            { entity: 'ORGANIZATION', value: 'Deniz Dış Ticaret A.Ş.' },
            { entity: 'TR_VERGI_NO', value: '7788990011' },
            { entity: 'CUSTOMS_DECLARATION', value: '24340100EX012345' },
            { entity: 'BILL_OF_LADING', value: 'MAEU567890123' },
            { entity: 'LOCATION', value: 'Mersin' },
            { entity: 'DATE_TIME', value: '12.06.2024' },
            { entity: 'MONETARY_AMOUNT', value: '95.000 USD' },
            { entity: 'SWIFT_BIC', value: 'TGBATRISXXX' },
        ],
    },
    {
        name: 'Detaylı Sağlık Raporu', category: 'saglik',
        text: `T.C. Sağlık Bakanlığı Eğitim ve Araştırma Hastanesi
Hasta Adı: Gökçe Yıldız
T.C. Kimlik: 19283746550
Protokol No: 2024556677
Tanı: Kronik böbrek yetmezliği ve hipertansiyon
Kan Grubu: 0 Rh negatif

Hasta 09.05.2024 tarihinde yatırılmış olup, %65 oranında engelli raporu düzenlenmiştir. Tedaviyi yürüten Dr. Sinan Yörük'tür.`,
        expected: [
            { entity: 'ORGANIZATION', value: 'Sağlık Bakanlığı' },
            { entity: 'ORGANIZATION', value: 'Eğitim ve Araştırma Hastanesi' },
            { entity: 'PERSON_NAME', value: 'Gökçe Yıldız' },
            { entity: 'TR_NATIONAL_ID', value: '19283746550' },
            { entity: 'MEDICAL_ID', value: '2024556677' },
            { entity: 'HEALTH_CONDITION', value: 'Kronik böbrek yetmezliği' },
            { entity: 'BLOOD_TYPE', value: '0 Rh negatif' },
            { entity: 'DATE_TIME', value: '09.05.2024' },
            { entity: 'DISABILITY_STATUS', value: '%65' },
            { entity: 'PERSON_NAME', value: 'Sinan Yörük' },
        ],
    },
    {
        name: 'Ehliyet / Araç Devri', category: 'arac',
        text: `Aracını devreden Tarık Aydın, sürücü belgesi No: B-2019-456789 sahibidir. Devredilen aracın plakası 35 KLM 2024, şasi numarası 1HGCM82633A123456'dır. Devir işlemi 15.06.2024 tarihinde Konak Noterliği'nde gerçekleşmiştir. Alıcı Pelin Korkmaz'a (T.C. 28374655019) teslim edilmiştir.`,
        expected: [
            { entity: 'PERSON_NAME', value: 'Tarık Aydın' },
            { entity: 'DRIVER_LICENSE', value: 'B-2019-456789' },
            { entity: 'TR_LICENSE_PLATE', value: '35 KLM 2024' },
            { entity: 'VEHICLE_ID', value: '1HGCM82633A123456' },
            { entity: 'DATE_TIME', value: '15.06.2024' },
            { entity: 'NOTARY', value: 'Konak Noterliği' },
            { entity: 'PERSON_NAME', value: 'Pelin Korkmaz' },
            { entity: 'TR_NATIONAL_ID', value: '28374655019' },
        ],
    },
    {
        name: 'Belirsiz Süreli İş Sözleşmesi', category: 'is-hukuku',
        text: `İŞ SÖZLEŞMESİ

İşveren Yenilik Yazılım A.Ş. ile işçi Caner Doğan (T.C. 56473829100) arasında imzalanmıştır. İşçi 01.07.2024 tarihinde işe başlayacaktır. Aylık brüt ücret 65.000 TL'dir. İşçinin ikametgâh adresi: Kazım Karabekir Mah. 12. Sok. No:8 Esenler/İstanbul. İletişim: caner.dogan@yenilik.com.tr, 0535 667 88 99.`,
        expected: [
            { entity: 'ORGANIZATION', value: 'Yenilik Yazılım A.Ş.' },
            { entity: 'PERSON_NAME', value: 'Caner Doğan' },
            { entity: 'TR_NATIONAL_ID', value: '56473829100' },
            { entity: 'DATE_TIME', value: '01.07.2024' },
            { entity: 'SALARY_AMOUNT', value: '65.000 TL' },
            { entity: 'ADDRESS', value: 'Kazım Karabekir Mah. 12. Sok. No:8 Esenler/İstanbul' },
            { entity: 'EMAIL_ADDRESS', value: 'caner.dogan@yenilik.com.tr' },
            { entity: 'PHONE_NUMBER', value: '0535 667 88 99' },
        ],
    },
    {
        name: 'e-Fatura / KEP Ticari İhtilaf', category: 'ticari',
        text: `Şirketimiz Parlak Ambalaj San. Tic. Ltd. Şti. (MERSİS No: 0123456789012345) tarafından düzenlenen e-fatura UUID: 5f8a3c12-9b4d-4e67-a1f2-3c4d5e6f7890 ödenmemiştir. Muhataba 03.06.2024 tarihinde KEP adresi parlak.ambalaj@hs01.kep.tr üzerinden bildirim yapılmıştır. Fatura tutarı 178.400 TL'dir.`,
        expected: [
            { entity: 'ORGANIZATION', value: 'Parlak Ambalaj San. Tic. Ltd. Şti.' },
            { entity: 'TR_MERSIS_NO', value: '0123456789012345' },
            { entity: 'EINVOICE_UUID', value: '5f8a3c12-9b4d-4e67-a1f2-3c4d5e6f7890' },
            { entity: 'DATE_TIME', value: '03.06.2024' },
            { entity: 'KEP_ADDRESS', value: 'parlak.ambalaj@hs01.kep.tr' },
            { entity: 'MONETARY_AMOUNT', value: '178.400 TL' },
        ],
    },
    {
        name: 'Çek / Senet İcra', category: 'icra',
        text: `Alacaklı Murat Şen, borçlu Halil Yalçın aleyhine kambiyo senedine dayalı icra takibi başlatmıştır. Keşide edilen çek seri no: TR0098765432, bedeli 240.000 TL'dir. Çek 18.03.2024 keşide tarihli olup karşılıksız çıkmıştır. Borçlunun adresi: Bahçeli Mah. Lale Cad. No:14 Çankaya/Ankara.`,
        expected: [
            { entity: 'PERSON_NAME', value: 'Murat Şen' },
            { entity: 'PERSON_NAME', value: 'Halil Yalçın' },
            { entity: 'CHECK_SERIAL_NO', value: 'TR0098765432' },
            { entity: 'MONETARY_AMOUNT', value: '240.000 TL' },
            { entity: 'DATE_TIME', value: '18.03.2024' },
            { entity: 'ADDRESS', value: 'Bahçeli Mah. Lale Cad. No:14 Çankaya/Ankara' },
        ],
    },
    {
        name: 'Yabancı Uyruklu Dava', category: 'uluslararasi',
        text: `Davacı Alman uyruklu Hans Müller, pasaport numarası U12345678 ile Türkiye'de ikamet etmektedir. Müvekkil 20.02.2024 tarihinde Antalya'da düzenlenen sözleşmeden doğan alacağının tahsilini talep etmektedir. İletişim: hans.mueller@email.de. Talep edilen tutar 32.000 EUR'dur.`,
        expected: [
            { entity: 'NATIONALITY', value: 'Alman' },
            { entity: 'PERSON_NAME', value: 'Hans Müller' },
            { entity: 'TR_PASAPORT', value: 'U12345678' },
            { entity: 'DATE_TIME', value: '20.02.2024' },
            { entity: 'LOCATION', value: 'Antalya' },
            { entity: 'EMAIL_ADDRESS', value: 'hans.mueller@email.de' },
            { entity: 'MONETARY_AMOUNT', value: '32.000 EUR' },
        ],
    },
    {
        name: 'Baro Disiplin Şikayeti', category: 'meslek',
        text: `İstanbul Barosu Başkanlığı'na yapılan şikayette, baro sicil no 28456 ile kayıtlı Av. Deniz Kaplan hakkında disiplin soruşturması talep edilmiştir. Şikayetçi Esra Yıldırım, avukatın 11.04.2024 tarihinde vekalet ücreti olarak aldığı 50.000 TL'yi iade etmediğini belirtmiştir.`,
        expected: [
            { entity: 'ORGANIZATION', value: 'İstanbul Barosu Başkanlığı' },
            { entity: 'BARO_SICIL', value: '28456' },
            { entity: 'PERSON_NAME', value: 'Deniz Kaplan' },
            { entity: 'PERSON_NAME', value: 'Esra Yıldırım' },
            { entity: 'DATE_TIME', value: '11.04.2024' },
            { entity: 'MONETARY_AMOUNT', value: '50.000 TL' },
        ],
    },
    {
        name: 'Siber / KVKK Veri İhlali (Teknik)', category: 'kvkk',
        text: `Veri sorumlusu Hızlı Market A.Ş.'nin sunucusuna 07.06.2024 tarihinde 92.45.118.203 IP adresinden yetkisiz erişim sağlanmıştır. Saldırgan https://sizinti-portali.example.com adresinde verileri yayınlamıştır. Etkilenen kullanıcı "burak_demir35" hesabına ait e-posta burak.demir@gmail.com sızmıştır. Olay kayıt sunucusu domain: market-db.example.org üzerinde tespit edilmiştir.`,
        expected: [
            { entity: 'ORGANIZATION', value: 'Hızlı Market A.Ş.' },
            { entity: 'DATE_TIME', value: '07.06.2024' },
            { entity: 'IP_ADDRESS', value: '92.45.118.203' },
            { entity: 'URL', value: 'https://sizinti-portali.example.com' },
            { entity: 'USERNAME', value: 'burak_demir35' },
            { entity: 'EMAIL_ADDRESS', value: 'burak.demir@gmail.com' },
            { entity: 'DOMAIN', value: 'market-db.example.org' },
        ],
    },
    {
        name: 'Şirket Ticaret Sicili İhtilafı', category: 'ticari',
        text: `Davalı şirket Güneş Tekstil A.Ş. (MERSİS: 9988776655443322), Ankara Ticaret Sicili 456789 numarasında kayıtlıdır. Vergi numarası 1122334455 olan şirketin yetkilisi Orhan Çelik'tir. Şirket 14.05.2024 tarihli genel kurul kararıyla sermaye artırımına gitmiştir. Talep edilen alacak 410.000 TL'dir.`,
        expected: [
            { entity: 'ORGANIZATION', value: 'Güneş Tekstil A.Ş.' },
            { entity: 'TR_MERSIS_NO', value: '9988776655443322' },
            { entity: 'TRADE_REGISTRY_NO', value: '456789' },
            { entity: 'LOCATION', value: 'Ankara' },
            { entity: 'TR_VERGI_NO', value: '1122334455' },
            { entity: 'PERSON_NAME', value: 'Orhan Çelik' },
            { entity: 'DATE_TIME', value: '14.05.2024' },
            { entity: 'MONETARY_AMOUNT', value: '410.000 TL' },
        ],
    },
    {
        name: 'Banka Hesabına Haciz', category: 'icra',
        text: `İzmir 4. İcra Dairesi'nin 2024/11234 sayılı dosyasında, borçlu Sevim Acar'ın (T.C. 37465829011) Yapı Kredi Bankası'ndaki TR93 0006 7000 0000 1234 5678 12 IBAN numaralı hesabına haciz konulmuştur. Haczedilen tutar 87.500 TL'dir. Hesap numarası 12345678 olan mevduata bloke uygulanmıştır.`,
        expected: [
            { entity: 'COURT', value: 'İzmir 4. İcra Dairesi' },
            { entity: 'ENFORCEMENT_ID', value: '2024/11234' },
            { entity: 'PERSON_NAME', value: 'Sevim Acar' },
            { entity: 'TR_NATIONAL_ID', value: '37465829011' },
            { entity: 'ORGANIZATION', value: 'Yapı Kredi Bankası' },
            { entity: 'IBAN_CODE', value: 'TR93 0006 7000 0000 1234 5678 12' },
            { entity: 'MONETARY_AMOUNT', value: '87.500 TL' },
            { entity: 'BANK_ACCOUNT_NO', value: '12345678' },
        ],
    },
    {
        name: 'Kredi Kartı Harcama İtirazı', category: 'tuketici',
        text: `Müvekkil Aslı Yılmaz, Garanti BBVA'dan aldığı 5398 7654 3210 9871 numaralı kredi kartı ile yapılmayan 14.750 TL tutarındaki harcamaya itiraz etmektedir. İşlem 05.06.2024 tarihinde gerçekleşmiştir. Müvekkilin müşteri hizmetlerine bildirim numarası: 0533 444 55 66.`,
        expected: [
            { entity: 'PERSON_NAME', value: 'Aslı Yılmaz' },
            { entity: 'ORGANIZATION', value: 'Garanti BBVA' },
            { entity: 'CREDIT_CARD', value: '5398 7654 3210 9871' },
            { entity: 'MONETARY_AMOUNT', value: '14.750 TL' },
            { entity: 'DATE_TIME', value: '05.06.2024' },
            { entity: 'PHONE_NUMBER', value: '0533 444 55 66' },
        ],
    },
    {
        name: 'Ceza Mahkemesi İddianame', category: 'ceza',
        text: `İSTANBUL 14. ASLİYE CEZA MAHKEMESİ
Esas No: 2024/667

Sanık Emre Kılıç (T.C. 48576920183) hakkında 09.01.2024 tarihinde işlenen dolandırıcılık suçundan kamu davası açılmıştır. Mağdur Nuray Şahin'in zararı 320.000 TL olarak tespit edilmiştir. Sanığın bilinen adresi: Yıldıztepe Mah. Gül Sok. No:3 Keçiören/Ankara.`,
        expected: [
            { entity: 'COURT', value: 'İstanbul 14. Asliye Ceza Mahkemesi' },
            { entity: 'CASE_NUMBER', value: '2024/667' },
            { entity: 'PERSON_NAME', value: 'Emre Kılıç' },
            { entity: 'TR_NATIONAL_ID', value: '48576920183' },
            { entity: 'DATE_TIME', value: '09.01.2024' },
            { entity: 'PERSON_NAME', value: 'Nuray Şahin' },
            { entity: 'MONETARY_AMOUNT', value: '320.000 TL' },
            { entity: 'ADDRESS', value: 'Yıldıztepe Mah. Gül Sok. No:3 Keçiören/Ankara' },
        ],
    },
];

// ─────────────────────────────────────────────────────────────────────────
// SKORLAMA
// İki metrik raporlanır:
//   1) KATI: tam tip eşleşmesi (büyük/küçük harf duyarsız). Tip ayrımını
//      (SALARY_AMOUNT vs MONETARY_AMOUNT gibi) cezalandırır.
//   2) MASKELEME-KAPSAMA: maskeleme açısından eşdeğer tipler (yer, para, tarih,
//      dosya no) tek sınıf sayılır ve bir altın etiketi birden çok parça
//      (örn. ADRES'in LOKASYON parçaları) örtebilir. "PII yakalandı mı ve
//      makul biçimde sınıflandı mı" sorusunu ölçer — ürün için asıl metrik.
// Bu bir cezalandırma değil saydamlık için: ikisi de raporlanır.
// ─────────────────────────────────────────────────────────────────────────

function norm(s) { return s.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim(); }
function valMatch(a, b) { a = norm(a); b = norm(b); return a === b || a.includes(b) || b.includes(a); }

// Maskeleme açısından eşdeğer tip sınıfları
const EQUIV = {
    ADDRESS: 'YER', LOCATION: 'YER',
    MONETARY_AMOUNT: 'PARA', SALARY_AMOUNT: 'PARA',
    DATE_TIME: 'TARIH', CONTEXTUAL_DATE: 'TARIH', TIME: 'TARIH',
    CASE_NUMBER: 'DOSYA_NO', ENFORCEMENT_ID: 'DOSYA_NO',
};
function cls(e) { return EQUIV[e] || e; }

// Katı skor: tip birebir (case-insensitive), one-to-one.
function scoreStrict(findings, expected) {
    const stats = {};
    const used = new Set();
    for (const exp of expected) {
        const k = exp.entity;
        (stats[k] = stats[k] || { tp: 0, fp: 0, fn: 0 });
        let hit = -1;
        for (let i = 0; i < findings.length; i++) {
            if (used.has(i) || findings[i].entity !== exp.entity) continue;
            if (valMatch(findings[i].value, exp.value)) { hit = i; break; }
        }
        if (hit >= 0) { stats[k].tp++; used.add(hit); } else stats[k].fn++;
    }
    for (let i = 0; i < findings.length; i++) {
        if (used.has(i)) continue;
        const k = findings[i].entity;
        (stats[k] = stats[k] || { tp: 0, fp: 0, fn: 0 }).fp++;
    }
    return stats;
}

// Kapsama skoru: eşdeğer sınıf + bir altını örten tüm parçaları tüket.
function scoreCoverage(findings, expected, docName) {
    const stats = {};
    const used = new Set();
    const misses = [], extras = [];
    for (const exp of expected) {
        const ck = cls(exp.entity);
        (stats[ck] = stats[ck] || { tp: 0, fp: 0, fn: 0 });
        let hit = -1;
        for (let i = 0; i < findings.length; i++) {
            if (used.has(i) || cls(findings[i].entity) !== ck) continue;
            if (valMatch(findings[i].value, exp.value)) { hit = i; break; }
        }
        if (hit >= 0) {
            stats[ck].tp++; used.add(hit);
            // aynı sınıftan, altın değerin parçası olan diğer bulguları da tüket (ör. ADRES->LOKASYON parçaları)
            for (let i = 0; i < findings.length; i++) {
                if (used.has(i) || cls(findings[i].entity) !== ck) continue;
                if (norm(exp.value).includes(norm(findings[i].value))) used.add(i);
            }
        } else { stats[ck].fn++; misses.push({ doc: docName, entity: exp.entity, value: exp.value }); }
    }
    for (let i = 0; i < findings.length; i++) {
        if (used.has(i)) continue;
        const ck = cls(findings[i].entity);
        (stats[ck] = stats[ck] || { tp: 0, fp: 0, fn: 0 }).fp++;
        extras.push({ doc: docName, entity: findings[i].entity, value: findings[i].value, score: findings[i].score });
    }
    return { stats, misses, extras };
}

function analyze(doc) { return analyzeText(doc.text, ALL, 0.35); }
function aggregate(into, stats) {
    for (const [k, s] of Object.entries(stats)) {
        const g = into[k] = into[k] || { tp: 0, fp: 0, fn: 0 };
        g.tp += s.tp; g.fp += s.fp; g.fn += s.fn;
    }
}
function totals(g) {
    const tp = Object.values(g).reduce((s, r) => s + r.tp, 0);
    const fp = Object.values(g).reduce((s, r) => s + r.fp, 0);
    const fn = Object.values(g).reduce((s, r) => s + r.fn, 0);
    const p = precision(tp, fp), r = recall(tp, fn);
    return { tp, fp, fn, p, r, f: f1(p, r) };
}

// ─────────────────────────────────────────────────────────────────────────
// RAPOR
// ─────────────────────────────────────────────────────────────────────────
console.log('═'.repeat(78));
console.log('  PERDE WEB — BAĞIMSIZ HOLDOUT RAPORU');
console.log('═'.repeat(78));
console.log();

const strictG = {}, covG = {};
const allMisses = [], allExtras = [];

for (const doc of HOLDOUT_DOCS) {
    const findings = analyze(doc);
    aggregate(strictG, scoreStrict(findings, doc.expected));
    const cov = scoreCoverage(findings, doc.expected, doc.name);
    aggregate(covG, cov.stats);
    allMisses.push(...cov.misses); allExtras.push(...cov.extras);
    const flag = (cov.misses.length || cov.extras.length) ? `(✗${cov.misses.length} kaçak, ⚠${cov.extras.length} fazla)` : '✓';
    console.log(`▸ ${doc.name.padEnd(38)} ${flag}`);
}

console.log();
console.log('MASKELEME-KAPSAMA — sınıf bazında (asıl ürün metriği)');
console.log('─'.repeat(60));
const covRows = Object.entries(covG).map(([k, s]) => ({ k, ...s, p: precision(s.tp, s.fp), r: recall(s.tp, s.fn), f: f1(precision(s.tp, s.fp), recall(s.tp, s.fn)) })).sort((a, b) => a.f - b.f);
for (const r of covRows) {
    const flag = r.f < 0.8 ? ' ◄' : '';
    console.log(`${r.k.padEnd(16)} TP ${String(r.tp).padStart(3)}  FP ${String(r.fp).padStart(3)}  FN ${String(r.fn).padStart(3)}  F1 ${(r.f * 100).toFixed(1).padStart(5)}%${flag}`);
}

const ct = totals(covG), st = totals(strictG);
console.log('─'.repeat(60));
console.log();
console.log('GENEL (Micro F1):');
console.log(`  Maskeleme-kapsama : ${(ct.f * 100).toFixed(1)}%  (P ${(ct.p * 100).toFixed(1)}% / R ${(ct.r * 100).toFixed(1)}%, TP ${ct.tp} FP ${ct.fp} FN ${ct.fn})`);
console.log(`  Katı (tam tip)    : ${(st.f * 100).toFixed(1)}%  (P ${(st.p * 100).toFixed(1)}% / R ${(st.r * 100).toFixed(1)}%, TP ${st.tp} FP ${st.fp} FN ${st.fn})`);
console.log();

if (allMisses.length) {
    console.log(`GERÇEK KAÇAKLAR (FN) — hiçbir biçimde yakalanamayan ${allMisses.length} PII:`);
    for (const m of allMisses) console.log(`  ✗ [${m.entity}] "${m.value}"  (${m.doc})`);
    console.log();
}
if (allExtras.length) {
    console.log(`GERÇEK FAZLALAR (FP) — gerçek PII'ye karşılık gelmeyen ${allExtras.length} işaret:`);
    for (const e of allExtras) console.log(`  ⚠ [${e.entity}] "${e.value}" (skor ${e.score})  (${e.doc})`);
    console.log();
}

const totalGold = HOLDOUT_DOCS.reduce((s, d) => s + d.expected.length, 0);
console.log(`Belge: ${HOLDOUT_DOCS.length} · Altın etiket: ${totalGold}`);
console.log('Metodoloji: bağımsız set; motor bu sete göre AYARLANMAMIŞTIR.');
console.log('Katı ile kapsama farkı = tip-granülerliği (ör. SALARY/MONETARY, ADRES/LOKASYON).');
console.log('Benchmark (co-developed) Micro F1 ~97.5% ile karşılaştırın: bağımsız set daha düşük çıkar.');
console.log();

// CI GATE — anti-regresyon tabanı (aspirasyon değil). Ölçülen değerin biraz
// altına konur; 34 belgelik çeşitli set kolay 20'den daha zordur, gerçek skoru
// README'de raporlanır. Amaç: gelecekteki değişiklikler kapsama recall'ını
// bu tabanın altına düşürürse build başarısız olsun.
const GATE_RECALL = 0.94, GATE_F1 = 0.93;
if (ct.r < GATE_RECALL || ct.f < GATE_F1) {
    console.log(`✗ HOLDOUT GATE BAŞARISIZ: kapsama recall ${(ct.r * 100).toFixed(1)}% (eşik ${(GATE_RECALL * 100).toFixed(0)}%), F1 ${(ct.f * 100).toFixed(1)}% (eşik ${(GATE_F1 * 100).toFixed(0)}%)`);
    process.exit(1);
}
console.log(`✓ Holdout gate geçti (recall ${(ct.r * 100).toFixed(1)}% ≥ ${(GATE_RECALL * 100).toFixed(0)}%, F1 ${(ct.f * 100).toFixed(1)}% ≥ ${(GATE_F1 * 100).toFixed(0)}%).`);
