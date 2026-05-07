import { IsString, IsNotEmpty, IsOptional, IsInt, IsEmail, IsEnum, IsBoolean, ValidateIf, IsEmpty, MinLength } from 'class-validator';
import { UsuarioRol } from '../usuario.entity';

export class CreateUsuarioDto {
  @IsString() @IsNotEmpty() nombre: string;

  @IsOptional() @IsInt() sectorId?: number;

  @IsOptional() @IsEmail() correo?: string;

  @IsOptional() @IsString() telefono?: string;

  @IsEnum(UsuarioRol) rol: UsuarioRol;

  @IsBoolean() puedeLoguearse: boolean;

  @ValidateIf(o => o.puedeLoguearse === true)
  @IsString() @IsNotEmpty() username: string;

  @ValidateIf(o => o.puedeLoguearse === true)
  @IsString() @MinLength(8) password: string;


  @IsOptional() @IsInt({ each: true }) categoriaIds?: number[];
}
