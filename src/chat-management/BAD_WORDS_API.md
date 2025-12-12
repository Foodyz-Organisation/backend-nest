# Bad Words Detection API

## Vue d'ensemble

Le système de détection des mots inappropriés utilise deux méthodes :

1. **API Gradio** (IA) - Détection avancée par intelligence artificielle
2. **Bibliothèque bad-words** (Local) - Détection locale par liste de mots

Le système utilise automatiquement l'API Gradio en priorité et bascule vers le filtre local si l'API n'est pas disponible.

## Configuration

### Variables d'environnement (.env)

```env
# Mode de détection : 'gradio', 'local', ou 'both' (recommandé)
BAD_WORDS_MODE=both

# URL de l'API Gradio
GRADIO_API_URL=http://127.0.0.1:7860
```

## Fonctionnement

### 1. Détection automatique dans les messages

Lorsqu'un message est envoyé via WebSocket ou HTTP, le système :

1. Analyse le contenu pour détecter les mots inappropriés
2. Modère automatiquement le contenu si nécessaire
3. Sauvegarde les informations suivantes :
   - `hasBadWords`: Boolean - Si des mots inappropriés ont été détectés
   - `moderatedContent`: String - Version modérée du message
   - `detectionMethod`: String - Méthode utilisée ('gradio', 'bad-words-library', ou 'none')

### 2. Architecture du système

```
Message reçu
    ↓
BadWordsDetectionService.moderateMessage()
    ↓
Essai API Gradio (si disponible)
    ↓ (si échec)
Fallback vers bad-words local
    ↓
Message modéré sauvegardé
```

## Endpoints API

### Tester la détection

```http
POST /chat/test/bad-words
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Votre message à tester"
}
```

**Réponse :**
```json
{
  "original": "Message original",
  "moderated": "Message modéré avec **** pour les mots inappropriés",
  "wasModified": true,
  "detectionMethod": "bad-words-library"
}
```

### Vérifier le statut du service

```http
GET /chat/test/gradio-status
Authorization: Bearer <token>
```

**Réponse :**
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

### Ajouter des mots personnalisés

```http
POST /chat/admin/bad-words/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "words": ["mot1", "mot2", "mot3"]
}
```

### Retirer des mots du filtre

```http
POST /chat/admin/bad-words/remove
Authorization: Bearer <token>
Content-Type: application/json

{
  "words": ["mot1", "mot2"]
}
```

## Mots par défaut

Le filtre local inclut :
- Tous les mots de la bibliothèque `bad-words` (anglais)
- Mots français ajoutés : merde, putain, connard, salaud, salope

## Utilisation dans le code

### Dans un service

```typescript
import { BadWordsDetectionService } from './bad-words-detection.service';

constructor(
  private readonly badWordsService: BadWordsDetectionService,
) {}

async processMessage(content: string) {
  const result = await this.badWordsService.moderateMessage(
    content,
    conversationId,
    senderId,
  );
  
  if (result.wasModified) {
    console.log('Message contient des mots inappropriés');
    console.log('Méthode de détection:', result.detectionMethod);
    // Utiliser result.moderatedContent au lieu de content
  }
}
```

### Ajouter des mots personnalisés dynamiquement

```typescript
// Ajouter des mots spécifiques à votre application
this.badWordsService.addCustomWords(['spam1', 'spam2']);

// Retirer des faux positifs
this.badWordsService.removeWords(['hell', 'damn']);

// Utiliser uniquement le filtre local (désactiver Gradio)
this.badWordsService.setLocalFilterOnly(true);
```

## Avantages

### API Gradio (IA)
- ✅ Détection contextuelle
- ✅ Comprend le sens des phrases
- ✅ Détecte les variations et tentatives de contournement
- ❌ Nécessite un serveur externe
- ❌ Latence réseau

### Bibliothèque bad-words (Local)
- ✅ Rapide (pas de latence réseau)
- ✅ Fonctionne hors ligne
- ✅ Configurable facilement
- ✅ Disponible 24/7
- ❌ Basé sur une liste de mots
- ❌ Peut manquer les variations

### Système hybride (Recommandé)
- ✅ Meilleur des deux mondes
- ✅ Fallback automatique si Gradio indisponible
- ✅ Haute disponibilité

## Logs

Le service enregistre toutes les détections :

```
[BadWordsDetectionService] Moderating message from sender: user123
[BadWordsDetectionService] Local filter moderation: wasModified=true
```

ou

```
[BadWordsDetectionService] Gradio API unavailable: Connection refused. Falling back to local filter.
[BadWordsDetectionService] Local filter moderation: wasModified=false
```

## Performance

- **Gradio API** : ~200-500ms (selon le réseau)
- **Filtre local** : <5ms

## Tests

Pour tester le système :

```bash
# Tester avec curl
curl -X POST http://localhost:3000/chat/test/bad-words \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Message avec des mots inappropriés"}'

# Vérifier le statut
curl http://localhost:3000/chat/test/gradio-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Dépannage

### L'API Gradio ne fonctionne pas
- Vérifiez que le serveur Gradio est démarré sur le port 7860
- Le système basculera automatiquement vers le filtre local
- Aucune action requise, le service continue de fonctionner

### Trop de faux positifs
- Utilisez l'endpoint `/chat/admin/bad-words/remove` pour retirer des mots
- Ou configurez des exceptions dans votre code avec `removeWords()`

### Ajouter des mots spécifiques à votre langue
- Utilisez l'endpoint `/chat/admin/bad-words/add`
- Ou modifiez directement le constructeur du service pour ajouter vos mots par défaut
