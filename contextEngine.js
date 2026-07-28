class ContextEngine {

    constructor() {
        this.MAX_HISTORY = 12;
        this.MAX_MEMORIES = 8;
    }

    build({
        history = [],
        memories = [],
        toolResult = null
    }) {

        const context = [];

        // Histórico recente
        const recentHistory = history.slice(-this.MAX_HISTORY);

        recentHistory.forEach(item => {
            context.push({
                role: item.role,
                content: item.content
            });
        });

        // Memórias relevantes
        if (memories.length) {

            context.push({
                role: "system",
                content:
`MEMÓRIAS IMPORTANTES

${memories
.map(memory => `• ${memory.content}`)
.join("\n")}`
            });

        }

        // Resultado de ferramentas
        if (toolResult) {

            context.push({
                role: "system",
                content:
`RESULTADO DA FERRAMENTA

${JSON.stringify(toolResult, null, 2)}`
            });

        }

        return context;

    }

}

export default new ContextEngine();
