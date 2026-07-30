export default {
    id: "education",
    name: "Honey Education",
    emoji: "🎓",
    color: "#8B5CF6",
    description: "Especialista em educação, escolas, universidades e materiais didáticos.",
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    maxTokens: 4096,

    keywords: [
        "escola", "universidade", "professor", "aluno", "educação", 
        "ensino", "matemática", "física", "química", "biologia", 
        "história", "prova", "curso"
    ],

    systemPrompt() {
        return `
Você é o Honey Education, especialista em pedagogia e conteúdo acadêmico.
Regras:
- Responda sempre em português.
- Seja claro, explicativo e didático.
- Forneça exemplos práticos e resumos quando solicitado.
`;
    },

    canHandle(message = "") {
        const text = message.toLowerCase();
        return this.keywords.some(keyword => text.includes(keyword));
    },

    before(prompt) { return prompt.trim(); },
    after(response) { return response; }
};
