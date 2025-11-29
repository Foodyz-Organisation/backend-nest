import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as fs from 'fs';
import * as path from 'path';

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
  
  // Available model names (in order of preference)
  private readonly MODELS_TO_TRY = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-pro'
];

  constructor() {
    // Vérifier les variables d'environnement
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY manquante dans .env');
    }

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
    for (const modelName of this.MODELS_TO_TRY) {
      try {
        const model = this.gemini.getGenerativeModel({ model: modelName });
        await model.generateContent('test');
        this.workingModel = modelName;
        this.logger.log(`✅ Gemini modèle validé: ${modelName}`);
        return;
      } catch (error) {
        this.logger.warn(`⚠️ Modèle ${modelName} non disponible`);
      }
    }
    this.logger.error('❌ Aucun modèle Gemini disponible! Vérifiez votre API key.');
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
      throw error;
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
      const filename = imagePath.split('/').pop();
      if (!filename) continue;

      const fullPath = path.join(process.cwd(), 'uploads', 'reclamations', filename);

      if (!fs.existsSync(fullPath)) {
        this.logger.warn(`⚠️ Image introuvable: ${fullPath}`);
        continue;
      }

      try {
        const [result] = await this.visionClient.labelDetection(fullPath);
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
        this.logger.error(`❌ Erreur Vision API pour ${filename}:`, error);
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
      // ✅ Utiliser le modèle qui fonctionne (déterminé au startup)
      const modelName = this.workingModel || 'gemini-1.5-flash-latest';
      const model = this.gemini.getGenerativeModel({ model: modelName });

      const allLabels: string[] = [];
      const allIssues: string[] = [];
      let totalQuality = 0;

      for (const imagePath of imagePaths) {
        const filename = imagePath.split('/').pop();
        if (!filename) continue;

        const fullPath = path.join(process.cwd(), 'uploads', 'reclamations', filename);

        if (!fs.existsSync(fullPath)) {
          this.logger.warn(`⚠️ Image introuvable: ${fullPath}`);
          continue;
        }

        try {
          const imageData = fs.readFileSync(fullPath);
          const base64Image = imageData.toString('base64');

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
          this.logger.error(`❌ Erreur Gemini Vision pour ${filename}:`, error);
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
      // ✅ Utiliser le modèle qui fonctionne (déterminé au startup)
      const modelName = this.workingModel || 'gemini-1.5-flash-latest';
      const model = this.gemini.getGenerativeModel({ model: modelName });

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