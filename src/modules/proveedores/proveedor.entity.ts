import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'proveedores' })
export class Proveedor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  codigo: string;

  @Column({ name: 'razon_social', length: 250 })
  razonSocial: string;

  @Column({ name: 'nombre_fantasia', length: 200, nullable: true })
  nombreFantasia: string;

  @Column({ length: 13, unique: true, nullable: true })
  cuit: string;

  @Column({ type: 'text', nullable: true })
  direccion: string;

  @Column({ length: 50, nullable: true })
  telefono: string;

  @Column({ length: 200, nullable: true })
  email: string;

  @Column({ name: 'contacto_nombre', length: 150, nullable: true })
  contactoNombre: string;

  @Column({ name: 'contacto_telefono', length: 50, nullable: true })
  contactoTelefono: string;

  @Column({ name: 'contacto_email', length: 200, nullable: true })
  contactoEmail: string;

  @Column({ name: 'sitio_web', length: 300, nullable: true })
  sitioWeb: string;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
