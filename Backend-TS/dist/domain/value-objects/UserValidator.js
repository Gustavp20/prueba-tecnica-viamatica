"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserValidator = void 0;
class UserValidator {
    static validateUsername(username) {
        const usernameRegex = /^(?=.*\d)(?=.*[A-Z])[a-zA-Z0-9]{8,20}$/;
        if (!usernameRegex.test(username)) {
            throw new Error("El nombre de usuario debe tener entre 8 y 20 caracteres, incluir al menos una mayúscula y un número, y no contener signos.");
        }
        return true;
    }
    static validatePassword(password) {
        const passwordRegex = /^(?=.*[A-Z])(?=.*[^a-zA-Z0-9\s])[^\s]{8,}$/;
        if (!passwordRegex.test(password)) {
            throw new Error("La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, un signo y no contener espacios.");
        }
        return true;
    }
    static validateIdentificacion(identificacion) {
        const lengthAndNumbersRegex = /^\d{10}$/;
        if (!lengthAndNumbersRegex.test(identificacion)) {
            throw new Error("La identificación debe tener exactamente 10 dígitos y contener solo números.");
        }
        const repeatedNumbersRegex = /(\d)\1{3}/;
        if (repeatedNumbersRegex.test(identificacion)) {
            throw new Error("La identificación no puede contener el mismo número repetido 4 veces seguidas.");
        }
        return true;
    }
}
exports.UserValidator = UserValidator;
