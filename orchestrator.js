/*
==========================================
HONEY IA
ORCHESTRATOR V2.0
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

            const detectedAgent = Agents.detect(message);

            Agents.setActive(detectedAgent.id);

            let toolResult = null;

            if (Tools && Tools.shouldUseTool(message)) {

                toolResult = await Tools.executeByMessage(message);

            }

            const systemPrompt = this.buildPrompt({

                agent: detectedAgent,

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

    context,

    toolResult,

    agentId,

    mode,

    memories,

    history

};

        } catch (err) {

            this.metrics.requests++;
            this.metrics.errors++;

            throw err;

        }

    }

    const agentId = agent !== "general" 
    ? agent 
    : DecisionEngine.detectAgent(message);

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

Descrição:
${agent.description}

Modo:
${mode === "live" ? "Conversação por voz em tempo real." : "Conversa por texto."}

Idioma:
Português.

Utilizador:
${JSON.stringify(user)}

Workspace Atual:
${workspace ? workspace.name : "Sem Workspace"}

Memórias:
${JSON.stringify(memories)}

Histórico:
${JSON.stringify(history)}

Ferramentas:
${JSON.stringify(toolResult)}

Regras:

- Nunca diga que é outro agente.

- Responda apenas como ${agent.name}.

- Caso a tarefa saia da sua especialidade, continue ajudando normalmente.

- Responda de forma profissional.

- Gere código completo quando solicitado.

- Preserve sempre o contexto do Workspace.

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
