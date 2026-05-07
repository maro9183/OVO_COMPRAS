import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { DetallePedido } from './detalle-pedido.entity';
import { Sector } from '../sectores/sector.entity';

export enum EstadoPedido {
  CREADO = 'CREADO',
  APROBADO = 'APROBADO',
  APROBADO_PARCIAL = 'APROBADO_PARCIAL',
  RECHAZADO = 'RECHAZADO',
  EN_COMPRA = 'EN_COMPRA',
  COMPRADO = 'COMPRADO',
  RECIBIDO = 'RECIBIDO',
}

@Entity({ name: 'pedidos' })
export class Pedido {
  @PrimaryGeneratedColumn() id: number;

  @Column({ name: 'numero_solicitud', length: 30, unique: true }) numeroSolicitud: string;

  @Column({ name: 'idempotency_key', type: 'uuid', unique: true, nullable: true }) idempotencyKey: string;

  @Column({ length: 500 }) descripcion: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' }) 
  @JoinColumn({ name: 'id_solicitante' }) 
  solicitante: Usuario;

  @ManyToOne(() => Sector, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_sector' })
  sector: Sector;

  @Column({ name: 'id_estado', type: 'enum', enum: EstadoPedido, default: EstadoPedido.CREADO }) 
  estado: EstadoPedido;

  @Column({ type: 'text', nullable: true }) observaciones: string;

  @Column({ name: 'fecha_pedido', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }) fechaPedido: Date;

  @Column({ name: 'fecha_modif', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }) fechaModif: Date;

  @Column({ default: true }) activo: boolean;

  @OneToMany(() => DetallePedido, d => d.pedido, { cascade: true }) detalles: DetallePedido[];
}
