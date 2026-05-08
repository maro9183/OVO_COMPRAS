import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  @IsOptional()
  codigo?: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  linkPlano?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  notas?: string;

  @IsNumber()
  @IsOptional()
  categoriaId?: number;

  @IsNumber()
  @IsOptional()
  unidadId?: number;

  @IsString()
  @IsOptional()
  codigoProveedor?: string;

  @IsNumber()
  @IsOptional()
  proveedorPrincipalId?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];
}
