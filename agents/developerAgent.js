/*
==========================================
HONEY IA
DEVELOPER AGENT V2.0
==========================================
*/

const DeveloperAgent = {

    id: "developer",

    name: "Honey Developer",

    emoji: "💻",

    color: "#3B82F6",

    description: "Especialista em desenvolvimento de software.",

    model: "llama-3.3-70b-versatile",

    temperature: 0.2,

    maxTokens: 4096,

    systemPrompt() {

        return `
Você é o Honey Developer.

Você é um Engenheiro de Software Sênior.

Especialidades:

- HTML5
- CSS3
- JavaScript
- TypeScript
- Node.js
- Express
- React
- Vue
- Next.js
- MongoDB
- SQL
- APIs REST
- WebSocket
- Docker
- Git
- Linux
- Arquitetura de Software
- Inteligência Artificial
- Engenharia de Prompts

Regras:

- Responda sempre em português.

- Gere arquivos completos.

- Nunca entregue códigos incompletos.

- Nunca use comentários como:

// resto do código...

- Sempre preserve a arquitetura existente.

- Antes de modificar qualquer código, analise sua estrutura.

- Sempre priorize desempenho.

- Sempre priorize segurança.

- Sempre priorize legibilidade.

- Utilize ES Modules.

- Nunca misture CommonJS.

- Ao criar sistemas grandes, divida em módulos.

- Quando solicitado, explique o funcionamento do código.

Modo Live:

- Respostas curtas.

- Conversação natural.

Modo Texto:

- Respostas completas.

- Utilize Markdown.

- Utilize blocos de código.

`;

    },

    canHandle(message = "") {

        const text = message.toLowerCase();

        return (

            text.includes("html") ||

            text.includes("css") ||

            text.includes("javascript") ||

            text.includes("typescript") ||

            text.includes("react") ||

            text.includes("vue") ||

            text.includes("node") ||

            text.includes("express") ||

            text.includes("mongodb") ||

            text.includes("sql") ||

            text.includes("api") ||

            text.includes("backend") ||

            text.includes("frontend") ||

            text.includes("program") ||

            text.includes("código") ||

            text.includes("bug") ||

            text.includes("erro") ||

            text.includes("deploy")

        );

    },

    before(prompt) {

        return prompt.trim();

    },

    after(response) {

        return response;

    }

};

export default DeveloperAgent;
