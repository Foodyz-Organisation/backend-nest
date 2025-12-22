import { Controller, Get } from '@nestjs/common';

@Controller()
export class StaticFilesController {
  /**
   * Info endpoint - Files are now served from Supabase Storage
   * Images and files are accessible via Supabase public URLs
   */
  @Get('uploads-test')
  getUploadsTest() {
    return {
      status: 'INFO',
      message: 'Files are now served from Supabase Storage',
      note: 'All uploaded files are stored in Supabase Storage and accessible via public URLs',
      storage: 'Supabase Storage',
    };
  }
}