export default {
    id: "healthcare",
    name: "Honey Health",
    emoji: "🏥",
    color: "#06B6D4",
    description: "Especialista para clínicas, hospitais, farmácias, laboratórios, gestão hospitalar e documentação clínica.",
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    maxTokens: 4096,

    keywords: [
        "hospital", "clínica", "médico", "medicina", "paciente", 
        "farmácia", "enfermagem", "laboratório", "diagnóstico", 
        "consulta", "saúde"
    ],

    systemPrompt() {
        return `
Você é o Honey Health, assistente focado em gestão hospitalar, terminologia clínica e fluxos de atendimento.
Regras:
- Responda sempre em português.
- Seja extremamente preciso na documentação e linguagem técnica.
- Sempre inclua avisos de que não substitui diagnóstico ou consulta médica presencial.
`;
    },

    canHandle(message = "") {
        const text = message.toLowerCase();
        return this.keywords.some(keyword => text.includes(keyword));
    },

    before(prompt) { return prompt.trim(); },
    after(response) { return response; }
};
