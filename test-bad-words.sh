#!/bin/bash

# 🧪 Script de test pour l'API Bad Words
# Usage: ./test-bad-words.sh

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🧪 Test de l'API Bad Words Detection${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Fonction pour login et obtenir le token
get_token() {
    echo -e "${YELLOW}📝 Étape 1: Se connecter pour obtenir le token JWT${NC}"
    echo -e "Entrez votre email:"
    read EMAIL
    echo -e "Entrez votre mot de passe:"
    read -s PASSWORD
    
    echo -e "\n${YELLOW}🔐 Connexion en cours...${NC}"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
    
    TOKEN=$(echo $RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        echo -e "${RED}❌ Erreur de connexion. Vérifiez vos identifiants.${NC}"
        echo -e "${RED}Réponse: $RESPONSE${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Token obtenu avec succès!${NC}\n"
}

# Test 1: Vérifier le statut
test_status() {
    echo -e "${YELLOW}📊 Test 1: Vérification du statut des services${NC}"
    
    RESPONSE=$(curl -s -X GET "$BASE_URL/chat/test/gradio-status" \
        -H "Authorization: Bearer $TOKEN")
    
    echo -e "${BLUE}Réponse:${NC}"
    echo $RESPONSE | python3 -m json.tool 2>/dev/null || echo $RESPONSE
    echo -e ""
}

# Test 2: Tester un message propre
test_clean_message() {
    echo -e "${YELLOW}✅ Test 2: Message propre (sans mots inappropriés)${NC}"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/chat/test/bad-words" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"content": "Bonjour, comment allez-vous ?"}')
    
    echo -e "${BLUE}Réponse:${NC}"
    echo $RESPONSE | python3 -m json.tool 2>/dev/null || echo $RESPONSE
    echo -e ""
}

# Test 3: Tester un message avec mots inappropriés (anglais)
test_bad_words_english() {
    echo -e "${YELLOW}🚫 Test 3: Message avec mots inappropriés (anglais)${NC}"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/chat/test/bad-words" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"content": "This is a damn stupid message"}')
    
    echo -e "${BLUE}Réponse:${NC}"
    echo $RESPONSE | python3 -m json.tool 2>/dev/null || echo $RESPONSE
    echo -e ""
}

# Test 4: Tester un message avec mots inappropriés (français)
test_bad_words_french() {
    echo -e "${YELLOW}🚫 Test 4: Message avec mots inappropriés (français)${NC}"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/chat/test/bad-words" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"content": "Ce message contient putain et merde"}')
    
    echo -e "${BLUE}Réponse:${NC}"
    echo $RESPONSE | python3 -m json.tool 2>/dev/null || echo $RESPONSE
    echo -e ""
}

# Test 5: Ajouter des mots personnalisés
test_add_custom_words() {
    echo -e "${YELLOW}➕ Test 5: Ajouter des mots personnalisés${NC}"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/chat/admin/bad-words/add" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"words": ["spam", "arnaque", "scam"]}')
    
    echo -e "${BLUE}Réponse:${NC}"
    echo $RESPONSE | python3 -m json.tool 2>/dev/null || echo $RESPONSE
    echo -e ""
}

# Test 6: Vérifier que les mots ajoutés sont détectés
test_custom_words_detection() {
    echo -e "${YELLOW}🔍 Test 6: Vérifier la détection des mots personnalisés${NC}"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/chat/test/bad-words" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"content": "Ceci est une arnaque spam"}')
    
    echo -e "${BLUE}Réponse:${NC}"
    echo $RESPONSE | python3 -m json.tool 2>/dev/null || echo $RESPONSE
    echo -e ""
}

# Exécution des tests
get_token
test_status
test_clean_message
test_bad_words_english
test_bad_words_french
test_add_custom_words
test_custom_words_detection

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Tous les tests sont terminés !${NC}"
echo -e "${BLUE}========================================${NC}"
