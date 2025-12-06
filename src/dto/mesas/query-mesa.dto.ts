import { IsOptional, IsInt, Min, Max, IsString, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryMesaDto {
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

  @IsString({ message: 'numero debe ser una cadena de texto' })
  @IsOptional()
  numero?: string;

  @IsString({ message: 'seccion debe ser una cadena de texto' })
  @IsOptional()
  seccion?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'activa debe ser un booleano' })
  activa?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'ocupada debe ser un booleano' })
  ocupada?: boolean;

  @IsUUID('4', { message: 'meseroAsignadoId debe ser un UUID válido' })
  @IsOptional()
  meseroAsignadoId?: string;

  @IsString({ message: 'orden debe ser una cadena de texto' })
  @IsOptional()
  orden?: 'asc' | 'desc' = 'asc';
}

