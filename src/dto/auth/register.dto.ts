import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional, IsUUID, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'El email debe ser válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre: string;

  // Campos opcionales para crear restaurante (si no se proporciona restauranteId)
  @IsString({ message: 'El nombre del restaurante debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(200, { message: 'El nombre del restaurante no puede exceder 200 caracteres' })
  nombreRestaurante?: string;

  @IsString({ message: 'El slug del restaurante debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(100, { message: 'El slug no puede exceder 100 caracteres' })
  @Matches(/^[a-z0-9-]+$/, { message: 'El slug solo puede contener letras minúsculas, números y guiones' })
  slugRestaurante?: string;

  // Si se proporciona restauranteId, es un admin creando usuarios para su restaurante
  @IsUUID('4', { message: 'El restauranteId debe ser un UUID válido' })
  @IsOptional()
  restauranteId?: string;

  // Si se proporciona restauranteId, puede especificar el rol
  @IsUUID('4', { message: 'El rolId debe ser un UUID válido' })
  @IsOptional()
  rolId?: string;
}

