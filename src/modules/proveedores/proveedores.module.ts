import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProveedoresService } from './proveedores.service';
import { ProveedoresController } from './proveedores.controller';
import { Proveedor } from './proveedor.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proveedor]),
    AuthModule,
  ],
  controllers: [ProveedoresController],
  providers: [ProveedoresService],
  exports: [ProveedoresService],
})
export class ProveedoresModule {}
