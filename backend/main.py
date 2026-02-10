from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from PIL import Image
import io
import json
import os
import re
from dotenv import load_dotenv

# --- 1. SETUP ---
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("⚠️ WARNING: GEMINI_API_KEY is missing!")
else:
    genai.configure(api_key=API_KEY)

app = FastAPI()

# --- 2. CORS (Allow Frontend Access) ---
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

# --- 3. SMART MODEL SELECTION ---
def get_working_model():
    """Finds a valid model to prevent 404 errors."""
    try:
        print("🔍 Scanning available AI models...")
        all_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        
        preferences = [
            "models/gemini-1.5-flash",
            "models/gemini-1.5-flash-001",
            "models/gemini-1.5-pro",
            "models/gemini-pro"
        ]

        for pref in preferences:
            if pref in all_models:
                print(f"✅ FOUND PREFERRED MODEL: {pref}")
                return pref
        
        return "models/gemini-pro" # Fallback
            
    except Exception as e:
        print(f"⚠️ Model scan failed: {e}. Defaulting to gemini-pro")
        return "models/gemini-pro"

MODEL_NAME = get_working_model()

# --- 4. ROBUST JSON PARSER ---
def clean_json_response(text):
    """Extracts JSON list [...] from text to prevent crashes."""
    try:
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match: return match.group(0)
        return text
    except: return text

# --- 5. ENDPOINTS ---
@app.get("/")
def health_check():
    return {"status": "online", "model": MODEL_NAME}

class EditRequest(BaseModel):
    prompt: str
    current_walls: list

@app.post("/upload")
async def upload_plan(file: UploadFile = File(...)):
    print(f"📂 Processing Upload with {MODEL_NAME}...") 
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        prompt = """
        Analyze this floor plan image. Extract all walls as a JSON list.
        Coordinate System: 0,0 is top-left. Scale roughly 0-10 units.
        JSON Format:
        [{"start": [x1, y1], "end": [x2, y2], "thickness": 0.2, "height": 3, "texture": "brick|wood|concrete", "color": "white"}]
        Return ONLY the raw JSON.
        """
        response = model.generate_content([prompt, image])
        cleaned_json = clean_json_response(response.text)
        return {"walls": json.loads(cleaned_json)}

    except Exception as e:
        print(f"❌ Error: {e}")
        return {"walls": []}

@app.post("/edit")
async def edit_walls(request: EditRequest):
    print(f"⚡ Editing with {MODEL_NAME}...")
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        chat_content = f"Current JSON: {json.dumps(request.current_walls)}\nUser Command: {request.prompt}"
        response = model.generate_content(["Return ONLY updated JSON list.", chat_content])
        cleaned_json = clean_json_response(response.text)
        return {"walls": json.loads(cleaned_json)}
    except Exception as e:
        print(f"❌ Edit Error: {e}")
        return {"walls": request.current_walls}