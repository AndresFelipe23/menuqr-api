import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEmail, IsUUID, IsNumber, Min, IsArray, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CrearItemPedidoDto {
  @IsUUID('4', { message: 'El itemMenuId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El itemMenuId es requerido' })
  itemMenuId: string;

  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @IsNotEmpty({ message: 'La cantidad es requerida' })
  @Min(1, { message: 'La cantidad debe ser mayor o igual a 1' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? value : parsed;
    }
    return value;
  })
  cantidad: number;

  @IsString({ message: 'Las notas deben ser una cadena de texto' })
  @IsOptional()
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notas?: string;

  @IsOptional()
  @IsArray({ message: 'Las adiciones deben ser un array' })
  @IsUUID('4', { each: true, message: 'Cada adición debe ser un UUID válido' })
  adicionesIds?: string[];
}

export class CrearPedidoDto {
  @IsUUID('4', { message: 'El restauranteId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El restauranteId es requerido' })
  restauranteId: string;

  @IsUUID('4', { message: 'El mesaId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El mesaId es requerido' })
  mesaId: string;

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
  meseroAsignadoId?: string;

  @IsArray({ message: 'Los items deben ser un array' })
  @IsNotEmpty({ message: 'Debe haber al menos un item en el pedido' })
  @ValidateNested({ each: true })
  @Type(() => CrearItemPedidoDto)
  items: CrearItemPedidoDto[];
}

