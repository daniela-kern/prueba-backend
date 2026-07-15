# Backend L3 — Sistema de Reserva de Salas

Ejercicio técnico de backend para evaluar un perfil **L3**.

## Objetivo

Construir una API REST que permita:

- Crear usuarios.
- Crear salas.
- Consultar salas.
- Consultar salas disponibles para un rango horario.
- Crear reservas.
- Consultar las reservas de un usuario.
- Cancelar reservas.

La regla principal es:

> Una sala no puede tener dos reservas `CONFIRMED` cuyos horarios se superpongan.

La condición de superposición es:

```text
existing.start_time < new.end_time
AND
existing.end_time > new.start_time
```

Esto permite reservas consecutivas:

```text
10:00 - 11:00
11:00 - 12:00
```

pero rechaza:

```text
10:00 - 11:00
10:30 - 11:30
```

---

## Qué demuestra una solución L3

Una implementación básica puede hacer esto:

```text
1. Consultar si la sala está disponible.
2. Si está disponible, insertar la reserva.
```

Eso tiene una **race condition**.

Dos solicitudes concurrentes pueden leer al mismo tiempo que la sala está libre y ambas insertar una reserva.

La solución de este proyecto ejecuta la creación dentro de una transacción:

```text
BEGIN
  1. Bloquear la fila de la sala con SELECT ... FOR UPDATE.
  2. Buscar conflictos.
  3. Si existe conflicto, hacer rollback.
  4. Si no existe conflicto, insertar.
COMMIT
```

Al bloquear la sala, las reservas concurrentes de una misma sala se procesan secuencialmente.

---

## Stack

- Node.js
- TypeScript
- Express
- PostgreSQL
- node-postgres (`pg`)
- Vitest
- Docker Compose

---

## Estructura

```text
src/
├── app.ts
├── server.ts
├── config.ts
├── controllers/
├── database/
├── errors/
├── repositories/
├── routes/
├── services/
├── types/
└── utils/

tests/
├── overlap.test.ts
└── reservation-concurrency.integration.test.ts
```

---

## Instalación

### 1. Copiar variables de entorno

```bash
cp .env.example .env
```

### 2. Levantar PostgreSQL

```bash
docker compose up -d
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Crear tablas y datos iniciales

```bash
npm run db:init
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

La API quedará disponible en:

```text
http://localhost:3000
```

---

## Endpoints

### Health check

```http
GET /health
```

### Crear usuario

```http
POST /users
Content-Type: application/json
```

```json
{
  "name": "Daniela",
  "email": "daniela@example.com"
}
```

### Crear sala

```http
POST /rooms
Content-Type: application/json
```

```json
{
  "name": "Sala Norte",
  "capacity": 8
}
```

### Listar salas

```http
GET /rooms
```

### Consultar salas disponibles

```http
GET /rooms/available?startTime=2026-07-20T10:00:00Z&endTime=2026-07-20T11:00:00Z
```

### Crear reserva

```http
POST /reservations
Content-Type: application/json
```

```json
{
  "userId": 1,
  "roomId": 1,
  "startTime": "2026-07-20T10:00:00Z",
  "endTime": "2026-07-20T11:00:00Z"
}
```

Respuesta exitosa:

```http
201 Created
```

```json
{
  "id": 1,
  "userId": 1,
  "roomId": 1,
  "startTime": "2026-07-20T10:00:00.000Z",
  "endTime": "2026-07-20T11:00:00.000Z",
  "status": "CONFIRMED"
}
```

Si existe conflicto:

```http
409 Conflict
```

```json
{
  "code": "ROOM_NOT_AVAILABLE",
  "message": "La sala ya está reservada en ese horario"
}
```

### Consultar reservas de un usuario

```http
GET /users/1/reservations
```

Filtro opcional:

```http
GET /users/1/reservations?status=CONFIRMED
```

### Cancelar reserva

```http
DELETE /reservations/1
```

La reserva no se borra físicamente. Cambia su estado a `CANCELLED`.

---

## Errores esperados

| Caso | HTTP |
|---|---:|
| Request inválido | 400 |
| Usuario no encontrado | 404 |
| Sala no encontrada | 404 |
| Reserva no encontrada | 404 |
| Horario ocupado | 409 |
| Error inesperado | 500 |

---

## Tests

Ejecutar:

```bash
npm test
```

El test de integración de concurrencia requiere:

```text
TEST_DATABASE_URL
```

Ejemplo:

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/room_booking npm test
```

El test dispara dos reservas concurrentes para la misma sala y el mismo horario.

Resultado esperado:

```text
1 solicitud exitosa
1 solicitud rechazada con conflicto
```

---

## Lección técnica

El punto más importante del ejercicio no es crear un endpoint.

Es entender que:

> Una validación en la capa de aplicación no garantiza por sí sola la integridad de los datos bajo concurrencia.

Un backend L3 debería:

1. Identificar la condición de carrera.
2. Mantener la validación y la escritura dentro de una misma transacción.
3. Usar un mecanismo de serialización apropiado.
4. Retornar errores HTTP consistentes.
5. Probar el comportamiento concurrente.

En este proyecto se utiliza un **bloqueo pesimista por sala** con `SELECT ... FOR UPDATE`.

Es una solución simple y razonable para este dominio porque la unidad de contención es clara: la sala.

En un sistema de mayor escala también podrían evaluarse:

- restricciones nativas de PostgreSQL con rangos y `EXCLUDE`;
- niveles de aislamiento más estrictos;
- retries controlados;
- idempotencia;
- observabilidad y métricas de contención.

La decisión correcta depende del dominio, volumen y patrón de concurrencia.
