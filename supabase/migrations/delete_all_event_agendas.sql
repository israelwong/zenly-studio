-- Eliminar TODAS las agendas de eventos
-- Después de ejecutar esto, al editar la fecha de un evento se recreará automáticamente la agenda
-- Ejecutar con cuidado: esto elimina todas las agendas de eventos (incluso las que tienen evento_id NULL)

DELETE FROM studio_agenda
WHERE contexto = 'evento';

-- Verificación: Esta consulta debería retornar 0 filas
SELECT COUNT(*) as agendas_restantes
FROM studio_agenda
WHERE contexto = 'evento';
