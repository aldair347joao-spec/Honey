/*
==========================================
HONEY IA
AGENT ENGINE V2.0
==========================================
*/
import DesignerAgent from "./agents/designerAgent.js";
import GeneralAgent from "./agents/generalAgent.js";
import DeveloperAgent from "./agents/developerAgent.js";
import MarketingAgent from "./agents/marketingAgent.js";


class AgentEngine {

    constructor() {

        this.agents = new Map();
        this.activeAgent = "general";

    }

    register(agent) {
        Agents.register(GeneralAgent);
Agents.register(DeveloperAgent);
        Agents.register(DesignerAgent);
Agents.register(MarketingAgent);
    

        this.agents.set(agent.id, {
            status: "online",
            conversations: [],
            memory: [],
            tools: [],
            ...agent
        });

        console.log(`✅ Agente carregado: ${agent.name}`);

    }

    get(id) {

        return this.agents.get(id);

    }

    getAll() {

        return [...this.agents.values()];

    }

    setActive(id) {

        if (this.agents.has(id)) {

            this.activeAgent = id;

            return this.agents.get(id);

        }

        return this.agents.get("general");

    }

    getActive() {

        return this.agents.get(this.activeAgent);

    }

    addConversation(id, role, content) {

        const agent = this.agents.get(id);

        if (!agent) return;

        agent.conversations.push({

            role,
            content,
            date: new Date()

        });

    }

    getConversation(id) {

        const agent = this.agents.get(id);

        if (!agent) return [];

        return agent.conversations;

    }

    saveMemory(id, key, value) {

        const agent = this.agents.get(id);

        if (!agent) return;

        agent.memory.push({

            key,
            value,
            createdAt: new Date()

        });

    }

    getMemory(id) {

        const agent = this.agents.get(id);

        if (!agent) return [];

        return agent.memory;

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
            text.includes("api") ||
            text.includes("código") ||
            text.includes("program")
        ) {
            return this.get("developer");
        }

        if (
            text.includes("logo") ||
            text.includes("ui") ||
            text.includes("ux") ||
            text.includes("figma") ||
            text.includes("design")
        ) {
            return this.get("designer");
        }

        if (
            text.includes("marketing") ||
            text.includes("facebook") ||
            text.includes("instagram") ||
            text.includes("tiktok") ||
            text.includes("publicidade") ||
            text.includes("copy")
        ) {
            return this.get("marketing");
        }

        if (
            text.includes("pdf") ||
            text.includes("documento") ||
            text.includes("contrato") ||
            text.includes("excel") ||
            text.includes("planilha")
        ) {
            return this.get("document");
        }

        if (
            text.includes("imagem") ||
            text.includes("foto") ||
            text.includes("print") ||
            text.includes("screenshot")
        ) {
            return this.get("vision");
        }

        if (
            text.includes("projeto") ||
            text.includes("arquitetura")
        ) {
            return this.get("project");
        }

        if (
            text.includes("pesquise") ||
            text.includes("internet") ||
            text.includes("web")
        ) {
            return this.get("web");
        }

        return this.get("general");

    }

}

const Agents = new AgentEngine();

Agents.register({

    id: "general",

    emoji: "🐝",

    name: "Honey Assistant",

    color: "#F4B400",

    description: "Assistente principal da Honey IA."

});

Agents.register({

    id: "developer",

    emoji: "💻",

    name: "Honey Developer",

    color: "#3B82F6",

    description: "Especialista em programação."

});

Agents.register({

    id: "designer",

    emoji: "🎨",

    name: "Honey Designer",

    color: "#EC4899",

    description: "Especialista em UI, UX e Design."

});

Agents.register({

    id: "marketing",

    emoji: "📈",

    name: "Honey Marketing",

    color: "#10B981",

    description: "Especialista em Marketing."

});

Agents.register({

    id: "document",

    emoji: "📄",

    name: "Honey Documents",

    color: "#F97316",

    description: "Especialista em documentos."

});

Agents.register({

    id: "vision",

    emoji: "👁️",

    name: "Honey Vision",

    color: "#8B5CF6",

    description: "Especialista em imagens."

});

Agents.register({

    id: "project",

    emoji: "📂",

    name: "Honey Projects",

    color: "#06B6D4",

    description: "Especialista em projetos."

});

Agents.register({

    id: "web",

    emoji: "🌍",

    name: "Honey Web",

    color: "#22C55E",

    description: "Especialista em pesquisa web."

});

export default Agents;
