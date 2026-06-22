# Perde Web

Turkce hukuk belgeleri icin kisisel veri tespiti ve maskeleme yardimcisi. Tamamen tarayicida calisir — belge icerigi sunucuya gonderilmez.

> **Uyari:** Otomatik tespitler hata veya eksiklik icerebilir. Ciktilar kullanici tarafindan kontrol edilmelidir. Bu arac, tek basina KVKK uyumlulugu veya hukuken anonim hale getirme garantisi saglamaz.

## Features

- 102 entity types optimized for Turkish legal, financial, and medical documents
- Rule-based NER engine (regex + dictionary + context scoring)
- Client-side PDF, DOCX, and UYAP UDF text extraction
- OCR support for scanned PDFs via Tesseract.js (Turkish language)
- Zero third-party requests — all processing runs locally in the browser
- Multiple anonymization methods: replace, mask, partial, redact, pseudonymize (HMAC-SHA-256)
- 8 preset profiles: Temel, Hukuk, Finans, Saglik, KVKK, Teknik, Uluslararasi, Tumu
- Manual text selection masking with Ctrl+M shortcut
- Drag-and-drop file upload
- Configurable confidence threshold and per-entity toggles

## Privacy

- Text analysis runs entirely in the browser via Web Workers
- No analytics, tracking, or third-party network requests
- No external CDN, font, or script dependencies
- Hash/pseudonymization uses HMAC-SHA-256 with a per-session random salt (32 bytes from crypto.getRandomValues), truncated to 16 hex chars. Same input produces different hashes across sessions; cross-session linkage is not possible
- Site is served via GitHub Pages, which logs standard access metadata (IP, User-Agent) per [GitHub's privacy statement](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#data-collection)

## Development

```bash
npm test           # 2139 unit tests
npm run benchmark  # 15-document F1 benchmark
```

Current benchmark results (co-developed with the engine, not a holdout set):
- Micro F1: 97.5% (347 TP, 11 FP, 7 FN)
- Macro F1: 98.4%

## Architecture

```
index.html          Entry point
dictionaries.js     Turkish name/location gazetteers
recognizers.js      Entity definitions, colors, categories (102 types)
ner-engine.js       Regex/dictionary/context NER engine
ner-worker.js       Web Worker wrapper for NER engine
anonymizer.js       Anonymization operators + highlight rendering
app.js              UI controller
style.css           Styles
lib/                Self-hosted PDF.js, Tesseract.js, JSZip
test.js             Unit tests (all test data is synthetic)
benchmark.js        F1 benchmark
```

## Threat Model

- **In scope:** Detecting and masking PII in user-pasted or uploaded text, entirely client-side
- **Out of scope:** Server-side processing, encrypted storage, compliance certification
- **Trust boundary:** The browser origin. GitHub Pages serves static files and logs access metadata (IP, User-Agent)
- **Known limitations:**
  - Rule-based NER has blind spots — novel patterns or unusual formatting may be missed
  - Benchmark is co-developed with the engine (not a holdout set); one-to-one matching with IoU>0.5
  - Pseudonymization uses per-session HMAC salt — within a single session, same input → same hash (linkable). Salt is lost on page reload
  - This tool does not guarantee full anonymization or KVKK compliance. Output must be reviewed by the user.

## Third-Party Libraries

| Library | License | Usage |
|---------|---------|-------|
| [PDF.js](https://mozilla.github.io/pdf.js/) (Mozilla) | Apache-2.0 | Client-side PDF text extraction |
| [Tesseract.js](https://tesseract.projectnaptha.com/) | Apache-2.0 | Client-side OCR for scanned pages |
| [JSZip](https://stuk.github.io/jszip/) | MIT or GPL-3.0 | DOCX and UDF (ZIP) file reading |

All libraries are self-hosted in `lib/` — no CDN or external requests.

## License

MIT — see [LICENSE](LICENSE)
