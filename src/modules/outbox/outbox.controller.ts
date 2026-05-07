import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { CreateOutboxDto } from './dto/create-outbox.dto';
import { UpdateOutboxDto } from './dto/update-outbox.dto';

@Controller('outbox')
export class OutboxController {
  constructor(private readonly outboxService: OutboxService) {}

  @Post()
  create(@Body() createOutboxDto: CreateOutboxDto) {
    return this.outboxService.create(createOutboxDto);
  }

  @Get()
  findAll() {
    return this.outboxService.findAll();
  }

  @Get('unprocessed')
  findUnprocessed() {
    return this.outboxService.findUnprocessed();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.outboxService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOutboxDto: UpdateOutboxDto) {
    return this.outboxService.update(+id, updateOutboxDto);
  }

  @Patch(':id/process')
  markAsProcessed(@Param('id') id: string) {
    return this.outboxService.markAsProcessed(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.outboxService.remove(+id);
  }
}
