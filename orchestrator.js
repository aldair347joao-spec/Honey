/*
==========================================
HONEY IA
ORCHESTRATOR V3.0
Enterprise Multi-Agent
==========================================
*/

import Agents from "./agents.js";
import Workspace from "./workspace.js";
import { listMemories } from "./memory.js";
import { getRecentMessages } from "./chat.js";
import Tools from "./tools.js";

class Orchestrator {

    constructor() {

        this.metrics = {
            requests: 0,
            success: 0,
            errors: 0,
            totalTime: 0
        };

    }

    async process({

        userId,
        message,
        user = {},
        agent = "general",
        mode = "chat"

    }) {

        const started = Date.now();

        try {

            const workspace = Workspace.getCurrent();

            const memories = await listMemories(userId);

            const history = await getRecentMessages(userId, 15);

            // Se o utilizador escolher manualmente um agente,
            // esse agente tem prioridade.
            let selectedAgent;

            if (agent && agent !== "general") {

                selectedAgent = Agents.getById(agent);

            } else {

                selectedAgent = Agents.detect(message);

            }

            if (!selectedAgent) {

                selectedAgent = Agents.getById("general");

            }

            Agents.setActive(selectedAgent.id);

            let toolResult = null;

            if (Tools && Tools.shouldUseTool(message)) {

                toolResult = await Tools.executeByMessage(message);

            }

            const prompt = this.buildPrompt({

                agent: selectedAgent,

                workspace,

                user,

                memories,

                history,

                toolResult,

                mode

            });

            this.metrics.requests++;
            this.metrics.success++;
            this.metrics.totalTime += Date.now() - started;

            return {

                prompt,

                context: {
                    workspace,
                    memories,
                    history
                },

                toolResult,

                agentId: selectedAgent.id,

                mode,

                memories,

                history

            };

        }

        catch (err) {

            this.metrics.requests++;
            this.metrics.errors++;

            throw err;

        }

    }

    buildPrompt({

        agent,
        workspace,
        user,
        memories,
        history,
        toolResult,
        mode

    }) {

        return `

Você é ${agent.name}.

Especialidade:

${agent.description}

====================================

IDENTIDADE

- Nunca diga que é outro agente.

- Nunca mude de personalidade.

- Mantenha sempre o comportamento de ${agent.name}.

====================================

MODO DE CONVERSA

${mode === "live"

? "O utilizador está numa conversa ao vivo. Responda naturalmente, como se estivesse a conversar por voz."

: "O utilizador está numa conversa escrita. Responda normalmente."}

====================================

UTILIZADOR

${JSON.stringify(user)}

====================================

WORKSPACE

${workspace ? workspace.name : "Sem Workspace ativo"}

====================================

MEMÓRIAS

${JSON.stringify(memories)}

====================================

HISTÓRICO

${JSON.stringify(history)}

====================================

TOOLS

${JSON.stringify(toolResult)}

====================================

REGRAS

• Preserve sempre o contexto.

• Gere código completo.

• Nunca invente informações.

• Utilize ferramentas quando necessário.

• Caso a tarefa saia da sua especialidade, continue a ajudar mantendo a sua identidade.

• Nunca diga que foi trocado de agente.

• Responda sempre em Português.

`;

    }

    stats() {

        return {

            requests: this.metrics.requests,

            success: this.metrics.success,

            errors: this.metrics.errors,

            average:

                this.metrics.requests === 0

                    ? 0

                    : Math.round(

                        this.metrics.totalTime /

                        this.metrics.requests

                    )

        };

    }

}

export default new Orchestrator();
