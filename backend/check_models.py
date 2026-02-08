import google.generativeai as genai

API_KEY = "AIzaSyCjzNvQAE0zkPIAFershizzkD-PmVj52W4"
genai.configure(api_key=API_KEY)

print("Listing available models...")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)