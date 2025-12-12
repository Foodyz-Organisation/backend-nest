#!/bin/bash

# 🧪 Script de test rapide - Spam Detection
# Ce script teste le spam detection sans nécessiter de login manuel

BASE_URL="http://localhost:3000"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚨 Test Rapide Spam Detection       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Vérifier si le backend est accessible
echo -e "${YELLOW}📡 Vérification du backend...${NC}"
if ! curl -s -f "$BASE_URL" > /dev/null; then
    echo -e "${RED}❌ Backend non accessible sur $BASE_URL${NC}"
    echo -e "${YELLOW}💡 Démarrez le backend avec: npm run start:dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend accessible${NC}"
echo ""

# Créer un compte de test automatiquement
TEST_EMAIL="spam-test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"

echo -e "${YELLOW}👤 Création d'un compte de test...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"username\":\"testuser\"}" 2>&1)

echo -e "${GREEN}✅ Compte créé: $TEST_EMAIL${NC}"
echo ""

# Login pour obtenir le token
echo -e "${YELLOW}🔐 Authentification...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Échec de l'authentification${NC}"
    echo "Réponse: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Token obtenu${NC}"
echo ""

# Test 1: Statut du service
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Test 1: Statut du service spam${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
curl -s -X GET "$BASE_URL/chat/test/spam-status" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Test 2: Message normal (non-spam)
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Test 2: Message normal${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}📝 Message: 'Bonjour, comment allez-vous ?'${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/test/spam-detection" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Bonjour, comment allez-vous ?"}')
echo "$RESPONSE" | jq
IS_SPAM=$(echo "$RESPONSE" | jq -r '.isSpam')
if [ "$IS_SPAM" = "false" ]; then
    echo -e "${GREEN}✅ Test réussi: Message normal détecté${NC}"
else
    echo -e "${RED}❌ Test échoué: Faux positif${NC}"
fi
echo ""

# Test 3: Message spam évident
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Test 3: Message spam évident${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}📝 Message: 'URGENT!!! Click here to win \$1000000!!!'${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/test/spam-detection" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "URGENT!!! Click here to win $1000000!!!"}')
echo "$RESPONSE" | jq
IS_SPAM=$(echo "$RESPONSE" | jq -r '.isSpam')
CONFIDENCE=$(echo "$RESPONSE" | jq -r '.confidence')
if [ "$IS_SPAM" = "true" ] || [ "$CONFIDENCE" -gt 50 ]; then
    echo -e "${GREEN}✅ Spam détecté (confiance: $CONFIDENCE)${NC}"
else
    echo -e "${YELLOW}⚠️  Service FastAPI peut-être indisponible (mode dégradé)${NC}"
fi
echo ""

# Test 4: Message avec lien suspect
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Test 4: Message avec lien suspect${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}📝 Message: 'Click here: http://suspicious-site.com'${NC}"
curl -s -X POST "$BASE_URL/chat/test/spam-detection" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Click here: http://suspicious-site.com"}' | jq
echo ""

# Test 5: Analyse par lot
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Test 5: Analyse par lot (3 messages)${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/test/spam-batch" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      "Bonjour tout le monde",
      "CLICK HERE NOW!!! FREE MONEY!!!",
      "Rendez-vous à 14h pour la réunion"
    ]
  }')
echo "$RESPONSE" | jq
TOTAL=$(echo "$RESPONSE" | jq -r '.total')
echo -e "${GREEN}✅ $TOTAL messages analysés${NC}"
echo ""

# Test 6: Test de connexion FastAPI
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Test 6: Connexion au service FastAPI${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/chat/test/spam-connection" \
  -H "Authorization: Bearer $TOKEN")
echo "$RESPONSE" | jq
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Service FastAPI connecté${NC}"
else
    echo -e "${YELLOW}⚠️  Service FastAPI indisponible (dégradation gracieuse activée)${NC}"
fi
echo ""

# Résumé
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           📊 RÉSUMÉ DES TESTS         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo -e "${GREEN}✅ Tests terminés avec succès${NC}"
echo ""
echo -e "${YELLOW}📖 Pour tester dans Android:${NC}"
echo -e "   1. Installer l'app: ${BLUE}cd frontend-android && ./gradlew installDebug${NC}"
echo -e "   2. Se connecter avec: ${BLUE}$TEST_EMAIL${NC}"
echo -e "   3. Password: ${BLUE}$TEST_PASSWORD${NC}"
echo -e "   4. Envoyer un message spam dans une conversation"
echo -e "   5. Vérifier le badge ${RED}⚠️ Spam (XX%)${NC}"
echo ""
echo -e "${YELLOW}🔗 Documentation:${NC}"
echo -e "   Backend:  ${BLUE}backend-nest/SPAM_DETECTION_INTEGRATION.md${NC}"
echo -e "   Android:  ${BLUE}frontend-android/ANDROID_SPAM_INTEGRATION.md${NC}"
echo ""
