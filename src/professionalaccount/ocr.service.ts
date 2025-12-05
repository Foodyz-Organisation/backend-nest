import { Injectable } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';

@Injectable()
export class OcrService {
  // 🔹 For school testing, just paste your key here
  private readonly apiKey = 'K84237449288957';

  async scanImage(filePath: string): Promise<string> {
    const formData = new FormData();
    formData.append('apikey', this.apiKey);
    formData.append('language', 'eng');
    formData.append('file', createReadStream(filePath));

    const response = await axios.post(
      'https://api.ocr.space/parse/image',
      formData,
      { headers: formData.getHeaders() }
    );

    const result = response.data.ParsedResults?.[0]?.ParsedText || '';
    return result;
  }
}
