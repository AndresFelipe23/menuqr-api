import { IsOptional, IsString, IsUUID, IsIn, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryComentarioDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página debe ser mayor a 0' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser mayor a 0' })
  @Max(100, { message: 'El límite no puede exceder 100' })
  limit?: number;

  @IsUUID('4', { message: 'El restauranteId debe ser un UUID válido' })
  @IsOptional()
  restauranteId?: string;

  @IsUUID('4', { message: 'El usuarioId debe ser un UUID válido' })
  @IsOptional()
  usuarioId?: string;

  @IsString({ message: 'El tipo debe ser una cadena de texto' })
  @IsOptional()
  @IsIn(['comentario', 'queja', 'solicitud', 'sugerencia', 'pregunta'], {
    message: 'El tipo debe ser uno de: comentario, queja, solicitud, sugerencia, pregunta',
  })
  tipo?: 'comentario' | 'queja' | 'solicitud' | 'sugerencia' | 'pregunta';

  @IsString({ message: 'El estado debe ser una cadena de texto' })
  @IsOptional()
  @IsIn(['pendiente', 'en_proceso', 'resuelto', 'cerrado'], {
    message: 'El estado debe ser uno de: pendiente, en_proceso, resuelto, cerrado',
  })
  estado?: 'pendiente' | 'en_proceso' | 'resuelto' | 'cerrado';

  @IsString({ message: 'La prioridad debe ser una cadena de texto' })
  @IsOptional()
  @IsIn(['baja', 'normal', 'alta', 'urgente'], {
    message: 'La prioridad debe ser una de: baja, normal, alta, urgente',
  })
  prioridad?: 'baja' | 'normal' | 'alta' | 'urgente';

  @IsString({ message: 'El asunto debe ser una cadena de texto' })
  @IsOptional()
  asunto?: string;

  @IsString({ message: 'El orden debe ser una cadena de texto' })
  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'El orden debe ser asc o desc',
  })
  orden?: 'asc' | 'desc';
}

