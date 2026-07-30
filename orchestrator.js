/*
==========================================
HONEY IA OS
ORCHESTRATOR ENGINE V4.0 (FULL PRODUCTION)
==========================================
*/

import generalagent from "./agents/generalagent.js";
import architectagent from "./agents/architectagent.js";
import designeragent from "./agents/designeragent.js";
import developeragent from "./agents/developeragent.js";
import educationagent from "./agents/educationagent.js";
import excelagent from "./agents/excelagent.js";
import financeagent from "./agents/financeagent.js";
import healthcareagent from "./agents/healthcareagent.js";
import imageagent from "./agents/imageagent.js";
import legalagent from "./agents/legalagent.js";
import marketingagent from "./agents/marketingagent.js";
import salesagent from "./agents/salesagent.js";
import securityagent from "./agents/securityagent.js";
import videoagent from "./agents/videoagent.js";

/**
 * Registo Central de Todos os Agentes da Plataforma
 */
const agents_registry = {
    general: generalagent,
    architect: architectagent,
    designer: designeragent,
    developer: developeragent,
    education: educationagent,
    excel: excelagent,
    finance: financeagent,
    healthcare: healthcareagent,
    image: imageagent,
    legal: legalagent,
    marketing: marketingagent,
    sales: salesagent,
    security: securityagent,
    video: videoagent
};

/**
 * Estado Global de Métricas e Telemetria do Orquestrador
 */
const orchestrator_metrics = {
    totalrequests: 0,
    successfulrequests: 0,
    failedrequests: 0,
    agentexecutions: {},
    tokenusage: {
        prompttokens: 0,
        completiontokens: 0,
        totaltokens: 0
    },
    latencyhistory: [],
    
    recordrequest(agentid, latencyms, tokens = {}) {
        this.totalrequests++;
        this.successfulrequests++;
        this.agentexecutions[agentid] = (this.agentexecutions[agentid] || 0) + 1;
        
        if (tokens.prompt_tokens) this.tokenusage.prompttokens += tokens.prompt_tokens;
        if (tokens.completion_tokens) this.tokenusage.completiontokens += tokens.completion_tokens;
        if (tokens.total_tokens) this.tokenusage.totaltokens += tokens.total_tokens;

        this.latencyhistory.push(latencyms);
        if (this.latencyhistory.length > 100) this.latencyhistory.shift();
    },

    recordfailure(agentid) {
        this.totalrequests++;
        this.failedrequests++;
        this.agentexecutions[agentid] = (this.agentexecutions[agentid] || 0) + 1;
    },

    getaveragelatency() {
        if (this.latencyhistory.length === 0) return 0;
        const sum = this.latencyhistory.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.latencyhistory.length);
    }
};

/**
 * Motor Central de Roteamento e Seleção de Agentes
 */
export class agentrouter {
    
    /**
     * Pontua e escolhe o melhor agente para a mensagem
     */
    static selectagent(usermessage = "", forcedagentid = null) {
        const normalizedforcedid = forcedagentid ? String(forcedagentid).toLowerCase().trim() : null;

        if (normalizedforcedid && agents_registry[normalizedforcedid]) {
            return {
                agent: agents_registry[normalizedforcedid],
                score: 1.0,
                reason: "forced_by_user"
            };
        }

        if (!usermessage || typeof usermessage !== "string") {
            return {
                agent: generalagent,
                score: 1.0,
                reason: "default_fallback"
            };
        }

        const normalizedtext = usermessage.toLowerCase().trim();
        let bestmatchagent = generalagent;
        let highestscore = 0;

        for (const [id, agent] of Object.entries(agents_registry)) {
            if (id === "general") continue;

            let currentscore = 0;

            if (typeof agent.canHandle === "function") {
                try {
                    const canhandleresult = agent.canHandle(normalizedtext);
                    if (canhandleresult === true) {
                        currentscore += 0.8;
                    } else if (typeof canhandleresult === "number") {
                        currentscore += canhandleresult;
                    }
                } catch (err) {
                    console.warn(`[Orchestrator] Erro ao executar canHandle() no agente ${id}:`, err.message);
                }
            }

            if (Array.isArray(agent.keywords)) {
                const keywordmatches = agent.keywords.filter(kw => normalizedtext.includes(kw.toLowerCase()));
                if (keywordmatches.length > 0) {
                    currentscore += Math.min(0.6, keywordmatches.length * 0.2);
                }
            }

            if (currentscore > highestscore) {
                highestscore = currentscore;
                bestmatchagent = agent;
            }
        }

        if (highestscore < 0.3) {
            return {
                agent: generalagent,
                score: 0.0,
                reason: "low_confidence_fallback"
            };
        }

        return {
            agent: bestmatchagent,
            score: Number(highestscore.toFixed(2)),
            reason: "keyword_and_logic_match"
        };
    }
}

/**
 * Construtor de Contexto e Gerenciador de Prompts do Sistema
 */
export class promptfactory {

    static extractsystemprompt(agent) {
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

    static injectworkspacecontext(baseprompt, workspacecontext = {}, usermemory = []) {
        let enhancedprompt = baseprompt;

        if (workspacecontext && Object.keys(workspacecontext).length > 0) {
            enhancedprompt += "\n\n=== CONTEXTO DO WORKSPACE ATIVO ===";
            if (workspacecontext.projectName) enhancedprompt += `\n- Projeto: ${workspacecontext.projectName}`;
            if (workspacecontext.activeFile) enhancedprompt += `\n- Ficheiro em Foco: ${workspacecontext.activeFile}`;
            if (workspacecontext.language) enhancedprompt += `\n- Linguagem/Tecnologia: ${workspacecontext.language}`;
            if (workspacecontext.environment) enhancedprompt += `\n- Ambiente: ${workspacecontext.environment}`;
        }

        if (Array.isArray(usermemory) && usermemory.length > 0) {
            enhancedprompt += "\n\n=== MEMÓRIA PERSISTENTE DO UTILIZADOR ===";
            usermemory.forEach((mem, index) => {
                enhancedprompt += `\n${index + 1}. ${mem}`;
            });
        }

        return enhancedprompt;
    }

    static applymoderules(prompttext, mode = "text") {
        if (mode === "live") {
            return prompttext + `\n\n[INSTRUÇÕES DO MODO LIVE]:
- Responda de forma extremamente natural, humana e fluida.
- Use frases mais curtas e diretas ao ponto.
- Evite blocos extensos de código ou listas muito longas a menos que estritamente solicitado.
- Converse como um especialista numa chamada de voz em tempo real.`;
        }

        return prompttext + `\n\n[INSTRUÇÕES DO MODO TEXTO]:
- Explique detalhadamente e de forma estruturada.
- Utilize Markdown com tabelas, negritos e títulos quando apropriado.
- Utilize blocos de código completos e formatados com sintaxe destacada.
- Garanta respostas ricas, profissionais e bem explicadas.`;
    }

    static buildmessagespayload({ agent, userPrompt, history = [], workspaceContext = {}, userMemory = [], mode = "text" }) {
        const rawsystemprompt = this.extractsystemprompt(agent);
        const promptwithcontext = this.injectworkspacecontext(rawsystemprompt, workspaceContext, userMemory);
        const finalsystemprompt = this.applymoderules(promptwithcontext, mode);

        let processeduserprompt = userPrompt;
        if (typeof agent.before === "function") {
            try {
                processeduserprompt = agent.before(userPrompt);
            } catch (err) {
                console.warn(`[Orchestrator] Erro ao executar before() no agente ${agent.id}:`, err.message);
            }
        }

        const formattedhistory = history.map(msg => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content || ""
        }));

        return [
            { role: "system", content: finalsystemprompt },
            ...formattedhistory,
            { role: "user", content: processeduserprompt }
        ];
    }
}

/**
 * Gestor e Orquestrador de Ferramentas / Plugins (Tools)
 */
export class toolorchestrator {
    
    static getavailabletools(agent) {
        if (!agent.tools || !Array.isArray(agent.tools)) return undefined;

        const toolsdefinitions = [];

        if (agent.tools.includes("web")) {
            toolsdefinitions.push({
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
            toolsdefinitions.push({
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

        return toolsdefinitions.length > 0 ? toolsdefinitions : undefined;
    }
}

/**
 * CLASSE PRINCIPAL: ORCHESTRATOR ENGINE V4.0
 */
export class Orchestrator {
    
    constructor(groqsdkclient = null) {
        this.groq = groqsdkclient;
    }

    setGroqClient(client) {
        this.groq = client;
    }

    async processRequest({ userPrompt, agentId = null, history = [], workspaceContext = {}, userMemory = [], mode = "text" }) {
        conststarttime = Date.now();

        const selection = agentrouter.selectagent(userPrompt, agentId);
        const selectedagent = selection.agent;

        try {
            const messages = promptfactory.buildmessagespayload({
                agent: selectedagent,
                userPrompt,
                history,
                workspaceContext,
                userMemory,
                mode
            });

            const model = selectedagent.model || "llama-3.3-70b-versatile";
            const temperature = selectedagent.temperature ?? 0.5;
            const max_tokens = selectedagent.maxTokens || 4096;
            const tools = toolorchestrator.getavailabletools(selectedagent);

            if (!this.groq) {
                throw new Error("[Orchestrator] SDK da Groq não foi inicializada no Orchestrator.");
            }

            const apipayload = {
                model,
                messages,
                temperature,
                max_tokens
            };

            if (tools) apipayload.tools = tools;

            const completion = await this.groq.chat.completions.create(apipayload);

            let rawoutput = completion.choices[0]?.message?.content || "";

            let finaloutput = rawoutput;
            if (typeof selectedagent.after === "function") {
                try {
                    finaloutput = selectedagent.after(rawoutput);
                } catch (err) {
                    console.warn(`[Orchestrator] Erro no método after() do agente ${selectedagent.id}:`, err.message);
                }
            }

            const latencyms = Date.now() - starttime;
            orchestrator_metrics.recordrequest(selectedagent.id, latencyms, completion.usage || {});

            return {
                success: true,
                agent: {
                    id: selectedagent.id,
                    name: selectedagent.name,
                    emoji: selectedagent.emoji
                },
                routingInfo: {
                    score: selection.score,
                    reason: selection.reason
                },
                response: finaloutput,
                toolCalls: completion.choices[0]?.message?.tool_calls || null,
                metrics: {
                    latencyms,
                    tokens: completion.usage || null
                }
            };

        } catch (error) {
            console.error(`[Orchestrator] Falha ao processar requisição com agente ${selectedagent?.id}:`, error);
            orchestrator_metrics.recordfailure(selectedagent?.id || "unknown");

            return {
                success: false,
                agent: {
                    id: selectedagent?.id || "general",
                    name: selectedagent?.name || "Honey IA"
                },
                error: error.message || "Erro interno no processamento da Honey IA.",
                metrics: {
                    latencyms: Date.now() - starttime
                }
            };
        }
    }

    async processStream({ userPrompt, agentId = null, history = [], workspaceContext = {}, userMemory = [], mode = "text", onChunk, onComplete, onError }) {
        const starttime = Date.now();

        const selection = agentrouter.selectagent(userPrompt, agentId);
        const selectedagent = selection.agent;

        try {
            const messages = promptfactory.buildmessagespayload({
                agent: selectedagent,
                userPrompt,
                history,
                workspaceContext,
                userMemory,
                mode
            });

            const model = selectedagent.model || "llama-3.3-70b-versatile";
            const temperature = selectedagent.temperature ?? 0.5;
            const max_tokens = selectedagent.maxTokens || 4096;

            if (!this.groq) {
                throw new Error("[Orchestrator] SDK da Groq não foi inicializada no Orchestrator.");
            }

            const stream = await this.groq.chat.completions.create({
                model,
                messages,
                temperature,
                max_tokens,
                stream: true
            });

            let fullcontent = "";

            for await (const chunk of stream) {
                const contentchunk = chunk.choices[0]?.delta?.content || "";
                if (contentchunk) {
                    fullcontent += contentchunk;
                    if (typeof onChunk === "function") {
                        onChunk(contentchunk);
                    }
                }
            }

            let finaloutput = fullcontent;
            if (typeof selectedagent.after === "function") {
                try {
                    finaloutput = selectedagent.after(fullcontent);
                } catch (err) {
                    console.warn(`[Orchestrator] Erro no método after() do agente ${selectedagent.id}:`, err.message);
                }
            }

            const latencyms = Date.now() - starttime;
            orchestrator_metrics.recordrequest(selectedagent.id, latencyms);

            if (typeof onComplete === "function") {
                onComplete({
                    success: true,
                    agent: {
                        id: selectedagent.id,
                        name: selectedagent.name,
                        emoji: selectedagent.emoji
                    },
                    fullResponse: finaloutput,
                    metrics: { latencyms }
                });
            }

            return fullcontent;

        } catch (error) {
            console.error(`[Orchestrator Stream Error] Agente ${selectedagent?.id}:`, error);
            orchestrator_metrics.recordfailure(selectedagent?.id || "unknown");

            if (typeof onError === "function") {
                onError(error);
            }
            throw error;
        }
    }

    getTelemetry() {
        return {
            ...orchestrator_metrics,
            averageLatencyMs: orchestrator_metrics.getaveragelatency(),
            availableAgentsCount: Object.keys(agents_registry).length
        };
    }
}

const orchestratorinstance = new Orchestrator();

export { agents_registry, orchestrator_metrics };
export default orchestratorinstance;
