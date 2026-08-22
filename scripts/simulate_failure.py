import argparse
import time
import requests
import sys

def main():
    parser = argparse.ArgumentParser(description="Simulate infrastructure telemetry failure.")
    parser.add_argument("--type", type=str, default="database_connection_leak", 
                        choices=["database_connection_leak", "cpu_saturation", "memory_leak", "high_latency"],
                        help="The type of failure to simulate (default: database_connection_leak)")
    parser.add_argument("--service", type=str, default="payment-service", help="Service name (default: payment-service)")
    parser.add_argument("--url", type=str, default="http://localhost:8000/api/metrics/ingest", help="Backend metrics ingest endpoint URL")
    args = parser.parse_args()

    total_batches = 20
    duration = 60.0
    sleep_time = duration / total_batches # 3.0 seconds

    print(f"Starting simulation of type '{args.type}' on service '{args.service}'...")
    print(f"Sending {total_batches} metric batches over {duration} seconds...")

    for i in range(1, total_batches + 1):
        print(f"[{i}/{total_batches}] sending metrics...")
        
        # Determine ramp up factor (from 0.0 to 1.0 starting at batch 6)
        if i <= 5:
            factor = 0.0
        else:
            factor = (i - 5) / (total_batches - 5)
            
        # Default normal metrics
        cpu = 0.15 + factor * 0.05  # 15% to 20%
        mem = 0.30 + factor * 0.10  # 30% to 40%
        latency = 80.0 + factor * 40.0 # 80ms to 120ms
        error_rate = 0.1 + factor * 0.2 # 0.1 to 0.3
        request_count = 500 + int(factor * 100) # 500 to 600

        # Apply failure characteristics based on simulation type
        if args.type == "database_connection_leak":
            cpu = 0.20 + factor * 0.78       # 20% to 98%
            mem = 0.35 + factor * 0.60       # 35% to 95%
            latency = 100.0 + factor * 3400.0 # 100ms to 3500ms
            error_rate = 0.2 + factor * 18.3  # 0.2% to 18.5%
            request_count = 600 + int(factor * 600) # 600 to 1200
        elif args.type == "cpu_saturation":
            cpu = 0.20 + factor * 0.79       # 20% to 99%
            latency = 100.0 + factor * 1000.0 # 100ms to 1100ms
            error_rate = 0.2 + factor * 4.0   # 0.2% to 4.2%
        elif args.type == "memory_leak":
            mem = 0.30 + factor * 0.69       # 30% to 99%
            cpu = 0.15 + factor * 0.40       # 15% to 55%
            latency = 100.0 + factor * 800.0  # 100ms to 900ms
        elif args.type == "high_latency":
            latency = 100.0 + factor * 4900.0 # 100ms to 5000ms
            error_rate = 0.2 + factor * 8.0   # 0.2% to 8.2%
            cpu = 0.20 + factor * 0.50       # 20% to 70%

        payload = {
            "service": args.service,
            "cpu_usage": round(cpu, 4),
            "memory_usage": round(mem, 4),
            "error_rate": round(error_rate, 4),
            "latency_ms": round(latency, 2),
            "request_count": request_count
        }

        try:
            resp = requests.post(args.url, json=payload, timeout=5)
            if resp.status_code != 200 and resp.status_code != 201:
                print(f"Error: Ingest endpoint returned status {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"Network error sending metrics: {e}")

        # Sleep except on the last batch
        if i < total_batches:
            time.sleep(sleep_time)

    print("Simulation complete")

if __name__ == "__main__":
    main()
