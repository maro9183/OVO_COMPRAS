import { SetMetadata } from '@nestjs/common';
import { UsuarioRol } from '../../modules/usuarios/usuario.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UsuarioRol[]) => SetMetadata(ROLES_KEY, roles);
