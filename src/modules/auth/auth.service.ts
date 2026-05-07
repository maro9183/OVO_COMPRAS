import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private usuariosRepo: Repository<Usuario>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usuariosRepo.findOne({ where: { username, activo: true } });
    if (!user || !user.puedeLoguearse || !user.passwordHash) {
      throw new UnauthorizedException();
    }
    
    if (await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    throw new UnauthorizedException();
  }

  async login(user: any) {
    const payload = { 
      sub: user.id, 
      nombre: user.nombre, 
      rol: user.rol 
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
      }
    };
  }
}
