import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from './material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@Injectable()
export class MaterialesService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
  ) {}

  async create(createMaterialDto: CreateMaterialDto): Promise<Material> {
    const existing = await this.materialRepository.findOne({ where: { codigo: createMaterialDto.codigo } });
    if (existing) {
      throw new ConflictException(`El material con código ${createMaterialDto.codigo} ya existe`);
    }
    const { categoriaId, unidadId, ...rest } = createMaterialDto;
    const material = this.materialRepository.create(rest);
    if (categoriaId) material.categoria = { id: categoriaId } as any;
    if (unidadId) material.unidad = { id: unidadId } as any;
    return this.materialRepository.save(material);
  }

  findAll(): Promise<Material[]> {
    return this.materialRepository.find({ 
      relations: ['categoria', 'unidad'],
      order: { codigo: 'ASC' } 
    });
  }

  async findOne(id: number): Promise<Material> {
    const material = await this.materialRepository.findOne({ 
      where: { id },
      relations: ['categoria', 'unidad']
    });
    if (!material) {
      throw new NotFoundException(`Material #${id} no encontrado`);
    }
    return material;
  }

  async update(id: number, updateMaterialDto: UpdateMaterialDto): Promise<Material> {
    const material = await this.findOne(id);
    
    if (updateMaterialDto.codigo && updateMaterialDto.codigo !== material.codigo) {
      const existing = await this.materialRepository.findOne({ where: { codigo: updateMaterialDto.codigo } });
      if (existing) {
        throw new ConflictException(`El material con código ${updateMaterialDto.codigo} ya existe`);
      }
    }

    const { categoriaId, unidadId, ...rest } = updateMaterialDto;
    Object.assign(material, rest);
    if (categoriaId !== undefined) {
      material.categoria = categoriaId ? ({ id: categoriaId } as any) : null;
    }
    if (unidadId !== undefined) {
      material.unidad = unidadId ? ({ id: unidadId } as any) : null;
    }
    return this.materialRepository.save(material);
  }

  async remove(id: number): Promise<void> {
    const material = await this.findOne(id);
    material.activo = !material.activo;
    await this.materialRepository.save(material);
  }
}
