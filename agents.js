/*
==========================================
HONEY IA
AGENT ENGINE V5.0
Enterprise Agent Registry
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
// HONEY IA ENTERPRISE AGENTS
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

        "Produtividade"


    ];



    this.loadAgents();



}/*
==========================================
CARREGAMENTO DOS AGENTES
==========================================
*/


loadAgents(){



const agents = [



// ======================================
// CORE AGENTS
// ======================================


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



// ======================================
// ENTERPRISE AGENTS
// ======================================


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
    hragent,



];







agents.forEach(agent=>{


    this.register(agent);


});



}









/*
==========================================
REGISTRO DE AGENTES
==========================================
*/


register(agent){



if(!agent || !agent.id){



    console.warn(

        "Agente inválido:",

        agent

    );



    return;



}






const profile = {



    status:"online",



    conversations:[],



    memory:[],



    tools:[],



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



    ...agent



};







this.agents.set(


    agent.id,


    profile


);








console.log(


`✅ Honey Agent carregado: ${agent.name}`


);



}/*
==========================================
BUSCA DOS AGENTES
==========================================
*/


get(id){


    return this.agents.get(id);


}








getById(id){


    return this.get(id);


}








getAll(){


    return [

        ...this.agents.values()

    ];


}








getCategories(){


    return this.categories;


}









/*
==========================================
PESQUISA INTELIGENTE
==========================================
*/


search(query=""){



const text =


query

.toLowerCase()

.trim();






if(!text){


    return this.getAll();


}







return this.getAll()

.filter(agent=>{


return (



agent.name

.toLowerCase()

.includes(text)





||





agent.description

.toLowerCase()

.includes(text)





||





agent.category

.toLowerCase()

.includes(text)





);



});



}









/*
==========================================
FILTRAR POR CATEGORIA
==========================================
*/


filterByCategory(category){



if(


!category


||


category === "Todos"


){



    return this.getAll();



}







return this.getAll()

.filter(agent=>{


return (

agent.category === category

);


});



}









/*
==========================================
AGENTES DESTACADOS
==========================================
*/


getFeatured(){



return this.getAll()

.filter(agent=>{


return agent.featured === true;



});



}









/*
==========================================
AGENTE ATIVO
==========================================
*/


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








getActive(){



return this.agents.get(

this.activeAgent

);



}









/*
==========================================
MEMÓRIA DOS AGENTES
==========================================
*/


addConversation(

id,

role,

content

){



const agent =

this.get(id);





if(!agent)

return;







agent.conversations.push({



    role,


    content,


    date:

    new Date()



});



}








getConversation(id){



const agent =

this.get(id);





if(!agent)

return [];





return agent.conversations;



}









saveMemory(

id,

key,

value

){



const agent =

this.get(id);






if(!agent)

return;








agent.memory.push({



    key,


    value,


    createdAt:

    new Date()



});



}








getMemory(id){



const agent =

this.get(id);






if(!agent)

return [];





return agent.memory;



}/*
==========================================
RECOMENDAÇÃO INTELIGENTE
==========================================
*/


recommend(prompt=""){



const agent =

this.detect(prompt);





return {



    primary:agent,



    alternatives:


    this.getAll()

    .filter(item=>


        item.id !== agent.id


    )

    .slice(0,3)



};



}









/*
==========================================
DETECÇÃO INTELIGENTE
==========================================
*/


detect(prompt=""){



const text =

prompt

.toLowerCase();







// DESENVOLVIMENTO


if(


text.includes("código") ||

text.includes("codigo") ||

text.includes("programar") ||

text.includes("javascript") ||

text.includes("python") ||

text.includes("api") ||

text.includes("software") ||

text.includes("app") ||

text.includes("website")


){


return this.get("developer");


}








// DESIGN


if(


text.includes("design") ||

text.includes("logo") ||

text.includes("marca") ||

text.includes("ui") ||

text.includes("ux") ||

text.includes("figma")


){


return this.get("designer");


}








// MARKETING


if(


text.includes("marketing") ||

text.includes("publicidade") ||

text.includes("campanha") ||

text.includes("instagram") ||

text.includes("facebook")


){


return this.get("marketing");


}








// FINANÇAS


if(


text.includes("financeiro") ||

text.includes("finanças") ||

text.includes("investimento") ||

text.includes("lucro") ||

text.includes("orçamento")


){


return this.get("finance");


}








// CONTABILIDADE


if(


text.includes("contabilidade") ||

text.includes("contabilista") ||

text.includes("imposto") ||

text.includes("balanço")


){


return this.get("accounting");


}








// NEGÓCIOS


if(


text.includes("empresa") ||

text.includes("negócio") ||

text.includes("negocio") ||

text.includes("gestão")


){


return this.get("business");


}








// ESTRATÉGIA


if(


text.includes("estratégia") ||

text.includes("estrategia") ||

text.includes("crescimento") ||

text.includes("planeamento")


){


return this.get("strategist");


}








// AUTOMAÇÃO


if(


text.includes("automatizar") ||

text.includes("automação") ||

text.includes("automacao") ||

text.includes("workflow")


){


return this.get("automation");


}








// TRADUÇÃO


if(


text.includes("traduzir") ||

text.includes("tradução") ||

text.includes("idioma") ||

text.includes("inglês")


){


return this.get("translator");


}








// DOCUMENTOS


if(


text.includes("documento") ||

text.includes("pdf") ||

text.includes("relatório") ||

text.includes("relatorio")


){


return this.get("document");


}








// DADOS


if(


text.includes("dados") ||

text.includes("dashboard") ||

text.includes("análise") ||

text.includes("analise")


){


return this.get("analytics");


}








// EDUCAÇÃO


if(


text.includes("escola") ||

text.includes("curso") ||

text.includes("aula") ||

text.includes("estudar")


){


return this.get("education");


}








// SAÚDE


if(


text.includes("hospital") ||

text.includes("saúde") ||

text.includes("medicina")


){


return this.get("health");


}








// JURÍDICO


if(


text.includes("contrato") ||

text.includes("advogado") ||

text.includes("lei")


){


return this.get("legal");


}








// ARQUITETURA


if(


text.includes("casa") ||

text.includes("planta") ||

text.includes("arquitetura")


){


return this.get("architect");


}








// VÍDEO


if(


text.includes("vídeo") ||

text.includes("video")


){


return this.get("video");


}








// IMAGEM


if(


text.includes("imagem") ||

text.includes("foto")


){


return this.get("image");


}








return this.get("general");



}



}







const agents = new agentengine();



export default Agents;
