#!/bin/bash

# 🚀 GUIDE DE TEST SIMPLE - Spam Detection
# Usage: Suivez les instructions ci-dessous

BASE_URL="http://localhost:3000"

echo "╔════════════════════════════════════════════════════════╗"
echo "║       🧪 Guide de Test - Spam Detection              ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Option 1: Test SANS authentification (endpoints publics)"
echo "──────────────────────────────────────────────────────────"
echo ""
echo "⚠️  Note: Les endpoints de test nécessitent l'authentification."
echo "   Vous devez d'abord créer un compte et vous connecter."
echo ""
echo ""

echo "📋 Option 2: Test AVEC authentification (recommandé)"
echo "──────────────────────────────────────────────────────────"
echo ""
echo "Étape 1️⃣ : Créer un compte"
echo "───────────────────────────"
echo ""
echo "curl -X POST $BASE_URL/auth/signup/user \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"email\": \"testspam@example.com\","
echo "    \"password\": \"Password123!\","
echo "    \"username\": \"testspam\""
echo "  }'"
echo ""
read -p "Appuyez sur ENTER pour créer le compte..." 

SIGNUP_RESULT=$(curl -s -X POST "$BASE_URL/auth/signup/user" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testspam@example.com",
    "password": "Password123!",
    "username": "testspam"
  }')

echo "$SIGNUP_RESULT" | jq 2>/dev/null || echo "$SIGNUP_RESULT"
echo ""
echo "✅ Si vous voyez un token ou un message de succès, continuez."
echo "⚠️  Si l'email existe déjà, utilisez le mot de passe existant."
echo ""

echo "Étape 2️⃣ : Se connecter et obtenir le token"
echo "───────────────────────────────────────────"
echo ""
read -p "Appuyez sur ENTER pour vous connecter..."

LOGIN_RESULT=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testspam@example.com",
    "password": "Password123!"
  }')

TOKEN=$(echo "$LOGIN_RESULT" | jq -r '.accessToken' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Échec de connexion. Réponse:"
    echo "$LOGIN_RESULT"
    echo ""
    echo "💡 Solution: Utilisez vos propres identifiants:"
    echo ""
    echo "   read -p 'Email: ' EMAIL"
    echo "   read -sp 'Password: ' PASSWORD"
    echo "   TOKEN=\$(curl -s -X POST $BASE_URL/auth/login \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d \"{\\\"email\\\":\\\"\$EMAIL\\\",\\\"password\\\":\\\"\$PASSWORD\\\"}\" \\"
    echo "     | jq -r '.accessToken')"
    echo ""
    exit 1
fi

echo "✅ Token obtenu: ${TOKEN:0:20}..."
echo ""

echo "Étape 3️⃣ : Tester la détection de spam"
echo "─────────────────────────────────────"
echo ""

# Test 1: Message normal
echo "Test 1 - Message normal:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$BASE_URL/chat/test/spam-detection" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Bonjour, comment allez-vous ?"}' | jq
echo ""

# Test 2: Message spam
echo "Test 2 - Message spam:"
echo "━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$BASE_URL/chat/test/spam-detection" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "URGENT!!! Click here to win $1000000!!!"}' | jq
echo ""

# Test 3: Statut du service
echo "Test 3 - Statut du service:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X GET "$BASE_URL/chat/test/spam-status" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

echo "╔════════════════════════════════════════════════════════╗"
echo "║                 ✅ Tests terminés !                    ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📱 Pour tester dans Android:"
echo "   1. Ouvrir l'application Android"
echo "   2. Se connecter avec: testspam@example.com / Password123!"
echo "   3. Ouvrir une conversation"
echo "   4. Envoyer: 'CLICK HERE NOW!!!'"
echo "   5. Observer le badge: ⚠️ Spam (XX%)"
echo ""
echo "📖 Documentation:"
echo "   • backend-nest/SPAM_DETECTION_INTEGRATION.md"
echo "   • frontend-android/ANDROID_SPAM_INTEGRATION.md"
echo ""
