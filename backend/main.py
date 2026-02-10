from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from PIL import Image
import io
import json
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

# Allow EVERYONE to connect. No security, just function.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "alive", "message": "I am here"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    print("Received file...")
    try:
        # 1. Read Image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # 2. Use the OLD RELIABLE model
        model = genai.GenerativeModel('gemini-pro-vision') 
        
        # 3. Simple Prompt
        prompt = "Extract walls from this floorplan as a JSON list. Format: [{'start': [0,0], 'end': [1,1], 'thickness': 0.2, 'height': 3}]. Return ONLY JSON."
        
        # 4. Generate
        response = model.generate_content([prompt, image])
        text = response.text
        
        # 5. Dumb Cleanup (Just find the brackets)
        start = text.find('[')
        end = text.rfind(']') + 1
        if start != -1 and end != -1:
            clean_json = text[start:end]
            return {"walls": json.loads(clean_json)}
        else:
            return {"walls": []}
            
    except Exception as e:
        print(f"ERROR: {e}")
        return {"walls": []}

@app.post("/edit")
async def edit(request: dict):
    return {"walls": request.get("current_walls", [])}