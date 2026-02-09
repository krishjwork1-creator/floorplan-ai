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

# --- 2. CORS (Trust your Vercel App) ---
origins = [
    "http://localhost:5173",
    "https://floorplan-ai-seven.vercel.app",
    "https://floorplan-ai-seven.vercel.app/" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. MODEL CONFIGURATION ---
# We use the SPECIFIC stable version to avoid 404s and 500s.
# We do NOT use "gemini-1.5-flash" (alias) because it sometimes points to v1beta.
MODEL_NAME = "gemini-1.5-flash-001"

generation_config = {
    "temperature": 0.2,
    "top_p": 0.8,
    "max_output_tokens": 8192,
    "response_mime_type": "application/json", # Force JSON mode
}

# --- 4. ROBUST CLEANER (The Safety Net) ---
def clean_json_response(text):
    """
    Finds the JSON list [...] inside the text, ignoring mistakes.
    """
    try:
        # 1. Regex to find the JSON array [...]
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            return match.group(0)
        return text
    except Exception:
        return text

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
        model = genai.GenerativeModel(MODEL_NAME, generation_config=generation_config)
        
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
        
        # Double-Safety: Clean it -> Parse it
        cleaned_json = clean_json_response(response.text)
        return {"walls": json.loads(cleaned_json)}

    except Exception as e:
        print(f"❌ Error: {e}")
        # Log the bad text so we can see it in Render logs if it happens again
        if 'response' in locals():
            print(f"Bad JSON Text: {response.text}")
        return {"walls": []} # Return empty list instead of crashing

@app.post("/edit")
async def edit_walls(request: EditRequest):
    print(f"⚡ Editing with {MODEL_NAME}...")

    try:
        model = genai.GenerativeModel(MODEL_NAME, generation_config=generation_config)
        
        chat_content = f"Current JSON: {json.dumps(request.current_walls)}\nUser Command: {request.prompt}"
        response = model.generate_content([
            "Return ONLY updated JSON list. Maintain schema.", 
            chat_content
        ])
        
        cleaned_json = clean_json_response(response.text)
        return {"walls": json.loads(cleaned_json)}

    except Exception as e:
        print(f"❌ Edit Error: {e}")
        return {"walls": request.current_walls}