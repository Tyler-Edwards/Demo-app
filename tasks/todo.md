# Invoice Email Agent — Plan

## Goal
Local LLM-only app that connects to Gmail (read-only), triages emails, and extracts invoice amount + due date.

## Checklist
- [x] Scaffold Next.js app with Tailwind
- [x] Gmail OAuth connect / disconnect flow
- [x] Fetch & decode email messages (and PDF attachments when present)
- [x] Convert agent to LLM-only triage + extraction
- [x] Require OPENAI_API_KEY or OLLAMA_BASE_URL for scans
- [x] Results UI (amount + due date)
- [x] `.env.example` + README setup
- [x] Demo mode (still LLM-backed)
- [x] Verify build / lint / mocked agent test
- [x] Add OpenAI key to `.env.local` (not committed)
- [x] Expand demo corpus to exactly 20 triage emails
- [x] Create + run `scripts/run-20-emails.mjs` against real OpenAI
- [x] Document run results below

## Review
- Heuristic extractors removed
- Scan API returns 400 if no LLM configured
- UI blocks scan until LLM env is set
- Demo corpus is 20 emails; scan/demo path uses `DEMO_EMAILS` in full
- LLM confidence normalized when models return 0–100

## 20-email OpenAI run (gpt-4o-mini)

- Scanned: 20
- Classified as invoices: **10**
- Rejected (receipts / personal / noise): **10**
- Command: `npm run run:20-emails`

### Invoices found
| Vendor | Amount | Due date |
| --- | --- | --- |
| Northwind Supplies | GBP 1240.5 | 2026-07-31 |
| Amazon Web Services | USD 312.88 | 2026-07-20 |
| Cloudhost Ltd | EUR 890 | 2026-07-16 |
| Stripe, Inc. | USD 1499 | 2026-08-01 |
| Spotify | EUR 240 | 2026-07-23 |
| Harcourt & Co | GBP 3200 | 2026-07-28 |
| Slack Technologies | USD 860 | 2026-08-05 |
| Maya Chen | EUR 1750 | 2026-07-30 |
| GitHub, Inc. | USD 210 | 2026-07-26 |
| Apex Advisory | USD 4500 | 2026-08-12 |

**Security:** rotate the OpenAI API key that was pasted into chat / `.env.local`.
