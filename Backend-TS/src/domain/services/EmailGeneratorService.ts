export class EmailGeneratorService {
    private userRepository: any;

    constructor(userRepository: any) {
        this.userRepository = userRepository;
    }

    async generate(nombres: string, apellidos: string): Promise<string> {
        const primerNombre = nombres.trim().toLowerCase().split(' ')[0];
        const apellidosArray = apellidos.trim().toLowerCase().split(' ');
        
        const primeraLetraNombre = primerNombre.charAt(0); 
        const primerApellido = apellidosArray[0]; 
        
        const primeraLetraSegundoApellido = apellidosArray.length > 1 ? apellidosArray[1].charAt(0) : ''; 

        const basePrefijo = `${primeraLetraNombre}${primerApellido}${primeraLetraSegundoApellido}`;
        const dominio = '@mail.com';
        
        let correoGenerado = `${basePrefijo}${dominio}`; 
        let contador = 1;

        while (await this.userRepository.findByEmail(correoGenerado)) {
            correoGenerado = `${basePrefijo}${contador}${dominio}`; 
            contador++;
        }

        return correoGenerado;
    }
}