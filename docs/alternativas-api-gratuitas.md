# Highlightly, TheSportsDB y API-NBA: evaluación para NBA Tendencias

Revisión documental: **20 de octubre de 2026**. Objetivo: **0 € al mes**, GitHub Pages, estadísticas por actuación y tendencias relacionadas con apuestas deportivas.

**Resultado: ninguna de las tres fuentes queda aprobada para publicar datos en este proyecto.** API-NBA es la candidata técnica que merece aclaración, no una fuente ya autorizada. No se ha creado ninguna cuenta, contratado un plan, introducido una clave, descargado un partido autenticado, sustituido la demostración ni activado una actualización automática.

## Comparación

| Fuente | Nivel gratuito anunciado | Actuaciones individuales NBA | Puntos por cuarto | Histórico de 100/150/200 actuaciones | Decisión para este proyecto |
|---|---|---|---|---|---|
| Highlightly NBA & NCAAB | 100 solicitudes/día | Box score por partido documentado | Listas de puntuación por periodo en partidos | Filtros de temporada y paginación; profundidad efectiva del plan gratis no verificada | No conectar para el uso relacionado con apuestas descrito: la sección 7 contiene una prohibición relevante |
| TheSportsDB v1 | Clave pública de desarrollo `123`; 30 solicitudes/minuto y límites de resultados por método | Hay consulta genérica de estadísticas de jugador; no se ha acreditado un histórico NBA completo por actuación | No acreditado para NBA en el plan gratis | No acreditado; tener calendarios y perfiles no demuestra disponer de box scores históricos | No recomendar como fuente principal del análisis solicitado |
| API-NBA, API-SPORTS | 100 solicitudes/día; guía oficial: 10/minuto | Endpoint específico de estadísticas de jugador por partido | `scores.*.linescore` en los partidos | Descubrimiento de temporadas y filtros de jugador/temporada; acceso y completitud reales pendientes de probar con clave | Mejor candidata técnica, pendiente de permiso para publicar y usar en este contexto |

«Documentado» no significa probado en una cuenta real. «No acreditado» no significa que el proveedor no tenga esos datos en ningún producto o plan.

## 1. Highlightly NBA API

Fuentes: [producto y precios](https://highlightly.net/nba-api/), [box score](https://highlightly.net/nba-api/documentation/box-score/), [partidos](https://highlightly.net/nba-api/documentation/matches/), [paginación y límites](https://highlightly.net/nba-api/documentation/getting-started/pagination/), [condiciones](https://highlightly.net/terms/).

La documentación ofrece `/box-score/{matchId}` con estadísticas de jugadores como puntos, rebotes, asistencias, triples, minutos y pérdidas. `/matches` tiene filtros de fecha/temporada/equipo y listas de puntuación por periodo. El plan Basic anuncia 100 solicitudes diarias sin tarjeta; cada página consume solicitudes. La documentación contempla resultados ocultos según el plan y sus ejemplos no son respuestas reales capturadas. No se ha certificado la cobertura gratuita efectiva de 2023-24, 2024-25 y 2025-26 ni 200 actuaciones de un jugador.

### Condiciones que impiden recomendarla ahora

Las condiciones consultadas están fechadas el 24/07/2026:

- Sección 6.1: permiten almacenamiento, transferencia y distribución de los datos, con restricciones sobre acceso directo a la API y servicios que actúen como proxy.
- Secciones 6.2 y 7: restringen extracción destinada a construir una base o servicio competidor.
- Sección 7: prohíbe emplear los datos para operar, facilitar o apoyar operaciones de gambling/betting/wagering.

El apartado 2.4, donde el proveedor dice que no es una casa de apuestas, **no elimina** la restricción del apartado 7. Para una web expresamente destinada a consultar tendencias relacionadas con apuestas, no asumiría una excepción por ser gratuita o meramente informativa. Haría falta una aclaración o excepción escrita aplicable al proyecto. No se recomienda abrir una cuenta ni solicitar una clave para conectarla en estas condiciones.

## 2. TheSportsDB

Fuentes: [guía oficial](https://www.thesportsdb.com/docs_api_guide.php) y [condiciones](https://www.thesportsdb.com/docs_terms_of_use.php).

La documentación gratuita actual indica 30 solicitudes/minuto y límites por respuesta: estadísticas de jugador 10, estadísticas de evento 5, eventos de temporada 15 y eventos de día 3. Son límites documentados de métodos, no una medición de cobertura NBA. Las consultas genéricas de perfiles/resultados no acreditan por sí mismas puntos, rebotes, asistencias y triples para cada actuación. No se encontró una vía gratuita documentada y comprobada que garantice además cuartos NBA y muestras de 100/150/200 actuaciones.

Se intentaron dos consultas con la clave pública de desarrollo: eventos de NBA de 2024-2025 y búsqueda de LeBron James. El navegador de investigación no consiguió obtener sus respuestas. Esto **no demuestra** que el servicio devolviera vacío o que carezca de datos; no se atribuye ese fallo de herramienta al proveedor. No se ha eludido ninguna limitación ni raspado el sitio.

### Condiciones revisadas

Texto fechado el 17/09/2026. Permite copiar y modificar respuestas de endpoints oficiales, sujeto a derechos de terceros. La API gratuita se describe para proyectos de desarrollo y exige suscripción para publicar aplicaciones en app stores; no se equipara esa regla automáticamente con una prohibición de GitHub Pages. No se encontró una autorización específica para nuestro uso relacionado con apuestas. La cláusula de terceros exige permiso del titular o una base legal aplicable. La licencia Creative Commons del arte gráfico no acredita derechos sobre todos los datos o imágenes.

La razón principal para no elegirla es la cobertura no acreditada para este análisis, junto con la aclaración pendiente del uso público y los derechos necesarios. No se afirma que sus términos prohíban expresamente toda consulta estadística vinculada a apuestas.

## 3. API-NBA / API-SPORTS

Fuentes: [producto y precios](https://api-sports.io/sports/nba), [guía oficial de API-NBA](https://www.api-football.com/news/post/how-to-get-started-with-api-nba-the-complete-beginners-guide), [guía oficial de la temporada 2026-27](https://www.api-football.com/news/post/2026-2027-nba-season-guide-to-using-data-with-api-sports) y [condiciones](https://api-sports.io/terms).

Base documentada: `https://v2.nba.api-sports.io`; autenticación mediante `x-apisports-key`. La guía indica estadísticas por actuación en `/players/statistics`, cuartos en `/games` y totales de equipos en `/games/statistics`. `/seasons` permite descubrir los años; los IDs permanecen entre temporadas. Deben probarse combinaciones concretas de temporada y endpoint, porque la cobertura y los campos pueden variar. No se ha verificado el histórico efectivo con una cuenta gratuita.

La guía 2026-27 usa `season=2026`: no se debe reutilizar automáticamente la convención del año final de SportsDataverse. La comprobación de años, etapas, franquicias y estados será parte del ensayo.

### El permiso sigue pendiente

Las condiciones consultadas indican actualización del 21/05/2025:

- Permiten construir aplicaciones y webs, pero prohíben revender directamente los datos y crear varias cuentas para multiplicar el cupo gratuito.
- En «Service & data» aclaran que **no otorgan una licencia de publicación** de los datos; las autorizaciones necesarias deben obtenerse del titular competente.
- Mencionan expresamente que las plataformas de apuestas, entre otros usos, pueden requerir licencias adicionales. No se presume exención por tratarse de frecuencias históricas.
- La vía directa del proveedor corta el acceso al alcanzar el cupo diario; su contrato distingue esta modalidad de RapidAPI, donde puede haber sobrecostes.

Falta confirmar por escrito el alcance permitido para una web pública de tendencias relacionadas con apuestas, el almacenamiento, los JSON públicos que sirve Pages y la exportación de análisis. Si para nuestro uso exige una licencia de pago, **queda descartada para el objetivo de 0 €**.

### Viabilidad de las actualizaciones, si se resuelve lo anterior

Un cálculo de diseño, no una prueba del servicio: con 15 encuentros finalizados, una consulta de calendario, una de estadísticas individuales por encuentro y una de estadísticas de equipos por encuentro serían **31 solicitudes/día**, antes de reintentos, comprobaciones y cualquier paginación efectiva. Podría caber en 100/día con caché y actualización una vez al día; no permite prometer seguimiento en directo gratuito. No debe haber una llamada al proveedor por visitante.

La carga inicial de varias temporadas tendría que repartirse entre días y conservar avances. No se ha medido el número de solicitudes: depende de la consulta por jugador/temporada o equipo/temporada, la respuesta efectiva y el desglose de equipos requerido. No se deben abrir varias cuentas ni superar límites para acelerar la descarga.

Para 100 o 150 actuaciones habrá que unir temporadas. Dos temporadas regulares permiten como máximo 164 actuaciones antes de playoffs y ausencias; muchos jugadores necesitarán tres o más temporadas para alcanzar 200. El número anunciado de temporadas no garantiza esos registros completos para cada jugador.

## Qué recomendamos y qué falta

**No conectar todavía ninguna.** Priorizar una aclaración de API-NBA por su encaje técnico; descartar una integración mientras no exista permiso aplicable y no se hayan probado cobertura y precisión. No se garantiza que la aclaración vaya a resultar favorable o gratuita.

Puedes enviar al proveedor este borrador; **no se ha enviado en tu nombre**:

> Estoy desarrollando NBA Tendencias, una web gratuita en GitHub Pages. Calcula frecuencias históricas de puntos, rebotes, asistencias, triples y marcadores por cuarto para consultar tendencias relacionadas con apuestas deportivas. No acepta ni liquida apuestas. ¿Está permitido este uso con el plan gratuito de API-NBA? ¿Podemos almacenar y transformar históricos de los 30 equipos, servir JSON estáticos públicamente en GitHub Pages y permitir exportar análisis? ¿Qué autorizaciones de los titulares originales, atribuciones o licencias adicionales necesitamos? Necesitamos que toda la solución siga costando 0 €. ¿Qué temporadas tienen box scores completos de jugadores y cuartos accesibles con el plan gratuito, incluyendo 2023-24, 2024-25 y 2025-26, y qué límites de respuesta o conservación se aplican?

La respuesta debe aclarar nuestro caso concreto. Una confirmación genérica de que la API tiene datos de NBA no basta para verificar el uso, los derechos o los registros disponibles.

## Si API-NBA confirma un uso válido y gratuito

1. Registrar una cuenta **directamente** en [el dashboard de API-SPORTS](https://dashboard.api-football.com/). Comprobar el plan Free de 0, sin activar pruebas de pago o contratar planes. No utilizar una suscripción de marketplace con sobrecostes. La guía sitúa la clave en **Account → My Access**.
2. Guardarla en GitHub como se explica en [la guía de Secrets](claves-api.md). No enviarla al chat ni escribirla en el repositorio. Crear el secret no conecta la aplicación por sí solo.
3. Primera prueba manual: confirmar plan/cupo y temporadas; seleccionar un partido realmente finalizado de liga NBA y recuperar sus cuartos, box score de equipos y actuaciones de jugadores. No copiar el ID o el marcador de un ejemplo documental como si fuera una respuesta verificada.
4. Contrastar puntos, rebotes, asistencias y triples de jugadores concretos, además de cuartos y marcador, frente a una fuente original que se pueda consultar legítimamente. Registrar URL, fecha, IDs y diferencias. No rellenar valores ausentes con cero.
5. Probar realmente 100/150/200 actuaciones de jugadores de muestra, revisar las ausencias y el calendario completo por temporada. Conservar los IDs del proveedor para homónimos y traspasos.
6. Solo después, preparar un piloto separado y etiquetado, sin sustituir toda la demostración. El mecanismo de publicación existente exige dos partidos contrastados: un único partido piloto no autoriza aún la publicación automática. No se han rebajado esos controles.
7. El calendario automático y `data-source.json` seguirán desactivados hasta una verificación posterior. Ningún paso de esta guía los activa.

No hay todavía una integración inicial de un partido real de estas APIs: ninguna fuente ha superado todos los requisitos y no hay una clave de API-NBA disponible en el entorno. La revisión es documental, no una certificación de 200 actuaciones ni una prueba autenticada del plan Free.
