import * as AWS from 'aws-sdk';
import axios from 'axios';
import { pool } from './db';

// VARIABLES DE ENTORNO
const QUEUE_URL = process.env.QUEUE_URL;
const PDF_URL = process.env.PDF_URL;
const NOTIFIER_URL = process.env.NOTIFIER_URL;

if (!QUEUE_URL) {
  console.error("QUEUE_URL no definida");
  process.exit(1);
}

if (!PDF_URL) {
  console.error("PDF_URL no definida");
  process.exit(1);
}

if (!NOTIFIER_URL) {
  console.error("NOTIFIER_URL no definida");
  process.exit(1);
}

// AWS SQS
const sqs = new AWS.SQS();

const s3 = new AWS.S3();

// PROCESAR MENSAJE
const processMessage = async (msg: any) => {
  try {
    const body = JSON.parse(msg.Body);
    const { ventaId, cliente } = body;

    console.log("Procesando venta:", ventaId);

    const venta = await pool.query(
      'SELECT * FROM ventas WHERE id=$1',
      [ventaId]
    );

    if (!venta.rows[0]) {
      throw new Error("Venta no encontrada");
    }

    const data = {
      folio: venta.rows[0].id,
      rfc: cliente.rfc,
      cliente,
      total: venta.rows[0].total,
      items: []
    };

    // GENERAR PDF
    console.log("Generando PDF...");
    const pdf = await axios.post(`${PDF_URL}/generate`, data);

    if (!pdf.data.file) {
      throw new Error("PDF inválido (no base64)");
    }

    const pdfBuffer = Buffer.from(pdf.data.file, 'base64');

    const key = `${cliente.rfc}/${venta.rows[0].id}.pdf`;

    // SUBIR A S3
    await s3.putObject({
      Bucket: process.env.BUCKET_NAME!,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        "hora-envio": new Date().toISOString(),
        "nota-descargada": "false",
        "veces-enviado": "1"
      }
    }).promise();

    console.log("PDF subido:", key);

    // URL REAL
    const fileUrl = `https://${process.env.BUCKET_NAME}.s3.amazonaws.com/${key}`;

    //  NOTIFICAR
    console.log("Enviando notificación...");
    await axios.post(NOTIFIER_URL!, {
      email: cliente.correo,
      url: fileUrl
    });

    const sns = new AWS.SNS();
    // metadata (opcional)
    await sns.publish({
      TopicArn: process.env.SNS_TOPIC_ARN!,
      Message: `Tu nota está lista: ${fileUrl}`,
      Subject: "Nota de venta"
    }).promise();

    console.log(" Mensaje procesado correctamente");

  } catch (error) {
    console.error(" Error en processMessage:", error);
    throw error;
  }
};

// LOOP PRINCIPAL
const run = async () => {
  console.log("Worker iniciado...");

  while (true) {
    try {
      const data = await sqs.receiveMessage({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 10,
        VisibilityTimeout: 30
      }).promise();

      if (!data.Messages) {
        continue;
      }

      for (const msg of data.Messages) {
        try {
          await processMessage(msg);

          // borra mensaje de la cola
          await sqs.deleteMessage({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: msg.ReceiptHandle!
          }).promise();

          console.log("Mensaje eliminado de SQS");

        } catch (error) {
          console.error("Error procesando mensaje:", error);
          // no borrar → retry automático
        }
      }

    } catch (error) {
      console.error("Error en loop principal:", error);
    }
  }
};

// START
run();