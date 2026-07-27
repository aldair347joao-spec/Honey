class DecisionEngine {
    constructor() {
        this.rules = [
            {
                id: "developer",
                keywords: [
                    "código",
                    "programar",
                    "javascript",
                    "node",
                    "html",
                    "css",
                    "python",
                    "api",
                    "bug",
                    "erro",
                    "backend",
                    "frontend"
                ]
            },
            {
                id: "designer",
                keywords: [
                    "design",
                    "ui",
                    "ux",
                    "logo",
                    "flyer",
                    "banner",
                    "cores",
                    "figma",
                    "layout"
                ]
            },
            {
                id: "marketing",
                keywords: [
                    "marketing",
                    "facebook",
                    "instagram",
                    "anúncio",
                    "copy",
                    "vendas",
                    "cliente",
                    "produto",
                    "negócio"
                ]
            },
            {
                id: "lawyer",
                keywords: [
                    "contrato",
                    "lei",
                    "jurídico",
                    "advogado",
                    "processo",
                    "tribunal"
                ]
            }
        ];
    }

    detectAgent(message) {

        const text = message.toLowerCase();

        for (const rule of this.rules) {

            const found = rule.keywords.some(keyword =>
                text.includes(keyword)
            );

            if (found) {
                return rule.id;
            }

        }

        return "general";
    }

    buildContext({
        user,
        memories,
        history,
        message,
        agentPrompt
    }) {

        return `
INFORMAÇÕES DO UTILIZADOR

${JSON.stringify(user, null, 2)}

MEMÓRIAS IMPORTANTES

${JSON.stringify(memories, null, 2)}

ÚLTIMAS CONVERSAS

${JSON.stringify(history, null, 2)}

AGENTE RESPONSÁVEL

${agentPrompt}

PERGUNTA

${message}
`;

    }

}

export default new DecisionEngine();
