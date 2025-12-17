import { IsString, IsNotEmpty, MaxLength, IsOptional, IsInt, Min, IsUUID, IsEmail, Matches, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CrearReservaDto {
  @IsUUID('4', { message: 'El restauranteId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El restauranteId es requerido' })
  restauranteId: string;

  @IsUUID('4', { message: 'El mesaId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El mesaId es requerido' })
  mesaId: string;

  @IsString({ message: 'El nombre del cliente debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del cliente es requerido' })
  @MaxLength(200, { message: 'El nombre del cliente no puede exceder 200 caracteres' })
  nombreCliente: string;

  @IsEmail({}, { message: 'El correo del cliente debe ser un email válido' })
  @IsNotEmpty({ message: 'El correo del cliente es requerido' })
  @MaxLength(255, { message: 'El correo del cliente no puede exceder 255 caracteres' })
  correoCliente: string;

  @IsString({ message: 'El teléfono del cliente debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El teléfono del cliente es requerido' })
  @MaxLength(50, { message: 'El teléfono del cliente no puede exceder 50 caracteres' })
  @Matches(/^[\d\s\-\+\(\)]+$/, { message: 'El teléfono debe contener solo números, espacios, guiones, paréntesis y el símbolo +' })
  telefonoCliente: string;

  @IsDateString({}, { message: 'La fecha de reserva debe ser una fecha válida en formato ISO' })
  @IsNotEmpty({ message: 'La fecha de reserva es requerida' })
  fechaReserva: string;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'El número de personas debe ser un número entero' })
  @Min(1, { message: 'El número de personas debe ser al menos 1' })
  numeroPersonas?: number = 2;

  @IsString({ message: 'Las notas del cliente deben ser una cadena de texto' })
  @IsOptional()
  @MaxLength(1000, { message: 'Las notas del cliente no pueden exceder 1000 caracteres' })
  notasCliente?: string;

  @IsUUID('4', { message: 'El meseroAsignadoId debe ser un UUID válido' })
  @IsOptional()
  meseroAsignadoId?: string;
}

