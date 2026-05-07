import { Controller, Post, Body, Req, Patch, Param, UseGuards, Get, Delete } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { DetallePedidoService } from './detalle-pedido.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioRol } from '../usuarios/usuario.entity';
import { EstadoPedido } from './pedido.entity';
import { EstadoDetalle } from './detalle-pedido.entity';

@Controller('pedidos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PedidosController {
  constructor(
    private readonly pedidosService: PedidosService,
    private readonly detallePedidoService: DetallePedidoService,
  ) {}

  @Post()
  @Roles(UsuarioRol.ADMIN, UsuarioRol.SOLICITANTE, UsuarioRol.ENCARGADO)
  crear(@Body() dto: CreatePedidoDto, @Req() req: any) {
    return this.pedidosService.crearPedido(dto, req.user.id);
  }

  @Patch(':id')
  updatePedido(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.pedidosService.updatePedido(+id, dto, req.user.id);
  }

  @Delete(':id')
  togglePedidoActivo(@Param('id') id: string, @Req() req: any) {
    return this.pedidosService.toggleActivo(+id, req.user.id);
  }

  @Post(':id/detalles')
  addDetalle(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.detallePedidoService.agregarItem(+id, dto, req.user.id);
  }

  @Patch('detalles/:id')
  updateDetalle(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.detallePedidoService.updateDetalle(+id, dto, req.user.id);
  }

  @Delete('detalles/:id')
  toggleDetalleActivo(@Param('id') id: string, @Req() req: any) {
    return this.detallePedidoService.toggleActivo(+id, req.user.id);
  }

  @Patch('detalles/:id/estado')
  cambiarEstadoDetalle(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.detallePedidoService.cambiarEstado(+id, dto.estado, req.user.id, dto.observaciones);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pedidosService.findOne(+id);
  }

  @Get()
  @Roles(UsuarioRol.ADMIN, UsuarioRol.ENCARGADO, UsuarioRol.COMPRADOR, UsuarioRol.SOLICITANTE)
  findAll() {
    return this.pedidosService.findAll();
  }
}
