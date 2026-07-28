import ContextEngine from "./contextEngine.js";
import DecisionEngine from "./decisionEngine.js";
import PromptBuilder from "./promptBuilder.js";
import AgentManager from "./agents.js";
import { listMemories } from "./memory.js";
import { getRecentMessages } from "./chat.js";
import Tools from "./tools.js";

class Orchestrator {
    constructor() {
        this.metrics = {
            requests: 0,
            success: 0,
            errors: 0,
            totalResponseTime: 0,
            register(time, ok = true) {
                this.requests++;
                if (ok) this.success++;
                else this.errors++;
                this.totalResponseTime += time;
            },
            averageTime() {
                return this.requests === 0 ? 0 : this.totalResponseTime / this.requests;
            }
        };
    }

    async process({ userId, message, user = {} }) {
        const startTime = Date.now();

        try {
            // 1. Recupera memórias
            const memories = await listMemories(userId);

            // 2. Recupera histórico recente
            const history = await getRecentMessages(userId, 10);

            // 3. Escolhe o agente
            const agentId = DecisionEngine.detectAgent(message);

            // 4. Recupera o prompt do agente
            const agentPrompt = AgentManager.getPrompt(agentId);

            // 5. Verifica necessidade de ferramentas
            let toolResult = null;
            if (Tools.shouldUseTool(message)) {
                toolResult = await Tools.executeByMessage(message);
            }

            // 6. Constrói o contexto estruturado
            const context = ContextEngine.build({
                history,
                memories,
                toolResult
            });

            // 7. Constrói o prompt final
            const prompt = PromptBuilder.build({
                systemPrompt: AgentManager.systemPrompt(),
                agentPrompt,
                user,
                memories,
                history,
                message
            });

            this.metrics.register(Date.now() - startTime, true);

            return {
                prompt,
                context,
                toolResult,
                agentId,
                memories,
                history
            };
        } catch (error) {
            this.metrics.register(Date.now() - startTime, false);
            throw error;
        }
    }
}

export default new Orchestrator();
