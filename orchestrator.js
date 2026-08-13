/*
==========================================
HONEY IA OS
ORCHESTRATOR ENGINE
PRODUCTION V10.0
==========================================

30 SPECIALIST AGENTS
SMART ROUTING
FORCED AGENT SELECTION
PROMPT FACTORY
GROQ AI
ROBUST TOOL CALLING
MULTI-ROUND TOOL EXECUTION
ARTIFACT ENGINE
REAL STREAMING
WORKSPACE CONTEXT
USER MEMORY
TELEMETRY
SECURITY / VALIDATION
BACKWARD COMPATIBILITY WITH V9
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


const agents_registry = {

    general:
        generalagent,

    architect:
        architectagent,

    designer:
        designeragent,

    developer:
        developeragent,

    education:
        educationagent,

    excel:
        excelagent,

    finance:
        financeagent,

    healthcare:
        healthcareagent,

    image:
        imageagent,

    legal:
        legalagent,

    marketing:
        marketingagent,

    sales:
        salesagent,

    security:
        securityagent,

    video:
        videoagent,

    writer:
        writeragent,

    document:
        documentagent,

    banking:
        bankingagent,

    entrepreneur:
        entrepreneuragent,

    interiordesign:
        interiordesignagent,

    ecommerce:
        ecommerceagent,

    socialmedia:
        socialmediaagent,

    research:
        researchagent,

    automation:
        automationagent,

    analytics:
        analyticsagent,

    customer:
        customeragent,

    translation:
        translationagent,

    business:
        businessagent,

    accounting:
        accountingagent,

    strategist:
        strategistagent

};


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


const MAX_HISTORY_ITEMS =
    30;


const MAX_MEMORY_ITEMS =
    20;


const MAX_ARTIFACTS =
    50;


const MAX_TOOL_RESULTS =
    50;


const MAX_TOOL_ARGUMENT_LENGTH =
    50000;


const MAX_CONTEXT_CONTENT =
    20000;


const MAX_ROUTER_TEXT =
    12000;


const MAX_TOOL_ROUNDS_HARD =
    10;


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


function clamp(
    value,
    min,
    max,
    fallback
){

    const number =
        Number(
            value
        );

    if(
        !Number.isFinite(
            number
        )
    ){

        return fallback;

    }

    return Math.min(
        max,
        Math.max(
            min,
            number
        )
    );

}


function normalizeText(
    value
){

    return safeString(
        value,
        MAX_ROUTER_TEXT
    )
        .toLowerCase()
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /[^a-z0-9áàâãéêíóôõúçñ\s._-]/gi,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();

}


function normalizeToolName(
    value
){

    return safeString(
        value,
        100
    )
        .toLowerCase();

}


function uniqueStrings(
    values
){

    return [
        ...new Set(

            (
                Array.isArray(
                    values
                )
                    ? values
                    : []
            )
                .map(
                    value =>
                        safeString(
                            value,
                            200
                        ).toLowerCase()
                )
                .filter(
                    Boolean
                )

        )
    ];

}


Object.entries(
    agents_registry
).forEach(
    (
        [
            key,
            agent
        ]
    ) => {

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

        if(
            !Array.isArray(
                agent.tools
            )
        ){

            agent.tools = [];

        }

        if(
            !Array.isArray(
                agent.capabilities
            )
        ){

            agent.capabilities = [];

        }

        if(
            !Array.isArray(
                agent.outputTypes
            )
        ){

            agent.outputTypes = [];

        }

        if(
            !Array.isArray(
                agent.keywords
            )
        ){

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

        const forced =
            this.normalizeAgentId(
                forcedagentid
            );


        if(
            forced &&
            forced !==
                DEFAULT_AGENT_ID &&
            agents_registry[
                forced
            ]
        ){

            return {

                agent:
                    agents_registry[
                        forced
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


        if(
            forced &&
            forced !==
                DEFAULT_AGENT_ID &&
            !agents_registry[
                forced
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


        const text =
            normalizeText(
                usermessage
            );


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


        let secondScore =
            0;


        for(
            const [
                id,
                agent
            ]
            of Object.entries(
                agents_registry
            )
        ){

            if(
                !agent ||
                id ===
                    DEFAULT_AGENT_ID
            ){

                continue;

            }


            let score =
                0;


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
                        result ===
                        true
                    ){

                        score +=
                            0.75;

                    }

                    else if(
                        typeof result ===
                        "number" &&
                        Number.isFinite(
                            result
                        )
                    ){

                        score +=
                            clamp(
                                result,
                                0,
                                1,
                                0
                            ) * 0.9;

                    }

                }

                catch(error){

                    console.warn(
                        `[Router] canHandle error (${id}):`,
                        error?.message
                    );

                }

            }


            const keywords =
                uniqueStrings(
                    agent.keywords
                );


            let keywordMatches =
                0;


            for(
                const keyword
                of keywords
            ){

                if(
                    keyword.length >=
                        2 &&
                    text.includes(
                        normalizeText(
                            keyword
                        )
                    )
                ){

                    keywordMatches++;

                }

            }


            if(keywordMatches){

                score +=
                    Math.min(
                        0.55,
                        keywordMatches *
                        0.18
                    );

            }


            const agentName =
                normalizeText(
                    agent.name
                );


            if(
                agentName &&
                text.includes(
                    agentName
                )
            ){

                score +=
                    0.15;

            }


            const category =
                normalizeText(
                    agent.category
                );


            if(
                category &&
                text.includes(
                    category
                )
            ){

                score +=
                    0.08;

            }


            const descriptionWords =
                normalizeText(
                    agent.description
                )
                    .split(
                        /\s+/
                    )
                    .filter(
                        word =>
                            word.length >=
                            5
                    )
                    .slice(
                        0,
                        80
                    );


            let descriptionMatches =
                0;


            for(
                const word
                of descriptionWords
            ){

                if(
                    text.includes(
                        word
                    )
                ){

                    descriptionMatches++;

                }

            }


            if(
                descriptionMatches
            ){

                score +=
                    Math.min(
                        0.16,
                        descriptionMatches *
                        0.025
                    );

            }


            score =
                Math.min(
                    score,
                    1
                );


            if(
                score >
                bestScore
            ){

                secondScore =
                    bestScore;

                bestScore =
                    score;

                selected =
                    agent;

            }

            else if(
                score >
                secondScore
            ){

                secondScore =
                    score;

            }

        }


        if(
            bestScore <
            0.30
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


        const margin =
            Math.max(
                0,
                bestScore -
                secondScore
            );


        const confidence =
            Number(
                clamp(
                    bestScore *
                    0.75 +
                    margin *
                    0.35,
                    0,
                    1,
                    0
                ).toFixed(
                    2
                )
            );


        const score =
            Number(
                bestScore.toFixed(
                    2
                )
            );


        return {

            agent:
                selected,

            score,

            confidence,

            reason:
                "smart_agent_match",

            forced:
                false

        };

    }

}// ==========================================
// PROMPT FACTORY
// ==========================================

export class promptfactory {

    // ======================================
    // EXTRACT SYSTEM PROMPT
    // ======================================

    static extractsystemprompt(
        agent
    ){

        if(!agent){

            return `
Você é a Honey IA,
uma inteligência artificial profissional empresarial.

Responda de forma clara,
segura, útil e profissional.

Não invente informações,
resultados de ferramentas,
dados externos ou ações que não foram executadas.
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

                    return result.trim();

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

            return agent.systemPrompt.trim();

        }


        const capabilities =
            Array.isArray(
                agent.capabilities
            ) &&
            agent.capabilities.length
                ? agent.capabilities
                    .slice(
                        0,
                        50
                    )
                    .join(
                        "\n- "
                    )
                : "Fornecer assistência profissional.";


        return `
Você é ${
    agent.name ||
    "um agente Honey IA"
}.

Você faz parte da Honey IA,
uma plataforma empresarial de inteligência artificial.

Especialidade:
${
    agent.description ||
    "Assistência inteligente profissional."
}

Responsabilidades:
- ${capabilities}

Regras gerais:

- Responda de forma clara.
- Seja profissional.
- Seja útil.
- Seja objetivo quando a tarefa for simples.
- Seja detalhado quando a tarefa exigir.
- Não invente informações.
- Não diga que executou uma ação se ela não foi realmente executada.
- Quando uma ferramenta estiver disponível e for necessária, utilize-a.
- Respeite o contexto do workspace.
- Preserve consistência com informações anteriores.
`;

    }


    // ======================================
    // SANITIZE WORKSPACE
    // ======================================

    static sanitizeworkspace(
        workspaceContext = {}
    ){

        if(
            !workspaceContext ||
            typeof workspaceContext !==
                "object" ||
            Array.isArray(
                workspaceContext
            )
        ){

            return {};

        }


        return {

            projectName:
                safeString(
                    workspaceContext.projectName,
                    500
                ),

            activeFile:
                safeString(
                    workspaceContext.activeFile,
                    500
                ),

            language:
                safeString(
                    workspaceContext.language,
                    300
                ),

            framework:
                safeString(
                    workspaceContext.framework,
                    300
                ),

            projectType:
                safeString(
                    workspaceContext.projectType,
                    300
                ),

            content:
                safeString(
                    workspaceContext.content,
                    MAX_CONTEXT_CONTENT
                ),

            selectedText:
                safeString(
                    workspaceContext.selectedText,
                    10000
                ),

            currentPage:
                safeString(
                    workspaceContext.currentPage,
                    500
                )

        };

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
            safeString(
                baseprompt,
                MAX_MESSAGE_LENGTH
            );


        const context =
            this.sanitizeworkspace(
                workspaceContext
            );


        const hasContext =
            Object.values(
                context
            )
                .some(
                    value =>
                        Boolean(
                            value
                        )
                );


        if(
            hasContext
        ){

            finalPrompt += `

=== CONTEXTO DO WORKSPACE ===

Use este contexto para compreender
o trabalho atual do utilizador.

`;


            if(
                context.projectName
            ){

                finalPrompt += `
Projeto:
${context.projectName}
`;

            }


            if(
                context.projectType
            ){

                finalPrompt += `
Tipo de projeto:
${context.projectType}
`;

            }


            if(
                context.activeFile
            ){

                finalPrompt += `
Ficheiro ativo:
${context.activeFile}
`;

            }


            if(
                context.language
            ){

                finalPrompt += `
Linguagem:
${context.language}
`;

            }


            if(
                context.framework
            ){

                finalPrompt += `
Framework:
${context.framework}
`;

            }


            if(
                context.currentPage
            ){

                finalPrompt += `
Página atual:
${context.currentPage}
`;

            }


            if(
                context.selectedText
            ){

                finalPrompt += `
Texto selecionado:
${context.selectedText}
`;

            }


            if(
                context.content
            ){

                finalPrompt += `
Conteúdo relevante:
${context.content}
`;

            }


            finalPrompt += `

=== FIM DO CONTEXTO DO WORKSPACE ===
`;

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

Use a memória abaixo somente quando
ela for relevante para a tarefa atual.

Não exponha a memória desnecessariamente.

`;


            userMemory
                .slice(
                    0,
                    MAX_MEMORY_ITEMS
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


            finalPrompt += `

=== FIM DA MEMÓRIA ===
`;

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

        const normalizedMode =
            safeString(
                mode,
                50
            )
                .toLowerCase();


        if(
            normalizedMode ===
            "live"
        ){

            return prompt + `

=== MODO LIVE ===

Você está em uma interação em tempo real.

Regras:

- Responda naturalmente.
- Seja direto.
- Use frases claras.
- Evite explicações excessivamente longas.
- Mantenha uma conversa fluida.
- Não repita informações já fornecidas.
- Priorize respostas rápidas e úteis.
- Não introduza estruturas complexas quando não forem necessárias.
`;

        }


        if(
            normalizedMode ===
            "code"
        ){

            return prompt + `

=== MODO CODE ===

A tarefa está relacionada com programação.

Regras:

- Analise cuidadosamente o código existente.
- Preserve compatibilidade.
- Entregue código funcional.
- Não omita partes importantes.
- Considere segurança.
- Considere desempenho.
- Considere manutenção.
- Explique alterações importantes.
- Quando substituir um ficheiro inteiro for solicitado,
  entregue o ficheiro completo.
`;

        }


        if(
            normalizedMode ===
            "analysis"
        ){

            return prompt + `

=== MODO ANALYSIS ===

Analise a tarefa de forma estruturada.

Regras:

- Identifique o problema.
- Separe causas de sintomas.
- Avalie alternativas.
- Explique riscos relevantes.
- Apresente uma solução prática.
- Evite conclusões sem fundamento.
`;

        }


        return prompt + `

=== MODO CHAT ===

Regras:

- Estruture a resposta.
- Use Markdown quando necessário.
- Explique como especialista.
- Forneça soluções profissionais.
- Seja claro e objetivo.
- Quando criar código, entregue código completo
  quando isso for solicitado.
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
                    .slice(
                        0,
                        50
                    )
                : [];


        const tools =
            Array.isArray(
                agent?.tools
            )
                ? uniqueStrings(
                    agent.tools
                )
                : [];


        return prompt + `

=== OUTPUT HONEY IA ===

Quando a tarefa exigir um resultado concreto,
priorize produzir diretamente o conteúdo solicitado.

Tipos de saída suportados:

${
    outputTypes.length
        ? outputTypes.join(
            ", "
        )
        : "texto, código, documentos e conteúdo estruturado"
}

Ferramentas autorizadas para este agente:

${
    tools.length
        ? tools.join(
            ", "
        )
        : "nenhuma ferramenta específica"
}

=== REGRAS DE CÓDIGO ===

Se produzir código:

- entregue código completo quando solicitado;
- não omita partes importantes;
- preserve consistência entre ficheiros;
- mantenha imports e exports válidos;
- evite dependências desnecessárias;
- use padrões profissionais;
- considere segurança;
- considere desempenho;
- considere manutenção;
- não invente APIs inexistentes;
- não altere funcionalidades sem necessidade.

=== REGRAS DE CONTEÚDO ===

Se produzir conteúdo textual:

- entregue diretamente o resultado;
- evite comentários desnecessários sobre o processo;
- adapte o nível de detalhe à tarefa;
- não repita a mesma informação.

=== FERRAMENTAS ===

Quando uma ferramenta estiver disponível:

1. Avalie se ela é necessária.
2. Utilize-a quando a tarefa exigir informação externa,
   processamento ou operação suportada.
3. Não diga que executou uma ferramenta
   se ela não foi realmente executada.
4. Utilize os resultados reais das ferramentas.
5. Se uma ferramenta falhar,
   informe a limitação de forma transparente.
`;

    }


    // ======================================
    // HISTORY NORMALIZATION
    // ======================================

    static normalizehistory(
        history = []
    ){

        if(
            !Array.isArray(
                history
            )
        ){

            return [];

        }


        return history
            .filter(
                item =>
                    item &&
                    (
                        item.role ===
                            "user" ||
                        item.role ===
                            "assistant"
                    ) &&
                    typeof item.content ===
                        "string"
            )
            .slice(
                -MAX_HISTORY_ITEMS
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
            );

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
            this.normalizehistory(
                history
            );


        const normalizedUserPrompt =
            safeString(
                userPrompt
            );


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
                    normalizedUserPrompt

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


        return uniqueStrings(
            agent.tools
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
                        "Pesquisa informações atualizadas na internet. Use quando a resposta depender de informação externa, atualizada ou verificável.",

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
                        "Obtém métricas disponíveis no contexto atual do workspace Honey IA.",

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
                                    "string",

                                description:
                                    "Nome do ficheiro."

                            },

                            content: {

                                type:
                                    "string",

                                description:
                                    "Conteúdo completo do ficheiro."

                            },

                            language: {

                                type:
                                    "string",

                                description:
                                    "Linguagem ou formato do conteúdo."

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
                                    "string",

                                description:
                                    "Nome do ficheiro JSON."

                            },

                            data: {

                                type:
                                    "object",

                                description:
                                    "Dados JSON do ficheiro."

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
                normalizeToolName(
                    toolName
                )
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
    // VALIDATE TOOL ARGUMENTS
    // ======================================

    static validateToolArguments(
        name,
        args
    ){

        if(
            !args ||
            typeof args !==
                "object" ||
            Array.isArray(
                args
            )
        ){

            return {

                valid:
                    false,

                error:
                    "Os argumentos da ferramenta são inválidos."

            };

        }


        try{

            const serialized =
                JSON.stringify(
                    args
                );


            if(
                serialized.length >
                MAX_TOOL_ARGUMENT_LENGTH
            ){

                return {

                    valid:
                        false,

                    error:
                        "Os argumentos da ferramenta excedem o limite permitido."

                };

            }

        }

        catch{

            return {

                valid:
                    false,

                error:
                    "Não foi possível validar os argumentos da ferramenta."

            };

        }


        return {

            valid:
                true,

            error:
                null

        };

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


        return {

            success:
                true,

            artifact: {

                id:
                    artifactengine.createId(),

                name:
                    filename ||
                    "honey-ia-result.txt",

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
        Apenas números, operadores,
        espaços, pontos, vírgulas e parênteses.

        Não são permitidos:
        - letras
        - funções
        - propriedades
        - acesso a objetos
        - strings
        - código arbitrário
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
            value.replace(
                /,/g,
                "."
            );


        let result;


        try{

            /*
            A expressão foi validada acima
            antes da avaliação.
            */

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
            normalizeToolName(
                name
            );


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

}// ==========================================
// ARTIFACT ENGINE
// ==========================================

export class artifactengine {

    // ======================================
    // CREATE UNIQUE ID
    // ======================================

    static createId(){

        return (
            "artifact_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .slice(2, 10)
        );

    }


    // ======================================
    // NORMALIZE LANGUAGE
    // ======================================

    static normalizeLanguage(
        language = ""
    ){

        return safeString(
            language,
            50
        )
            .toLowerCase()
            .replace(
                /[^a-z0-9+#.-]/g,
                ""
            );

    }


    // ======================================
    // EXTENSION
    // ======================================

    static extensionFromLanguage(
        language
    ){

        const normalized =
            this.normalizeLanguage(
                language
            );


        const map = {

            javascript:
                "js",

            js:
                "js",

            node:
                "js",

            nodejs:
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

            htm:
                "html",

            css:
                "css",

            scss:
                "scss",

            sass:
                "sass",

            less:
                "less",

            json:
                "json",

            xml:
                "xml",

            sql:
                "sql",

            java:
                "java",

            kotlin:
                "kt",

            swift:
                "swift",

            c:
                "c",

            cpp:
                "cpp",

            "c++":
                "cpp",

            csharp:
                "cs",

            "c#":
                "cs",

            php:
                "php",

            ruby:
                "rb",

            go:
                "go",

            rust:
                "rs",

            jsx:
                "jsx",

            tsx:
                "tsx",

            vue:
                "vue",

            svelte:
                "svelte",

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

            graphql:
                "graphql",

            bash:
                "sh",

            shell:
                "sh",

            sh:
                "sh",

            powershell:
                "ps1",

            dockerfile:
                "dockerfile",

            text:
                "txt",

            txt:
                "txt"

        };


        return (
            map[normalized] ||
            "txt"
        );

    }


    // ======================================
    // MIME TYPE
    // ======================================

    static mimeFromLanguage(
        language
    ){

        const normalized =
            this.normalizeLanguage(
                language
            );


        const map = {

            javascript:
                "text/javascript",

            js:
                "text/javascript",

            node:
                "text/javascript",

            nodejs:
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

            htm:
                "text/html",

            css:
                "text/css",

            scss:
                "text/x-scss",

            sass:
                "text/x-sass",

            less:
                "text/x-less",

            json:
                "application/json",

            xml:
                "application/xml",

            sql:
                "text/plain",

            java:
                "text/x-java-source",

            kotlin:
                "text/plain",

            swift:
                "text/plain",

            c:
                "text/plain",

            cpp:
                "text/plain",

            "c++":
                "text/plain",

            csharp:
                "text/plain",

            "c#":
                "text/plain",

            php:
                "text/x-php",

            ruby:
                "text/x-ruby",

            go:
                "text/x-go",

            rust:
                "text/x-rust",

            jsx:
                "text/javascript",

            tsx:
                "text/typescript",

            vue:
                "text/plain",

            svelte:
                "text/plain",

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

            graphql:
                "application/graphql",

            bash:
                "application/x-sh",

            shell:
                "application/x-sh",

            sh:
                "application/x-sh",

            powershell:
                "text/plain",

            dockerfile:
                "text/plain",

            text:
                "text/plain",

            txt:
                "text/plain"

        };


        return (
            map[normalized] ||
            "text/plain"
        );

    }


    // ======================================
    // DETERMINE ARTIFACT KIND
    // ======================================

    static determineKind(
        language
    ){

        const normalized =
            this.normalizeLanguage(
                language
            );


        if(
            normalized === "html" ||
            normalized === "htm" ||
            normalized === "vue" ||
            normalized === "svelte"
        ){

            return "website";

        }


        if(
            normalized === "json"
        ){

            return "data";

        }


        if(
            normalized === "csv"
        ){

            return "spreadsheet";

        }


        if(
            normalized === "markdown" ||
            normalized === "md"
        ){

            return "document";

        }


        if(
            normalized === "text" ||
            normalized === "txt"
        ){

            return "document";

        }


        return "code";

    }


    // ======================================
    // CREATE ARTIFACT
    // ======================================

    static createArtifact({

        filename,
        content,
        language = "text",
        kind = null,
        mime = null
    } = {}){

        const safeFilename =
            safeString(
                filename ||
                `honey-ia-result.${this.extensionFromLanguage(language)}`,
                250
            );


        const safeContent =
            typeof content ===
                "string"
                ? content
                : String(
                    content ?? ""
                );


        const normalizedLanguage =
            this.normalizeLanguage(
                language ||
                "text"
            );


        const finalMime =
            mime ||
            this.mimeFromLanguage(
                normalizedLanguage
            );


        return {

            id:
                this.createId(),

            name:
                safeFilename,

            filename:
                safeFilename,

            type:
                finalMime,

            mime:
                finalMime,

            kind:
                kind ||
                this.determineKind(
                    normalizedLanguage
                ),

            language:
                normalizedLanguage,

            content:
                safeContent,

            size:
                safeContent.length,

            createdAt:
                new Date().toISOString()

        };

    }


    // ======================================
    // EXTRACT CODE BLOCKS
    // ======================================

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
            /```([a-zA-Z0-9_+#.-]*)[ \t]*\r?\n([\s\S]*?)```/g;


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
                this.normalizeLanguage(
                    match[1] ||
                    "text"
                );


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


            const artifact =
                this.createArtifact({

                    filename:
                        `honey-ia-result.${extension}`,

                    content,

                    language

                });


            artifacts.push(
                artifact
            );

        }


        return artifacts;

    }


    // ======================================
    // EXTRACT NAMED FILES
    // ======================================

    static extractNamedFiles(
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


        /*
        --------------------------------------------------
        Detecta formatos como:

        Ficheiro: index.html
        Arquivo: style.css
        File: app.js

        seguido de um bloco de código.
        --------------------------------------------------
        */

        const namedRegex =
            /(?:Ficheiro|Arquivo|Ficheiro de|File)\s*:\s*`?([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)`?[\s\S]*?```([a-zA-Z0-9_+#.-]*)[ \t]*\r?\n([\s\S]*?)```/gi;


        let match;


        while(
            (
                match =
                    namedRegex.exec(
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


            const filename =
                safeString(
                    match[1],
                    250
                );


            const language =
                this.normalizeLanguage(
                    match[2] ||
                    "text"
                );


            const content =
                match[3] ||
                "";


            if(
                !filename ||
                !content.trim()
            ){

                continue;

            }


            artifacts.push(
                this.createArtifact({

                    filename,

                    content,

                    language

                })
            );

        }


        return artifacts;

    }


    // ======================================
    // MERGE ARTIFACTS
    // ======================================

    static merge(
        ...artifactLists
    ){

        const result = [];


        const seen =
            new Set();


        for(
            const list
            of artifactLists
        ){

            if(
                !Array.isArray(
                    list
                )
            ){

                continue;

            }


            for(
                const artifact
                of list
            ){

                if(
                    !artifact ||
                    typeof artifact !==
                        "object"
                ){

                    continue;

                }


                const key =
                    `${artifact.name || ""}:${artifact.content || ""}`;


                if(
                    seen.has(
                        key
                    )
                ){

                    continue;

                }


                seen.add(
                    key
                );


                result.push(
                    artifact
                );


                if(
                    result.length >=
                    MAX_ARTIFACTS
                ){

                    return result;

                }

            }

        }


        return result;

    }

}


// ==========================================
// TELEMETRY ENGINE
// ==========================================

export class telemetryengine {

    constructor(){

        this.events = [];

        this.maxEvents =
            500;

    }


    // ======================================
    // RECORD EVENT
    // ======================================

    record(
        type,
        data = {}
    ){

        const event = {

            id:
                artifactengine.createId(),

            type:
                safeString(
                    type,
                    100
                ),

            timestamp:
                Date.now(),

            data:
                data &&
                typeof data ===
                    "object"
                    ? data
                    : {}

        };


        this.events.push(
            event
        );


        if(
            this.events.length >
            this.maxEvents
        ){

            this.events =
                this.events.slice(
                    -this.maxEvents
                );

        }


        return event;

    }


    // ======================================
    // GET EVENTS
    // ======================================

    getEvents(){

        return [
            ...this.events
        ];

    }


    // ======================================
    // CLEAR
    // ======================================

    clear(){

        this.events = [];

    }


    // ======================================
    // SUMMARY
    // ======================================

    summary(){

        const summary = {

            total:
                this.events.length,

            successful:
                0,

            failed:
                0,

            tools:
                0,

            requests:
                0

        };


        for(
            const event
            of this.events
        ){

            if(
                event.type ===
                "request_completed"
            ){

                summary.requests++;

            }


            if(
                event.type ===
                "tool_executed"
            ){

                summary.tools++;

            }


            if(
                event.data?.success ===
                true
            ){

                summary.successful++;

            }


            if(
                event.data?.success ===
                false
            ){

                summary.failed++;

            }

        }


        return summary;

    }

}


// ==========================================
// ORCHESTRATOR MAIN ENGINE V10
// ==========================================

export class Orchestrator {

    constructor(
        groqClient = null,
        options = {}
    ){

        this.groq =
            groqClient;


        this.maxToolRounds =
            Number.isInteger(
                options.maxToolRounds
            )
                ? Math.max(
                    1,
                    Math.min(
                        options.maxToolRounds,
                        10
                    )
                )
                : DEFAULT_MAX_TOOL_ROUNDS;


        this.telemetry =
            new telemetryengine();


        this.version =
            "10.0.0";

    }


    // ======================================
    // SET GROQ CLIENT
    // ======================================

    setGroqClient(
        client
    ){

        this.groq =
            client;

        return this;

    }


    // ======================================
    // SET TOOL ROUND LIMIT
    // ======================================

    setMaxToolRounds(
        value
    ){

        if(
            Number.isInteger(
                value
            )
        ){

            this.maxToolRounds =
                Math.max(
                    1,
                    Math.min(
                        value,
                        10
                    )
                );

        }


        return this;

    }


    // ======================================
    // BUILD PAYLOAD
    // ======================================

    buildPayload({

        agent,

        messages,

        tools,

        stream = false,

        temperature = null,

        maxTokens = null

    }){

        const finalTemperature =
            Number.isFinite(
                temperature
            )
                ? temperature
                : Number.isFinite(
                    agent?.temperature
                )
                    ? agent.temperature
                    : DEFAULT_TEMPERATURE;


        const finalMaxTokens =
            Number.isFinite(
                maxTokens
            )
                ? maxTokens
                : Number.isFinite(
                    agent?.maxTokens
                )
                    ? agent.maxTokens
                    : DEFAULT_MAX_TOKENS;


        const payload = {

            model:
                agent?.model ||
                DEFAULT_MODEL,

            messages,

            temperature:
                finalTemperature,

            max_tokens:
                finalMaxTokens

        };


        if(
            Array.isArray(
                tools
            ) &&
            tools.length
        ){

            payload.tools =
                tools;


            payload.tool_choice =
                "auto";

        }


        if(
            stream
        ){

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
        context = {}
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


            // ==================================
            // PARSE ARGUMENTS
            // ==================================

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
                        toolCall.id ||
                        artifactengine.createId(),

                    name,

                    success:
                        false,

                    error:
                        "Argumentos da ferramenta inválidos."

                });


                this.telemetry.record(
                    "tool_executed",
                    {

                        name,

                        success:
                            false,

                        error:
                            "invalid_arguments"

                    }
                );


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
            // PERMISSION
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


                this.telemetry.record(
                    "tool_executed",
                    {

                        name,

                        success:
                            false,

                        error:
                            "permission_denied"

                    }
                );


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


                this.telemetry.record(
                    "tool_executed",
                    {

                        name,

                        success:
                            true

                    }
                );

            }

            catch(error){

                console.error(
                    `[Honey IA Tool Error] ${name}:`,
                    error
                );


                const message =
                    error?.message ||
                    "Erro ao executar ferramenta.";


                results.push({

                    toolCallId:
                        toolCall.id ||
                        artifactengine.createId(),

                    name,

                    success:
                        false,

                    error:
                        message

                });


                this.telemetry.record(
                    "tool_executed",
                    {

                        name,

                        success:
                            false,

                        error:
                            message

                    }
                );

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

            let content;


            try{

                content =
                    JSON.stringify(
                        item.success
                            ? item.result
                            : {

                                success:
                                    false,

                                error:
                                    item.error

                            }
                    );

            }

            catch{

                content =
                    JSON.stringify({

                        success:
                            false,

                        error:
                            "Resultado da ferramenta não pôde ser serializado."

                    });

            }


            messages.push({

                role:
                    "tool",

                tool_call_id:
                    item.toolCallId,

                content

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
    // FINALIZE ARTIFACTS
    // ======================================

    finalizeArtifacts(
        generatedArtifacts,
        finalResponse
    ){

        const extractedArtifacts =
            artifactengine.extract(
                finalResponse
            );


        const namedArtifacts =
            artifactengine.extractNamedFiles(
                finalResponse
            );


        return artifactengine.merge(
            generatedArtifacts,
            namedArtifacts,
            extractedArtifacts
        ).slice(
            0,
            MAX_ARTIFACTS
        );

    }


    // ======================================
    // POST PROCESS RESPONSE
    // ======================================

    async postProcessResponse(
        agent,
        response
    ){

        if(
            !agent ||
            typeof agent.after !==
                "function"
        ){

            return response;

        }


        try{

            const processed =
                await agent.after(
                    response
                );


            if(
                typeof processed ===
                    "string" &&
                processed.trim()
            ){

                return processed;

            }

        }

        catch(error){

            console.warn(
                "[Honey IA Post Processor Error]:",
                error?.message
            );

        }


        return response;

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

    } = {}){

        const start =
            Date.now();


        // ==================================
        // INPUT VALIDATION
        // ==================================

        const normalizedPrompt =
            safeString(
                userPrompt
            );


        if(
            !normalizedPrompt
        ){

            return {

                success:
                    false,

                error:
                    "O pedido do utilizador está vazio.",

                response:
                    "",

                artifacts:
                    [],

                tools:
                    []

            };

        }


        // ==================================
        // ROUTING
        // ==================================

        const selection =
            agentrouter.selectagent(
                normalizedPrompt,
                agentId
            );


        const agent =
            selection.agent ||
            generalagent;


        this.telemetry.record(
            "request_started",
            {

                agent:
                    agent.id,

                routing:
                    selection

            }
        );


        try{

            if(!this.groq){

                throw new Error(
                    "Groq SDK não inicializada."
                );

            }


            // ==================================
            // BUILD MESSAGES
            // ==================================

            const messages =
                promptfactory
                    .buildmessagespayload({

                        agent,

                        userPrompt:
                            normalizedPrompt,

                        history,

                        workspaceContext,

                        userMemory,

                        mode

                    });


            // ==================================
            // TOOLS
            // ==================================

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
                // FINAL ANSWER
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
            // FALLBACK
            // ==================================

            if(
                !finalResponse ||
                !finalResponse.trim()
            ){

                finalResponse =
                    "Não foi possível concluir a resposta.";

            }


            // ==================================
            // POST PROCESS
            // ==================================

            finalResponse =
                await this.postProcessResponse(
                    agent,
                    finalResponse
                );


            // ==================================
            // ARTIFACTS
            // ==================================

            const artifacts =
                this.finalizeArtifacts(
                    generatedArtifacts,
                    finalResponse
                );


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
                    finalCompletion?.usage ||
                    null,

                latency:
                    Date.now() -
                    start,

                engine: {

                    name:
                        "Honey IA Orchestrator",

                    version:
                        this.version

                }

            };


            this.telemetry.record(
                "request_completed",
                {

                    success:
                        true,

                    agent:
                        agent.id,

                    latency:
                        result.latency,

                    tools:
                        executedTools.length,

                    artifacts:
                        artifacts.length

                }
            );


            return result;

        }

        catch(error){

            console.error(
                "[Honey IA Orchestrator Error]",
                error
            );


            const result = {

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
                    start,

                engine: {

                    name:
                        "Honey IA Orchestrator",

                    version:
                        this.version

                }

            };


            this.telemetry.record(
                "request_completed",
                {

                    success:
                        false,

                    agent:
                        agent?.id ||
                        DEFAULT_AGENT_ID,

                    latency:
                        result.latency,

                    error:
                        result.error

                }
            );


            return result;

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

    } = {}){

        const start =
            Date.now();


        const normalizedPrompt =
            safeString(
                userPrompt
            );


        if(
            !normalizedPrompt
        ){

            const error =
                new Error(
                    "O pedido do utilizador está vazio."
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


        const selection =
            agentrouter.selectagent(
                normalizedPrompt,
                agentId
            );


        const agent =
            selection.agent ||
            generalagent;


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

                        userPrompt:
                            normalizedPrompt,

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
            // TOOL DISCOVERY
            // ==================================

            for(
                let round = 0;
                round <
                    this.maxToolRounds;
                round++
            ){

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


                    if(
                        finalResponse &&
                        typeof onChunk ===
                            "function"
                    ){

                        /*
                        ------------------------------------------
                        O resultado final desta etapa já foi
                        produzido pelo Groq.

                        Dividimos a resposta em chunks para que
                        o frontend possa apresentar uma experiência
                        de streaming sem gerar a resposta duas vezes.
                        ------------------------------------------
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
            // VALIDATE RESPONSE
            // ==================================

            if(
                !finalResponse ||
                !finalResponse.trim()
            ){

                finalResponse =
                    "Não foi possível concluir a resposta.";

            }


            // ==================================
            // POST PROCESS
            // ==================================

            finalResponse =
                await this.postProcessResponse(
                    agent,
                    finalResponse
                );


            // ==================================
            // ARTIFACTS
            // ==================================

            const artifacts =
                this.finalizeArtifacts(
                    generatedArtifacts,
                    finalResponse
                );


            // ==================================
            // RESULT
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
                    start,

                engine: {

                    name:
                        "Honey IA Orchestrator",

                    version:
                        this.version

                }

            };


            this.telemetry.record(
                "request_completed",
                {

                    success:
                        true,

                    agent:
                        agent.id,

                    latency:
                        result.latency,

                    tools:
                        executedTools.length,

                    artifacts:
                        artifacts.length

                }
            );


            // ==================================
            // COMPLETE CALLBACK
            // ==================================

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
                "[Honey IA Orchestrator Stream Error]",
                error
            );


            this.telemetry.record(
                "request_completed",
                {

                    success:
                        false,

                    agent:
                        agent?.id ||
                        DEFAULT_AGENT_ID,

                    latency:
                        Date.now() -
                        start,

                    error:
                        error?.message

                }
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
    // GET TELEMETRY
    // ======================================

    getTelemetry(){

        return {

            status:
                "online",

            engine:
                "Honey IA Orchestrator Production",

            version:
                this.version,

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

            telemetry:
                true,

            maxToolRounds:
                this.maxToolRounds,

            timestamp:
                Date.now()

        };

    }


    // ======================================
    // GET TELEMETRY SUMMARY
    // ======================================

    getTelemetrySummary(){

        return this.telemetry.summary();

    }


    // ======================================
    // GET AGENTS
    // ======================================

    getAgents(){

        return Object.entries(
            agents_registry
        ).map(
            ([id, agent]) => ({

                id,

                name:
                    agent?.name ||
                    `Agente ${id}`,

                emoji:
                    agent?.emoji ||
                    "🤖",

                category:
                    agent?.category ||
                    "Tecnologia",

                level:
                    agent?.level ||
                    "Professional",

                description:
                    agent?.description ||
                    "",

                capabilities:
                    Array.isArray(
                        agent?.capabilities
                    )
                        ? agent.capabilities
                        : [],

                tools:
                    Array.isArray(
                        agent?.tools
                    )
                        ? agent.tools
                        : [],

                outputTypes:
                    Array.isArray(
                        agent?.outputTypes
                    )
                        ? agent.outputTypes
                        : []

            })
        );

    }


    // ======================================
    // HEALTH CHECK
    // ======================================

    health(){

        return {

            status:
                this.groq
                    ? "healthy"
                    : "degraded",

            engine:
                "Honey IA Orchestrator",

            version:
                this.version,

            groq:
                Boolean(
                    this.groq
                ),

            agents:
                Object.keys(
                    agents_registry
                ).length,

            tools:
                5,

            timestamp:
                Date.now()

        };

    }

}


// ==========================================
// CREATE ORCHESTRATOR INSTANCE
// ==========================================

const orchestratorinstance =
    new Orchestrator();


// ==========================================
// EXPORT REGISTRY
// ==========================================

export {

    agents_registry

};


// ==========================================
// DEFAULT EXPORT
// ==========================================

export default orchestratorinstance;
