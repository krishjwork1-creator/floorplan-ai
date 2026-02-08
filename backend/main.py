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

# --- 3. ROBUST CONFIGURATION ---
# We use the standard Pro model which is most reliable.
# We REMOVED 'response_mime_type' to prevent 500 errors on unsupported models.
MODEL_NAME = "gemini-1.5-flash"

generation_config = {
    "temperature": 0.2,
    "top_p": 0.8,
    "max_output_tokens": 4096,
}

def clean_json_response(text):
    """
    Manually removes Markdown (```json ... ```) to prevent crashes.
    """
    cleaned = text.strip()
    # Remove markdown code blocks if present
    if "```" in cleaned:
        cleaned = re.sub(r"```json|```", "", cleaned).strip()
    return cleaned

# --- 4. ENDPOINTS ---
@app.get("/")
def health_check():
    return {"status": "online", "model": MODEL_NAME}

class EditRequest(BaseModel):
    prompt: str
    current_walls: list

@app.post("/upload")
async def upload_plan(file: UploadFile = File(...)):
    print(f"📂 Endpoint hit! Model: {MODEL_NAME}") 
    
    try:
        model = genai.GenerativeModel(MODEL_NAME, generation_config=generation_config)
        
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        prompt = """
        Analyze this floor plan image. Extract all walls as a JSON list.
        Coordinate System: 0,0 is top-left. Scale roughly 0-10 units.
        
        IMPORTANT: Output ONLY valid JSON. No text explanations.
        JSON Format:
        [{"start": [x1, y1], "end": [x2, y2], "thickness": 0.2, "height": 3, "texture": "brick|wood|concrete", "color": "white"}]
        """
        
        response = model.generate_content([prompt, image])
        
        # Robust Cleaning
        raw_text = response.text
        cleaned_json = clean_json_response(raw_text)
        
        return {"walls": json.loads(cleaned_json)}

    except Exception as e:
        print(f"❌ Error processing upload: {e}")
        # Return a dummy wall so the app doesn't crash, but show the error in logs
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

@app.post("/edit")
async def edit_walls(request: EditRequest):
    print(f"⚡ Endpoint hit!")

    try:
        model = genai.GenerativeModel(MODEL_NAME, generation_config=generation_config)
        
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