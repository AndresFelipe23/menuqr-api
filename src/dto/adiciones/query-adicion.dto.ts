import { IsOptional, IsInt, Min, IsBoolean, IsUUID, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryAdicionDto {
  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser mayor o igual a 1' })
  page?: number;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser mayor o igual a 1' })
  limit?: number;

  @IsUUID('4', { message: 'restauranteId debe ser un UUID válido' })
  @IsOptional()
  restauranteId?: string;

  @IsString({ message: 'nombre debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(200, { message: 'nombre no puede exceder 200 caracteres' })
  nombre?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'activa debe ser un booleano' })
  activa?: boolean;

  @IsOptional()
  @IsString({ message: 'orden debe ser una cadena de texto' })
  orden?: 'asc' | 'desc';
}

