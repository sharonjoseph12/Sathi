from dotenv import load_dotenv
import os as _os
# Load backend/.env if present, else fall back to repo-root ../.env so `uvicorn
# app.main:app` run from backend/ still picks up GEMINI/GROQ keys for demos.
load_dotenv()
_root_env = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))), ".env")
if _os.path.exists(_root_env):
    load_dotenv(_root_env, override=False)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import router

app = FastAPI(title="Sathi API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to Sathi API"}
