class HoneyKernel {

    constructor(){

        this.version = "5.0";

        this.status = "ONLINE";

        this.activeModel = "Groq";

        this.modules = {};

    }

    register(name,module){

        this.modules[name]=module;

        console.log(`Módulo ${name} carregado.`);

    }

    get(name){

        return this.modules[name];

    }

}

export default new HoneyKernel();
