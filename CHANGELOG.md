# Changelog

All notable changes to Perde Web are documented here.

## [Unreleased]

### Added — Chrome extension (MV3, prototype)
- New `extension/` surface: intercepts the `paste` event on AI sites (ChatGPT, Claude, Gemini, Copilot, Perplexity, Grok, Mistral, DeepSeek, HF Chat), analyses the clipboard text **before it reaches the page**, and either shows a confirm panel listing what will be masked or masks silently with an undo — configurable. Also scans text you **type** (600 ms debounce) and shows a small badge next to the field; typing never rewrites the field in place (that would move the caret and corrupt ProseMirror/Lexical state), masking stays one click or `Alt+Shift+M` away.
- **Round-trip decode:** the default style emits reversible `[KISI_1]` tokens; select the AI's reply and press `Alt+Shift+D` (or right-click → *Perde: token'ları çöz*) to restore the real values. Reuses `ai-workflow.js` unchanged, so token numbering matches the web app exactly.
- **The engine is not duplicated.** `npm run build:ext` copies the four DOM-free engine files from the repo root into `extension/engine/` (gitignored); the single source stays at the root so gazetteer/recognizer work reaches both surfaces. `tools/make-icons.js` rasterises the favicon SVG into PNG icons with no new dependency.
- Three scope profiles. **Güvenli** (default) covers direct identifiers only; **Hukuk** adds court/case/monetary/date/occupation; **Tümü** is all 102 types. `URL`, `DOMAIN`, `DATE_TIME`, `TIME` are excluded from both defaults — verified against code snippets and ordinary Turkish/English chat, which now produce **zero** findings under Güvenli. In an extension a false positive silently corrupts what the user pasted, so this matters more than it does in the web app's review-then-export flow.
- Token map lives in `chrome.storage.session` — memory only, never written to disk, gone when the browser closes, and clearable from the popup. This is **stricter than the web app's `localStorage`**, which deliberately survives reloads.
- Deliberately no `<all_urls>`: a fixed https allowlist of AI sites, with opt-in per-site additions registered at runtime. Password fields are never touched. **151 new unit tests** covering profile resolution, site scoping, overlap dedupe, all three mask styles, token round-trip, real-engine end-to-end behaviour, and `manifest.json` integrity (declared files exist, load order, no broad permissions).

### Fixed — lowercase place names were not detected at all
Reported: `ersan çetin, cumayeri mahallesi, düzce` masked only the name. The person gazetteer is case-tolerant, but `detectLocations` required an initial capital — correct for formal filings, wrong for chat, where people type lowercase. `düzce`, `istanbul kadıköy`, `cumayeri mahallesi` all produced nothing.

Two changes in `ner-engine.js`, both deliberately conservative:
- **A lowercase gazetteer pass** for provinces/districts, scored below the capitalised match (0.55/0.45 vs 0.6/0.5) since lowercase is a weaker signal. Eleven gazetteer entries collide with everyday Turkish words (`van`, `ordu`, `ağrı`, `uşak`, `batman`, `aydın`, `tokat`, `kars`, `konak`, `adalar`, `fatih`, `yıldırım`) — those are accepted only when a location cue (`ili`, `ilçesi`, `mahallesi`, `adresinde`, `ikamet`, `doğumlu`, …) appears within 45 characters, so `sağ kolumda şiddetli ağrı var` and `bir bardak çay içtik` stay clean while `ağrı ilçesinde oturuyor` is caught. Cue matching tokenises the text rather than using `\b`, which is unreliable next to Turkish letters (`\bil` matches inside `değil`).
- **The suffix-anchored address pattern accepts a lowercase name**, which is the only path that catches `cumayeri mahallesi` (Cumayeri is not in the gazetteer — the `Mahallesi` suffix is what identifies it). Restricted to the **single** word before the suffix: allowing the original 1–3 words in lowercase made the span swallow ordinary prose (`Maliki bulunduğum Bağlarbaşı Mah.`), which the existing test suite caught immediately and which holdout precision confirmed. Capitalised names keep the multi-word form.

Benchmark held at 97.5% and holdout at 99.5% (a first attempt dropped holdout F1 to 99.2% before the single-word restriction). Core tests 2267 → **2299**, covering both directions: lowercase places detected, ambiguous words left alone without a cue, and the span not over-extending.

### Changed — paste panel polish and a bulk toggle
The panel got a visual pass: wider (420px so button labels stay on one line), softer elevation, a subtle entrance transition that respects `prefers-reduced-motion`, hover states, a styled scrollbar, and a count badge instead of a prose summary. Each row now shows a confidence bar next to the type chip rather than a bare percentage, and rows left open are struck through with an explicit red "açık gidecek" flag. New **tümünü maskele / tümünü açık bırak** row for bulk selection, with a live `N/M maskelenecek` readout. Browser test 61 → **65** checks.

The popup's "Dene" placeholder no longer doubles as example data — there is an **"Örnek metin doldur"** button with a realistic synthetic petition sentence, so the field starts empty with a short instruction instead of a long hint.

### Fixed — the default profile did not mask place names, and its name said otherwise
Reported from real use: typing `Düzce Cumayeri` or `Cumayeri Mahallesi` masked nothing. The engine detects all of them correctly — the bug was the extension's profile design. The default profile excluded `LOCATION` on the theory that place names are noise in casual chat. For a Turkish legal/KVKK tool that is simply wrong: neighbourhood, district and city are core identifying data, and `Düzce Cumayeri Mahallesi No:5` is effectively someone's address.

Worse, that profile was called **"Güvenli"** (*Safe*). In a privacy tool the narrowest setting must never carry the most reassuring name — the user picks it believing they are maximally protected. Profiles are now named for what they cover, ordered strictly by coverage (`dar ⊂ dengeli ⊂ tumu`), and a test enforces that containment:
- **Dar** (40 types) — format-recognisable identifiers only: TC, IBAN, phone, e-mail, card, passport, plate, IP. Names, places and organisations are explicitly **not** masked, and the label says so.
- **Dengeli** (89 types, **new default**) — Dar + person, organisation, **location, address**, birthplace, health/KVKK, case and court data.
- **Tümü** (102 types) — everything, including URL/date/time/amount/occupation/age.

Stored `guvenli` and `hukuk` settings migrate to `dengeli` on upgrade — always toward wider coverage, never narrower, and a test asserts the migration can only widen. `extMigrateSettings` lives in `policy.js` and is applied by the service worker (which rewrites the stored record), the popup, and the content script, so a stale read can't leave someone on a narrower profile than they think.

### Added — a "Dene" (try it) panel in the popup, and a toolbar badge
The user-visible half of the same problem: when nothing happened, there was no way to tell *detection found nothing* from *the profile excluded it*. The popup now loads the engine and answers that directly — type or paste text and it lists every detection (type + confidence), renders the masked result in the chosen style, and if a wider profile would catch more it says how many and offers a one-click switch. The toolbar icon also shows a badge and tooltip when the extension or the current site is switched off, so "why didn't it mask?" has an answer at a glance.

The popup is real code now, so the browser test covers it too (49 → **61** checks). Extension unit tests 157 → **207**, with the reported inputs (`Düzce Cumayeri`, `Cumayeri Mahallesi`, `Cumayeri Mah. No:5`, `İstanbul Kadıköy`, `Ankara Çankaya`) locked in as regressions.

### Fixed — `minLength` was silently skipping short identifiers
The paste/typing gate defaulted to 12 characters, but the engine detects identifiers well below that: a bare phone number is 11 (`05321234567`), the shortest e-mail 6 (`a@b.co`). Anything shorter than the gate was never even analysed — a straight leak in the layer whose whole job is not to leak. The gate exists to avoid pointless work on trivial pastes, not to make safety decisions, so it is now pinned to the engine's own floor (**6**) and a test asserts it stays there: it feeds bare identifiers through `extShouldIntercept` and fails if the gate filters something the engine detects.

### Fixed — two panel-dismissal bugs (found by the browser test, not by unit tests)
`extension/tools/e2e.js` drives a real Chromium with the extension loaded (49 checks: paste interception, masked insertion into both `textarea` and `contenteditable`, password fields untouched, all three styles, per-site and master switches, typing badge, token round-trip). It immediately caught two bugs that no amount of pure-logic testing would have:
- **Any scroll wiped the open panel.** The scroll handler hid whatever was showing whenever `panelOpen` was false — which is the case for the decode panel and the silent-mode "geri al" toast. On a real AI site the page scrolls continuously while the answer streams, so both would have vanished before the user could read them. Only the field-anchored badge is dismissed on scroll now.
- **A pending typing-scan timer could nuke a panel opened in the meantime.** The debounced scan called a blanket `hideUI()` to clear a stale badge; if a paste-confirm or decode panel had opened during the 600 ms window, that panel was destroyed too. The scan now bails out when anything other than a badge is showing, and only ever clears the badge.

### Fixed — per-entity toggles were partially ineffective (engine)
Two latent bugs that only surfaced when *some* entity types were disabled. All entities enabled — the configuration benchmark and holdout run — was unaffected, which is why neither suite caught them; both are now locked by 20 new regression tests in `test.js`.
- **Addresses went completely unmasked when `LOCATION` was off but `ADDRESS` was on.** `mergeAddressFragments` builds an unlabelled address block (`Bağdat Caddesi No:12 Kadıköy/İstanbul`) by merging adjacent `LOCATION` findings read out of `allFindings` — but with `LOCATION` disabled those fragments were never added there, so the merge found nothing and the whole address leaked. The fragments are now passed to the merger separately.
- **Disabled `COURT`/`NOTARY` still leaked.** `detectOrganizations` emits `ORGANIZATION`, `COURT` or `NOTARY` depending on the institution suffix, but its output was gated only on `ORGANIZATION` and pushed unfiltered. It is now gated on any of the three and filtered per type — so turning `COURT` off actually turns it off, and turning `ORGANIZATION` off no longer hides courts.

### Changed
- `FRIENDLY_LABELS` moved from `app.js` into `recognizers.js`, next to `ENTITY_LABELS`. It was trapped in the DOM-heavy UI controller, which the extension and tests cannot load; now all three surfaces share one source. No behaviour change.
- `npm test` now runs the extension suite too (2267 core + 151 extension = **2418**).

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
