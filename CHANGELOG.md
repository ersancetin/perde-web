# Changelog

All notable changes to Perde Web are documented here.

## [Unreleased]

### Added — de-anonymization map persistence
- The token map is now saved to the browser's `localStorage`, so the AI reply can still be decoded **after a page reload or closing the tab** (previously the map was memory-only and lost on reload). On the home screen a small box appears when a saved map exists: paste the AI response → get the real values back, no need to re-load the document. A **Temizle** button wipes it.
- **Honesty:** this changes the storage story — the privacy page, README and threat model were updated. The **document text is still never stored**; only the token→value map is, it **stays on the device and is never sent anywhere**, and it is user-clearable. The "nothing is stored at all" claim was softened to "only the token map, on this device, clearable." Unit tests 2244 → **2247** (serialize/restore round-trip guards).

### Changed — engine hardening (data-driven)
- **Holdout grown 34 → 50 docs** (added property, family, tax, consumer, foreign-company arbitration, social-media KVKK, enforcement, ALL-CAPS petition, and a no-PII negative case). First-run coverage recall on the 50-doc set was 98.1%; gaps were then fixed and locked with regression tests, raising **masking-coverage recall to 99.5%** (F1 99.5%).
- New detections: disability phrasing `%NN oranında (sürekli) iş göremezlik`; foreign company suffix `GmbH`; contextual usernames (`kullanıcı "burak_demir35"`, `"deniz.acar" kullanıcı adıyla`, `kullanıcı adı: x` — handle-like guard, low FP); first name `Tuncay`.
- Fewer false positives: `Türk/yabancı şirketi` no longer mis-detected as ORGANIZATION.
- **Discipline:** a `tahkim merkezi` org suffix that helped the holdout but regressed the co-developed benchmark (absorbed `İstanbul` LOCATION) was **reverted** — benchmark held at Micro F1 **97.5%**.

### Changed — precision (less over-masking)
- **Top national high courts/institutions are no longer masked** — Yargıtay, Danıştay, Anayasa Mahkemesi, Avrupa İnsan Hakları Mahkemesi, Sayıştay, Uyuşmazlık Mahkemesi. These are public bodies, not personal data; masking them in legal citations (`Yargıtay içtihadına göre…`) stripped context the AI needs with zero privacy benefit. **City-specific and Bölge Adliye/İdare (istinaf) courts stay masked** (they hint venue/location). A non-PII legal-text precision probe now reports **0 false positives**.
- Unit tests 2228 → **2244**.

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
