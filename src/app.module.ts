// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { SectoresModule } from './modules/sectores/sectores.module';
import { PedidosModule } from './modules/pedidos/pedidos.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriasModule } from './modules/categorias/categorias.module';
import { MaterialesModule } from './modules/materiales/materiales.module';
import { UnidadesModule } from './modules/unidades/unidades.module';
import { EstadosModule } from './modules/estados/estados.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';
import { typeOrmConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.example' }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api*'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => typeOrmConfig(configService),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    UsuariosModule,
    SectoresModule,
    PedidosModule,
    OutboxModule,
    AuthModule,
    MaterialesModule,
    CategoriasModule,
    UnidadesModule,
    EstadosModule,
    ProveedoresModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
