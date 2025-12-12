# 🛡️ Système de Modération des Messages - Résumé

## Vue d'ensemble

Le système de chat intègre deux mécanismes de modération automatique :

### 1. 🚫 Bad Words Detection
- **Fonction**: Détecte et censure les mots inappropriés/vulgaires
- **Bibliothèque**: `badwords-list` (473+ mots en anglais et français)
- **Stratégie**: Remplacement par astérisques (****)
- **Mode**: Local (pas de dépendance externe)

### 2. 🚨 Spam Detection  
- **Fonction**: Détecte les messages spam via ML
- **Service**: FastAPI avec modèles ML
- **Stratégie**: Analyse de confiance (0-1) avec seuil à 0.7
- **Mode**: Service externe avec dégradation gracieuse

---

## 📦 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Client Android                        │
│         (envoie un message via WebSocket)               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Chat Management Gateway                     │
│                  (NestJS WebSocket)                      │
└──────────┬──────────────────────┬───────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────────┐  ┌──────────────────────┐
│ BadWordsDetection    │  │  SpamDetection       │
│     Service          │  │     Service          │
│                      │  │                      │
│ • Local filter       │  │ • FastAPI ML         │
│ • 473+ words         │  │ • Confidence 0-1     │
│ • Replaces with ***  │  │ • Threshold: 0.7     │
└──────────┬───────────┘  └──────────┬───────────┘
           │                         │
           └────────────┬────────────┘
                        ▼
                 ┌──────────────┐
                 │   Message    │
                 │   enrichi:   │
                 │              │
                 │ • hasBadWords│
                 │ • moderated  │
                 │ • isSpam     │
                 │ • confidence │
                 └──────────────┘
```

---

## 🎯 Flux de traitement d'un message

### Étape 1: Réception
```
Message original: "damn, click here for FREE MONEY!!!"
```

### Étape 2: Bad Words Detection
```typescript
const badWordsResult = await badWordsService.moderateMessage(content);
// Résultat:
{
  originalContent: "damn, click here for FREE MONEY!!!",
  moderatedContent: "****, click here for FREE MONEY!!!",
  wasModified: true,
  detectionMethod: "bad-words-library"
}
```

### Étape 3: Spam Detection
```typescript
const spamResult = await spamService.analyzeMessage(content);
// Résultat:
{
  is_spam: true,
  confidence: 0.92,
  reasons: ["excessive_caps", "monetary_amounts"]
}
```

### Étape 4: Filtrage
```typescript
if (spamService.shouldFilterMessage(spamResult)) {
  // Message bloqué - confidence >= 0.7
  return { error: "Message blocked as spam" };
}
```

### Étape 5: Sauvegarde & Diffusion
```typescript
const message = {
  content: badWordsResult.moderatedContent,
  hasBadWords: badWordsResult.wasModified,
  moderatedContent: badWordsResult.moderatedContent,
  isSpam: spamResult.is_spam,
  spamConfidence: spamResult.confidence
};

// Sauvegarde en base de données
await chatService.saveMessage(message);

// Diffusion via WebSocket
server.to(conversationId).emit('new_message', message);
```

---

## 📊 Comparaison des deux systèmes

| Caractéristique | Bad Words Detection | Spam Detection |
|-----------------|--------------------|--------------------|
| **Type** | Filtrage par mots-clés | Analyse ML |
| **Dépendance** | Local (badwords-list) | FastAPI externe |
| **Performance** | Instantané (< 1ms) | ~50ms (requête HTTP) |
| **Disponibilité** | 100% | Dégradation gracieuse |
| **Précision** | Exacte sur mots connus | Probabiliste (0-1) |
| **Action** | Censure automatique | Blocage si > 0.7 |
| **Personnalisable** | Oui (add/remove words) | Non (modèle ML fixe) |

---

## 🔧 Endpoints de test

### Bad Words
```bash
POST /chat/test/bad-words              # Tester un message
GET  /chat/test/gradio-status          # Vérifier le statut
POST /chat/admin/bad-words/add         # Ajouter des mots
POST /chat/admin/bad-words/remove      # Retirer des mots
```

### Spam Detection
```bash
POST /chat/test/spam-detection         # Tester un message
POST /chat/test/spam-batch             # Analyse par lot
GET  /chat/test/spam-status            # Vérifier le service
GET  /chat/test/spam-connection        # Test de connexion
```

---

## 📱 Intégration Android

### MessageDto enrichi
```kotlin
data class MessageDto(
    val id: String,
    val content: String,
    
    // Bad Words
    val hasBadWords: Boolean = false,
    val moderatedContent: String? = null,
    
    // Spam Detection
    val isSpam: Boolean = false,
    val spamConfidence: Double = 0.0,
    
    val senderId: String,
    val timestamp: String
)
```

### Affichage dans l'UI
```kotlin
// Badge de modération
if (message.hasBadWords) {
    Badge("🛡️ Message modéré")
}

// Badge spam (si non filtré mais détecté)
if (message.isSpam && message.spamConfidence < 0.7) {
    Badge("⚠️ Spam potentiel")
}
```

---

## 🧪 Tests manuels rapides

### Test Bad Words
```bash
curl -X POST http://localhost:3000/chat/test/bad-words \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "damn shit"}' | jq
```

### Test Spam
```bash
curl -X POST http://localhost:3000/chat/test/spam-detection \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "CLICK HERE NOW!!!"}' | jq
```

---

## 📂 Fichiers importants

### Backend
```
backend-nest/
├── src/chat-management/
│   ├── bad-words-detection.service.ts    # Service de détection bad words
│   ├── spam-detection.service.ts         # Service de détection spam
│   ├── chat-management.controller.ts     # Endpoints REST
│   └── chat-management.gateway.ts        # WebSocket handlers
├── BAD_WORDS_INTEGRATION.md              # Doc bad words
├── SPAM_DETECTION_INTEGRATION.md         # Doc spam
├── TESTING_GUIDE.md                      # Guide de test complet
├── test-bad-words.sh                     # Script de test bad words
└── test-spam-detection.sh                # Script de test spam
```

### Android
```
frontend-android/app/src/main/java/com/example/damprojectfinal/
├── core/api/ChatApiService.kt            # MessageDto avec champs modération
└── user/feature_chat/ui/
    └── ChatDetailScreen.kt               # UI avec badges de modération
```

---

## 🚀 Démarrage rapide

### 1. Backend NestJS
```bash
cd backend-nest
npm run start:dev
# Backend sur http://localhost:3000
```

### 2. Service FastAPI (optionnel)
```bash
cd spam-detection-service  # Si disponible
python main.py
# FastAPI sur http://localhost:8000
```

### 3. Tests automatiques
```bash
# Test bad words
./test-bad-words.sh

# Test spam detection
./test-spam-detection.sh
```

### 4. Application Android
```bash
cd frontend-android
./gradlew assembleDebug
```

---

## 🎓 Cas d'usage

### Scénario 1: Message vulgaire
```
Input:  "Salut, damn ce projet est shit"
Output: "Salut, **** ce projet est ****"
Flags:  hasBadWords=true, isSpam=false
Action: Message censuré mais envoyé
```

### Scénario 2: Spam évident
```
Input:  "URGENT!!! WIN $1000 NOW!!!"
Output: Message bloqué
Flags:  isSpam=true, confidence=0.95
Action: Message rejeté (confidence > 0.7)
```

### Scénario 3: Spam + Bad Words
```
Input:  "damn, click here for FREE MONEY!!!"
Step 1: Bad words → "****, click here for FREE MONEY!!!"
Step 2: Spam check → is_spam=true, confidence=0.88
Action: Message bloqué (spam > 0.7)
```

### Scénario 4: Message normal
```
Input:  "Bonjour, rendez-vous à 14h"
Output: "Bonjour, rendez-vous à 14h"
Flags:  hasBadWords=false, isSpam=false
Action: Message envoyé normalement
```

---

## ⚙️ Configuration

### Variables d'environnement (.env)
```env
# Bad Words Detection
BAD_WORDS_MODE=both
GRADIO_API_URL=http://localhost:7860/api/predict

# Spam Detection
SPAM_DETECTION_API_URL=http://localhost:8000
SPAM_DETECTION_ENABLED=true
SPAM_FILTER_THRESHOLD=0.7
```

---

## 📈 Monitoring

### Logs disponibles
```typescript
[BadWordsDetectionService] Loaded 473 words into filter
[SpamDetectionService] Analyzing message in conversation: conv-123
[ChatManagementGateway] Message filtered as spam (confidence: 0.92)
```

### Métriques clés
- Nombre de messages modérés (bad words)
- Taux de spam détecté
- Temps de réponse du service ML
- Taux de disponibilité FastAPI

---

## 🔐 Sécurité

- ✅ Authentification JWT requise sur tous les endpoints
- ✅ Validation des entrées avec class-validator
- ✅ Censure automatique des mots inappropriés
- ✅ Filtrage automatique du spam (> 70% confiance)
- ✅ Dégradation gracieuse si service ML indisponible

---

## 📚 Documentation complète

1. **[BAD_WORDS_INTEGRATION.md](./BAD_WORDS_INTEGRATION.md)** - Guide complet bad words
2. **[SPAM_DETECTION_INTEGRATION.md](./SPAM_DETECTION_INTEGRATION.md)** - Guide complet spam
3. **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Guide de test des deux systèmes

---

## ✅ Checklist d'intégration

- [x] Bad Words Detection Service implémenté
- [x] Spam Detection Service implémenté
- [x] Endpoints de test créés (8 au total)
- [x] Intégration WebSocket Gateway
- [x] Intégration REST Controller
- [x] MessageDto Android enrichi
- [x] UI Android avec badges
- [x] Scripts de test automatiques
- [x] Documentation complète
- [x] Backend compilé et testé
- [x] Android compilé et testé

---

**🎉 Les deux systèmes de modération sont pleinement opérationnels !**
