import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import apiRoutes from './infrastructure/http/routes/api';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ 
        estado: "En línea", 
        mensaje: "El servidor Backend con Typescript funciona correctamente." 
    });
});

app.get('/api', (req: Request, res: Response) => {
    res.status(200).json({
        estado: 'En línea',
        mensaje: 'API REST conectada.'
    });
});

app.use('/api', apiRoutes);

app.use((req: Request, res: Response) => {
    res.status(404).json({ message: "Ruta no encontrada." });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor Backend corriendo en http://localhost:${PORT}`);
    console.log(`Arquitectura Orientada a Dominios (DDD) aplicada con TypeScript.`);
});