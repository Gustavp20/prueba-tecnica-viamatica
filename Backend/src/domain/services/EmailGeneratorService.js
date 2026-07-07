class EmailGeneratorService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async generate(nombres, apellidos) {
        const primerNombre = nombres.trim().toLowerCase().split(' ')[0];
        const apellidosArray = apellidos.trim().toLowerCase().split(' ');
        
        const primeraLetraNombre = primerNombre.charAt(0); // 'j' de Juan
        const primerApellido = apellidosArray[0]; // 'piguave'
        
        const primeraLetraSegundoApellido = apellidosArray.length > 1 ? apellidosArray[1].charAt(0) : ''; // 'l' de Loor

        const basePrefijo = `${primeraLetraNombre}${primerApellido}${primeraLetraSegundoApellido}`;
        const dominio = '@mail.com';
        
        let correoGenerado = `${basePrefijo}${dominio}`; // ej: jpiguavel@mail.com
        let contador = 1;

        while (await this.userRepository.findByEmail(correoGenerado)) {
            correoGenerado = `${basePrefijo}${contador}${dominio}`; // ej: jpiguavel1@mail.com
            contador++;
        }

        return correoGenerado;
    }
}

module.exports = EmailGeneratorService;