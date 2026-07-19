import type { RawEmail } from "@/lib/gmail";

export const DEMO_EMAILS: RawEmail[] = [
  {
    id: "demo-1",
    threadId: "demo-thread-1",
    subject: "Invoice #INV-1042 from Northwind Supplies",
    from: "billing@northwind.example <billing@northwind.example>",
    date: "Fri, 10 Jul 2026 09:14:00 +0000",
    snippet: "Please find attached invoice INV-1042 for £1,240.50 due 31 July 2026.",
    bodyText: `
Hello,

Please find invoice INV-1042 for office supplies.

Total Amount Due: £1,240.50
Payment Due Date: 31 July 2026
Invoice Number: INV-1042

Kind regards,
Northwind Supplies Billing
`,
    attachmentTexts: [],
  },
  {
    id: "demo-2",
    threadId: "demo-thread-2",
    subject: "Your AWS Invoice is available",
    from: "Amazon Web Services <no-reply@amazon.com>",
    date: "Mon, 06 Jul 2026 12:00:00 +0000",
    snippet: "Your payment of $312.88 will be charged on July 20, 2026.",
    bodyText: `
Amazon Web Services
Invoice Summary

Account: demo-account
Amount due: $312.88 USD
Due date: July 20, 2026
Invoice ID: 123456789

Thank you for your business.
`,
    attachmentTexts: [],
  },
  {
    id: "demo-3",
    threadId: "demo-thread-3",
    subject: "Team lunch next Friday?",
    from: "alex@company.example",
    date: "Wed, 08 Jul 2026 15:22:00 +0000",
    snippet: "Want to grab lunch with the team next Friday?",
    bodyText: "Want to grab lunch with the team next Friday? No rush either way.",
    attachmentTexts: [],
  },
  {
    id: "demo-4",
    threadId: "demo-thread-4",
    subject: "Receipt for your Figma subscription",
    from: "Figma <receipts@figma.com>",
    date: "Tue, 01 Jul 2026 08:00:00 +0000",
    snippet: "You paid $45.00 for Figma Professional.",
    bodyText: `
Receipt

Figma Professional — Monthly
Amount paid: $45.00
Date paid: July 1, 2026
Thank you for your payment.
`,
    attachmentTexts: [],
  },
  {
    id: "demo-5",
    threadId: "demo-thread-5",
    subject: "Invoice 7781 — Cloudhost Ltd",
    from: "accounts@cloudhost.example",
    date: "Thu, 02 Jul 2026 11:45:00 +0000",
    snippet: "Invoice 7781 for EUR 890.00 due within 14 days.",
    bodyText: `
Cloudhost Ltd

INVOICE 7781
Bill To: Demo Co

Subtotal: EUR 890.00
VAT: EUR 0.00
Total: EUR 890.00

Due Date: 16/07/2026
Please pay by bank transfer.
`,
    attachmentTexts: [
      "INVOICE 7781\nTotal Due: EUR 890.00\nPayment due by 16/07/2026\n",
    ],
  },
  {
    id: "demo-6",
    threadId: "demo-thread-6",
    subject: "Invoice from Stripe — INV-28419",
    from: "Stripe Billing <invoices@stripe.com>",
    date: "Sun, 05 Jul 2026 16:30:00 +0000",
    snippet: "Invoice INV-28419 for $1,499.00 due August 1, 2026.",
    bodyText: `
Stripe, Inc.

TAX INVOICE
Invoice number: INV-28419
Bill to: Ledgerline Demo

Amount due: $1,499.00 USD
Due date: August 1, 2026

Pay online or by ACH.
`,
    attachmentTexts: [],
  },
  {
    id: "demo-7",
    threadId: "demo-thread-7",
    subject: "Your Adobe Creative Cloud receipt",
    from: "Adobe <noreply@adobe.com>",
    date: "Sat, 04 Jul 2026 07:12:00 +0000",
    snippet: "Payment received: $59.99",
    bodyText: `
Adobe Receipt

Creative Cloud All Apps
Amount charged: $59.99
Payment date: July 4, 2026
Status: Paid in full

This is not a bill. No further action needed.
`,
    attachmentTexts: [],
  },
  {
    id: "demo-8",
    threadId: "demo-thread-8",
    subject: "Birthday dinner plans?",
    from: "sam@friends.example",
    date: "Fri, 03 Jul 2026 19:05:00 +0000",
    snippet: "Are you free for dinner on the 25th?",
    bodyText: `
Hey!

Are you free for birthday dinner on the 25th? Thinking Italian.

No invoices here — just life.
`,
    attachmentTexts: [],
  },
  {
    id: "demo-9",
    threadId: "demo-thread-9",
    subject: "Spotify for Business — Invoice SP-9021",
    from: "Spotify Billing <billing@spotify.com>",
    date: "Thu, 09 Jul 2026 10:00:00 +0000",
    snippet: "Invoice SP-9021 — €240.00 due 23 July 2026",
    bodyText: `
Spotify for Business

INVOICE SP-9021
Plan: Premium Team (10 seats)

Total amount due: €240.00
Payment due date: 23 July 2026

Please settle by the due date to avoid service interruption.
`,
    attachmentTexts: [],
  },
  {
    id: "demo-10",
    threadId: "demo-thread-10",
    subject: "This week in product: changelog digest",
    from: "Product Weekly <digest@newsletter.example>",
    date: "Mon, 13 Jul 2026 06:00:00 +0000",
    snippet: "Five launches worth knowing about",
    bodyText: `
Product Weekly

1. Dark mode polish
2. Faster exports
3. New shortcuts

Unsubscribe anytime. This is a marketing newsletter, not a bill.
`,
    attachmentTexts: [],
  },
  {
    id: "demo-11",
    threadId: "demo-thread-11",
    subject: "Legal services invoice — Harcourt & Co",
    from: "accounts@harcourt-legal.example",
    date: "Tue, 07 Jul 2026 14:18:00 +0000",
    snippet: "Invoice HC-441 for £3,200.00 — see attached PDF.",
    bodyText: `
Dear Client,

Please find our invoice for June legal services attached.

Regards,
Harcourt & Co Accounts
`,
    attachmentTexts: [
      `
HARCOURT & CO
TAX INVOICE HC-441

Professional services — June 2026
Amount due: £3,200.00 GBP
Due date: 28 July 2026
Bank transfer preferred.
`,
    ],
  },
  {
    id: "demo-12",
    threadId: "demo-thread-12",
    subject: "Your Uber trip receipt",
    from: "Uber Receipts <receipts@uber.com>",
    date: "Wed, 15 Jul 2026 22:41:00 +0000",
    snippet: "You paid $18.40 for your trip.",
    bodyText: `
Uber Receipt

Trip completed
Total charged: $18.40
Paid with Visa •••• 4242
Date: July 15, 2026

This receipt confirms payment already taken.
`,
    attachmentTexts: [],
  },
  {
    id: "demo-13",
    threadId: "demo-thread-13",
    subject: "Slack invoice ready — SI-77820",
    from: "Slack Billing <billing@slack.com>",
    date: "Fri, 17 Jul 2026 11:05:00 +0000",
    snippet: "Your Slack invoice SI-77820 is $860.00 due Aug 5, 2026.",
    bodyText: `
Slack Technologies

Invoice SI-77820
Workspace: ledgerline-demo

Balance due: USD 860.00
Due date: August 5, 2026

Please remit payment by the due date.
`,
    attachmentTexts: [],
  },
  {
    id: "demo-14",
    threadId: "demo-thread-14",
    subject: "Your package has shipped",
    from: "ShopFast Shipping <ship@shopfast.example>",
    date: "Sat, 11 Jul 2026 13:33:00 +0000",
    snippet: "Tracking number SF-991122",
    bodyText: `
Good news — your order shipped.

Tracking: SF-991122
Estimated delivery: July 14, 2026

No payment is due. This is a shipping notice only.
`,
    attachmentTexts: [],
  },
  {
    id: "demo-15",
    threadId: "demo-thread-15",
    subject: "Freelance design invoice — FD-318",
    from: "Maya Chen <maya@studio.example>",
    date: "Mon, 14 Jul 2026 09:40:00 +0000",
    snippet: "Invoice FD-318 for €1,750.00 due 30 July 2026",
    bodyText: `
Hi team,

Invoice for brand refresh work:

Invoice #: FD-318
Total due: EUR 1,750.00
Due: 30 July 2026

Wire details in the signature.
Thanks,
Maya
`,
    attachmentTexts: [],
  },
  {
    id: "demo-16",
    threadId: "demo-thread-16",
    subject: "GitHub invoice #GH-55201",
    from: "GitHub Billing <billing@github.com>",
    date: "Sun, 12 Jul 2026 08:20:00 +0000",
    snippet: "Invoice GH-55201 — $210.00 due July 26, 2026",
    bodyText: `
GitHub, Inc.

INVOICE GH-55201
Organization: ledgerline-demo

Amount due: $210.00 USD
Payment due by: July 26, 2026

Thank you for using GitHub.
`,
    attachmentTexts: [],
  },
  {
    id: "demo-17",
    threadId: "demo-thread-17",
    subject: "Coffee catch-up tomorrow?",
    from: "jordan@company.example",
    date: "Tue, 14 Jul 2026 17:55:00 +0000",
    snippet: "Free at 10am for a quick coffee?",
    bodyText: "Free at 10am tomorrow for a quick coffee? No agenda — just catch up.",
    attachmentTexts: [],
  },
  {
    id: "demo-18",
    threadId: "demo-thread-18",
    subject: "Payment confirmation — Northern Power",
    from: "Northern Power <receipts@northernpower.example>",
    date: "Thu, 16 Jul 2026 07:48:00 +0000",
    snippet: "We received your payment of £86.12",
    bodyText: `
Northern Power — Payment Receipt

Account: 44002119
Amount paid: £86.12
Payment date: 16 July 2026
Status: Settled

Thank you. This confirms a completed payment; nothing further is owed.
`,
    attachmentTexts: [],
  },
  {
    id: "demo-19",
    threadId: "demo-thread-19",
    subject: "Consulting invoice attached — Apex Advisory",
    from: "billing@apex-advisory.example",
    date: "Wed, 08 Jul 2026 12:10:00 +0000",
    snippet: "Please see attached invoice AA-909 for $4,500.00.",
    bodyText: `
Hello,

Attached is our consulting invoice for Q2 strategy work.

Please arrange payment by the due date on the PDF.

— Apex Advisory Billing
`,
    attachmentTexts: [
      `
APEX ADVISORY LLC
INVOICE AA-909

Consulting services — Q2 2026
Total amount due: $4,500.00 USD
Due date: August 12, 2026
Net 30 terms.
`,
    ],
  },
  {
    id: "demo-20",
    threadId: "demo-thread-20",
    subject: "Weekend hiking photos",
    from: "chris@personal.example",
    date: "Sun, 05 Jul 2026 20:15:00 +0000",
    snippet: "Here are a few shots from the trail.",
    bodyText: `
Attached (not really) some hiking photos from the weekend.

Hope you had a good one — talk soon!
`,
    attachmentTexts: [],
  },
];
