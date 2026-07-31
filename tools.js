import crypto from "crypto";

class toolengine {
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

    shouldUseTool(message = "") {
        const text = message.toLowerCase();
        return text.includes("calcula") || text.includes("uuid") || text.includes("data") || text.includes("hora");
    }

    async executeByMessage(message = "") {
        const text = message.toLowerCase();
        if (text.includes("uuid")) {
            return await this.execute("uuid");
        }
        if (text.includes("data") || text.includes("hora")) {
            return await this.execute("timestamp");
        }
        return null;
    }

    async execute(id, payload = {}) {
        const tool = this.tools.get(id);
        if (!tool) {
            throw new Error(`Ferramenta não encontrada: ${id}`);
        }
        return await tool.run(payload);
    }
}

const tools = new ToolEngine();

tools.register({
    id: "calculator",
    name: "Calculadora",
    async run({ expression }) {
        try {
            // Avaliação matemática simples e segura
            const cleanExpr = expression.replace(/[^0-9+\-*/().]/g, '');
            return Function(`'use strict'; return (${cleanExpr})`)();
        } catch {
            return "Expressão inválida.";
        }
    }
});

tools.register({
    id: "timestamp",
    name: "Timestamp",
    async run() {
        return {
            now: new Date().toISOString(),
            unix: Date.now()
        };
    }
});

tools.register({
    id: "uuid",
    name: "UUID Generator",
    async run() {
        return crypto.randomUUID();
    }
});

export default tools;
