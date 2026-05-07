import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';

export enum EntidadHistorial {
  PEDIDO = 'PEDIDO',
  DETALLE = 'DETALLE',
}

@Entity({ name: 'historial_estados' })
export class HistorialEstado {
  @PrimaryGeneratedColumn() id: number;

  @Column({ name: 'tipo_entidad', type: 'enum', enum: EntidadHistorial }) 
  tipoEntidad: EntidadHistorial;

  @Column({ name: 'id_referencia' }) idReferencia: number;

  // NOTA TÉCNICA: Se utiliza VARCHAR intencionalmente para almacenar el historial 
  // combinado de estados de pedidos y detalles (que tienen enums de DB diferentes). 
  // RIESGO ACEPTADO: Un typo en backend se guardará sin fallar a nivel base de datos.
  @Column({ name: 'estado_anterior', length: 30, nullable: true }) estadoAnterior: string;

  @Column({ name: 'estado_nuevo', length: 30 }) estadoNuevo: string;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' }) 
  @JoinColumn({ name: 'id_usuario' }) 
  usuario: Usuario;

  @CreateDateColumn({ name: 'fecha', type: 'timestamptz' }) fecha: Date;
}
