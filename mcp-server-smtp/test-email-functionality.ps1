# SMTP MCP Server Email Testing Script

Write-Host "🧪 Testing SMTP MCP Server Email Functionality" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Test 1: Basic Email
Write-Host "`n📧 Test 1: Basic Email Sending" -ForegroundColor Yellow

$basicEmail = '{
    "to": [{"email": "bot.a3asolutions@gmail.com", "name": "Test Recipient"}],
    "subject": "SMTP MCP Server Test - Basic Email",
    "html": "<h1>🎉 Success!</h1><p>Your SMTP MCP Server is working correctly!</p><p>Server features tested:</p><ul><li>✅ Gmail SMTP connection</li><li>✅ Email sending via API</li><li>✅ HTML email support</li></ul><p><em>Sent from SMTP MCP Server</em></p>",
    "text": "Success! Your SMTP MCP Server is working correctly. Server features: Gmail SMTP, Email API, HTML support."
}'

try {
    $result1 = Invoke-RestMethod -Uri 'http://localhost:3008/api/send-email' -Method Post -Body $basicEmail -ContentType 'application/json'
    if ($result1.success) {
        Write-Host "✅ Basic email sent successfully!" -ForegroundColor Green
        Write-Host "   Message ID: $($result1.messageId)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Basic email failed: $($result1.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Basic email error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Email with CC and BCC
Write-Host "`n📧 Test 2: Email with CC and BCC" -ForegroundColor Yellow

$ccBccEmail = '{
    "to": [{"email": "bot.a3asolutions@gmail.com", "name": "Primary Recipient"}],
    "cc": [{"email": "bot.a3asolutions@gmail.com", "name": "CC Recipient"}],
    "bcc": [{"email": "bot.a3asolutions@gmail.com", "name": "BCC Recipient"}],
    "subject": "SMTP MCP Server Test - CC and BCC",
    "html": "<h1>📮 CC and BCC Test</h1><p>This email tests CC and BCC functionality:</p><ul><li><strong>TO:</strong> Primary recipient</li><li><strong>CC:</strong> Copy recipient (visible)</li><li><strong>BCC:</strong> Blind copy recipient (hidden)</li></ul><p>All recipients should receive this email.</p>",
    "text": "CC and BCC Test - This email tests CC and BCC functionality. TO: Primary recipient, CC: Copy recipient (visible), BCC: Blind copy recipient (hidden)."
}'

try {
    $result2 = Invoke-RestMethod -Uri 'http://localhost:3008/api/send-email' -Method Post -Body $ccBccEmail -ContentType 'application/json'
    if ($result2.success) {
        Write-Host "✅ CC/BCC email sent successfully!" -ForegroundColor Green
        Write-Host "   Message ID: $($result2.messageId)" -ForegroundColor Gray
    } else {
        Write-Host "❌ CC/BCC email failed: $($result2.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ CC/BCC email error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Using Template
Write-Host "`n📧 Test 3: Template-based Email" -ForegroundColor Yellow

$templateEmail = '{
    "templateId": "business-outreach",
    "to": [{"email": "bot.a3asolutions@gmail.com", "name": "Template Test"}],
    "variables": {
        "name": "Test User",
        "company": "a3a Solutions",
        "project": "SMTP MCP Server Testing"
    }
}'

try {
    $result3 = Invoke-RestMethod -Uri 'http://localhost:3008/api/send-email-with-template' -Method Post -Body $templateEmail -ContentType 'application/json'
    if ($result3.success) {
        Write-Host "✅ Template email sent successfully!" -ForegroundColor Green
        Write-Host "   Message ID: $($result3.messageId)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Template email failed: $($result3.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Template email error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Email Testing Complete!" -ForegroundColor Green
Write-Host "Check your email inbox (bot.a3asolutions@gmail.com) for the test emails." -ForegroundColor Cyan
