import { IsString, IsNotEmpty, IsObject, IsOptional, IsBoolean } from 'class-validator';

export class CreateOutboxDto {
  @IsString()
  @IsNotEmpty()
  aggregateId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  @IsNotEmpty()
  payload: any;

  @IsBoolean()
  @IsOptional()
  processed?: boolean;
}
