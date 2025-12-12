# 🧪 Guide de Test - API Bad Words & Spam Detection

## Pré-requis
- Backend NestJS démarré sur http://localhost:3000
- Service FastAPI (spam) démarré sur http://localhost:8000 (optionnel)
- Un compte utilisateur existant dans la base de données

## Méthode 1: Script automatique (Le plus simple)

```bash
cd backend-nest
./test-bad-words.sh
```

Le script va :
1. Vous demander vos identifiants
2. Obtenir automatiquement le token JWT
3. Lancer 6 tests différents
4. Afficher les résultats en couleur

---

## Méthode 2: Tests manuels avec curl

### Étape 1: Obtenir un token JWT

```bash
# Remplacez EMAIL et PASSWORD par vos identifiants
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"votre.email@example.com","password":"votrepassword"}' \
  | grep -o '"accessToken":"[^"]*' \
  | cut -d'"' -f4)

# Afficher le token pour vérifier
echo "Token: $TOKEN"
```

### Étape 2: Tests de l'API

#### Test 1: Vérifier le statut des services

```bash
curl -X GET http://localhost:3000/chat/test/gradio-status \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Résultat attendu:**
```json
{
  "gradioApi": {
    "available": false,
    "status": "offline"
  },
  "localFilter": {
    "available": true,
    "status": "active"
  }
}
```

#### Test 2: Message propre (sans mots inappropriés)

```bash
curl -X POST http://localhost:3000/chat/test/bad-words \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Bonjour, comment allez-vous ?"}' | jq
```

**Résultat attendu:**
```json
{
  "original": "Bonjour, comment allez-vous ?",
  "moderated": "Bonjour, comment allez-vous ?",
  "wasModified": false,
  "detectionMethod": "bad-words-library"
}
```

#### Test 3: Message avec mots inappropriés (anglais)

```bash
curl -X POST http://localhost:3000/chat/test/bad-words \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "This is a damn stupid message"}' | jq
```

**Résultat attendu:**
```json
{
  "original": "This is a damn stupid message",
  "moderated": "This is a **** ****** message",
  "wasModified": true,
  "detectionMethod": "bad-words-library"
}
```

#### Test 4: Message avec mots inappropriés (français)

```bash
curl -X POST http://localhost:3000/chat/test/bad-words \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Ce message contient putain et merde"}' | jq
```

**Résultat attendu:**
```json
{
  "original": "Ce message contient putain et merde",
  "moderated": "Ce message contient ****** et *****",
  "wasModified": true,
  "detectionMethod": "bad-words-library"
}
```

#### Test 5: Ajouter des mots personnalisés

```bash
curl -X POST http://localhost:3000/chat/admin/bad-words/add \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"words": ["spam", "arnaque", "scam"]}' | jq
```

**Résultat attendu:**
```json
{
  "success": true,
  "message": "Added 3 custom words to filter"
}
```

#### Test 6: Vérifier la détection des mots ajoutés

```bash
curl -X POST http://localhost:3000/chat/test/bad-words \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Ceci est une arnaque spam"}' | jq
```

**Résultat attendu:**
```json
{
  "original": "Ceci est une arnaque spam",
  "moderated": "Ceci est une ******* ****",
  "wasModified": true,
  "detectionMethod": "bad-words-library"
}
```

#### Test 7: Retirer des mots du filtre

```bash
curl -X POST http://localhost:3000/chat/admin/bad-words/remove \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"words": ["damn", "hell"]}' | jq
```

**Résultat attendu:**
```json
{
  "success": true,
  "message": "Removed 2 words from filter"
}
```

---

## Méthode 3: Tests avec Postman

1. Importer la collection : `backend-nest/postman-bad-words.json`
2. Configurer les variables :
   - `base_url` : http://localhost:3000
   - `access_token` : Votre token JWT
3. Exécuter les requêtes dans l'ordre

---

## Méthode 4: Test en situation réelle (via l'app Android)

1. Ouvrir l'application Android
2. Aller dans le chat
3. Envoyer un message contenant des mots inappropriés
4. Le message sera automatiquement modéré côté backend
5. Vérifier dans les logs du backend :

```bash
[BadWordsDetectionService] Moderating message from sender: user123
[BadWordsDetectionService] Local filter moderation: wasModified=true
[ChatManagementController] Message moderation: has_bad_words=true
```

---

## Mots de test

### Mots anglais détectés (exemples)
- damn, hell, shit, fuck, ass, crap, stupid, idiot
- bitch, bastard, asshole, dickhead
- Plus de 400 autres...

### Mots français détectés
- merde, putain, connard, salaud, salope
- enculé, connasse, con, conne, bordel
- chier, foutre, bite, couille, pute
- batard, bâtard, niquer, nique, pd, fdp, ntm

---

## Dépannage

### Erreur: "Unauthorized" ou 401
**Cause:** Token JWT invalide ou expiré  
**Solution:** Reconnectez-vous pour obtenir un nouveau token

```bash
# Obtenir un nouveau token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"EMAIL","password":"PASSWORD"}' \
  | grep -o '"accessToken":"[^"]*' \
  | cut -d'"' -f4)
```

### Le backend ne répond pas
**Solution:** Vérifier qu'il est démarré

```bash
cd backend-nest
npm run start:dev
```

### Les mots français ne sont pas détectés
**Solution:** Vérifier que les mots sont bien ajoutés au démarrage du service

Logs à chercher :
```
[BadWordsDetectionService] Bad words detection service initialized with 473 words in filter
```

---

## Vérification des logs

Pour voir les logs en temps réel pendant les tests :

```bash
# Dans un autre terminal
cd backend-nest
tail -f logs/application.log  # Si les logs sont configurés
```

Ou regarder directement la sortie du terminal où le backend tourne.

---

## Résultats attendus

| Test | Entrée | Sortie attendue | wasModified |
|------|--------|-----------------|-------------|
| Message propre | "Bonjour" | "Bonjour" | false |
| Mot anglais | "damn" | "****" | true |
| Mot français | "putain" | "******" | true |
| Mots multiples | "damn shit" | "**** ****" | true |
| Mot personnalisé | "spam" | "****" | true |

---

## Commandes rapides

```bash
# Token + Test rapide en une commande
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"votre@email.com","password":"password"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4) && \
curl -X POST http://localhost:3000/chat/test/bad-words \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test putain"}' | jq
```

---

## 🚨 Tests Spam Detection

### Étape 1: Vérifier le service de spam

```bash
curl -X GET http://localhost:3000/chat/test/spam-status \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Résultat attendu:**
```json
{
  "spamDetectionService": {
    "available": true,
    "status": "online",
    "endpoint": "http://localhost:8000",
    "lastCheck": "2024-01-15T10:30:45.123Z"
  },
  "filterThreshold": 0.7,
  "testConnection": true
}
```

### Étape 2: Tester un message spam

```bash
curl -X POST http://localhost:3000/chat/test/spam-detection \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "URGENT!!! Click here to win $1000000!!!"}' | jq
```

**Résultat attendu:**
```json
{
  "content": "URGENT!!! Click here to win $1000000!!!",
  "isSpam": true,
  "confidence": 0.95,
  "isFiltered": true,
  "reasons": ["excessive_caps", "suspicious_link", "monetary_amounts"]
}
```

### Étape 3: Tester un message normal

```bash
curl -X POST http://localhost:3000/chat/test/spam-detection \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Bonjour, comment vas-tu ?"}' | jq
```

**Résultat attendu:**
```json
{
  "content": "Bonjour, comment vas-tu ?",
  "isSpam": false,
  "confidence": 0.05,
  "isFiltered": false,
  "reasons": []
}
```

### Étape 4: Analyse par lot

```bash
curl -X POST http://localhost:3000/chat/test/spam-batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      "Bonjour tout le monde",
      "CLICK HERE NOW!!! FREE MONEY!!!",
      "Rendez-vous à 14h"
    ]
  }' | jq
```

### Étape 5: Tester la connexion FastAPI

```bash
curl -X GET http://localhost:3000/chat/test/spam-connection \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 📊 Tableau récapitulatif

### Bad Words Detection

| Test | Entrée | Sortie attendue | wasModified |
|------|--------|-----------------|-------------|
| Message propre | "Bonjour" | "Bonjour" | false |
| Mot anglais | "damn" | "****" | true |
| Mot français | "putain" | "******" | true |
| Mots multiples | "damn shit" | "**** ****" | true |

### Spam Detection

| Test | Entrée | isSpam | confidence | isFiltered |
|------|--------|--------|-----------|-----------|
| Message normal | "Bonjour" | false | < 0.3 | false |
| Spam évident | "FREE MONEY!!!" | true | > 0.9 | true |
| Spam modéré | "Click here now" | true | 0.6-0.7 | false |

---

## 🔗 Script de test automatique complet

Créez un fichier `test-all.sh` :

```bash
#!/bin/bash

echo "🔐 Login..."
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo ""
echo "🛡️ Test Bad Words..."
curl -s -X POST http://localhost:3000/chat/test/bad-words \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test damn word"}' | jq

echo ""
echo "🚨 Test Spam Detection..."
curl -s -X POST http://localhost:3000/chat/test/spam-detection \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "CLICK HERE NOW!!!"}' | jq

echo ""
echo "✅ Tests terminés!"
```

---

**✅ L'API est fonctionnelle si :**
- Bad Words: `wasModified: true` pour les mots inappropriés
- Spam Detection: `isSpam: true` et `confidence > 0.7` pour les messages spam
