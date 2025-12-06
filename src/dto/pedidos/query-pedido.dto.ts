import { IsOptional, IsInt, Min, IsUUID, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { EstadoPedido } from './actualizar-pedido.dto';

export class QueryPedidoDto {
  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser mayor o igual a 1' })
  page?: number;

  @IsOptional()
  @Transform(({ value }) => value === '' || value === null || value === undefined ? undefined : parseInt(value, 10))
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser mayor o igual a 1' })
  limit?: number;

  @IsUUID('4', { message: 'restauranteId debe ser un UUID válido' })
  @IsOptional()
  restauranteId?: string;

  @IsUUID('4', { message: 'mesaId debe ser un UUID válido' })
  @IsOptional()
  mesaId?: string;

  @IsUUID('4', { message: 'meseroAsignadoId debe ser un UUID válido' })
  @IsOptional()
  meseroAsignadoId?: string;

  @IsEnum(EstadoPedido, { message: 'estado debe ser uno de los valores permitidos' })
  @IsOptional()
  estado?: EstadoPedido;

  @IsString({ message: 'nombreCliente debe ser una cadena de texto' })
  @IsOptional()
  nombreCliente?: string;

  @IsOptional()
  @IsString({ message: 'orden debe ser una cadena de texto' })
  orden?: 'asc' | 'desc';
}

