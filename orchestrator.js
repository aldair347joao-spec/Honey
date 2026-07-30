/*
==========================================
HONEY IA OS
ORCHESTRATOR ENGINE V4.0 (FULL PRODUCTION)
==========================================
*/

import GeneralAgent from "./agents/GeneralAgent.js";
import ArchitectAgent from "./agents/ArchitectAgent.js";
import DesignerAgent from "./agents/DesignerAgent.js";
import DeveloperAgent from "./agents/DeveloperAgent.js";
import EducationAgent from "./agents/EducationAgent.js";
import ExcelAgent from "./agents/ExcelAgent.js";
import FinanceAgent from "./agents/FinanceAgent.js";
import HealthcareAgent from "./agents/HealthcareAgent.js";
import ImageAgent from "./agents/ImageAgent.js";
import LegalAgent from "./agents/LegalAgent.js";
import MarketingAgent from "./agents/MarketingAgent.js";
import SalesAgent from "./agents/SalesAgent.js";
import SecurityAgent from "./agents/SecurityAgent.js";
import VideoAgent from "./agents/VideoAgent.js";

/**
 * Registo Central de Todos os Agentes da Plataforma
 */
const AGENTS_REGISTRY = {
    general: GeneralAgent,
    architect: ArchitectAgent,
    designer: DesignerAgent,
    developer: DeveloperAgent,
    education: EducationAgent,
    excel: ExcelAgent,
    finance: FinanceAgent,
    healthcare: HealthcareAgent,
    image: ImageAgent,
    legal: LegalAgent,
    marketing: MarketingAgent,
    sales: SalesAgent,
    security: SecurityAgent,
    video: VideoAgent
};

/**
 * Estado Global de Métricas e Telemetria do Orquestrador
 */
const OrchestratorMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    agentExecutions: {},
    tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
    },
    latencyHistory: [],
    
    recordRequest(agentId, latencyMs, tokens = {}) {
        this.totalRequests++;
        this.successfulRequests++;
        this.agentExecutions[agentId] = (this.agentExecutions[agentId] || 0) + 1;
        
        if (tokens.prompt_tokens) this.tokenUsage.promptTokens += tokens.prompt_tokens;
        if (tokens.completion_tokens) this.tokenUsage.completionTokens += tokens.completion_tokens;
        if (tokens.total_tokens) this.tokenUsage.totalTokens += tokens.total_tokens;

        this.latencyHistory.push(latencyMs);
        if (this.latencyHistory.length > 100) this.latencyHistory.shift();
    },

    recordFailure(agentId) {
        this.totalRequests++;
        this.failedRequests++;
        this.agentExecutions[agentId] = (this.agentExecutions[agentId] || 0) + 1;
    },

    getAverageLatency() {
        if (this.latencyHistory.length === 0) return 0;
        const sum = this.latencyHistory.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.latencyHistory.length);
    }
};

/**
 * Motor Central de Roteamento e Seleção de Agentes
 */
export class AgentRouter {
    
    /**
     * Pontua e escolhe o melhor agente para a mensagem
     */
    static selectAgent(userMessage = "", forcedAgentId = null) {
        // Se o utilizador forçou um agente específico pela UI
        if (forcedAgentId && AGENTS_REGISTRY[forcedAgentId]) {
            return {
                agent: AGENTS_REGISTRY[forcedAgentId],
                score: 1.0,
                reason: "forced_by_user"
            };
        }

        if (!userMessage || typeof userMessage !== "string") {
            return {
                agent: GeneralAgent,
                score: 1.0,
                reason: "default_fallback"
            };
        }

        const normalizedText = userMessage.toLowerCase().trim();
        let bestMatchAgent = GeneralAgent;
        let highestScore = 0;

        // Iterar sobre todos os agentes para calcular relevância
        for (const [id, agent] of Object.entries(AGENTS_REGISTRY)) {
            if (id === "general") continue;

            let currentScore = 0;

            // 1. Avaliação via método canHandle()
            if (typeof agent.canHandle === "function") {
                try {
                    const canHandleResult = agent.canHandle(normalizedText);
                    if (canHandleResult === true) {
                        currentScore += 0.8;
                    } else if (typeof canHandleResult === "number") {
                        currentScore += canHandleResult;
                    }
                } catch (err) {
                    console.warn(`[Orchestrator] Erro ao executar canHandle() no agente ${id}:`, err.message);
                }
            }

            // 2. Avaliação complementar via Keywords (caso existam no objeto)
            if (Array.isArray(agent.keywords)) {
                const keywordMatches = agent.keywords.filter(kw => normalizedText.includes(kw.toLowerCase()));
                if (keywordMatches.length > 0) {
                    currentScore += Math.min(0.6, keywordMatches.length * 0.2);
                }
            }

            if (currentScore > highestScore) {
                highestScore = currentScore;
                bestMatchAgent = agent;
            }
        }

        // Se a pontuação mínima não for atingida, cai no GeneralAgent
        if (highestScore < 0.3) {
            return {
                agent: GeneralAgent,
                score: 0.0,
                reason: "low_confidence_fallback"
            };
        }

        return {
            agent: bestMatchAgent,
            score: Number(highestScore.toFixed(2)),
            reason: "keyword_and_logic_match"
        };/**
 * Construtor de Contexto e Gerenciador de Prompts do Sistema
 */
export class PromptFactory {

    /**
     * Resolve de forma totalmente segura o systemPrompt do agente
     */
    static extractSystemPrompt(agent) {
        if (!agent) return "Você é um assistente virtual da Honey IA.";

        if (typeof agent.systemPrompt === "function") {
            try {
                return agent.systemPrompt();
            } catch (err) {
                console.error(`[Orchestrator] Erro ao invocar systemPrompt() do agente ${agent.id}:`, err);
            }
        }
        
        if (typeof agent.systemPrompt === "string") {
            return agent.systemPrompt;
        }

        if (agent.description) {
            return `Você é o ${agent.name || "Agente Honey IA"}. ${agent.description}`;
        }

        return "Você é um assistente virtual da Honey IA.";
    }

    /**
     * Injeta memórias históricas e contexto do Workspace no prompt do sistema
     */
    static injectWorkspaceContext(basePrompt, workspaceContext = {}, userMemory = []) {
        let enhancedPrompt = basePrompt;

        // Injeção de Contexto do Workspace
        if (workspaceContext && Object.keys(workspaceContext).length > 0) {
            enhancedPrompt += "\n\n=== CONTEXTO DO WORKSPACE ATIVO ===";
            if (workspaceContext.projectName) enhancedPrompt += `\n- Projeto: ${workspaceContext.projectName}`;
            if (workspaceContext.activeFile) enhancedPrompt += `\n- Ficheiro em Foco: ${workspaceContext.activeFile}`;
            if (workspaceContext.language) enhancedPrompt += `\n- Linguagem/Tecnologia: ${workspaceContext.language}`;
            if (workspaceContext.environment) enhancedPrompt += `\n- Ambiente: ${workspaceContext.environment}`;
        }

        // Injeção de Memórias Persistentes do Utilizador
        if (Array.isArray(userMemory) && userMemory.length > 0) {
            enhancedPrompt += "\n\n=== MEMÓRIA PERSISTENTE DO UTILIZADOR ===";
            userMemory.forEach((mem, index) => {
                enhancedPrompt += `\n${index + 1}. ${mem}`;
            });
        }

        return enhancedPrompt;
    }

    /**
     * Adapta as instruções da IA de acordo com o modo de interação (Live vs Texto)
     */
    static applyModeRules(promptText, mode = "text") {
        if (mode === "live") {
            return promptText + `\n\n[INSTRUÇÕES DO MODO LIVE]:
- Responda de forma extremamente natural, humana e fluida.
- Use frases mais curtas e diretas ao ponto.
- Evite blocos extensos de código ou listas muito longas a menos que estritamente solicitado.
- Converse como um especialista numa chamada de voz em tempo real.`;
        }

        return promptText + `\n\n[INSTRUÇÕES DO MODO TEXTO]:
- Explique detalhadamente e de forma estruturada.
- Utilize Markdown com tabelas, negritos e títulos quando apropriado.
- Utilize blocos de código completos e formatados com sintaxe destacada.
- Garanta respostas ricas, profissionais e bem explicadas.`;
    }

    /**
     * Constrói o payload de mensagens completo formatado para a API da Groq
     */
    static buildMessagesPayload({ agent, userPrompt, history = [], workspaceContext = {}, userMemory = [], mode = "text" }) {
        const rawSystemPrompt = this.extractSystemPrompt(agent);
        const promptWithContext = this.injectWorkspaceContext(rawSystemPrompt, workspaceContext, userMemory);
        const finalSystemPrompt = this.applyModeRules(promptWithContext, mode);

        // Pré-processamento do prompt pelo agente
        let processedUserPrompt = userPrompt;
        if (typeof agent.before === "function") {
            try {
                processedUserPrompt = agent.before(userPrompt);
            } catch (err) {
                console.warn(`[Orchestrator] Erro ao executar before() no agente ${agent.id}:`, err.message);
            }
        }

        const formattedHistory = history.map(msg => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content || ""
        }));

        return [
            { role: "system", content: finalSystemPrompt },
            ...formattedHistory,
            { role: "user", content: processedUserPrompt }
        ];
    }
}

/**
 * Gestor e Orquestrador de Ferramentas / Plugins (Tools)
 */
export class ToolOrchestrator {
    
    /**
     * Retorna a lista de definições de ferramentas suportadas para o agente
     */
    static getAvailableTools(agent) {
        if (!agent.tools || !Array.isArray(agent.tools)) return undefined;

        const toolsDefinitions = [];

        if (agent.tools.includes("web")) {
            toolsDefinitions.push({
                type: "function",
                function: {
                    name: "web_search",
                    description: "Pesquisa informações atualizadas na web em tempo real.",
                    parameters: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Termo de pesquisa para a web" }
                        },
                        required: ["query"]
                    }
                }
            });
        }

        if (agent.tools.includes("analytics")) {
            toolsDefinitions.push({
                type: "function",
                function: {
                    name: "get_analytics",
                    description: "Obtém métricas de desempenho e relatórios do workspace.",
                    parameters: {
                        type: "object",
                        properties: {
                            metricType: { type: "string", description: "Tipo de métrica (vendas, acessos, conversão)" }
                        },
                        required: ["metricType"]
                    }
                }
            });
        }

        return toolsDefinitions.length > 0 ? toolsDefinitions : undefined;
    }
}

    }
}
/**
 * CLASSE PRINCIPAL: ORCHESTRATOR ENGINE V4.0
 */
export class Orchestrator {
    
    constructor(groqSdkClient = null) {
        this.groq = groqSdkClient;
    }

    /**
     * Define/atualiza o cliente SDK da Groq
     */
    setGroqClient(client) {
        this.groq = client;
    }

    /**
     * Executa uma requisição completa (Standard Completion)
     */
    async processRequest({ userPrompt, agentId = null, history = [], workspaceContext = {}, userMemory = [], mode = "text" }) {
        const startTime = Date.now();

        // 1. Seleciona o agente ideal
        const selection = AgentRouter.selectAgent(userPrompt, agentId);
        const selectedAgent = selection.agent;

        try {
            // 2. Constrói o payload de mensagens
            const messages = PromptFactory.buildMessagesPayload({
                agent: selectedAgent,
                userPrompt,
                history,
                workspaceContext,
                userMemory,
                mode
            });

            // 3. Prepara opções do modelo
            const model = selectedAgent.model || "llama-3.3-70b-versatile";
            const temperature = selectedAgent.temperature ?? 0.5;
            const max_tokens = selectedAgent.maxTokens || 4096;
            const tools = ToolOrchestrator.getAvailableTools(selectedAgent);

            if (!this.groq) {
                throw new Error("[Orchestrator] SDK da Groq não foi inicializada no Orchestrator.");
            }

            // 4. Chamada à API da Groq
            const apiPayload = {
                model,
                messages,
                temperature,
                max_tokens
            };

            if (tools) apiPayload.tools = tools;

            const completion = await this.groq.chat.completions.create(apiPayload);

            let rawOutput = completion.choices[0]?.message?.content || "";

            // 5. Pós-processamento pelo agente
            let finalOutput = rawOutput;
            if (typeof selectedAgent.after === "function") {
                try {
                    finalOutput = selectedAgent.after(rawOutput);
                } catch (err) {
                    console.warn(`[Orchestrator] Erro no método after() do agente ${selectedAgent.id}:`, err.message);
                }
            }

            // 6. Regista métricas
            const latencyMs = Date.now() - startTime;
            OrchestratorMetrics.recordRequest(selectedAgent.id, latencyMs, completion.usage || {});

            return {
                success: true,
                agent: {
                    id: selectedAgent.id,
                    name: selectedAgent.name,
                    emoji: selectedAgent.emoji
                },
                routingInfo: {
                    score: selection.score,
                    reason: selection.reason
                },
                response: finalOutput,
                toolCalls: completion.choices[0]?.message?.tool_calls || null,
                metrics: {
                    latencyMs,
                    tokens: completion.usage || null
                }
            };

        } catch (error) {
            console.error(`[Orchestrator] Falha ao processar requisição com agente ${selectedAgent?.id}:`, error);
            OrchestratorMetrics.recordFailure(selectedAgent?.id || "unknown");

            return {
                success: false,
                agent: {
                    id: selectedAgent?.id || "general",
                    name: selectedAgent?.name || "Honey IA"
                },
                error: error.message || "Erro interno no processamento da Honey IA.",
                metrics: {
                    latencyMs: Date.now() - startTime
                }
            };
        }
    }

    /**
     * Executa uma requisição em tempo real (Streaming Response)
     */
    async processStream({ userPrompt, agentId = null, history = [], workspaceContext = {}, userMemory = [], mode = "text", onChunk, onComplete, onError }) {
        const startTime = Date.now();

        // 1. Seleciona o agente
        const selection = AgentRouter.selectAgent(userPrompt, agentId);
        const selectedAgent = selection.agent;

        try {
            // 2. Constrói o payload de mensagens
            const messages = PromptFactory.buildMessagesPayload({
                agent: selectedAgent,
                userPrompt,
                history,
                workspaceContext,
                userMemory,
                mode
            });

            const model = selectedAgent.model || "llama-3.3-70b-versatile";
            const temperature = selectedAgent.temperature ?? 0.5;
            const max_tokens = selectedAgent.maxTokens || 4096;

            if (!this.groq) {
                throw new Error("[Orchestrator] SDK da Groq não foi inicializada no Orchestrator.");
            }

            // 3. Chamada via Streaming
            const stream = await this.groq.chat.completions.create({
                model,
                messages,
                temperature,
                max_tokens,
                stream: true
            });

            let fullContent = "";

            for await (const chunk of stream) {
                const contentChunk = chunk.choices[0]?.delta?.content || "";
                if (contentChunk) {
                    fullContent += contentChunk;
                    if (typeof onChunk === "function") {
                        onChunk(contentChunk);
                    }
                }
            }

            // 4. Pós-processamento final
            let finalOutput = fullContent;
            if (typeof selectedAgent.after === "function") {
                try {
                    finalOutput = selectedAgent.after(fullContent);
                } catch (err) {
                    console.warn(`[Orchestrator] Erro no método after() do agente ${selectedAgent.id}:`, err.message);
                }
            }

            const latencyMs = Date.now() - startTime;
            OrchestratorMetrics.recordRequest(selectedAgent.id, latencyMs);

            if (typeof onComplete === "function") {
                onComplete({
                    success: true,
                    agent: {
                        id: selectedAgent.id,
                        name: selectedAgent.name,
                        emoji: selectedAgent.emoji
                    },
                    fullResponse: finalOutput,
                    metrics: { latencyMs }
                });
            }

            return finalOutput;

        } catch (error) {
            console.error(`[Orchestrator Stream Error] Agente ${selectedAgent?.id}:`, error);
            OrchestratorMetrics.recordFailure(selectedAgent?.id || "unknown");

            if (typeof onError === "function") {
                onError(error);
            }
            throw error;
        }
    }

    /**
     * Retorna o relatório de telemetria e métricas do sistema
     */
    getTelemetry() {
        return {
            ...OrchestratorMetrics,
            averageLatencyMs: OrchestratorMetrics.getAverageLatency(),
            availableAgentsCount: Object.keys(AGENTS_REGISTRY).length
        };
    }
}

// Instância padrão pronta a usar
const orchestratorInstance = new Orchestrator();

export { AGENTS_REGISTRY, OrchestratorMetrics };
export default orchestratorInstance;
