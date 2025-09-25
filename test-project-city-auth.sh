#!/bin/bash

# Test script for project-city login system
API_BASE="http://localhost:5000/api"

echo "🔐 Testing Project-City Authentication..."

# Test project-city login
echo "1. Testing project-city login..."
RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123",
    "projectId": "SmartAccess",
    "cityName": "Amsterdam"
  }')

echo "Login Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Project-city login successful"
  TOKEN=$(echo "$RESPONSE" | jq -r '.data.accessToken')
  echo "Token: $TOKEN"
  
  # Test dashboard with project-city scoping
  echo ""
  echo "2. Testing dashboard with project-city scope..."
  DASHBOARD_RESPONSE=$(curl -s -X GET "$API_BASE/dashboard/overview" \
    -H "Authorization: Bearer $TOKEN")
  
  echo "Dashboard Response: $DASHBOARD_RESPONSE"
  
  if echo "$DASHBOARD_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Dashboard access successful with project-city scoping"
  else
    echo "❌ Dashboard access failed"
  fi
else
  echo "❌ Project-city login failed"
fi

echo ""
echo "3. Testing project list..."
PROJECT_RESPONSE=$(curl -s -X GET "$API_BASE/project")
echo "Projects: $PROJECT_RESPONSE"

echo ""
echo "4. Testing cities for project..."
CITIES_RESPONSE=$(curl -s -X GET "$API_BASE/project/SmartAccess/cities")
echo "Cities for SmartAccess: $CITIES_RESPONSE"