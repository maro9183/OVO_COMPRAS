import { IsString, IsNotEmpty, IsOptional, IsUUID, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateDetalleDto } from './create-detalle.dto';

export class CreatePedidoDto {
  @IsOptional() @IsUUID(4) idempotencyKey?: string;

  @IsString() @IsNotEmpty() descripcion: string;

  @IsOptional() @IsString() observaciones?: string;

  @IsOptional() sectorId?: number;

  @ValidateNested({ each: true })
  @Type(() => CreateDetalleDto)
  @ArrayMinSize(1)
  detalles: CreateDetalleDto[];
}
