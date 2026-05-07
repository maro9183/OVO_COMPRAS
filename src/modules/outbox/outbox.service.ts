import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventoOutbox } from './evento_outbox.entity';
import { CreateOutboxDto } from './dto/create-outbox.dto';
import { UpdateOutboxDto } from './dto/update-outbox.dto';

@Injectable()
export class OutboxService {
  constructor(
    @InjectRepository(EventoOutbox)
    private outboxRepository: Repository<EventoOutbox>,
  ) {}

  create(createOutboxDto: CreateOutboxDto) {
    const evento = this.outboxRepository.create(createOutboxDto);
    return this.outboxRepository.save(evento);
  }

  findAll() {
    return this.outboxRepository.find();
  }

  findUnprocessed() {
    return this.outboxRepository.find({ where: { processed: false } });
  }

  async findOne(id: number) {
    const evento = await this.outboxRepository.findOne({ where: { id } });
    if (!evento) throw new NotFoundException(`Outbox Event #${id} not found`);
    return evento;
  }

  async update(id: number, updateOutboxDto: UpdateOutboxDto) {
    const evento = await this.findOne(id);
    Object.assign(evento, updateOutboxDto);
    return this.outboxRepository.save(evento);
  }

  async markAsProcessed(id: number) {
    const evento = await this.findOne(id);
    evento.processed = true;
    return this.outboxRepository.save(evento);
  }

  async remove(id: number) {
    const evento = await this.findOne(id);
    return this.outboxRepository.remove(evento);
  }
}
