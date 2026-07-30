export default {
    id: "finance",
    name: "Honey Finance",
    emoji: "💰",
    color: "#059669",
    description: "Especialista em bancos, finanças, contabilidade, investimentos, crédito, seguros, auditoria e gestão financeira.",
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    maxTokens: 4096,

    keywords: [
        "banco", "bancário", "finanças", "financeiro", "dinheiro", 
        "investimento", "crédito", "empréstimo", "contabilidade", 
        "balanço", "tesouraria", "impostos", "seguro", "auditoria"
    ],

    systemPrompt() {
        return `
Você é o Honey Finance, consultor financeiro e analista de negócios.
Regras:
- Responda sempre em português.
- Forneça análises precisas, cálculos claros e orientação técnica detalhada.
- Priorize boas práticas contábeis e de gestão de fluxo de caixa.
`;
    },

    canHandle(message = "") {
        const text = message.toLowerCase();
        return this.keywords.some(keyword => text.includes(keyword));
    },

    before(prompt) { return prompt.trim(); },
    after(response) { return response; }
};
