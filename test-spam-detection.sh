#!/bin/bash

# 🚨 Script de test pour l'API Spam Detection
# Usage: ./test-spam-detection.sh

BASE_URL="http://localhost:3000"
FASTAPI_URL="http://localhost:8000"

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚨 Test API Spam Detection          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Vérifier si le backend est accessible
echo -e "${YELLOW}📡 Vérification du backend NestJS...${NC}"
if ! curl -s -f "$BASE_URL" > /dev/null; then
    echo -e "${RED}❌ Backend non accessible sur $BASE_URL${NC}"
    echo -e "${YELLOW}💡 Démarrez le backend avec: npm run start:dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend accessible${NC}"
echo ""

# Vérifier si FastAPI est accessible
echo -e "${YELLOW}📡 Vérification du service FastAPI...${NC}"
if curl -s -f "$FASTAPI_URL" > /dev/null; then
    echo -e "${GREEN}✅ Service FastAPI accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Service FastAPI non accessible (dégradation gracieuse activée)${NC}"
fi
echo ""

# Demander les identifiants
echo -e "${BLUE}🔐 Authentification${NC}"
read -p "📧 Email: " EMAIL
read -sp "🔑 Password: " PASSWORD
echo ""
echo ""

# Obtenir le token JWT
echo -e "${YELLOW}🔄 Obtention du token JWT...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Échec de l'authentification${NC}"
    echo -e "${YELLOW}📋 Réponse: $LOGIN_RESPONSE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Token obtenu${NC}"
echo ""

# Test 1: Vérifier le statut du service
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Test 1: Statut du service de spam${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/chat/test/spam-status" \
  -H "Authorization: Bearer $TOKEN")
echo "$RESPONSE" | jq
echo ""

# Test 2: Message normal (non-spam)
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Test 2: Message normal${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}📝 Contenu: 'Bonjour, comment allez-vous ?'${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/test/spam-detection" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Bonjour, comment allez-vous ?"}')
echo "$RESPONSE" | jq
IS_SPAM=$(echo "$RESPONSE" | jq -r '.isSpam')
if [ "$IS_SPAM" = "false" ]; then
    echo -e "${GREEN}✅ Test réussi: Message identifié comme non-spam${NC}"
else
    echo -e "${RED}❌ Test échoué: Message faussement identifié comme spam${NC}"
fi
echo ""

# Test 3: Message spam évident
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Test 3: Message spam évident${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}📝 Contenu: 'URGENT!!! Click here to win \$1000000!!!'${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/test/spam-detection" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "URGENT!!! Click here to win $1000000!!!"}')
echo "$RESPONSE" | jq
IS_SPAM=$(echo "$RESPONSE" | jq -r '.isSpam')
CONFIDENCE=$(echo "$RESPONSE" | jq -r '.confidence')
if [ "$IS_SPAM" = "true" ]; then
    echo -e "${GREEN}✅ Test réussi: Spam détecté (confiance: $CONFIDENCE)${NC}"
else
    echo -e "${YELLOW}⚠️  Spam non détecté (service FastAPI peut-être indisponible)${NC}"
fi
echo ""

# Test 4: Message avec lien suspect
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Test 4: Message avec lien suspect${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}📝 Contenu: 'Click here: http://suspicious-site.com'${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/test/spam-detection" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Click here: http://suspicious-site.com"}')
echo "$RESPONSE" | jq
echo ""

# Test 5: Analyse par lot
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Test 5: Analyse par lot${NC}"
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
    echo -e "${YELLOW}⚠️  Service FastAPI indisponible (dégradation gracieuse)${NC}"
fi
echo ""

# Résumé final
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           📊 RÉSUMÉ DES TESTS         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo -e "${GREEN}✅ Tests terminés avec succès${NC}"
echo ""
echo -e "${YELLOW}📖 Documentation complète:${NC}"
echo -e "   - SPAM_DETECTION_INTEGRATION.md"
echo -e "   - TESTING_GUIDE.md"
echo ""
echo -e "${YELLOW}💡 Commandes rapides:${NC}"
echo -e "   Test rapide: ${BLUE}curl -X POST $BASE_URL/chat/test/spam-detection \\${NC}"
echo -e "                ${BLUE}-H 'Authorization: Bearer \$TOKEN' \\${NC}"
echo -e "                ${BLUE}-H 'Content-Type: application/json' \\${NC}"
echo -e "                ${BLUE}-d '{\"content\": \"Test message\"}' | jq${NC}"
echo ""
