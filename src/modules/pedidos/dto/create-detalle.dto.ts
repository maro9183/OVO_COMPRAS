import { IsInt, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { MaterialOrManual } from '../../../common/decorators/material-or-manual.decorator';

export class CreateDetalleDto {
  @IsOptional() @IsInt() materialId?: number;
  
  @MaterialOrManual('materialId')
  @IsOptional() @IsString() descripcionManual?: string;
  
  @IsNumber() @Min(0.001) cantidad: number;
  
  @IsOptional() @IsInt() unidadOverrideId?: number;
  
  @IsOptional() @IsString() observaciones?: string;
}
