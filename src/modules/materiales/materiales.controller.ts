import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { MaterialesService } from './materiales.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { QuickCreateMaterialDto } from './dto/quick-create-material.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('materiales')
@UseGuards(JwtAuthGuard)
export class MaterialesController {
  constructor(private readonly materialesService: MaterialesService) {}

  @Post()
  create(@Body() createMaterialDto: CreateMaterialDto) {
    return this.materialesService.create(createMaterialDto);
  }

  @Post('quick')
  quickCreate(@Body() dto: QuickCreateMaterialDto) {
    return this.materialesService.quickCreate(dto);
  }

  @Get()
  findAll() {
    return this.materialesService.findAll();
  }

  @Get('buscar')
  buscar(@Query('q') query: string) {
    return this.materialesService.buscar(query || '');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.materialesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMaterialDto: UpdateMaterialDto) {
    return this.materialesService.update(+id, updateMaterialDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.materialesService.remove(+id);
  }
}
