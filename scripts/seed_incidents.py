import sys
import os
import json
from datetime import datetime

# Adjust Python path to import backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.db import SessionLocal
from backend.models.incident import Incident
from backend.services.rag_service import rag_service

incidents_to_seed = [
    {
        "title": "Database connection pool leak in payment-service",
        "service": "payment-service",
        "severity": "critical",
        "status": "resolved",
        "root_cause": "Unclosed cursor locks in payment database transaction block under high concurrent load.",
        "confidence": 0.95,
        "timeline": [
            "12:44:00 - DB connection count spikes on payment-service instances",
            "12:44:30 - Thread starvation limits connection release rate",
            "12:45:00 - Max pool size of 10 exhausted, client requests reject with timeouts"
        ],
        "recommendations": [
            "Restart payment-service container instance to release stale sockets.",
            "Scale database connection pool limits from 10 to 50 in configuration."
        ]
    },
    {
        "title": "Out of memory crash in worker-service",
        "service": "worker-service",
        "severity": "high",
        "status": "resolved",
        "root_cause": "Memory leak caused by unbuffered file streams processing bulk batch uploads.",
        "confidence": 0.88,
        "timeline": [
            "02:00:00 - Large zip file batch processing initiated",
            "02:05:00 - Heap memory allocation grows linearly to 98%",
            "02:08:15 - OS kernel invokes OOM Killer, worker process terminated"
        ],
        "recommendations": [
            "Increase container RAM limits to 2Gi.",
            "Refactor batch upload router to stream file buffers."
        ]
    },
    {
        "title": "High latency spike in API Gateway",
        "service": "api-gateway",
        "severity": "high",
        "status": "resolved",
        "root_cause": "Downstream authentication timeout limits configured too high during traffic peaks.",
        "confidence": 0.85,
        "timeline": [
            "15:30:00 - Upstream DNS resolution slows down by 500ms",
            "15:31:00 - auth-service latency cascades, gateway threads block waiting on responses",
            "15:32:00 - Average API response time increases from 120ms to 4500ms"
        ],
        "recommendations": [
            "Apply short HTTP client read timeout limit (800ms) on gateway calls.",
            "Introduce fallback circuit breaker patterns."
        ]
    },
    {
        "title": "Redis cache node replica failure in auth-service",
        "service": "auth-service",
        "severity": "critical",
        "status": "resolved",
        "root_cause": "Replica node offline causing auth token cache misses and CPU spikes.",
        "confidence": 0.91,
        "timeline": [
            "09:10:00 - Kubernetes node kube-worker-04 shuts down abruptly",
            "09:10:05 - Redis replica pod goes offline, session validation requests bypass cache",
            "09:11:00 - Database query workload surges, CPU usage on database goes to 98%"
        ],
        "recommendations": [
            "Verify cluster replication health status.",
            "Provision standby Redis replica nodes across multiple availability zones."
        ]
    },
    {
        "title": "CPU saturation in order-service",
        "service": "order-service",
        "severity": "high",
        "status": "resolved",
        "root_cause": "Unoptimized database query executing full table scans on order history.",
        "confidence": 0.89,
        "timeline": [
            "11:00:00 - Marketing campaign launches, concurrent orders spike by 300%",
            "11:02:00 - Order history lookup latency increases by 10x",
            "11:05:00 - CPU utilization on orders database hits 100%"
        ],
        "recommendations": [
            "Apply database index on order_history(user_id, status) fields.",
            "Enable query cache settings."
        ]
    },
    {
        "title": "Message queue backlog in notification-service",
        "service": "notification-service",
        "severity": "medium",
        "status": "resolved",
        "root_cause": "Notification queue consumers blocked due to external mail API throttling.",
        "confidence": 0.82,
        "timeline": [
            "04:00:00 - Third-party email API enforces hard rate limiting policy",
            "04:05:00 - Notification queue size accumulates over 50,000 backlog messages",
            "04:30:00 - User sign-up emails delayed by 45 minutes"
        ],
        "recommendations": [
            "Implement exponential backoff retry logic for external API endpoints.",
            "Scale the number of queue consumer instances to process backlogs faster."
        ]
    },
    {
        "title": "Deployment configuration regression in inventory-service",
        "service": "inventory-service",
        "severity": "high",
        "status": "resolved",
        "root_cause": "Incorrect environment variable setting for database URL in release v1.4.1.",
        "confidence": 0.97,
        "timeline": [
            "18:00:00 - Deployment of inventory-service v1.4.1 completed",
            "18:00:10 - Pods fail readiness probe check",
            "18:01:00 - Logs report ConnectionRefusedError connecting to localhost:5432"
        ],
        "recommendations": [
            "Roll back to deployment release v1.4.0.",
            "Update CI/CD deployment configuration values."
        ]
    },
    {
        "title": "Disk volume space exhaustion in postgres-db",
        "service": "database",
        "severity": "critical",
        "status": "resolved",
        "root_cause": "Log rotation daemon failure leading to excessive storage consumption by system logs.",
        "confidence": 0.99,
        "timeline": [
            "03:00:00 - Logrotate config syntax error blocks nightly log pruning",
            "08:00:00 - Daily metrics writing fills remaining 10% disk capacity",
            "10:15:00 - Database mounts set to read-only mode, transaction commits fail"
        ],
        "recommendations": [
            "Fix syntax error in /etc/logrotate.d log configuration.",
            "Manually purge large backup files and expand disk volume capacity."
        ]
    },
    {
        "title": "DNS resolution timeout in gateway-service",
        "service": "api-gateway",
        "severity": "medium",
        "status": "resolved",
        "root_cause": "CoreDNS pods saturated in cluster, failing to resolve internal endpoints.",
        "confidence": 0.84,
        "timeline": [
            "14:20:00 - CoreDNS CPU limits reached due to lookup surges",
            "14:21:00 - Gateway reports 504 Gateway Timeout resolving downstream service names",
            "14:25:00 - CoreDNS autoscaled, DNS service stabilizes"
        ],
        "recommendations": [
            "Adjust CoreDNS pod resource limits and configure DNS query caching.",
            "Add cluster nodes to distribute routing load."
        ]
    },
    {
        "title": "TLS handshake failure in billing-service",
        "service": "billing-service",
        "severity": "high",
        "status": "resolved",
        "root_cause": "Expired SSL certificates on billing internal load balancer endpoints.",
        "confidence": 0.98,
        "timeline": [
            "00:00:00 - Let's Encrypt SSL certificate expires",
            "00:01:00 - payment-service fails to send invoices, throws SSL handshake errors",
            "00:10:00 - User payments fail at checkout due to billing endpoint isolation"
        ],
        "recommendations": [
            "Renew and deploy updated SSL certificates.",
            "Configure certificate auto-renewal cronjob alerts."
        ]
    },
    {
        "title": "Memory leak in image-processor-service",
        "service": "worker-service",
        "severity": "medium",
        "status": "resolved",
        "root_cause": "Pillow image library context handles left unclosed in avatar generator router.",
        "confidence": 0.86,
        "timeline": [
            "13:00:00 - High user profile updates trigger intensive image processing workloads",
            "13:10:00 - Process resident set size (RSS) grows from 200MB to 1.8GB",
            "13:20:00 - Container restarts due to memory threshold limit alerts"
        ],
        "recommendations": [
            "Wrap Pillow image file handlers in python 'with' statement blocks.",
            "Restart pods during off-peak hours."
        ]
    },
    {
        "title": "Thread pool starvation in cart-service",
        "service": "order-service",
        "severity": "high",
        "status": "resolved",
        "root_cause": "Synchronous blocking IO operations executed inside async route handlers.",
        "confidence": 0.90,
        "timeline": [
            "17:15:00 - API traffic spike on /cart/checkout endpoint",
            "17:15:30 - Async event loop blocked by sync network requests to delivery provider",
            "17:16:00 - Latency spikes to 8000ms, event loop lag exceeds 5 seconds"
        ],
        "recommendations": [
            "Refactor Delivery API integrations using async httpx clients.",
            "Run blocking IO calls on separate threadpools."
        ]
    },
    {
        "title": "Thread deadlock in user-settings-service",
        "service": "auth-service",
        "severity": "high",
        "status": "resolved",
        "root_cause": "Cyclic lock dependency between profile_lock and settings_lock database records.",
        "confidence": 0.87,
        "timeline": [
            "20:10:00 - Concurrent updates on profile and settings initiated by client",
            "20:10:02 - Thread 1 holds Profile Lock waiting on Settings Lock; Thread 2 holds Settings Lock waiting on Profile Lock",
            "20:11:00 - DB logs report deadlock victim selection, one transaction rolled back"
        ],
        "recommendations": [
            "Ensure locking operations acquire resources in a strict, consistent alphabetical order.",
            "Reduce transaction scope lock durations."
        ]
    },
    {
        "title": "Third-party payment gateway latency spike in payment-service",
        "service": "payment-service",
        "severity": "high",
        "status": "resolved",
        "root_cause": "Stripe API sandboxes experiencing network degradation in US-East region.",
        "confidence": 0.93,
        "timeline": [
            "11:30:00 - Third-party API response times increase from 300ms to 9500ms",
            "11:35:00 - payment-service queue fills up, user requests fail with gateway timeouts",
            "12:00:00 - Stripe endpoints recover, latency returned to normal limits"
        ],
        "recommendations": [
            "Enable client-side circuit breakers for payment integrations.",
            "Show user-friendly notice indicating external maintenance."
        ]
    },
    {
        "title": "Elasticsearch index disk fullness in search-service",
        "service": "search-service",
        "severity": "medium",
        "status": "resolved",
        "root_cause": "Retention policy failure keeping raw application log indexes for over 90 days.",
        "confidence": 0.91,
        "timeline": [
            "16:00:00 - Disk usage on Elasticsearch nodes reaches 90%",
            "16:05:00 - Cluster transitions into write-block/read-only mode",
            "16:10:00 - Catalog search results return stale cache or empty arrays"
        ],
        "recommendations": [
            "Delete indexes older than 30 days.",
            "Adjust Index Lifecycle Management (ILM) retention policies."
        ]
    },
    {
        "title": "Deadlock exception on SQL transaction in check-out-service",
        "service": "order-service",
        "severity": "high",
        "status": "resolved",
        "root_cause": "Parallel queries updating inventory stock row counts simultaneously without select_for_update.",
        "confidence": 0.89,
        "timeline": [
            "08:30:00 - Flash sale starts, 10,000 customers check out identical items",
            "08:30:15 - Multiple threads try to decrement inventory balances, locking row segments",
            "08:31:00 - Database transaction errors spike, checkout transactions drop by 40%"
        ],
        "recommendations": [
            "Use optimistic concurrency control or row level SELECT FOR UPDATE locks.",
            "Introduce Redis distributed locking mechanisms."
        ]
    },
    {
        "title": "Rate limit HTTP 429 spike in rate-limiter",
        "service": "api-gateway",
        "severity": "medium",
        "status": "resolved",
        "root_cause": "DDoS crawler bot scraping catalog urls triggering global rate limiters.",
        "confidence": 0.94,
        "timeline": [
            "22:15:00 - Scraper bot initiates 800 requests/sec from single block IP range",
            "22:16:00 - Rate limiting triggers HTTP 429 block responses on scraper IPs",
            "22:20:00 - Added scraper subnet range block on Cloudflare WAF"
        ],
        "recommendations": [
            "Integrate subnet blocking policies in API gateway.",
            "Establish user login requirements on catalog APIs."
        ]
    },
    {
        "title": "Kafka broker connection reset in analytics-service",
        "service": "worker-service",
        "severity": "high",
        "status": "resolved",
        "root_cause": "Kafka broker disk partition full causing node partition replicas to detach.",
        "confidence": 0.87,
        "timeline": [
            "12:00:00 - Kafka broker-1 disk space exhausted",
            "12:01:00 - Analytics producers fail sending logs, buffer pools saturated",
            "12:05:00 - Analytics service logs drop due to memory overflow"
        ],
        "recommendations": [
            "Increase Kafka log segment cleanup frequencies.",
            "Scale volume mount storage size on Kafka broker statefulsets."
        ]
    },
    {
        "title": "Nginx upstream server timed out in proxy-gateway",
        "service": "api-gateway",
        "severity": "high",
        "status": "resolved",
        "root_cause": "DNS settings for backend upstream services caching stale internal IPs on node scaling.",
        "confidence": 0.92,
        "timeline": [
            "15:00:00 - Horizontal scaling event triggers auto-replacement of order-service pods",
            "15:00:30 - Nginx routes traffic to retired pod IP addresses",
            "15:01:00 - Client requests fail with Nginx 504 Upstream Server Timeout errors"
        ],
        "recommendations": [
            "Configure Nginx proxy upstream resolver to honor DNS TTL values (5s).",
            "Introduce endpoint active health check validation."
        ]
    },
    {
        "title": "File descriptor leak in logging-daemon-service",
        "service": "worker-service",
        "severity": "medium",
        "status": "resolved",
        "root_cause": "Open file handlers left unclosed in local log parser threads.",
        "confidence": 0.89,
        "timeline": [
            "07:00:00 - Logging daemon processes intensive log forwarding files",
            "07:15:00 - System reaches max file descriptor limit (1024) for process",
            "07:20:00 - Daemon fails to open files, throwing 'Too many open files' socket errors"
        ],
        "recommendations": [
            "Configure open file descriptor parameters (ulimit -n 65536) on host nodes.",
            "Refactor log parser loops using resource context managers."
        ]
    }
]

def seed_database():
    db = SessionLocal()
    try:
        print("Starting seeding process...")
        count = 0
        for item in incidents_to_seed:
            title = item["title"]
            
            # Idempotency check: see if incident with this title already exists
            existing = db.query(Incident).filter(Incident.title == title).first()
            if existing:
                print(f"Skipping: Incident '{title}' already seeded.")
                continue
                
            # Create database entry
            incident_db = Incident(
                title=title,
                service=item["service"],
                status=item["status"],
                severity=item["severity"],
                root_cause=item["root_cause"],
                confidence_score=item["confidence"],
                recovery_action=json.dumps({
                    "timeline": item["timeline"],
                    "recommendations": item["recommendations"]
                }),
                created_at=datetime.utcnow()
            )
            db.add(incident_db)
            db.commit()
            db.refresh(incident_db)
            
            # Add to FAISS index
            incident_dict = {
                "id": incident_db.id,
                "title": incident_db.title,
                "service": incident_db.service,
                "severity": incident_db.severity,
                "status": incident_db.status,
                "root_cause": incident_db.root_cause,
                "recovery_action": incident_db.recovery_action
            }
            try:
                rag_service.add_incident(incident_dict)
                print(f"Seeded: '{title}' (PostgreSQL & FAISS).")
                count += 1
            except Exception as e:
                print(f"Seeded '{title}' in SQL but failed to index in FAISS: {e}")
                
        print(f"Seeding completed successfully. {count} new incidents seeded.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
