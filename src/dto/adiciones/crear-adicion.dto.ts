import { IsString, IsNotEmpty, MaxLength, IsOptional, IsInt, Min, IsBoolean, IsUUID, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class CrearAdicionDto {
  @IsUUID('4', { message: 'El restauranteId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El restauranteId es requerido' })
  restauranteId: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
  nombre: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  descripcion?: string;

  @IsNumber({}, { message: 'El precio debe ser un número' })
  @IsOptional()
  @Min(0, { message: 'El precio debe ser mayor o igual a 0' })
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return 0;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return value;
  })
  precio?: number = 0;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'esObligatorio debe ser un booleano' })
  esObligatorio?: boolean = false;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'El máximo de selecciones debe ser un número entero' })
  @Min(1, { message: 'El máximo de selecciones debe ser mayor o igual a 1' })
  maximoSelecciones?: number = 1;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'El orden de visualización debe ser un número entero' })
  @Min(0, { message: 'El orden de visualización debe ser mayor o igual a 0' })
  ordenVisualizacion?: number = 0;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'activa debe ser un booleano' })
  activa?: boolean = true;
}

