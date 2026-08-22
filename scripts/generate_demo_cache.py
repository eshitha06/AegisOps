import sys
import os
import json
import hashlib

# Adjust Python path to import backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.config import settings
# Disable demo mode temporarily to call live Gemini API
settings.DEMO_MODE = False

from backend.db import SessionLocal
from backend.models.incident import Incident
from backend.services import llm_service
from agents import rca_agent, recovery_agent
from scripts.seed_incidents import seed_database

# Monkeypatch call_gemini to capture the prompts and responses
original_call_gemini = llm_service.call_gemini
cache_entries = {}

def monkeypatched_call_gemini(prompt: str) -> str:
    # Use real Gemini API
    resp = original_call_gemini(prompt)
    
    # Normalize prompt and calculate SHA256 hash
    from backend.services.llm_service import normalize_prompt
    normalized = normalize_prompt(prompt)
    sha = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    
    # Store response in tracking dict
    cache_entries[sha] = resp
    return resp

def main():
    print("Initializing demo response cache generator...")
    db = SessionLocal()
    try:
        # Check if database has incidents, if not, seed first
        incidents = db.query(Incident).all()
        if not incidents:
            print("Database has no seeded incidents. Seeding now...")
            seed_database()
            incidents = db.query(Incident).all()

        print(f"Loaded {len(incidents)} incidents. Intercepting LLM service to capture live Gemini responses...")
        llm_service.call_gemini = monkeypatched_call_gemini
        
        for idx, inc in enumerate(incidents):
            print(f"[{idx+1}/{len(incidents)}] Processing incident '{inc.title}'...")
            try:
                # 1. Run RCA Agent
                rca_res = rca_agent.run(inc.id, db)
                # 2. Run Recovery Agent
                recovery_agent.run(rca_res, inc.id, db)
            except Exception as ex:
                print(f"  Error processing incident {inc.id}: {ex}")

        # Path to demo_responses.json
        cache_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "cache"))
        os.makedirs(cache_dir, exist_ok=True)
        cache_path = os.path.join(cache_dir, "demo_responses.json")
        
        # Load existing responses to merge
        existing_cache = {}
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    existing_cache = json.load(f)
            except Exception as e:
                print(f"Warning: Failed to load existing cache file: {e}")
                
        # Merge new cache entries into existing
        existing_cache.update(cache_entries)
        
        # Save cache file
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(existing_cache, f, indent=2)
            
        print(f"Successfully generated cache with {len(existing_cache)} total cached responses.")
        print(f"Demo responses written to {cache_path}")
        
    finally:
        db.close()

if __name__ == "__main__":
    main()
