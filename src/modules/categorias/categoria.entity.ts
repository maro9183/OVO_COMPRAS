import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'categorias' })
export class Categoria {
  @PrimaryGeneratedColumn() id: number;
  
  @Column({ length: 150 }) 
  nombre: string;
  @Column({ default: true })
  activo: boolean;
}
