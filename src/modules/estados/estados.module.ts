import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialEstado } from './historial-estado.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HistorialEstado])],
  exports: [TypeOrmModule],
})
export class EstadosModule {}
