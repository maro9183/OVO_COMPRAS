import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Pedido } from './pedido.entity';
import { Material } from '../materiales/material.entity';
import { Unidad } from '../unidades/unidad.entity';
import { Usuario } from '../usuarios/usuario.entity';

export enum EstadoDetalle {
  PENDIENTE  = 'PENDIENTE',
  APROBADO   = 'APROBADO',
  RECHAZADO  = 'RECHAZADO',
  EN_COMPRA  = 'EN_COMPRA',
  COMPRADO   = 'COMPRADO',
  RECIBIDO   = 'RECIBIDO',
}

@Entity({ name: 'detalle_pedido' })
export class DetallePedido {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Pedido, p => p.detalles, { nullable: false, onDelete: 'CASCADE' }) 
  @JoinColumn({ name: 'id_pedido' }) 
  pedido: Pedido;

  @ManyToOne(() => Material, { nullable: true, onDelete: 'RESTRICT' }) 
  @JoinColumn({ name: 'id_material' }) 
  material: Material;

  @Column({ name: 'descripcion_manual', type: 'text', nullable: true }) descripcionManual: string;

  @Column({ type: 'numeric', precision: 10, scale: 3 }) cantidad: number;

  @ManyToOne(() => Unidad, { nullable: true, onDelete: 'RESTRICT' }) 
  @JoinColumn({ name: 'id_unidad_override' }) 
  unidadOverride: Unidad;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' }) 
  @JoinColumn({ name: 'id_comprador' }) 
  comprador: Usuario;

  @Column({ name: 'comprador_nombre_snapshot', length: 150, nullable: true }) compradorNombreSnapshot: string;

  @Column({ name: 'id_estado', type: 'enum', enum: EstadoDetalle, default: EstadoDetalle.PENDIENTE }) 
  estado: EstadoDetalle;

  @Column({ type: 'text', nullable: true }) observaciones: string;

  @Column({ name: 'fecha_modif', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }) fechaModif: Date;

  @Column({ default: true }) activo: boolean;
}
