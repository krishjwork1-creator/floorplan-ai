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

# --- 3. SMART MODEL SELECTION ---
def get_working_model():
    """
    Finds a model that ACTUALLY exists on your server.
    """
    try:
        print("🔍 Scanning available AI models...")
        # Get all models that support generating content
        all_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        
        # Priority: Flash (Speed) -> Pro 1.5 (Quality) -> Pro 1.0 (Reliability)
        preferences = [
            "models/gemini-1.5-flash",
            "models/gemini-1.5-flash-latest",
            "models/gemini-1.5-flash-001",
            "models/gemini-1.5-pro",
            "models/gemini-1.5-pro-latest",
            "models/gemini-pro"
        ]

        # 1. Check for preferred models
        for pref in preferences:
            if pref in all_models:
                print(f"✅ FOUND PREFERRED MODEL: {pref}")
                return pref
        
        # 2. Fallback to ANY model that looks like 'gemini'
        for m in all_models:
            if "gemini" in m:
                print(f"⚠️ Preferred not found. Using fallback: {m}")
                return m
                
        # 3. Last resort
        return "models/gemini-pro"
            
    except Exception as e:
        print(f"⚠️ Model scan failed: {e}. Defaulting to gemini-pro")
        return "models/gemini-pro"

# Select the model ONCE at startup
MODEL_NAME = get_working_model()
print(f"🚀 SERVER STARTED USING MODEL: {MODEL_NAME}")

# --- 4. ROBUST JSON CLEANER (The Fix) ---
def clean_json_response(text):
    """
    Extracts purely the JSON list [...] from the text.
    Ignores Markdown (```json), warnings, or intro text.
    """
    try:
        # Remove standard markdown code blocks first
        text = re.sub(r"```json|```", "", text).strip()
        
        # 1. Try to find the first '[' and the last ']' (Array)
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            return match.group(0)
        
        # 2. If no array found, try to find object '{...}'
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return match.group(0)
            
        return text # Return original if regex fails (let json.loads try it)
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
        # Lower safety settings to prevent blocking
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]

        # Use more tokens to prevent "Unterminated string" (cutting off JSON)
        model = genai.GenerativeModel(
            MODEL_NAME, 
            safety_settings=safety_settings,
            generation_config={"temperature": 0.2, "top_p": 0.8, "max_output_tokens": 8192} 
        )
        
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        prompt = """
        Analyze this floor plan image. Extract all walls as a JSON list.
        Coordinate System: 0,0 is top-left. Scale roughly 0-10 units.
        
        Output ONLY a valid JSON list. Do not add markdown blocks. Do not add comments.
        Example Format:
        [
          {"start": [0, 0], "end": [5, 0], "thickness": 0.2, "height": 3, "texture": "concrete", "color": "white"}
        ]
        """
        
        response = model.generate_content([prompt, image])
        
        # Debug Log: See exactly what the AI sent
        print(f"🤖 AI Response (First 100 chars): {response.text[:100]}...")

        # Clean and Parse
        cleaned_json = clean_json_response(response.text)
        return {"walls": json.loads(cleaned_json)}

    except json.JSONDecodeError as e:
        print(f"❌ JSON Parse Error: {e}")
        # Return empty list to prevent frontend crash
        return {"walls": []}
    except Exception as e:
        print(f"❌ General Error: {e}")
        return {"walls": []}

@app.post("/edit")
async def edit_walls(request: EditRequest):
    print(f"⚡ Editing with {MODEL_NAME}...")

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        
        chat_content = f"Current JSON: {json.dumps(request.current_walls)}\nUser Command: {request.prompt}"
        response = model.generate_content([
            "Return ONLY updated JSON list. Maintain schema. No markdown.", 
            chat_content
        ])
        
        cleaned_json = clean_json_response(response.text)
        return {"walls": json.loads(cleaned_json)}

    except Exception as e:
        print(f"❌ Error processing edit: {e}")
        return {"walls": request.current_walls}