import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { Usuario, UsuarioRol } from '../modules/usuarios/usuario.entity';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
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
    console.log('Usuario admin creado con rol ADMIN');
  } else {
    if (existing.rol !== UsuarioRol.ADMIN) {
      existing.rol = UsuarioRol.ADMIN;
      await usuarioRepo.save(existing);
      console.log('Usuario admin existente actualizado a rol ADMIN');
    } else {
      console.log('El usuario admin ya existe y tiene el rol ADMIN');
    }
  }
  
  await app.close();
}

bootstrap();
