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

## Fase 3: Prioridad/fecha de vencimiento en tarjetas, búsqueda y gestión de cuenta

Objetivo:
- Añadir metadatos de tarjeta útiles para gestión de proyectos real (prioridad, fecha de vencimiento), una forma de encontrar tarjetas en tableros grandes, y autogestión básica de la cuenta (cambiar contraseña) — completando el pedido explícito de "user management" además de cuentas/login.

Tareas:
- `backend/schemas.py`: `Card` gana `priority: "low"|"medium"|"high"` (default `"medium"`) y `dueDate: str | None` (default `None`) — ambos con default, así que tableros/tarjetas guardados antes de este cambio siguen siendo válidos sin migración.
- `backend/db.py`: seed data (`default_data()`) usa fechas de vencimiento relativas al momento de creación de la DB (una tarjeta vencida, una próxima) para que la demo muestre el estado "atrasado" sin datos hardcodeados que queden obsoletos; nuevo helper `set_user_password`.
- Nuevo endpoint `POST /api/auth/change-password` (requiere la contraseña actual, no invalida otras sesiones activas).
- Frontend: `NewCardForm` gana selects de prioridad y fecha de vencimiento; `KanbanCard` los vuelve editables in-place (no hay formulario de edición separado) y resalta en rojo una fecha vencida (`kanban.ts#isOverdue`); `KanbanBoard` gana una caja de búsqueda que filtra tarjetas por título/detalle en el cliente (no llama al backend) y ajusta el `SortableContext` de `@dnd-kit` a solo las tarjetas visibles; nuevo componente `AccountMenu` (dentro de `AppHeader`) para cambiar la contraseña.
- Tests: `backend/tests/test_db.py`/`test_main.py` (round-trip de prioridad/fecha, rechazo de prioridad inválida, cambio de contraseña correcto/incorrecto/validación), `frontend/src/lib/kanban.test.ts` (`cardMatchesQuery`, `isOverdue`), `KanbanBoard.test.tsx` (crear/editar prioridad y fecha, filtrado por búsqueda), `kanban.spec.ts` (edición con estilo de vencido, búsqueda, cambio de contraseña con y sin éxito).
- Dos smoke tests manuales de punta a punta contra el backend real (sin mocks) en esta fase y en la Fase 2, para verificar el contrato cliente/servidor tras cambios simultáneos en ambos lados.

Criterios de éxito:
- Crear o editar una tarjeta permite fijar prioridad y fecha de vencimiento, y ambas persisten tras recargar.
- Una tarjeta con fecha de vencimiento pasada se distingue visualmente sin necesidad de abrir la tarjeta.
- La búsqueda oculta tarjetas que no coinciden sin alterar los datos del tablero ni romper el drag-and-drop de las tarjetas visibles.
- Un usuario puede cambiar su contraseña y debe volver a iniciar sesión con la nueva; la contraseña anterior deja de funcionar.

## Fase 4: Compartir tableros entre usuarios

Objetivo:
- Permitir que el dueño de un tablero le dé acceso completo (ver/editar) a otros usuarios registrados, en vez de que cada tablero sea visible únicamente para su `ownerId`.

Tareas:
- `backend/db.py`: cada tablero gana `memberIds: list[str]`; nuevas funciones `add_board_member`, `remove_board_member`, `get_accessible_board` (dueño o miembro, para ver/editar/IA) que complementa a `get_owned_board` (solo dueño, para borrar/compartir/dejar de compartir); `list_boards_for_user` ahora incluye tableros propios y compartidos; `board_response` calcula por cada respuesta `isOwner`, `ownerUsername` y `members` según quién pregunta (no se guardan en el tablero, dependen del usuario que consulta).
- Nuevos endpoints `POST /api/boards/{id}/share` (`{username}`, solo dueño, 404 si el tablero no es suyo o el username no existe, 400 si intenta compartir consigo mismo) y `DELETE /api/boards/{id}/share/{memberId}` (solo dueño).
- `get_board`, `update_board` y `ai_board` cambian de `get_owned_board` a `get_accessible_board` para que un miembro pueda ver, editar y usar el chat AI del tablero — pero `delete_board` sigue usando `get_owned_board`, así que un miembro no puede borrar el tablero.
- Frontend: `ShareBoardMenu` (en `AppHeader`) permite al dueño invitar por username y quitar miembros, o muestra "Shared by {ownerUsername}" si el usuario actual no es el dueño; `BoardSwitcher` oculta el ícono de borrar para tableros que no son propios.
- Tests: aislamiento de acceso (dueño puede todo, miembro puede ver/editar/IA pero no borrar/compartir, un tercero sin acceso sigue recibiendo 404), rechazo de compartir con username inexistente o con uno mismo, revocación de acceso.
- Tercer smoke test manual de punta a punta contra el backend real: registra un segundo usuario, comparte el tablero semilla, verifica que puede editarlo pero no borrarlo/compartirlo, confirma que el dueño ve la edición, revoca el acceso y confirma que ya no lo puede ver.

Criterios de éxito:
- El dueño de un tablero puede compartirlo por username con otro usuario registrado, y ese usuario lo ve en su lista de tableros marcado como compartido.
- Un miembro puede editar el contenido del tablero (columnas, tarjetas, IA) pero no puede borrarlo ni gestionar quién tiene acceso.
- Revocar el acceso hace que el tablero desaparezca de la lista del usuario removido inmediatamente.
- Un usuario sin ninguna relación con el tablero (ni dueño ni miembro) sigue recibiendo 404 en todos los endpoints del tablero.

## Fase 5: Asignar tarjetas a un miembro del tablero

Objetivo:
- Permitir asignar cada tarjeta al dueño del tablero o a uno de sus miembros, para saber quién es responsable de cada tarea.

Tareas:
- `backend/schemas.py`: `Card` gana `assigneeId: str | None`; `Board` (no `BoardSummary`) gana `ownerId: str` explícito, porque el frontend necesita un id real (no solo `ownerUsername`) contra el cual asignar.
- `backend/db.py`: nueva `validate_assignees(board, content)` — cada `assigneeId` no nulo debe ser el dueño o estar en `memberIds`, si no, `ValueError`.
- `update_board` llama a `validate_assignees` además de `validate_board_content` (422 si falla); `ai_board` hace lo mismo antes de aceptar una sugerencia de la IA (se descarta igual que un board referencialmente roto).
- Frontend: `kanban.ts#boardCollaborators(board)` = dueño + miembros; `KanbanCard` y `NewCardForm` ganan un select de "Assignee" con esa lista más "Unassigned".
- Tests: validación de asignación válida/invalida en `db` y a través del endpoint, IA descartando una sugerencia con asignación inválida.

Criterios de éxito:
- Una tarjeta puede asignarse al dueño o a cualquier miembro del tablero, y reasignarse después de creada.
- Asignar una tarjeta a alguien sin acceso al tablero es rechazado (422) tanto si lo hace un usuario como si lo sugiere la IA.

## Próximo paso

Posibles siguientes iteraciones (no iniciadas): comentarios por tarjeta, niveles de acceso más finos (solo lectura vs edición), invalidar otras sesiones al cambiar la contraseña, y filtros de búsqueda adicionales (por prioridad, por vencidas, por asignado).
