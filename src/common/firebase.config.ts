import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

let firebaseApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 * @param configService - NestJS ConfigService instance
 * @returns Firebase App instance or null if configuration is missing
 */
export function initializeFirebase(configService: ConfigService): admin.app.App | null {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Option 1: Use service account JSON file path
    const serviceAccountPath = configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    
    // Option 2: Use service account JSON as environment variable
    const serviceAccountJson = configService.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    
    // Option 3: Use individual credentials from environment variables
    const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    // Debug logging
    console.log('🔍 [Firebase Config] Checking configuration...');
    console.log(`🔍 [Firebase Config] FIREBASE_SERVICE_ACCOUNT_PATH: ${serviceAccountPath || 'NOT SET'}`);
    console.log(`🔍 [Firebase Config] FIREBASE_SERVICE_ACCOUNT_JSON: ${serviceAccountJson ? 'SET (hidden)' : 'NOT SET'}`);
    console.log(`🔍 [Firebase Config] FIREBASE_PROJECT_ID: ${projectId || 'NOT SET'}`);

    // Check if any Firebase configuration is provided
    const hasConfig = serviceAccountPath || serviceAccountJson || (projectId && clientEmail && privateKey);

    if (!hasConfig) {
      console.log('ℹ️ Firebase configuration not provided. Push notifications will be disabled.');
      console.log('ℹ️ To enable Firebase, add to .env: FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json');
      return null;
    }

    let credential: admin.credential.Credential;
    let resolvedProjectId: string | undefined;

    if (serviceAccountPath) {
      // Use service account file
      // Resolve path relative to project root (not dist folder)
      const resolvedPath = path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.resolve(process.cwd(), serviceAccountPath);
      
      console.log(`🔍 [Firebase Config] Loading service account from: ${resolvedPath}`);
      
      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        console.error(`❌ [Firebase Config] File not found: ${resolvedPath}`);
        console.error(`❌ [Firebase Config] Current working directory: ${process.cwd()}`);
        throw new Error(`Firebase service account file not found at: ${resolvedPath}`);
      }
      
      try {
        // Read and parse JSON file
        const fileContent = fs.readFileSync(resolvedPath, 'utf8');
        const serviceAccount = JSON.parse(fileContent);
        credential = admin.credential.cert(serviceAccount);
        resolvedProjectId = serviceAccount.project_id;
        console.log(`✅ [Firebase Config] Service account loaded. Project ID: ${resolvedProjectId}`);
      } catch (parseError) {
        console.error(`❌ [Firebase Config] Failed to parse service account file: ${parseError.message}`);
        throw parseError;
      }
    } else if (serviceAccountJson) {
      // Parse JSON string from environment variable
      const serviceAccount = JSON.parse(serviceAccountJson);
      credential = admin.credential.cert(serviceAccount);
      resolvedProjectId = serviceAccount.project_id;
    } else if (projectId && clientEmail && privateKey) {
      // Use individual credentials
      credential = admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      });
      resolvedProjectId = projectId;
    } else {
      console.log('ℹ️ Firebase configuration incomplete. Push notifications will be disabled.');
      return null;
    }

    firebaseApp = admin.initializeApp({
      credential,
      projectId: resolvedProjectId,
    });

    console.log('✅ Firebase Admin initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    console.log('ℹ️ Push notifications will be disabled due to Firebase initialization failure.');
    return null;
  }
}

export function getFirebaseApp(): admin.app.App | null {
  return firebaseApp;
}

export function isFirebaseInitialized(): boolean {
  return firebaseApp !== null;
}

