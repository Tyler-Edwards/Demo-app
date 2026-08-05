import json
import os
import re
from datetime import datetime
from typing import Any

import overmind
from overmind import capture_exception, entry_point, observe
from openai import OpenAI
from pydantic import BaseModel, Field, ValidationError

overmind.init(
    service_name="ledgerline-invoice-triage",
    providers=["openai"],
    agent_name="Ledgerline Invoice Triage Agent",
    agent_id="1ab9c3b2-1852-476d-b9f9-eb9752474934",
)

SYSTEM_PROMPT = """You are Ledgerline, an accounting invoice triage agent.
You ONLY decide from email content whether the message is a payable invoice / bill for accounting, and extract structured fields.

Rules:
- isInvoice=true only for unpaid/payable invoices, bills, or statements with an amount owed.
- isInvoice=false for receipts already paid, marketing, newsletters, personal chat, shipping notices without a bill, and unrelated mail.
- amount must be the total amount due (number only, no currency symbols).
- currency must be an ISO code like USD, GBP, EUR when known.
- dueDate must be YYYY-MM-DD when known, else null.
- Prefer explicit "amount due" / "total" / "balance due" over subtotals or tax lines.
- If uncertain, lower confidence and set isInvoice=false unless evidence is strong.
- confidence must be a number between 0 and 1 (not a percentage).
- Return JSON only. No markdown."""


class LlmExtraction(BaseModel):
    isInvoice: bool
    vendor: str | None = None
    amount: float | None = None
    currency: str | None = None
    dueDate: str | None = None
    invoiceNumber: str | None = None
    summary: str | None = None
    confidence: float = Field(ge=0, le=1)


def require_llm_configured() -> None:
    if os.environ.get("OVERMIND_API_KEY") or os.environ.get("OLLAMA_BASE_URL"):
        return
    raise ValueError(
        "LLM is required. Set OVERMIND_API_KEY (or OLLAMA_BASE_URL for a local model) in .env.local, then restart the app."
    )


def get_openai_client() -> tuple[OpenAI, str]:
    require_llm_configured()

    if os.environ.get("OVERMIND_API_KEY"):
        client = OpenAI(
            api_key=os.environ["OVERMIND_API_KEY"],
            base_url="https://api.overmindlab.ai/api/v1",
        )
        model = os.environ.get("OPENAI_MODEL", "ft-3a2787fa-qwen2-5-coder-32b-instruct")
        return client, model

    base = (os.environ.get("OLLAMA_BASE_URL") or "http://127.0.0.1:11434").rstrip("/")
    client = OpenAI(base_url=f"{base}/v1", api_key="ollama")
    model = os.environ.get("OLLAMA_MODEL", "llama3.2")
    return client, model


def extract_json_object(content: str) -> dict[str, Any]:
    trimmed = content.strip()
    if trimmed.startswith("{") and trimmed.endswith("}"):
        return json.loads(trimmed)

    match = re.search(r"\{[\s\S]*\}", trimmed)
    if not match:
        raise ValueError("LLM did not return JSON.")
    return json.loads(match.group(0))


def to_gmail_url(email_id: str, source: str) -> str:
    if source == "demo":
        return "#"
    return f"https://mail.google.com/mail/u/0/#inbox/{email_id}"


@observe("analyze_email_with_llm")
def analyze_email_with_llm(input: dict[str, str]) -> dict[str, Any]:
    client, model = get_openai_client()

    user_prompt = f"""Analyze this email for accounting invoice triage.

Return ONLY valid JSON with exactly these keys:
{{
  "isInvoice": boolean,
  "vendor": string|null,
  "amount": number|null,
  "currency": string|null,
  "dueDate": "YYYY-MM-DD"|null,
  "invoiceNumber": string|null,
  "summary": string|null,
  "confidence": number
}}

Email date: {input["date"]}
Email subject: {input["subject"]}
From: {input["from"]}
Body / attachments text:
{input["text"][:10000]}"""

    try:
        response = client.chat.completions.create(
            model=model,
            temperature=0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        capture_exception(exc)
        raise

    content = response.choices[0].message.content
    if not content:
        raise ValueError("LLM returned an empty response.")

    parsed = extract_json_object(content)

    if isinstance(parsed.get("confidence"), (int, float)) and parsed["confidence"] > 1:
        parsed["confidence"] = min(parsed["confidence"] / 100, 1)

    try:
        result = LlmExtraction.model_validate(parsed)
    except ValidationError as exc:
        raise ValueError(f"LLM returned invalid invoice JSON: {exc}") from exc

    return result.model_dump()


def to_iso_date(date_str: str) -> str:
    if "T" in date_str:
        return date_str
    return datetime.fromisoformat(date_str.replace("Z", "+00:00")).isoformat()


@observe("analyze_email")
def analyze_email(email: dict[str, Any], source: str) -> dict[str, Any] | None:
    combined_text = "\n".join(
        part
        for part in [
            email.get("subject"),
            email.get("snippet"),
            email.get("bodyText"),
            *(email.get("attachmentTexts") or []),
        ]
        if part
    )

    llm = analyze_email_with_llm(
        {
            "subject": email["subject"],
            "from": email["from"],
            "date": email["date"],
            "text": combined_text,
        }
    )

    if not llm["isInvoice"]:
        return None

    amount = llm.get("amount")
    currency = llm.get("currency") or "USD"

    return {
        "id": f"{source}-{email['id']}",
        "emailId": email["id"],
        "threadId": email.get("threadId") or None,
        "subject": email["subject"],
        "from": email["from"],
        "vendor": llm.get("vendor") or "Unknown vendor",
        "receivedAt": to_iso_date(email["date"]),
        "amount": (
            {
                "value": amount,
                "currency": currency,
                "raw": f"{currency} {amount}",
            }
            if amount is not None
            else None
        ),
        "dueDate": llm.get("dueDate"),
        "invoiceNumber": llm.get("invoiceNumber"),
        "confidence": round(float(llm["confidence"]), 2),
        "summary": llm.get("summary") or email.get("snippet") or email["subject"],
        "gmailUrl": to_gmail_url(email["id"], source),
        "source": source,
    }


@entry_point("Ledgerline Invoice Triage Agent")
def run_invoice_agent(
    emails: list[dict[str, Any]],
    source: str,
    user_email: str | None = None,
) -> list[dict[str, Any]]:
    if user_email:
        overmind.set_user(str(user_email))

    require_llm_configured()

    invoices: list[dict[str, Any]] = []
    for email in emails:
        record = analyze_email(email, source)
        if record:
            invoices.append(record)

    invoices.sort(key=lambda item: item.get("dueDate") or "9999-12-31")
    return invoices
