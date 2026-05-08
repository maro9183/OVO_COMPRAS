import { IsString, IsNotEmpty, IsOptional, IsEmail, IsUrl, MaxLength } from 'class-validator';
import { IsCuit } from '../../../common/validators/cuit.validator';

export class CreateProveedorDto {
  @IsString()
  @IsOptional()
  codigo?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  razonSocial: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  nombreFantasia?: string;

  @IsCuit()
  @IsOptional()
  cuit?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  telefono?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(200)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  contactoNombre?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactoTelefono?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(200)
  contactoEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  sitioWeb?: string;

  @IsString()
  @IsOptional()
  notas?: string;
}
