# Perde — Chrome eklentisi

Yapay zeka sitelerine **yapıştırdığın metindeki kişisel verileri, metin sayfaya
girmeden** maskeler. Perde Web'in aynı tespit motorunu kullanır; hiçbir şey
sunucuya gitmez.

> **Durum:** çalışan prototip (v0.1.0). Chrome Web Store'a yüklenmedi, elle
> "paketlenmemiş öğe" olarak kurulur. Aşağıdaki **Bilinen sınırlar** bölümünü
> okumadan güvenme.

## Ne yapar

**1. Yapıştırınca yakalar.** `paste` olayını yakalar, panodaki metni sayfaya
girmeden analiz eder. Kişisel veri varsa yapıştırmayı durdurur ve ne
maskeleneceğini gösteren bir panel açar:

```
Perde — yapıştırma kontrolü
7 kişisel veri bulundu — 2 Kişi, TC Kimlik, IBAN +2

☑ Ahmet Yılmaz              [Kişi]      güven %90
☑ 12345678901               [TC Kimlik] güven %100
☑ TR33 0006 1005 1978 ...   [IBAN]      güven %100
☐ Ziraat Bankası            [Kurum]     güven %85   ← işareti kaldırıldı, AÇIK gider

[Ayarlar]        [Olduğu gibi yapıştır]  [Maskeli yapıştır]
```

Satırların işaretini kaldırarak tek tek açık bırakabilirsin. Panel istemiyorsan
**Sessiz maskele** moduna geçebilirsin — o zaman sormadan maskeler, köşede
"geri al" bağlantısıyla kısa bir bildirim çıkar.

**2. Yazarken etiketler.** Elle yazdığın metni arka planda tarar (600 ms
gecikmeyle) ve alanın yanında küçük bir rozet gösterir: `⬤ 2 Kişi, IBAN`.
Rozete tıklayınca aynı panel açılır.

Yazarken metni **kendiliğinden değiştirmez** — bu bilinçli bir karar: kullanıcı
yazarken alanın içeriğine dokunmak imleci kaydırır ve ProseMirror/Lexical gibi
editörlerin durumunu bozar. Yazarken yalnızca *etiketler*, maskeleme tek tıkla
veya <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd> ile olur.

**3. Cevabı geri çözer.** Varsayılan stil geri çevrilebilir token'lar üretir
(`[KISI_1]`, `[IBAN_1]`). Yapay zekânın cevabını seçip
<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> (veya sağ tık → *Perde: token'ları
çöz*) dersen token'lar gerçek değerlere döner. Asıl kazanç bu: veri dışarı
çıkmaz ama cevap yine okunur kalır.

## Kurulum

```bash
npm run build:ext     # motoru extension/engine/ içine kopyalar + ikonları üretir
```

Sonra Chrome'da: `chrome://extensions` → **Geliştirici modu** aç →
**Paketlenmemiş öğe yükle** → bu repodaki `extension/` klasörünü seç.

`build:ext` zorunlu. `extension/engine/` ve `extension/icons/` üretilmiş
çıktıdır ve `.gitignore`'dadır — motorun tek kaynağı repo kökündedir
(`recognizers.js`, `ner-engine.js`, …). Böylece gazetteer/recognizer
iyileştirmeleri hem web uygulamasına hem eklentiye tek yerden akar; iki kopya
zamanla ayrışmaz.

## Ayarlar

| Ayar | Seçenekler | Varsayılan |
|---|---|---|
| **Yapıştırınca** | Önce sor · Sessiz maskele | Önce sor |
| **Kapsam** | Güvenli · Hukuk · Tümü | Güvenli |
| **Maskeleme stili** | `[KISI_1]` · `<Kişi>` · `****` | `[KISI_1]` |
| **Yazarken de uyar** | açık / kapalı | açık |
| **Site** | site site açılıp kapatılabilir | hepsi açık |

### Kapsam profilleri

- **Güvenli** *(varsayılan)* — doğrudan kimliklendiriciler: TC, IBAN, telefon,
  e-posta, kişi, kurum, adres, KVKK özel nitelikli veriler, uluslararası
  kimlikler. Günlük sohbette ve kod parçalarında yanlış alarm vermez.
- **Hukuk** — Güvenli + mahkeme, dosya no, tutar, tarih, meslek, konum gibi dava
  metnini kimliklendiren alanlar. Dilekçe/karar yapıştıranlar için.
- **Tümü** — motorun bildiği 102 türün hepsi, URL ve tarihler dahil. En
  kapsamlı, en gürültülü.

`URL`, `DOMAIN`, `DATE_TIME`, `TIME` türleri hiçbir *varsayılan* profilde yok:
genel web metninde sürekli tetikleniyor ve tek başlarına kimliklendirici
değiller. Eklenti her yapıştırmayı kestiği için buradaki gürültü, web
uygulamasındakinin aksine doğrudan kullanılabilirliği bozuyor.

## Hangi sitelerde çalışır

`chatgpt.com`, `chat.openai.com`, `claude.ai`, `gemini.google.com`,
`aistudio.google.com`, `copilot.microsoft.com`, `perplexity.ai`, `grok.com`,
`chat.mistral.ai`, `chat.deepseek.com`, `huggingface.co/chat`.

Bilerek `<all_urls>` istenmiyor. Sebebi sadece mağaza incelemesi değil: bir
kullanıcının kendi bankasında veya UYAP'ta yapıştırdığı veriyi maskelemek
anlamsız (veri zaten ait olduğu yere gidiyor) ve gereksiz risk. Eklentinin tezi
"veriyi **üçüncü taraf bir yapay zekâya** taşırken koru".

Başka bir site eklemek istersen izin çalışma anında istenir ve content script o
origin için dinamik kaydedilir (`chrome.storage.local` → `extraSites`).

## Gizlilik

- Bütün analiz content script içinde, yerelde çalışır. **Ağ isteği yok.**
- Token → gerçek değer haritası `chrome.storage.session` içinde tutulur:
  **yalnızca bellekte**, diske yazılmaz, tarayıcı kapanınca silinir. Popup'tan
  elle de temizlenebilir. (Web uygulaması `localStorage` kullanıyor — sayfa
  yenilendikten sonra da çözebilmek için; eklentide oturum belleği yeterli ve
  gizlilik açısından daha iyi.)
- Sayaç yalnızca *kaç veri maskelendi* toplamını tutar; hiçbir içerik saklanmaz.
- Şifre alanlarına (`input[type=password]`) hiç dokunulmaz.

## Bilinen sınırlar

- **Tespit eksik kalabilir.** Motor kural tabanlı; bağımsız holdout setinde
  maskeleme-kapsama recall'ı %99.5 ama o set sentetik Türkçe hukuk belgelerinden
  oluşuyor. Serbest sohbet metni, İngilizce içerik ve alışılmadık biçimler daha
  zayıf. **Kaçan bir kimliklendirici yine sızar** — panel listesini kendin de
  gözden geçir.
- **Maskelemek anonimleştirmek değildir.** İsimler maskelenmiş olsa bile bir
  olayın anlatısı kişiyi tanınabilir kılmaya devam edebilir.
- **Zengin metin kaybolur.** Yapıştırma `text/plain` olarak yeniden yazıldığı
  için biçimlendirme (tablo, kalın, bağlantı) düşer.
- **Metin yazma yöntemi kırılgan.** `document.execCommand('insertText')`
  kullanılıyor; deprecated ama React/ProseMirror/Lexical'ın duyduğu input
  olaylarını doğru üreten tek güvenilir yol. Native setter + `InputEvent`
  yedeği var, yine de bir editör güncellemesi bunu bozabilir. Çok satırlı metni
  contenteditable'a yazarken satır sonları bazı editörlerde farklı ele alınır.
- **Sürükle-bırak yakalanmıyor.** Şu an yalnızca `paste`; `drop` olayıyla metin
  bırakmak denetlenmiyor.
- **Yalnızca üst çerçeve.** `all_frames: false` — iframe içindeki editörler
  kapsam dışı.
- **Dosya yükleme kapsam dışı.** Siteye dosya olarak eklenen belge denetlenmez;
  onun için Perde Web'i kullan.
- Sessiz moddaki **"geri al"**, alanın tamamını yeniden yazarak çalışır; çok
  büyük metinlerde editörün geri alma geçmişini bozabilir.
- Panel konumu açıldığı anda sabitlenir; sayfa kaydırılırsa panel yerinde kalır
  (bilerek — akan bir sohbette panelin kaybolmaması daha önemli), yalnızca alana
  yapışık rozet kaydırmada kapanır.

## Mimari

```
manifest.json          MV3; sabit YZ sitesi allowlist'i
src/policy.js          Saf karar mantığı — profiller, site kapsamı, maskeleme (DOM'suz, testli)
src/ui.js              Sayfa üstü panel/rozet — shadow DOM içinde yalıtılmış
src/content.js         paste yakalama, yazarken tarama, metin yazma
src/background.js      Service worker: token haritası, menü, kısayollar, dinamik site kaydı
src/popup.html/.js     Ayarlar
tools/sync-engine.js   Kökteki motoru engine/ içine kopyalar
tools/make-icons.js    Favicon SVG'sinden PNG ikonlar üretir
tools/e2e.js           Gerçek Chromium'da DOM testi (elle; playwright gerektirir)
test.js                Birim testleri (npm test bunu da çalıştırır)
engine/                ÜRETİLMİŞ — kökten kopyalanır, .gitignore'da
icons/                 ÜRETİLMİŞ — .gitignore'da
```

`policy.js` bilerek DOM'suz tutuldu; profil çözümlemesi, çakışan bulguların
ayıklanması, maskeleme stilleri ve token round-trip'i `node extension/test.js`
ile doğrudan test ediliyor (151 test).

## Test

```bash
npm test          # kök (2267) + eklenti (151)
npm run test:ext  # yalnızca eklenti
```

DOM katmanı için gerçek tarayıcı testi (npm test'in parçası değil — playwright
gerektirir):

```bash
npm i -D playwright && npx playwright install chromium
npm run build:ext
node extension/tools/e2e.js            # başsız ortamda: xvfb-run -a node ...
```

49 kontrol: yapıştırmanın kesilmesi, maskeli metnin textarea ve contenteditable'a
yazılması, şifre alanına dokunulmaması, üç maskeleme stili, site/ana şalter,
yazarken rozet, token round-trip. Eklentinin en kırılgan yeri burası ve ilk
çalıştırmada iki gerçek hata yakaladı (bkz. CHANGELOG) — saf mantık testleriyle
bulunamayacak iki panel kapanma hatası.

Eklenti testleri motoru kökten yükler, `extension/engine/` kopyasına bakmaz —
yani `build:ext` çalıştırmadan da testler geçer. `manifest.json`'da bildirilen
her dosyanın varlığı ve yükleme sırası da test ediliyor.
