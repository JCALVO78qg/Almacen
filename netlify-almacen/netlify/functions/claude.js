exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
 
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
 
  try {
    const body = JSON.parse(event.body);
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
 
    // Limpiar el base64 — quitar espacios, saltos de línea y prefijos data:
    let imageData = body.image_data || '';
    imageData = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    imageData = imageData.replace(/\s/g, '');
 
    // Detectar tipo de imagen
    let mediaType = body.media_type || 'image/jpeg';
    // Normalizar tipo
    if (!['image/jpeg','image/png','image/gif','image/webp'].includes(mediaType)) {
      mediaType = 'image/jpeg';
    }
 
    const payload = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `Eres asistente de almacén. Analiza la imagen de un documento comercial mexicano (remisión, factura, pedido o lista de empaque) y extrae TODOS los productos con sus datos. Para cada producto extrae: code (código/SKU exacto como aparece), desc (descripción max 25 chars), qty (cantidad entera). Responde ÚNICAMENTE con JSON sin backticks ni texto adicional: {"docNum":"[folio o DESCONOCIDO]","docType":"[Remisión|Factura|Pedido|Otro]","items":[{"code":"[código]","desc":"[descripción]","qty":[número]}]} Si no puedes leer la imagen: {"error":"No se pudo leer"}`,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageData
            }
          },
          { type: 'text', text: 'Extrae todos los productos y cantidades de este documento de almacén.' }
        ]
      }]
    };
 
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });
 
    const result = await response.json();
 
    if (result.error) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ error: result.error.message, status: 'error' })
      };
    }
 
    const text = result.content
      ? result.content.filter(c => c.type === 'text').map(c => c.text).join('')
      : '';
 
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text, status: 'ok' })
    };
 
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.toString(), status: 'error' })
    };
  }
};
