import { IsOptional, IsInt, Min, Max, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryRestauranteDto {
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

  @IsOptional()
  @IsString({ message: 'nombre debe ser una cadena de texto' })
  nombre?: string;

  @IsOptional()
  @IsString({ message: 'slug debe ser una cadena de texto' })
  slug?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'activo debe ser un booleano' })
  activo?: boolean;

  @IsOptional()
  @IsString({ message: 'estadoSuscripcion debe ser una cadena de texto' })
  estadoSuscripcion?: string;

  @IsOptional()
  @IsString({ message: 'ciudad debe ser una cadena de texto' })
  ciudad?: string;

  @IsOptional()
  @IsString({ message: 'pais debe ser una cadena de texto' })
  pais?: string;
}

