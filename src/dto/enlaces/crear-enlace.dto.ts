import { IsString, IsNotEmpty, MaxLength, IsOptional, IsUrl, IsInt, Min, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CrearEnlaceDto {
  @IsUUID('4', { message: 'El restauranteId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El restauranteId es requerido' })
  restauranteId: string;

  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título es requerido' })
  @MaxLength(200, { message: 'El título no puede exceder 200 caracteres' })
  titulo: string;

  @IsUrl({}, { message: 'La URL debe ser una URL válida' })
  @IsNotEmpty({ message: 'La URL es requerida' })
  @MaxLength(500, { message: 'La URL no puede exceder 500 caracteres' })
  url: string;

  @IsUrl({}, { message: 'La URL del icono debe ser una URL válida' })
  @IsOptional()
  @MaxLength(500, { message: 'La URL del icono no puede exceder 500 caracteres' })
  iconoUrl?: string;

  @IsString({ message: 'El tipo de icono debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(50, { message: 'El tipo de icono no puede exceder 50 caracteres' })
  tipoIcono?: string;

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
  @IsBoolean({ message: 'activo debe ser un booleano' })
  activo?: boolean;
}

