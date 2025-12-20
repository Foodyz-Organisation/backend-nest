import { Controller, Get } from '@nestjs/common';

@Controller()
export class StaticFilesController {
  // ⚠️ DEPRECATED: Files are now served from Supabase Storage
  // This controller is kept for backward compatibility but returns a message
  @Get('uploads-test')
  getUploadsTest() {
    return {
      status: 'INFO',
      message: 'Files are now served from Supabase Storage. Use Supabase URLs directly.',
      note: 'This endpoint is deprecated. All file uploads go to Supabase Storage.',
    };
  }
}