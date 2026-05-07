import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unidad } from './unidad.entity';

@Injectable()
export class UnidadesService {
  constructor(
    @InjectRepository(Unidad)
    private readonly unidadesRepository: Repository<Unidad>,
  ) {}

  create(dto: any) {
    const unidad = this.unidadesRepository.create(dto);
    return this.unidadesRepository.save(unidad);
  }

  findAll() {
    return this.unidadesRepository.find({ order: { simbolo: 'ASC' } });
  }

  async findOne(id: number) {
    const unidad = await this.unidadesRepository.findOne({ where: { id } });
    if (!unidad) throw new NotFoundException(`Unidad #${id} no encontrada`);
    return unidad;
  }

  async update(id: number, dto: any) {
    const unidad = await this.findOne(id);
    Object.assign(unidad, dto);
    return this.unidadesRepository.save(unidad);
  }

  async remove(id: number) {
    const unidad = await this.findOne(id);
    unidad.activo = !unidad.activo;
    return this.unidadesRepository.save(unidad);
  }
}
