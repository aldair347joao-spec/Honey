/*
==========================================
HONEY IA OS
ORCHESTRATOR ENGINE
PRODUCTION V9.0
==========================================

FULL MULTI-AGENT ENGINE
30 SPECIALIST AGENTS
SMART AGENT ROUTING
FORCED AGENT SELECTION
PROMPT FACTORY
GROQ AI
REAL TOOL CALLING
MULTI-ROUND TOOL EXECUTION
ARTIFACT ENGINE
LIVE STREAMING
WORKSPACE CONTEXT
USER MEMORY
TELEMETRY
PRODUCTION ERROR HANDLING
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
// CONSTANTS
// ==========================================

const DEFAULT_AGENT_ID =
    "general";

const DEFAULT_MODEL =
    "llama-3.3-70b-versatile";

const DEFAULT_TEMPERATURE =
    0.5;

const DEFAULT_MAX_TOKENS =
    4096;

const DEFAULT_MAX_TOOL_ROUNDS =
    5;

const MAX_MESSAGE_LENGTH =
    100000;

const MAX_ARTIFACTS =
    50;

const MAX_TOOL_RESULTS =
    50;


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


        if(!Array.isArray(agent.keywords)){

            agent.keywords = [];

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
                "Especialista profissional Honey IA.";

        }

    }
);


// ==========================================
// SAFE STRING
// ==========================================

function safeString(
    value,
    maxLength = MAX_MESSAGE_LENGTH
){

    if(
        value === null ||
        value === undefined
    ){

        return "";

    }


    return String(
        value
    )
        .trim()
        .slice(
            0,
            maxLength
        );

}


// ==========================================
// AGENT ROUTER
// ==========================================

export class agentrouter {

    static normalizeAgentId(
        agentId
    ){

        if(
            typeof agentId !==
            "string"
        ){

            return null;

        }


        const normalized =
            agentId
                .toLowerCase()
                .trim()
                .slice(
                    0,
                    150
                );


        return normalized ||
            null;

    }


    static selectagent(
        usermessage = "",
        forcedagentid = null
    ){

        const normalizedForcedId =
            this.normalizeAgentId(
                forcedagentid
            );


        // ==================================
        // EXPLICIT AGENT
        // ==================================

        if(
            normalizedForcedId &&
            normalizedForcedId !==
                DEFAULT_AGENT_ID &&
            agents_registry[
                normalizedForcedId
            ]
        ){

            return {

                agent:
                    agents_registry[
                        normalizedForcedId
                    ],

                score:
                    1,

                confidence:
                    1,

                reason:
                    "forced_by_user",

                forced:
                    true

            };

        }


        /*
        --------------------------------------------------
        IMPORTANT

        "general" is treated as the default/fallback agent.

        It does NOT count as an explicit specialist choice.

        This allows automatic routing to work correctly when
        the frontend sends agentId = "general".
        --------------------------------------------------
        */


        if(
            normalizedForcedId &&
            normalizedForcedId !==
                DEFAULT_AGENT_ID &&
            !agents_registry[
                normalizedForcedId
            ]
        ){

            return {

                agent:
                    generalagent,

                score:
                    0,

                confidence:
                    0,

                reason:
                    "invalid_agent_fallback",

                forced:
                    false

            };

        }


        // ==================================
        // DEFAULT
        // ==================================

        const text =
            safeString(
                usermessage
            )
                .toLowerCase();


        if(!text){

            return {

                agent:
                    generalagent,

                score:
                    0,

                confidence:
                    0,

                reason:
                    "default_general",

                forced:
                    false

            };

        }


        let selected =
            generalagent;

        let bestScore =
            0;


        // ==================================
        // ANALYZE SPECIALIST AGENTS
        // ==================================

        for(
            const [id, agent]
            of Object.entries(
                agents_registry
            )
        ){

            if(
                !agent ||
                id === DEFAULT_AGENT_ID
            ){

                continue;

            }


            let score =
                0;


            // --------------------------------
            // CAN HANDLE
            // --------------------------------

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
                        "number" &&
                        Number.isFinite(result)
                    ){

                        score +=
                            Math.max(
                                0,
                                Math.min(
                                    result,
                                    1
                                )
                            );

                    }

                }

                catch(error){

                    console.warn(
                        `[Router] canHandle error (${id}):`,
                        error?.message
                    );

                }

            }


            // --------------------------------
            // KEYWORDS
            // --------------------------------

            if(
                Array.isArray(
                    agent.keywords
                )
            ){

                let keywordMatches =
                    0;


                for(
                    const keyword
                    of agent.keywords
                ){

                    if(
                        typeof keyword !==
                        "string"
                    ){

                        continue;

                    }


                    const normalizedKeyword =
                        keyword
                            .toLowerCase()
                            .trim();


                    if(
                        normalizedKeyword &&
                        text.includes(
                            normalizedKeyword
                        )
                    ){

                        keywordMatches++;

                    }

                }


                if(keywordMatches){

                    score +=
                        Math.min(
                            0.6,
                            keywordMatches *
                            0.2
                        );

                }

            }


            // --------------------------------
            // AGENT NAME
            // --------------------------------

            if(
                agent.name
            ){

                const agentName =
                    String(
                        agent.name
                    )
                        .toLowerCase()
                        .trim();


                if(
                    agentName &&
                    text.includes(
                        agentName
                    )
                ){

                    score +=
                        0.15;

                }

            }


            // --------------------------------
            // CATEGORY
            // --------------------------------

            if(
                agent.category
            ){

                const category =
                    String(
                        agent.category
                    )
                        .toLowerCase()
                        .trim();


                if(
                    category &&
                    text.includes(
                        category
                    )
                ){

                    score +=
                        0.1;

                }

            }


            // --------------------------------
            // DESCRIPTION
            // --------------------------------

            if(
                agent.description
            ){

                const words =
                    String(
                        agent.description
                    )
                        .toLowerCase()
                        .split(
                            /\s+/
                        )
                        .map(
                            word =>
                                word.replace(
                                    /[^a-záàâãéêíóôõúç0-9]/gi,
                                    ""
                                )
                        )
                        .filter(
                            word =>
                                word.length >= 5
                        );


                let matches =
                    0;


                for(
                    const word
                    of words
                ){

                    if(
                        text.includes(
                            word
                        )
                    ){

                        matches++;

                    }

                }


                if(matches){

                    score +=
                        Math.min(
                            0.2,
                            matches *
                            0.04
                        );

                }

            }


            // --------------------------------
            // BEST AGENT
            // --------------------------------

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


        // ==================================
        // LOW CONFIDENCE
        // ==================================

        if(
            bestScore < 0.3
        ){

            return {

                agent:
                    generalagent,

                score:
                    0,

                confidence:
                    0,

                reason:
                    "low_confidence",

                forced:
                    false

            };

        }


        const normalizedScore =
            Number(
                Math.min(
                    bestScore,
                    1
                ).toFixed(
                    2
                )
            );


        return {

            agent:
                selected,

            score:
                normalizedScore,

            confidence:
                normalizedScore,

            reason:
                "smart_agent_match",

            forced:
                false

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

                const result =
                    agent.systemPrompt();


                if(
                    typeof result ===
                    "string" &&
                    result.trim()
                ){

                    return result;

                }

            }

            catch(error){

                console.warn(
                    "[PromptFactory] systemPrompt error:",
                    error?.message
                );

            }

        }


        if(
            typeof agent.systemPrompt ===
            "string" &&
            agent.systemPrompt.trim()
        ){

            return agent.systemPrompt;

        }


        const capabilities =
            Array.isArray(
                agent.capabilities
            ) &&
            agent.capabilities.length
                ? agent.capabilities.join(
                    "\n- "
                )
                : "Fornecer assistência profissional.";


        return `

Você é ${
    agent.name ||
    "um agente Honey IA"
}.

Especialidade:
${
    agent.description ||
    "Assistência inteligente profissional."
}

Responsabilidades:
- ${capabilities}

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
            typeof workspaceContext ===
                "object" &&
            !Array.isArray(
                workspaceContext
            )
        ){

            const safeContext = {
                ...workspaceContext
            };


            const contextKeys =
                Object.keys(
                    safeContext
                );


            if(contextKeys.length){

                finalPrompt += `

=== CONTEXTO DO WORKSPACE ===
`;


                if(
                    safeContext.projectName
                ){

                    finalPrompt += `
Projeto:
${safeString(
    safeContext.projectName,
    500
)}
`;

                }


                if(
                    safeContext.activeFile
                ){

                    finalPrompt += `
Ficheiro ativo:
${safeString(
    safeContext.activeFile,
    500
)}
`;

                }


                if(
                    safeContext.language
                ){

                    finalPrompt += `
Tecnologia:
${safeString(
    safeContext.language,
    300
)}
`;

                }


                if(
                    safeContext.content
                ){

                    finalPrompt += `
Conteúdo relevante:
${safeString(
    safeContext.content,
    20000
)}
`;

                }

            }

        }


        // ==================================
        // USER MEMORY
        // ==================================

        if(
            Array.isArray(
                userMemory
            ) &&
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

                        let value;


                        if(
                            typeof memory ===
                            "string"
                        ){

                            value =
                                memory;

                        }

                        else{

                            try{

                                value =
                                    JSON.stringify(
                                        memory
                                    );

                            }

                            catch{

                                value =
                                    String(
                                        memory
                                    );

                            }

                        }


                        finalPrompt += `
${index + 1}. ${safeString(
    value,
    2000
)}
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
- Não repita informações já fornecidas.
`;

        }


        return prompt + `

=== MODO CHAT ===

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
priorize produzir diretamente o conteúdo solicitado.

Tipos de saída suportados:
${
    outputTypes.length
        ? outputTypes.join(", ")
        : "texto, código, documentos e conteúdo estruturado"
}

Se produzir código:
- entregue o código completo;
- não omita partes importantes;
- preserve consistência entre ficheiros;
- use padrões profissionais;
- considere segurança, desempenho e manutenção.

Se produzir conteúdo textual:
- entregue diretamente o resultado;
- evite comentários desnecessários sobre o processo.

=== FERRAMENTAS ===

Quando uma ferramenta estiver disponível:

1. Avalie se ela é necessária.
2. Utilize-a quando a tarefa exigir informação externa,
   processamento ou operação suportada.
3. Não diga que executou uma ferramenta se ela não foi realmente executada.
4. Utilize os resultados reais das ferramentas.
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
                            (
                                item.role === "user" ||
                                item.role === "assistant"
                            ) &&
                            typeof item.content ===
                                "string"
                    )
                    .slice(
                        -30
                    )
                    .map(
                        item => ({

                            role:
                                item.role,

                            content:
                                safeString(
                                    item.content,
                                    MAX_MESSAGE_LENGTH
                                )

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
                    safeString(
                        userPrompt
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
    // NORMALIZE AGENT TOOLS
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


        // ==================================
        // WEB SEARCH
        // ==================================

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
                        ],

                        additionalProperties:
                            false

                    }

                }

            });

        }


        // ==================================
        // ANALYTICS
        // ==================================

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
                        ],

                        additionalProperties:
                            false

                    }

                }

            });

        }


        // ==================================
        // TEXT ARTIFACT
        // ==================================

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
                        ],

                        additionalProperties:
                            false

                    }

                }

            });

        }


        // ==================================
        // JSON ARTIFACT
        // ==================================

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
                        ],

                        additionalProperties:
                            false

                    }

                }

            });

        }


        // ==================================
        // CALCULATOR
        // ==================================

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
                                    "Expressão matemática."

                            }

                        },

                        required: [
                            "expression"
                        ],

                        additionalProperties:
                            false

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
            safeString(
                query,
                2000
            );


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
            safeString(
                metric,
                300
            );


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
            typeof analytics ===
                "object" &&
            !Array.isArray(
                analytics
            )
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
            safeString(
                args?.filename ||
                "honey-ia-result.txt",
                200
            );


        const content =
            typeof args?.content ===
                "string"
                ? args.content
                : "";


        if(
            !content.trim()
        ){

            throw new Error(
                "O conteúdo do artifact está vazio."
            );

        }


        const finalFilename =
            filename ||
            "honey-ia-result.txt";


        return {

            success:
                true,

            artifact: {

                id:
                    artifactengine.createId(),

                name:
                    finalFilename,

                type:
                    "text/plain",

                mime:
                    "text/plain",

                kind:
                    "document",

                language:
                    safeString(
                        args?.language ||
                        "text",
                        50
                    ),

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
            safeString(
                args?.filename ||
                "honey-ia-result.json",
                200
            );


        if(
            !args ||
            typeof args.data !==
                "object" ||
            args.data === null ||
            Array.isArray(
                args.data
            )
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


        const finalFilename =
            filename.endsWith(
                ".json"
            )
                ? filename
                : `${filename}.json`;


        return {

            success:
                true,

            artifact: {

                id:
                    artifactengine.createId(),

                name:
                    finalFilename,

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
            safeString(
                expression,
                1000
            );


        if(!value){

            throw new Error(
                "Expressão matemática vazia."
            );

        }


        /*
        --------------------------------------------------
        Apenas números, operadores e parênteses.

        Não são permitidos:
        - letras
        - funções
        - propriedades
        - acesso a objetos
        - strings
        - código arbitrário
        --------------------------------------------------
        */

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
            value
                .replace(
                    /,/g,
                    "."
                );


        /*
        --------------------------------------------------
        Validamos novamente o resultado sintático básico.
        --------------------------------------------------
        */

        let result;


        try{

            result =
                Function(
                    `"use strict"; return (${normalized})`
                )();

        }

        catch{

            throw new Error(
                "Não foi possível calcular a expressão."
            );

        }


        if(
            typeof result !==
                "number" ||
            !Number.isFinite(
                result
            )
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

        const normalizedName =
            safeString(
                name,
                100
            )
                .toLowerCase();


        switch(
            normalizedName
        ){

            case "web_search":

                return this.webSearch(
                    args?.query
                );


            case "get_analytics":

                return this.getAnalytics(
                    args?.metric,
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
                    args?.expression
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
            typeof response !==
                "string" ||
            !response.trim()
        ){

            return [];

        }


        const artifacts = [];


        const codeRegex =
            /```([a-zA-Z0-9_+#.-]*)\s*\n([\s\S]*?)```/g;


        let match;


        while(
            (
                match =
                    codeRegex.exec(
                        response
                    )
            ) !== null
        ){

            if(
                artifacts.length >=
                MAX_ARTIFACTS
            ){

                break;

            }


            const language =
                safeString(
                    match[1] ||
                    "text",
                    50
                )
                    .toLowerCase();


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
                "md",

            yaml:
                "yaml",

            yml:
                "yml",

            csv:
                "csv",

            text:
                "txt",

            txt:
                "txt"

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
                "text/markdown",

            yaml:
                "text/yaml",

            yml:
                "text/yaml",

            csv:
                "text/csv",

            text:
                "text/plain",

            txt:
                "text/plain"

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
            DEFAULT_MAX_TOOL_ROUNDS;

    }


    setGroqClient(
        client
    ){

        this.groq =
            client;

        return this;

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
                DEFAULT_MODEL,

            messages,

            temperature:
                Number.isFinite(
                    agent?.temperature
                )
                    ? agent.temperature
                    : DEFAULT_TEMPERATURE,

            max_tokens:
                Number.isFinite(
                    agent?.maxTokens
                )
                    ? agent.maxTokens
                    : DEFAULT_MAX_TOKENS

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
            !Array.isArray(
                toolCalls
            ) ||
            !toolCalls.length
        ){

            return results;

        }


        for(
            const toolCall
            of toolCalls.slice(
                0,
                MAX_TOOL_RESULTS
            )
        ){

            const functionData =
                toolCall?.function;


            const name =
                safeString(
                    functionData?.name,
                    100
                );


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

            catch{

                results.push({

                    toolCallId:
                        toolCall.id ||
                        artifactengine.createId(),

                    name,

                    success:
                        false,

                    error:
                        "Argumentos da ferramenta inválidos."

                });

                continue;

            }


            if(
                !args ||
                typeof args !==
                    "object" ||
                Array.isArray(
                    args
                )
            ){

                args = {};

            }


            // ==================================
            // PERMISSION CHECK
            // ==================================

            if(
                !toolorchestrator.agentCanUseTool(
                    agent,
                    name
                )
            ){

                results.push({

                    toolCallId:
                        toolCall.id ||
                        artifactengine.createId(),

                    name,

                    success:
                        false,

                    error:
                        "O agente não possui autorização para utilizar esta ferramenta."

                });

                continue;

            }


            // ==================================
            // EXECUTION
            // ==================================

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
                        toolCall.id ||
                        artifactengine.createId(),

                    name,

                    success:
                        true,

                    result

                });

            }

            catch(error){

                console.error(
                    `[Tool Error] ${name}:`,
                    error
                );


                results.push({

                    toolCallId:
                        toolCall.id ||
                        artifactengine.createId(),

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
    // TOOL TELEMETRY
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
                    item.success,

                toolCallId:
                    item.toolCallId

            })
        );

    }


    // ======================================
    // EXTRACT TOOL ARTIFACTS
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
                round <
                    this.maxToolRounds;
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


                // ==================================
                // FINAL RESPONSE
                // ==================================

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


                // ==================================
                // ASSISTANT TOOL MESSAGE
                // ==================================

                messages.push({

                    role:
                        "assistant",

                    content:
                        message.content ||
                        null,

                    tool_calls:
                        toolCalls

                });


                // ==================================
                // EXECUTE TOOLS
                // ==================================

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


            // ==================================
            // FINAL RESPONSE
            // ==================================

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

                try{

                    const processed =
                        await agent.after(
                            finalResponse
                        );


                    if(
                        typeof processed ===
                        "string" &&
                        processed.trim()
                    ){

                        finalResponse =
                            processed;

                    }

                }

                catch(error){

                    console.warn(
                        "[Agent Post Processor Error]:",
                        error?.message
                    );

                }

            }


            // ==================================
            // RESPONSE ARTIFACTS
            // ==================================

            const extractedArtifacts =
                artifactengine.extract(
                    finalResponse
                );


            const artifacts = [

                ...generatedArtifacts,

                ...extractedArtifacts

            ].slice(
                0,
                MAX_ARTIFACTS
            );


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

                    confidence:
                        selection.confidence,

                    reason:
                        selection.reason,

                    forced:
                        selection.forced

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
                        DEFAULT_AGENT_ID,

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

                    confidence:
                        selection.confidence,

                    reason:
                        selection.reason,

                    forced:
                        selection.forced

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
    // PROCESS STREAM
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
            // TOOL DISCOVERY LOOP
            // ==================================

            for(
                let round = 0;
                round <
                    this.maxToolRounds;
                round++
            ){

                /*
                ------------------------------------------------
                Fazemos uma chamada normal para permitir que o
                modelo determine se necessita de uma ferramenta.

                Quando existem tools, o resultado é processado
                e devolvido ao modelo.

                Quando já não existem tools, fazemos UMA chamada
                de streaming para produzir a resposta final.
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


                // ==================================
                // NO MORE TOOLS
                // ==================================

                if(
                    !toolCalls.length
                ){

                    /*
                    ------------------------------------------------
                    A resposta desta chamada já é válida.

                    Para streaming verdadeiro, precisamos de evitar
                    uma segunda geração do mesmo conteúdo.

                    Portanto, quando o modelo já respondeu sem tool,
                    entregamos a resposta diretamente.

                    Isto mantém consistência e evita duplicação
                    de tokens.
                    ------------------------------------------------
                    */

                    finalResponse =
                        typeof message.content ===
                            "string"
                            ? message.content
                            : "";


                    if(
                        finalResponse &&
                        typeof onChunk ===
                            "function"
                    ){

                        /*
                        Entrega em pequenos blocos para manter
                        compatibilidade com qualquer frontend que
                        espere múltiplos chunks.
                        */

                        const chunkSize =
                            80;


                        for(
                            let index = 0;
                            index <
                                finalResponse.length;
                            index +=
                                chunkSize
                        ){

                            const chunk =
                                finalResponse.slice(
                                    index,
                                    index +
                                        chunkSize
                                );


                            await onChunk(
                                chunk
                            );

                        }

                    }


                    break;

                }


                // ==================================
                // ASSISTANT TOOL MESSAGE
                // ==================================

                messages.push({

                    role:
                        "assistant",

                    content:
                        message.content ||
                        null,

                    tool_calls:
                        toolCalls

                });


                // ==================================
                // EXECUTE TOOLS
                // ==================================

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


            // ==================================
            // FINAL RESPONSE VALIDATION
            // ==================================

            if(
                !finalResponse ||
                !finalResponse.trim()
            ){

                finalResponse =
                    "Não foi possível concluir a resposta.";

            }


            // ==================================
            // POST PROCESSOR
            // ==================================

            if(
                typeof agent.after ===
                "function"
            ){

                try{

                    const processed =
                        await agent.after(
                            finalResponse
                        );


                    if(
                        typeof processed ===
                        "string" &&
                        processed.trim()
                    ){

                        finalResponse =
                            processed;

                    }

                }

                catch(error){

                    console.warn(
                        "[Agent Post Processor Error]:",
                        error?.message
                    );

                }

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

            ].slice(
                0,
                MAX_ARTIFACTS
            );


            // ==================================
            // FINAL RESULT
            // ==================================

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

                    confidence:
                        selection.confidence,

                    reason:
                        selection.reason,

                    forced:
                        selection.forced

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
                "Honey IA Orchestrator Production",

            version:
                "9.0.0",

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

            multiRoundTools:
                true,

            artifactEngine:
                true,

            agentRouting:
                true,

            workspaceIntegration:
                true,

            userMemory:
                true,

            liveProcessing:
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
