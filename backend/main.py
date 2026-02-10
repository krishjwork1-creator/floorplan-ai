from fastapi import FastAPI, UploadFile, File
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

app = FastAPI()

# --- 2. CORS (Trust your Vercel App) ---
# We allow ALL origins (*) to rule out any connection blocking
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. ROBUST JSON SURGEON ---
def extract_json(text):
    """
    Finds the JSON list [...] hidden inside the AI's text.
    """
    try:
        # Remove markdown code blocks (common cause of crashes)
        text = re.sub(r"```json|```", "", text).strip()
        
        # Regex to find the first '[' and the last ']'
        match = re.search(r'\[.*\]', text, re.DOTALL)
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
    print(f"📂 Processing Upload...")
    
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Priority List: Try these models in order.
        # If one fails (404), it will catch the error and try the next.
        models_to_try = [
            "gemini-1.5-flash",     # Fast & New
            "gemini-1.5-pro",       # High Quality
            "gemini-pro",           # Old Reliable (Almost always works)
            "gemini-1.0-pro"        # Backup
        ]
        
        prompt = """
        Analyze this floor plan. Return a JSON list of walls.
        Format: [{"start": [x1, y1], "end": [x2, y2], "thickness": 0.2, "height": 3, "texture": "concrete", "color": "white"}]
        Coordinate System: 0,0 is top-left. Scale: 0-10.
        IMPORTANT: Return ONLY raw JSON. No markdown.
        """
        
        last_error = None

        # --- THE SAFETY LOOP ---
        for model_name in models_to_try:
            try:
                print(f"🔄 Attempting with model: {model_name}...")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content([prompt, image])
                
                # If we get here, it worked!
                print(f"✅ SUCCESS with {model_name}")
                clean_text = extract_json(response.text)
                return {"walls": json.loads(clean_text)}
                
            except Exception as e:
                print(f"⚠️ Failed with {model_name}: {e}")
                last_error = e
                continue # Try the next model in the list
        
        # If ALL models fail, return empty list (Don't crash!)
        print("❌ All models failed.")
        return {"walls": []}

    except Exception as e:
        print(f"❌ Critical Error: {e}")
        return {"walls": []} # Return empty list (Don't crash!)

@app.post("/edit")
async def edit_walls(request: EditRequest):
    return {"walls": request.current_walls} # Placeholder to prevent edit crashes