# 🛡️ Intégration Spam Detection API - Feature Chat

## 📋 Vue d'ensemble

Le système de détection de spam utilise un service FastAPI avec des modèles ML pour analyser les messages et détecter le contenu spam automatiquement.

## 🏗️ Architecture

### Service Backend
- **Fichier**: `src/chat-management/spam-detection.service.ts`
- **Service externe**: FastAPI sur `http://localhost:8000`
- **Stratégie**: Analyse ML avec dégradation gracieuse
- **Seuil de filtrage**: 0.7 (70% de confiance)

### Fonctionnalités principales

1. **Analyse de message unique** - `analyzeMessage()`
2. **Analyse par lot** - `analyzeMessagesBatch()`
3. **Filtrage automatique** - `shouldFilterMessage()`
4. **Vérification de statut** - `getStatus()`
5. **Test de connexion** - `testConnection()`

## 🔧 Configuration

### Variables d'environnement (.env)

```env
# Spam Detection Configuration
SPAM_DETECTION_API_URL=http://localhost:8000
SPAM_DETECTION_ENABLED=true
SPAM_FILTER_THRESHOLD=0.7
```

### Service FastAPI

Le service doit être démarré sur le port 8000 avec les endpoints suivants :
- `POST /detect` - Analyse un message unique
- `POST /detect/batch` - Analyse plusieurs messages

## 📡 Endpoints API de Test

### 1. Tester la détection de spam

```bash
POST /chat/test/spam-detection
Content-Type: application/json

{
  "content": "URGENT!!! Click here to win $1000000!!!"
}
```

**Réponse:**
```json
{
  "content": "URGENT!!! Click here to win $1000000!!!",
  "isSpam": true,
  "confidence": 0.95,
  "isFiltered": true,
  "reasons": ["excessive_caps", "suspicious_link", "monetary_amounts"],
  "metadata": {
    "model": "spam_classifier_v2",
    "processingTime": 45
  }
}
```

### 2. Analyse par lot

```bash
POST /chat/test/spam-batch
Content-Type: application/json

{
  "messages": [
    "Bonjour, comment allez-vous ?",
    "CLICK HERE NOW!!! FREE MONEY!!!",
    "Rendez-vous à 14h pour la réunion"
  ]
}
```

**Réponse:**
```json
{
  "total": 3,
  "results": [
    {
      "message": "Bonjour, comment allez-vous ?",
      "isSpam": false,
      "confidence": 0.05,
      "isFiltered": false
    },
    {
      "message": "CLICK HERE NOW!!! FREE MONEY!!!",
      "isSpam": true,
      "confidence": 0.98,
      "isFiltered": true
    },
    {
      "message": "Rendez-vous à 14h pour la réunion",
      "isSpam": false,
      "confidence": 0.12,
      "isFiltered": false
    }
  ]
}
```

### 3. Vérifier le statut du service

```bash
GET /chat/test/spam-status
```

**Réponse:**
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

### 4. Tester la connexion

```bash
GET /chat/test/spam-connection
```

**Réponse:**
```json
{
  "success": true,
  "message": "FastAPI Spam Detection service is reachable",
  "endpoint": "http://localhost:8000/detect",
  "responseTime": 42
}
```

## 🚀 Intégration automatique

### Dans le contrôleur (REST API)

Le spam est détecté automatiquement lors de l'envoi de messages via POST :

```typescript
// src/chat-management/chat-management.controller.ts
@Post('conversations/:id/messages')
async sendMessage(
  @Param('id') conversationId: string,
  @Body() messageData: any,
  @Req() req: any,
) {
  // 🛡️ Analyse anti-spam automatique
  const spamResult = await this.spamDetectionService.analyzeMessage(
    messageData.content,
    conversationId,
    userId,
  );

  // Enregistre les métadonnées de spam dans le message
  const message = {
    ...messageData,
    isSpam: spamResult.is_spam,
    spamConfidence: spamResult.confidence,
  };

  return this.chatService.sendMessage(conversationId, message, userId);
}
```

### Dans le Gateway (WebSocket)

```typescript
// src/chat-management/chat-management.gateway.ts
@SubscribeMessage('send_message')
async handleMessage(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: any,
) {
  // 🛡️ Analyse anti-spam en temps réel
  const spamResult = await this.spamDetectionService.analyzeMessage(
    data.content,
    data.conversationId,
    userId,
  );

  // Filtrage automatique si spam détecté
  if (this.spamDetectionService.shouldFilterMessage(spamResult)) {
    this.server.to(client.id).emit('spam_detected', {
      message: 'Your message was blocked as spam',
      confidence: spamResult.confidence,
    });
    return;
  }

  // Message envoyé avec métadonnées
  const message = await this.chatService.sendMessage(
    data.conversationId,
    {
      ...data,
      isSpam: spamResult.is_spam,
      spamConfidence: spamResult.confidence,
    },
    userId,
  );

  this.server.to(data.conversationId).emit('new_message', message);
}
```

## 🎯 Logique de filtrage

### Seuil de détection

```typescript
shouldFilterMessage(result: SpamAnalysisResult): boolean {
  return result.is_spam && result.confidence >= 0.7;
}
```

- **Confiance < 0.7**: Message autorisé avec flag `isSpam`
- **Confiance ≥ 0.7**: Message bloqué automatiquement

### Dégradation gracieuse

Si le service FastAPI est indisponible :
- Les messages sont autorisés (`is_spam = false`)
- Le système continue de fonctionner normalement
- Un log d'avertissement est généré

```typescript
async analyzeMessage(content: string): Promise<SpamAnalysisResult> {
  try {
    const response = await axios.post(
      `${this.apiUrl}/detect`,
      { text: content },
      { timeout: 5000 }
    );
    return response.data;
  } catch (error) {
    this.logger.warn('Spam detection service unavailable, allowing message');
    return {
      is_spam: false,
      confidence: 0,
      reasons: [],
      metadata: { fallback: true }
    };
  }
}
```

## 📊 Monitoring

### Logs de détection

```
[SpamDetectionService] Analyzing message in conversation: conv-123
[SpamDetectionService] Spam detected! Confidence: 0.95
[SpamDetectionService] Message filtered: true
```

### Métriques disponibles

- Nombre de messages analysés
- Taux de spam détecté
- Temps de réponse du service ML
- Taux de disponibilité du service

## 🔗 Intégration avec Android

Les messages reçus par Android incluent automatiquement :

```kotlin
data class MessageDto(
    val id: String,
    val content: String,
    val isSpam: Boolean = false,           // ✅ Flag spam
    val spamConfidence: Double = 0.0,      // ✅ Confiance (0-1)
    val timestamp: String
)
```

## 🧪 Tests manuels

### Test de messages spam typiques

```bash
# Spam avec liens
curl -X POST http://localhost:3000/chat/test/spam-detection \
  -H "Content-Type: application/json" \
  -d '{"content":"Click here: http://suspicious.com"}'

# Spam avec caps lock
curl -X POST http://localhost:3000/chat/test/spam-detection \
  -H "Content-Type: application/json" \
  -d '{"content":"URGENT!!! FREE MONEY NOW!!!"}'

# Message normal
curl -X POST http://localhost:3000/chat/test/spam-detection \
  -H "Content-Type: application/json" \
  -d '{"content":"Bonjour, comment allez-vous ?"}'
```

## ⚙️ Configuration avancée

### Ajuster le seuil de filtrage

```typescript
// Dans spam-detection.service.ts
private readonly FILTER_THRESHOLD = 0.7; // Modifier selon besoin

// 0.5 = Plus strict (plus de messages bloqués)
// 0.9 = Plus permissif (moins de messages bloqués)
```

### Désactiver le filtrage automatique

```env
# Dans .env
SPAM_DETECTION_ENABLED=false
```

## 📝 Résumé

✅ Service FastAPI sur port 8000
✅ Détection ML avec confiance 0-1
✅ Filtrage automatique à 70% de confiance
✅ Dégradation gracieuse si service indisponible
✅ 4 endpoints de test disponibles
✅ Intégration REST + WebSocket
✅ Métadonnées spam dans tous les messages
✅ Support Android intégré

## 🔗 Liens utiles

- [Guide de test complet](./TESTING_GUIDE.md)
- [Documentation Bad Words](./BAD_WORDS_INTEGRATION.md)
- [README principal](./README.md)
