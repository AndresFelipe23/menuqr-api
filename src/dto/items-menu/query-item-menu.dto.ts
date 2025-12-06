import { IsOptional, IsInt, Min, IsBoolean, IsUUID, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryItemMenuDto {
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

  @IsUUID('4', { message: 'categoriaId debe ser un UUID válido' })
  @IsOptional()
  categoriaId?: string;

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
  @IsBoolean({ message: 'disponible debe ser un booleano' })
  disponible?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'destacado debe ser un booleano' })
  destacado?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'esVegetariano debe ser un booleano' })
  esVegetariano?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'esVegano debe ser un booleano' })
  esVegano?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'sinGluten debe ser un booleano' })
  sinGluten?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'esPicante debe ser un booleano' })
  esPicante?: boolean;

  @IsOptional()
  @IsString({ message: 'orden debe ser una cadena de texto' })
  orden?: 'asc' | 'desc';
}

