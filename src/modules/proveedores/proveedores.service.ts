import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { Proveedor } from './proveedor.entity';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly proveedorRepository: Repository<Proveedor>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createProveedorDto: CreateProveedorDto): Promise<Proveedor> {
    // Check uniqueness CI
    const existing = await this.proveedorRepository.createQueryBuilder('p')
      .where('LOWER(p.razon_social) = LOWER(:razonSocial)', { razonSocial: createProveedorDto.razonSocial })
      .getOne();
    
    if (existing) {
      throw new ConflictException(`El proveedor con razón social "${createProveedorDto.razonSocial}" ya existe`);
    }

    return await this.dataSource.transaction(async (manager) => {
      let codigo = createProveedorDto.codigo;
      if (!codigo) {
        const result = await manager.query('SELECT generar_codigo_proveedor() AS codigo');
        codigo = result[0].codigo;
      }

      const proveedor = manager.create(Proveedor, {
        ...createProveedorDto,
        codigo,
      });

      return await manager.save(proveedor);
    });
  }

  async findAll(): Promise<Proveedor[]> {
    return this.proveedorRepository.find({
      order: { razonSocial: 'ASC' },
    });
  }

  async buscar(query: string): Promise<Proveedor[]> {
    return this.proveedorRepository.find({
      where: [
        { razonSocial: ILike(`%${query}%`) },
        { codigo: ILike(`%${query}%`) },
        { cuit: ILike(`%${query}%`) },
      ],
      order: { razonSocial: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Proveedor> {
    const proveedor = await this.proveedorRepository.findOne({ where: { id } });
    if (!proveedor) {
      throw new NotFoundException(`Proveedor #${id} no encontrado`);
    }
    return proveedor;
  }

  async update(id: number, updateProveedorDto: UpdateProveedorDto): Promise<Proveedor> {
    const proveedor = await this.findOne(id);

    if (updateProveedorDto.razonSocial && updateProveedorDto.razonSocial.toLowerCase() !== proveedor.razonSocial.toLowerCase()) {
      const existing = await this.proveedorRepository.createQueryBuilder('p')
        .where('LOWER(p.razon_social) = LOWER(:razonSocial)', { razonSocial: updateProveedorDto.razonSocial })
        .andWhere('p.id != :id', { id })
        .getOne();
      
      if (existing) {
        throw new ConflictException(`El proveedor con razón social "${updateProveedorDto.razonSocial}" ya existe`);
      }
    }

    Object.assign(proveedor, updateProveedorDto);
    return await this.proveedorRepository.save(proveedor);
  }

  async remove(id: number): Promise<void> {
    const proveedor = await this.findOne(id);
    proveedor.activo = !proveedor.activo;
    await this.proveedorRepository.save(proveedor);
  }
}
