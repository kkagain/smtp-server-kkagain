# PowerShell test script for SMTP MCP Server endpoints

$BaseUrl = "http://localhost:3008"

Write-Host "🧪 Testing SMTP MCP Server Endpoints..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

try {
    Write-Host "`n1. 📊 Health Check" -ForegroundColor Yellow
    $health = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method Get
    $health | ConvertTo-Json -Depth 3

    Write-Host "`n2. 📋 Available Endpoints" -ForegroundColor Yellow
    $endpoints = Invoke-RestMethod -Uri "$BaseUrl/api/endpoints" -Method Get
    Write-Host "Available endpoints listed successfully!" -ForegroundColor Green

    Write-Host "`n3. 📧 Template Endpoints (Original paths)" -ForegroundColor Yellow
    Write-Host "GET /api/templates:" -ForegroundColor White
    $templates1 = Invoke-RestMethod -Uri "$BaseUrl/api/templates" -Method Get
    Write-Host "Templates: $($templates1.templates.Count) found" -ForegroundColor Green

    Write-Host "`n4. 📧 Template Endpoints (Alias paths - these should work now!)" -ForegroundColor Yellow
    Write-Host "GET /api/get-email-templates:" -ForegroundColor White
    $templates2 = Invoke-RestMethod -Uri "$BaseUrl/api/get-email-templates" -Method Get
    Write-Host "Templates via alias: $($templates2.templates.Count) found" -ForegroundColor Green

    Write-Host "`n5. 🔧 Testing Add Template (Alias)" -ForegroundColor Yellow
    Write-Host "POST /api/add-email-template:" -ForegroundColor White
    $templateData = @{
        name = "test-template-$(Get-Date -Format 'HHmmss')"
        subject = "Test Subject {{name}}"
        html = "&lt;h1&gt;Hello {{name}}!&lt;/h1&gt;&lt;p&gt;This is a test template created at $(Get-Date).&lt;/p&gt;"
        text = "Hello {{name}}! This is a test template created at $(Get-Date)."
        variables = @("name")
    } | ConvertTo-Json

    $newTemplate = Invoke-RestMethod -Uri "$BaseUrl/api/add-email-template" -Method Post -Body $templateData -ContentType "application/json"
    Write-Host "✅ Template created successfully: $($newTemplate.template.name)" -ForegroundColor Green

    Write-Host "`n6. 📋 List Templates Again (Should show the new template)" -ForegroundColor Yellow
    $templatesAfter = Invoke-RestMethod -Uri "$BaseUrl/api/get-email-templates" -Method Get
    Write-Host "Total templates now: $($templatesAfter.templates.Count)" -ForegroundColor Green

    Write-Host "`n✅ All tests completed successfully!" -ForegroundColor Green
    Write-Host "`n📝 Summary:" -ForegroundColor Cyan
    Write-Host "- Original endpoints: /api/templates/* ✅" -ForegroundColor White
    Write-Host "- Alias endpoints: /api/*-email-template* ✅" -ForegroundColor White
    Write-Host "- Both endpoint styles work!" -ForegroundColor Green

} catch {
    Write-Host "`n❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure the server is running on $BaseUrl" -ForegroundColor Yellow
}
