import { IsString, IsOptional, MaxLength, IsEmail, IsUUID, IsEnum } from 'class-validator';

export enum EstadoPedido {
  PENDIENTE = 'pendiente',
  PENDIENTE_CONFIRMACION = 'pendiente_confirmacion',
  CONFIRMADO = 'confirmado',
  PREPARANDO = 'preparando',
  LISTO = 'listo',
  SERVIDO = 'servido',
  COMPLETADO = 'completado',
  CANCELADO = 'cancelado',
}

export class ActualizarPedidoDto {
  @IsString({ message: 'El nombre del cliente debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(200, { message: 'El nombre del cliente no puede exceder 200 caracteres' })
  nombreCliente?: string;

  @IsString({ message: 'El teléfono del cliente debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(50, { message: 'El teléfono del cliente no puede exceder 50 caracteres' })
  telefonoCliente?: string;

  @IsEmail({}, { message: 'El correo del cliente debe ser un email válido' })
  @IsOptional()
  @MaxLength(255, { message: 'El correo del cliente no puede exceder 255 caracteres' })
  correoCliente?: string;

  @IsEnum(EstadoPedido, { message: 'El estado debe ser uno de los valores permitidos' })
  @IsOptional()
  estado?: EstadoPedido;

  @IsString({ message: 'Las notas deben ser una cadena de texto' })
  @IsOptional()
  @MaxLength(1000, { message: 'Las notas no pueden exceder 1000 caracteres' })
  notas?: string;

  @IsString({ message: 'Las instrucciones especiales deben ser una cadena de texto' })
  @IsOptional()
  @MaxLength(1000, { message: 'Las instrucciones especiales no pueden exceder 1000 caracteres' })
  instruccionesEspeciales?: string;

  @IsUUID('4', { message: 'El meseroAsignadoId debe ser un UUID válido' })
  @IsOptional()
  meseroAsignadoId?: string | null;
}

