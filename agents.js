/*
==========================================
HONEY IA - AGENT ENGINE
Versão 1.0
==========================================
*/

class AgentEngine {

    constructor() {

        this.agents = [];

    }

    register(agent) {

        this.agents.push(agent);

        console.log(`✅ Agente carregado: ${agent.name}`);

    }

    getAll() {

        return this.agents;

    }

    getById(id) {

        return this.agents.find(agent => agent.id === id);

    }

    detect(prompt = "") {

        const text = prompt.toLowerCase();

        if (
            text.includes("html") ||
            text.includes("css") ||
            text.includes("javascript") ||
            text.includes("node") ||
            text.includes("react") ||
            text.includes("python") ||
            text.includes("program")
        ) {
            return this.getById("developer");
        }

        if (
            text.includes("marketing") ||
            text.includes("facebook") ||
            text.includes("instagram") ||
            text.includes("publicidade") ||
            text.includes("copy")
        ) {
            return this.getById("marketing");
        }

        if (
            text.includes("design") ||
            text.includes("logo") ||
            text.includes("ui") ||
            text.includes("ux")
        ) {
            return this.getById("designer");
        }

        return this.getById("general");

    }

}

const Agents = new AgentEngine();

Agents.register({

    id: "general",

    name: "Honey Assistant",

    description: "Assistente principal da Honey IA.",

    emoji: "🐝"

});

Agents.register({

    id: "developer",

    name: "Honey Developer",

    description: "Especialista em programação.",

    emoji: "💻"

});

Agents.register({

    id: "designer",

    name: "Honey Designer",

    description: "Especialista em UI, UX e Design.",

    emoji: "🎨"

});

Agents.register({

    id: "marketing",

    name: "Honey Marketing",

    description: "Especialista em Marketing Digital.",

    emoji: "📈"

});

export default Agents;
