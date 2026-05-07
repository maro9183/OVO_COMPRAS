import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'sectores' })
export class Sector {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;
  @Column({ default: true })
  activo: boolean;
}
