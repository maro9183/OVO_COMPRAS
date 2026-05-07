import { EstadoPedido } from '../modules/pedidos/pedido.entity';
import { EstadoDetalle } from '../modules/pedidos/detalle-pedido.entity';
import { BadRequestException } from '@nestjs/common';
import { UsuarioRol } from '../modules/usuarios/usuario.entity';

export const TRANSICIONES_PEDIDO: Record<EstadoPedido, EstadoPedido[]> = {
  [EstadoPedido.CREADO]: [EstadoPedido.APROBADO, EstadoPedido.APROBADO_PARCIAL, EstadoPedido.RECHAZADO],
  [EstadoPedido.APROBADO]: [EstadoPedido.EN_COMPRA],
  [EstadoPedido.APROBADO_PARCIAL]: [EstadoPedido.EN_COMPRA],
  [EstadoPedido.RECHAZADO]: [],
  [EstadoPedido.EN_COMPRA]: [EstadoPedido.COMPRADO],
  [EstadoPedido.COMPRADO]: [EstadoPedido.RECIBIDO],
  [EstadoPedido.RECIBIDO]: [],
};

export const TRANSICIONES_DETALLE: Record<EstadoDetalle, EstadoDetalle[]> = {
  [EstadoDetalle.PENDIENTE]: [EstadoDetalle.APROBADO, EstadoDetalle.RECHAZADO],
  [EstadoDetalle.APROBADO]: [EstadoDetalle.EN_COMPRA],
  [EstadoDetalle.RECHAZADO]: [],
  [EstadoDetalle.EN_COMPRA]: [EstadoDetalle.COMPRADO],
  [EstadoDetalle.COMPRADO]: [EstadoDetalle.RECIBIDO],
  [EstadoDetalle.RECIBIDO]: [],
};

export function validarTransicionPedido(actual: EstadoPedido, siguiente: EstadoPedido, rol?: UsuarioRol): void {
  if (rol === UsuarioRol.ADMIN) return;
  const permitidos = TRANSICIONES_PEDIDO[actual];
  if (!permitidos.includes(siguiente)) {
    throw new BadRequestException(
      `Transición inválida en pedido: ${actual} → ${siguiente}. Permitidas: [${permitidos.join(', ') || 'ninguna'}]`
    );
  }
}

export function validarTransicionDetalle(actual: EstadoDetalle, siguiente: EstadoDetalle, rol?: UsuarioRol): void {
  if (rol === UsuarioRol.ADMIN) return;
  const permitidos = TRANSICIONES_DETALLE[actual];
  if (!permitidos.includes(siguiente)) {
    throw new BadRequestException(
      `Transición inválida en detalle: ${actual} → ${siguiente}. Permitidas: [${permitidos.join(', ') || 'ninguna'}]`
    );
  }
}


export function checkRoleAllowed(estadoDestino: EstadoPedido | EstadoDetalle, rol: UsuarioRol): void {
  if (rol === UsuarioRol.ADMIN) return;
  
  if (
    estadoDestino === EstadoPedido.APROBADO || estadoDestino === EstadoDetalle.APROBADO ||
    estadoDestino === EstadoPedido.APROBADO_PARCIAL ||
    estadoDestino === EstadoPedido.RECHAZADO || estadoDestino === EstadoDetalle.RECHAZADO ||
    estadoDestino === EstadoPedido.EN_COMPRA || estadoDestino === EstadoDetalle.EN_COMPRA
  ) {
    if (rol !== UsuarioRol.ENCARGADO && rol !== UsuarioRol.COMPRADOR) {
      throw new BadRequestException(`El rol ${rol} no puede transicionar al estado ${estadoDestino}`);
    }
  }
  
  if (estadoDestino === EstadoPedido.COMPRADO || estadoDestino === EstadoDetalle.COMPRADO) {
    if (rol !== UsuarioRol.ENCARGADO && rol !== UsuarioRol.COMPRADOR) {
      throw new BadRequestException(`El rol ${rol} no puede marcar como COMPRADO`);
    }
  }

  if (estadoDestino === EstadoPedido.RECIBIDO || estadoDestino === EstadoDetalle.RECIBIDO) {
    if (rol !== UsuarioRol.SOLICITANTE && rol !== UsuarioRol.ENCARGADO) {
      throw new BadRequestException(`El rol ${rol} no puede marcar como RECIBIDO`);
    }
  }
}
