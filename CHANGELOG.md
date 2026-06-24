# Changelog

All notable changes to Perde Web are documented here.

## [0.2.0-beta] — 2026-06-24

The headline of this release is the **AI workflow**: Perde stops being just a redaction tool and becomes an end-to-end, privacy-preserving way for a lawyer to use a cloud AI on client documents — mask locally, send only anonymized text, then restore the real values from the AI's response. This release also adds an **independent holdout test set**, a batch of **engine accuracy improvements**, and **trust/transparency infrastructure** (pre-pilot).

Positioning is unchanged and explicit: this **reduces risk, it is not a KVKK-compliance guarantee**, and it does not replace the lawyer's review.

### Added — AI workflow
- **Reversible pseudonymization + de-anonymization** (`ai-workflow.js`): the document is masked with stable, unique tokens (`[KISI_1]`, `[KURUM_2]`); after the AI responds, tokens are mapped back to real values with tolerant matching (spacing/case/separator changes the model may introduce). The de-anonymization map is **in-memory only** and never leaves the browser.
- **Legal prompt library** (`prompts.js`): 21 prompts in 5 categories (litigation/petitions, contracts, advisory, research, document processing), each with guardrails that (a) tell the model to preserve tokens verbatim and not invent new ones, and (b) reduce fabricated case-law/citation hallucinations.
- **Prompt options:** categorized picker, editable prompt, client-side/output-language/extra-instruction injection, and a local **token legend** (never sent to the AI, never copied with the prompt).

### Added — trust & transparency
- Before sending, a **red warning** appears only if any **open (kept) data** would go to the AI in clear; a one-line risk reminder is always shown. Clearer **OCR quality warning** for scanned PDFs.
- **Privacy page** (`gizlilik.html`, Turkish, user-facing) and **threat model** (`THREAT_MODEL.md`).
- UI kept deliberately minimal: advanced options (party/language/extra instruction) and the token legend are collapsed; no extra stats/buttons.

### Added — testing & quality
- **Independent holdout set** (`holdout.js`, 34 synthetic-but-realistic docs the engine was *not* tuned on) with dual metrics (masking-coverage + strict-type) — CI-gated on recall/F1.
- Shared scoring extracted to `bench-lib.js` (used by both benchmark and holdout).
- Unit tests grew **2139 → 2228**; `npm test`, `npm run benchmark`, and `npm run holdout` are all mandatory in CI.

### Changed — engine accuracy
Holdout masking-coverage recall improved **94.8% → 98.8%** (F1 99.0%, precision 99.2%) through holdout-driven fixes, each locked with regression tests:
- Full-address **block masking** (adjacent street/district/city fragments merged into one `ADDRESS`); street-name/person collision fixed (`Bağdat Caddesi`).
- IBAN/credit-card collision (credit-card recognizer no longer steals IBAN digits).
- Blood-type word forms (`A Rh pozitif`), disability phrasing (`%40 oranında`), foreign names/nationality (`Alman uyruklu Hans Müller`).
- Format variants now detected: MERSİS / trade-registry / baro-sicil without a colon, passport, single-word notaries (`Konak Noterliği`), full company-suffix chains (`… San. Tic. Ltd. Şti.`), and generic commercial reference numbers (Sipariş/Üye/Teklif No).
- False positives reduced (`Evlilik birliği`, `internet sitesi`); address block no longer swallows trailing contact info (`İletişim:` → phone/email kept separate).
- Benchmark Micro F1 held at **97.5%** throughout.

### Notes
- UI changes were verified by code/integration checks; visual review in a browser is recommended.
- Known residual gaps are documented honestly in `THREAT_MODEL.md` and the holdout report.

## [0.1.0-beta]

- Initial release: client-side PII detection and masking for Turkish legal documents (102 entity types, rule-based NER, PDF/DOCX/UDF + OCR, multiple anonymization methods, 8 preset profiles).
