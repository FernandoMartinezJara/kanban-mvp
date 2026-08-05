# Frontend AGENTS

## Propósito

Este archivo describe el estado actual del frontend en `frontend/` y los puntos clave a considerar antes de integrar con el backend.

## Arquitectura

- Framework: Next.js 16.1.6
- React 19.2.3
- Styling: Tailwind CSS v4
- Drag and drop: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- Testing: Vitest para unit tests, Playwright para E2E

## Estructura principal

- `src/app/page.tsx`
  - La página principal renderiza `KanbanBoard`.

- `src/components/KanbanBoard.tsx`
  - Componente principal del tablero.
  - Usa estado local para `board` y `activeCardId`.
  - Maneja drag-and-drop, renombrar columnas, agregar tarjetas y eliminar tarjetas.
  - Usa `DndContext` de `@dnd-kit/core`.

- `src/components/KanbanColumn.tsx`
  - Representa una columna del tablero.
  - Permite renombrar la columna mediante un `input` controlado.
  - Renderiza las tarjetas con `SortableContext`.
  - Incluye el formulario `NewCardForm` para agregar tarjetas.

- `src/components/KanbanCard.tsx`
  - Componente draggable para cada tarjeta.
  - Usa `useSortable` de `@dnd-kit/sortable`.
  - Incluye botón `Remove` para borrar la tarjeta.

- `src/components/KanbanCardPreview.tsx`
  - Vista de overlay mientras se arrastra una tarjeta.

- `src/components/NewCardForm.tsx`
  - Formulario para crear una nueva tarjeta.
  - Tiene un estado local de título y detalles.

- `src/lib/kanban.ts`
  - Tipos de datos: `Card`, `Column`, `BoardData`.
  - Datos iniciales de ejemplo en `initialData`.
  - Lógica `moveCard` para reordenar y mover tarjetas entre columnas.
  - Generador de IDs simple `createId`.

## Estado actual

- El tablero funciona completamente en el cliente.
- No hay integración con backend ni persistencia real.
- No existe autenticación ni login.
- Los datos se reinician al recargar la página.
- La experiencia actual es un demo de UI con funcionalidad de arrastrar/soltar.

## Pruebas existentes

- `src/lib/kanban.test.ts`
  - Test unitarios para la función `moveCard`.

## Puntos de extensión

1. Autenticación
   - Agregar una pantalla de login y lógica de sesión.

2. Persistencia
   - Reemplazar el estado local de `KanbanBoard` con llamadas a una API.

3. Backend
   - Definir endpoints para leer y escribir el estado del tablero.

4. Chat AI
   - Añadir un nuevo sidebar de chat y una ruta API para AI.

## Conclusión

El frontend actual es una demo completa de la UI de Kanban, con columnas editables y tarjetas movibles.
Para avanzar, la integración debe centrarse en:
- agregar auth dummy,
- cargar y guardar datos desde el backend,
- mantener la experiencia de arrastrar/soltar,
- y añadir un chat AI complementario.
