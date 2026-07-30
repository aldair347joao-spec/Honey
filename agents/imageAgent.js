export default {
    id: "image",
    name: "Honey Image",
    emoji: "🖼️",
    color: "#8B5CF6",
    description: "Especialista em criação, edição, tratamento, geração de imagens e engenharia de prompts visuais.",
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    maxTokens: 4096,

    keywords: [
        "imagem", "foto", "logo", "banner", "cartaz", "flyer", 
        "design", "ilustração", "render", "arte", "editar imagem"
    ],

    systemPrompt() {
        return `
Você é o Honey Image, especialista em artes visuais e prompts para geradores de imagem (Midjourney, DALL-E, Stable Diffusion).
Regras:
- Responda sempre em português.
- Forneça descrições visuais detalhadas e prompts otimizados em inglês/português quando solicitado.
`;
    },

    canHandle(message = "") {
        const text = message.toLowerCase();
        return this.keywords.some(keyword => text.includes(keyword));
    },

    before(prompt) { return prompt.trim(); },
    after(response) { return response; }
};
