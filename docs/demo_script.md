# AegisOps Phase 4 Demo Script (5-Minute Walkthrough)

This script provides a step-by-step walkthrough for demonstrating the AegisOps AI-powered Site Reliability Engineering (SRE) platform. It is designed to be executable by anyone who has never seen the project before.

---

## Prerequisites & Setup

Ensure you have Docker and Python installed. Set your Gemini API key in the environment before starting.

```bash
# Set Gemini API Key
export GEMINI_API_KEY="your-actual-api-key"
export DEMO_MODE=true
```

### [00:00 - 00:30] Step 1: Start the Platform & Verify Health

1. Spin up the environment using Docker Compose:
   ```bash
   docker-compose up --build -d
   ```
2. Run the automated health check to confirm all components are online:
   ```bash
   python scripts/health_check.py
   ```
   **Expected Output:**
   ```text
   PASS Backend
   PASS Frontend
   PASS PostgreSQL
   PASS Redis
   PASS Prometheus
   ```

3. Open your browser and navigate to the dashboard:
   ```text
   http://localhost:3000
   ```
   **Visuals:** A professional dark navy/slate dashboard with HSL cyan/purple accents, an animated health score circle at **98%**, a steady real-time chart, and zero active incidents.

---

### [00:30 - 01:30] Step 2: Generate Demo Cache (Offline Mode Validation)

To ensure that the Gemini LLM is never called live during the demo (avoiding network latency or API rate limits), verify/generate the demo response cache:

1. Run the cache generation script (requires one-time internet connection to fetch real SRE responses to seed files):
   ```bash
   python scripts/generate_demo_cache.py
   ```
   **Expected Output:**
   ```text
   Initializing demo response cache generator...
   Swapping LLM service to capture live Gemini responses...
   [1/20] Processing incident 'Database connection pool leak in payment-service'...
   ...
   Successfully generated cache with 40 total cached responses.
   Demo responses written to backend/cache/demo_responses.json
   ```

2. Confirm that `DEMO_MODE=true` is set. This guarantees that all subsequent LLM requests will read directly from the local JSON cache using SHA256 hashing.

---

### [01:30 - 02:30] Step 3: Trigger Infrastructure Failure Simulation

We will simulate a gradual **database connection leak** on the `payment-service`.

1. Run the simulation script:
   ```bash
   python scripts/simulate_failure.py --type database_connection_leak
   ```
   **Execution Visuals:**
   * Output prints:
     ```text
     Starting simulation of type 'database_connection_leak' on service 'payment-service'...
     Sending 20 metric batches over 60 seconds...
     [1/20] sending metrics...
     [2/20] sending metrics...
     ...
     [20/20] sending metrics...
     Simulation complete
     ```
   * **Dashboard Updates (Watch live in UI):**
     * Within 15 seconds, the **System Health Index** circle animates downward from **98%** to **~40%**.
     * **Avg CPU Usage** and **Avg Memory** cards turn red as they exceed 90%.
     * **Active Incidents** increases to **1** (marked in critical red).
     * The three-panel line charts for **CPU**, **Memory**, and **Error Rate** show dramatic spikes.

---

### [02:30 - 03:45] Step 4: Incident Command & AI Root Cause Analysis (RCA)

1. Click on **Incident Command** in the sidebar navigation.
2. Select the active alert from the left column: `Telemetry anomaly detected on payment-service`.
3. In the right panel, click **Run AI RCA Pipeline**.
   * **UX Behavior:** The UI shows a loading state saying: *"Querying Vector Knowledge Base... Retrieving historic runbooks, scanning metrics, and calling Gemini 1.5 Flash..."*
   * Within 2 seconds, the cached analysis is loaded:
     * **AI Root Cause Identification:** Detailed root cause of database transaction pool connection depletion.
     * **Confidence Bar:** Displays confidence index (e.g., **94%**).
     * **Causal Chain Timeline:** A timeline showing the step-by-step failure progression (12:44:00 to 12:45:10).
     * **Next Action Recommendations:** Action steps prioritized.

---

### [03:45 - 04:30] Step 5: Execute AI Recovery Recommendations

1. Navigate to **AI Recommendations** in the sidebar.
2. Observe the recommended recovery plan rendered as cards, with Priority level and confidence (e.g., **94%**).
3. Click **Approve Action** on the top recommendation: `Restart payment-service container`.
   * **UX Behavior:** The action status updates to **approved** (highlighted in cyan).
   * Console outputs: `[XX:XX:XX] APPROVAL GRANTED: SRE Operator approved Action #X (RESTART)`
4. Click **Execute Recovery**.
   * **UX Behavior:** The console outputs real-time progress:
     ```text
     [XX:XX:XX] EXECUTION START: Triggering Action #X...
     INITIATING RECOVERY ACTION #X - RESTART
     Connecting to orchestration API...
     Executing recovery script sequence...
     Verifying service health checks...
     RECOVERY COMPLETED SUCCESSFULLY. Incident status marked: RESOLVED.
     ```
   * The card updates to green: **Execution Succeeded**.

---

### [04:30 - 05:00] Step 6: Verify System Stabilization & Predictions

1. Return to the **Dashboard** and verify:
   * Health Score is restored to **98%** (Optimal).
   * Active Incident Count is **0**.
   * Telemetry charts show metrics settling back to baseline.
2. Navigate to **Predictions**:
   * Select `payment-service` to review safety forecasting.
   * View the **Risk Gauge** (Stable, **10% risk**).
   * View the **Historical Trend Chart** showing that the observed latency (blue line) did not breach the critical threshold (red line) after recovery.

---

## Recovery Steps if Demo Fails (Troubleshooting)

### Problem A: Backend Health Check fails / TCP port conflicts
* **Reason:** Port 8000 (backend) or 3000 (frontend) already in use on host.
* **Fix:** Stop any local services running on those ports, or run `docker-compose down` and rebuild:
  ```bash
  docker-compose down -v
  docker-compose up --build -d
  ```

### Problem B: Anomaly is not detected/pipeline does not run
* **Reason:** Metrics database lacks historical baseline.
* **Fix:** Reset the environment:
  ```bash
  python scripts/reset_demo.py
  ```
  This will clear metrics, incidents, recovery actions, reset FAISS, and re-seed the baseline incidents. Then re-run the simulation.

### Problem C: Gemini API Key returns Quota / Billing errors
* **Reason:** Live Gemini API is throttled.
* **Fix:** Ensure `DEMO_MODE=true` is exported. This reads the responses locally from `backend/cache/demo_responses.json` without executing network requests.
