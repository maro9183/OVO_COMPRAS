import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { Sector } from '../sectores/sector.entity';
import { Categoria } from '../categorias/categoria.entity';

export enum UsuarioRol {
  ADMIN       = 'ADMIN',
  SOLICITANTE = 'SOLICITANTE',
  ENCARGADO   = 'ENCARGADO',
  COMPRADOR   = 'COMPRADOR',
}

@Entity({ name: 'usuarios' })
export class Usuario {
  @PrimaryGeneratedColumn() id: number;

  @Column({ length: 150 }) nombre: string;

  @ManyToOne(() => Sector, { nullable: true }) 
  @JoinColumn({ name: 'id_sector' }) 
  sector: Sector;

  @Column({ nullable: true, unique: true, length: 150 }) correo: string;

  @Column({ nullable: true, length: 30 }) telefono: string;

  @Column({ type: 'enum', enum: UsuarioRol }) rol: UsuarioRol;

  @Column({ name: 'puede_loguearse', default: false }) puedeLoguearse: boolean;

  @Column({ nullable: true, unique: true, length: 100 }) username: string;

  @Column({ name: 'password_hash', length: 120, nullable: true }) passwordHash: string;

  @Column({ default: true }) activo: boolean;

  @ManyToMany(() => Categoria)
  @JoinTable({
    name: 'usuario_categorias',
    joinColumn: { name: 'id_usuario', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'id_categoria', referencedColumnName: 'id' }
  })
  categorias: Categoria[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
