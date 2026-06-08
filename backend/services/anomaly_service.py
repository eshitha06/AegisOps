import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from typing import List, Dict, Any, Tuple

class AnomalyDetectionService:
    def __init__(self, contamination: float = 0.05):
        self.contamination = contamination
        # Fallback default model configuration if historical training data is insufficient
        self.default_model = IsolationForest(contamination=self.contamination, random_state=42)

    def analyze_metrics(self, current_metric: Dict[str, Any], historical_metrics: List[Dict[str, Any]]) -> Tuple[bool, float]:
        """
        Fits an Isolation Forest model over historical service trends to evaluate 
        if the incoming real-time metric point constitutes a statistical anomaly.
        """
        features = ["cpu_usage", "memory_usage", "error_rate", "latency_ms", "request_count"]
        
        # Guard clause: If insufficient baseline history exists, use heuristic distribution
        if len(historical_metrics) < 10:
            return self._fallback_heuristic_analysis(current_metric)
            
        # Convert historical records to DataFrame
        df = pd.DataFrame(historical_metrics)
        
        # Ensure all columns exist
        for col in features:
            if col not in df.columns:
                df[col] = 0.0

        X_train = df[features].to_numpy()
        
        # Dynamic fitting on the historical baseline matrix
        model = IsolationForest(contamination=self.contamination, random_state=42)
        model.fit(X_train)
        
        # Prepare current target vector
        target_vector = np.array([[
            float(current_metric.get("cpu_usage", 0)),
            float(current_metric.get("memory_usage", 0)),
            float(current_metric.get("error_rate", 0)),
            float(current_metric.get("latency_ms", 0)),
            float(current_metric.get("request_count", 0))
        ]])
        
        # Prediction: -1 for anomaly, 1 for normal
        prediction = model.predict(target_vector)
        is_anomaly = bool(prediction == -1)
        
        # Score computation: Isolation Forest decision function returns raw offset value.
        # Lower values mean more anomalous. We invert/scale for a positive anomaly score representation.
        raw_score = model.decision_function(target_vector)
        anomaly_score = float(clamped_score := max(0.0, min(1.0, 0.5 - raw_score)))

        return is_anomaly, anomaly_score

    def _fallback_heuristic_analysis(self, current_metric: Dict[str, Any]) -> Tuple[bool, float]:
        """
        Safety fallback logic when data volume is insufficient to train an Isolation Forest model.
        """
        is_anomaly = False
        score_accumulator = 0.0
        
        if current_metric.get("error_rate", 0) > 15.0:
            score_accumulator += 0.4
            is_anomaly = True
        if current_metric.get("latency_ms", 0) > 2000:
            score_accumulator += 0.4
            is_anomaly = True
        if current_metric.get("cpu_usage", 0) > 92.0:
            score_accumulator += 0.2
            
        return is_anomaly, min(1.0, score_accumulator)

anomaly_service = AnomalyDetectionService()