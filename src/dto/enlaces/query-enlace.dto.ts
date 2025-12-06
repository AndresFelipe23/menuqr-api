import { IsOptional, IsInt, Min, Max, IsString, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryEnlaceDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser al menos 1' })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @Max(100, { message: 'limit no puede exceder 100' })
  limit?: number = 10;

  @IsUUID('4', { message: 'restauranteId debe ser un UUID válido' })
  @IsOptional()
  restauranteId?: string;

  @IsString({ message: 'titulo debe ser una cadena de texto' })
  @IsOptional()
  titulo?: string;

  @IsString({ message: 'tipoIcono debe ser una cadena de texto' })
  @IsOptional()
  tipoIcono?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'activo debe ser un booleano' })
  activo?: boolean;

  @IsString({ message: 'orden debe ser una cadena de texto' })
  @IsOptional()
  orden?: 'asc' | 'desc' = 'asc';
}

