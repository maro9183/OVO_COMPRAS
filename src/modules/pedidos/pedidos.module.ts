import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PedidosService } from './pedidos.service';
import { DetallePedidoService } from './detalle-pedido.service';
import { PedidosController } from './pedidos.controller';
import { Pedido } from './pedido.entity';
import { DetallePedido } from './detalle-pedido.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { Sector } from '../sectores/sector.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pedido, DetallePedido, Usuario, Sector]),
    AuthModule
  ],
  controllers: [PedidosController],
  providers: [PedidosService, DetallePedidoService],
  exports: [PedidosService, DetallePedidoService],
})
export class PedidosModule {}
