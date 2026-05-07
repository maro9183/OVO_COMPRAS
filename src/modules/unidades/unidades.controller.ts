import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UnidadesService } from './unidades.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioRol } from '../usuarios/usuario.entity';

@Controller('unidades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnidadesController {
  constructor(private readonly unidadesService: UnidadesService) {}

  @Post()
  @Roles(UsuarioRol.ADMIN)
  create(@Body() dto: any) {
    return this.unidadesService.create(dto);
  }

  @Get()
  findAll() {
    return this.unidadesService.findAll();
  }

  @Patch(':id')
  @Roles(UsuarioRol.ADMIN)
  update(@Param('id') id: string, @Body() dto: any) {
    return this.unidadesService.update(+id, dto);
  }

  @Delete(':id')
  @Roles(UsuarioRol.ADMIN)
  remove(@Param('id') id: string) {
    return this.unidadesService.remove(+id);
  }
}
