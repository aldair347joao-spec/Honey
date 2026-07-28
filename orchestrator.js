import ContextEngine from "./contextEngine.js";
import DecisionEngine from "./decisionEngine.js";
import PromptBuilder from "./promptBuilder.js";
import AgentManager from "./agents.js";
import Memory from "./memory.js";
import Chat from "./chat.js";
import Tools from "./tools.js";

class Orchestrator {

    async process({

        userId,

        message,

        user = {}

    }) {

        // 1. Recupera memória
        const memories = await Memory.getRelevantMemories(userId);

        // 2. Recupera histórico
        const history = await Chat.getRecentMessages(userId, 10);

        // 3. Escolhe o agente
        const agentId = DecisionEngine.detectAgent(message);

        // 4. Recupera o prompt do agente
        const agentPrompt = AgentManager.getPrompt(agentId);

        // 5. Verifica necessidade de ferramentas
        let toolResult = null;

        if (Tools.shouldUseTool(message)) {

            toolResult = await Tools.execute(message);
            
const context = ContextEngine.build({

    history,

    memories,

    toolResult

});
        }

        // 6. Constrói o prompt
        const prompt = PromptBuilder.build({

            systemPrompt: AgentManager.systemPrompt(),

            agentPrompt,

            user,

            memories,

            history,

            message

        });

        return {

            prompt,
           
            contex,

            toolResult,

            agentId,

            memories,

            history

        };

    }

}

export default new Orchestrator();
