/*
==========================================
HONEY IA
AGENT STUDIO VIEW
Individual Agent Workspace
V1.0
==========================================
*/


import agentstudio from "./agentstudio.js";
import liveclient from "./liveclient.js";



class agentstudioview {



constructor(){

    this.container = null;

}







init(containerId){


    this.container =
    document.getelementbyid(containerid);



    if(!this.container){

        console.error(
            "Agent Studio View não encontrado."
        );

        return;

    }



    document.addeventlistener(
        "agent-studio-open",
        (event)=>{


            this.open(
                event.detail.agent
            );


        }
    );



}








open(agent){



this.container.innerHTML = `



<div class="agent-workspace">


<div class="agent-workspace-header">


<div class="agent-big-icon">

${agent.emoji || "🐝"}

</div>



<div>

<h1>

${agent.name}

</h1>


<p>

${agent.description}

</p>


<span class="agent-online">

● Agente Online

</span>


</div>



</div>








<div class="agent-tools-panel">


<h3>

Ferramentas

</h3>



<div class="tools-grid">


${this.generateTools(agent)}


</div>


</div>







<div class="agent-actions">


<button 
class="start-live-agent"
>

🎙 Iniciar Live

</button>



<button
class="back-agent-list"
>

← Voltar

</button>


</div>





</div>



`;




this.attachevents();



}









generatetools(agent){


const tools = {


developer:[
"Gerar Código",
"Analisar Projetos",
"Debug",
"APIs"
],


designer:[
"UI/UX",
"Logos",
"Protótipos",
"Design System"
],


marketing:[
"Copywriting",
"Campanhas",
"Social Media"
],


finance:[
"Excel",
"Relatórios",
"Análises"
],


architect:[
"Plantas",
"Modelagem",
"Projetos 3D"
],


image:[
"Geração de Imagem",
"Visão Computacional"
],


video:[
"Edição",
"Publicidade"
],


general:[
"Chat",
"Assistente Geral"
]


};



const list =
tools[agent.id]
||
tools.general;



return list.map(tool=>`

<div class="tool-card">

${tool}

</div>

`).join("");



}









attachevents(){



const livebutton =
this.container.querySelector(
".start-live-agent"
);



livebutton?.addeventlistener(
"click",
async()=>{


await liveclient.start(
agentstudio.getagent()
);



});







this.container
.queryselector(
".back-agent-list"
)
?.addeventlistener(
"click",
()=>{


this.container.innerHTML="";


document.dispatchevent(
new customEvent(
"agents-back"
)
);


}

);



}



}





export default new AgentStudioView();
