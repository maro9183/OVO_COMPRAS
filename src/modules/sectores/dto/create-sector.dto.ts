import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSectorDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;
}
