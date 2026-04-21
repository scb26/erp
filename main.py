import pandas as pd
import json
import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types

# --- CONFIGURATION ---
GEMINI_API_KEY = "AIzaSyD363e1_Zbh_xod55-5C-ebiaKml2TNocY"
CSV_FILE_PATH = r"D:\New folder\erp\HSN_SAC.csv"

# 1. Initialize Gemini Client
client = genai.Client(api_key=GEMINI_API_KEY)

# 2. Load ENTIRE CSV once at startup
try:
    # We load everything into memory once so search is instant
    df_full = pd.read_csv(CSV_FILE_PATH, dtype=str).fillna("")
    print(f"Full CSV Loaded: {len(df_full)} rows found.")
except Exception as e:
    print(f"Error loading CSV: {e}")
    df_full = pd.DataFrame()

# 3. Smart Search Function
def get_relevant_context(product_name: str, max_rows=15):
    if df_full.empty:
        return "No HSN data available."
    
    query = product_name.lower()
    
    # Simple keyword match across all columns
    # We look for rows where any column contains any word from the product name
    mask = df_full.apply(lambda x: x.str.contains(query, case=False, na=False)).any(axis=1)
    matches = df_full[mask].head(max_rows)
    
    if matches.empty:
        return "No specific matches found in CSV. Use general knowledge."
    
    return matches.to_string(index=False)

# 4. Auto-detect Model
def get_best_model():
    try:
        available_models = [m.name for m in client.models.list() if 'generateContent' in (m.supported_actions or [])]
        priorities = ['models/gemini-2.5-flash', 'models/gemini-2.0-flash-001', 'models/gemini-1.5-flash']
        for p in priorities:
            if p in available_models:
                return p.replace('models/', '')
        return available_models[0].replace('models/', '')
    except:
        return "gemini-2.5-flash"

MODEL_ID = get_best_model()

app = FastAPI()

class ProductRequest(BaseModel):
    product_name: str

@app.post("/get-hsn-gst")
async def fetch_hsn(request: ProductRequest):
    try:
        # Get only the relevant rows from the 18k+ list
        context = get_relevant_context(request.product_name)

        prompt = f"""
        You are an HSN and GST expert.
        
        RELEVANT DATA FROM CSV:
        {context}

        TASK:
        Map the product '{request.product_name}' to an 8-digit HSN and GST rate.
        
        RULES:
        1. Return ONLY JSON.
        2. Format: {{"hsn": "XXXXXXXX", "gst": "XX%"}}
        3. If it's a food item, usually 5% or 12%.
        4. If it's an electronic/appliance (like microwave), usually 18%.
        """

        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt
        )
        
        raw_text = response.text.strip()
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        
        if json_match:
            return json.loads(json_match.group(0))
        else:
            cleaned = raw_text.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)