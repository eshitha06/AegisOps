import sys
import os
import requests
import redis
import psycopg2

# Adjust Python path to import backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.config import settings

def check_backend():
    try:
        url = os.getenv("BACKEND_URL", "http://localhost:8000/health")
        resp = requests.get(url, timeout=3)
        if resp.status_code == 200 and resp.json().get("status") == "healthy":
            print("PASS Backend")
            return True
    except Exception:
        pass
    print("FAIL Backend")
    return False

def check_frontend():
    try:
        url = os.getenv("FRONTEND_URL", "http://localhost:3000/")
        resp = requests.get(url, timeout=3)
        if resp.status_code == 200 or resp.status_code == 304:
            print("PASS Frontend")
            return True
    except Exception:
        pass
    print("FAIL Frontend")
    return False

def check_postgres():
    try:
        db_url = os.getenv("DATABASE_URL", settings.DATABASE_URL)
        if "@db:" in db_url:
            db_url = db_url.replace("@db:", "@localhost:")
        conn = psycopg2.connect(db_url, connect_timeout=3)
        cursor = conn.cursor()
        cursor.execute("SELECT 1;")
        cursor.close()
        conn.close()
        print("PASS PostgreSQL")
        return True
    except Exception:
        pass
    print("FAIL PostgreSQL")
    return False

def check_redis():
    try:
        redis_url = os.getenv("REDIS_URL", settings.REDIS_URL)
        if "redis://redis:" in redis_url:
            redis_url = redis_url.replace("redis://redis:", "redis://localhost:")
        r = redis.Redis.from_url(redis_url, socket_timeout=3)
        r.ping()
        print("PASS Redis")
        return True
    except Exception:
        pass
    print("FAIL Redis")
    return False

def check_prometheus():
    try:
        url = os.getenv("PROMETHEUS_URL", "http://localhost:9090")
        if "http://prometheus:" in url:
            url = url.replace("http://prometheus:", "http://localhost:")
        resp = requests.get(f"{url}/-/healthy", timeout=3)
        if resp.status_code == 200:
            print("PASS Prometheus")
            return True
        # Try fallback to main page
        resp2 = requests.get(url, timeout=3)
        if resp2.status_code == 200:
            print("PASS Prometheus")
            return True
    except Exception:
        pass
    print("FAIL Prometheus")
    return False

def main():
    b = check_backend()
    f = check_frontend()
    p = check_postgres()
    r = check_redis()
    pr = check_prometheus()
    
    if not (b and f and p and r and pr):
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
