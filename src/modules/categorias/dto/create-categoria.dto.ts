import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCategoriaDto {
  @IsString() 
  @IsNotEmpty() 
  nombre: string;
}
