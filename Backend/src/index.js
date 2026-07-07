require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./infrastructure/http/routes/api');

const app = express();


app.use(cors()); 
app.use(express.json()); 

app.get('/', (req, res) => {
    res.status(200).json({ 
        estado: "En línea", 
        mensaje: "¡Bienvenido! El servidor Backend de Viamatica está funcionando correctamente." 
    });
});

app.get('/api', (req, res) => {
    res.status(200).json({ 
        estado: "En línea", 
        mensaje: "API REST conectada. Lista para recibir peticiones del Frontend." 
    });
});
// ------------------------------------------------------------------------

app.use('/api', apiRoutes);

app.use((req, res) => {
    res.status(404).json({ message: "Ruta no encontrada." });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor Backend corriendo en http://localhost:${PORT}`);
    console.log(`Arquitectura Orientada a Dominios (DDD) aplicada.`);
});