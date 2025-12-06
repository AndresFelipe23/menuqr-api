import { IsString, IsOptional, MaxLength, IsUrl, IsInt, Min, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class ActualizarMesaDto {
  @IsString({ message: 'El número debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(20, { message: 'El número no puede exceder 20 caracteres' })
  numero?: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  nombre?: string;

  @IsString({ message: 'El código QR debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(500, { message: 'El código QR no puede exceder 500 caracteres' })
  codigoQr?: string;

  @IsUrl({}, { message: 'La URL de la imagen QR debe ser una URL válida' })
  @IsOptional()
  @MaxLength(500, { message: 'La URL de la imagen QR no puede exceder 500 caracteres' })
  imagenQrUrl?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'La capacidad debe ser un número entero' })
  @Min(1, { message: 'La capacidad debe ser al menos 1' })
  capacidad?: number;

  @IsString({ message: 'La sección debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(100, { message: 'La sección no puede exceder 100 caracteres' })
  seccion?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'El piso debe ser un número entero' })
  @Min(1, { message: 'El piso debe ser al menos 1' })
  piso?: number;

  @IsUUID('4', { message: 'El meseroAsignadoId debe ser un UUID válido' })
  @IsOptional()
  meseroAsignadoId?: string | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'activa debe ser un booleano' })
  activa?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'ocupada debe ser un booleano' })
  ocupada?: boolean;
}

