from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import google.generativeai as genai
import json
from processor import process_image

# --- CONFIGURATION ---
API_KEY = "AIzaSyAHrI5zIwm3rxk7J2EoSwnXu0mRRNvKJwE" # <--- PASTE YOUR KEY HERE
genai.configure(api_key=API_KEY)

# --- DYNAMIC MODEL SELECTOR (The Fix) ---
def get_working_model():
    """
    Asks Google which models are available for this API Key
    and picks the best one automatically.
    """
    try:
        available_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                available_models.append(m.name)
        
        print(f"Your Available Models: {available_models}")

        # Preference List: Try to find Flash first (fastest), then Pro (stable)
        if "models/gemini-1.5-flash" in available_models:
            return genai.GenerativeModel("models/gemini-1.5-flash")
        elif "models/gemini-1.5-pro" in available_models:
            return genai.GenerativeModel("models/gemini-1.5-pro")
        elif "models/gemini-pro" in available_models:
            return genai.GenerativeModel("models/gemini-pro")
        else:
            # Fallback to the first available model if nothing else matches
            return genai.GenerativeModel(available_models[0])

    except Exception as e:
        print(f"Error listing models: {e}")
        # Nuclear fallback: Try the oldest standard name
        return genai.GenerativeModel("gemini-pro")

# Initialize the model using the function
model = get_working_model()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EditRequest(BaseModel):
    prompt: str
    current_walls: list

@app.get("/")
def read_root():
    return {"message": "Backend is running!"}

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    print(f"Processing image: {file.filename}")
    content = await file.read()
    walls = process_image(content)
    return {"walls": walls}

def try_fix_json(bad_json):
    """
    Simple heuristic to fix common AI JSON errors
    """
    # 1. If it doesn't end with ']', add it
    if not bad_json.strip().endswith("]"):
        bad_json += "]"
    # 2. Sometimes AI adds trailing commas like { "a": 1, } -> remove them
    # (This is a simplified fix, for production use a library like 'json_repair')
    return bad_json

@app.post("/edit")
async def edit_floorplan(request: EditRequest):
    print(f"Received Edit Request: '{request.prompt}'")
    
    # 1. Prompt Tuning: Tell AI to be brief and strict
    system_instruction = f"""
    Act as a JSON API. You have one job: Return valid JSON.
    
    User Request: "{request.prompt}"
    
    Current Data (Walls):
    {json.dumps(request.current_walls)}
    
    INSTRUCTIONS:
    1. If the user asks to change color/texture, add a "color" property to the walls (e.g., "color": "#ffffff").
    2. RETURN ONLY THE JSON LIST. Do not write "Here is the code".
    3. Ensure every object is closed with }} and separated by commas.
    """

    try:
        response = model.generate_content(system_instruction)
        raw_text = response.text

        # 2. Aggressive Cleaning
        # Remove markdown code blocks
        clean_json = raw_text.replace("```json", "").replace("```", "").strip()
        
        # 3. Parse
        try:
            new_walls = json.loads(clean_json)
        except json.JSONDecodeError:
            print("JSON Error detected. Attempting auto-fix...")
            fixed_json = try_fix_json(clean_json)
            new_walls = json.loads(fixed_json)

        print("Success! Sending new walls to frontend.")
        return {"walls": new_walls}

    except Exception as e:
        print(f"AI ERROR: {e}")
        # On failure, return original walls so app doesn't crash
        return {"walls": request.current_walls}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)