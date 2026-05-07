import { IsString, IsNotEmpty, IsOptional, IsUrl, IsNumber } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

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
}
