import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class AsignarPermisosDto {
  @IsArray({ message: 'Los permisos deben ser un array' })
  @ArrayMinSize(1, { message: 'Debe asignar al menos un permiso' })
  @IsUUID('4', { each: true, message: 'Cada permisoId debe ser un UUID válido' })
  permisoIds: string[];
}

