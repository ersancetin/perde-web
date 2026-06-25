# Perde Web

Turkce hukuk belgeleri icin kisisel veri tespiti ve maskeleme yardimcisi. Tamamen tarayicida calisir — belge icerigi sunucuya gonderilmez.

> **Uyari:** Otomatik tespitler hata veya eksiklik icerebilir. Ciktilar kullanici tarafindan kontrol edilmelidir. Bu arac, tek basina KVKK uyumlulugu veya hukuken anonim hale getirme garantisi saglamaz.

## Features

- 102 entity types optimized for Turkish legal, financial, and medical documents
- Rule-based NER engine (regex + dictionary + context scoring)
- Full-address block masking: adjacent street/district/city fragments are merged into one `ADDRESS` token, and labeled reference fields (Sipariş/Üye/Teklif No, MERSİS, etc.) are auto-detected
- Client-side PDF, DOCX, and UYAP UDF text extraction
- OCR support for scanned PDFs via Tesseract.js (Turkish language)
- Zero third-party requests — all processing runs locally in the browser
- Multiple anonymization methods: replace, mask, partial, redact, pseudonymize (HMAC-SHA-256)
- 8 preset profiles: Temel, Hukuk, Finans, Saglik, KVKK, Teknik, Uluslararasi, Tumu
- AI workflow: reversible pseudonymization (`[KISI_1]` tokens) + a legal prompt library with anti-hallucination guardrails, then de-anonymization of the AI response — round-trip mapping stays in-memory only and never leaves the browser
- Manual text selection masking with Ctrl+M shortcut
- Drag-and-drop file upload
- Configurable confidence threshold and per-entity toggles

## Privacy

- Text analysis runs entirely in the browser via Web Workers
- No analytics, tracking, or third-party network requests
- No external CDN, font, or script dependencies
- Hash/pseudonymization uses HMAC-SHA-256 with a per-session random salt (32 bytes from crypto.getRandomValues), truncated to 16 hex chars. Same input produces different hashes across sessions; cross-session linkage is not possible
- Site is served via GitHub Pages, which logs standard access metadata (IP, User-Agent) per [GitHub's privacy statement](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#data-collection)

## AI Workflow (Yapay Zeka Is Akisi)

Positioning: this is **not** a "KVKK-compliance guarantee". It is a tool that masks Turkish legal documents locally and carries them to an AI more safely — it helps a lawyer burn their hands less while using AI, it does not replace the lawyer.

Lets a user safely use a cloud AI (ChatGPT, Claude, Gemini) on a document without exposing client data:

1. Analyze a document; open the **Yapay Zeka** panel from the results view.
2. Pick a legal prompt from a categorized library (21 prompts in 5 groups: litigation/petitions, contracts, advisory, research, document processing). The anonymized text is embedded into the prompt with stable, reversible tokens like `[KISI_1]`, `[KURUM_2]`.
3. Optionally adapt the prompt: choose the client's side (davacı/davalı), output language (TR/EN), add a free-text instruction, or edit the prompt text directly before copying.
4. Copy the prompt, run it in any AI, paste the response back.
5. Perde maps the tokens back to the real values (tolerant matching for spacing/case/separator changes the model may introduce) and flags any token it could not resolve.

A collapsible **token legend** (`[KISI_1] → Ahmet Yılmaz`) is shown locally to help read the AI output; it is never sent to the AI and is not copied with the prompt. A persistent risk note reminds the user that masking may be incomplete.

The panel is deliberately minimal: advanced options (party/language/extra instruction) and the token legend are collapsed by default. Before sending, a **red warning** appears only if some data was left **open** (a kept finding would go to the AI in clear); scanned pages get an explicit **"OCR text may be wrong, review it"** warning.

Every prompt includes guardrails instructing the model to (a) preserve the tokens verbatim and not invent new ones, and (b) avoid fabricating case law / statute citations and flag anything that must be verified.

**Limits (important):** This reduces risk; it is not a guarantee. The de-anonymization map is held in memory only (cleared on reset/new document) and is never sent anywhere. Anonymization quality is bounded by the detector — a missed identifier still leaks, and the narrative content of a case can remain identifiable even when names are masked. The anti-hallucination prompts lower but do not eliminate fabricated citations; all AI output must be verified by a lawyer.

## Development

```bash
npm test           # 2237 unit tests (incl. AI workflow round-trip + regression guards)
npm run benchmark  # 15-document co-developed F1 benchmark (CI-gated ≥95%)
npm run holdout    # 50-document INDEPENDENT holdout set (CI-gated on recall/F1)
```

All three run in CI and are mandatory; the holdout exits non-zero if masking-coverage recall < 94% or F1 < 93% (an anti-regression floor, not the reported score).

Benchmark (co-developed with the engine — overstates real-world performance):
- Micro F1: 97.5% (347 TP, 11 FP, 7 FN), Macro F1: 98.4%

Holdout (independent, **50** synthetic-but-realistic docs across litigation, enforcement, insurance, arbitration, health, customs, KVKK, employment, property, family, tax, consumer, etc. — the engine was **not** tuned on them):
- Masking-coverage Micro F1: **99.5%** (P 99.5% / R **99.5%** — did we detect & reasonably class each PII; the product-relevant metric)
- Strict per-type Micro F1: **91.8%** (gap vs coverage is type-granularity, e.g. SALARY vs MONETARY, ADDRESS vs LOCATION — not missed PII)
- Discipline: each batch was measured **before** any engine change (original 34-doc set first-run recall 94.8%; the 16-doc expansion to 50 first-ran at 98.1%); gaps each surfaced were then fixed and locked with regression tests — passport/MERSİS/trade-registry/baro-sicil format variants, single-word notaries (`Konak Noterliği`), full company-suffix chains (`… San. Tic. Ltd. Şti.`) and foreign suffixes (`GmbH`), street-name/person collisions (`Bağdat Caddesi`), full-address block merging, disability phrasing (`iş göremezlik`), and contextual usernames. Genuine label errors were corrected; the engine was **not** contorted to fit these synthetic docs — a change that helped the holdout but regressed the benchmark (a `tahkim merkezi` org suffix) was reverted.
- Most remaining "misses" are **mis-classifications where the span is still masked** under another type (e.g. a foreign name caught as nationality). Truly-undetected spans are very few.

## Architecture

```
index.html          Entry point
dictionaries.js     Turkish name/location gazetteers
recognizers.js      Entity definitions, colors, categories (102 types)
ner-engine.js       Regex/dictionary/context NER engine
ner-worker.js       Web Worker wrapper for NER engine
anonymizer.js       Anonymization operators + highlight rendering
prompts.js          Legal prompt library (categorized, anti-hallucination guardrails)
ai-workflow.js      Reversible pseudonymize / de-anonymize (DOM-free, unit-tested)
app.js              UI controller + AI workflow panel wiring
style.css           Styles
lib/                Self-hosted PDF.js, Tesseract.js, JSZip
test.js             Unit tests (all test data is synthetic)
bench-lib.js        Shared scoring (IoU/value matching, P/R/F1)
benchmark.js        Co-developed F1 benchmark (15 docs)
holdout.js          Independent holdout set (50 docs) + dual-metric report
```

## Threat Model

See [THREAT_MODEL.md](THREAT_MODEL.md) for the full model (assets, data flows, adversaries, mitigations, residual risks) and [gizlilik.html](gizlilik.html) for the user-facing privacy page (Turkish).

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
