/*
==========================================
HONEY IA
AGENT ENGINE V7.0
Enterprise Agent Registry
Real Capability System
30 Specialist Agents Integration
==========================================
*/


import designeragent from "./agents/designeragent.js";
import generalagent from "./agents/generalagent.js";
import developeragent from "./agents/developeragent.js";
import marketingagent from "./agents/marketingagent.js";
import financeagent from "./agents/financeagent.js";
import healthcareagent from "./agents/healthcareagent.js";
import educationagent from "./agents/educationagent.js";
import legalagent from "./agents/legalagent.js";
import architectagent from "./agents/architectagent.js";
import excelagent from "./agents/excelagent.js";
import salesagent from "./agents/salesagent.js";
import videoagent from "./agents/videoagent.js";
import imageagent from "./agents/imageagent.js";
import securityagent from "./agents/securityagent.js";


// ======================================
// ENTERPRISE AGENTS
// ======================================


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
import hragent from "./agents/hragent.js";


// ==========================================================
// AGENT ENGINE
// ==========================================================


class AgentEngine {


constructor(){


    this.agents = new Map();


    this.activeAgent = "general";


    this.categories = [

        "Todos",

        "Negócios",

        "Criativos",

        "Tecnologia",

        "Educação",

        "Saúde",

        "Comunicação",

        "Produtividade",

        "Dados",

        "Finanças"

    ];


    this.loadAgents();


}


// ==========================================================
// LOAD ALL AGENTS
// ==========================================================


loadAgents(){


    const agents = [

        // CORE

        generalagent,
        developeragent,
        designeragent,
        marketingagent,
        financeagent,
        healthcareagent,
        educationagent,
        legalagent,
        architectagent,
        excelagent,
        salesagent,
        videoagent,
        imageagent,
        securityagent,


        // ENTERPRISE

        writeragent,
        documentagent,
        bankingagent,
        entrepreneuragent,
        interiordesignagent,
        ecommerceagent,
        socialmediaagent,
        researchagent,
        automationagent,
        analyticsagent,
        customeragent,
        translationagent,
        businessagent,
        accountingagent,
        strategistagent,
        hragent

    ];


    agents.forEach(agent => {

        this.register(agent);

    });


}


// ==========================================================
// REGISTER AGENT
// ==========================================================


register(agent){


    if(
        !agent ||
        !agent.id
    ){

        console.warn(
            "[Honey IA] Agente inválido:",
            agent
        );

        return;

    }


    const profile = {

        // ------------------------------------------
        // SYSTEM
        // ------------------------------------------

        status: "online",

        conversations: [],

        memory: [],


        // ------------------------------------------
        // BASIC PROFILE
        // ------------------------------------------

        category:
            agent.category ||
            "Tecnologia",

        level:
            agent.level ||
            "Professional",

        featured:
            agent.featured ||
            false,

        users:
            agent.users ||
            0,


        // ------------------------------------------
        // TOOLS
        // ------------------------------------------

        tools:
            agent.tools ||
            [],


        // ------------------------------------------
        // CAPABILITIES
        // ------------------------------------------

        capabilities:
            agent.capabilities ||
            [],


        // ------------------------------------------
        // SUPPORTED LANGUAGES
        // ------------------------------------------

        languages:
            agent.languages ||
            [],


        // ------------------------------------------
        // OUTPUT TYPES
        // ------------------------------------------

        outputs:
            agent.outputs ||
            [],


        // ------------------------------------------
        // PREVIEW TYPES
        // ------------------------------------------

        previewTypes:
            agent.previewTypes ||
            [],


        // ------------------------------------------
        // FILE TYPES
        // ------------------------------------------

        fileTypes:
            agent.fileTypes ||
            [],


        // ------------------------------------------
        // EXECUTION FEATURES
        // ------------------------------------------

        features: {

            chat:
                agent.features?.chat !== false,

            preview:
                agent.features?.preview !== false,

            download:
                agent.features?.download !== false,

            attachments:
                agent.features?.attachments !== false,

            export:
                agent.features?.export !== false,

            live:
                agent.features?.live !== false,

            codeExecution:
                agent.features?.codeExecution ||
                false,

            imageGeneration:
                agent.features?.imageGeneration ||
                false,

            fileGeneration:
                agent.features?.fileGeneration ||
                false

        },


        // ------------------------------------------
        // SPECIALIZED INSTRUCTIONS
        // ------------------------------------------

        instructions:
            agent.instructions ||
            "",


        // ------------------------------------------
        // ORIGINAL AGENT DATA
        // ------------------------------------------

        ...agent

    };


    this.agents.set(

        agent.id,

        profile

    );


    console.log(
        `🐝 Honey Agent carregado: ${agent.name}`
    );

}


// ==========================================================
// GET AGENT
// ==========================================================


get(id){

    return this.agents.get(id);

}


// ==========================================================
// GET BY ID
// ==========================================================


getById(id){

    return this.get(id);

}


// ==========================================================
// GET ALL
// ==========================================================


getAll(){

    return [

        ...this.agents.values()

    ];

}


// ==========================================================
// GET CATEGORIES
// ==========================================================


getCategories(){

    return this.categories;

}


// ==========================================================
// SEARCH ENGINE
// ==========================================================


search(query = ""){


    const text =

        query

        .toLowerCase()

        .trim();


    if(!text){

        return this.getAll();

    }


    return this.getAll()

        .filter(agent => {


            const content = `

                ${agent.name || ""}

                ${agent.description || ""}

                ${agent.category || ""}

                ${agent.level || ""}

                ${(agent.tools || []).join(" ")}

                ${(agent.capabilities || []).join(" ")}

                ${(agent.languages || []).join(" ")}

                ${(agent.outputs || []).join(" ")}

            `.toLowerCase();


            return content.includes(text);

        });

}


// ==========================================================
// CATEGORY FILTER
// ==========================================================


filterByCategory(category){


    if(
        !category ||
        category === "Todos"
    ){

        return this.getAll();

    }


    return this.getAll()

        .filter(agent => {

            return (

                agent.category === category

            );

        });

}


// ==========================================================
// FEATURED AGENTS
// ==========================================================


getFeatured(){


    return this.getAll()

        .filter(agent => {

            return agent.featured === true;

        });

}


// ==========================================================
// GET CAPABILITIES
// ==========================================================


getCapabilities(id){


    const agent = this.get(id);


    if(!agent){

        return [];

    }


    return agent.capabilities || [];

}


// ==========================================================
// GET OUTPUTS
// ==========================================================


getOutputs(id){


    const agent = this.get(id);


    if(!agent){

        return [];

    }


    return agent.outputs || [];

}


// ==========================================================
// GET PREVIEW TYPES
// ==========================================================


getPreviewTypes(id){


    const agent = this.get(id);


    if(!agent){

        return [];

    }


    return agent.previewTypes || [];

}


// ==========================================================
// GET FILE TYPES
// ==========================================================


getFileTypes(id){


    const agent = this.get(id);


    if(!agent){

        return [];

    }


    return agent.fileTypes || [];

}


// ==========================================================
// GET TOOLS
// ==========================================================


getTools(id){


    const agent = this.get(id);


    if(!agent){

        return [];

    }


    return agent.tools || [];

}


// ==========================================================
// CHECK CAPABILITY
// ==========================================================


hasCapability(

    id,

    capability

){


    const agent = this.get(id);


    if(!agent){

        return false;

    }


    return (

        agent.capabilities || []

    )

    .some(item =>

        item.toLowerCase() ===

        String(capability).toLowerCase()

    );

}


// ==========================================================
// CHECK OUTPUT
// ==========================================================


canProduce(

    id,

    output

){


    const agent = this.get(id);


    if(!agent){

        return false;

    }


    return (

        agent.outputs || []

    )

    .some(item =>

        item.toLowerCase() ===

        String(output).toLowerCase()

    );

}


// ==========================================================
// ACTIVE AGENT CONTROL
// ==========================================================


setActive(id){


    if(

        this.agents.has(id)

    ){

        this.activeAgent = id;


        return this.agents.get(id);

    }


    return this.agents.get(

        "general"

    );

}


// ==========================================================
// GET ACTIVE
// ==========================================================


getActive(){

    return this.agents.get(

        this.activeAgent

    );

}


// ==========================================================
// GET ACTIVE ID
// ==========================================================


getActiveId(){

    return this.activeAgent;

}


// ==========================================================
// AGENT MEMORY SYSTEM
// ==========================================================


addConversation(

    id,

    role,

    content

){


    const agent =

        this.get(id);


    if(!agent){

        return;

    }


    agent.conversations.push({

        role,

        content,

        date:

            new Date()

    });

}


// ==========================================================
// GET CONVERSATION
// ==========================================================


getConversation(id){


    const agent =

        this.get(id);


    if(!agent){

        return [];

    }


    return agent.conversations;

}


// ==========================================================
// CLEAR CONVERSATION
// ==========================================================


clearConversation(id){


    const agent =

        this.get(id);


    if(!agent){

        return;

    }


    agent.conversations = [];

}


// ==========================================================
// SAVE MEMORY
// ==========================================================


saveMemory(

    id,

    key,

    value

){


    const agent =

        this.get(id);


    if(!agent){

        return;

    }


    agent.memory.push({

        key,

        value,

        createdAt:

            new Date()

    });

}


// ==========================================================
// GET MEMORY
// ==========================================================


getMemory(id){


    const agent =

        this.get(id);


    if(!agent){

        return [];

    }


    return agent.memory;

}


// ==========================================================
// INTELLIGENT RECOMMENDATION
// ==========================================================


recommend(prompt = ""){


    const primary =

        this.detect(prompt);


    const alternatives =

        this.getAll()

        .filter(agent =>

            agent.id !== primary.id

        )

        .slice(0, 3);


    return {

        primary,

        alternatives

    };

}


// ==========================================================
// AUTO AGENT DETECTION
// ==========================================================


detect(prompt = ""){


    const text =

        String(prompt)

        .toLowerCase();


    // ------------------------------------------
    // DEVELOPMENT
    // ------------------------------------------

    if(

        text.includes("código") ||

        text.includes("codigo") ||

        text.includes("javascript") ||

        text.includes("typescript") ||

        text.includes("python") ||

        text.includes("java") ||

        text.includes("php") ||

        text.includes("c++") ||

        text.includes("c#") ||

        text.includes("react") ||

        text.includes("node") ||

        text.includes("api") ||

        text.includes("software") ||

        text.includes("app") ||

        text.includes("aplicação") ||

        text.includes("aplicativo") ||

        text.includes("website") ||

        text.includes("site") ||

        text.includes("frontend") ||

        text.includes("backend")

    ){

        return this.get(

            "developer"

        );

    }


    // ------------------------------------------
    // DESIGN
    // ------------------------------------------

    if(

        text.includes("design") ||

        text.includes("logo") ||

        text.includes("marca") ||

        text.includes("identidade visual") ||

        text.includes("ui") ||

        text.includes("ux") ||

        text.includes("interface")

    ){

        return this.get(

            "designer"

        );

    }


    // ------------------------------------------
    // MARKETING
    // ------------------------------------------

    if(

        text.includes("marketing") ||

        text.includes("publicidade") ||

        text.includes("campanha") ||

        text.includes("instagram") ||

        text.includes("anúncio") ||

        text.includes("anuncio") ||

        text.includes("branding")

    ){

        return this.get(

            "marketing"

        );

    }


    // ------------------------------------------
    // FINANCE
    // ------------------------------------------

    if(

        text.includes("financeiro") ||

        text.includes("finanças") ||

        text.includes("financas") ||

        text.includes("investimento") ||

        text.includes("orçamento") ||

        text.includes("orcamento")

    ){

        return this.get(

            "finance"

        );

    }


    // ------------------------------------------
    // BUSINESS
    // ------------------------------------------

    if(

        text.includes("empresa") ||

        text.includes("negócio") ||

        text.includes("negocio") ||

        text.includes("gestão") ||

        text.includes("gestao") ||

        text.includes("empresarial")

    ){

        return this.get(

            "business"

        );

    }


    // ------------------------------------------
    // ACCOUNTING
    // ------------------------------------------

    if(

        text.includes("contabilidade") ||

        text.includes("contabil") ||

        text.includes("imposto") ||

        text.includes("balanço") ||

        text.includes("balanco") ||

        text.includes("contas")

    ){

        return this.get(

            "accounting"

        );

    }


    // ------------------------------------------
    // AUTOMATION
    // ------------------------------------------

    if(

        text.includes("automatizar") ||

        text.includes("automação") ||

        text.includes("automacao") ||

        text.includes("workflow") ||

        text.includes("processo automático")

    ){

        return this.get(

            "automation"

        );

    }


    // ------------------------------------------
    // DOCUMENTS
    // ------------------------------------------

    if(

        text.includes("documento") ||

        text.includes("pdf") ||

        text.includes("relatório") ||

        text.includes("relatorio") ||

        text.includes("docx") ||

        text.includes("arquivo")

    ){

        return this.get(

            "document"

        );

    }


    // ------------------------------------------
    // TRANSLATION
    // ------------------------------------------

    if(

        text.includes("traduzir") ||

        text.includes("tradução") ||

        text.includes("traducao") ||

        text.includes("idioma") ||

        text.includes("inglês") ||

        text.includes("ingles") ||

        text.includes("francês") ||

        text.includes("frances")

    ){

        return this.get(

            "translation"

        );

    }


    // ------------------------------------------
    // DATA
    // ------------------------------------------

    if(

        text.includes("dados") ||

        text.includes("dashboard") ||

        text.includes("análise de dados") ||

        text.includes("analise de dados") ||

        text.includes("gráfico") ||

        text.includes("grafico") ||

        text.includes("estatística") ||

        text.includes("estatistica")

    ){

        return this.get(

            "analytics"

        );

    }


    // ------------------------------------------
    // EDUCATION
    // ------------------------------------------

    if(

        text.includes("aula") ||

        text.includes("curso") ||

        text.includes("estudar") ||

        text.includes("escola") ||

        text.includes("professor") ||

        text.includes("aprendizagem")

    ){

        return this.get(

            "education"

        );

    }


    // ------------------------------------------
    // HEALTHCARE
    // ------------------------------------------

    if(

        text.includes("saúde") ||

        text.includes("saude") ||

        text.includes("medicina") ||

        text.includes("hospital") ||

        text.includes("médico") ||

        text.includes("medico")

    ){

        return this.get(

            "healthcare"

        );

    }


    // ------------------------------------------
    // LEGAL
    // ------------------------------------------

    if(

        text.includes("contrato") ||

        text.includes("advogado") ||

        text.includes("lei") ||

        text.includes("jurídico") ||

        text.includes("juridico") ||

        text.includes("legal")

    ){

        return this.get(

            "legal"

        );

    }


    // ------------------------------------------
    // ARCHITECTURE
    // ------------------------------------------

    if(

        text.includes("casa") ||

        text.includes("planta") ||

        text.includes("arquitetura") ||

        text.includes("construção") ||

        text.includes("construcao") ||

        text.includes("3d") ||

        text.includes("interior")

    ){

        return this.get(

            "architect"

        );

    }


    // ------------------------------------------
    // EXCEL
    // ------------------------------------------

    if(

        text.includes("excel") ||

        text.includes("planilha") ||

        text.includes("tabela") ||

        text.includes("xlsx") ||

        text.includes("spreadsheet")

    ){

        return this.get(

            "excel"

        );

    }


    // ------------------------------------------
    // VIDEO
    // ------------------------------------------

    if(

        text.includes("vídeo") ||

        text.includes("video") ||

        text.includes("animação") ||

        text.includes("animacao") ||

        text.includes("filme") ||

        text.includes("reels")

    ){

        return this.get(

            "video"

        );

    }


    // ------------------------------------------
    // IMAGE
    // ------------------------------------------

    if(

        text.includes("imagem") ||

        text.includes("foto") ||

        text.includes("ilustração") ||

        text.includes("ilustracao") ||

        text.includes("poster") ||

        text.includes("flyer") ||

        text.includes("banner")

    ){

        return this.get(

            "image"

        );

    }


    // ------------------------------------------
    // WRITING
    // ------------------------------------------

    if(

        text.includes("texto") ||

        text.includes("artigo") ||

        text.includes("livro") ||

        text.includes("escrever") ||

        text.includes("redação") ||

        text.includes("redacao") ||

        text.includes("copywriting")

    ){

        return this.get(

            "writer"

        );

    }


    // ------------------------------------------
    // BANKING
    // ------------------------------------------

    if(

        text.includes("banco") ||

        text.includes("bancário") ||

        text.includes("bancario") ||

        text.includes("crédito") ||

        text.includes("credito") ||

        text.includes("empréstimo") ||

        text.includes("emprestimo")

    ){

        return this.get(

            "banking"

        );

    }


    // ------------------------------------------
    // ENTREPRENEURSHIP
    // ------------------------------------------

    if(

        text.includes("empreendedor") ||

        text.includes("startup") ||

        text.includes("modelo de negócio") ||

        text.includes("modelo de negocio")

    ){

        return this.get(

            "entrepreneur"

        );

    }


    // ------------------------------------------
    // E-COMMERCE
    // ------------------------------------------

    if(

        text.includes("ecommerce") ||

        text.includes("e-commerce") ||

        text.includes("loja online") ||

        text.includes("loja virtual") ||

        text.includes("produto online")

    ){

        return this.get(

            "ecommerce"

        );

    }


    // ------------------------------------------
    // SOCIAL MEDIA
    // ------------------------------------------

    if(

        text.includes("redes sociais") ||

        text.includes("social media") ||

        text.includes("facebook") ||

        text.includes("tiktok") ||

        text.includes("linkedin")

    ){

        return this.get(

            "socialmedia"

        );

    }


    // ------------------------------------------
    // RESEARCH
    // ------------------------------------------

    if(

        text.includes("pesquisa") ||

        text.includes("investigar") ||

        text.includes("estudo") ||

        text.includes("fontes") ||

        text.includes("referências")

    ){

        return this.get(

            "research"

        );

    }


    // ------------------------------------------
    // CUSTOMER SERVICE
    // ------------------------------------------

    if(

        text.includes("cliente") ||

        text.includes("atendimento") ||

        text.includes("suporte") ||

        text.includes("customer service")

    ){

        return this.get(

            "customer"

        );

    }


    // ------------------------------------------
    // HUMAN RESOURCES
    // ------------------------------------------

    if(

        text.includes("recursos humanos") ||

        text.includes("rh") ||

        text.includes("recrutamento") ||

        text.includes("funcionário") ||

        text.includes("funcionario") ||

        text.includes("talentos")

    ){

        return this.get(

            "hr"

        );

    }


    // ------------------------------------------
    // STRATEGY
    // ------------------------------------------

    if(

        text.includes("estratégia") ||

        text.includes("estrategia") ||

        text.includes("planeamento estratégico") ||

        text.includes("planejamento estratégico")

    ){

        return this.get(

            "strategist"

        );

    }


    // ------------------------------------------
    // SECURITY
    // ------------------------------------------

    if(

        text.includes("segurança") ||

        text.includes("seguranca") ||

        text.includes("cibersegurança") ||

        text.includes("ciberseguranca") ||

        text.includes("cybersecurity") ||

        text.includes("hacker")

    ){

        return this.get(

            "security"

        );

    }


    // ------------------------------------------
    // SALES
    // ------------------------------------------

    if(

        text.includes("vendas") ||

        text.includes("vender") ||

        text.includes("cliente potencial") ||

        text.includes("lead") ||

        text.includes("crm")

    ){

        return this.get(

            "sales"

        );

    }


    // ------------------------------------------
    // GENERAL
    // ------------------------------------------

    return this.get(

        "general"

    );

}


// ==========================================================
// FIND AGENT FOR CAPABILITY
// ==========================================================


findByCapability(

    capability

){


    const text =

        String(capability)

        .toLowerCase();


    return this.getAll()

        .filter(agent =>

            (agent.capabilities || [])

            .some(item =>

                item

                .toLowerCase()

                .includes(text)

            )

        );

}


// ==========================================================
// FIND AGENT FOR OUTPUT
// ==========================================================


findByOutput(output){


    const text =

        String(output)

        .toLowerCase();


    return this.getAll()

        .filter(agent =>

            (agent.outputs || [])

            .some(item =>

                item

                .toLowerCase()

                .includes(text)

            )

        );

}


// ==========================================================
// GET AGENT PROFILE
// ==========================================================


getProfile(id){


    const agent =

        this.get(id);


    if(!agent){

        return null;

    }


    return {

        id:

            agent.id,

        name:

            agent.name,

        emoji:

            agent.emoji || "🤖",

        description:

            agent.description || "",

        category:

            agent.category || "",

        level:

            agent.level || "Professional",

        tools:

            agent.tools || [],

        capabilities:

            agent.capabilities || [],

        languages:

            agent.languages || [],

        outputs:

            agent.outputs || [],

        previewTypes:

            agent.previewTypes || [],

        fileTypes:

            agent.fileTypes || [],

        features:

            agent.features || {},

        status:

            agent.status || "online"

    };

}


// ==========================================================
// EXPORT ENGINE STATE
// ==========================================================


getState(){


    return {

        activeAgent:

            this.activeAgent,

        totalAgents:

            this.agents.size,

        categories:

            this.categories,

        agents:

            this.getAll()

    };

}


// ==========================================================
// RESET ENGINE
// ==========================================================


reset(){


    this.activeAgent =

        "general";


    this.agents.forEach(agent => {


        agent.conversations = [];

        agent.memory = [];


    });

}


// ==========================================================
// INITIALIZE SINGLE INSTANCE
// ==========================================================


}


// ==========================================================
// SINGLE INSTANCE
// ==========================================================


const Agents =

    new AgentEngine();


export default Agents;
