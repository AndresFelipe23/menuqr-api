-- =============================================
-- Ver logs con conversión a hora local
-- =============================================
-- Este script muestra los logs con la hora en UTC y en hora local
-- Ajusta el offset según tu zona horaria:
--   Colombia: -5
--   Argentina: -3
--   México: -6
--   España: +1 o +2 (según horario de verano)

USE MenuQR;
GO

-- Ver últimos logs con hora UTC y hora local (Colombia UTC-5)
SELECT TOP 10
    id,
    mensaje,
    fecha_creacion AS FechaUTC,
    DATEADD(HOUR, -5, fecha_creacion) AS FechaLocalColombia,
    GETUTCDATE() AS HoraUTCActual,
    DATEADD(HOUR, -5, GETUTCDATE()) AS HoraLocalActual,
    categoria,
    nivel,
    DATEDIFF(MINUTE, fecha_creacion, GETUTCDATE()) AS MinutosDiferencia
FROM logs_sistema
ORDER BY fecha_creacion DESC;

-- Ver solo los últimos 5 logs más recientes
SELECT TOP 5
    CONVERT(VARCHAR, fecha_creacion, 120) AS FechaUTC,
    CONVERT(VARCHAR, DATEADD(HOUR, -5, fecha_creacion), 120) AS FechaLocalColombia,
    mensaje,
    categoria,
    nivel
FROM logs_sistema
ORDER BY fecha_creacion DESC;

GO

