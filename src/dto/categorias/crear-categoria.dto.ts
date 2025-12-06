import { IsString, IsNotEmpty, MaxLength, IsOptional, IsUrl, IsInt, Min, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CrearCategoriaDto {
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

  @IsUrl({}, { message: 'La URL de la imagen debe ser una URL válida' })
  @IsOptional()
  @MaxLength(500, { message: 'La URL de la imagen no puede exceder 500 caracteres' })
  imagenUrl?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'El orden de visualización debe ser un número entero' })
  @Min(0, { message: 'El orden de visualización debe ser mayor o igual a 0' })
  ordenVisualizacion?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'activa debe ser un booleano' })
  activa?: boolean;
}

