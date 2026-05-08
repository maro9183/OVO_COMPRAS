import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Unidad } from '../unidades/unidad.entity';
import { Categoria } from '../categorias/categoria.entity';
import { Proveedor } from '../proveedores/proveedor.entity';

@Entity({ name: 'materiales' })
export class Material {
  @PrimaryGeneratedColumn() id: number;
  
  @Column({ length: 50, unique: true }) codigo: string;
  
  @Column({ length: 200 }) nombre: string;
  
  @Column({ type: 'text', nullable: true }) descripcion: string;
  
  @ManyToOne(() => Unidad, { nullable: true }) 
  @JoinColumn({ name: 'id_unidad' }) 
  unidad: Unidad;
  
  @ManyToOne(() => Categoria, { nullable: true })
  @JoinColumn({ name: 'id_categoria' })
  categoria: Categoria;

  @Column({ name: 'link_plano', length: 500, nullable: true }) linkPlano: string;

  @Column({ name: 'codigo_proveedor', length: 100, nullable: true }) codigoProveedor: string;

  @ManyToOne(() => Proveedor, { nullable: true })
  @JoinColumn({ name: 'id_proveedor_principal' })
  proveedorPrincipal: Proveedor;

  @Column({ type: 'text', array: true, nullable: true })
  keywords: string[];

  @Column({ type: 'text', nullable: true }) notas: string;

  @Column({ default: true }) activo: boolean;
  
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
