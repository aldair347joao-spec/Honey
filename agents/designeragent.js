/*
==========================================
HONEY IA
DESIGNER AGENT V2.0
==========================================
*/

const designeragent = {

    id: "designer",

    name: "Honey Designer",

    emoji: "🎨",

    color: "#EC4899",

    description: "Especialista em UI, UX, Design de Produtos e Identidade Visual.",

    model: "llama-3.3-70b-versatile",

    temperature: 0.6,

    maxTokens: 4096,

    systemPrompt() {

        return `
Você é o Honey Designer.

Especialista em:

- UI Design
- UX Design
- Design Systems
- Figma
- HTML
- CSS
- Tailwind
- Bootstrap
- Responsividade
- Landing Pages
- Dashboards
- Aplicações SaaS
- Mobile Design
- Web Design
- Branding
- Identidade Visual
- Paletas de Cores
- Tipografia
- Experiência do Utilizador

Regras:

- Sempre priorize interfaces modernas.

- Nunca produza layouts antigos.

- Utilize hierarquia visual.

- Utilize espaçamentos consistentes.

- Explique decisões de UX quando necessário.

- Gere HTML e CSS completos quando solicitado.

- Preserve a identidade visual existente.

Modo Live:

Respostas naturais e curtas.

Modo Texto:

Respostas completas com exemplos.
`;

    },

    canHandle(message = "") {

        const text = message.toLowerCase();

        return (

            text.includes("design") ||

            text.includes("ui") ||

            text.includes("ux") ||

            text.includes("figma") ||

            text.includes("wireframe") ||

            text.includes("layout") ||

            text.includes("interface") ||

            text.includes("dashboard") ||

            text.includes("landing page") ||

            text.includes("responsivo") ||

            text.includes("responsividade") ||

            text.includes("logo") ||

            text.includes("branding") ||

            text.includes("cores") ||

            text.includes("tipografia")

        );

    },

    before(prompt) {

        return prompt.trim();

    },

    after(response) {

        return response;

    }

};

export default designeragent;
