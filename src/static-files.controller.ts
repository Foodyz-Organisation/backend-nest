import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class StaticFilesController {
  
  // ✅ Route de test
  @Get('uploads-test')
  getUploadsTest() {
    const uploadsPath = path.join(process.cwd(), 'uploads');
    const reclamationsPath = path.join(uploadsPath, 'reclamations');
    
    console.log('🧪 Route uploads-test appelée');
    console.log('📁 Uploads path:', uploadsPath);
    console.log('📁 Reclamations path:', reclamationsPath);
    
    if (fs.existsSync(reclamationsPath)) {
      const files = fs.readdirSync(reclamationsPath);
      console.log(`✅ ${files.length} fichiers trouvés`);
      
      return {
        status: 'OK',
        uploadsPath: uploadsPath,
        reclamationsPath: reclamationsPath,
        filesCount: files.length,
        files: files.slice(0, 10),
        testUrls: files.slice(0, 3).map(file => 
          `http://192.168.100.107:3000/uploads/reclamations/${file}`
        )
      };
    } else {
      console.error('❌ Dossier reclamations introuvable');
      return {
        status: 'ERROR',
        message: 'Dossier reclamations non trouvé',
        uploadsPath: uploadsPath
      };
    }
  }
  
  // ✅ Servir les images depuis /uploads/reclamations/:filename
  @Get('uploads/reclamations/:filename')
  async getReclamationImage(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('═══════════════════════════════════════');
    console.log('📷 ROUTE /uploads/reclamations/:filename APPELÉE');
    console.log('📷 Filename:', filename);
    
    const imagePath = path.join(process.cwd(), 'uploads', 'reclamations', filename);
    
    console.log('📁 Chemin complet:', imagePath);
    console.log('✅ Fichier existe:', fs.existsSync(imagePath));
    
    if (!fs.existsSync(imagePath)) {
      console.error('❌ FICHIER INTROUVABLE');
      console.log('═══════════════════════════════════════');
      return res.status(404).json({ error: 'File not found', path: imagePath });
    }
    
    // Déterminer le type MIME
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg';
    
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    
    console.log('📄 Content-Type:', contentType);
    console.log('📦 Taille fichier:', fs.statSync(imagePath).size, 'bytes');
    
    // Headers
    res.set({
      'Content-Type': contentType,
      'Content-Length': fs.statSync(imagePath).size.toString(),
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=31536000',
    });
    
    const file = createReadStream(imagePath);
    console.log('✅ STREAM CRÉÉ - IMAGE EN COURS D\'ENVOI');
    console.log('═══════════════════════════════════════');
    
    return new StreamableFile(file);
  }
}