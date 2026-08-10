/*
==========================================
HONEY IA OS
ORCHESTRATOR ENGINE V8.0
FULL MULTI-AGENT + TOOL ENGINE
30 SPECIALIST AGENTS
Agent Routing
Prompt Factory
Groq AI
Real Tool Calling
Multi-Round Tool Execution
Artifacts
Live Streaming
Enterprise Workspace Integration
Production Hardened
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

Object.entries(
    agents_registry
).forEach(
    ([key, agent]) => {

        if(!agent){

            return;

        }


        if(!agent.id){

            agent.id =
                key;

        }


        if(!agent.name){

            agent.name =
                `Agente ${key}`;

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

            agent.category =
                "Tecnologia";

        }


        if(!agent.level){

            agent.level =
                "Professional";

        }


        if(!agent.description){

            agent.description =
                "Especialista Honey IA.";

        }

    }
);


// ==========================================
// AGENT ROUTER
// ==========================================

export class agentrouter {

    static selectagent(
        usermessage = "",
        forcedagentid = null
    ){

        const normalizedforcedid =
            forcedagentid
                ? String(
                    forcedagentid
                )
                    .toLowerCase()
                    .trim()
                : null;


        // ----------------------------------
        // FORCE AGENT
        // ----------------------------------

        if(
            normalizedforcedid &&
            agents_registry[
                normalizedforcedid
            ]
        ){

            return {

                agent:
                    agents_registry[
                        normalizedforcedid
                    ],

                score:
                    1,

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

                agent:
                    generalagent,

                score:
                    1,

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


        let bestScore =
            0;


        // ----------------------------------
        // ANALYZE AGENTS
        // ----------------------------------

        for(
            const [id, agent]
            of Object.entries(
                agents_registry
            )
        ){

            if(!agent){

                continue;

            }


            let score =
                0;


            // ------------------------------
            // CUSTOM CAN HANDLE
            // ------------------------------

            if(
                typeof agent.canHandle ===
                "function"
            ){

                try{

                    const result =
                        agent.canHandle(
                            text
                        );


                    if(
                        result === true
                    ){

                        score +=
                            0.8;

                    }

                    else if(
                        typeof result ===
                        "number"
                    ){

                        score +=
                            Math.max(
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
                Array.isArray(
                    agent.keywords
                ) &&
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


                            const normalizedKeyword =
                                keyword
                                    .toLowerCase()
                                    .trim();


                            if(
                                !normalizedKeyword
                            ){

                                return false;

                            }


                            return text.includes(
                                normalizedKeyword
                            );

                        }
                    );


                if(matches.length){

                    score +=
                        Math.min(
                            0.6,
                            matches.length *
                            0.2
                        );

                }

            }


            // ------------------------------
            // NAME MATCH
            // ------------------------------

            if(
                agent.name &&
                text.includes(
                    String(
                        agent.name
                    ).toLowerCase()
                )
            ){

                score +=
                    0.15;

            }


            // ------------------------------
            // CATEGORY MATCH
            // ------------------------------

            if(
                agent.category &&
                text.includes(
                    String(
                        agent.category
                    ).toLowerCase()
                )
            ){

                score +=
                    0.1;

            }


            // ------------------------------
            // DESCRIPTION MATCH
            // ------------------------------

            if(agent.description){

                const descriptionWords =
                    String(
                        agent.description
                    )
                        .toLowerCase()
                        .split(/\s+/)
                        .filter(
                            word =>
                                word.length >= 5
                        );


                const descriptionMatches =
                    descriptionWords.filter(
                        word =>
                            text.includes(
                                word
                            )
                    );


                if(
                    descriptionMatches.length
                ){

                    score +=
                        Math.min(
                            0.2,
                            descriptionMatches.length *
                            0.04
                        );

                }

            }


            // ------------------------------
            // BEST AGENT
            // ------------------------------

            if(
                score >
                bestScore
            ){

                bestScore =
                    score;

                selected =
                    agent;

            }

        }


        // ----------------------------------
        // LOW CONFIDENCE
        // ----------------------------------

        if(
            bestScore < 0.3
        ){

            return {

                agent:
                    generalagent,

                score:
                    0,

                reason:
                    "low_confidence"

            };

        }


        return {

            agent:
                selected,

            score:
                Number(
                    bestScore.toFixed(
                        2
                    )
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

    static extractsystemprompt(
        agent
    ){

        if(!agent){

            return `
Você é a Honey IA,
uma inteligência artificial profissional.

Responda de forma clara,
segura, útil e profissional.
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
            !Array.isArray(workspaceContext) &&
            Object.keys(
                workspaceContext
            ).length
        ){

            finalPrompt += `

=== CONTEXTO DO WORKSPACE ===
`;

            if(
                workspaceContext.projectName
            ){

                finalPrompt += `
Projeto:
${workspaceContext.projectName}
`;

            }


            if(
                workspaceContext.activeFile
            ){

                finalPrompt += `
Ficheiro ativo:
${workspaceContext.activeFile}
`;

            }


            if(
                workspaceContext.language
            ){

                finalPrompt += `
Tecnologia:
${workspaceContext.language}
`;

            }


            if(
                workspaceContext.content
            ){

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
                .slice(
                    0,
                    20
                )
                .forEach(
                    (
                        memory,
                        index
                    ) => {

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

        if(
            mode === "live"
        ){

            return prompt + `

=== MODO LIVE ===

- Responda naturalmente.
- Seja direto.
- Use frases claras.
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
- Quando criar código, entregue código completo.
- Não invente resultados de ferramentas.
- Quando uma ferramenta estiver disponível e for necessária,
  utilize-a antes de responder.
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
            Array.isArray(
                agent?.outputTypes
            )
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

=== FERRAMENTAS ===

Quando uma ferramenta estiver disponível:

1. Avalie se ela é necessária.
2. Utilize-a quando a tarefa exigir informação externa,
   processamento ou operação suportada.
3. Não diga que executou uma ferramenta se ela não foi realmente executada.
4. Use o resultado recebido da ferramenta para construir a resposta.
5. Se uma ferramenta falhar, informe a limitação de forma transparente.
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
            Array.isArray(
                history
            )
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

                role:
                    "system",

                content:
                    systemPrompt

            },

            ...formattedHistory,

            {

                role:
                    "user",

                content:
                    String(
                        userPrompt || ""
                    )

            }

        ];

    }

}


// ==========================================
// TOOL ENGINE
// ==========================================

export class toolorchestrator {

    // ======================================
    // NORMALIZE TOOL IDS
    // ======================================

    static normalizeAgentTools(
        agent
    ){

        if(
            !agent ||
            !Array.isArray(
                agent.tools
            )
        ){

            return [];

        }


        return agent.tools
            .map(
                tool =>
                    String(
                        tool
                    )
                        .toLowerCase()
                        .trim()
            )
            .filter(
                Boolean
            );

    }


    // ======================================
    // TOOL DEFINITIONS
    // ======================================

    static getavailabletools(
        agent
    ){

        if(!agent){

            return undefined;

        }


        const normalizedTools =
            this.normalizeAgentTools(
                agent
            );


        const tools = [];


        // ----------------------------------
        // WEB SEARCH
        // ----------------------------------

        if(
            normalizedTools.includes(
                "web"
            )
        ){

            tools.push({

                type:
                    "function",

                function: {

                    name:
                        "web_search",

                    description:
                        "Pesquisa informações atualizadas na internet. Use quando a resposta depender de informação externa ou atualizada.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            query: {

                                type:
                                    "string",

                                description:
                                    "Consulta de pesquisa."

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
            normalizedTools.includes(
                "analytics"
            )
        ){

            tools.push({

                type:
                    "function",

                function: {

                    name:
                        "get_analytics",

                    description:
                        "Obtém métricas disponíveis no contexto do workspace Honey IA.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            metric: {

                                type:
                                    "string",

                                description:
                                    "Nome da métrica pretendida."

                            }

                        },

                        required: [
                            "metric"
                        ]

                    }

                }

            });

        }


        // ----------------------------------
        // CREATE TEXT ARTIFACT
        // ----------------------------------

        if(
            normalizedTools.includes(
                "document"
            ) ||
            normalizedTools.includes(
                "writer"
            ) ||
            normalizedTools.includes(
                "file"
            )
        ){

            tools.push({

                type:
                    "function",

                function: {

                    name:
                        "create_text_artifact",

                    description:
                        "Cria um ficheiro de texto estruturado como artifact da Honey IA.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            filename: {

                                type:
                                    "string"

                            },

                            content: {

                                type:
                                    "string"

                            },

                            language: {

                                type:
                                    "string"

                            }

                        },

                        required: [
                            "filename",
                            "content"
                        ]

                    }

                }

            });

        }


        // ----------------------------------
        // CREATE JSON ARTIFACT
        // ----------------------------------

        if(
            normalizedTools.includes(
                "json"
            ) ||
            normalizedTools.includes(
                "developer"
            ) ||
            normalizedTools.includes(
                "automation"
            )
        ){

            tools.push({

                type:
                    "function",

                function: {

                    name:
                        "create_json_artifact",

                    description:
                        "Cria um ficheiro JSON válido como artifact da Honey IA.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            filename: {

                                type:
                                    "string"

                            },

                            data: {

                                type:
                                    "object"

                            }

                        },

                        required: [
                            "filename",
                            "data"
                        ]

                    }

                }

            });

        }


        // ----------------------------------
        // CALCULATOR
        // ----------------------------------

        if(
            normalizedTools.includes(
                "calculator"
            ) ||
            normalizedTools.includes(
                "analytics"
            ) ||
            normalizedTools.includes(
                "finance"
            ) ||
            normalizedTools.includes(
                "accounting"
            )
        ){

            tools.push({

                type:
                    "function",

                function: {

                    name:
                        "calculate",

                    description:
                        "Executa cálculos matemáticos simples e seguros.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            expression: {

                                type:
                                    "string",

                                description:
                                    "Expressão matemática a calcular."

                            }

                        },

                        required: [
                            "expression"
                        ]

                    }

                }

            });

        }


        return tools.length
            ? tools
            : undefined;

    }


    // ======================================
    // TOOL PERMISSION
    // ======================================

    static agentCanUseTool(
        agent,
        toolName
    ){

        if(
            !agent ||
            !toolName
        ){

            return false;

        }


        const tools =
            this.normalizeAgentTools(
                agent
            );


        const permissions = {

            web_search: [
                "web"
            ],

            get_analytics: [
                "analytics"
            ],

            create_text_artifact: [
                "document",
                "writer",
                "file"
            ],

            create_json_artifact: [
                "json",
                "developer",
                "automation"
            ],

            calculate: [
                "calculator",
                "analytics",
                "finance",
                "accounting"
            ]

        };


        const allowedTools =
            permissions[
                String(
                    toolName
                )
                    .toLowerCase()
                    .trim()
            ];


        if(
            !Array.isArray(
                allowedTools
            )
        ){

            return false;

        }


        return allowedTools.some(
            permission =>
                tools.includes(
                    permission
                )
        );

    }


    // ======================================
    // WEB SEARCH
    // ======================================

    static async webSearch(
        query
    ){

        const normalizedQuery =
            String(
                query || ""
            )
                .trim();


        if(
            !normalizedQuery
        ){

            throw new Error(
                "Consulta de pesquisa vazia."
            );

        }


        const apiKey =
            process.env.WEB_SEARCH_API_KEY;


        const endpoint =
            process.env.WEB_SEARCH_API_URL;


        if(
            !endpoint ||
            !apiKey
        ){

            return {

                success:
                    false,

                available:
                    false,

                query:
                    normalizedQuery,

                message:
                    "A ferramenta de pesquisa web ainda não está configurada no servidor."

            };

        }


        const controller =
            new AbortController();


        const timeout =
            setTimeout(
                () =>
                    controller.abort(),
                30000
            );


        try{

            const response =
                await fetch(

                    endpoint,

                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${apiKey}`

                        },

                        body:
                            JSON.stringify({

                                query:
                                    normalizedQuery

                            }),

                        signal:
                            controller.signal

                    }

                );


            if(
                !response.ok
            ){

                throw new Error(
                    `Pesquisa web falhou com HTTP ${response.status}.`
                );

            }


            const data =
                await response.json();


            return {

                success:
                    true,

                available:
                    true,

                query:
                    normalizedQuery,

                results:
                    data?.results ||
                    data?.data ||
                    data

            };

        }

        catch(error){

            if(
                error?.name ===
                "AbortError"
            ){

                throw new Error(
                    "A pesquisa web excedeu o tempo limite."
                );

            }


            throw error;

        }

        finally{

            clearTimeout(
                timeout
            );

        }

    }


    // ======================================
    // ANALYTICS
    // ======================================

    static async getAnalytics(
        metric,
        context = {}
    ){

        const normalizedMetric =
            String(
                metric || ""
            )
                .trim();


        if(
            !normalizedMetric
        ){

            throw new Error(
                "Métrica não especificada."
            );

        }


        const analytics =
            context?.analytics;


        if(
            analytics &&
            typeof analytics === "object"
        ){

            if(
                Object.prototype.hasOwnProperty.call(
                    analytics,
                    normalizedMetric
                )
            ){

                return {

                    success:
                        true,

                    metric:
                        normalizedMetric,

                    value:
                        analytics[
                            normalizedMetric
                        ]

                };

            }


            return {

                success:
                    true,

                metric:
                    normalizedMetric,

                value:
                    null,

                availableMetrics:
                    Object.keys(
                        analytics
                    )

            };

        }


        return {

            success:
                false,

            metric:
                normalizedMetric,

            value:
                null,

            message:
                "Não existem dados analíticos disponíveis no contexto atual."

        };

    }


    // ======================================
    // TEXT ARTIFACT
    // ======================================

    static async createTextArtifact(
        args
    ){

        const filename =
            String(
                args?.filename ||
                "honey-ia-result.txt"
            )
                .trim()
                .slice(
                    0,
                    200
                );


        const content =
            String(
                args?.content ||
                ""
            );


        if(
            !content.trim()
        ){

            throw new Error(
                "O conteúdo do artifact está vazio."
            );

        }


        return {

            success:
                true,

            artifact: {

                id:
                    artifactengine.createId(),

                name:
                    filename,

                type:
                    "text/plain",

                mime:
                    "text/plain",

                kind:
                    "document",

                language:
                    args?.language ||
                    "text",

                content,

                size:
                    content.length

            }

        };

    }


    // ======================================
    // JSON ARTIFACT
    // ======================================

    static async createJsonArtifact(
        args
    ){

        const filename =
            String(
                args?.filename ||
                "honey-ia-result.json"
            )
                .trim()
                .slice(
                    0,
                    200
                );


        if(
            !args ||
            typeof args.data !== "object" ||
            args.data === null ||
            Array.isArray(args.data)
        ){

            throw new Error(
                "Os dados JSON são inválidos."
            );

        }


        const content =
            JSON.stringify(
                args.data,
                null,
                2
            );


        return {

            success:
                true,

            artifact: {

                id:
                    artifactengine.createId(),

                name:
                    filename.endsWith(
                        ".json"
                    )
                        ? filename
                        : `${filename}.json`,

                type:
                    "application/json",

                mime:
                    "application/json",

                kind:
                    "code",

                language:
                    "json",

                content,

                size:
                    content.length

            }

        };

    }


    // ======================================
    // SAFE CALCULATOR
    // ======================================

    static async calculate(
        expression
    ){

        const value =
            String(
                expression || ""
            )
                .trim();


        if(
            !value
        ){

            throw new Error(
                "Expressão matemática vazia."
            );

        }


        if(
            !/^[0-9+\-*/%().,\s]+$/.test(
                value
            )
        ){

            throw new Error(
                "A expressão contém caracteres não permitidos."
            );

        }


        const normalized =
            value.replace(
                /,/g,
                "."
            );


        let result;


        try{

            result =
                Function(
                    `"use strict"; return (${normalized})`
                )();

        }

        catch(error){

            throw new Error(
                "Não foi possível calcular a expressão."
            );

        }


        if(
            typeof result !== "number" ||
            !Number.isFinite(result)
        ){

            throw new Error(
                "O resultado matemático não é válido."
            );

        }


        return {

            success:
                true,

            expression:
                value,

            result

        };

    }


    // ======================================
    // EXECUTE TOOL
    // ======================================

    static async executeTool(
        name,
        args = {},
        context = {}
    ){

        switch(
            name
        ){

            case "web_search":

                return this.webSearch(
                    args.query
                );


            case "get_analytics":

                return this.getAnalytics(
                    args.metric,
                    context.workspaceContext ||
                    {}
                );


            case "create_text_artifact":

                return this.createTextArtifact(
                    args
                );


            case "create_json_artifact":

                return this.createJsonArtifact(
                    args
                );


            case "calculate":

                return this.calculate(
                    args.expression
                );


            default:

                throw new Error(
                    `Ferramenta desconhecida: ${name}`
                );

        }

    }

}


// ==========================================
// ARTIFACT ENGINE
// ==========================================

export class artifactengine {

    static extract(
        response = ""
    ){

        if(
            typeof response !== "string" ||
            !response.trim()
        ){

            return [];

        }


        const artifacts = [];


        const codeRegex =
            /```([a-zA-Z0-9_+-]*)\s*\n([\s\S]*?)```/g;


        let match;


        while(
            (
                match =
                    codeRegex.exec(
                        response
                    )
            ) !== null
        ){

            const language =
                String(
                    match[1] ||
                    "text"
                )
                    .toLowerCase()
                    .trim();


            const content =
                match[2] ||
                "";


            if(
                !content.trim()
            ){

                continue;

            }


            const extension =
                this.extensionFromLanguage(
                    language
                );


            const mime =
                this.mimeFromLanguage(
                    language
                );


            artifacts.push({

                id:
                    this.createId(),

                name:
                    `honey-ia-result.${extension}`,

                type:
                    mime,

                mime,

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

            javascript:
                "js",

            js:
                "js",

            typescript:
                "ts",

            ts:
                "ts",

            python:
                "py",

            py:
                "py",

            html:
                "html",

            css:
                "css",

            json:
                "json",

            xml:
                "xml",

            sql:
                "sql",

            java:
                "java",

            cpp:
                "cpp",

            c:
                "c",

            php:
                "php",

            jsx:
                "jsx",

            tsx:
                "tsx",

            markdown:
                "md",

            md:
                "md"

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
                .slice(
                    2,
                    9
                )
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


        this.maxToolRounds =
            5;

    }


    setGroqClient(
        client
    ){

        this.groq =
            client;

    }


    // ======================================
    // BUILD PAYLOAD
    // ======================================

    buildPayload({

        agent,

        messages,

        tools,

        stream = false

    }){

        const payload = {

            model:
                agent?.model ||
                "llama-3.3-70b-versatile",

            messages,

            temperature:
                agent?.temperature ??
                0.5,

            max_tokens:
                agent?.maxTokens ||
                4096

        };


        if(
            Array.isArray(tools) &&
            tools.length
        ){

            payload.tools =
                tools;

            payload.tool_choice =
                "auto";

        }


        if(stream){

            payload.stream =
                true;

        }


        return payload;

    }


    // ======================================
    // EXECUTE TOOL CALLS
    // ======================================

    async executeToolCalls(
        toolCalls,
        agent,
        context
    ){

        const results = [];


        if(
            !Array.isArray(toolCalls) ||
            !toolCalls.length
        ){

            return results;

        }


        for(
            const toolCall
            of toolCalls
        ){

            const functionData =
                toolCall?.function;


            const name =
                functionData?.name;


            if(!name){

                continue;

            }


            let args = {};


            try{

                if(
                    functionData?.arguments
                ){

                    args =
                        typeof functionData.arguments ===
                        "string"
                            ? JSON.parse(
                                functionData.arguments
                            )
                            : functionData.arguments;

                }

            }

            catch(error){

                results.push({

                    toolCallId:
                        toolCall.id,

                    name,

                    success:
                        false,

                    error:
                        "Argumentos da ferramenta inválidos."

                });

                continue;

            }


            if(
                !toolorchestrator.agentCanUseTool(
                    agent,
                    name
                )
            ){

                results.push({

                    toolCallId:
                        toolCall.id,

                    name,

                    success:
                        false,

                    error:
                        "O agente não possui autorização para utilizar esta ferramenta."

                });

                continue;

            }


            try{

                const result =
                    await toolorchestrator
                        .executeTool(
                            name,
                            args,
                            context
                        );


                results.push({

                    toolCallId:
                        toolCall.id,

                    name,

                    success:
                        true,

                    result

                });

            }

            catch(error){

                console.error(
                    `[Tool Error] ${name}`,
                    error
                );


                results.push({

                    toolCallId:
                        toolCall.id,

                    name,

                    success:
                        false,

                    error:
                        error?.message ||
                        "Erro ao executar ferramenta."

                });

            }

        }


        return results;

    }


    // ======================================
    // APPEND TOOL RESULTS
    // ======================================

    appendToolResults(
        messages,
        toolResults
    ){

        if(
            !Array.isArray(
                messages
            ) ||
            !Array.isArray(
                toolResults
            )
        ){

            return;

        }


        for(
            const item
            of toolResults
        ){

            messages.push({

                role:
                    "tool",

                tool_call_id:
                    item.toolCallId,

                content:
                    JSON.stringify(

                        item.success
                            ? item.result
                            : {

                                success:
                                    false,

                                error:
                                    item.error

                            }

                    )

            });

        }

    }


    // ======================================
    // BUILD TOOL TELEMETRY
    // ======================================

    normalizeToolTelemetry(
        toolResults
    ){

        if(
            !Array.isArray(
                toolResults
            )
        ){

            return [];

        }


        return toolResults.map(
            item => ({

                name:
                    item.name,

                success:
                    item.success

            })
        );

    }


    // ======================================
    // EXTRACT GENERATED ARTIFACTS
    // ======================================

    extractGeneratedArtifacts(
        toolResults
    ){

        if(
            !Array.isArray(
                toolResults
            )
        ){

            return [];

        }


        return toolResults
            .filter(
                item =>
                    item?.success &&
                    item?.result?.artifact
            )
            .map(
                item =>
                    item.result.artifact
            );

    }


    // ======================================
    // REQUEST WITH TOOL LOOP
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


            const toolContext = {

                agent,

                workspaceContext,

                userMemory

            };


            let finalResponse =
                "";


            let finalCompletion =
                null;


            let executedTools =
                [];


            let generatedArtifacts =
                [];


            // ==================================
            // TOOL LOOP
            // ==================================

            for(
                let round = 0;
                round < this.maxToolRounds;
                round++
            ){

                const payload =
                    this.buildPayload({

                        agent,

                        messages,

                        tools,

                        stream:
                            false

                    });


                const completion =
                    await this.groq
                        .chat
                        .completions
                        .create(
                            payload
                        );


                finalCompletion =
                    completion;


                const message =
                    completion
                        ?.choices?.[0]
                        ?.message;


                if(!message){

                    throw new Error(
                        "O Groq não devolveu uma mensagem válida."
                    );

                }


                const toolCalls =
                    Array.isArray(
                        message.tool_calls
                    )
                        ? message.tool_calls
                        : [];


                // ------------------------------
                // FINAL RESPONSE
                // ------------------------------

                if(
                    !toolCalls.length
                ){

                    finalResponse =
                        typeof message.content ===
                        "string"
                            ? message.content
                            : "";

                    break;

                }


                // ------------------------------
                // ASSISTANT TOOL MESSAGE
                // ------------------------------

                messages.push({

                    role:
                        "assistant",

                    content:
                        message.content ||
                        null,

                    tool_calls:
                        toolCalls

                });


                // ------------------------------
                // EXECUTE TOOLS
                // ------------------------------

                const toolResults =
                    await this.executeToolCalls(
                        toolCalls,
                        agent,
                        toolContext
                    );


                executedTools.push(
                    ...this.normalizeToolTelemetry(
                        toolResults
                    )
                );


                generatedArtifacts.push(
                    ...this.extractGeneratedArtifacts(
                        toolResults
                    )
                );


                // ------------------------------
                // RETURN RESULTS TO GROQ
                // ------------------------------

                this.appendToolResults(
                    messages,
                    toolResults
                );

            }


            if(
                !finalResponse ||
                !finalResponse.trim()
            ){

                finalResponse =
                    "Não foi possível concluir a resposta.";

            }


            // ==================================
            // AGENT POST PROCESSOR
            // ==================================

            if(
                typeof agent.after ===
                "function"
            ){

                finalResponse =
                    agent.after(
                        finalResponse
                    );

            }


            // ==================================
            // ARTIFACTS
            // ==================================

            const extractedArtifacts =
                artifactengine.extract(
                    finalResponse
                );


            const artifacts = [

                ...generatedArtifacts,

                ...extractedArtifacts

            ];


            return {

                success:
                    true,

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

                tools:
                    executedTools,

                usage:
                    finalCompletion?.usage ||
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

                success:
                    false,

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

                response:
                    "",

                artifacts:
                    [],

                tools:
                    [],

                usage:
                    null,

                error:
                    error?.message ||
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


            const tools =
                toolorchestrator
                    .getavailabletools(
                        agent
                    );


            const toolContext = {

                agent,

                workspaceContext,

                userMemory

            };


            let executedTools =
                [];


            let generatedArtifacts =
                [];


            let finalResponse =
                "";


            let lastUsage =
                null;


            // ==================================
            // LIVE TOOL LOOP
            // ==================================

            for(
                let round = 0;
                round < this.maxToolRounds;
                round++
            ){

                /*
                ------------------------------------------------
                PRIMEIRA FASE

                Fazemos uma chamada não-stream para descobrir
                se o modelo pretende utilizar uma ferramenta.

                Isto evita iniciar streaming antes de sabermos
                se existe tool call.
                ------------------------------------------------
                */

                const completion =
                    await this.groq
                        .chat
                        .completions
                        .create(

                            this.buildPayload({

                                agent,

                                messages,

                                tools,

                                stream:
                                    false

                            })

                        );


                lastUsage =
                    completion?.usage ||
                    lastUsage;


                const message =
                    completion
                        ?.choices?.[0]
                        ?.message;


                if(!message){

                    throw new Error(
                        "O Groq não devolveu uma mensagem válida."
                    );

                }


                const toolCalls =
                    Array.isArray(
                        message.tool_calls
                    )
                        ? message.tool_calls
                        : [];


                /*
                ------------------------------------------------
                NÃO EXISTEM TOOLS

                Aqui está a correção principal da versão anterior.

                Não fazemos uma segunda chamada independente.

                A resposta obtida acima já é a resposta final.

                Para manter streaming visual, fazemos uma chamada
                de streaming somente quando o modelo não solicitou
                tools e ainda não temos uma resposta final utilizável.
                ------------------------------------------------
                */

                if(
                    !toolCalls.length
                ){

                    finalResponse =
                        typeof message.content ===
                        "string"
                            ? message.content
                            : "";


                    /*
                    Se a primeira resposta já contém conteúdo,
                    enviamos esse conteúdo como um chunk único.

                    Assim evitamos executar duas gerações diferentes
                    do modelo para a mesma pergunta.
                    */

                    if(
                        finalResponse &&
                        typeof onChunk ===
                        "function"
                    ){

                        onChunk(
                            finalResponse
                        );

                    }


                    break;

                }


                /*
                ------------------------------------------------
                EXISTEM TOOL CALLS
                ------------------------------------------------
                */

                messages.push({

                    role:
                        "assistant",

                    content:
                        message.content ||
                        null,

                    tool_calls:
                        toolCalls

                });


                const toolResults =
                    await this.executeToolCalls(
                        toolCalls,
                        agent,
                        toolContext
                    );


                executedTools.push(
                    ...this.normalizeToolTelemetry(
                        toolResults
                    )
                );


                generatedArtifacts.push(
                    ...this.extractGeneratedArtifacts(
                        toolResults
                    )
                );


                this.appendToolResults(
                    messages,
                    toolResults
                );

            }


            /*
            ==================================================
            FINAL RESPONSE VALIDATION
            ==================================================
            */

            if(
                !finalResponse ||
                !finalResponse.trim()
            ){

                finalResponse =
                    "Não foi possível concluir a resposta.";

            }


            /*
            ==================================================
            AGENT POST PROCESSOR
            ==================================================
            */

            if(
                typeof agent.after ===
                "function"
            ){

                finalResponse =
                    agent.after(
                        finalResponse
                    );

            }


            /*
            ==================================================
            ARTIFACTS
            ==================================================
            */

            const extractedArtifacts =
                artifactengine.extract(
                    finalResponse
                );


            const artifacts = [

                ...generatedArtifacts,

                ...extractedArtifacts

            ];


            /*
            ==================================================
            RESULT
            ==================================================
            */

            const result = {

                success:
                    true,

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

                tools:
                    executedTools,

                usage:
                    lastUsage,

                latency:
                    Date.now() -
                    start

            };


            if(
                typeof onComplete ===
                "function"
            ){

                await onComplete(
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

                await onError(
                    error
                );

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
                "Honey IA Orchestrator V8",

            agents:
                Object.keys(
                    agents_registry
                ).length,

            tools: [

                "web_search",

                "get_analytics",

                "create_text_artifact",

                "create_json_artifact",

                "calculate"

            ],

            groq:
                Boolean(
                    this.groq
                ),

            toolCalling:
                true,

            maxToolRounds:
                this.maxToolRounds,

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


// ==========================================
// EXPORTS
// ==========================================

export {

    agents_registry

};


export default orchestratorinstance;
