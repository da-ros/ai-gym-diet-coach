from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .context.database import init_db
from .routes import meals, summary, chat, profile


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    os.makedirs("uploads", exist_ok=True)
    yield


app = FastAPI(
    title="CoachGymDiet API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://192.168.1.233:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meals.router, tags=["meals"])
app.include_router(summary.router, tags=["summary"])
app.include_router(chat.router, tags=["chat"])
app.include_router(profile.router, tags=["profile"])

# Serve uploaded meal photos
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok"}
