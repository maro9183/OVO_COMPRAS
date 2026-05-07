import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const { password, sectorId, categoriaIds, ...userData } = createUsuarioDto;
    
    let passwordHash: string | undefined = undefined;
    if (userData.puedeLoguearse && password) {
      const saltOrRounds = 12;
      passwordHash = await bcrypt.hash(password, saltOrRounds);
    }
    
    const usuario = this.usuariosRepository.create({
      ...userData,
      passwordHash,
      sector: sectorId ? { id: sectorId } : undefined,
      categorias: (categoriaIds || []).map(id => ({ id })),
    });

    return this.usuariosRepository.save(usuario);
  }

  async findByUsername(username: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({ where: { username }, relations: ['categorias'] });
  }

  findAll() {
    return this.usuariosRepository.find({ relations: ['sector', 'categorias'] });
  }

  async findOne(id: number) {
    const usuario = await this.usuariosRepository.findOne({ 
      where: { id },
      relations: ['sector', 'categorias'] 
    });
    if (!usuario) {
      throw new NotFoundException(`Usuario #${id} not found`);
    }
    return usuario;
  }

  async update(id: number, updateDto: any) {
    const usuario = await this.findOne(id);
    
    if (updateDto.nombre) usuario.nombre = updateDto.nombre;
    if (updateDto.username) usuario.username = updateDto.username;
    if (updateDto.rol) usuario.rol = updateDto.rol;
    if (updateDto.sectorId !== undefined) {
      usuario.sector = updateDto.sectorId ? { id: updateDto.sectorId } as any : null;
    }
    if (updateDto.activo !== undefined) usuario.activo = updateDto.activo;
    
    if (updateDto.categoriaIds !== undefined) {
      usuario.categorias = (updateDto.categoriaIds || []).map((cid: number) => ({ id: cid }));
    }

    if (updateDto.password) {
      usuario.passwordHash = await bcrypt.hash(updateDto.password, 12);
    }
    
    return this.usuariosRepository.save(usuario);
  }

  async remove(id: number) {
    const usuario = await this.findOne(id);
    usuario.activo = !usuario.activo; // Toggle status instead of strictly false, since user wants to "inactivar/reactivar"
    return this.usuariosRepository.save(usuario);
  }
}
