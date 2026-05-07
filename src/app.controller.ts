import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return '¡Bienvenido a la API de OVO_COMPRAS! El servidor está funcionando correctamente.';
  }
}
