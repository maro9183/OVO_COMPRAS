import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxService } from './outbox.service';
import { OutboxController } from './outbox.controller';
import { EventoOutbox } from './evento_outbox.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EventoOutbox])],
  controllers: [OutboxController],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
