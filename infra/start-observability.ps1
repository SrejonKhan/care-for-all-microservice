# Start Observability Stack
# This script starts the complete observability setup:
# Logs: Winston+Morgan -> Filebeat -> Logstash -> Elasticsearch -> Grafana
# Traces: OpenTelemetry -> Jaeger -> Grafana
# Metrics: OpenTelemetry+NodeExporter+cAdvisor -> Prometheus -> Grafana

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CareForAll Observability Stack" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting observability services..." -ForegroundColor Yellow
Write-Host ""

# Start infrastructure services first
Write-Host "[1/4] Starting databases and message broker..." -ForegroundColor Green
docker compose up -d postgres mongodb rabbitmq

Write-Host "[2/4] Starting observability infrastructure..." -ForegroundColor Green
docker compose up -d elasticsearch logstash filebeat otel-collector jaeger prometheus node-exporter cadvisor

Write-Host "[3/4] Starting Grafana (unified dashboard)..." -ForegroundColor Green
docker compose up -d grafana kibana

Write-Host "[4/4] Waiting for services to be healthy..." -ForegroundColor Green
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Observability Stack Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Access Points:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Grafana (Unified Observability):  http://localhost:3003" -ForegroundColor White
Write-Host "    Username: admin" -ForegroundColor Gray
Write-Host "    Password: admin" -ForegroundColor Gray
Write-Host "    - Logs Dashboard (Elasticsearch)" -ForegroundColor Gray
Write-Host "    - Traces Dashboard (Jaeger)" -ForegroundColor Gray
Write-Host "    - Metrics Dashboard (Prometheus)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Elasticsearch (Logs Storage):     http://localhost:9200" -ForegroundColor White
Write-Host "  Kibana (Alternative Logs UI):     http://localhost:5601" -ForegroundColor White
Write-Host "  Jaeger UI (Distributed Tracing):  http://localhost:16686" -ForegroundColor White
Write-Host "  Prometheus (Metrics):             http://localhost:9090" -ForegroundColor White
Write-Host ""

Write-Host "Data Flow:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  LOGS:    Container Logs -> Filebeat -> Logstash -> Elasticsearch -> Grafana" -ForegroundColor Cyan
Write-Host "  TRACES:  App (OTEL SDK) -> OTEL Collector -> Jaeger -> Grafana" -ForegroundColor Magenta
Write-Host "  METRICS: App (OTEL) + NodeExporter + cAdvisor -> Prometheus -> Grafana" -ForegroundColor Green
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Start application services: docker compose up -d" -ForegroundColor White
Write-Host "  2. Open Grafana: http://localhost:3003" -ForegroundColor White
Write-Host "  3. View pre-configured dashboards" -ForegroundColor White
Write-Host ""

Write-Host "To stop: docker compose down" -ForegroundColor Gray
Write-Host ""
