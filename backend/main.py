from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import google.generativeai as genai
import json
from processor import process_image

# --- CONFIGURATION ---
API_KEY = "AIzaSyB6D1yyFiTkpOKqSRXvMEB2TS-cy6j47XE" # <--- PASTE YOUR KEY HERE
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

@app.post("/edit")
async def edit_floorplan(request: EditRequest):
    print(f"Received Edit Request: '{request.prompt}'")
    
    system_instruction = f"""
    Act as a JSON data processor. 
    User Request: "{request.prompt}"
    
    Current Data (Walls):
    {json.dumps(request.current_walls)}
    
    INSTRUCTIONS:
    1. Modify the 'position', 'size', or 'rotation' of the walls based on the request.
    2. If the user says "delete", remove the wall from the list.
    3. If the user says "add", create a new wall entry.
    4. RETURN ONLY VALID JSON. No markdown formatting. No explanation.
    """

    try:
        response = model.generate_content(system_instruction)
        clean_json = response.text.replace("```json", "").replace("```", "").strip()
        new_walls = json.loads(clean_json)
        print("Success! Sending new walls to frontend.")
        return {"walls": new_walls}

    except Exception as e:
        print(f"ERROR: {e}")
        return {"walls": request.current_walls}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)