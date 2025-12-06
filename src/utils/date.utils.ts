/**
 * Utilidades para manejo de fechas en hora local de Montería (UTC-5)
 */

/**
 * Obtiene la fecha actual en hora local de Montería, Colombia (UTC-5)
 * Formatea la fecha para SQL Server (YYYY-MM-DD HH:mm:ss.sss)
 */
export function getMonteriaLocalDate(): string {
  // Obtener la fecha/hora actual en UTC
  const ahora = new Date();
  // Restar 5 horas (Montería está en UTC-5, sin horario de verano)
  const offsetMonteriaMs = -5 * 60 * 60 * 1000; // -5 horas en milisegundos
  const fechaMonteria = new Date(ahora.getTime() + offsetMonteriaMs);
  
  // Formatear la fecha para SQL Server (YYYY-MM-DD HH:mm:ss.sss)
  const año = fechaMonteria.getUTCFullYear();
  const mes = String(fechaMonteria.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(fechaMonteria.getUTCDate()).padStart(2, '0');
  const hora = String(fechaMonteria.getUTCHours()).padStart(2, '0');
  const minuto = String(fechaMonteria.getUTCMinutes()).padStart(2, '0');
  const segundo = String(fechaMonteria.getUTCSeconds()).padStart(2, '0');
  const milisegundo = String(fechaMonteria.getUTCMilliseconds()).padStart(3, '0');
  
  return `${año}-${mes}-${dia} ${hora}:${minuto}:${segundo}.${milisegundo}`;
}

/**
 * Obtiene la fecha actual en hora local de Montería como objeto Date
 */
export function getMonteriaLocalDateObject(): Date {
  const ahora = new Date();
  const offsetMonteriaMs = -5 * 60 * 60 * 1000; // -5 horas en milisegundos
  return new Date(ahora.getTime() + offsetMonteriaMs);
}

