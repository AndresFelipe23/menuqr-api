import { IsString, IsOptional, MaxLength, IsUUID, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class ActualizarComentarioDto {
  @IsString({ message: 'El tipo debe ser una cadena de texto' })
  @IsOptional()
  @IsIn(['comentario', 'queja', 'solicitud', 'sugerencia', 'pregunta'], {
    message: 'El tipo debe ser uno de: comentario, queja, solicitud, sugerencia, pregunta',
  })
  tipo?: 'comentario' | 'queja' | 'solicitud' | 'sugerencia' | 'pregunta';

  @IsString({ message: 'El asunto debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(200, { message: 'El asunto no puede exceder 200 caracteres' })
  asunto?: string;

  @IsString({ message: 'El mensaje debe ser una cadena de texto' })
  @IsOptional()
  mensaje?: string;

  @IsString({ message: 'El estado debe ser una cadena de texto' })
  @IsOptional()
  @IsIn(['pendiente', 'en_proceso', 'resuelto', 'cerrado'], {
    message: 'El estado debe ser uno de: pendiente, en_proceso, resuelto, cerrado',
  })
  estado?: 'pendiente' | 'en_proceso' | 'resuelto' | 'cerrado';

  @IsString({ message: 'La respuesta debe ser una cadena de texto' })
  @IsOptional()
  respuesta?: string;

  @IsString({ message: 'La prioridad debe ser una cadena de texto' })
  @IsOptional()
  @IsIn(['baja', 'normal', 'alta', 'urgente'], {
    message: 'La prioridad debe ser una de: baja, normal, alta, urgente',
  })
  prioridad?: 'baja' | 'normal' | 'alta' | 'urgente';
}

