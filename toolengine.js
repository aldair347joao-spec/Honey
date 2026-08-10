/*
==========================================
HONEY IA OS
TOOL ENGINE V1.0
Enterprise Tool Generation Engine

Responsável por:
- Detectar pedidos de ferramentas
- Classificar ferramentas
- Criar especificações de ferramentas
- Associar ferramentas aos agentes
- Gerar estruturas executáveis
- Preparar ferramentas para o Workspace
==========================================
*/


// ==========================================
// TOOL TYPES
// ==========================================

const TOOL_TYPES = {

    spreadsheet: {

        id: "spreadsheet",

        name: "Planilha Inteligente",

        category: "Produtividade",

        formats: [
            "xlsx",
            "csv"
        ]

    },


    document: {

        id: "document",

        name: "Documento Inteligente",

        category: "Documentos",

        formats: [
            "docx",
            "pdf",
            "txt"
        ]

    },


    report: {

        id: "report",

        name: "Relatório Profissional",

        category: "Negócios",

        formats: [
            "pdf",
            "docx",
            "html"
        ]

    },


    dashboard: {

        id: "dashboard",

        name: "Dashboard Interativo",

        category: "Analytics",

        formats: [
            "html"
        ]

    },


    calculator: {

        id: "calculator",

        name: "Calculadora Inteligente",

        category: "Cálculo",

        formats: [
            "html"
        ]

    },


    form: {

        id: "form",

        name: "Formulário Inteligente",

        category: "Produtividade",

        formats: [
            "html"
        ]

    },


    website: {

        id: "website",

        name: "Website",

        category: "Web",

        formats: [
            "html",
            "css",
            "js"
        ]

    },


    application: {

        id: "application",

        name: "Aplicação Web",

        category: "Tecnologia",

        formats: [
            "html",
            "css",
            "js"
        ]

    },


    automation: {

        id: "automation",

        name: "Automação",

        category: "Automação",

        formats: [
            "js",
            "json"
        ]

    },


    template: {

        id: "template",

        name: "Template Profissional",

        category: "Produtividade",

        formats: [
            "docx",
            "xlsx",
            "html"
        ]

    },


    educational: {

        id: "educational",

        name: "Ferramenta Educacional",

        category: "Educação",

        formats: [
            "html",
            "pdf",
            "docx"
        ]

    },


    financial: {

        id: "financial",

        name: "Ferramenta Financeira",

        category: "Finanças",

        formats: [
            "xlsx",
            "html",
            "pdf"
        ]

    },


    banking: {

        id: "banking",

        name: "Ferramenta Bancária",

        category: "Finanças",

        formats: [
            "xlsx",
            "html",
            "pdf"
        ]

    }

};


// ==========================================
// TOOL KEYWORDS
// ==========================================

const TOOL_KEYWORDS = {

    spreadsheet: [

        "planilha",
        "excel",
        "folha de cálculo",
        "folha de calculo",
        "tabela automática",
        "tabela automatica",
        "ficheiro excel",
        "arquivo excel",
        "xlsx"

    ],


    document: [

        "documento",
        "word",
        "docx",
        "documento profissional",
        "contrato",
        "memorando",
        "ofício",
        "oficio"

    ],


    report: [

        "relatório",
        "relatorio",
        "relatório profissional",
        "relatorio profissional",
        "relatório empresarial",
        "relatorio empresarial",
        "relatório executivo",
        "relatorio executivo"

    ],


    dashboard: [

        "dashboard",
        "painel",
        "painel de controlo",
        "painel de controle",
        "indicadores",
        "kpi",
        "métricas",
        "metricas"

    ],


    calculator: [

        "calculadora",
        "simulador",
        "calcular",
        "cálculo",
        "calculo",
        "simulação",
        "simulacao"

    ],


    form: [

        "formulário",
        "formulario",
        "questionário",
        "questionario",
        "ficha",
        "form"

    ],


    website: [

        "site",
        "website",
        "página web",
        "pagina web",
        "landing page",
        "página",
        "pagina"

    ],


    application: [

        "aplicação",
        "aplicacao",
        "app",
        "sistema",
        "software",
        "plataforma"

    ],


    automation: [

        "automação",
        "automacao",
        "automatizar",
        "automatize",
        "workflow",
        "processo automático",
        "processo automatico"

    ],


    template: [

        "modelo",
        "template",
        "modelo pronto",
        "modelo profissional",
        "estrutura pronta"

    ]

};


// ==========================================
// AGENT TOOL PROFILES
// ==========================================

const AGENT_TOOL_PROFILES = {

    finance: [

        "financial",
        "spreadsheet",
        "dashboard",
        "calculator",
        "report"

    ],


    accounting: [

        "financial",
        "spreadsheet",
        "report",
        "dashboard",
        "calculator"

    ],


    banking: [

        "banking",
        "financial",
        "spreadsheet",
        "dashboard",
        "calculator",
        "report"

    ],


    excel: [

        "spreadsheet",
        "dashboard",
        "calculator",
        "template"

    ],


    education: [

        "educational",
        "document",
        "spreadsheet",
        "form",
        "report"

    ],


    healthcare: [

        "document",
        "report",
        "dashboard",
        "form",
        "spreadsheet"

    ],


    marketing: [

        "dashboard",
        "report",
        "template",
        "website",
        "form"

    ],


    socialmedia: [

        "template",
        "report",
        "dashboard",
        "website"

    ],


    sales: [

        "dashboard",
        "spreadsheet",
        "calculator",
        "report",
        "form"

    ],


    business: [

        "report",
        "dashboard",
        "spreadsheet",
        "template",
        "calculator"

    ],


    entrepreneur: [

        "financial",
        "business",
        "calculator",
        "report",
        "dashboard"

    ],


    document: [

        "document",
        "report",
        "template"

    ],


    image: [

        "template",
        "website"

    ],


    video: [

        "template",
        "document"

    ],


    security: [

        "dashboard",
        "report",
        "form",
        "document"

    ],


    developer: [

        "application",
        "website",
        "automation",
        "dashboard"

    ],


    architect: [

        "document",
        "report",
        "template"

    ],


    designer: [

        "website",
        "template",
        "application"

    ],


    ecommerce: [

        "dashboard",
        "spreadsheet",
        "website",
        "report"

    ],


    customer: [

        "form",
        "dashboard",
        "report",
        "template"

    ],


    translation: [

        "document",
        "template",
        "report"

    ],


    general: [

        "document",
        "spreadsheet",
        "report",
        "calculator",
        "dashboard",
        "website",
        "form",
        "template"

    ]

};


// ==========================================
// NORMALIZE TEXT
// ==========================================

function normalizeText(value){

    if(
        typeof value !== "string"
    ){

        return "";

    }


    return value

        .toLowerCase()

        .normalize("NFD")

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .trim();

}


// ==========================================
// CREATE ID
// ==========================================

function createToolId(){

    return (

        "tool_" +

        Date.now() +

        "_" +

        Math.random()

            .toString(36)

            .slice(2, 9)

    );

}


// ==========================================
// TOOL ENGINE
// ==========================================

export class ToolEngine {


    // ======================================
    // GET TOOL TYPE
    // ======================================

    static getToolType(type){

        if(
            !type ||
            !TOOL_TYPES[type]
        ){

            return null;

        }


        return {

            ...TOOL_TYPES[type],

            formats: [
                ...TOOL_TYPES[type].formats
            ]

        };

    }


    // ======================================
    // GET AGENT TOOLS
    // ======================================

    static getAgentToolTypes(
        agentId = "general"
    ){

        const normalizedAgentId =
            normalizeText(
                agentId
            );


        const profile =
            AGENT_TOOL_PROFILES[
                normalizedAgentId
            ] ||
            AGENT_TOOL_PROFILES.general;


        return profile.map(
            type => {

                const tool =
                    this.getToolType(
                        type
                    );

                return tool;

            }
        )
        .filter(Boolean);

    }


    // ======================================
    // DETECT TOOL REQUEST
    // ======================================

    static detectToolRequest(
        userPrompt = "",
        agent = null
    ){

        const text =
            normalizeText(
                userPrompt
            );


        if(!text){

            return {

                requested: false,

                type: null,

                score: 0,

                reason:
                    "empty_prompt"

            };

        }


        let bestType = null;

        let bestScore = 0;


        // ----------------------------------
        // KEYWORD ANALYSIS
        // ----------------------------------

        for(
            const [
                type,
                keywords
            ]
            of Object.entries(
                TOOL_KEYWORDS
            )
        ){

            let score = 0;


            for(
                const keyword
                of keywords
            ){

                const normalizedKeyword =
                    normalizeText(
                        keyword
                    );


                if(
                    text.includes(
                        normalizedKeyword
                    )
                ){

                    score += 0.25;

                }

            }


            if(
                score > bestScore
            ){

                bestScore =
                    score;

                bestType =
                    type;

            }

        }


        // ----------------------------------
        // DIRECT GENERATION INTENT
        // ----------------------------------

        const generationWords = [

            "cria",
            "crie",
            "criar",
            "gera",
            "gerar",
            "construa",
            "construir",
            "desenvolva",
            "desenvolver",
            "produza",
            "produzir",
            "monte",
            "montar",
            "prepare",
            "preparar",
            "faça",
            "faca"

        ];


        const hasGenerationIntent =
            generationWords.some(
                word =>
                    text.includes(
                        normalizeText(word)
                    )
            );


        if(
            hasGenerationIntent
        ){

            bestScore += 0.25;

        }


        // ----------------------------------
        // AGENT SPECIALIZATION BOOST
        // ----------------------------------

        if(
            agent &&
            agent.id
        ){

            const agentTools =
                AGENT_TOOL_PROFILES[
                    normalizeText(
                        agent.id
                    )
                ] ||
                [];


            if(
                bestType &&
                agentTools.includes(
                    bestType
                )
            ){

                bestScore +=
                    0.2;

            }

        }


        return {

            requested:
                Boolean(
                    bestType &&
                    bestScore >= 0.3
                ),

            type:
                bestType,

            score:
                Number(
                    Math.min(
                        bestScore,
                        1
                    ).toFixed(2)
                ),

            reason:
                bestType
                    ? "tool_intent_detected"
                    : "normal_chat"

        };

    }


    // ======================================
    // CREATE TOOL SPECIFICATION
    // ======================================

    static createTool({

        type,

        agent,

        userPrompt,

        title = null,

        description = null,

        inputs = [],

        outputs = []

    }){

        const toolType =
            this.getToolType(
                type
            );


        if(!toolType){

            return null;

        }


        const agentId =
            agent?.id ||
            "general";


        const toolTitle =
            title ||
            this.generateTitle(
                type,
                userPrompt,
                agent
            );


        const toolDescription =
            description ||
            this.generateDescription(
                type,
                userPrompt,
                agent
            );


        return {

            id:
                createToolId(),

            version:
                "1.0",

            type:
                toolType.id,

            name:
                toolTitle,

            description:
                toolDescription,

            category:
                toolType.category,

            agent: {

                id:
                    agentId,

                name:
                    agent?.name ||
                    "Honey IA",

                emoji:
                    agent?.emoji ||
                    "🐝"

            },

            status:
                "ready",

            formats:
                toolType.formats,

            inputs:
                Array.isArray(inputs)
                    ? inputs
                    : [],

            outputs:
                Array.isArray(outputs)
                    ? outputs
                    : [],

            sourcePrompt:
                String(
                    userPrompt || ""
                ),

            metadata: {

                createdAt:
                    new Date()
                        .toISOString(),

                generatedBy:
                    "Honey IA Tool Engine",

                enterprise:
                    true

            }

        };

    }


    // ======================================
    // GENERATE TITLE
    // ======================================

    static generateTitle(
        type,
        userPrompt = "",
        agent = null
    ){

        const tool =
            this.getToolType(
                type
            );


        if(!tool){

            return "Ferramenta Honey IA";

        }


        const agentName =
            agent?.name || "";


        if(agentName){

            return (
                tool.name +
                " — " +
                agentName
            );

        }


        return tool.name;

    }


    // ======================================
    // GENERATE DESCRIPTION
    // ======================================

    static generateDescription(
        type,
        userPrompt = "",
        agent = null
    ){

        const agentName =
            agent?.name ||
            "Honey IA";


        const tool =
            this.getToolType(
                type
            );


        if(!tool){

            return (
                `${agentName} criou uma ferramenta ` +
                "inteligente para o seu pedido."
            );

        }


        return (

            `${agentName} criou uma ` +

            `${tool.name.toLowerCase()} ` +

            `especializada para transformar ` +

            `o seu pedido em um resultado ` +

            "estruturado e utilizável."

        );

    }


    // ======================================
    // BUILD TOOL PROMPT
    // ======================================

    static buildToolPrompt({

        tool,

        agent,

        userPrompt,

        workspaceContext = {}

    }){

        if(!tool){

            return "";

        }


        return `

=== HONEY IA TOOL GENERATION ===

Você está a produzir uma ferramenta real
para o utilizador.

TIPO:
${tool.type}

NOME:
${tool.name}

CATEGORIA:
${tool.category}

AGENTE:
${agent?.name || "Honey IA"}

PEDIDO ORIGINAL:
${userPrompt}

OBJETIVO:
Transformar o pedido acima em uma ferramenta
profissional, funcional, clara e utilizável.

REGRAS:

1. A ferramenta deve resolver o problema
   solicitado pelo utilizador.

2. Não produza apenas uma descrição
   da ferramenta.

3. Produza o resultado concreto.

4. Quando for uma ferramenta web,
   produza HTML, CSS e JavaScript completos.

5. Quando for uma calculadora,
   implemente os cálculos necessários.

6. Quando for um dashboard,
   organize métricas, indicadores,
   filtros e visualizações.

7. Quando for uma planilha,
   produza uma estrutura completa
   com colunas, fórmulas e instruções.

8. Quando for um documento,
   produza conteúdo profissional
   pronto para utilização.

9. Quando for um relatório,
   organize informação em secções
   profissionais.

10. Quando for um formulário,
    inclua campos, validações
    e estrutura clara.

11. Quando for uma automação,
    descreva e produza a lógica
    necessária para implementação.

12. Preserve a especialidade do agente.

13. Não invente dados fornecidos pelo
    utilizador.

14. Quando faltarem dados,
    utilize campos parametrizáveis
    ou deixe claramente indicado
    onde os dados devem ser inseridos.

15. Priorize segurança, privacidade,
    desempenho e facilidade de utilização.

CONTEXTO DO WORKSPACE:

${
    workspaceContext &&
    typeof workspaceContext === "object"
        ? JSON.stringify(
            workspaceContext,
            null,
            2
        )
        : "{}"
}

=== END TOOL GENERATION ===

`;

    }


    // ======================================
    // PREPARE TOOL REQUEST
    // ======================================

    static prepareToolRequest({

        userPrompt,

        agent,

        workspaceContext = {}

    }){

        const detection =
            this.detectToolRequest(
                userPrompt,
                agent
            );


        if(
            !detection.requested
        ){

            return {

                requested: false,

                detection,

                tool: null,

                prompt: null

            };

        }


        const tool =
            this.createTool({

                type:
                    detection.type,

                agent,

                userPrompt

            });


        if(!tool){

            return {

                requested: false,

                detection,

                tool: null,

                prompt: null

            };

        }


        const prompt =
            this.buildToolPrompt({

                tool,

                agent,

                userPrompt,

                workspaceContext

            });


        return {

            requested: true,

            detection,

            tool,

            prompt

        };

    }


    // ======================================
    // FINALIZE TOOL
    // ======================================

    static finalizeTool({

        tool,

        response = ""

    }){

        if(!tool){

            return null;

        }


        return {

            ...tool,

            status:
                "generated",

            result: {

                content:
                    String(
                        response || ""
                    ),

                size:
                    String(
                        response || ""
                    ).length

            },

            metadata: {

                ...tool.metadata,

                generatedAt:
                    new Date()
                        .toISOString()

            }

        };

    }


    // ======================================
    // CHECK AGENT CAN PRODUCE TOOL
    // ======================================

    static canAgentProduceTool(
        agent,
        type
    ){

        if(
            !agent ||
            !type
        ){

            return false;

        }


        const allowed =
            AGENT_TOOL_PROFILES[
                normalizeText(
                    agent.id
                )
            ] ||
            AGENT_TOOL_PROFILES.general;


        return allowed.includes(
            type
        );

    }


    // ======================================
    // GET TOOL CATALOG
    // ======================================

    static getCatalog(){

        return Object.values(
            TOOL_TYPES
        ).map(
            tool => ({
                ...tool,

                formats: [
                    ...tool.formats
                ]

            })
        );

    }


    // ======================================
    // GET AGENT CATALOG
    // ======================================

    static getAgentCatalog(){

        return Object.entries(
            AGENT_TOOL_PROFILES
        ).map(
            ([agentId, tools]) => ({

                agentId,

                tools: [
                    ...tools
                ]

            })
        );

    }

}


// ==========================================
// TOOL FACTORY
// ==========================================

export class ToolFactory {


    static create({

        type,

        agent,

        userPrompt,

        title,

        description,

        inputs,

        outputs

    }){

        return ToolEngine.createTool({

            type,

            agent,

            userPrompt,

            title,

            description,

            inputs,

            outputs

        });

    }


    static fromRequest({

        userPrompt,

        agent,

        workspaceContext = {}

    }){

        return ToolEngine.prepareToolRequest({

            userPrompt,

            agent,

            workspaceContext

        });

    }

}


// ==========================================
// DEFAULT EXPORT
// ==========================================

export default ToolEngine;
