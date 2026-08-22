import sys
import os
import faiss

# Adjust Python path to import backend and scripts
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.db import SessionLocal
from backend.models.metric import Metric
from backend.models.incident import Incident
from backend.models.recovery_action import RecoveryAction
from backend.services.rag_service import rag_service
from scripts.seed_incidents import seed_database

def reset():
    db = SessionLocal()
    try:
        # 1. Clear metrics
        db.query(Metric).delete()
        db.commit()
        print("✓ Metrics cleared")

        # 3. Clear recovery actions
        db.query(RecoveryAction).delete()
        db.commit()
        print("✓ Recovery actions cleared")

        # 2. Clear incidents
        db.query(Incident).delete()
        db.commit()
        print("✓ Incidents cleared")

        # 4. Reset FAISS index
        rag_service.index = faiss.IndexFlatL2(rag_service.dimension)
        rag_service.incidents = []
        # Clear files on disk if using persistence
        if hasattr(rag_service, 'clear'):
            rag_service.clear()
        print("✓ FAISS reset")

        # 5. Re-seed incidents using existing seed_incidents.py
        seed_database()
        print("✓ Seed data loaded")

    except Exception as e:
        print(f"Error resetting demo: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    reset()
