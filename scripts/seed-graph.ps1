# TraceGraphAI - Idempotent Graph Seeding PowerShell Script
# Usage: .\scripts\seed-graph.ps1 [-BackendUrl "https://tracegraphai-backend.onrender.com"]

param(
    [string]$BackendUrl = "http://localhost:8080"
)

Write-Host "==> Seeding TraceGraphAI demo microservices graph at: $BackendUrl" -ForegroundColor Cyan

try {
    $uri = "$($BackendUrl.TrimEnd('/'))/api/graph/seed"
    $response = Invoke-RestMethod -Uri $uri -Method POST -ContentType "application/json"
    Write-Host "==> Successfully seeded graph!" -ForegroundColor Green
    $response | Format-List
} catch {
    Write-Host "==> Seeding failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
    exit 1
}
