import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards, Request } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioRol } from './usuario.entity';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('perfil/me')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @Post()
  @Roles(UsuarioRol.ADMIN)
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  @Roles(UsuarioRol.ADMIN, UsuarioRol.ENCARGADO, UsuarioRol.COMPRADOR)
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UsuarioRol.ADMIN)
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.usuariosService.update(+id, updateDto);
  }

  @Delete(':id')
  @Roles(UsuarioRol.ADMIN)
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(+id);
  }
}
