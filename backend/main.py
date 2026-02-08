from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from PIL import Image
import io
import json
import os
from dotenv import load_dotenv

# 1. Load Environment Variables
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("❌ GEMINI_API_KEY not found in .env file")

genai.configure(api_key=API_KEY)

# ... (imports remain the same)

app = FastAPI()

# --- FIX CORS ERROR ---
# We explicitly list the allowed frontend URLs
origins = [
    "http://localhost:5173",                      # Localhost (for testing)
    "https://floorplan-ai-seven.vercel.app",      # Your Vercel Frontend
    "https://floorplan-ai-seven.vercel.app/"      # Trailing slash variation
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Use the specific list instead of ["*"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ... (rest of the code remains the same)
# 3. Request Models
class EditRequest(BaseModel):
    prompt: str
    current_walls: list

# 4. Configuration for Speed (Flash Model + JSON Enforcement)
# "gemini-1.5-flash" is 10x faster than Pro for these tasks.
generation_config = {
    "temperature": 0.2,             # Low creativity = faster, more precise
    "top_p": 0.8,
    "max_output_tokens": 4096,
    "response_mime_type": "application/json", # FORCE JSON output
}

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash", 
    generation_config=generation_config
)

# --- ENDPOINT 1: UPLOAD FLOOR PLAN (Vision) ---
@app.post("/upload")
async def upload_plan(file: UploadFile = File(...)):
    print(f"📂 Received file: {file.filename}")
    
    try:
        # Read and prepare image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        # System Prompt for Vision
        prompt = """
        Analyze this floor plan image. 
        Extract all walls as a JSON list.
        
        Coordinate System:
        - 0,0 is top-left.
        - Scale roughly so the house width fits in 0-10 units.
        
        JSON Format:
        [
          {"start": [x1, y1], "end": [x2, y2], "thickness": 0.2, "height": 3, "texture": "brick|wood|concrete", "color": "white"}
        ]
        
        Return ONLY the raw JSON.
        """

        # Generate (Flash is fast enough for Vision too)
        response = model.generate_content([prompt, image])
        
        # Parse JSON
        walls_data = json.loads(response.text)
        print("✅ Vision processing complete.")
        return {"walls": walls_data}

    except Exception as e:
        print(f"❌ Error in /upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- ENDPOINT 2: EDIT EXISTING WALLS (Text Logic) ---
@app.post("/edit")
async def edit_walls(request: EditRequest):
    print(f"⚡ Editing Command: {request.prompt}")

    try:
        # Specialized Prompt for Editing
        system_instruction = """
        You are a real-time 3D architecture engine.
        Your goal is to modify the provided JSON wall data based on the User Command.
        
        Rules:
        1. Return ONLY the modified JSON list. No markdown, no text.
        2. Maintain the exact schema: {"start": [], "end": [], "thickness":, "height":, "texture":, "color":}
        3. If the user asks to change color/texture, apply it to RELEVANT walls (or all if unspecified).
        4. If the user asks to move/delete, modify the coordinates logic.
        """

        # Context: Current State + User Intent
        chat_content = f"""
        Current JSON: {json.dumps(request.current_walls)}
        User Command: {request.prompt}
        """

        # Generate Response (Async for concurrency)
        response = model.generate_content([system_instruction, chat_content])

        # Clean and Parse
        # Flash with 'application/json' config usually returns pure JSON, 
        # but we strip just in case.
        cleaned_text = response.text.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:-3]
            
        new_walls = json.loads(cleaned_text)
        
        print("✅ Edit complete.")
        return {"walls": new_walls}

    except Exception as e:
        print(f"❌ Error in /edit: {e}")
        # Fallback: return original walls to prevent frontend crash
        return {"walls": request.current_walls}

# Run with: uvicorn main:app --reload