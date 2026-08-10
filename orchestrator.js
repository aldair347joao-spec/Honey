/*
==========================================
HONEY IA OS
ORCHESTRATOR ENGINE V7.0
Enterprise Multi-Agent Runtime
Groq AI Integration
30+ Specialist Agents
Intelligent Agent Routing
Agent Personality Engine
Prompt Engineering
Workspace Context
Conversation Memory
Streaming
Artifacts
Tool Runtime Preparation
Enterprise Telemetry
==========================================
*/


// ==========================================================
// CORE AGENTS
// ==========================================================

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


// ==========================================================
// ENTERPRISE AGENTS
// ==========================================================

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


// ==========================================================
// CENTRAL AGENT REGISTRY
// ==========================================================

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


// ==========================================================
// AGENT NORMALIZATION
// ==========================================================

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


        if(!agent.emoji){

            agent.emoji =
                "🤖";

        }


        if(!Array.isArray(agent.tools)){

            agent.tools = [];

        }


        if(!Array.isArray(agent.capabilities)){

            agent.capabilities = [];

        }


        if(!Array.isArray(agent.keywords)){

            agent.keywords = [];

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


        if(
            typeof agent.temperature !==
            "number"
        ){

            agent.temperature =
                0.5;

        }


        if(
            typeof agent.maxTokens !==
            "number"
        ){

            agent.maxTokens =
                4096;

        }

    }
);


// ==========================================================
// ROUTING DOMAIN INTELLIGENCE
//
// Serve como camada adicional para agentes que ainda não
// possuam keywords próprias.
// ==========================================================

const routing_domains = {

    architect: [

        "arquitetura",
        "arquiteto",
        "planta",
        "plantas",
        "edifício",
        "edificio",
        "construção",
        "construcao",
        "fachada",
        "espaço",
        "espaco",
        "ambiente",
        "layout arquitetónico",
        "layout arquitetonico"

    ],


    designer: [

        "design",
        "designer",
        "ui",
        "ux",
        "interface",
        "identidade visual",
        "branding",
        "logotipo",
        "logo",
        "tipografia",
        "paleta",
        "protótipo",
        "prototipo"

    ],


    developer: [

        "programar",
        "programação",
        "programacao",
        "código",
        "codigo",
        "software",
        "website",
        "site",
        "aplicação",
        "aplicacao",
        "app",
        "api",
        "backend",
        "frontend",
        "full stack",
        "fullstack",
        "javascript",
        "typescript",
        "python",
        "react",
        "node",
        "mongodb",
        "postgresql",
        "html",
        "css",
        "bug",
        "erro no código",
        "erro no codigo"

    ],


    education: [

        "educação",
        "educacao",
        "escola",
        "escolas",
        "professor",
        "professora",
        "aluno",
        "alunos",
        "estudante",
        "estudantes",
        "aula",
        "aulas",
        "currículo",
        "curriculo",
        "plano de aula",
        "plano de estudo",
        "avaliação",
        "avaliacao",
        "exercício",
        "exercicio",
        "universidade",
        "instituição de ensino",
        "instituicao de ensino",
        "curso",
        "formação",
        "formacao",
        "aprendizagem",
        "ensino",
        "pedagogia"

    ],


    excel: [

        "excel",
        "planilha",
        "planilhas",
        "spreadsheet",
        "fórmula",
        "formula",
        "função excel",
        "tabela dinâmica",
        "tabela dinamica",
        "vlookup",
        "procv",
        "xlookup",
        "procx",
        "power query",
        "dashboard excel",
        "google sheets",
        "folha de cálculo",
        "folha de calculo"

    ],


    finance: [

        "finanças",
        "financas",
        "financeiro",
        "financeira",
        "receita",
        "despesa",
        "lucro",
        "prejuízo",
        "prejuizo",
        "orçamento",
        "orcamento",
        "rentabilidade",
        "margem",
        "kpi financeiro",
        "fluxo financeiro"

    ],


    healthcare: [

        "saúde",
        "saude",
        "hospital",
        "hospitais",
        "clínica",
        "clinica",
        "clínicas",
        "clinicas",
        "médico",
        "medico",
        "médica",
        "medica",
        "enfermeiro",
        "enfermagem",
        "paciente",
        "pacientes",
        "consulta",
        "consultas",
        "prontuário",
        "prontuario",
        "farmácia",
        "farmacia",
        "laboratório",
        "laboratorio"

    ],


    image: [

        "imagem",
        "imagens",
        "gerar imagem",
        "criar imagem",
        "banner",
        "cartaz",
        "poster",
        "visual",
        "arte",
        "ilustração",
        "ilustracao",
        "fotografia",
        "direção artística",
        "direcao artistica"

    ],


    legal: [

        "lei",
        "legal",
        "jurídico",
        "juridico",
        "contrato",
        "contratos",
        "advogado",
        "advogada",
        "processo judicial",
        "processo jurídico",
        "processo juridico",
        "cláusula",
        "clausula",
        "direito",
        "legislação",
        "legislacao"

    ],


    marketing: [

        "marketing",
        "campanha",
        "publicidade",
        "publicitário",
        "publicitario",
        "marca",
        "posicionamento",
        "cliente",
        "clientes",
        "vendas",
        "aquisição",
        "aquisicao",
        "leads",
        "funil",
        "conversão",
        "conversao",
        "anúncio",
        "anuncio"

    ],


    sales: [

        "venda",
        "vendas",
        "vendedor",
        "vendedor",
        "cliente potencial",
        "lead",
        "prospecção",
        "prospeccao",
        "pipeline",
        "crm",
        "negociação",
        "negociacao",
        "fechar venda",
        "fechar negócio",
        "fechar negocio"

    ],


    security: [

        "segurança",
        "seguranca",
        "cibersegurança",
        "ciberseguranca",
        "cybersecurity",
        "hack",
        "hacking",
        "vulnerabilidade",
        "vulnerabilidades",
        "firewall",
        "malware",
        "phishing",
        "ransomware",
        "auditoria de segurança",
        "auditoria de seguranca",
        "pentest",
        "zero trust",
        "proteção de dados",
        "protecao de dados"

    ],


    video: [

        "vídeo",
        "video",
        "vídeos",
        "videos",
        "roteiro",
        "storyboard",
        "filmagem",
        "cinema",
        "reels",
        "youtube",
        "produção audiovisual",
        "producao audiovisual",
        "edição de vídeo",
        "edicao de video"

    ],


    writer: [

        "escrever",
        "escrita",
        "texto",
        "artigo",
        "redação",
        "redacao",
        "copy",
        "copywriting",
        "ebook",
        "livro",
        "história",
        "historia",
        "post",
        "conteúdo escrito",
        "conteudo escrito"

    ],


    document: [

        "documento",
        "documentos",
        "pdf",
        "word",
        "relatório",
        "relatorio",
        "resumo de documento",
        "extrair texto",
        "analisar documento",
        "comparar documentos",
        "arquivo",
        "ficheiro"

    ],


    banking: [

        "banco",
        "bancário",
        "bancaria",
        "bancária",
        "conta bancária",
        "conta bancaria",
        "transferência",
        "transferencia",
        "pagamento bancário",
        "pagamento bancario",
        "depósito",
        "deposito",
        "levantamento",
        "crédito bancário",
        "credito bancario",
        "empréstimo",
        "emprestimo",
        "financiamento",
        "juros",
        "taxa bancária",
        "taxa bancaria",
        "comissão bancária",
        "comissao bancaria",
        "tesouraria",
        "liquidez",
        "cash flow",
        "fluxo de caixa",
        "reconciliação bancária",
        "reconciliacao bancaria",
        "transação bancária",
        "transacao bancaria",
        "fraude bancária",
        "fraude bancaria",
        "kyc",
        "aml",
        "compliance bancário",
        "compliance bancario",
        "open banking",
        "api bancária",
        "api bancaria",
        "iban",
        "swift"

    ],


    entrepreneur: [

        "empreendedor",
        "empreendedora",
        "empreendedorismo",
        "startup",
        "começar empresa",
        "comecar empresa",
        "abrir empresa",
        "ideia de negócio",
        "ideia de negocio",
        "modelo de negócio",
        "modelo de negocio",
        "fundador",
        "fundadora"

    ],


    interiordesign: [

        "interior",
        "design de interiores",
        "decoração",
        "decoracao",
        "móveis",
        "moveis",
        "sala",
        "quarto",
        "cozinha",
        "banheiro",
        "casa",
        "ambiente interior"

    ],


    ecommerce: [

        "e-commerce",
        "ecommerce",
        "loja online",
        "loja virtual",
        "produto online",
        "checkout",
        "carrinho",
        "shopify",
        "marketplace",
        "comércio eletrónico",
        "comercio eletronico"

    ],


    socialmedia: [

        "instagram",
        "facebook",
        "tiktok",
        "linkedin",
        "twitter",
        "x.com",
        "redes sociais",
        "social media",
        "seguidores",
        "engajamento",
        "engagement",
        "calendário de conteúdo",
        "calendario de conteudo",
        "reels",
        "stories"

    ],


    research: [

        "pesquisa",
        "pesquisar",
        "investigação",
        "investigacao",
        "estudo",
        "estudo de mercado",
        "artigo científico",
        "artigo cientifico",
        "literatura",
        "referências",
        "referencias",
        "fontes",
        "dados de pesquisa"

    ],


    automation: [

        "automação",
        "automacao",
        "automatizar",
        "workflow",
        "workflows",
        "processo automático",
        "processo automatico",
        "integração",
        "integracao",
        "zapier",
        "make",
        "n8n",
        "produtividade automática",
        "produtividade automatizada"

    ],


    analytics: [

        "analytics",
        "análise de dados",
        "analise de dados",
        "dados",
        "métricas",
        "metricas",
        "dashboard",
        "indicadores",
        "kpi",
        "bi",
        "business intelligence",
        "estatística",
        "estatistica",
        "previsão",
        "previsao"

    ],


    customer: [

        "atendimento",
        "cliente",
        "clientes",
        "suporte",
        "reclamação",
        "reclamacao",
        "satisfação",
        "satisfacao",
        "experiência do cliente",
        "experiencia do cliente",
        "customer service",
        "customer experience",
        "sac"

    ],


    translation: [

        "traduzir",
        "tradução",
        "traducao",
        "translate",
        "translation",
        "idioma",
        "idiomas",
        "inglês",
        "ingles",
        "francês",
        "frances",
        "espanhol",
        "português",
        "portugues",
        "localização",
        "localizacao"

    ],


    business: [

        "empresa",
        "empresarial",
        "gestão",
        "gestao",
        "gestor",
        "gestora",
        "negócio",
        "negocio",
        "operações",
        "operacoes",
        "processos internos",
        "estratégia empresarial",
        "estrategia empresarial",
        "crescimento empresarial"

    ],


    accounting: [

        "contabilidade",
        "contabilista",
        "contabilista certificado",
        "contabilização",
        "contabilizacao",
        "balanço",
        "balanco",
        "balancete",
        "iva",
        "imposto",
        "impostos",
        "fiscal",
        "fiscalidade",
        "depreciação",
        "depreciacao",
        "demonstrações financeiras",
        "demonstracoes financeiras",
        "razão",
        "razao",
        "lançamento contabilístico",
        "lancamento contabilistico"

    ],


    strategist: [

        "estratégia",
        "estrategia",
        "planeamento estratégico",
        "planeamento estrategico",
        "planejamento estratégico",
        "planejamento estrategico",
        "visão estratégica",
        "visao estrategica",
        "roadmap",
        "plano estratégico",
        "plano estrategico",
        "decisão estratégica",
        "decisao estrategica"

    ]

};


// ==========================================================
// TEXT NORMALIZATION
// ==========================================================

function normalizeText(
    value = ""
){

    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /[^\p{L}\p{N}\s_-]/gu,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();

}


// ==========================================================
// TOKENIZATION
// ==========================================================

function tokenize(
    value = ""
){

    return [
        ...new Set(
            normalizeText(value)
                .split(/\s+/)
                .filter(
                    token =>
                        token.length >= 3
                )
        )
    ];

}


// ==========================================================
// AGENT ROUTER
// ==========================================================

export class agentrouter {


    static selectagent(
        usermessage = "",
        forcedagentid = null
    ){

        const forced =
            forcedagentid
                ? String(
                    forcedagentid
                )
                    .toLowerCase()
                    .trim()
                : null;


        // ==================================================
        // EXPLICIT AGENT
        // ==================================================

        if(
            forced &&
            agents_registry[forced]
        ){

            return {

                agent:
                    agents_registry[forced],

                score:
                    1,

                reason:
                    "forced_by_user"

            };

        }


        // ==================================================
        // EMPTY MESSAGE
        // ==================================================

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
            normalizeText(
                usermessage
            );


        const tokens =
            tokenize(
                usermessage
            );


        let bestAgent =
            generalagent;


        let bestScore =
            0;


        const scores = {};


        // ==================================================
        // ANALYZE EVERY AGENT
        // ==================================================

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


            let evidence =
                0;


            // ==============================================
            // EXPLICIT CAN HANDLE
            // ==============================================

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

                        evidence +=
                            1;

                    }


                    else if(
                        typeof result ===
                        "number"
                    ){

                        score +=
                            Math.max(
                                0,
                                Math.min(
                                    result,
                                    1
                                )
                            );

                        evidence +=
                            1;

                    }

                }

                catch(error){

                    console.warn(
                        `[Router] canHandle(${id}):`,
                        error.message
                    );

                }

            }


            // ==============================================
            // AGENT KEYWORDS
            // ==============================================

            const agentKeywords = [

                ...(Array.isArray(agent.keywords)
                    ? agent.keywords
                    : []),

                ...(Array.isArray(
                    routing_domains[id]
                )
                    ? routing_domains[id]
                    : [])

            ];


            const normalizedKeywords =
                agentKeywords
                    .map(
                        keyword =>
                            normalizeText(
                                keyword
                            )
                    )
                    .filter(Boolean);


            const keywordMatches =
                normalizedKeywords.filter(
                    keyword => {

                        if(
                            keyword.includes(" ")
                        ){

                            return text.includes(
                                keyword
                            );

                        }


                        return tokens.includes(
                            keyword
                        );

                    }
                );


            const uniqueKeywordMatches =
                [
                    ...new Set(
                        keywordMatches
                    )
                ];


            if(
                uniqueKeywordMatches.length
            ){

                score += Math.min(
                    0.75,
                    uniqueKeywordMatches.length *
                    0.15
                );

                evidence +=
                    uniqueKeywordMatches.length;

            }


            // ==============================================
            // NAME MATCH
            // ==============================================

            if(agent.name){

                const agentName =
                    normalizeText(
                        agent.name
                    );


                if(
                    text.includes(
                        agentName
                    )
                ){

                    score +=
                        0.3;

                    evidence +=
                        1;

                }

            }


            // ==============================================
            // CATEGORY MATCH
            // ==============================================

            if(agent.category){

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
                        0.15;

                    evidence +=
                        1;

                }

            }


            // ==============================================
            // DESCRIPTION MATCH
            // ==============================================

            if(agent.description){

                const descriptionTokens =
                    tokenize(
                        agent.description
                    );


                let descriptionMatches =
                    0;


                for(
                    const token
                    of descriptionTokens
                ){

                    if(
                        tokens.includes(
                            token
                        )
                    ){

                        descriptionMatches++;

                    }

                }


                if(
                    descriptionMatches
                ){

                    score += Math.min(
                        0.25,
                        descriptionMatches *
                        0.03
                    );

                    evidence +=
                        descriptionMatches;

                }

            }


            // ==============================================
            // CAPABILITIES MATCH
            // ==============================================

            if(
                Array.isArray(
                    agent.capabilities
                )
            ){

                let capabilityMatches =
                    0;


                for(
                    const capability
                    of agent.capabilities
                ){

                    const capabilityTokens =
                        tokenize(
                            capability
                        );


                    const matched =
                        capabilityTokens.some(
                            token =>
                                tokens.includes(
                                    token
                                )
                        );


                    if(matched){

                        capabilityMatches++;

                    }

                }


                if(
                    capabilityMatches
                ){

                    score += Math.min(
                        0.35,
                        capabilityMatches *
                        0.04
                    );

                    evidence +=
                        capabilityMatches;

                }

            }


            // ==============================================
            // AGENT LEVEL BONUS
            // ==============================================

            if(
                agent.level ===
                "Enterprise" &&
                score > 0
            ){

                score +=
                    0.02;

            }


            // ==============================================
            // GENERAL PENALTY
            //
            // General should not steal specialized requests.
            // ==============================================

            if(
                id === "general" &&
                score > 0
            ){

                score *=
                    0.35;

            }


            scores[id] = {

                score,

                evidence

            };


            // ==============================================
            // BEST AGENT
            // ==============================================

            if(
                score >
                bestScore
            ){

                bestScore =
                    score;

                bestAgent =
                    agent;

            }

        }


        // ==================================================
        // LOW CONFIDENCE
        // ==================================================

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
                bestAgent,

            score:
                Number(
                    Math.min(
                        bestScore,
                        1
                    ).toFixed(2)
                ),

            reason:
                "smart_agent_match",

            scores

        };

    }

}


// ==========================================================
// PROMPT FACTORY
// ==========================================================

export class promptfactory {


    // ======================================================
    // EXTRACT BASE SYSTEM PROMPT
    // ======================================================

    static extractsystemprompt(
        agent
    ){

        if(!agent){

            return `
Você é a Honey IA,
uma inteligência artificial
profissional.

Responda de forma clara,
segura, útil e orientada
para resultados.
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
                    "[PromptFactory] systemPrompt():",
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
    Array.isArray(agent.capabilities) &&
    agent.capabilities.length

        ? "- " +
          agent.capabilities.join(
              "\n- "
          )

        : "- Fornecer assistência profissional."
}

Responda de forma:

- clara;
- profissional;
- segura;
- objetiva;
- orientada para resultados.

`;

    }


    // ======================================================
    // AGENT IDENTITY
    // ======================================================

    static injectagentidentity(
        prompt,
        agent
    ){

        if(!agent){

            return prompt;

        }


        let identity = `

==========================================================
HONEY IA — AGENT IDENTITY
==========================================================

Agente:
${agent.name || "Honey IA"}

ID:
${agent.id || "general"}

Categoria:
${agent.category || "Geral"}

Nível:
${agent.level || "Professional"}

Descrição:
${agent.description || ""}

`;



        if(
            Array.isArray(
                agent.capabilities
            ) &&
            agent.capabilities.length
        ){

            identity += `

CAPACIDADES DO AGENTE:

- ${
    agent.capabilities.join(
        "\n- "
    )
}

`;

        }


        if(
            Array.isArray(
                agent.tools
            ) &&
            agent.tools.length
        ){

            identity += `

DOMÍNIOS E TECNOLOGIAS CONHECIDOS:

- ${
    agent.tools.join(
        "\n- "
    )
}

`;

        }


        identity += `

REGRA DE IDENTIDADE:

Você está a atuar especificamente
como ${agent.name || "este agente"}.

Não abandone a sua especialidade sem motivo.

Quando o pedido estiver claramente dentro
da sua área, responda como especialista.

Quando o pedido estiver fora da sua área,
seja transparente e, quando apropriado,
oriente o utilizador para o agente Honey IA
mais adequado.

Não invente capacidades, dados,
resultados ou informações externas.
`;



        return prompt +
            identity;

    }


    // ======================================================
    // WORKSPACE CONTEXT
    // ======================================================

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
            Object.keys(
                workspaceContext
            ).length
        ){

            finalPrompt += `

==========================================================
CONTEXTO DO WORKSPACE
==========================================================
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


            if(
                workspaceContext.instructions
            ){

                finalPrompt += `
Instruções do Workspace:
${workspaceContext.instructions}
`;

            }

        }


        if(
            Array.isArray(
                userMemory
            ) &&
            userMemory.length
        ){

            finalPrompt += `

==========================================================
MEMÓRIA DO UTILIZADOR
==========================================================
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
                            typeof memory ===
                            "string"

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


    // ======================================================
    // MODE RULES
    // ======================================================

    static applymoderules(
        prompt,
        mode = "chat"
    ){

        if(
            mode === "live"
        ){

            return prompt + `

==========================================================
MODO LIVE
==========================================================

- Responda naturalmente.
- Seja direto.
- Use frases relativamente curtas.
- Evite excesso de estrutura.
- Mantenha uma conversa fluida.
- Não sacrifique precisão.
`;

        }


        return prompt + `

==========================================================
MODO TEXTO
==========================================================

- Estruture a resposta.
- Use Markdown quando ajudar.
- Utilize títulos e listas quando apropriado.
- Explique como especialista.
- Forneça soluções práticas.
- Não desperdice espaço com introduções vazias.
- Quando criar código, entregue código completo
  e consistente.
`;

    }


    // ======================================================
    // OUTPUT RULES
    // ======================================================

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

==========================================================
HONEY IA — OUTPUT ENGINE
==========================================================

Quando o utilizador pedir um resultado concreto,
priorize entregar o resultado.

Não responda apenas dizendo como fazer
quando o utilizador pediu que você faça.

Tipos de resultado potencialmente suportados:

${
    outputTypes.length
        ? outputTypes.join(
            ", "
        )
        : "texto, código, análise, documentação e conteúdo estruturado"
}

REGRAS:

- Não inventar dados.
- Não inventar ficheiros que não foram criados.
- Não afirmar que executou algo se não executou.
- Não afirmar que consultou a internet se não consultou.
- Não afirmar que criou um artefacto real se apenas forneceu código.
- Diferenciar claramente exemplos, estimativas e resultados reais.

Quando produzir código:

- código completo;
- código consistente;
- sem secrets;
- sem credenciais;
- com tratamento de erros quando necessário;
- estrutura profissional.

`;

    }


    // ======================================================
    // PROFESSIONAL RESPONSE ENGINE
    // ======================================================

    static injectresponsebehavior(
        prompt,
        agent
    ){

        return prompt + `

==========================================================
COMPORTAMENTO PROFISSIONAL
==========================================================

O objetivo não é apenas responder.

O objetivo é ajudar o utilizador a chegar
a uma solução.

Sempre que apropriado:

1. compreenda o objetivo;
2. identifique os requisitos;
3. analise limitações;
4. proponha uma solução;
5. execute intelectualmente a tarefa;
6. apresente o resultado;
7. indique próximos passos quando necessário.

Se faltarem informações críticas:

- não invente;
- identifique exatamente o que falta;
- continue com pressupostos razoáveis quando possível;
- deixe os pressupostos explícitos.

Quando existirem várias soluções:

- compare;
- explique vantagens e limitações;
- recomende uma opção quando houver
  informação suficiente.

Você representa a qualidade profissional
da Honey IA.

`;

    }


    // ======================================================
    // BUILD GROQ MESSAGES
    // ======================================================

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
            this.injectagentidentity(
                systemPrompt,
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


        systemPrompt =
            this.injectresponsebehavior(
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
                    .slice(
                        -30
                    )
                    .map(
                        item => {

                            const role =
                                item.role ===
                                "user"

                                    ? "user"

                                    : item.role ===
                                      "system"

                                        ? "system"

                                        : "assistant";


                            return {

                                role,

                                content:
                                    item.content

                            };

                        }
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
                        userPrompt ||
                        ""
                    )

            }

        ];

    }

}


// ==========================================================
// TOOL ORCHESTRATOR
//
// Preparado para ferramentas reais.
// Não declara ferramentas falsas para o Groq.
// ==========================================================

export class toolorchestrator {


    static getavailabletools(
        agent
    ){

        if(!agent){

            return undefined;

        }


        /*
        ======================================================
        FUTURE EXECUTABLE TOOLS

        Um agente pode futuramente possuir:

        executableTools: [
            {
                name,
                description,
                parameters,
                handler
            }
        ]

        Apenas ferramentas realmente executáveis
        devem ser expostas ao Groq.
        ======================================================
        */


        if(
            !Array.isArray(
                agent.executableTools
            )
        ){

            return undefined;

        }


        const tools =
            agent.executableTools
                .filter(
                    tool =>
                        tool &&
                        typeof tool.name ===
                        "string" &&
                        typeof tool.description ===
                        "string" &&
                        tool.parameters
                )
                .map(
                    tool => ({

                        type:
                            "function",

                        function: {

                            name:
                                tool.name,

                            description:
                                tool.description,

                            parameters:
                                tool.parameters

                        }

                    })
                );


        return tools.length
            ? tools
            : undefined;

    }


    static gethandlers(
        agent
    ){

        if(
            !agent ||
            !Array.isArray(
                agent.executableTools
            )
        ){

            return {};

        }


        const handlers = {};


        agent.executableTools
            .forEach(
                tool => {

                    if(
                        tool &&
                        typeof tool.name ===
                        "string" &&
                        typeof tool.handler ===
                        "function"
                    ){

                        handlers[
                            tool.name
                        ] =
                            tool.handler;

                    }

                }
            );


        return handlers;

    }

}


// ==========================================================
// ARTIFACT ENGINE
// ==========================================================

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

        let index =
            0;


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


            index++;


            artifacts.push({

                id:
                    this.createId(),

                name:
                    this.createArtifactName(
                        language,
                        extension,
                        index
                    ),

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
                    Buffer.byteLength(
                        content,
                        "utf8"
                    )

            });

        }


        return artifacts;

    }


    static createArtifactName(
        language,
        extension,
        index
    ){

        if(
            language ===
            "html" &&
            index === 1
        ){

            return "index.html";

        }


        if(
            language ===
            "css" &&
            index === 1
        ){

            return "style.css";

        }


        if(
            (
                language ===
                "javascript" ||
                language ===
                "js"
            ) &&
            index === 1
        ){

            return "script.js";

        }


        if(
            language ===
            "typescript" ||
            language ===
            "ts"
        ){

            return `honey-result-${index}.ts`;

        }


        return `honey-result-${index}.${extension}`;

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

            csharp:
                "cs",

            cs:
                "cs",

            php:
                "php",

            jsx:
                "jsx",

            tsx:
                "tsx",

            go:
                "go",

            rust:
                "rs",

            bash:
                "sh",

            shell:
                "sh",

            yaml:
                "yaml",

            yml:
                "yml",

            markdown:
                "md",

            md:
                "md",

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

            csharp:
                "text/plain",

            cs:
                "text/plain",

            php:
                "text/plain",

            jsx:
                "text/javascript",

            tsx:
                "text/typescript",

            go:
                "text/plain",

            rust:
                "text/plain",

            bash:
                "text/plain",

            shell:
                "text/plain",

            yaml:
                "text/yaml",

            yml:
                "text/yaml",

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
                .slice(2,9)
        );

    }

}


// ==========================================================
// AGENT CONFIGURATION
// ==========================================================

function getAgentModelConfig(
    agent
){

    return {

        model:
            agent?.model ||
            "llama-3.3-70b-versatile",

        temperature:
            typeof agent?.temperature ===
            "number"

                ? agent.temperature

                : 0.5,

        max_tokens:
            typeof agent?.maxTokens ===
            "number"

                ? agent.maxTokens

                : 4096

    };

}


// ==========================================================
// GROQ RESPONSE EXTRACTION
// ==========================================================

function extractCompletionResponse(
    completion
){

    return (
        completion
            ?.choices?.[0]
            ?.message
            ?.content
        ||
        "Sem resposta gerada."
    );

}


// ==========================================================
// ORCHESTRATOR MAIN ENGINE
// ==========================================================

export class Orchestrator {


    constructor(
        groqClient = null
    ){

        this.groq =
            groqClient;

    }


    // ======================================================
    // SET GROQ
    // ======================================================

    setGroqClient(
        client
    ){

        this.groq =
            client;

    }


    // ======================================================
    // GET AGENT
    // ======================================================

    getAgent(
        agentId
    ){

        const id =
            String(
                agentId ||
                "general"
            )
                .toLowerCase()
                .trim();


        return (
            agents_registry[id] ||
            generalagent
        );

    }


    // ======================================================
    // PROCESS REQUEST
    // ======================================================

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


        // ==================================================
        // ROUTING
        // ==================================================

        const selection =
            agentrouter.selectagent(
                userPrompt,
                agentId
            );


        const agent =
            selection.agent;


        try{

            // ==================================================
            // GROQ VALIDATION
            // ==================================================

            if(!this.groq){

                throw new Error(
                    "Groq SDK não inicializada."
                );

            }


            // ==================================================
            // MESSAGE BUILDING
            // ==================================================

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


            // ==================================================
            // TOOLS
            // ==================================================

            const tools =
                toolorchestrator
                    .getavailabletools(
                        agent
                    );


            // ==================================================
            // MODEL CONFIG
            // ==================================================

            const config =
                getAgentModelConfig(
                    agent
                );


            const payload = {

                model:
                    config.model,

                messages,

                temperature:
                    config.temperature,

                max_tokens:
                    config.max_tokens

            };


            if(tools){

                payload.tools =
                    tools;

            }


            // ==================================================
            // GROQ REQUEST
            // ==================================================

            const completion =
                await this.groq
                    .chat
                    .completions
                    .create(
                        payload
                    );


            // ==================================================
            // RESPONSE
            // ==================================================

            let response =
                extractCompletionResponse(
                    completion
                );


            // ==================================================
            // AGENT POST PROCESSING
            // ==================================================

            if(
                typeof agent.after ===
                "function"
            ){

                try{

                    response =
                        await agent.after(
                            response,
                            {
                                userPrompt,
                                history,
                                workspaceContext,
                                userMemory
                            }
                        );

                }

                catch(error){

                    console.warn(
                        `[Agent:${agent.id}] after():`,
                        error.message
                    );

                }

            }


            // ==================================================
            // ARTIFACTS
            // ==================================================

            const artifacts =
                artifactengine.extract(
                    response
                );


            // ==================================================
            // RESULT
            // ==================================================

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
                        "🤖",

                    category:
                        agent.category,

                    level:
                        agent.level

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
                    completion?.usage ||
                    null,

                model:
                    config.model,

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

                error:
                    error?.message ||
                    "Erro ao processar pedido.",

                latency:
                    Date.now() -
                    start

            };

        }

    }


    // ======================================================
    // STREAM PROCESSING
    // ======================================================

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


        // ==================================================
        // ROUTING
        // ==================================================

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


            // ==================================================
            // MESSAGES
            // ==================================================

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


            // ==================================================
            // CONFIG
            // ==================================================

            const config =
                getAgentModelConfig(
                    agent
                );


            // ==================================================
            // STREAM
            // ==================================================

            const stream =
                await this.groq
                    .chat
                    .completions
                    .create({

                        model:
                            config.model,

                        messages,

                        temperature:
                            config.temperature,

                        max_tokens:
                            config.max_tokens,

                        stream:
                            true

                    });


            let completeResponse =
                "";


            // ==================================================
            // READ STREAM
            // ==================================================

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


                if(!text){

                    continue;

                }


                completeResponse +=
                    text;


                if(
                    typeof onChunk ===
                    "function"
                ){

                    onChunk(
                        text
                    );

                }

            }


            // ==================================================
            // POST PROCESS
            // ==================================================

            let finalResponse =
                completeResponse;


            if(
                typeof agent.after ===
                "function"
            ){

                try{

                    finalResponse =
                        await agent.after(
                            completeResponse,
                            {
                                userPrompt,
                                history,
                                workspaceContext,
                                userMemory
                            }
                        );

                }

                catch(error){

                    console.warn(
                        `[Agent:${agent.id}] after():`,
                        error.message
                    );

                }

            }


            // ==================================================
            // ARTIFACTS
            // ==================================================

            const artifacts =
                artifactengine.extract(
                    finalResponse
                );


            // ==================================================
            // RESULT
            // ==================================================

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
                        "🤖",

                    category:
                        agent.category,

                    level:
                        agent.level

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

                model:
                    config.model,

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

                onError(
                    error
                );

            }


            throw error;

        }

    }


    // ======================================================
    // TELEMETRY
    // ======================================================

    getTelemetry(){

        return {

            status:
                this.groq
                    ? "online"
                    : "offline",

            engine:
                "Honey IA Orchestrator V7",

            agents:
                Object.keys(
                    agents_registry
                ).length,

            groq:
                Boolean(
                    this.groq
                ),

            timestamp:
                Date.now()

        };

    }

}


// ==========================================================
// INSTANCE
// ==========================================================

const orchestratorinstance =
    new Orchestrator();


// ==========================================================
// EXPORTS
// ==========================================================

export {

    agents_registry

};


export default orchestratorinstance;
