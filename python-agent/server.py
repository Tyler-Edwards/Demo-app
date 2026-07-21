from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from agent import run_invoice_agent

app = FastAPI()


class TriageRequest(BaseModel):
    emails: list[dict[str, Any]]
    source: str
    userEmail: str | None = None


@app.post("/triage")
def triage(request: TriageRequest) -> dict[str, list[dict[str, Any]]]:
    try:
        invoices = run_invoice_agent(
            request.emails,
            request.source,
            request.userEmail,
        )
        return {"invoices": invoices}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
