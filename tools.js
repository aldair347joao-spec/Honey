/*
==========================================
HONEY IA
Tool Engine
Versão 1.0
==========================================
*/

class ToolEngine {

    constructor() {

        this.tools = new Map();

    }

    register(tool) {

        this.tools.set(tool.id, tool);

        console.log(`🛠 Ferramenta carregada: ${tool.name}`);

    }

    get(id) {

        return this.tools.get(id);

    }

    getAll() {

        return [...this.tools.values()];

    }

    async execute(id, payload = {}) {

        const tool = this.tools.get(id);

        if (!tool) {

            throw new Error(`Ferramenta não encontrada: ${id}`);

        }

        return await tool.run(payload);

    }

}

const Tools = new ToolEngine();

/*
==========================================
Ferramentas Base
==========================================
*/

Tools.register({

    id: "calculator",

    name: "Calculadora",

    async run({ expression }) {

        try {

            return eval(expression);

        } catch {

            return "Expressão inválida.";

        }

    }

});

Tools.register({

    id: "timestamp",

    name: "Timestamp",

    async run() {

        return {

            now: new Date(),

            unix: Date.now()

        };

    }

});

Tools.register({

    id: "uuid",

    name: "UUID Generator",

    async run() {

        return crypto.randomUUID();

    }

});

export default Tools;
