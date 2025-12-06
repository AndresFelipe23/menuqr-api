import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEmail, IsBoolean, IsDecimal, Matches, Length } from 'class-validator';

export class CrearRestauranteDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
  nombre: string;

  @IsString({ message: 'El slug debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El slug es requerido' })
  @MaxLength(100, { message: 'El slug no puede exceder 100 caracteres' })
  @Matches(/^[a-z0-9-]+$/, { message: 'El slug solo puede contener letras minúsculas, números y guiones' })
  slug: string;

  @IsEmail({}, { message: 'El correo debe ser válido' })
  @IsNotEmpty({ message: 'El correo es requerido' })
  @MaxLength(255, { message: 'El correo no puede exceder 255 caracteres' })
  correo: string;

  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(50, { message: 'El teléfono no puede exceder 50 caracteres' })
  telefono?: string;

  @IsString({ message: 'La biografía debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(1000, { message: 'La biografía no puede exceder 1000 caracteres' })
  biografia?: string;

  @IsString({ message: 'La URL de imagen de perfil debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(500, { message: 'La URL no puede exceder 500 caracteres' })
  imagenPerfilUrl?: string;

  @IsString({ message: 'La URL de imagen de portada debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(500, { message: 'La URL no puede exceder 500 caracteres' })
  imagenPortadaUrl?: string;

  // Configuración de tema
  @IsString({ message: 'El color de tema debe ser una cadena de texto' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color de tema debe ser un código hexadecimal válido (ej: #FF0000)' })
  colorTema?: string;

  @IsString({ message: 'El color de texto debe ser una cadena de texto' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color de texto debe ser un código hexadecimal válido' })
  colorTexto?: string;

  @IsString({ message: 'El color de fondo debe ser una cadena de texto' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color de fondo debe ser un código hexadecimal válido' })
  colorFondo?: string;

  @IsString({ message: 'La familia de fuente debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(100, { message: 'La familia de fuente no puede exceder 100 caracteres' })
  familiaFuente?: string;

  // Configuración de página
  @IsBoolean({ message: 'mostrarMenu debe ser un booleano' })
  @IsOptional()
  mostrarMenu?: boolean;

  @IsBoolean({ message: 'mostrarEnlaces debe ser un booleano' })
  @IsOptional()
  mostrarEnlaces?: boolean;

  @IsBoolean({ message: 'mostrarContacto debe ser un booleano' })
  @IsOptional()
  mostrarContacto?: boolean;

  @IsBoolean({ message: 'habilitarPedidos debe ser un booleano' })
  @IsOptional()
  habilitarPedidos?: boolean;

  // Información de ubicación
  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(500, { message: 'La dirección no puede exceder 500 caracteres' })
  direccion?: string;

  @IsString({ message: 'La ciudad debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(100, { message: 'La ciudad no puede exceder 100 caracteres' })
  ciudad?: string;

  @IsString({ message: 'El estado/provincia debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(100, { message: 'El estado/provincia no puede exceder 100 caracteres' })
  estadoProvincia?: string;

  @IsString({ message: 'El país debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(100, { message: 'El país no puede exceder 100 caracteres' })
  pais?: string;

  @IsString({ message: 'El código postal debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(20, { message: 'El código postal no puede exceder 20 caracteres' })
  codigoPostal?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,8' }, { message: 'La latitud debe ser un número decimal válido' })
  latitud?: number;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,8' }, { message: 'La longitud debe ser un número decimal válido' })
  longitud?: number;

  // Configuración de negocio
  @IsString({ message: 'La zona horaria debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(50, { message: 'La zona horaria no puede exceder 50 caracteres' })
  zonaHoraria?: string;

  @IsString({ message: 'La moneda debe ser una cadena de texto' })
  @IsOptional()
  @Length(3, 3, { message: 'La moneda debe tener exactamente 3 caracteres (código ISO)' })
  moneda?: string;

  @IsString({ message: 'El idioma debe ser una cadena de texto' })
  @IsOptional()
  @Length(2, 10, { message: 'El idioma debe tener entre 2 y 10 caracteres' })
  idioma?: string;
}

