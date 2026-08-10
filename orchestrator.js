/*
==========================================
HONEY IA OS
ORCHESTRATOR ENGINE V6.0
FULL MULTI-AGENT PRODUCTION
30 SPECIALIST AGENTS
Agent Routing + Prompt Factory
AI Response + Artifacts + Live Streaming
Enterprise Workspace Integration
==========================================
*/


// ==========================================
// CORE AGENTS
// ==========================================

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


// ==========================================
// ENTERPRISE AGENTS
// ==========================================

import writeragent from "./agents/writeragent.js";
import documentagent from "./agents/documentagent.js";
import bankingagent from "./agents/bankingagent.js";
import entrepreneuragent from "./agents/entrepreneuragent.js";
import interiordesignagent from "./agents/interiordesignagent.js";
import ecommerceagent from "./agents/ecommerceagent.js";
import socialmediaagent from "./agents/socialmediaagent.js";
import researchagent from "./agents/researchagent.js";
import automationagent from "./agents/automationagent.js";
import analyticsagent from "./agents/analyticsagent.js";
import customeragent from "./agents/customeragent.js";
import translationagent from "./agents/translationagent.js";
import businessagent from "./agents/businessagent.js";
import accountingagent from "./agents/accountingagent.js";
import strategistagent from "./agents/strategistagent.js";


// ==========================================
// CENTRAL AGENT REGISTRY
// ==========================================

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

    video: videoagent,

    writer: writeragent,

    document: documentagent,

    banking: bankingagent,

    entrepreneur: entrepreneuragent,

    interiordesign: interiordesignagent,

    ecommerce: ecommerceagent,

    socialmedia: socialmediaagent,

    research: researchagent,

    automation: automationagent,

    analytics: analyticsagent,

    customer: customeragent,

    translation: translationagent,

    business: businessagent,

    accounting: accountingagent,

    strategist: strategistagent

};


// ==========================================
// AGENT NORMALIZATION
// ==========================================

Object.entries(agents_registry).forEach(
    ([key, agent]) => {

        if(!agent) return;

        if(!agent.id){
            agent.id = key;
        }

        if(!agent.name){
            agent.name = `Agente ${key}`;
        }

        if(!Array.isArray(agent.tools)){
            agent.tools = [];
        }

        if(!Array.isArray(agent.capabilities)){
            agent.capabilities = [];
        }

        if(!Array.isArray(agent.outputTypes)){
            agent.outputTypes = [];
        }

        if(!agent.category){
            agent.category = "Tecnologia";
        }

        if(!agent.level){
            agent.level = "Professional";
        }

        if(!agent.description){
            agent.description =
                "Especialista Honey IA.";
        }

    }
);


// ==========================================
// AGENT ROUTER
// SMART SPECIALIST SELECTION ENGINE
// ==========================================

export class agentrouter {

    static selectagent(
        usermessage = "",
        forcedagentid = null
    ){

        const normalizedforcedid =
            forcedagentid
                ? String(forcedagentid)
                    .toLowerCase()
                    .trim()
                : null;


        // ----------------------------------
        // FORCE AGENT
        // ----------------------------------

        if(
            normalizedforcedid &&
            agents_registry[normalizedforcedid]
        ){

            return {

                agent:
                    agents_registry[
                        normalizedforcedid
                    ],

                score: 1,

                reason:
                    "forced_by_user"

            };

        }


        // ----------------------------------
        // DEFAULT
        // ----------------------------------

        if(
            !usermessage ||
            typeof usermessage !== "string"
        ){

            return {

                agent: generalagent,

                score: 1,

                reason:
                    "default_general"

            };

        }


        const text =
            usermessage
                .toLowerCase()
                .trim();


        let selected =
            generalagent;

        let bestScore = 0;


        // ----------------------------------
        // ANALYZE AGENTS
        // ----------------------------------

        for(
            const [id, agent]
            of Object.entries(
                agents_registry
            )
        ){

            if(!agent) continue;

            let score = 0;


            // ------------------------------
            // CUSTOM CAN HANDLE
            // ------------------------------

            if(
                typeof agent.canHandle ===
                "function"
            ){

                try{

                    const result =
                        agent.canHandle(text);

                    if(result === true){

                        score += 0.8;

                    }

                    else if(
                        typeof result ===
                        "number"
                    ){

                        score += Math.max(
                            0,
                            result
                        );

                    }

                }

                catch(error){

                    console.warn(
                        `[Router] Erro no agente ${id}:`,
                        error.message
                    );

                }

            }


            // ------------------------------
            // KEYWORDS
            // ------------------------------

            if(
                Array.isArray(agent.keywords) &&
                agent.keywords.length
            ){

                const matches =
                    agent.keywords.filter(
                        keyword => {

                            if(
                                typeof keyword !==
                                "string"
                            ){

                                return false;

                            }

                            return text.includes(
                                keyword
                                    .toLowerCase()
                                    .trim()
                            );

                        }
                    );


                if(matches.length){

                    score += Math.min(
                        0.6,
                        matches.length * 0.2
                    );

                }

            }


            // ------------------------------
            // NAME MATCH
            // ------------------------------

            if(
                agent.name &&
                text.includes(
                    String(agent.name)
                        .toLowerCase()
                )
            ){

                score += 0.15;

            }


            // ------------------------------
            // CATEGORY MATCH
            // ------------------------------

            if(
                agent.category &&
                text.includes(
                    String(agent.category)
                        .toLowerCase()
                )
            ){

                score += 0.1;

            }


            // ------------------------------
            // DESCRIPTION TOKEN MATCH
            // ------------------------------

            if(agent.description){

                const descriptionWords =
                    String(agent.description)
                        .toLowerCase()
                        .split(/\s+/)
                        .filter(
                            word =>
                                word.length >= 5
                        );


                const descriptionMatches =
                    descriptionWords.filter(
                        word =>
                            text.includes(word)
                    );


                if(descriptionMatches.length){

                    score += Math.min(
                        0.2,
                        descriptionMatches.length *
                        0.04
                    );

                }

            }


            // ------------------------------
            // BEST AGENT
            // ------------------------------

            if(score > bestScore){

                bestScore = score;

                selected = agent;

            }

        }


        // ----------------------------------
        // LOW CONFIDENCE
        // ----------------------------------

        if(bestScore < 0.3){

            return {

                agent: generalagent,

                score: 0,

                reason:
                    "low_confidence"

            };

        }


        return {

            agent: selected,

            score:
                Number(
                    bestScore.toFixed(2)
                ),

            reason:
                "smart_agent_match"

        };

    }

}


// ==========================================
// PROMPT FACTORY
// ==========================================

export class promptfactory {

    static extractsystemprompt(agent){

        if(!agent){

            return `
Você é a Honey IA,
uma inteligência artificial
profissional.

Responda de forma clara,
segura e útil.
`;

        }


        if(
            typeof agent.systemPrompt ===
            "function"
        ){

            try{

                return agent.systemPrompt();

            }

            catch(error){

                console.warn(
                    "[PromptFactory] Erro no systemPrompt:",
                    error.message
                );

            }

        }


        if(
            typeof agent.systemPrompt ===
            "string"
        ){

            return agent.systemPrompt;

        }


        return `

Você é ${agent.name || "um agente Honey IA"}.

Especialidade:
${
    agent.description ||
    "Assistência inteligente profissional."
}

Responsabilidades:
${
    Array.isArray(agent.capabilities)
        ? agent.capabilities.join("\n- ")
        : "Fornecer assistência profissional."
}

Responda de forma clara,
profissional, segura e útil.

`;

    }


    // ======================================
    // WORKSPACE CONTEXT
    // ======================================

    static injectworkspacecontext(
        baseprompt,
        workspaceContext = {},
        userMemory = []
    ){

        let finalPrompt =
            baseprompt;


        if(
            workspaceContext &&
            typeof workspaceContext === "object" &&
            Object.keys(workspaceContext).length
        ){

            finalPrompt += `

=== CONTEXTO DO WORKSPACE ===
`;

            if(workspaceContext.projectName){

                finalPrompt += `
Projeto:
${workspaceContext.projectName}
`;

            }

            if(workspaceContext.activeFile){

                finalPrompt += `
Ficheiro ativo:
${workspaceContext.activeFile}
`;

            }

            if(workspaceContext.language){

                finalPrompt += `
Tecnologia:
${workspaceContext.language}
`;

            }

            if(workspaceContext.content){

                finalPrompt += `
Conteúdo relevante:
${workspaceContext.content}
`;

            }

        }


        if(
            Array.isArray(userMemory) &&
            userMemory.length
        ){

            finalPrompt += `

=== MEMÓRIA DO UTILIZADOR ===
`;

            userMemory
                .slice(0, 20)
                .forEach(
                    (memory, index) => {

                        const value =
                            typeof memory === "string"
                                ? memory
                                : JSON.stringify(
                                    memory
                                );

                        finalPrompt += `
${index + 1}. ${value}
`;

                    }
                );

        }


        return finalPrompt;

    }


    // ======================================
    // MODE RULES
    // ======================================

    static applymoderules(
        prompt,
        mode = "chat"
    ){

        if(mode === "live"){

            return prompt + `

=== MODO LIVE ===

- Responda naturalmente.
- Seja direto.
- Use frases curtas.
- Evite explicações desnecessariamente longas.
- Mantenha uma conversa fluida.
`;

        }


        return prompt + `

=== MODO TEXTO ===

- Estruture a resposta.
- Use Markdown quando necessário.
- Explique como especialista.
- Forneça soluções profissionais.
- Quando criar código, entregue código completo e organizado.
`;

    }


    // ======================================
    // OUTPUT RULES
    // ======================================

    static applyoutputrules(
        prompt,
        agent
    ){

        const outputTypes =
            Array.isArray(agent?.outputTypes)
                ? agent.outputTypes
                : [];


        return prompt + `

=== OUTPUT HONEY IA ===

Quando a tarefa exigir um resultado concreto,
priorize produzir o conteúdo solicitado.

Tipos de saída suportados:
${
    outputTypes.length
        ? outputTypes.join(", ")
        : "texto, código, documentos e conteúdo estruturado"
}

Se produzir código:
- mantenha o código completo;
- não omita partes importantes;
- preserve consistência entre ficheiros;
- use padrões profissionais;
- considere segurança e desempenho.

Se produzir conteúdo textual:
- entregue diretamente o resultado;
- evite comentários desnecessários sobre o processo.
`;

    }


    // ======================================
    // BUILD GROQ MESSAGES
    // ======================================

    static buildmessagespayload({

        agent,

        userPrompt,

        history = [],

        workspaceContext = {},

        userMemory = [],

        mode = "chat"

    }){

        let systemPrompt =
            this.extractsystemprompt(
                agent
            );


        systemPrompt =
            this.injectworkspacecontext(
                systemPrompt,
                workspaceContext,
                userMemory
            );


        systemPrompt =
            this.applymoderules(
                systemPrompt,
                mode
            );


        systemPrompt =
            this.applyoutputrules(
                systemPrompt,
                agent
            );


        const formattedHistory =
            Array.isArray(history)
                ? history
                    .filter(
                        item =>
                            item &&
                            typeof item.content ===
                            "string"
                    )
                    .slice(-30)
                    .map(
                        item => ({

                            role:
                                item.role === "user"
                                    ? "user"
                                    : "assistant",

                            content:
                                item.content

                        })
                    )
                : [];


        return [

            {
                role: "system",
                content: systemPrompt
            },

            ...formattedHistory,

            {
                role: "user",
                content:
                    String(
                        userPrompt || ""
                    )
            }

        ];

    }

}


// ==========================================
// TOOLS ORCHESTRATOR
// ==========================================

export class toolorchestrator {

    static getavailabletools(agent){

        if(
            !agent ||
            !Array.isArray(agent.tools)
        ){

            return undefined;

        }


        const normalizedTools =
            agent.tools.map(
                tool =>
                    String(tool)
                        .toLowerCase()
                        .trim()
            );


        const tools = [];


        // ----------------------------------
        // WEB
        // ----------------------------------

        if(
            normalizedTools.includes("web")
        ){

            tools.push({

                type: "function",

                function: {

                    name:
                        "web_search",

                    description:
                        "Pesquisa informações atualizadas na internet.",

                    parameters: {

                        type: "object",

                        properties: {

                            query: {
                                type: "string"
                            }

                        },

                        required: [
                            "query"
                        ]

                    }

                }

            });

        }


        // ----------------------------------
        // ANALYTICS
        // ----------------------------------

        if(
            normalizedTools.includes("analytics")
        ){

            tools.push({

                type: "function",

                function: {

                    name:
                        "get_analytics",

                    description:
                        "Obtém métricas e informações analíticas disponíveis no sistema.",

                    parameters: {

                        type: "object",

                        properties: {

                            metric: {
                                type: "string"
                            }

                        },

                        required: [
                            "metric"
                        ]

                    }

                }

            });

        }


        return tools.length
            ? tools
            : undefined;

    }

}


// ==========================================
// ARTIFACT ENGINE
// ==========================================

export class artifactengine {

    static extract(response = ""){

        if(
            typeof response !== "string" ||
            !response.trim()
        ){

            return [];

        }


        const artifacts = [];


        /*
        --------------------------------------
        CODE FENCES
        --------------------------------------
        */

        const codeRegex =
            /```([a-zA-Z0-9_+-]*)\s*\n([\s\S]*?)```/g;


        let match;


        while(
            (match = codeRegex.exec(response))
            !== null
        ){

            const language =
                String(
                    match[1] || "text"
                )
                .toLowerCase()
                .trim();


            const content =
                match[2] || "";


            if(!content.trim())
                continue;


            const extension =
                this.extensionFromLanguage(
                    language
                );


            artifacts.push({

                id:
                    this.createId(),

                name:
                    `honey-ia-result.${extension}`,

                type:
                    this.mimeFromLanguage(
                        language
                    ),

                mime:
                    this.mimeFromLanguage(
                        language
                    ),

                kind:
                    language === "html"
                        ? "website"
                        : "code",

                language,

                content,

                size:
                    content.length

            });

        }


        return artifacts;

    }


    static extensionFromLanguage(
        language
    ){

        const map = {

            javascript: "js",
            js: "js",

            typescript: "ts",
            ts: "ts",

            python: "py",
            py: "py",

            html: "html",

            css: "css",

            json: "json",

            xml: "xml",

            sql: "sql",

            java: "java",

            cpp: "cpp",

            c: "c",

            php: "php",

            jsx: "jsx",

            tsx: "tsx",

            markdown: "md",
            md: "md"

        };


        return (
            map[language] ||
            "txt"
        );

    }


    static mimeFromLanguage(
        language
    ){

        const map = {

            javascript:
                "text/javascript",

            js:
                "text/javascript",

            typescript:
                "text/typescript",

            ts:
                "text/typescript",

            python:
                "text/x-python",

            py:
                "text/x-python",

            html:
                "text/html",

            css:
                "text/css",

            json:
                "application/json",

            xml:
                "application/xml",

            sql:
                "text/plain",

            java:
                "text/plain",

            cpp:
                "text/plain",

            c:
                "text/plain",

            php:
                "text/plain",

            jsx:
                "text/javascript",

            tsx:
                "text/typescript",

            markdown:
                "text/markdown",

            md:
                "text/markdown"

        };


        return (
            map[language] ||
            "text/plain"
        );

    }


    static createId(){

        return (
            "artifact_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .slice(2, 9)
        );

    }

}


// ==========================================
// ORCHESTRATOR MAIN ENGINE
// ==========================================

export class Orchestrator {

    constructor(
        groqClient = null
    ){

        this.groq =
            groqClient;

    }


    setGroqClient(client){

        this.groq =
            client;

    }


    // ======================================
    // PROCESS REQUEST
    // ======================================

    async processRequest({

        userPrompt,

        agentId = null,

        history = [],

        workspaceContext = {},

        userMemory = [],

        mode = "chat"

    }){

        const start =
            Date.now();


        const selection =
            agentrouter.selectagent(
                userPrompt,
                agentId
            );


        const agent =
            selection.agent;


        try{

            if(!this.groq){

                throw new Error(
                    "Groq SDK não inicializada."
                );

            }


            const messages =
                promptfactory
                    .buildmessagespayload({

                        agent,

                        userPrompt,

                        history,

                        workspaceContext,

                        userMemory,

                        mode

                    });


            const tools =
                toolorchestrator
                    .getavailabletools(
                        agent
                    );


            const payload = {

                model:
                    agent.model ||
                    "llama-3.3-70b-versatile",

                messages,

                temperature:
                    agent.temperature ??
                    0.5,

                max_tokens:
                    agent.maxTokens ||
                    4096

            };


            if(tools){

                payload.tools =
                    tools;

            }


            const completion =
                await this.groq
                    .chat
                    .completions
                    .create(
                        payload
                    );


            let response =
                completion
                    ?.choices?.[0]
                    ?.message
                    ?.content
                || "Sem resposta gerada.";


            if(
                typeof agent.after ===
                "function"
            ){

                response =
                    agent.after(
                        response
                    );

            }


            const artifacts =
                artifactengine.extract(
                    response
                );


            return {

                success: true,

                agent: {

                    id:
                        agent.id,

                    name:
                        agent.name,

                    emoji:
                        agent.emoji ||
                        "🤖"

                },

                routing: {

                    score:
                        selection.score,

                    reason:
                        selection.reason

                },

                response,

                artifacts,

                usage:
                    completion.usage ||
                    null,

                latency:
                    Date.now() -
                    start

            };

        }

        catch(error){

            console.error(
                "[Orchestrator Error]",
                error
            );


            return {

                success: false,

                agent: {

                    id:
                        agent?.id ||
                        "general",

                    name:
                        agent?.name ||
                        "Honey IA",

                    emoji:
                        agent?.emoji ||
                        "🤖"

                },

                routing: {

                    score:
                        selection.score,

                    reason:
                        selection.reason

                },

                response: "",

                artifacts: [],

                error:
                    error.message ||
                    "Erro ao processar pedido.",

                latency:
                    Date.now() -
                    start

            };

        }

    }


    // ======================================
    // STREAM PROCESSING
    // ======================================

    async processStream({

        userPrompt,

        agentId = null,

        history = [],

        workspaceContext = {},

        userMemory = [],

        mode = "live",

        onChunk,

        onComplete,

        onError

    }){

        const start =
            Date.now();


        const selection =
            agentrouter.selectagent(
                userPrompt,
                agentId
            );


        const agent =
            selection.agent;


        try{

            if(!this.groq){

                throw new Error(
                    "Groq SDK não inicializada."
                );

            }


            const messages =
                promptfactory
                    .buildmessagespayload({

                        agent,

                        userPrompt,

                        history,

                        workspaceContext,

                        userMemory,

                        mode

                    });


            const stream =
                await this.groq
                    .chat
                    .completions
                    .create({

                        model:
                            agent.model ||
                            "llama-3.3-70b-versatile",

                        messages,

                        temperature:
                            agent.temperature ??
                            0.5,

                        max_tokens:
                            agent.maxTokens ||
                            4096,

                        stream: true

                    });


            let completeResponse = "";


            for await(
                const chunk
                of stream
            ){

                const text =
                    chunk
                        ?.choices?.[0]
                        ?.delta
                        ?.content
                    || "";


                if(!text)
                    continue;


                completeResponse +=
                    text;


                if(
                    typeof onChunk ===
                    "function"
                ){

                    onChunk(text);

                }

            }


            let finalResponse =
                completeResponse;


            if(
                typeof agent.after ===
                "function"
            ){

                finalResponse =
                    agent.after(
                        completeResponse
                    );

            }


            const artifacts =
                artifactengine.extract(
                    finalResponse
                );


            const result = {

                success: true,

                agent: {

                    id:
                        agent.id,

                    name:
                        agent.name,

                    emoji:
                        agent.emoji ||
                        "🤖"

                },

                routing: {

                    score:
                        selection.score,

                    reason:
                        selection.reason

                },

                response:
                    finalResponse,

                artifacts,

                latency:
                    Date.now() -
                    start

            };


            if(
                typeof onComplete ===
                "function"
            ){

                onComplete(
                    result
                );

            }


            return result;

        }

        catch(error){

            console.error(
                "[Orchestrator Stream Error]",
                error
            );


            if(
                typeof onError ===
                "function"
            ){

                onError(error);

            }


            throw error;

        }

    }


    // ======================================
    // TELEMETRY
    // ======================================

    getTelemetry(){

        return {

            status:
                "online",

            engine:
                "Honey IA Orchestrator V6",

            agents:
                Object.keys(
                    agents_registry
                ).length,

            groq:
                Boolean(this.groq),

            timestamp:
                Date.now()

        };

    }

}


// ==========================================
// CREATE INSTANCE
// ==========================================

const orchestratorinstance =
    new Orchestrator();


export {

    agents_registry

};


export default orchestratorinstance;
