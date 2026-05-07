import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SectoresService } from './sectores.service';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';

@Controller('sectores')
export class SectoresController {
  constructor(private readonly sectoresService: SectoresService) {}

  @Post()
  create(@Body() createSectorDto: CreateSectorDto) {
    return this.sectoresService.create(createSectorDto);
  }

  @Get()
  findAll() {
    return this.sectoresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sectoresService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSectorDto: UpdateSectorDto) {
    return this.sectoresService.update(+id, updateSectorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sectoresService.remove(+id);
  }
}
