# The Project Management MVP web app

## Objetivo

Construir un MVP local de una aplicación de gestión de proyectos con:
- inicio de sesión dummy
- un tablero Kanban visible después del login
- columnas fijas que se pueden renombrar
- tarjetas movibles, editables y persistentes
- sidebar de chat AI que puede sugerir cambios al tablero

## Alcance del MVP

- Usuario hardcodeado: `user` / `password`
- Un solo tablero por usuario
- Ejecución local dentro de Docker
- Next.js frontend + FastAPI backend
- Persistencia en SQLite local
- Conectividad AI usando OpenRouter y `openai/gpt-oss-120b`

## Fases del proyecto

### Parte 1: Plan

Objetivo:
- Detallar el plan y obtener aprobación antes de empezar implementación.
- Crear un `frontend/AGENTS.md` que describa el estado del frontend actual.

Tareas:
- Revisar el código existente en `frontend/`.
- Crear `frontend/AGENTS.md` con:
  - estructura de carpetas y páginas
  - componentes clave
  - librerías principales
  - punto de entrada y rutas actuales
- Detallar para cada fase:
  - subtareas específicas
  - criterios de éxito
  - pruebas necesarias
- Validar el plan con el usuario.

Criterios de éxito:
- `docs/PLAN.md` tiene pasos detallados, checklists y criterios de aceptación.
- `frontend/AGENTS.md` existe y describe correctamente el frontend actual.
- El usuario aprueba el plan antes de avanzar.

Pruebas:
- Revisión con el usuario.
- Verificación de la presencia y contenido de `frontend/AGENTS.md`.

### Parte 2: Scaffolding

Objetivo:
- Crear la infraestructura básica para correr frontend y backend en Docker.
- Servir una página estática mínima y un endpoint API de prueba.

Tareas:
- Crear `Dockerfile` para app full-stack.
- Añadir `docker-compose.yml` si se justifica para desarrollo local.
- Crear servicio FastAPI en `backend/`.
- Escribir scripts de arranque/parada en `scripts/` para macOS/Linux/Windows.
- Añadir endpoint de sanity check, por ejemplo `/api/health`.
- Servir HTML estático básico en `/`.

Criterios de éxito:
- La app corre en Docker local sin errores.
- `GET /` devuelve HTML estático.
- `GET /api/health` devuelve un JSON simple.

Pruebas:
- Construir y ejecutar el contenedor.
- Verificar el endpoint de salud con `curl`.

### Parte 3: Añadir Frontend

Objetivo:
- Integrar el frontend existente en la aplicación Docker.
- Construir y servir el sitio Next.js estáticamente.

Tareas:
- Configurar build y export estático de Next.js.
- Servir la carpeta build desde FastAPI.
- Asegurar que `/` muestra el tablero demo.
- Añadir pruebas unitarias e integración del frontend.

Criterios de éxito:
- El frontend se carga correctamente desde `http://localhost:8000/`.
- El tablero demo aparece en la ventana principal.
- Las pruebas de frontend básicas pasan.

Pruebas:
- Ejecutar suite de tests de frontend.
- Verificar manualmente la UI.

### Parte 4: Login falso

Objetivo:
- Agregar un flujo de login dummy para proteger el tablero.

Tareas:
- Crear pantalla de login en el frontend.
- Implementar validación simple `user` / `password`.
- Agregar almacenamiento de sesión simple (cookie/localStorage).
- Implementar logout.
- Añadir pruebas de login y logout.

Criterios de éxito:
- Sin login, el usuario no ve el tablero.
- Con credenciales correctas, el usuario accede al tablero.
- El usuario puede cerrar sesión y volver a la pantalla de login.

Pruebas:
- UI tests para login y redirección.
- Pruebas de estado de sesión.

### Parte 5: Modelado de base de datos

Objetivo:
- Definir el esquema de datos y documentarlo.

Tareas:
- Definir modelo de datos para:
  - usuarios
  - tableros
  - columnas
  - tarjetas
- Decidir si usar JSON completo o datos relacionales.
- Documentar la estrategia en `docs/`.
- Crear un diagrama o tabla de esquema simple.

Criterios de éxito:
- Existe documentación clara en `docs/` del esquema SQLite.
- El diseño admite múltiples usuarios y un tablero por usuario.
- La base de datos se crea automáticamente si falta.

Pruebas:
- Verificar el esquema en SQLite.
- Ejecutar un test de creación de BD.

### Parte 6: Backend

Objetivo:
- Añadir API para leer y modificar el Kanban persistente.

Tareas:
- Crear endpoints CRUD para tablero, columnas y tarjetas.
- Implementar persistencia con SQLite.
- Asegurar creación automática de la base de datos.
- Añadir protección de usuario dummy si se usa auth.
- Escribir tests unitarios y de integración del backend.

Criterios de éxito:
- La API devuelve el estado del tablero de un usuario.
- La API acepta y persiste actualizaciones.
- La base de datos se crea si no existe.

Pruebas:
- Endpoints con `pytest`.
- Persistencia en un archivo SQLite temporal.

### Parte 7: Frontend + Backend

Objetivo:
- Hacer que el frontend consuma la API real para persistencia.

Tareas:
- Cambiar el frontend para cargar datos desde `/api/kanban`.
- Guardar cambios de columnas y tarjetas en el backend.
- Sincronizar el UI con estado del servidor.
- Añadir pruebas de integración.

Criterios de éxito:
- Cambios en la UI persisten tras recargar.
- El tablero se actualiza con datos del backend.
- Las pruebas cubren los flujos clave.

Pruebas:
- Test de integración para cargar/guardar datos.
- Verificación manual tras recarga.

### Parte 8: Conectividad AI

Objetivo:
- Confirmar que el backend puede llamar a OpenRouter.

Tareas:
- Implementar un cliente OpenRouter en el backend.
- Configurar `OPENROUTER_API_KEY` en `.env`.
- Añadir endpoint de prueba AI.
- Crear un test que valide una respuesta simple (por ejemplo `2+2`).

Criterios de éxito:
- El backend se conecta al servicio OpenRouter.
- Una prueba de prompt simple devuelve una respuesta válida.
- Hay cobertura de error cuando falta la clave.

Pruebas:
- Test de conectividad AI.
- Prueba de manejo de errores.

### Parte 9: AI con Structured Outputs

Objetivo:
- Enviar al modelo el JSON del Kanban y la pregunta del usuario.
- Interpretar respuestas que incluyan cambios al tablero.

Tareas:
- Definir el payload de modelo y el formato de salida esperado.
- Implementar parser de Structured Outputs.
- Aplicar cambios al tablero cuando el modelo devuelva actualizaciones.
- Añadir tests para el parser y la lógica de actualización.

Criterios de éxito:
- El backend envía estado + pregunta al modelo.
- El backend puede parsear actualizaciones estructuradas.
- Las actualizaciones se aplican al tablero cuando existen.

Pruebas:
- Test de parsing con respuestas simuladas.
- Test de lógica de actualización.

### Parte 10: UI de chat AI

Objetivo:
- Agregar un sidebar de chat AI al frontend.
- Permitir que el modelo responda y actualice el tablero.

Tareas:
- Crear componente de chat en el frontend.
- Llamar al endpoint AI desde la UI.
- Mostrar la respuesta y cualquier cambio aplicado al tablero.
- Actualizar el tablero automáticamente si el AI modifica datos.
- Añadir pruebas de frontend para el chat.

Criterios de éxito:
- El usuario puede enviar mensajes al AI desde la UI.
- El AI responde en el sidebar.
- Las modificaciones del AI se reflejan en el tablero.
- Las pruebas cubren el flujo de chat y actualización.

Pruebas:
- UI tests de chat.
- Integración que verifica actualizaciones del tablero.

## Notas generales

- Mantener la simplicidad y evitar sobreingeniería.
- Documentar cada fase antes de avanzar.
- Priorizar pruebas para cada etapa.

## Fase 2: Multiusuario y multi-tablero

Objetivo:
- Superar el alcance original del MVP (usuario hardcodeado, un solo tablero) para soportar cuentas de usuario reales y múltiples tableros Kanban por usuario.

Tareas:
- Rediseñar `backend/db.py` para almacenar `users`, `sessions` y `boards` en el mismo archivo JSON (`kanban.db`), en vez de un único tablero.
- Hashear contraseñas (PBKDF2-HMAC-SHA256 con salt aleatorio por usuario) — nunca texto plano.
- Añadir endpoints `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, con tokens de sesión aleatorios (no un token dummy fijo).
- Añadir endpoints CRUD de tableros: `GET/POST /api/boards`, `GET/PUT/DELETE /api/boards/{id}`, con verificación de propiedad (`ownerId`) — un tablero ajeno responde 404, no 403, para no filtrar su existencia.
- Adaptar `POST /api/ai/board` para operar sobre un `boardId` (cargado desde el servidor) en vez de recibir el tablero completo del cliente.
- Frontend: pantalla de registro/login combinada (`AuthForm`), selector de tableros (`BoardSwitcher`: crear, renombrar, eliminar, cambiar), estado vacío cuando el usuario no tiene tableros (`EmptyBoardsState`), y `AppHeader` como el nuevo contenedor del encabezado (separado de `KanbanBoard`, que ahora solo renderiza el contenido de un tablero).
- Actualizar toda la suite de tests (backend `pytest`, frontend `vitest` + `playwright`) para el nuevo modelo, incluyendo casos de aislamiento entre usuarios (un usuario no puede leer/editar/borrar el tablero de otro).
- Sincronizar `CLAUDE.md` y `AGENTS.md` con la arquitectura resultante.

Criterios de éxito:
- Un usuario nuevo puede registrarse, iniciar sesión, crear su primer tablero y operarlo con drag-and-drop, chat AI, etc., igual que en el MVP original.
- Un usuario no puede ver ni modificar tableros de otro usuario (verificado con tests).
- El usuario semilla (`user`/`password`) sigue funcionando para la demo, con su tablero original.

Pruebas:
- `backend/tests/test_db.py` y `test_main.py`: hashing/verificación de contraseñas, sesiones, CRUD de tableros, aislamiento entre usuarios, casos de error de red hacia OpenRouter.
- `frontend/src/components/KanbanBoard.test.tsx`: adaptado al tipo `Board` (con `id`/`title`).
- `frontend/tests/kanban.spec.ts`: registro con estado vacío, cambio entre tableros, borrado de tableros, además de los flujos de tarjetas ya existentes.
- Smoke test manual de punta a punta contra el backend real (sin mocks) para confirmar que el contrato cliente/servidor coincide.

## Próximo paso

Posibles siguientes iteraciones (no iniciadas): etiquetas/prioridades en las tarjetas, fechas de vencimiento, comentarios por tarjeta, o compartir un tablero entre varios usuarios (hoy cada tablero pertenece a un solo `ownerId`).
