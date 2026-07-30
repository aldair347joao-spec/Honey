/*
==========================================
HONEY IA
AGENTS UI CONTROLLER V1.0
Agent Studio Frontend
==========================================
*/


import Agents from "./agents.js";
import AgentStudio from "./agentStudio.js";
import LiveClient from "./liveClient.js";



class AgentsUI {



constructor(){

    this.container = null;

}





init(containerId){


    this.container =
    document.getElementById(containerId);



    if(!this.container){

        console.error(
            "Agents UI container não encontrado."
        );

        return;

    }



    this.render();


}







render(){



const agents =
Agents.getAll();




this.container.innerHTML = `


<div class="agent-studio">


<header class="agent-studio-header">


<h2>
🤖 Honey Agent Studio
</h2>


<p>
Escolha um especialista da Honey IA.
</p>


</header>





<div class="agents-grid">


${agents.map(agent=>`



<div class="agent-profile-card"

data-agent="${agent.id}"

>



<div class="agent-icon">

${agent.emoji || "🐝"}

</div>



<h3>

${agent.name}

</h3>



<p>

${agent.description}

</p>



<div class="agent-status">

● Online

</div>



<button

class="agent-open-btn"

data-id="${agent.id}"

>

Abrir Studio

</button>



</div>



`).join("")}



</div>


</div>


`;





this.attachEvents();



}









attachEvents(){



this.container
.querySelectorAll(".agent-open-btn")
.forEach(button=>{


button.addEventListener(
"click",
()=>{


const id =
button.dataset.id;



this.openAgent(id);



});


});



}









async openAgent(agentId){



try{



const agent =
AgentStudio.setAgent(
agentId
);





if(!agent){

return;

}






document.dispatchEvent(

new CustomEvent(
"agent-selected",
{

detail:agent

}

)

);







if(
AgentStudio.getMode()
==="live"
){

await LiveClient.changeAgent(
agentId
);

}



this.showStudio(agent);



}catch(error){


console.error(
"Erro ao abrir agente:",
error
);


}



}









showStudio(agent){



const event =
new CustomEvent(
"agent-studio-open",
{

detail:{

agent

}

}

);



document.dispatchEvent(event);



}









getCurrent(){



return AgentStudio.getActiveAgent();



}



}





export default new AgentsUI();
