#!/bin/bash
# Test script for SMTP MCP Server endpoints

BASE_URL="http://localhost:3008"

echo "🧪 Testing SMTP MCP Server Endpoints..."
echo "========================================="

echo -e "\n1. 📊 Health Check"
curl -s "$BASE_URL/api/health" | jq '.' 2>/dev/null || echo "Health endpoint test failed"

echo -e "\n2. 📋 Available Endpoints"
curl -s "$BASE_URL/api/endpoints" | jq '.' 2>/dev/null || echo "Endpoints listing failed"

echo -e "\n3. 📧 Template Endpoints (Original paths)"
echo "GET /api/templates:"
curl -s "$BASE_URL/api/templates" | jq '.' 2>/dev/null || echo "Templates endpoint test failed"

echo -e "\n4. 📧 Template Endpoints (Alias paths - these should work now!)"
echo "GET /api/get-email-templates:"
curl -s "$BASE_URL/api/get-email-templates" | jq '.' 2>/dev/null || echo "Get email templates alias failed"

echo -e "\n5. 🔧 Testing Add Template (Alias)"
echo "POST /api/add-email-template:"
curl -s -X POST "$BASE_URL/api/add-email-template" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-template",
    "subject": "Test Subject {{name}}",
    "html": "<h1>Hello {{name}}!</h1><p>This is a test template.</p>",
    "text": "Hello {{name}}! This is a test template.",
    "variables": ["name"]
  }' | jq '.' 2>/dev/null || echo "Add template test failed"

echo -e "\n6. 📋 List Templates Again (Should show the new template)"
curl -s "$BASE_URL/api/get-email-templates" | jq '.' 2>/dev/null || echo "Template listing failed"

echo -e "\n✅ All tests completed!"
echo -e "\n📝 Summary:"
echo "- Original endpoints: /api/templates/*"
echo "- Alias endpoints: /api/*-email-template*" 
echo "- Both should work now!"
