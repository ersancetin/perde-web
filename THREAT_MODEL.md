# Perde Web — Threat Model

This document describes what Perde Web protects, the boundaries of that protection, and the residual risks. It is intentionally honest about what the tool does **not** guarantee.

**Positioning:** Perde is a client-side tool that detects and masks personal data in Turkish legal documents so a lawyer can use a cloud AI more safely. It is **not** a guarantee of legal anonymization or KVKK compliance, and it does not replace the lawyer's review.

---

## 1. Assets

What we are trying to protect:

| Asset | Sensitivity |
|-------|-------------|
| The user's document content (uploaded/pasted) | High — may contain client PII, privileged material |
| The de-anonymization map (`[KISI_1] → real value`) | High — reverses the masking |
| The detection report (export) | High — contains real PII |
| Site availability/integrity | Medium |

## 2. Trust boundary

The trust boundary is the **browser origin** running the page.

- **Inside the boundary:** the user's device, the browser tab, the page's JavaScript, the in-memory and on-device state (findings, de-anonymization map in localStorage, prompt text).
- **Outside the boundary:** any network endpoint. Perde is designed so that document content **never crosses** this boundary on its own.
- **Static hosting:** GitHub Pages serves the static files and logs standard access metadata (IP, User-Agent). This metadata describes *access to the site*, not document content.

## 3. Data flows

```
Document (file/paste)
      │  (stays on device)
      ▼
Browser parsing (PDF.js / JSZip / Tesseract OCR) ── all local
      ▼
NER engine (Web Worker) ── all local, no network
      ▼
Findings + masked output ── in memory; de-anon token map saved to
      │                         localStorage (this device only, user can clear)
      ├─► Download (TXT / JSON report) ── local file, user-initiated
      │
      └─► AI workflow:
             Anonymized prompt ──(user copies + pastes)──► external AI  ← ONLY exit point
             De-anon map ── saved on device (localStorage), never sent
             AI response ──(user pastes back)──► local de-anonymization
```

**The only path by which content leaves the device is the user manually copying the (anonymized) prompt into a third-party AI.** Perde itself makes no outbound requests with document content. The de-anonymization map and detection report never leave the browser unless the user explicitly downloads them as local files.

## 4. Adversaries

| Adversary | Capability | In scope? |
|-----------|-----------|-----------|
| Passive network observer | Sees TLS metadata to GitHub Pages | Yes — mitigated: no content is transmitted |
| Malicious third-party script / CDN | Would exfiltrate data | Yes — mitigated: zero third-party requests, enforced by CSP |
| The AI provider | Receives whatever the user pastes | Partially — only anonymized text is intended to be pasted; provider policy governs from there |
| Someone with access to the user's device | Can read the screen / downloaded files | Out of scope (device security is the user's responsibility) |
| Attacker tampering with hosting | Could serve modified JS | Partially — open source + SRI-style review; GitHub Pages integrity assumed |

## 5. In scope / out of scope

**In scope (design goals):**
- Detecting and masking PII entirely client-side.
- Preventing the page from sending document content to any server.
- Keeping the de-anonymization map and reports on-device and user-clearable (never sent anywhere).

**Out of scope (explicit non-goals):**
- Guaranteeing complete anonymization or KVKK compliance.
- Protecting against a compromised user device or browser.
- Controlling what the AI provider does with pasted data.
- Defending against re-identification from the *narrative* of a case (masking identifiers does not anonymize the story).

## 6. Threats and mitigations

| Threat | Mitigation |
|--------|-----------|
| Content exfiltration via network request | No application code issues outbound requests with content. **Content Security Policy** (`default-src 'self'`, no external `connect/script/img/font`) makes the browser block exfiltration attempts. |
| Third-party / CDN supply chain | All libraries (PDF.js, Tesseract.js, JSZip) are **self-hosted** in `lib/`; no external CDN, font, or analytics. |
| Persistent leakage on shared device | No cookies; the original document text is never written to storage. The **de-anonymization token map** (token → real value) *is* saved to `localStorage` so the AI reply can be decoded after a reload — it stays on the device, is never sent anywhere, is overwritten on a new document, and can be wiped with **Temizle**. On a shared/public computer the user should clear it when done. |
| De-anonymization map sent to AI | The map is never embedded in the prompt; the token legend is explicitly not copied with "Copy prompt". |
| Detection report mishandling | Export is user-initiated, warns that it contains real PII, and is a local file only. |
| Incomplete masking → leak to AI | Pre-send "final check" panel shows masked types, flags **open (kept) data**, low-confidence detections, and un-OCR'd pages; persistent reminder to review before copying. |
| Hash linkage across sessions | HMAC-SHA-256 with a **per-session random salt** (32 bytes); same input yields different hashes across sessions. |
| Clickjacking / injection | `object-src 'none'`, `base-uri 'none'`, `referrer no-referrer`; output rendered via DOM text nodes / escaped HTML (no `innerHTML` of user content). |

## 7. Residual risks (honest)

These remain and must be managed by the user:

1. **Detection is rule-based and imperfect.** A novel or unusually-formatted identifier can be missed. Independent holdout testing puts masking-coverage recall around ~99.5% on 50 diverse synthetic documents (independent holdout) — high, but not 100%.
2. **Narrative re-identification.** Even with all identifiers masked, the facts of a case can identify the parties. Perde cannot mask the story.
3. **AI provider exposure.** Once the user pastes text into an external AI, that provider's policies apply. Perde's guarantee ends at the copy step.
4. **AI hallucination.** Prompts reduce but do not eliminate fabricated case law / citations; all output must be verified.
5. **Device/browser compromise.** Out of Perde's control.

## 8. Security properties summary

- **No outbound content:** enforced by design + CSP.
- **Minimal persistence:** no cookies; the document text is never stored. Only the de-anon token map is saved to `localStorage` (this device only, never sent anywhere, clearable with Temizle).
- **No third parties:** self-hosted libraries, no CDN/analytics/trackers.
- **Open source & tested:** 2247 unit tests, a co-developed benchmark, and an independent holdout set, all gated in CI.

For the user-facing summary in Turkish, see [gizlilik.html](gizlilik.html). For the code, see the repository.
