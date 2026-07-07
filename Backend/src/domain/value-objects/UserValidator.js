class UserValidator {
    

    // 1. VALIDACIÓN DE NOMBRE DE USUARIO

    static validateUsername(username) {
        /*
         * Reglas:
         * a. No contener signos (solo letras y números)
         * c. Al menos un número
         * d. Al menos una letra mayúscula
         * e. Longitud entre 8 y 20 caracteres
         * NOTA: La regla 'b. No duplicado' se valida en el Caso de Uso consultando la BD.
         */
        const usernameRegex = /^(?=.*\d)(?=.*[A-Z])[a-zA-Z0-9]{8,20}$/;
        
        if (!usernameRegex.test(username)) {
            throw new Error("El nombre de usuario debe tener entre 8 y 20 caracteres, incluir al menos una mayúscula y un número, y no contener signos.");
        }
        return true;
    }


    // 2. VALIDACIÓN DE CONTRASEÑA

    static validatePassword(password) {
        /*
         * Reglas:
         * a. Al menos 8 dígitos
         * b. Al menos una letra mayúscula
         * c. No debe contener espacios
         * d. Al menos un signo (carácter especial)
         */
        
        // (?=.*[A-Z]) -> Al menos una mayúscula
        // (?=.*[^a-zA-Z0-9\s]) -> Al menos un signo (que no sea letra, número ni espacio)
        // [^\s]{8,} -> Sin espacios y mínimo 8 caracteres
        const passwordRegex = /^(?=.*[A-Z])(?=.*[^a-zA-Z0-9\s])[^\s]{8,}$/;

        if (!passwordRegex.test(password)) {
            throw new Error("La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, un signo y no contener espacios.");
        }
        return true;
    }

    // 3. VALIDACIÓN DE IDENTIFICACIÓN

    static validateIdentificacion(identificacion) {
        /*
         * Reglas:
         * a. Debe tener 10 dígitos
         * b. Solo números
         * c. No 4 números iguales seguidos (Ej: 1008888471)
         */
        
        // Validar 10 dígitos y solo números
        const lengthAndNumbersRegex = /^\d{10}$/;
        if (!lengthAndNumbersRegex.test(identificacion)) {
            throw new Error("La identificación debe tener exactamente 10 dígitos y contener solo números.");
        }

        // Validar que no existan 4 números repetidos seguidos
        const repeatedNumbersRegex = /(\d)\1{3}/;
        if (repeatedNumbersRegex.test(identificacion)) {
            throw new Error("La identificación no puede contener el mismo número repetido 4 veces seguidas.");
        }

        return true;
    }
}

module.exports = UserValidator;