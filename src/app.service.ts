import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService { // <-- ADD the 'export' keyword here
  getHello(): string {
    return 'Hello World!';
  }
}