// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { Usuario, UsuarioRol } from './modules/usuarios/usuario.entity';
import * as bcrypt from 'bcrypt';

import { UsuariosService } from './modules/usuarios/usuarios.service';
import { SectoresService } from './modules/sectores/sectores.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT') || 3000;
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  const dataSource = app.get(DataSource);

  const usuarioRepo = dataSource.getRepository(Usuario);
  const username = 'admin';
  const existing = await usuarioRepo.findOne({ where: { username } });
  
  if (!existing) {
    const passwordHash = await bcrypt.hash('admin123', 12);
    const admin = usuarioRepo.create({
      nombre: 'Administrador del Sistema',
      rol: UsuarioRol.ADMIN,
      puedeLoguearse: true,
      username,
      passwordHash,
      activo: true
    });
    await usuarioRepo.save(admin);
    console.log('Usuario admin por defecto creado: admin / admin123');
  } else {
    // Force reset password to admin123 just in case
    existing.passwordHash = await bcrypt.hash('admin123', 12);
    existing.puedeLoguearse = true;
    existing.rol = UsuarioRol.ADMIN;
    existing.activo = true;
    await usuarioRepo.save(existing);
    console.log('Contraseña de admin reiniciada a: admin123');
  }

  await app.listen(port);
  console.log(`🚀 Application listening on port ${port}`);
}
bootstrap();
