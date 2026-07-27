class ToolManager {

    constructor() {

        this.tools = new Map();

    }

    register(name, tool) {

        this.tools.set(name, tool);

    }

    has(name) {

        return this.tools.has(name);

    }

    get(name) {

        return this.tools.get(name);

    }

    async execute(name, params = {}) {

        if (!this.has(name)) {

            throw new Error(`Ferramenta "${name}" não encontrada.`);

        }

        const tool = this.get(name);

        if (typeof tool.execute !== "function") {

            throw new Error(`Ferramenta "${name}" inválida.`);

        }

        return await tool.execute(params);

    }

    list() {

        return [...this.tools.keys()];

    }

}

export default new ToolManager();
