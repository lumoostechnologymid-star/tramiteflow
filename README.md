# TramiteFlow

Seguimiento de trámites de Lumoos. Aplicación estática en `index.html`, publicada desde `main` en Vercel y conectada a Supabase.

## Comparación de PDFs

Las cuentas maestro pueden cargar un PDF con texto (hasta 10 MB y 300 páginas), comparar RPUs/folios completos, revisar coincidencias verdes y no encontrados rojos, y filtrar los trámites por resultado. No se usan porcentajes de similitud. Los RPUs de 12 dígitos impresos en tres grupos de cuatro también se reconocen. Los folios se mantienen como texto para conservar ceros iniciales. La comparación no usa nombres ni coincidencias parciales.

Cada comparación guarda una instantánea compartida con fecha y autor. Al abrir el panel se selecciona la más reciente; se pueden consultar las anteriores. Los trámites agregados después o cuyos folios cambiaron se muestran como sin comparar. Los números de 12 o 13 dígitos que no corresponden a trámites se presentan por separado para revisión.

Por defecto el PDF se procesa en el navegador y se descarta sin subirlo; solo se guardan resultados. Si se elige conservarlo, se almacena en un bucket privado y puede eliminarse con confirmación sin borrar resultados. Si falla una carga posterior al guardado del historial, la comparación permanece disponible y la referencia de archivo se puede limpiar con Eliminar PDF.

Los estados cambian únicamente al seleccionar coincidencias y confirmar el nuevo estado. La función `aplicar_comparacion_pdf` aplica los cambios y el historial en una transacción, verifica el rol maestro y rechaza estados desactualizados. Finalizado usa la fecha de Ciudad de México. El expediente muestra los últimos 50 eventos, con fecha e identificador del usuario.

Los PDFs escaneados o páginas sin texto suficiente se rechazan para evitar falsos negativos: requieren OCR previo. Verificar visualmente resultados antes de aplicar estados. Una coincidencia significa presencia del folio, no un estado inferido del documento.

## Código y base de datos

- `pdf-core.js`: comparación exacta y extracción de posibles RPUs.
- `pdf-comparison.js` / `.css`: interfaz, lectura con PDF.js 5.4.624, historial y archivos.
- `db/pdf-comparaciones.sql`: SQL aplicado en Supabase como migración `pdf_comparaciones`. Solo para referencia y nuevos entornos; no volver a ejecutarlo sobre el proyecto existente.
- `tests/pdf-core.test.cjs`: pruebas de coincidencias, límites y ceros iniciales. Ejecutar con `node --test tests/pdf-core.test.cjs`.

El historial y el bucket `comparacion-pdfs` tienen RLS limitado a maestros. El navegador utiliza únicamente la clave publicable; nunca una clave de servicio. Los expedientes de fotos/PDF existentes y el semáforo de días se conservan.
