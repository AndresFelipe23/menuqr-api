import { IsString, IsNotEmpty, MaxLength, IsOptional, IsUUID, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class CrearComentarioDto {
  @IsUUID('4', { message: 'El restauranteId debe ser un UUID válido' })
  @IsOptional()
  restauranteId?: string;

  @IsUUID('4', { message: 'El usuarioId debe ser un UUID válido' })
  @IsOptional()
  usuarioId?: string;

  @IsString({ message: 'El tipo debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El tipo es requerido' })
  @IsIn(['comentario', 'queja', 'solicitud', 'sugerencia', 'pregunta'], {
    message: 'El tipo debe ser uno de: comentario, queja, solicitud, sugerencia, pregunta',
  })
  tipo: 'comentario' | 'queja' | 'solicitud' | 'sugerencia' | 'pregunta';

  @IsString({ message: 'El asunto debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El asunto es requerido' })
  @MaxLength(200, { message: 'El asunto no puede exceder 200 caracteres' })
  asunto: string;

  @IsString({ message: 'El mensaje debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El mensaje es requerido' })
  mensaje: string;

  @IsString({ message: 'La prioridad debe ser una cadena de texto' })
  @IsOptional()
  @IsIn(['baja', 'normal', 'alta', 'urgente'], {
    message: 'La prioridad debe ser una de: baja, normal, alta, urgente',
  })
  prioridad?: 'baja' | 'normal' | 'alta' | 'urgente';
}

