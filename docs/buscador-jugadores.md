# Buscador de jugadores

Disponible en Jugadores, el filtro de jugador de Tendencias y los formularios de plantillas, correcciones de identidad, revisión de actividad y correspondencias NBA Stat.

Pulsa el campo y escribe parte del nombre: `demin` encuentra `Dëmin`, sin distinguir mayúsculas o tildes. Pulsa un resultado para seleccionar. Con teclado usa flechas arriba/abajo y Enter; Inicio/Fin dentro de la lista; Escape cancela y Tab permite continuar sin seleccionar el texto escrito. Sin coincidencias se indica expresamente. Abrir el campo sin escribir muestra todas las opciones disponibles; no se recorta la lista.

Buscar no vincula identidades ni confirma pertenencias o retiradas. Cada pantalla sigue proporcionando exactamente sus propias opciones: los retirados confirmados permanecen excluidos del análisis y disponibles en el formulario de revisión de estado. Los filtros y la navegación siguen en las rutas existentes. No hay escrituras nuevas en IndexedDB.

## Pruebas

`npm test` incluye búsqueda parcial, tildes, IDs intactos, opciones completas y exclusiones, además de las pruebas existentes de estadísticas, identidad y privacidad.

La prueba de interacción usa 522 opciones ficticias y comprueba escritorio y móvil, ratón, teclado, validación de formulario, cancelación y ausencia de coincidencias. Para ejecutarla con Playwright y Chromium instalados en tu entorno, inicia `npm run dev` y ejecuta `node tests/browser/searchable-select.cjs`. Si están fuera del proyecto, define `PLAYWRIGHT_MODULE` y `CHROMIUM_PATH` con sus rutas locales. No se añade Playwright a la aplicación ni se requiere ningún servicio de pago. El fixture se usa solo en desarrollo; no se incluye en la compilación de Pages.

`node tests/browser/player-search.cjs` comprueba además la integración de Jugadores, apertura del gráfico, búsqueda en Tendencias y vuelta atrás. Usa datos de demostración en un perfil nuevo del navegador. `APP_URL` permite comprobar una compilación desplegada.
