import { IsBoolean, IsOptional, IsInt, Min, Max, IsString, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CrearConfiguracionReservasDto {
  @IsString({ message: 'El restauranteId debe ser un UUID válido' })
  @IsOptional()
  restauranteId?: string; // Se puede omitir si viene del token

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'reservasHabilitadas debe ser un booleano' })
  reservasHabilitadas?: boolean = true;

  // Horarios de atención por día
  @IsOptional()
  @IsString({ message: 'horaAperturaLunes debe ser una hora válida (HH:mm)' })
  horaAperturaLunes?: string;

  @IsOptional()
  @IsString({ message: 'horaCierreLunes debe ser una hora válida (HH:mm)' })
  horaCierreLunes?: string;

  @IsOptional()
  @IsString({ message: 'horaAperturaMartes debe ser una hora válida (HH:mm)' })
  horaAperturaMartes?: string;

  @IsOptional()
  @IsString({ message: 'horaCierreMartes debe ser una hora válida (HH:mm)' })
  horaCierreMartes?: string;

  @IsOptional()
  @IsString({ message: 'horaAperturaMiercoles debe ser una hora válida (HH:mm)' })
  horaAperturaMiercoles?: string;

  @IsOptional()
  @IsString({ message: 'horaCierreMiercoles debe ser una hora válida (HH:mm)' })
  horaCierreMiercoles?: string;

  @IsOptional()
  @IsString({ message: 'horaAperturaJueves debe ser una hora válida (HH:mm)' })
  horaAperturaJueves?: string;

  @IsOptional()
  @IsString({ message: 'horaCierreJueves debe ser una hora válida (HH:mm)' })
  horaCierreJueves?: string;

  @IsOptional()
  @IsString({ message: 'horaAperturaViernes debe ser una hora válida (HH:mm)' })
  horaAperturaViernes?: string;

  @IsOptional()
  @IsString({ message: 'horaCierreViernes debe ser una hora válida (HH:mm)' })
  horaCierreViernes?: string;

  @IsOptional()
  @IsString({ message: 'horaAperturaSabado debe ser una hora válida (HH:mm)' })
  horaAperturaSabado?: string;

  @IsOptional()
  @IsString({ message: 'horaCierreSabado debe ser una hora válida (HH:mm)' })
  horaCierreSabado?: string;

  @IsOptional()
  @IsString({ message: 'horaAperturaDomingo debe ser una hora válida (HH:mm)' })
  horaAperturaDomingo?: string;

  @IsOptional()
  @IsString({ message: 'horaCierreDomingo debe ser una hora válida (HH:mm)' })
  horaCierreDomingo?: string;

  // Configuración de reservas
  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'anticipacionMinimaHoras debe ser un número entero' })
  @Min(0, { message: 'anticipacionMinimaHoras debe ser al menos 0' })
  @Max(168, { message: 'anticipacionMinimaHoras no puede exceder 168 horas (7 días)' })
  anticipacionMinimaHoras?: number = 2;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'anticipacionMaximaDias debe ser un número entero' })
  @Min(1, { message: 'anticipacionMaximaDias debe ser al menos 1' })
  @Max(365, { message: 'anticipacionMaximaDias no puede exceder 365 días' })
  anticipacionMaximaDias?: number = 30;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'duracionReservaMinutos debe ser un número entero' })
  @Min(15, { message: 'duracionReservaMinutos debe ser al menos 15 minutos' })
  @Max(480, { message: 'duracionReservaMinutos no puede exceder 480 minutos (8 horas)' })
  duracionReservaMinutos?: number = 120;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'intervaloReservasMinutos debe ser un número entero' })
  @Min(5, { message: 'intervaloReservasMinutos debe ser al menos 5 minutos' })
  @Max(120, { message: 'intervaloReservasMinutos no puede exceder 120 minutos' })
  intervaloReservasMinutos?: number = 15;

  // Límites
  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'capacidadMaximaPersonas debe ser un número entero' })
  @Min(1, { message: 'capacidadMaximaPersonas debe ser al menos 1' })
  @Max(100, { message: 'capacidadMaximaPersonas no puede exceder 100' })
  capacidadMaximaPersonas?: number = 20;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'capacidadMinimaPersonas debe ser un número entero' })
  @Min(1, { message: 'capacidadMinimaPersonas debe ser al menos 1' })
  capacidadMinimaPersonas?: number = 1;

  // Confirmación automática
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'confirmacionAutomatica debe ser un booleano' })
  confirmacionAutomatica?: boolean = false;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'requiereConfirmacionCliente debe ser un booleano' })
  requiereConfirmacionCliente?: boolean = true;

  // Notificaciones
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'notificarReservaNueva debe ser un booleano' })
  notificarReservaNueva?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'notificarCancelacion debe ser un booleano' })
  notificarCancelacion?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'notificarRecordatorio debe ser un booleano' })
  notificarRecordatorio?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'horasAntesRecordatorio debe ser un número entero' })
  @Min(1, { message: 'horasAntesRecordatorio debe ser al menos 1' })
  @Max(168, { message: 'horasAntesRecordatorio no puede exceder 168 horas (7 días)' })
  horasAntesRecordatorio?: number = 24;

  // Políticas
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean({ message: 'permitirCancelacion debe ser un booleano' })
  permitirCancelacion?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'horasMinimasCancelacion debe ser un número entero' })
  @Min(0, { message: 'horasMinimasCancelacion debe ser al menos 0' })
  @Max(168, { message: 'horasMinimasCancelacion no puede exceder 168 horas (7 días)' })
  horasMinimasCancelacion?: number = 2;

  @IsOptional()
  @IsString({ message: 'politicaNoShow debe ser una cadena de texto' })
  @MaxLength(500, { message: 'politicaNoShow no puede exceder 500 caracteres' })
  politicaNoShow?: string;
}

