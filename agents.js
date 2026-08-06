/*
==========================================
HONEY IA
AGENT ENGINE V6.0
Enterprise Agent Registry
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

        "Produtividade"



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






agents.forEach(agent=>{


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

`🐝 Honey Agent carregado: ${agent.name}`

);



}/*
==========================================
GET AGENTS
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









// ==========================================================
// SEARCH ENGINE
// ==========================================================


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



const content = `

${agent.name}

${agent.description}

${agent.category}

${agent.level}

`

.toLowerCase();







return content.includes(text);



});



}









// ==========================================================
// CATEGORY FILTER
// ==========================================================


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









// ==========================================================
// FEATURED AGENTS
// ==========================================================


getFeatured(){



return this.getAll()

.filter(agent=>{



return agent.featured === true;



});



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








getActive(){



return this.agents.get(

this.activeAgent

);



}








getActiveId(){



return this.activeAgent;



}/*
==========================================
AGENT MEMORY SYSTEM
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









clearConversation(id){



const agent =

this.get(id);





if(!agent)

return;







agent.conversations = [];



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



}









// ==========================================================
// INTELLIGENT RECOMMENDATION
// ==========================================================


recommend(prompt=""){



const primary =

this.detect(prompt);








return {



    primary,



    alternatives:



    this.getAll()

    .filter(agent=>



        agent.id !== primary.id



    )

    .slice(0,3)



};



}









// ==========================================================
// AUTO AGENT DETECTION
// ==========================================================


detect(prompt=""){



const text =

prompt

.toLowerCase();









// DESENVOLVIMENTO


if(


text.includes("código") ||

text.includes("codigo") ||

text.includes("javascript") ||

text.includes("python") ||

text.includes("api") ||

text.includes("software") ||

text.includes("app") ||

text.includes("website")


){



return this.get(

"developer"

);



}









// DESIGN


if(


text.includes("design") ||

text.includes("logo") ||

text.includes("marca") ||

text.includes("ui") ||

text.includes("ux")


){



return this.get(

"designer"

);



}









// MARKETING


if(


text.includes("marketing") ||

text.includes("publicidade") ||

text.includes("campanha") ||

text.includes("instagram")


){



return this.get(

"marketing"

);



}









// FINANÇAS


if(


text.includes("financeiro") ||

text.includes("finanças") ||

text.includes("investimento") ||

text.includes("orçamento")


){



return this.get(

"finance"

);



}









// NEGÓCIOS


if(


text.includes("empresa") ||

text.includes("negócio") ||

text.includes("negocio") ||

text.includes("gestão")


){



return this.get(

"business"

);



}









// CONTABILIDADE


if(


text.includes("contabilidade") ||

text.includes("imposto") ||

text.includes("balanço")


){



return this.get(

"accounting"

);



}









// AUTOMAÇÃO


if(


text.includes("automatizar") ||

text.includes("automação") ||

text.includes("workflow")


){



return this.get(

"automation"

);



}









// DOCUMENTOS


if(


text.includes("documento") ||

text.includes("pdf") ||

text.includes("relatório") ||

text.includes("relatorio")


){



return this.get(

"document"

);



}









// TRADUÇÃO


if(


text.includes("traduzir") ||

text.includes("tradução") ||

text.includes("idioma") ||

text.includes("inglês")


){



return this.get(

"translation"

);



}









// DADOS


if(


text.includes("dados") ||

text.includes("dashboard") ||

text.includes("análise") ||

text.includes("analise")


){



return this.get(

"analytics"

);



}









// EDUCAÇÃO


if(


text.includes("aula") ||

text.includes("curso") ||

text.includes("estudar") ||

text.includes("escola")


){



return this.get(

"education"

);



}









// SAÚDE


if(


text.includes("saúde") ||

text.includes("medicina") ||

text.includes("hospital")


){



return this.get(

"healthcare"

);



}/*
==========================================
CONTINUAÇÃO DETECT ENGINE
==========================================
*/


// JURÍDICO


if(


text.includes("contrato") ||

text.includes("advogado") ||

text.includes("lei") ||

text.includes("jurídico")


){



return this.get(

"legal"

);



}









// ARQUITETURA


if(


text.includes("casa") ||

text.includes("planta") ||

text.includes("arquitetura") ||

text.includes("construção")


){



return this.get(

"architect"

);



}









// EXCEL


if(


text.includes("excel") ||

text.includes("planilha") ||

text.includes("tabela")


){



return this.get(

"excel"

);



}









// VÍDEO


if(


text.includes("vídeo") ||

text.includes("video") ||

text.includes("animação")


){



return this.get(

"video"

);



}









// IMAGEM


if(


text.includes("imagem") ||

text.includes("foto") ||

text.includes("ilustração")


){



return this.get(

"image"

);



}









// ESCRITA


if(


text.includes("texto") ||

text.includes("artigo") ||

text.includes("livro") ||

text.includes("escrever")


){



return this.get(

"writer"

);



}









return this.get(

"general"

);



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



this.agents.forEach(agent=>{



    agent.conversations = [];



    agent.memory = [];



});



}









// ==========================================================
// INITIALIZE SINGLE INSTANCE
// ==========================================================


}





const Agents = new AgentEngine();





export default Agents;
