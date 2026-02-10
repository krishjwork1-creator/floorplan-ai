from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import json

from processor import process_image  # 👈 OpenCV pipeline

# ---------------- SETUP ----------------
load_dotenv()

app = FastAPI()

origins = [
    "http://localhost:5173",
    "https://floorplan-ai-cgs8.onrender.com",
    "https://floorplan-ai-cgs8.onrender.com/"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- ROUTES ----------------
@app.get("/")
def health():
    return {"status": "online", "engine": "opencv"}

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        walls = process_image(contents)

        if not walls:
            return {"walls": []}

        return {"walls": walls}

    except Exception as e:
        print("❌ Upload error:", e)
        raise HTTPException(status_code=500, detail="Image processing failed")
