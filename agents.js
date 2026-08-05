/*
==========================================
HONEY IA
AGENT ENGINE V4.0
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

        "Saúde"

    ];



    this.loadAgents();


}









loadAgents(){



const agents = [


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

securityagent



];






agents.forEach(agent=>{


    this.register(agent);


});




}









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



}








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
PESQUISA DE AGENTES
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

category==="Todos"

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



this.activeAgent=id;



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
MEMÓRIA E CONVERSAS
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



}








/*
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
DETECÇÃO INTELIGENTE DE AGENTE
==========================================
*/


detect(prompt=""){



const text =

prompt
.toLowerCase();







/*
==============================
DESENVOLVIMENTO
==============================
*/


if(

text.includes("código") ||

text.includes("programar") ||

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








/*
==============================
DESIGN
==============================
*/


if(

text.includes("design") ||

text.includes("logo") ||

text.includes("marca") ||

text.includes("ui") ||

text.includes("ux") ||

text.includes("figma") ||

text.includes("imagem")

){


return this.get(
"designer"
);


}









/*
==============================
MARKETING
==============================
*/


if(

text.includes("marketing") ||

text.includes("publicidade") ||

text.includes("campanha") ||

text.includes("instagram") ||

text.includes("facebook") ||

text.includes("cliente") ||

text.includes("vendas")

){


return this.get(
"marketing"
);


}








/*
==============================
FINANÇAS
==============================
*/


if(

text.includes("financeiro") ||

text.includes("finanças") ||

text.includes("investimento") ||

text.includes("lucro") ||

text.includes("contabilidade") ||

text.includes("orçamento")

){


return this.get(
"finance"
);


}









/*
==============================
SAÚDE
==============================
*/


if(

text.includes("hospital") ||

text.includes("clínica") ||

text.includes("saúde") ||

text.includes("medicina") ||

text.includes("paciente")

){


return this.get(
"health"
);


}









/*
==============================
EDUCAÇÃO
==============================
*/


if(

text.includes("escola") ||

text.includes("curso") ||

text.includes("estudar") ||

text.includes("aula") ||

text.includes("professor")

){


return this.get(
"education"
);


}









/*
==============================
JURÍDICO
==============================
*/


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









/*
==============================
ARQUITETURA
==============================
*/


if(

text.includes("casa") ||

text.includes("planta") ||

text.includes("obra") ||

text.includes("arquitetura") ||

text.includes("construção")

){


return this.get(
"architect"
);


}









/*
==============================
EXCEL / DADOS
==============================
*/


if(

text.includes("excel") ||

text.includes("planilha") ||

text.includes("dados") ||

text.includes("tabela")

){


return this.get(
"excel"
);


}









/*
==============================
SEGURANÇA
==============================
*/


if(

text.includes("segurança") ||

text.includes("proteção") ||

text.includes("hacker") ||

text.includes("vulnerabilidade")

){


return this.get(
"security"
);


}









/*
==============================
VÍDEO
==============================
*/


if(

text.includes("vídeo") ||

text.includes("video") ||

text.includes("animação")

){


return this.get(
"video"
);


}









/*
==============================
VENDAS
==============================
*/


if(

text.includes("vender") ||

text.includes("produto") ||

text.includes("negócio") ||

text.includes("comercial")

){


return this.get(
"sales"
);


}









return this.get(
"general"
);



}








}




const Agents = new agentengine();



export default agents;
