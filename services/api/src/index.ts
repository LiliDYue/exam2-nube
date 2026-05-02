import express from 'express';
import * as AWS from 'aws-sdk';
import { pool } from './db';

const app = express();
app.use(express.json());

// AWS SQS
const sqs = new AWS.SQS();
const QUEUE = process.env.QUEUE_URL!;

// CLIENTES CRUD

app.get('/clientes', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes');
    res.json(result.rows);
  } catch (error) {
    console.error("ERROR GET /clientes:", error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

app.get('/clientes/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clientes WHERE id=$1',
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("ERROR GET /clientes/:id:", error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

app.post('/clientes', async (req, res) => {
  try {
    const { razon_social, nombre_comercial, rfc, correo, telefono } = req.body;

    const result = await pool.query(
      `INSERT INTO clientes(razon_social,nombre_comercial,rfc,correo,telefono)
       VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [razon_social, nombre_comercial, rfc, correo, telefono]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("ERROR POST /clientes:", error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

app.put('/clientes/:id', async (req, res) => {
  try {
    const { razon_social, nombre_comercial, rfc, correo, telefono } = req.body;

    const result = await pool.query(
      `UPDATE clientes 
       SET razon_social=$1,nombre_comercial=$2,rfc=$3,correo=$4,telefono=$5
       WHERE id=$6 RETURNING *`,
      [razon_social, nombre_comercial, rfc, correo, telefono, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("ERROR PUT /clientes:", error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

app.delete('/clientes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clientes WHERE id=$1', [req.params.id]);
    res.json({ message: 'Cliente eliminado' });
  } catch (error) {
    console.error("ERROR DELETE /clientes:", error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

// DOMICILIOS CRUD

app.get('/domicilios', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM domicilios');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Error al obtener domicilios' });
  }
});

app.post('/domicilios', async (req, res) => {
  try {
    const { cliente_id, domicilio, colonia, municipio, estado, tipo } = req.body;

    const result = await pool.query(
      `INSERT INTO domicilios(cliente_id,domicilio,colonia,municipio,estado,tipo)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [cliente_id, domicilio, colonia, municipio, estado, tipo]
    );

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al crear domicilio' });
  }
});

app.put('/domicilios/:id', async (req, res) => {
  try {
    const { domicilio, colonia, municipio, estado, tipo } = req.body;

    const result = await pool.query(
      `UPDATE domicilios SET domicilio=$1,colonia=$2,municipio=$3,estado=$4,tipo=$5
       WHERE id=$6 RETURNING *`,
      [domicilio, colonia, municipio, estado, tipo, req.params.id]
    );

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al actualizar domicilio' });
  }
});

app.delete('/domicilios/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM domicilios WHERE id=$1', [req.params.id]);
    res.json({ message: 'Domicilio eliminado' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar domicilio' });
  }
});

// PRODUCTOS CRUD

app.get('/productos', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

app.post('/productos', async (req, res) => {
  try {
    const { nombre, unidad_medida, precio_base } = req.body;

    const result = await pool.query(
      `INSERT INTO productos(nombre,unidad_medida,precio_base)
       VALUES($1,$2,$3) RETURNING *`,
      [nombre, unidad_medida, precio_base]
    );

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

app.put('/productos/:id', async (req, res) => {
  try {
    const { nombre, unidad_medida, precio_base } = req.body;

    const result = await pool.query(
      `UPDATE productos SET nombre=$1,unidad_medida=$2,precio_base=$3
       WHERE id=$4 RETURNING *`,
      [nombre, unidad_medida, precio_base, req.params.id]
    );

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

app.delete('/productos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM productos WHERE id=$1', [req.params.id]);
    res.json({ message: 'Producto eliminado' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// VENTAS + SQS

app.post('/ventas', async (req, res) => {
  try {
    const { cliente_id, total } = req.body;

    if (!cliente_id || !total) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const venta = await pool.query(
      'INSERT INTO ventas(cliente_id,total) VALUES($1,$2) RETURNING *',
      [cliente_id, total]
    );

    const cliente = await pool.query(
      'SELECT * FROM clientes WHERE id=$1',
      [cliente_id]
    );

    if (!cliente.rows[0]) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    const payload = {
      ventaId: venta.rows[0].id,
      cliente: cliente.rows[0]
    };

    console.log("Enviando a SQS:", payload);

    await sqs.sendMessage({
      QueueUrl: QUEUE!,
      MessageBody: JSON.stringify(payload)
    }).promise();

    res.json({
      message: 'Venta enviada a procesamiento',
      venta: venta.rows[0]
    });

  } catch (error) {
    console.error("ERROR POST /ventas:", error);
    res.status(500).json({ error: 'Error en venta' });
  }
});


// descarga

const s3 = new AWS.S3();

app.get('/download/:rfc/:folio', async (req, res) => {
  try {
    const { rfc, folio } = req.params;

    const key = `${rfc}/${folio}.pdf`;

    console.log("Descargando:", key);

    const s3Object = await s3.getObject({
      Bucket: process.env.BUCKET_NAME!,
      Key: key
    }).promise();

    if (!s3Object.Body) {
      throw new Error("Archivo vacío");
    }

    // actualizar metadata correctamente
    await s3.copyObject({
      Bucket: process.env.BUCKET_NAME!,
      CopySource: `${process.env.BUCKET_NAME}/${encodeURIComponent(key)}`,
      Key: key,
      MetadataDirective: "REPLACE",
      ContentType: "application/pdf",
      Metadata: {
        "nota-descargada": "true",
        "hora-envio": new Date().toISOString(),
        "veces-enviado": "2"
      }
    }).promise();

    res.setHeader('Content-Type', 'application/pdf');
    res.send(s3Object.Body);

  } catch (error) {
    console.error("Error descarga:", error);
    res.status(500).json({ error: "Error al descargar PDF" });
  }
});


// START

app.listen(3000, () => {
  console.log('API running on port 3000');
});