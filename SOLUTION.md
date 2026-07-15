# Solución y lección — Backend L3

## Solución

El sistema debe permitir crear usuarios, salas y reservas, consultar disponibilidad, listar las reservas de un usuario y cancelar una reserva.

La regla de negocio principal establece que una sala no puede tener dos reservas confirmadas cuyos intervalos de tiempo se superpongan.

Para determinar si existe una superposición se utiliza la condición:

```text
inicio_existente < fin_nuevo
Y
fin_existente > inicio_nuevo
```

Por ejemplo, si existe una reserva entre las 10:00 y las 11:00, una nueva reserva entre las 10:30 y las 11:30 debe ser rechazada. En cambio, una reserva entre las 11:00 y las 12:00 puede ser aceptada, ya que los intervalos son consecutivos pero no se superponen.

La API valida que el usuario exista, que la sala exista, que las fechas sean válidas, que la hora de inicio sea anterior a la hora de término y que la sala no tenga una reserva confirmada que entre en conflicto con el nuevo horario.

Sin embargo, la validación de disponibilidad por sí sola no es suficiente. Si dos solicitudes llegan al mismo tiempo, ambas podrían consultar la base de datos antes de que la otra haya insertado su reserva. Las dos solicitudes podrían concluir que la sala está disponible y crear dos reservas para el mismo horario.

Para evitar esta condición de carrera, la creación de una reserva se ejecuta dentro de una transacción de base de datos.

Dentro de la transacción se bloquea la fila correspondiente a la sala mediante `SELECT ... FOR UPDATE`. Después de obtener el bloqueo se vuelve a comprobar si existe una reserva en conflicto. Si no existe, la nueva reserva se inserta y la transacción se confirma. Si existe un conflicto, la operación se cancela y se responde con un error HTTP 409.

De esta forma, dos solicitudes que intenten reservar la misma sala no pueden ejecutar simultáneamente la sección crítica de validación e inserción.

La primera solicitud obtiene el bloqueo, comprueba disponibilidad y crea la reserva. La segunda solicitud debe esperar. Cuando la primera finaliza, la segunda obtiene el bloqueo, vuelve a consultar la disponibilidad y encuentra la reserva recién creada, por lo que responde con un conflicto.

La cancelación de una reserva se implementa mediante un cambio de estado de `CONFIRMED` a `CANCELLED`, en lugar de borrar físicamente el registro. Esto permite mantener trazabilidad y evita perder información histórica.

La solución también incluye índices para facilitar las consultas por sala, horario, usuario y estado, manejo consistente de errores HTTP y tests para comprobar tanto la lógica de superposición como el comportamiento ante solicitudes concurrentes.

## Lección

La principal lección de este ejercicio es que un backend correcto no debe limitarse a funcionar en un escenario secuencial o ideal.

Un desarrollador L3 debe entender que la concurrencia puede romper una regla de negocio aunque el código de validación parezca correcto.

La secuencia “consultar disponibilidad y luego insertar” no es atómica. Entre ambas operaciones otro proceso puede modificar el estado de la base de datos.

Por eso, cuando una regla de negocio depende de leer un estado y luego modificarlo, es necesario analizar si ambas operaciones deben protegerse como una única unidad lógica.

En este caso, la transacción y el bloqueo pesimista permiten preservar la integridad de las reservas.

El objetivo no es aplicar bloqueos a todos los problemas, sino reconocer cuándo existe una condición de carrera y seleccionar un mecanismo adecuado para el dominio.

La competencia L3 se demuestra al identificar el riesgo, explicar por qué existe, implementar una solución consistente y comprobarla mediante un test de concurrencia.

La diferencia entre una solución básica y una solución L3 no está solamente en la cantidad de código. Está en comprender qué ocurre cuando el sistema deja de ejecutar una solicitud a la vez y comienza a operar bajo condiciones reales de concurrencia.
