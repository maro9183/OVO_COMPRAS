import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from './categoria.entity';
import { CreateCategoriaDto } from './dto/create-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private categoriasRepository: Repository<Categoria>,
  ) {}

  create(createCategoriaDto: CreateCategoriaDto) {
    const categoria = this.categoriasRepository.create(createCategoriaDto);
    return this.categoriasRepository.save(categoria);
  }

  findAll() {
    return this.categoriasRepository.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: number) {
    const cat = await this.categoriasRepository.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    return cat;
  }

  async update(id: number, dto: any) {
    const cat = await this.findOne(id);
    Object.assign(cat, dto);
    return this.categoriasRepository.save(cat);
  }

  async remove(id: number) {
    const cat = await this.findOne(id);
    cat.activo = !cat.activo;
    return this.categoriasRepository.save(cat);
  }
}
