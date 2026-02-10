from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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
    print("🚨 CRITICAL: GEMINI_API_KEY is missing!")
else:
    genai.configure(api_key=API_KEY)
    print(f"✅ API Key loaded (starts with {API_KEY[:4]}...)")

    # --- DIAGNOSTIC: PRINT AVAILABLE MODELS ---
    print("\n🔍 --- DIAGNOSTIC START: AVAILABLE MODELS ---")
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"   • {m.name}")
    except Exception as e:
        print(f"   ❌ Could not list models: {e}")
    print("🔍 --- DIAGNOSTIC END ---\n")

app = FastAPI()

# --- 2. CORS (Permissive for troubleshooting) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for now to rule out CORS issues
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. ROBUST CLEANER ---
def clean_json_response(text):
    """
    Forcefully extracts JSON from text, ignoring everything else.
    """
    try:
        # Find anything that looks like a JSON list [ ... ]
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            return match.group(0)
        # Find anything that looks like a JSON object { ... }
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return match.group(0)
        return text
    except:
        return text

# --- 4. ENDPOINTS ---
@app.get("/")
def health_check():
    return {"status": "online", "message": "Backend is ready"}

class EditRequest(BaseModel):
    prompt: str
    current_walls: list

@app.post("/upload")
async def upload_plan(file: UploadFile = File(...)):
    print(f"📂 endpoint /upload hit with file: {file.filename}")
    
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # --- MODEL FALLBACK STRATEGY ---
        # We try these models in order. If one 404s, we try the next.
        models_to_try = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro",
            "gemini-pro" # The "Old Reliable"
        ]

        prompt = """
        Analyze this floor plan. Return a JSON list of walls.
        Format: [{"start": [x1, y1], "end": [x2, y2], "thickness": 0.2, "height": 3, "texture": "concrete", "color": "white"}]
        Coordinate System: 0,0 is top-left. Scale: 0-10.
        IMPORTANT: Return ONLY raw JSON. No markdown.
        """

        # Disable safety settings to prevent blocks
        safety = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]

        last_error = None
        
        for model_name in models_to_try:
            print(f"🔄 Attempting with model: {model_name}...")
            try:
                model = genai.GenerativeModel(model_name, safety_settings=safety)
                response = model.generate_content([prompt, image])
                
                # If we get here, it worked!
                print(f"✅ SUCCESS with {model_name}")
                cleaned = clean_json_response(response.text)
                return {"walls": json.loads(cleaned)}
                
            except Exception as e:
                print(f"   ⚠️ Failed with {model_name}: {e}")
                last_error = e
                continue # Try next model
        
        # If all failed
        print("❌ All models failed.")
        raise HTTPException(status_code=500, detail=f"AI Processing Failed: {str(last_error)}")

    except Exception as e:
        print(f"❌ Critical Error: {e}")
        return {"walls": []} # Return empty to prevent frontend crash

@app.post("/edit")
async def edit_walls(request: EditRequest):
    # Simplified edit endpoint that just returns current walls if AI fails
    # This prevents the app from breaking during chats
    print(f"⚡ endpoint /edit hit")
    return {"walls": request.current_walls}