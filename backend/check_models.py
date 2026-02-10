import google.generativeai as genai

genai.configure(api_key="AIzaSyCwsige_GdMODoMdbU-cPqsekw89hXSPwE")

model = genai.GenerativeModel("gemini-pro")
print(model.generate_content("Say OK").text)
