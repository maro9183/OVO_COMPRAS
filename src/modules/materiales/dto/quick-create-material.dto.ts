import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class QuickCreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber()
  @IsNotEmpty()
  unidadId: number;

  @IsNumber()
  @IsOptional()
  categoriaId?: number;

  @IsString()
  @IsOptional()
  descripcion?: string;
}
