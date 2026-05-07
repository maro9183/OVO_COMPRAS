import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'unidades' })
export class Unidad {
  @PrimaryGeneratedColumn() id: number;

  @Column({ length: 20, unique: true }) simbolo: string;

  @Column({ length: 100 }) descripcion: string;

  @Column({ default: true }) activo: boolean;
}
