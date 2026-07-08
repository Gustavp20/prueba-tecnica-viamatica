"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = exports.pool = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
dotenv_1.default.config();
const poolConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
};
exports.pool = new pg_1.Pool(poolConfig);
exports.pool.on('error', (error) => {
    console.error('Error inesperado en el cliente de la base de datos', error);
    process.exit(-1);
});
const query = (text, params) => exports.pool.query(text, params);
exports.query = query;
exports.default = exports.pool;
