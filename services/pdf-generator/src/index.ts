import express from 'express';

const app = express();
app.use(express.json());

// GENERAR PDF (simulado)
app.post('/generate', (req, res) => {
  const data = req.body;

  console.log("Generando PDF con:", data);

  // Simulación de PDF en base64
  const fakePdf = Buffer.from(`PDF de venta ${data.folio}`).toString('base64');

  res.json({
    file: fakePdf
  });
});

// ACTUALIZAR METADATA (simulado)
app.post('/metadata/update', (req, res) => {
  console.log("🔄 Actualizando metadata:", req.body);

  res.json({ message: "Metadata actualizada" });
});

app.listen(3000, () => {
  console.log("PDF service running on port 3000");
});