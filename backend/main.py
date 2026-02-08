from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from PIL import Image
import io
import json
import os
from dotenv import load_dotenv

# --- 1. SETUP & SAFETY CHECKS ---
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("⚠️ WARNING: GEMINI_API_KEY is missing!")
else:
    genai.configure(api_key=API_KEY)

app = FastAPI()

# --- 2. CORS CONFIGURATION (THE FIX) ---
# We must explicitly list your frontend URL to allow credentials
origins = [
    "http://localhost:5173",                     # Your local machine
    "https://floorplan-ai-seven.vercel.app",     # Your Vercel Website
    "https://floorplan-ai-seven.vercel.app/"     # Vercel with trailing slash
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # <--- CHANGED from ["*"] to explicit list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. HEALTH CHECK ---
@app.get("/")
def health_check():
    return {"status": "online", "key_loaded": bool(API_KEY)}

class EditRequest(BaseModel):
    prompt: str
    current_walls: list

# Initialize AI Model
try:
    model = genai.GenerativeModel("gemini-1.5-flash", generation_config={
        "temperature": 0.2,
        "response_mime_type": "application/json"
    })
except Exception as e:
    model = None
    print(f"⚠️ Model init failed: {e}")

# --- 4. ENDPOINTS ---
@app.post("/upload")
async def upload_plan(file: UploadFile = File(...)):
    print(f"📂 Endpoint hit! Receiving file: {file.filename}") # Debug Log
    
    if not model: 
        raise HTTPException(500, "AI Model not initialized")
    
    try:
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
        return {"walls": json.loads(response.text)}
    except Exception as e:
        print(f"❌ Error processing upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/edit")
async def edit_walls(request: EditRequest):
    print(f"⚡ Endpoint hit! Command: {request.prompt}")
    
    if not model: 
        raise HTTPException(500, "AI Model not initialized")

    try:
        chat_content = f"Current JSON: {json.dumps(request.current_walls)}\nUser Command: {request.prompt}"
        response = model.generate_content([
            "Return ONLY updated JSON list. Maintain schema.", 
            chat_content
        ])
        cleaned_text = response.text.strip()
        if cleaned_text.startswith("```json"): cleaned_text = cleaned_text[7:-3]
        return {"walls": json.loads(cleaned_text)}
    except Exception as e:
        print(f"❌ Error processing edit: {e}")
        return {"walls": request.current_walls}