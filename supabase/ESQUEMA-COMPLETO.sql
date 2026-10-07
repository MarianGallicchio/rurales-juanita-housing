-- ESQUEMA COMPLETO (referencia, Fases 0-8) — Rurales Juanita & H.M Housing Module
-- Fase 0 ya implementada en migrations/0001_fase0_base.sql. Esto es el mapa para aprobar antes de Fase 1.
-- Convenciones: uuid PK, moneda USD en catálogo, mm en medidas, baja lógica con activo, auditoría via registrar_auditoria().

-- FASE 1 catálogo (depende 0)
-- categoria(id, nombre, slug unique, descripcion, orden, visible_web)
-- modelo(id, categoria_id->categoria, codigo unique, nombre, descripcion, largo_mm, ancho_mm, alto_mm, superficie_m2 generated, peso_kg, sistema_constructivo, precio_base_usd, activo)
-- modelo_foto(id, modelo_id, url, leyenda, orden, es_portada)
-- ficha_tecnica_item(id, modelo_id, grupo, item, especificacion, orden)
-- opcion(id, grupo, nombre, descripcion, tipo_precio: fijo|por_m2|por_unidad|por_metro, precio_usd, activo)
-- modelo_opcion(modelo_id, opcion_id, obligatoria, incluida_por_defecto, cantidad_maxima)
-- precio_historial(id, entidad, entidad_id, precio_usd, vigente_desde, cargado_por)

-- FASE 2 cotizador (depende 0,1)
-- cotizacion(id, numero COT-AAAA-0001 unique, cliente_id, version, cotizacion_origen_id, estado: borrador|enviada|aceptada|rechazada|vencida, tipo_cambio, fecha_tipo_cambio, margen_pct, iva_pct, flete_usd, validez_dias, plazo_entrega_dias, condicion_pago, observaciones, subtotal_usd, total_usd, total_ars, creada_por, enviada_en)
-- cotizacion_item(id, cotizacion_id, modelo_id, cantidad, largo_mm, ancho_mm, alto_mm, costo_materiales_usd, costo_mano_obra_usd, precio_unitario_usd)
-- cotizacion_item_opcion(id, item_id, opcion_id, cantidad, precio_usd)
-- cotizacion_envio(id, cotizacion_id, canal, destinatario, fecha_hora, enviado_por)
-- cotizacion_aprobacion(id, cotizacion_id, motivo, margen_solicitado, aprobado_por, estado)
-- Fórmula: total_USD = ((mat+mo)*(1+margen)+flete)*(1+iva); total_ARS = total_USD * tc. Congelar al enviar.

-- FASE 3 CRM (depende 0,2)
-- cliente(id, razon_social, cuit unique, tipo, rubro, domicilio, provincia, web, estado, responsable_id)
-- contacto(id, cliente_id, nombre, cargo, email, telefono, whatsapp, principal, notas)
-- oportunidad(id, cliente_id, titulo, etapa: consulta|cotizado|negociacion|ganado|perdido, valor_estimado_usd, probabilidad_pct, fecha_cierre_estimada, responsable_id, origen, motivo_perdida)
-- tarea(id, oportunidad_id, cliente_id, titulo, vence_en, asignada_a, completada_en, prioridad)
-- nota(id, entidad, entidad_id, texto, autor_id, creada_en)
-- homologacion(id, cliente_id, estado, fecha_aprobacion, vencimiento, documento_url, observaciones)
-- lead_web(id, nombre, empresa, email, telefono, mensaje, origen_url, fecha, convertido_en_cliente_id)

-- FASE 4 producción ISO 9001 (depende 0,1,2)
-- orden_produccion(id, numero OP-AAAA-0001 unique, cotizacion_id, cliente_id, estado, prioridad, fecha_inicio, fecha_prometida, fecha_cierre, observaciones)
-- unidad(id, orden_id, modelo_id, numero_serie unique inmutable, estado, etapa_actual, fecha_despacho, destino)
-- plantilla_etapa(id, categoria_id, orden, nombre, duracion_estimada_h, requiere_control)
-- etapa_unidad(id, unidad_id, plantilla_etapa_id, estado: pendiente|en_curso|en_control|aprobada|rechazada, responsable_id, inicio_real, fin_real, horas_reales)
-- checklist_plantilla(id, plantilla_etapa_id, orden, item, criterio_aceptacion, critico)
-- checklist_resultado(id, etapa_unidad_id, item_id, resultado: apto|no_apto|no_aplica, observacion, inspector_id, fecha_hora)
-- adjunto(id, entidad, entidad_id, url, tipo, subido_por, fecha_hora)
-- no_conformidad(id, unidad_id, etapa_unidad_id, descripcion, causa_raiz, accion_inmediata, accion_correctiva, responsable_id, estado, fecha_cierre, verificacion_eficacia)

-- FASE 5 BOM y stock (depende 0,1,4)
-- material(id, codigo unique, nombre, categoria, unidad_medida, stock_minimo, costo_ultimo_usd, costo_promedio_usd, activo)
-- bom_modelo(id, modelo_id, version, vigente_desde, aprobada_por)
-- bom_linea(id, bom_id, material_id, cantidad, merma_pct, etapa_consumo)
-- proveedor(id, razon_social, cuit, contacto, plazo_entrega_dias, condiciones, calificacion)
-- proveedor_material(id, proveedor_id, material_id, precio, moneda, fecha, codigo_proveedor)
-- movimiento_stock(id, material_id, tipo: entrada|salida|ajuste|reserva|liberacion, cantidad, referencia_tipo, referencia_id, costo_unitario, usuario_id, fecha_hora)
-- lista_compra(id, estado, generada_en, generada_por)
-- lista_compra_linea(id, lista_id, material_id, cantidad_sugerida, cantidad_aprobada, proveedor_sugerido_id)

-- FASE 6 web pública: sin tablas nuevas (lee categoria/modelo/ficha + escribe lead_web). Requiere policy anon read solo visibles.
-- FASE 7 postventa (depende 4): ticket_postventa(id, unidad_id, tipo: garantia|reclamo|mantenimiento, descripcion, fotos, estado, creado_por, creado_en) + usa adjunto.
-- FASE 8 panel: sin tablas, vistas SQL sobre cotizacion/oportunidad/orden/unidad/movimiento/ticket.

-- Orden de creación sugerido: 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 7 -> 6 -> 8. Ver doc Parte 1.3 dependencias.
