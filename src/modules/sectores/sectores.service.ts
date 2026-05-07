import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sector } from './sector.entity';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';

@Injectable()
export class SectoresService {
  constructor(
    @InjectRepository(Sector)
    private sectoresRepository: Repository<Sector>,
  ) {}

  create(createSectorDto: CreateSectorDto) {
    const sector = this.sectoresRepository.create(createSectorDto);
    return this.sectoresRepository.save(sector);
  }

  findAll() {
    return this.sectoresRepository.find();
  }

  async findOne(id: number) {
    const sector = await this.sectoresRepository.findOne({ where: { id } });
    if (!sector) {
      throw new NotFoundException(`Sector #${id} not found`);
    }
    return sector;
  }

  async update(id: number, updateSectorDto: UpdateSectorDto) {
    const sector = await this.findOne(id);
    Object.assign(sector, updateSectorDto);
    return this.sectoresRepository.save(sector);
  }

  async remove(id: number) {
    const sector = await this.findOne(id);
    sector.activo = !sector.activo;
    return this.sectoresRepository.save(sector);
  }
}
