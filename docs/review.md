# Code Review

Revisión del backend (FastAPI) y frontend (Next.js) sobre el estado actual de `main` (commit `cb99c22`). Alcance: `backend/*.py`, `frontend/src/**`, Dockerfile/scripts, y consistencia con `CLAUDE.md` / `AGENTS.md`.

## Resumen

El código es simple, coherente con las decisiones documentadas en `CLAUDE.md` (JSON-as-DB, un solo endpoint genérico de PUT, validación referencial de tarjetas/columnas) y tiene buena cobertura de tests para los casos ya contemplados. Los hallazgos son en su mayoría de robustez y cobertura de tests, no bugs funcionales activos.

## Hallazgos

### 1. Errores de red hacia OpenRouter no se capturan (Alto)
`backend/main.py:62-70` y `backend/main.py:73-94` sólo capturan `ValueError` y `httpx.HTTPStatusError` alrededor de las llamadas a `ai_client`. `httpx.post` (en `backend/ai_client.py:82` y `:120`) puede lanzar `httpx.ConnectError`, `httpx.TimeoutException`, etc. (subclases de `httpx.RequestError`, no de `HTTPStatusError`). Si OpenRouter no responde o hay un timeout, la excepción no se atrapa y el endpoint devuelve un 500 no controlado en vez de un 502 informativo como en los demás casos de fallo de IA.

**Sugerencia:** capturar `httpx.RequestError` (superclase de `HTTPStatusError`) junto a `ValueError` y devolver 502, igual que los otros casos.

### 2. `/api/ai/query` no lo usa el frontend (Medio)
`frontend/src/lib/api.ts` sólo llama a `/api/ai/board` (`sendAIQuery`, línea 53-59). El endpoint `/api/ai/query` (`backend/main.py:62-70`) y `ai_client.fetch_openrouter_response` (`backend/ai_client.py:71-89`) no tienen ningún llamador real en la app — sólo están cubiertos por tests de backend.

`CLAUDE.md` documenta explícitamente que los endpoints de mutación por-tarjeta se eliminaron por ser "código muerto no conectado al frontend con bugs latentes". El mismo criterio aplica aquí: si no hay plan de usarlo desde la UI, es candidato a eliminarse (o, si se mantiene como API pública intencional, documentarlo como tal en `CLAUDE.md`).

### 3. Sin límite de tamaño en el prompt de IA (Medio)
`schemas.AIRequest.prompt` y `AIBoardRequest.prompt` (`backend/schemas.py:31-37`) son `str` sin `max_length`. Como la autenticación es un token dummy fijo y conocido (documentado en el propio repo), cualquiera con acceso a la instancia puede enviar prompts arbitrariamente grandes, generando costo de API sin límite. Aceptable para un MVP local, pero vale la pena un `max_length` razonable en el schema como salvaguarda barata.

### 4. Botón "Remove" comparte listeners de arrastre con la tarjeta (Bajo)
En `frontend/src/components/KanbanCard.tsx:21-31`, `{...attributes}` y `{...listeners}` de `useSortable` se aplican al `<article>` completo, y el botón "Remove" (línea 42-49) es un hijo dentro de esa misma superficie. Hoy funciona porque `PointerSensor` tiene `activationConstraint: { distance: 6 }` (`KanbanBoard.tsx:33-35`), pero es una dependencia implícita y frágil: cualquier cambio futuro al sensor de arrastre podría hacer que un click en "Remove" también dispare un `dragstart`. Un `event.stopPropagation()` en el `onClick`/`onPointerDown` del botón lo haría robusto independientemente de la configuración del sensor.

### 5. Cobertura de test: camino feliz de `ai_board` no probado (Bajo)
`backend/tests/test_main.py` cubre `ai_board` sólo para JSON inválido (`test_ai_board_with_invalid_response`) y para un board sugerido con referencia colgante (`test_ai_board_drops_invalid_suggested_board`), pero no hay ningún test donde la IA sugiera un board **válido** y se confirme que `ai_board` lo devuelve y pasa la validación (`backend/main.py:86-94`). Es la ruta principal del feature de chat AI y hoy no tiene un test que la ejercite de punta a punta.

### 6. Cobertura de test: fallo de red hacia OpenRouter (Bajo)
Ligado al hallazgo 1 — no hay test que simule un `httpx.RequestError` (timeout/conexión) en `/api/ai/query` o `/api/ai/board`. Al arreglar el hallazgo 1 conviene añadir un test que confirme el 502 en ese escenario.

### 7. `AGENTS.md` sigue describiendo SQLite (Informativo)
`AGENTS.md:24` dice "Use SQLLite local database", pero la implementación real es un archivo JSON leído/escrito directamente (`backend/db.py`), como ya documenta correctamente `CLAUDE.md`. No es un bug de código, pero `AGENTS.md` quedó desactualizado respecto a esta decisión y puede confundir a quien lo lea primero.

## Lo que está bien

- Validación referencial de board (`db.validate_board`) aplicada tanto en `PUT /api/kanban` como, independientemente, sobre las sugerencias de la IA en `ai_board` — evita que un board corrupto llegue al frontend, con test de ambos caminos.
- Escritura atómica de `kanban.db` (`db.write_board`, temp file + `os.replace`), con test que confirma que no queda un archivo a medio escribir si la validación falla.
- `_extract_json_object` en `ai_client.py` maneja de forma robusta el caso común de que el LLM envuelva el JSON en prosa o markdown, sin depender de que el proveedor soporte structured output nativo.
- Buena señal de código muerto ya eliminado (endpoints por-mutación) documentada como decisión explícita en `CLAUDE.md` — la misma disciplina debería aplicarse al hallazgo 2.
- Tests de frontend (`KanbanBoard.test.tsx`) incluyen un caso específico de robustez (columna con referencia a tarjeta inexistente no rompe el render), consistente con el defense-in-depth mencionado en `CLAUDE.md`.
