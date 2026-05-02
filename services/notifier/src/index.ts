import express from 'express';

const app = express();
app.use(express.json());

app.post('/', (req, res) => {
  const { email, url } = req.body;

  console.log("Enviando correo a:", email);
  console.log("Link:", url);

  res.json({ message: "Notificación enviada" });
});

app.listen(3000, () => {
  console.log("Notifier running on port 3000");
});