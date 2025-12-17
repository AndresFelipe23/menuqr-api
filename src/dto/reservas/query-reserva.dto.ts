import { IsOptional, IsInt, Min, Max, IsString, IsBoolean, IsUUID, IsDateString, IsIn, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryReservaDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser al menos 1' })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @Max(100, { message: 'limit no puede exceder 100' })
  limit?: number = 10;

  @IsUUID('4', { message: 'restauranteId debe ser un UUID válido' })
  @IsOptional()
  restauranteId?: string;

  @IsUUID('4', { message: 'mesaId debe ser un UUID válido' })
  @IsOptional()
  mesaId?: string;

  @IsString({ message: 'estado debe ser una cadena de texto' })
  @IsOptional()
  @IsIn(['pendiente', 'confirmada', 'cancelada', 'completada', 'no_show', 'expirada'], {
    message: 'El estado debe ser uno de: pendiente, confirmada, cancelada, completada, no_show, expirada'
  })
  estado?: string;

  @IsEmail({}, { message: 'correoCliente debe ser un email válido' })
  @IsOptional()
  correoCliente?: string;

  @IsString({ message: 'telefonoCliente debe ser una cadena de texto' })
  @IsOptional()
  telefonoCliente?: string;

  @IsDateString({}, { message: 'fechaDesde debe ser una fecha válida en formato ISO' })
  @IsOptional()
  fechaDesde?: string;

  @IsDateString({}, { message: 'fechaHasta debe ser una fecha válida en formato ISO' })
  @IsOptional()
  fechaHasta?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'confirmada debe ser un booleano' })
  confirmada?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'cancelada debe ser un booleano' })
  cancelada?: boolean;

  @IsUUID('4', { message: 'meseroAsignadoId debe ser un UUID válido' })
  @IsOptional()
  meseroAsignadoId?: string;

  @IsString({ message: 'orden debe ser una cadena de texto' })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'orden debe ser "asc" o "desc"' })
  orden?: 'asc' | 'desc' = 'asc';

  @IsString({ message: 'ordenPor debe ser una cadena de texto' })
  @IsOptional()
  @IsIn(['fecha_creacion', 'fecha_reserva', 'estado'], {
    message: 'ordenPor debe ser uno de: fecha_creacion, fecha_reserva, estado'
  })
  ordenPor?: 'fecha_creacion' | 'fecha_reserva' | 'estado' = 'fecha_reserva';
}

