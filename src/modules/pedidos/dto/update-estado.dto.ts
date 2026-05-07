import { IsString, IsOptional } from 'class-validator';

export class UpdateEstadoDto {
  @IsOptional() @IsString() observaciones?: string;
}
