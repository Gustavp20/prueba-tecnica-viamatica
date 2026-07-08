"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const api_1 = __importDefault(require("./infrastructure/http/routes/api"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.status(200).json({
        estado: "En línea",
        mensaje: "El servidor Backend con Typescript funciona correctamente."
    });
});
app.get('/api', (req, res) => {
    res.status(200).json({
        estado: 'En línea',
        mensaje: 'API REST conectada.'
    });
});
app.use('/api', api_1.default);
app.use((req, res) => {
    res.status(404).json({ message: "Ruta no encontrada." });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Backend corriendo en http://localhost:${PORT}`);
    console.log(`Arquitectura Orientada a Dominios (DDD) aplicada con TypeScript.`);
});
