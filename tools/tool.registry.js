/*
==========================================
HONEY IA OS
TOOL REGISTRY
Enterprise Tool Registry
V1.0
==========================================
*/


/*
==========================================
TOOL REGISTRY
==========================================
*/

const tool_registry = {


    /*
    ======================================
    FILE
    ======================================
    */

    file_create: {

        id: "file_create",

        name: "Criador de Ficheiros",

        description:
            "Cria ficheiros estruturados a partir de conteúdo produzido pela Honey IA.",

        category: "files",

        version: "1.0",

        enabled: true,

        agents: [

            "general",
            "document",
            "writer",
            "developer",
            "education",
            "business",
            "marketing",
            "finance",
            "accounting"

        ],

        input: {

            type: "object",

            properties: {

                filename: {
                    type: "string"
                },

                content: {
                    type: "string"
                },

                mimeType: {
                    type: "string"
                }

            },

            required: [

                "filename",
                "content"

            ]

        },

        output: {

            type: "file",

            formats: [

                "txt",
                "md",
                "json",
                "csv",
                "html",
                "css",
                "js"

            ]

        }

    },


    /*
    ======================================
    EXCEL
    ======================================
    */

    excel_create: {

        id: "excel_create",

        name: "Gerador Excel",

        description:
            "Cria ficheiros Excel profissionais com folhas, dados, fórmulas, tabelas e estruturas empresariais.",

        category: "productivity",

        version: "1.0",

        enabled: true,

        agents: [

            "excel",
            "finance",
            "accounting",
            "banking",
            "business",
            "analytics",
            "education"

        ],

        input: {

            type: "object",

            properties: {

                filename: {
                    type: "string"
                },

                sheets: {
                    type: "array"
                },

                formulas: {
                    type: "array"
                },

                metadata: {
                    type: "object"
                }

            },

            required: [

                "filename",
                "sheets"

            ]

        },

        output: {

            type: "file",

            format: "xlsx",

            mimeType:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        }

    },


    /*
    ======================================
    EXCEL ANALYSIS
    ======================================
    */

    excel_analyze: {

        id: "excel_analyze",

        name: "Analisador Excel",

        description:
            "Analisa ficheiros Excel, identifica padrões, erros, indicadores e informações relevantes.",

        category: "analytics",

        version: "1.0",

        enabled: true,

        agents: [

            "excel",
            "finance",
            "accounting",
            "banking",
            "analytics",
            "business"

        ],

        input: {

            type: "object",

            properties: {

                file: {
                    type: "string"
                },

                instructions: {
                    type: "string"
                }

            },

            required: [

                "file"

            ]

        },

        output: {

            type: "analysis"

        }

    },


    /*
    ======================================
    PDF
    ======================================
    */

    pdf_create: {

        id: "pdf_create",

        name: "Gerador PDF",

        description:
            "Cria documentos PDF profissionais a partir de conteúdo estruturado.",

        category: "documents",

        version: "1.0",

        enabled: true,

        agents: [

            "general",
            "document",
            "writer",
            "education",
            "finance",
            "accounting",
            "banking",
            "business",
            "marketing",
            "healthcare",
            "legal"

        ],

        input: {

            type: "object",

            properties: {

                filename: {
                    type: "string"
                },

                title: {
                    type: "string"
                },

                content: {
                    type: "string"
                },

                metadata: {
                    type: "object"
                }

            },

            required: [

                "filename",
                "content"

            ]

        },

        output: {

            type: "file",

            format: "pdf",

            mimeType:
                "application/pdf"

        }

    },


    /*
    ======================================
    DOCUMENT
    ======================================
    */

    document_create: {

        id: "document_create",

        name: "Gerador de Documentos",

        description:
            "Cria documentos empresariais, académicos, administrativos e profissionais.",

        category: "documents",

        version: "1.0",

        enabled: true,

        agents: [

            "general",
            "document",
            "writer",
            "education",
            "legal",
            "business",
            "finance",
            "accounting",
            "healthcare",
            "banking"

        ],

        input: {

            type: "object",

            properties: {

                filename: {
                    type: "string"
                },

                title: {
                    type: "string"
                },

                sections: {
                    type: "array"
                },

                metadata: {
                    type: "object"
                }

            },

            required: [

                "filename",
                "sections"

            ]

        },

        output: {

            type: "file",

            format: "docx",

            mimeType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        }

    },


    /*
    ======================================
    CSV
    ======================================
    */

    csv_create: {

        id: "csv_create",

        name: "Gerador CSV",

        description:
            "Cria ficheiros CSV estruturados para dados, relatórios e sistemas empresariais.",

        category: "data",

        version: "1.0",

        enabled: true,

        agents: [

            "excel",
            "analytics",
            "finance",
            "accounting",
            "banking",
            "business",
            "research"

        ],

        input: {

            type: "object",

            properties: {

                filename: {
                    type: "string"
                },

                headers: {
                    type: "array"
                },

                rows: {
                    type: "array"
                }

            },

            required: [

                "filename",
                "headers",
                "rows"

            ]

        },

        output: {

            type: "file",

            format: "csv",

            mimeType:
                "text/csv"

        }

    },


    /*
    ======================================
    DATA ANALYSIS
    ======================================
    */

    data_analyze: {

        id: "data_analyze",

        name: "Analisador de Dados",

        description:
            "Analisa conjuntos de dados e produz indicadores, padrões, tendências e conclusões.",

        category: "analytics",

        version: "1.0",

        enabled: true,

        agents: [

            "analytics",
            "excel",
            "finance",
            "accounting",
            "banking",
            "business",
            "research",
            "education",
            "marketing"

        ],

        input: {

            type: "object",

            properties: {

                data: {
                    type: "array"
                },

                objective: {
                    type: "string"
                }

            },

            required: [

                "data",
                "objective"

            ]

        },

        output: {

            type: "analysis"

        }

    },


    /*
    ======================================
    CALCULATOR
    ======================================
    */

    calculator: {

        id: "calculator",

        name: "Calculadora Inteligente",

        description:
            "Executa cálculos matemáticos e financeiros com precisão.",

        category: "utilities",

        version: "1.0",

        enabled: true,

        agents: [

            "general",
            "finance",
            "accounting",
            "banking",
            "excel",
            "analytics",
            "education",
            "business"

        ],

        input: {

            type: "object",

            properties: {

                expression: {
                    type: "string"
                }

            },

            required: [

                "expression"

            ]

        },

        output: {

            type: "number"

        }

    },


    /*
    ======================================
    CHART
    ======================================
    */

    chart_create: {

        id: "chart_create",

        name: "Gerador de Gráficos",

        description:
            "Cria gráficos e visualizações para dados empresariais, financeiros, académicos e analíticos.",

        category: "visualization",

        version: "1.0",

        enabled: true,

        agents: [

            "analytics",
            "excel",
            "finance",
            "accounting",
            "banking",
            "business",
            "education",
            "marketing"

        ],

        input: {

            type: "object",

            properties: {

                type: {
                    type: "string"
                },

                title: {
                    type: "string"
                },

                labels: {
                    type: "array"
                },

                values: {
                    type: "array"
                }

            },

            required: [

                "type",
                "labels",
                "values"

            ]

        },

        output: {

            type: "artifact",

            formats: [

                "png",
                "svg"

            ]

        }

    },


    /*
    ======================================
    REPORT
    ======================================
    */

    report_create: {

        id: "report_create",

        name: "Gerador de Relatórios",

        description:
            "Produz relatórios profissionais estruturados com análise, indicadores, conclusões e recomendações.",

        category: "business",

        version: "1.0",

        enabled: true,

        agents: [

            "general",
            "business",
            "finance",
            "accounting",
            "banking",
            "analytics",
            "education",
            "healthcare",
            "marketing",
            "research",
            "document"

        ],

        input: {

            type: "object",

            properties: {

                title: {
                    type: "string"
                },

                executiveSummary: {
                    type: "string"
                },

                sections: {
                    type: "array"
                },

                recommendations: {
                    type: "array"
                }

            },

            required: [

                "title",
                "sections"

            ]

        },

        output: {

            type: "report",

            formats: [

                "pdf",
                "docx",
                "html"

            ]

        }

    },


    /*
    ======================================
    DASHBOARD
    ======================================
    */

    dashboard_create: {

        id: "dashboard_create",

        name: "Gerador de Dashboard",

        description:
            "Cria estruturas de dashboards empresariais para indicadores, operações e análise de desempenho.",

        category: "analytics",

        version: "1.0",

        enabled: true,

        agents: [

            "analytics",
            "finance",
            "accounting",
            "banking",
            "business",
            "marketing",
            "sales"

        ],

        input: {

            type: "object",

            properties: {

                title: {
                    type: "string"
                },

                metrics: {
                    type: "array"
                },

                charts: {
                    type: "array"
                },

                filters: {
                    type: "array"
                }

            },

            required: [

                "title",
                "metrics"

            ]

        },

        output: {

            type: "artifact",

            format: "html"

        }

    },


    /*
    ======================================
    CODE GENERATOR
    ======================================
    */

    code_create: {

        id: "code_create",

        name: "Gerador de Código",

        description:
            "Produz código completo e estruturado para aplicações, APIs, websites, automações e sistemas.",

        category: "development",

        version: "1.0",

        enabled: true,

        agents: [

            "developer",
            "architect",
            "automation",
            "general",
            "business"

        ],

        input: {

            type: "object",

            properties: {

                language: {
                    type: "string"
                },

                filename: {
                    type: "string"
                },

                code: {
                    type: "string"
                }

            },

            required: [

                "language",
                "code"

            ]

        },

        output: {

            type: "artifact",

            formats: [

                "js",
                "ts",
                "py",
                "html",
                "css",
                "json",
                "sql",
                "php"

            ]

        }

    },


    /*
    ======================================
    WEB SEARCH
    ======================================
    */

    web_search: {

        id: "web_search",

        name: "Pesquisa Web",

        description:
            "Pesquisa informação atualizada na internet quando essa capacidade estiver disponível.",

        category: "research",

        version: "1.0",

        enabled: true,

        agents: [

            "general",
            "research",
            "marketing",
            "business",
            "sales",
            "education",
            "translation",
            "banking",
            "finance"

        ],

        input: {

            type: "object",

            properties: {

                query: {
                    type: "string"
                }

            },

            required: [

                "query"

            ]

        },

        output: {

            type: "search_results"

        }

    }


};


/*
==========================================
REGISTRY HELPERS
==========================================
*/


export function getTool(

    toolId

){

    if(

        typeof toolId !== "string"

    ){

        return null;

    }


    return (

        tool_registry[
            toolId
                .trim()
                .toLowerCase()
        ]

        || null

    );

}


/*
==========================================
GET ALL TOOLS
==========================================
*/


export function getAllTools(){

    return Object.values(

        tool_registry

    );

}


/*
==========================================
GET ENABLED TOOLS
==========================================
*/


export function getEnabledTools(){

    return getAllTools()

        .filter(

            tool =>

                tool.enabled === true

        );

}


/*
==========================================
GET AGENT TOOLS
==========================================
*/


export function getAgentTools(

    agentId

){

    if(

        typeof agentId !== "string" ||

        !agentId.trim()

    ){

        return [];

    }


    const normalizedAgentId =

        agentId

            .trim()

            .toLowerCase();


    return getEnabledTools()

        .filter(

            tool =>

                Array.isArray(

                    tool.agents

                )

                &&

                tool.agents.includes(

                    normalizedAgentId

                )

        );

}


/*
==========================================
CHECK TOOL PERMISSION
==========================================
*/


export function agentCanUseTool(

    agentId,

    toolId

){

    const tool =

        getTool(

            toolId

        );


    if(!tool){

        return false;

    }


    if(

        tool.enabled !== true

    ){

        return false;

    }


    if(

        !Array.isArray(

            tool.agents

        )

    ){

        return false;

    }


    return tool.agents.includes(

        String(agentId)

            .trim()

            .toLowerCase()

    );

}


/*
==========================================
TOOL SUMMARY
==========================================
*/


export function getToolSummary(

    agentId

){

    return getAgentTools(

        agentId

    ).map(

        tool => ({

            id:
                tool.id,

            name:
                tool.name,

            description:
                tool.description,

            category:
                tool.category,

            input:
                tool.input,

            output:
                tool.output

        })

    );

}


/*
==========================================
DEFAULT EXPORT
==========================================
*/


export default tool_registry;
