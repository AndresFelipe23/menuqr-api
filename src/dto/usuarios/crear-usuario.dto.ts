import { IsString, IsNotEmpty, IsEmail, MaxLength, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CrearUsuarioDto {
  @IsEmail({}, { message: 'El correo debe ser un email válido' })
  @IsNotEmpty({ message: 'El correo es requerido' })
  @MaxLength(255, { message: 'El correo no puede exceder 255 caracteres' })
  correo: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MaxLength(255, { message: 'La contraseña no puede exceder 255 caracteres' })
  password: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  nombre?: string;

  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(100, { message: 'El apellido no puede exceder 100 caracteres' })
  apellido?: string;

  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(50, { message: 'El teléfono no puede exceder 50 caracteres' })
  telefono?: string;

  @IsString({ message: 'La URL del avatar debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(500, { message: 'La URL del avatar no puede exceder 500 caracteres' })
  avatarUrl?: string;

  @IsUUID('4', { message: 'El restauranteId debe ser un UUID válido' })
  @IsOptional()
  restauranteId?: string | null;

  @IsUUID('4', { message: 'El rolId debe ser un UUID válido' })
  @IsOptional()
  rolId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'activo debe ser un booleano' })
  activo?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'correoVerificado debe ser un booleano' })
  correoVerificado?: boolean;
}

