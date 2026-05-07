import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Pedido, EstadoPedido } from './pedido.entity';
import { DetallePedido, EstadoDetalle } from './detalle-pedido.entity';
import { HistorialEstado, EntidadHistorial } from '../estados/historial-estado.entity';
import { Usuario, UsuarioRol } from '../usuarios/usuario.entity';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { validarTransicionPedido, checkRoleAllowed } from '../../common/state-machine';
import { Material } from '../materiales/material.entity';

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido) private pedidoRepo: Repository<Pedido>,
    private dataSource: DataSource,
  ) {}

  async crearPedido(dto: CreatePedidoDto, solicitanteId: number): Promise<Pedido> {
    if (dto.idempotencyKey) {
      const existente = await this.pedidoRepo.findOne({ 
        where: { idempotencyKey: dto.idempotencyKey },
        relations: ['detalles']
      });
      if (existente) return existente;
    }

    try {
      return await this.dataSource.transaction<Pedido>(async (manager) => {
        await manager.query("SET LOCAL statement_timeout = '10s'");

        const result: Array<{ num: string }> = await manager.query('SELECT generar_numero_solicitud() AS num');
        if (!result?.[0]?.num) throw new InternalServerErrorException('Fallo generación número de solicitud');
        const numeroSolicitud: string = result[0].num;

        const solicitante = await manager.findOne(Usuario, { where: { id: solicitanteId, activo: true } });
        if (!solicitante) throw new NotFoundException('Solicitante no encontrado');
        if (solicitante.rol === UsuarioRol.COMPRADOR) {
          throw new ForbiddenException('Un COMPRADOR no puede crear pedidos');
        }

        const pedido = manager.create(Pedido, {
          numeroSolicitud,
          idempotencyKey: dto.idempotencyKey,
          descripcion: dto.descripcion,
          solicitante: { id: solicitanteId },
          sector: { id: dto.sectorId || solicitante.sector?.id },
          estado: EstadoPedido.CREADO,
          observaciones: dto.observaciones,
        });
        const pedidoGuardado = await manager.save(Pedido, pedido);

        for (const d of dto.detalles) {
          let descManual = d.descripcionManual;
          if (descManual) {
            descManual = descManual.trim();
            if (descManual.length === 0) descManual = undefined;
          }

          const detalleToSave: any = {
            pedido: { id: pedidoGuardado.id },
            cantidad: d.cantidad,
            estado: EstadoDetalle.PENDIENTE,
            observaciones: d.observaciones,
          };
          if (d.materialId) detalleToSave.material = { id: d.materialId };
          if (descManual) detalleToSave.descripcionManual = descManual;
          if (d.unidadOverrideId) detalleToSave.unidadOverride = { id: d.unidadOverrideId };

          const detalleGuardado = await manager.save(DetallePedido, detalleToSave);
          
          // Auto-assignment logic
          if (d.materialId) {
            const mat = await manager.findOne(Material, { where: { id: d.materialId }, relations: ['categoria'] });
            if (mat?.categoria) {
              const buyer = await manager.createQueryBuilder(Usuario, 'u')
                .innerJoin('u.categorias', 'c')
                .where('c.id = :catId', { catId: mat.categoria.id })
                .andWhere('u.rol IN (:...roles)', { roles: [UsuarioRol.COMPRADOR, UsuarioRol.ADMIN] })
                .andWhere('u.activo = true')
                .getOne();
              
              if (buyer) {
                detalleGuardado.comprador = buyer;
                await manager.save(DetallePedido, detalleGuardado);
              }
            }
          }
        }

        await manager.save(HistorialEstado, {
          tipoEntidad: EntidadHistorial.PEDIDO,
          idReferencia: pedidoGuardado.id,
          estadoNuevo: EstadoPedido.CREADO,
          usuario: { id: solicitanteId },
        });

        const pedidoFinal = await manager.findOne(Pedido, { where: { id: pedidoGuardado.id }, relations: ['detalles', 'solicitante'] });
        if (!pedidoFinal) throw new NotFoundException('Pedido no encontrado tras guardado');
        return pedidoFinal;
      });
    } catch (err) {
      const error = err as any;
      if (error.code === '23505' && error.constraint === 'pedidos_idempotency_key_key') {
        const existente = await this.pedidoRepo.findOne({ 
          where: { idempotencyKey: dto.idempotencyKey },
          relations: ['detalles']
        });
        if (existente) return existente;
      }
      throw error;
    }
  }

  async updatePedido(id: number, dto: any, usuarioId: number): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id, activo: true }, lock: { mode: 'pessimistic_write' } });
      if (!pedido) throw new NotFoundException('Pedido no encontrado');

      const operador = await manager.findOne(Usuario, { where: { id: usuarioId } });
      if (!operador) throw new ForbiddenException('Usuario no encontrado');

      const isEditable = [EstadoPedido.CREADO, EstadoPedido.APROBADO, EstadoPedido.APROBADO_PARCIAL].includes(pedido.estado);
      const isHeaderChange = dto.descripcion || dto.observaciones || dto.fechaPedido || dto.solicitanteId || dto.sectorId;

      if (isHeaderChange && !isEditable && operador.rol !== UsuarioRol.ADMIN) {
        throw new BadRequestException(`No se puede editar los datos del pedido en estado ${pedido.estado}`);
      }


      if (dto.descripcion) pedido.descripcion = dto.descripcion;
      if (dto.observaciones !== undefined) pedido.observaciones = dto.observaciones;
      if (dto.fechaPedido) pedido.fechaPedido = new Date(dto.fechaPedido);
      if (dto.solicitanteId) {
        pedido.solicitante = { id: dto.solicitanteId } as any;
      }
      if (dto.sectorId) {
        pedido.sector = { id: dto.sectorId } as any;
      }
      if (dto.estado) {
        validarTransicionPedido(pedido.estado, dto.estado, operador.rol);
        checkRoleAllowed(dto.estado, operador.rol);
        pedido.estado = dto.estado;
      }

      if (dto.detalles && Array.isArray(dto.detalles)) {
        // Deactivate existing details instead of deleting
        await manager.update(DetallePedido, { pedido: { id: pedido.id } }, { activo: false });
        for (const det of dto.detalles) {
          const nuevoDetalle = manager.create(DetallePedido, {
            cantidad: det.cantidad,
            descripcionManual: det.descripcionManual,
            observaciones: det.observaciones,
            pedido: { id: pedido.id } as any,
            material: det.materialId ? ({ id: det.materialId } as any) : undefined,
            estado: EstadoDetalle.PENDIENTE
          });
          await manager.save(DetallePedido, nuevoDetalle);
        }
      }

      pedido.fechaModif = new Date();
      await manager.save(Pedido, pedido);
      return manager.findOneOrFail(Pedido, { 
        where: { id }, 
        relations: [
          'detalles', 
          'detalles.material', 
          'detalles.material.unidad', 
          'detalles.unidadOverride', 
          'detalles.comprador',
          'solicitante', 
          'solicitante.sector', 
          'sector'
        ] 
      });
    });
  }

  async toggleActivo(id: number, usuarioId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!pedido) throw new NotFoundException('Pedido no encontrado');
      
      pedido.activo = !pedido.activo;
      pedido.fechaModif = new Date();
      await manager.save(Pedido, pedido);
      
      if (!pedido.activo) {
        await manager.query(`UPDATE detalle_pedido SET activo = false WHERE id_pedido = $1`, [pedido.id]);
      } else {
        await manager.query(`UPDATE detalle_pedido SET activo = true WHERE id_pedido = $1`, [pedido.id]);
        await this.syncEstadoPedido(pedido.id, manager, usuarioId);
      }
    });
  }

  async syncEstadoPedido(pedidoId: number, manager: import('typeorm').EntityManager, usuarioId: number): Promise<void> {
    const pedido = await manager.findOne(Pedido, {
      where: { id: pedidoId },
      // lock: { mode: 'pessimistic_write' } // Parent usually locks it
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

  async findOne(id: number): Promise<Pedido> {
    const pedido = await this.pedidoRepo.findOne({
      where: { id },
      relations: [
        'detalles', 
        'detalles.material', 
        'detalles.material.unidad', 
        'detalles.unidadOverride', 
        'detalles.comprador', 
        'solicitante', 
        'solicitante.sector', 
        'sector'
      ],
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    
    return pedido;
  }

  async findAll(): Promise<Pedido[]> {
    const pedidos = await this.pedidoRepo.find({
      relations: [
        'detalles', 
        'detalles.material', 
        'detalles.material.unidad', 
        'detalles.unidadOverride', 
        'detalles.comprador', 
        'solicitante', 
        'solicitante.sector', 
        'sector'
      ],
      order: { fechaPedido: 'DESC' }
    });
    
    return pedidos;
  }
}
