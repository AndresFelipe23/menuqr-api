import { IsString, IsOptional, MaxLength, IsUrl, IsInt, Min, IsBoolean, IsUUID, IsNumber, IsArray, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class ActualizarItemMenuDto {
  @IsUUID('4', { message: 'El categoriaId debe ser un UUID válido' })
  @IsOptional()
  categoriaId?: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
  nombre?: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(1000, { message: 'La descripción no puede exceder 1000 caracteres' })
  descripcion?: string;

  @IsNumber({}, { message: 'El precio debe ser un número' })
  @IsOptional()
  @Min(0, { message: 'El precio debe ser mayor o igual a 0' })
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? value : parsed;
    }
    return value;
  })
  precio?: number;

  @IsUrl({}, { message: 'La URL de la imagen debe ser una URL válida' })
  @IsOptional()
  @MaxLength(500, { message: 'La URL de la imagen no puede exceder 500 caracteres' })
  imagenUrl?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'Las calorías deben ser un número entero' })
  @Min(0, { message: 'Las calorías deben ser mayor o igual a 0' })
  calorias?: number;

  @IsOptional()
  @IsArray({ message: 'Los alérgenos deben ser un array' })
  @IsString({ each: true, message: 'Cada alérgeno debe ser una cadena de texto' })
  alergenos?: string[];

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
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'El orden de visualización debe ser un número entero' })
  @Min(0, { message: 'El orden de visualización debe ser mayor o igual a 0' })
  ordenVisualizacion?: number;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'El tiempo de preparación debe ser un número entero' })
  @Min(0, { message: 'El tiempo de preparación debe ser mayor o igual a 0' })
  tiempoPreparacion?: number;

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
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'El nivel picante debe ser un número entero' })
  @Min(0, { message: 'El nivel picante debe ser mayor o igual a 0' })
  @Max(5, { message: 'El nivel picante no puede exceder 5' })
  nivelPicante?: number;

  @IsOptional()
  @IsArray({ message: 'Las adiciones deben ser un array' })
  @IsUUID('4', { each: true, message: 'Cada adición debe ser un UUID válido' })
  adicionesIds?: string[];
}

