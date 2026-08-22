from backend.services.prediction_service import prediction_service

def run(service: str, db):
    return prediction_service.predict_status(service, db)
