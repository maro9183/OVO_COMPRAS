import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DetallePedido, EstadoDetalle } from './detalle-pedido.entity';
import { Pedido, EstadoPedido } from './pedido.entity';
import { HistorialEstado, EntidadHistorial } from '../estados/historial-estado.entity';
import { Usuario, UsuarioRol } from '../usuarios/usuario.entity';
import { validarTransicionDetalle, checkRoleAllowed } from '../../common/state-machine';
import { Material } from '../materiales/material.entity';

@Injectable()
export class DetallePedidoService {
  constructor(
    @InjectRepository(DetallePedido) private detalleRepo: Repository<DetallePedido>,
    private dataSource: DataSource,
  ) {}

  async agregarItem(pedidoId: number, dto: any, usuarioId: number): Promise<DetallePedido> {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id: pedidoId, activo: true } });
      if (!pedido) throw new NotFoundException('Pedido no encontrado');

      let descManual = dto.descripcionManual ? dto.descripcionManual.trim() : undefined;
      if (!descManual) descManual = undefined;

      let material: Material | null = null;
      if (dto.materialId) {
        material = await manager.findOne(Material, { where: { id: dto.materialId }, relations: ['categoria'] });
      }

      // Ensure XOR: if material is provided, descManual must be null
      if (material) descManual = undefined;

      if (!material && !descManual) {
        throw new BadRequestException('Debe seleccionar un material o ingresar una descripción manual');
      }

      const detalle = manager.create(DetallePedido, {
        pedido: { id: pedidoId },
        material: material || undefined,
        descripcionManual: descManual,
        cantidad: dto.cantidad || 1,
        observaciones: dto.observaciones ? dto.observaciones.trim() || undefined : undefined,
        estado: EstadoDetalle.PENDIENTE,
        activo: true
      });

      const guardado = await manager.save(DetallePedido, detalle);
      
      // Pass categoryId directly if we have it
      const catId = material?.categoria?.id;
      await this.autoAssignBuyer(guardado.id, manager, catId);
      
      await this.syncEstadoPedido(pedidoId, manager, usuarioId);
      
      return manager.findOneOrFail(DetallePedido, { 
        where: { id: guardado.id }, 
        relations: ['material', 'material.unidad', 'unidadOverride', 'comprador'] 
      });
    });
  }

  async autoAssignBuyer(detalleId: number, manager: import('typeorm').EntityManager, forceCatId?: number): Promise<void> {
    const detalle = await manager.findOne(DetallePedido, { 
      where: { id: detalleId }, 
      relations: ['material', 'material.categoria', 'comprador'] 
    });
    
    const catId = forceCatId || detalle?.material?.categoria?.id;

    if (!detalle || detalle.comprador || !catId) {
      console.log(`[autoAssignBuyer] Skip: det=${detalleId}, hasBuyer=${!!detalle?.comprador}, catId=${catId}`);
      return;
    }
    
    console.log(`[autoAssignBuyer] Searching for catId=${catId}`);

    // Find a buyer with this category
    const buyer = await manager.createQueryBuilder(Usuario, 'u')
      .innerJoin('u.categorias', 'c')
      .where('c.id = :catId', { catId })
      .andWhere('u.rol IN (:...roles)', { roles: [UsuarioRol.COMPRADOR, UsuarioRol.ADMIN] })
      .andWhere('u.activo = true')
      .getOne();

    if (buyer) {
      console.log(`[autoAssignBuyer] Found buyer: ${buyer.nombre} (id=${buyer.id})`);
      detalle.comprador = buyer;
      await manager.save(DetallePedido, detalle);
    } else {
      console.log(`[autoAssignBuyer] No buyer found for catId=${catId}`);
    }
  }

  async updateDetalle(id: number, dto: any, usuarioId: number): Promise<DetallePedido> {
    return this.dataSource.transaction(async (manager) => {
      const detalle = await manager.findOne(DetallePedido, { where: { id, activo: true }, lock: { mode: 'pessimistic_write' } });
      if (!detalle) throw new NotFoundException('Detalle no encontrado');

      const operador = await manager.findOne(Usuario, { where: { id: usuarioId, activo: true } });
      if (!operador) throw new ForbiddenException('Usuario no encontrado');

      const isEditable = [EstadoDetalle.PENDIENTE, EstadoDetalle.APROBADO].includes(detalle.estado);
      if (!isEditable && operador.rol !== UsuarioRol.ADMIN) {
        throw new BadRequestException(`No se puede editar el detalle en estado ${detalle.estado}`);
      }

      if (dto.cantidad) detalle.cantidad = dto.cantidad;
      if (dto.descripcionManual !== undefined) detalle.descripcionManual = dto.descripcionManual;
      if (dto.materialId) detalle.material = { id: dto.materialId } as any;
      if (dto.compradorId) detalle.comprador = { id: dto.compradorId } as any;
      if (dto.observaciones !== undefined) detalle.observaciones = dto.observaciones;
      if (dto.unidadOverrideId !== undefined) {
        detalle.unidadOverride = dto.unidadOverrideId ? ({ id: dto.unidadOverrideId } as any) : null;
      }

      await manager.save(DetallePedido, detalle);

      if (dto.materialId && !dto.compradorId) {
        await this.autoAssignBuyer(detalle.id, manager);
      }

      return manager.findOneOrFail(DetallePedido, { 
        where: { id }, 
        relations: ['comprador', 'material', 'material.unidad', 'unidadOverride', 'pedido'] 
      });
    });
  }


  async toggleActivo(id: number, usuarioId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const detalle = await manager.findOne(DetallePedido, { where: { id }, relations: ['pedido'] });
      if (!detalle) throw new NotFoundException('Detalle no encontrado');
      
      detalle.activo = !detalle.activo;
      detalle.fechaModif = new Date();
      await manager.save(DetallePedido, detalle);
      
      await this.syncEstadoPedido(detalle.pedido.id, manager, usuarioId);
    });
  }

  async cambiarEstado(id: number, nuevoEstado: EstadoDetalle, usuarioId: number, observaciones?: string): Promise<DetallePedido> {
    return this.dataSource.transaction(async (manager) => {
      const operador = await manager.findOne(Usuario, { where: { id: usuarioId, activo: true } });
      if (!operador) throw new ForbiddenException('Usuario no encontrado');

      const detalle = await manager.findOne(DetallePedido, {
        where: { id, activo: true },
        relations: ['pedido'],
        // lock: { mode: 'pessimistic_write' }, 
      });
      if (!detalle) throw new NotFoundException(`Detalle ${id} no encontrado`);

      validarTransicionDetalle(detalle.estado, nuevoEstado, operador.rol);
      checkRoleAllowed(nuevoEstado, operador.rol);

      const estadoAnterior = detalle.estado;
      detalle.estado = nuevoEstado;
      if (observaciones) detalle.observaciones = observaciones;
      detalle.fechaModif = new Date();
      await manager.save(DetallePedido, detalle);

      await manager.save(HistorialEstado, {
        tipoEntidad: EntidadHistorial.DETALLE,
        idReferencia: detalle.id,
        estadoAnterior,
        estadoNuevo: nuevoEstado,
        usuario: { id: usuarioId },
      });

      await this.syncEstadoPedido(detalle.pedido.id, manager, usuarioId);

      return manager.findOneOrFail(DetallePedido, { 
        where: { id }, 
        relations: ['comprador', 'material', 'material.unidad', 'unidadOverride', 'pedido'] 
      });
    });
  }

  private async syncEstadoPedido(pedidoId: number, manager: import('typeorm').EntityManager, usuarioId: number): Promise<void> {
    const pedido = await manager.findOne(Pedido, {
      where: { id: pedidoId },
      // relations: ['detalles'], // Removed lock conflict
      // lock: { mode: 'pessimistic_write' }
    });
    if (!pedido || !pedido.activo) return;

    const detalles = await manager.find(DetallePedido, {
      where: { pedido: { id: pedidoId }, activo: true }
    });
    if (detalles.length === 0) return;

    const todosComprado = detalles.every(d => d.estado === EstadoDetalle.COMPRADO);
    const todosRecibido = detalles.every(d => d.estado === EstadoDetalle.RECIBIDO);
    const todosAprobado = detalles.every(d => d.estado === EstadoDetalle.APROBADO);
    const mezclaAprobadoRechazado = detalles.some(d => d.estado === EstadoDetalle.APROBADO) && detalles.some(d => d.estado === EstadoDetalle.RECHAZADO);
    
    let nuevoEstado = pedido.estado;
    if (todosRecibido) nuevoEstado = EstadoPedido.RECIBIDO;
    else if (todosComprado) nuevoEstado = EstadoPedido.COMPRADO;
    else if (todosAprobado) nuevoEstado = EstadoPedido.APROBADO;
    else if (mezclaAprobadoRechazado) nuevoEstado = EstadoPedido.APROBADO_PARCIAL;

    if (nuevoEstado !== pedido.estado) {
      const estadoAnterior = pedido.estado;
      pedido.estado = nuevoEstado;
      await manager.save(Pedido, pedido);
      await manager.save(HistorialEstado, {
        tipoEntidad: EntidadHistorial.PEDIDO,
        idReferencia: pedido.id,
        estadoAnterior,
        estadoNuevo: nuevoEstado,
        usuario: { id: usuarioId },
      });
    }
  }
}
