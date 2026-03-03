from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    text: str


class ChatRequest(BaseModel):
    message: str
    timezone: str | None = None  # IANA e.g. "America/New_York" for local spike times
    history: list[ChatMessage] = []  # previous turns for context (user/assistant)
    timeline_summary: str | None = None  # MPS timeline (4 slots) for context


class ChatResponse(BaseModel):
    reply: str
