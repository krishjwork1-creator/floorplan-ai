import google.generativeai as genai

API_KEY = "AIzaSyC0a2C2xeVi8GMwOH-YNQ8HtG22o0xmOEw"
genai.configure(api_key=API_KEY)

print("Listing available models...")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)