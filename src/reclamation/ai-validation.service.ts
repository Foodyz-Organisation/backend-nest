import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

interface ImageAnalysis {
  labels: string[];
  qualityScore: number;
  issues: string[];
}

interface TextAnalysisResult {
  sentiment: string;
  severity: string;
  keywords: string[];
  confidence: number;
  reasoning: string;
}

interface AIValidationResult {
  isValid: boolean;
  confidenceScore: number;
  imageAnalysis: {
    detectedObjects: string[];
    foodQualityScore: number;
    issuesDetected: string[];
  };
  textAnalysis: {
    sentiment: string;
    keywords: string[];
    severity: string;
  };
  matchScore: number;
  recommendation: string;
  processedAt: Date;
}

@Injectable()
export class AiValidationService {
  private readonly logger = new Logger(AiValidationService.name);
  private readonly visionClient: ImageAnnotatorClient;
  private readonly gemini: GoogleGenerativeAI;
  private readonly useVisionAPI: boolean;
  private workingModel: string | null = null;

  // ✅ CORRECTION: Noms de modèles Gemini à jour (décembre 2024)
  private readonly MODELS_TO_TRY = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-002',
    'gemini-1.5-pro-002',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
  ];

  constructor() {
    // Vérifier les variables d'environnement
    if (!process.env.GEMINI_API_KEY) {
      this.logger.error('❌ GEMINI_API_KEY manquante dans .env');
      throw new Error('GEMINI_API_KEY manquante dans .env');
    }

    this.logger.log(`🔑 GEMINI_API_KEY trouvée (${process.env.GEMINI_API_KEY.substring(0, 10)}...)`);

    // ✅ FIX 1: Vision API avec credentials file
    this.useVisionAPI = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (this.useVisionAPI) {
      try {
        this.visionClient = new ImageAnnotatorClient({
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        });
        this.logger.log('✅ Vision API initialisée avec credentials');
      } catch (error) {
        this.logger.warn('⚠️ Vision API non disponible, utilisation de Gemini uniquement');
        this.useVisionAPI = false;
      }
    } else {
      this.logger.warn('⚠️ GOOGLE_APPLICATION_CREDENTIALS non défini, Vision API désactivée');
    }

    // ✅ FIX 2: Initialiser Gemini
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.testGeminiModel(); // Test async (ne bloque pas le démarrage)
  }

  /**
   * 🧪 Teste quel modèle fonctionne avec l'API key
   */
  private async testGeminiModel(): Promise<void> {
    this.logger.log('🧪 Test des modèles Gemini...');
    this.logger.log(`🔑 Clé API: ${process.env.GEMINI_API_KEY?.substring(0, 20)}...`);

    // ✅ D'abord, lister les modèles disponibles
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const availableModels = data.models
          ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.replace('models/', '')) || [];
        
        if (availableModels.length > 0) {
          this.logger.log(`📋 Modèles disponibles: ${availableModels.join(', ')}`);
          
          // Tester le premier modèle disponible
          for (const modelName of availableModels) {
            if (await this.testSingleModel(modelName)) {
              return;
            }
          }
        }
      } else {
        this.logger.warn(`⚠️ Impossible de lister les modèles: ${response.status}`);
      }
    } catch (error: any) {
      this.logger.warn(`⚠️ Erreur lors du listing: ${error.message}`);
    }

    // Fallback: tester les modèles connus
    for (const modelName of this.MODELS_TO_TRY) {
      if (await this.testSingleModel(modelName)) {
        return;
      }
    }

    this.logger.error('❌ Aucun modèle Gemini disponible!');
    this.logger.error('   Causes possibles:');
    this.logger.error('   1. ❌ Votre clé API n\'est PAS une clé Gemini');
    this.logger.error('   2. ❌ L\'API Gemini n\'est pas activée pour cette clé');
    this.logger.error('   3. ❌ La clé est expirée ou invalide');
    this.logger.error('');
    this.logger.error('   Solutions:');
    this.logger.error('   1. Allez sur: https://aistudio.google.com/app/apikey');
    this.logger.error('   2. Créez une NOUVELLE clé API');
    this.logger.error('   3. Remplacez GEMINI_API_KEY dans votre .env');
    this.logger.error('   4. Redémarrez le serveur');
  }

  /**
   * 🧪 Teste un modèle spécifique
   */
  private async testSingleModel(modelName: string): Promise<boolean> {
    try {
      this.logger.log(`   Essai: ${modelName}...`);
      const model = this.gemini.getGenerativeModel({ model: modelName });

      // Test simple avec timeout
      const result = await Promise.race([
        model.generateContent('Hi'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]) as any;

      const text = result.response?.text();

      if (text && text.length > 0) {
        this.workingModel = modelName;
        this.logger.log(`✅ Gemini modèle validé: ${modelName}`);
        return true;
      }
    } catch (error: any) {
      this.logger.warn(`   ⚠️ ${modelName}: ${error.message}`);
    }
    return false;
  }

  /**
   * ✅ Analyse une réclamation avec IA
   */
  async validateReclamation(
    description: string,
    complaintType: string,
    imagePaths: string[]
  ): Promise<AIValidationResult> {
    try {
      this.logger.log('🤖 Début analyse IA...');

      // ✅ NOUVEAU: Si aucun modèle disponible, utiliser le mode fallback
      if (!this.workingModel) {
        this.logger.warn('⚠️ Aucun modèle IA disponible, utilisation du mode fallback');
        return this.createFallbackValidation(description, complaintType, imagePaths);
      }

      // 1️⃣ Analyser les images
      const imageAnalysis = this.useVisionAPI
        ? await this.analyzeImagesWithVision(imagePaths)
        : await this.analyzeImagesWithGemini(imagePaths);

      // 2️⃣ Analyser le texte et comparer avec Gemini
      const textAnalysis = await this.analyzeTextWithGemini(
        description,
        complaintType,
        imageAnalysis
      );

      // 3️⃣ Calculer le score de cohérence
      const matchScore = this.calculateMatchScore(imageAnalysis, textAnalysis);

      // 4️⃣ Décision finale
      const isValid = matchScore >= 60 && textAnalysis.severity !== 'low';
      const confidenceScore = Math.round((matchScore + textAnalysis.confidence) / 2);

      const result: AIValidationResult = {
        isValid,
        confidenceScore,
        imageAnalysis: {
          detectedObjects: imageAnalysis.labels,
          foodQualityScore: imageAnalysis.qualityScore,
          issuesDetected: imageAnalysis.issues,
        },
        textAnalysis: {
          sentiment: textAnalysis.sentiment,
          keywords: textAnalysis.keywords,
          severity: textAnalysis.severity,
        },
        matchScore,
        recommendation: this.generateRecommendation(isValid, confidenceScore, matchScore),
        processedAt: new Date(),
      };

      this.logger.log(`✅ Analyse terminée: ${isValid ? 'VALIDE' : 'INVALIDE'} (${confidenceScore}%)`);
      return result;

    } catch (error) {
      this.logger.error('❌ Erreur analyse IA:', error);
      // En cas d'erreur, utiliser le fallback
      return this.createFallbackValidation(description, complaintType, imagePaths);
    }
  }

  /**
   * 🔄 Validation de secours (sans IA)
   */
  private createFallbackValidation(
    description: string,
    complaintType: string,
    imagePaths: string[]
  ): AIValidationResult {
    this.logger.log('🔄 Utilisation du mode fallback (sans IA)');

    // Analyse basique par mots-clés
    const negativeWords = ['mauvais', 'froid', 'brûlé', 'cru', 'sale', 'manquant', 'abîmé', 'pourri', 'dégoûtant'];
    const severityWords = ['très', 'extrêmement', 'complètement', 'totalement', 'horrible'];

    const descLower = description.toLowerCase();
    const hasNegative = negativeWords.some(word => descLower.includes(word));
    const hasSeverity = severityWords.some(word => descLower.includes(word));
    const hasImages = imagePaths.length > 0;

    // Calculer les scores
    let qualityScore = 50;
    let matchScore = 50;
    let confidence = 60;

    if (hasNegative) {
      qualityScore = 40;
      matchScore += 20;
      confidence += 10;
    }

    if (hasSeverity) {
      qualityScore -= 10;
      matchScore += 10;
      confidence += 10;
    }

    if (hasImages) {
      matchScore += 20;
      confidence += 10;
    }

    const isValid = hasNegative || hasImages;
    const severity = hasSeverity ? 'high' : hasNegative ? 'medium' : 'low';

    return {
      isValid,
      confidenceScore: Math.min(confidence, 85), // Max 85% sans IA
      imageAnalysis: {
        detectedObjects: hasImages ? ['food', 'dish'] : [],
        foodQualityScore: qualityScore,
        issuesDetected: hasNegative ? ['quality_issue'] : [],
      },
      textAnalysis: {
        sentiment: hasNegative ? 'negative' : 'neutral',
        keywords: description.split(' ').slice(0, 5),
        severity,
      },
      matchScore: Math.min(matchScore, 100),
      recommendation: isValid
        ? 'Réclamation acceptée (validation automatique sans IA). Vérification manuelle recommandée.'
        : 'Réclamation ambiguë. Examen manuel requis.',
      processedAt: new Date(),
    };
  }

  /**
   * Helper: Download image from URL to buffer
   */
  private async downloadImage(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });
  }

  /**
   * Helper: Get image buffer from path or URL
   */
  private async getImageBuffer(imagePath: string): Promise<Buffer | null> {
    try {
      // If it's a URL, download it
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        this.logger.log(`📥 Downloading image from URL: ${imagePath}`);
        return await this.downloadImage(imagePath);
      }
      
      // Otherwise, treat as local file path
      const filename = imagePath.split('/').pop();
      if (!filename) return null;

      const fullPath = path.join(process.cwd(), 'uploads', 'reclamations', filename);
      if (!fs.existsSync(fullPath)) {
        this.logger.warn(`⚠️ Image introuvable: ${fullPath}`);
        return null;
      }

      return fs.readFileSync(fullPath);
    } catch (error) {
      this.logger.error(`❌ Error getting image buffer: ${error.message}`);
      return null;
    }
  }

  /**
   * 🖼️ Analyse les images avec Google Vision (si disponible)
   */
  private async analyzeImagesWithVision(imagePaths: string[]): Promise<ImageAnalysis> {
    const allLabels: string[] = [];
    const allIssues: string[] = [];
    let totalQuality = 0;

    for (const imagePath of imagePaths) {
      try {
        const imageBuffer = await this.getImageBuffer(imagePath);
        if (!imageBuffer) {
          this.logger.warn(`⚠️ Skipping image: ${imagePath}`);
          continue;
        }

        const [result] = await this.visionClient.labelDetection({
          image: { content: imageBuffer },
        });
        const labels = result.labelAnnotations || [];

        labels.forEach(label => {
          if (label.description) {
            allLabels.push(label.description.toLowerCase());
          }
        });

        const foodLabels = ['food', 'dish', 'meal', 'cuisine', 'plate'];
        const problemLabels = ['dirty', 'burnt', 'raw', 'spoiled', 'mold', 'cold'];

        const hasFoodDetected = labels.some(l =>
          l.description && foodLabels.some(fl => l.description!.toLowerCase().includes(fl))
        );

        const hasIssues = labels.some(l =>
          l.description && problemLabels.some(pl => l.description!.toLowerCase().includes(pl))
        );

        totalQuality += hasFoodDetected ? (hasIssues ? 40 : 80) : 50;

        if (hasIssues) {
          const issueLabels = labels
            .filter(l => l.description && problemLabels.some(pl => l.description!.toLowerCase().includes(pl)))
            .map(l => l.description!);
          allIssues.push(...issueLabels);
        }
      } catch (error) {
        this.logger.error(`❌ Erreur Vision API pour ${imagePath}:`, error);
      }
    }

    const qualityScore = imagePaths.length > 0 ? Math.round(totalQuality / imagePaths.length) : 50;

    return {
      labels: [...new Set(allLabels)],
      qualityScore,
      issues: [...new Set(allIssues)],
    };
  }

  /**
   * 🖼️ Analyse les images avec Gemini Vision (fallback)
   */
  private async analyzeImagesWithGemini(imagePaths: string[]): Promise<ImageAnalysis> {
    try {
      if (!this.workingModel) {
        throw new Error('Aucun modèle Gemini disponible');
      }

      const model = this.gemini.getGenerativeModel({ model: this.workingModel });

      const allLabels: string[] = [];
      const allIssues: string[] = [];
      let totalQuality = 0;

      for (const imagePath of imagePaths) {
        try {
          const imageBuffer = await this.getImageBuffer(imagePath);
          if (!imageBuffer) {
            this.logger.warn(`⚠️ Skipping image: ${imagePath}`);
            continue;
          }

          const base64Image = imageBuffer.toString('base64');

          const prompt = `
Analyse cette image de nourriture et réponds en JSON uniquement:

{
  "labels": ["liste", "des", "objets", "détectés"],
  "hasFood": true/false,
  "hasIssues": true/false,
  "issues": ["problèmes", "détectés"],
  "qualityScore": 0-100
}

Détecte: nourriture, plats, problèmes (brûlé, cru, froid, abîmé, sale, etc.)
`;

          const result = await model.generateContent([
            prompt,
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
              },
            },
          ]);

          const responseText = result.response.text();
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);

          if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            allLabels.push(...analysis.labels);
            if (analysis.hasIssues) {
              allIssues.push(...analysis.issues);
            }
            totalQuality += analysis.qualityScore || 50;
          }

        } catch (error) {
          this.logger.error(`❌ Erreur Gemini Vision pour ${imagePath}:`, error);
          totalQuality += 50; // Score neutre en cas d'erreur
        }
      }

      const qualityScore = imagePaths.length > 0 ? Math.round(totalQuality / imagePaths.length) : 50;

      return {
        labels: [...new Set(allLabels)],
        qualityScore,
        issues: [...new Set(allIssues)],
      };

    } catch (error) {
      this.logger.error('❌ Erreur Gemini Vision globale:', error);

      // Fallback
      return {
        labels: ['food', 'unknown'],
        qualityScore: 50,
        issues: [],
      };
    }
  }

  /**
   * 🧠 Analyse texte avec Gemini
   */
  private async analyzeTextWithGemini(
    description: string,
    complaintType: string,
    imageAnalysis: ImageAnalysis
  ): Promise<TextAnalysisResult> {
    try {
      if (!this.workingModel) {
        throw new Error('Aucun modèle Gemini disponible');
      }

      const model = this.gemini.getGenerativeModel({ model: this.workingModel });

      const prompt = `
Tu es un expert en validation de réclamations pour un service de livraison de nourriture.

DESCRIPTION CLIENT: "${description}"
TYPE DE RÉCLAMATION: "${complaintType}"
OBJETS DÉTECTÉS DANS L'IMAGE: ${imageAnalysis.labels.join(', ')}
PROBLÈMES VISUELS DÉTECTÉS: ${imageAnalysis.issues.join(', ') || 'Aucun'}
SCORE QUALITÉ IMAGE: ${imageAnalysis.qualityScore}/100

TÂCHE:
1. Analyse si la description correspond aux objets détectés
2. Évalue la gravité de la réclamation (low, medium, high)
3. Détecte le sentiment (negative, neutral, positive)
4. Extrait les mots-clés importants
5. Donne un score de confiance (0-100)

RÉPONDS EN JSON UNIQUEMENT (pas de markdown):
{
  "sentiment": "negative",
  "severity": "medium",
  "keywords": ["mot1", "mot2"],
  "confidence": 85,
  "reasoning": "Explication courte"
}
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // ✅ Parser JSON correctement
      const cleanText = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback
      return this.createFallbackTextAnalysis(description);

    } catch (error) {
      this.logger.error('❌ Erreur Gemini Text:', error);
      return this.createFallbackTextAnalysis(description);
    }
  }

  /**
   * 🔄 Analyse de secours
   */
  private createFallbackTextAnalysis(description: string): TextAnalysisResult {
    const negativeWords = ['mauvais', 'froid', 'brûlé', 'cru', 'sale', 'manquant', 'abîmé'];
    const hasNegativeWords = negativeWords.some(word =>
      description.toLowerCase().includes(word)
    );

    return {
      sentiment: hasNegativeWords ? 'negative' : 'neutral',
      severity: hasNegativeWords ? 'medium' : 'low',
      keywords: description.split(' ').slice(0, 5),
      confidence: 50,
      reasoning: 'Analyse de secours (API indisponible)',
    };
  }

  /**
   * 📊 Calcule le score de cohérence
   */
  private calculateMatchScore(imageAnalysis: ImageAnalysis, textAnalysis: TextAnalysisResult): number {
    let score = 50;

    const hasFoodInImage = imageAnalysis.labels.some(l =>
      ['food', 'dish', 'meal', 'cuisine', 'plat', 'nourriture'].some(f => l.includes(f))
    );
    if (hasFoodInImage) score += 20;

    if (imageAnalysis.issues.length > 0 && textAnalysis.severity === 'high') {
      score += 20;
    }

    const keywordsInLabels = textAnalysis.keywords.filter(kw =>
      imageAnalysis.labels.some(l => l.includes(kw.toLowerCase()))
    );
    score += Math.min(keywordsInLabels.length * 5, 20);

    return Math.min(score, 100);
  }

  /**
   * 💡 Génère une recommandation
   */
  private generateRecommendation(
    isValid: boolean,
    confidence: number,
    matchScore: number
  ): string {
    if (isValid && confidence >= 80) {
      return 'Réclamation légitime avec haute confiance. Approuver et attribuer des points.';
    }
    if (isValid && confidence >= 60) {
      return 'Réclamation probablement valide. Vérification manuelle recommandée.';
    }
    if (!isValid && matchScore < 40) {
      return 'Incohérence majeure entre image et description. Rejeter.';
    }
    return 'Réclamation ambiguë. Nécessite examen manuel.';
  }
}