import { IsString, IsOptional, MaxLength, IsInt, Min, IsUUID, IsEmail, Matches, IsDateString, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class ActualizarReservaDto {
  @IsUUID('4', { message: 'El mesaId debe ser un UUID válido' })
  @IsOptional()
  mesaId?: string;

  @IsString({ message: 'El nombre del cliente debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(200, { message: 'El nombre del cliente no puede exceder 200 caracteres' })
  nombreCliente?: string;

  @IsEmail({}, { message: 'El correo del cliente debe ser un email válido' })
  @IsOptional()
  @MaxLength(255, { message: 'El correo del cliente no puede exceder 255 caracteres' })
  correoCliente?: string;

  @IsString({ message: 'El teléfono del cliente debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(50, { message: 'El teléfono del cliente no puede exceder 50 caracteres' })
  @Matches(/^[\d\s\-\+\(\)]+$/, { message: 'El teléfono debe contener solo números, espacios, guiones, paréntesis y el símbolo +' })
  telefonoCliente?: string;

  @IsDateString({}, { message: 'La fecha de reserva debe ser una fecha válida en formato ISO' })
  @IsOptional()
  fechaReserva?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'El número de personas debe ser un número entero' })
  @Min(1, { message: 'El número de personas debe ser al menos 1' })
  numeroPersonas?: number;

  @IsString({ message: 'El estado debe ser una cadena de texto' })
  @IsOptional()
  @IsIn(['pendiente', 'confirmada', 'cancelada', 'completada', 'no_show', 'expirada'], {
    message: 'El estado debe ser uno de: pendiente, confirmada, cancelada, completada, no_show, expirada'
  })
  estado?: string;

  @IsString({ message: 'Las notas del cliente deben ser una cadena de texto' })
  @IsOptional()
  @MaxLength(1000, { message: 'Las notas del cliente no pueden exceder 1000 caracteres' })
  notasCliente?: string;

  @IsString({ message: 'Las notas internas deben ser una cadena de texto' })
  @IsOptional()
  @MaxLength(1000, { message: 'Las notas internas no pueden exceder 1000 caracteres' })
  notasInternas?: string;

  @IsUUID('4', { message: 'El meseroAsignadoId debe ser un UUID válido' })
  @IsOptional()
  meseroAsignadoId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'confirmada debe ser un booleano' })
  confirmada?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'cancelada debe ser un booleano' })
  cancelada?: boolean;

  @IsString({ message: 'El motivo de cancelación debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(500, { message: 'El motivo de cancelación no puede exceder 500 caracteres' })
  motivoCancelacion?: string;

  @IsDateString({}, { message: 'La fecha de llegada debe ser una fecha válida en formato ISO' })
  @IsOptional()
  fechaLlegada?: string;

  @IsDateString({}, { message: 'La fecha de salida debe ser una fecha válida en formato ISO' })
  @IsOptional()
  fechaSalida?: string;
}

