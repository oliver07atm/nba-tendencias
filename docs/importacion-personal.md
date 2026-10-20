# Importar tu historial personal sin programar

La aplicación cuesta **0 €** y no necesitas una API, una clave ni una cuenta adicional. Tú seleccionas los archivos que tengas permitido utilizar. La web no descarga estadísticas, no envía tus archivos y no publica tu historial en GitHub. La versión distribuida en GitHub Pages sigue incluyendo únicamente la demostración.

## Importar una temporada

1. Abre NBA Tendencias y entra en **Datos**.
2. Busca **Importar estadísticas NBA desde CSV**.
3. En **Estadísticas de jugadores**, selecciona el CSV de jugadores.
4. En **Estadísticas de equipos**, selecciona el CSV de equipos.
5. En **Calendario**, selecciona el CSV del calendario de esa misma temporada.
6. Deja marcadas **Combinar con mi historial personal** y **Guardar al importar en este navegador (IndexedDB)**.
7. Pulsa **Convertir e importar temporada** y espera a que aparezca el mensaje de guardado.

Por ejemplo, para 2024-25 corresponden `player_box_2025.csv`, `team_box_2025.csv` y `nba_schedule_2025.csv`; para 2025-26, los tres nombres terminan en `2026.csv`. Es el año **final** de temporada. El contenido de los tres archivos debe coincidir en ese año, aunque hayas cambiado sus nombres.

Repite los pasos con otra temporada para ampliar el historial. Si importas otra vez los mismos registros, no se duplican. Si dos copias del mismo registro difieren, aparece un error y se conserva el historial que ya tenías; no se elige silenciosamente un resultado.

Los CSV necesitan el esquema que admite el conversor de SportsDataverse/hoopR. Un archivo diferente no es necesariamente compatible aunque se llame igual. Los archivos de temporadas anteriores se aceptan si contienen los campos necesarios. Hay un máximo de 64 MB por CSV y 300.000 registros combinados; ese total cuenta actuaciones de jugadores y de equipos, no solo partidos. En dispositivos con poca memoria conviene añadir una temporada cada vez.

## Consultar los gráficos

Entra en **Jugadores** o **Equipos**. El histórico importado se usa automáticamente para puntos, rebotes, asistencias, triples, combinaciones y puntos por cuarto/mitad/partido de los equipos. Mantienes las líneas editables y los filtros de muestras, temporadas, local/visitante, rival y competición.

Puedes elegir últimos 5, 10, 15, 20, 30, 50, 100, 150, 200 y 300; una cantidad personalizada; o todo lo disponible. Si has pedido 200 y solo hay 83 actuaciones válidas, se muestran 83: no se rellenan encuentros que faltan. Dos temporadas no garantizan 200 actuaciones por jugador.

Los registros se identifican como **históricos de procedencia declarada, pendientes de verificación**. La conversión valida su formato y ciertas coherencias, pero no los convierte en estadísticas oficiales verificadas. Las filas DNP, estadísticas incompletas o partidos incompatibles se excluyen. Abre **Ver informe de la última importación CSV** para consultar los recuentos e incidencias.

El histórico de actuaciones no es un calendario de próximos partidos. La sección de tendencias de próximos encuentros necesita un calendario futuro compatible; importar una temporada terminada no inventa ese calendario. La demostración mantiene su calendario de ejemplo.

## Conservarlo en el navegador

Con la casilla de guardado marcada, la web guarda el historial en **IndexedDB de este navegador y dispositivo** después de cada importación correcta. Al volver a abrir la misma dirección se recupera automáticamente, sin volver a seleccionar archivos. También puedes pulsar **Guardar historial localmente**.

Si desmarcas la casilla, la importación queda en la sesión actual y no reemplaza la copia guardada anterior. Si el navegador no permite guardar o se queda sin espacio, se muestra un aviso: los datos cargados siguen disponibles en esa sesión para exportarlos y la copia anterior no se reemplaza parcialmente.

El almacenamiento local no es una copia de seguridad permanente: borrar los datos del sitio, el modo privado o las decisiones de almacenamiento del navegador pueden eliminarlo. Conserva una exportación JSON. Los datos no se sincronizan automáticamente entre Safari, Chrome, otro perfil o un segundo dispositivo.

## Llevarlo al iPhone

1. En **Datos → Mi historial personal**, pulsa **Exportar historial JSON**.
2. Conserva el archivo descargado `nba-tendencias-historial-personal.json` y transfiérelo al iPhone por el medio que elijas.
3. Guarda el archivo en **Archivos** del iPhone.
4. Abre NBA Tendencias en Safari y entra en **Datos**.
5. En **Importar JSON o CSV**, pulsa **Selecciona un archivo** y elige el JSON desde Archivos.
6. Mantén marcada la opción de guardar. Espera el mensaje de guardado antes de cerrar la pestaña.

No necesitas volver a seleccionar los tres CSV en el iPhone. La importación del JSON respeta la opción de combinar con el historial que ya exista en ese navegador. El máximo para JSON o CSV normalizado es 256 MB, sujeto a la memoria y al espacio disponibles en el dispositivo.

El JSON conserva el historial completo, no solo el filtro de los gráficos. **Exportar análisis** sigue descargando un análisis concreto; para trasladar todos tus registros utiliza **Exportar historial JSON**.

## Volver a la demostración o borrar la copia

- **Usar demostración** cambia el conjunto activo sin borrar tu historial personal. Si recargas, conserva esa elección.
- **Usar mi historial** vuelve a activar tu copia sin cargar archivos.
- **Eliminar historial local** ofrece una confirmación y borra el historial de este navegador. No borra tus CSV originales ni los JSON que hayas exportado.

Los archivos y sus contenidos se leen en tu dispositivo. La web sí necesita cargar su propio código desde GitHub Pages; eso no supone subir tus estadísticas. No se ha implementado una instalación totalmente sin conexión.
