# Plantillas y navegación · revisión del 20 de octubre de 2026

## Qué se ha verificado y qué no

No se han conseguido verificar las plantillas completas de los 30 equipos de 2026-27. La web no afirma que estén completas ni convierte las asociaciones del historial en pertenencias actuales.

La [documentación oficial de BALLDONTLIE](https://docs.balldontlie.io/#account-tiers) ofrece Players y Games gratis. Sin embargo, el listado general `/v1/players`, incluso filtrado por `team_ids[]`, no certifica por sí solo una plantilla activa de una temporada. El endpoint específico [Active Players](https://docs.balldontlie.io/#get-all-active-players), `/v1/players/active`, requiere un plan de pago. No se ha llamado a ese endpoint, iniciado un trial ni añadido consultas autenticadas al navegador. La actualización del calendario conserva su funcionamiento y su secreto exclusivamente en Actions.

La base independiente inicial incluye las 30 franquicias, con **solo dos pertenencias revisadas manualmente**, todas las coberturas de equipo marcadas como parciales:

| Jugador | Equipo contrastado en NBA.com | ID NBA | ID ESPN | Identidad contrastada |
| --- | --- | --- | --- | --- |
| Jayson Tatum | [Boston](https://www.nba.com/team/1610612738/celtics) | 1628369 | 4065648 | [Perfil NBA](https://www.nba.com/player/1628369/jayson-tatum), [perfil ESPN](https://www.espn.com/nba/player/_/id/4065648/jayson-tatum); misma fecha de nacimiento: 1998-03-03 |
| Cade Cunningham | [Detroit](https://www.nba.com/team/1610612765/pistons) | 1630595 | 4432166 | [Perfil NBA](https://www.nba.com/player/1630595/cade-cunningham), [perfil ESPN](https://www.espn.com/nba/player/_/id/4432166/cade-cunningham); misma fecha de nacimiento: 2001-09-25 |

La pertenencia se comprobó en las páginas oficiales del equipo y jugador. Las páginas de ESPN no se utilizaron como prueba de la plantilla actual: se contrastaron los identificadores y los datos biográficos de los perfiles indexados. No se han copiado estadísticas, noticias, lesiones ni bases históricas. Esta revisión parcial no verifica ni disponibilidad ni alineaciones.

Cada pertenencia tiene fuente y fecha. Se deja de presentar como actual después de siete días sin revisión (o si la fecha es futura). La identidad estable no caduca con esa pertenencia: se conserva para poder analizar toda la carrera disponible, también después de un traspaso. No hay una renovación automática ficticia de esas fechas al desplegar la web.

## Uso del detalle de partido

1. Entra en **Partidos** y pulsa **Consultar historial**.
2. El detalle muestra por defecto solo jugadores con pertenencia revisada y vigente. Verás un aviso de revisión parcial y las fuentes por equipo y jugador. Si no hay ninguno, se explica en lugar de rellenar nombres.
3. **Jugadores históricos** abre las asociaciones presentes en tus temporadas importadas. No afirma que todos esos jugadores hayan abandonado el equipo: algunos podrían seguir allí sin estar contrastados en la base actual.
4. Pulsa un jugador para consultar su historial completo por ID estable, con todos sus equipos anteriores. No se añade automáticamente un filtro de equipo actual.
5. Si no existe un cruce de identidad revisado o no hay actuaciones importadas, aparece **Sin estadísticas disponibles**; no se sustituye al jugador por otro ni se empareja solo por nombre.
6. **← Volver al partido** regresa al mismo encuentro; se conserva el apartado histórico abierto y su desplazamiento. **← Volver a Partidos** regresa al calendario.

Las tendencias de próximos partidos utilizan las pertenencias revisadas para jugadores, por lo que son parciales; las tendencias de equipos siguen usando sus históricos. El equipo actual se utiliza para seleccionar el próximo encuentro, nunca para reemplazar el equipo de las actuaciones pasadas. La demostración continúa disponible con sus propias etiquetas y asociaciones sintéticas.

## Actualizar plantillas sin programar

En **Datos → Plantillas actuales · 2026-27** puedes:

- Elegir uno de los 30 equipos y abrir su página oficial.
- Introducir nombre e ID NBA (el número de la dirección del perfil oficial).
- Añadir opcionalmente el ID ESPN para enlazar tu historial hoopR. Revisa ambos perfiles y la misma fecha de nacimiento; no basta con que el nombre coincida.
- Marcar la casilla de comprobación solo después de contrastar pertenencia e identidad. Sin marcarla se guarda como pendiente y no aparece entre los actuales.
- Guardar una revisión; mover el mismo ID NBA a otro equipo no elimina sus estadísticas. La revisión queda declarada por quien la introdujo, no certificada automáticamente por la aplicación.
- **Retirar del listado actual** pasa la pertenencia a pendiente y conserva sus cruces de identidad y todo el historial.
- Exportar/importar plantillas como JSON, o descargar una plantilla vacía de las 30 franquicias para una revisión más amplia. Estos archivos contienen nombres, IDs y evidencias, nunca las estadísticas personales.

Los datos manuales se guardan en otra base local, `nba-tendencias-rosters`, sin modificar `nba-tendencias-personal`. La validación comprueba estructura, IDs duplicados, dominios oficiales, fechas y evidencias del cruce; no visita ni certifica automáticamente el contenido de los enlaces importados. Revisa las fuentes de un archivo antes de considerarlo fiable. El tamaño máximo es 2 MB.

La base pública vive en `public/data/rosters.json`. Un mantenedor puede ampliarla con revisiones documentadas y publicar únicamente esa información de plantillas, sin estadísticas ni credenciales. No se habilita ninguna descarga masiva de NBA.com/ESPN ni se presume una licencia general para reutilizar bases de terceros. Las revisiones locales del usuario no se suben a GitHub.

## Rutas, favoritos y botones del navegador

Se usa **React Router con HashRouter**, compatible con GitHub Pages sin reglas del servidor ni errores 404 al abrir enlaces de la aplicación:

- `#/partidos` y `#/partidos/bdl%3Agame%3A…`
- `#/jugadores` y `#/jugadores/nba%3Aplayer%3A…` (también IDs ESPN históricos)
- `#/equipos` y `#/equipos/BOS`
- `#/tendencias` y `#/datos`

Los parámetros de la dirección conservan estadística, línea, más/menos, muestra o cantidad personalizada, local/visitante, rival, competición, temporadas y periodo. `from` conserva el partido de origen. El botón **Copiar enlace del análisis** permite compartirlo o guardarlo como favorito; quien lo abra necesitará su propio historial local para ver estadísticas.

Los cambios de filtro reemplazan la entrada actual, para que Atrás vuelva al encuentro y no obligue a deshacer cada pulsación. Seleccionar otro jugador o apartado crea una nueva entrada. Atrás y Adelante restauran la dirección y sus filtros; también se recuerdan los análisis visitados al volver a abrir el mismo jugador durante la sesión. Si el enlace se abrió directamente, el botón de volver ofrece una ruta interna segura. No se usa `history.back()` indiscriminadamente.

Las rutas se renderizan dentro de la misma aplicación: cambiar de vista no vuelve a cargar los CSV, no reimporta datos, ni escribe en la base del historial. Los filtros y el enlace no incluyen filas estadísticas. No se ha cambiado el nombre, versión, esquema ni contenido del guardado de tus temporadas.

## Verificación reproducible

`npm test` incluye rutas y filtros compartibles, rechazo de fuentes/IDs conflictivos, pertenencias pendientes/caducadas, homónimos, historial de 200 actuaciones entre equipos, tendencias tras un traspaso y guardado independiente sin modificar el historial anterior. Las fixtures estadísticas son sintéticas.

Las pruebas de navegador utilizan perfiles aislados, calendario real descargado y estadísticas sintéticas claramente identificadas. Comprueban detalle → jugador → vuelta, Atrás/Adelante, posición de desplazamiento, filtros, enlaces directos y recarga, ausencia de estadísticas para un jugador sin historial, base manual independiente y huella del guardado personal intacta. No acceden al navegador personal del usuario.

Se prueba Chromium de escritorio y emulación móvil de 390 × 844. No hay un iPhone físico ni WebKit instalado en el entorno: la comprobación final en Safari/Chrome de tu iPhone queda pendiente de tu prueba en el dispositivo. No se afirma haberla ejecutado en hardware real.
