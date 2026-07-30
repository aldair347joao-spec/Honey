class promptbuilder {

    build({
        systemPrompt,
        agentPrompt,
        user,
        memories = [],
        history = [],
        message
    }) {

        const prompt = [];

        // Personalidade da Honey
        prompt.push(systemPrompt);

        // Especialista responsável
        if (agentPrompt) {
            prompt.push(`
=== AGENTE ESPECIALISTA ===

${agentPrompt}
`);
        }

        // Informações do utilizador
        if (user) {
            prompt.push(`
=== UTILIZADOR ===

Nome: ${user.name || "Desconhecido"}

Idioma: ${user.language || "pt"}

Preferências:

${JSON.stringify(user.preferences || {}, null, 2)}
`);
        }

        // Memória permanente
        if (memories.length > 0) {

            prompt.push(`
=== MEMÓRIA ===

${memories.map(memory => "- " + memory.content).join("\n")}
`);

        }

        // Últimas conversas
        if (history.length > 0) {

            prompt.push(`
=== HISTÓRICO RECENTE ===

${history
    .map(item => `${item.role}: ${item.content}`)
    .join("\n")}
`);

        }

        // Pedido atual
        prompt.push(`
=== PEDIDO ATUAL ===

${message}
`);

        prompt.push(`
Responde de forma natural, profissional, objetiva e útil.

Se existir informação suficiente na memória, utiliza-a.

Nunca inventes factos.

Se não souberes algo, diz claramente.

Quando fores escrever código, produz código limpo, modular e pronto para produção.
`);

        return prompt.join("\n");

    }

}

export default new promptbuilder();
