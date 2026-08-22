import json
import os
try:
    import redis
except ImportError:  # Optional cache; telemetry must not depend on it.
    redis = None
try:
    import google.generativeai as genai
except ImportError:  # Optional external enhancement; fallback stays local.
    genai = None
from backend.config import settings

# Initialize Redis client safely
redis_client = None
try:
    if redis and settings.REDIS_URL:
        redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2)
except Exception as e:
    print(f"Warning: Failed to connect to Redis at {settings.REDIS_URL}: {e}")
    redis_client = None

import re
import hashlib

def normalize_prompt(prompt: str) -> str:
    # Normalize dates/times of format: YYYY-MM-DD HH:MM:SS.ffffff or ISO format
    p = re.sub(r'\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?Z?', '2026-06-12 12:44:00', prompt)
    return p

def get_demo_response(prompt: str) -> str:
    # Attempt to load demo_responses.json
    try:
        if genai is None:
            raise RuntimeError("google-generativeai is not installed")
        normalized = normalize_prompt(prompt)
        sha = hashlib.sha256(normalized.encode('utf-8')).hexdigest()
        cache_path = os.path.join(os.path.dirname(__file__), "..", "cache", "demo_responses.json")
        if os.path.exists(cache_path):
            with open(cache_path, "r", encoding="utf-8") as f:
                demo_data = json.load(f)
            # Try exact SHA256 match
            if sha in demo_data:
                val = demo_data[sha]
                return val if isinstance(val, str) else json.dumps(val)
            # Find a key that matches
            for key, val in demo_data.items():
                if key in prompt or prompt in key:
                    return val if isinstance(val, str) else json.dumps(val)
    except Exception as e:
        print(f"Error reading demo responses: {e}")

    # Fallbacks if demo cache is empty or doesn't match
    if "timeline" in prompt or "root_cause" in prompt:
        return json.dumps({
            "root_cause": "Database connection pool exhaustion on payment-service due to an unclosed cursor in /pay endpoint.",
            "confidence": 0.94,
            "timeline": [
                "12:44:00 - Traffic spike on /pay endpoint initiates multiple concurrent DB requests",
                "12:44:30 - payment-service connection pool depleted",
                "12:45:00 - API failure and connection timeouts detected"
            ],
            "recommendations": [
                "Restart payment-service container to release connections",
                "Increase max database pool size from 10 to 50",
                "Fix cursor leaks in payment-service code"
            ]
        })
    else:
        return json.dumps({
            "actions": [
                {"priority": 1, "type": "restart", "description": "Restart payment-service container"},
                {"priority": 2, "type": "config", "description": "Increase connection pool size to 50"},
                {"priority": 3, "type": "rollback", "description": "Rollback to version v2.2"}
            ],
            "estimated_recovery_minutes": 5,
            "confidence": 0.90
        })

def call_gemini(prompt: str) -> str:
    # Hash prompt for cache key consistency
    cache_key = f"gemini_cache:{hash(prompt)}"
    
    # 1. Redis lookup
    if redis_client:
        try:
            cached_resp = redis_client.get(cache_key)
            if cached_resp:
                return cached_resp
        except Exception as e:
            print(f"Redis cache lookup error: {e}")

    # 2. Demo mode check
    if settings.DEMO_MODE:
        resp_text = get_demo_response(prompt)
        if redis_client and resp_text:
            try:
                redis_client.setex(cache_key, 3600, resp_text)
            except Exception:
                pass
        return resp_text

    # 3. Live Gemini API call
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        resp_text = response.text
        
        # Cache in Redis
        if redis_client and resp_text:
            try:
                redis_client.setex(cache_key, 3600, resp_text)
            except Exception as e:
                print(f"Redis cache set error: {e}")
                
        return resp_text
    except Exception as e:
        print(f"Gemini API call failed: {e}. Falling back to demo response.")
        fallback = get_demo_response(prompt)
        # Store fallback in cache temporarily to avoid hitting API repeatedly
        if redis_client and fallback:
            try:
                redis_client.setex(cache_key, 3600, fallback)
            except Exception:
                pass
        return fallback
