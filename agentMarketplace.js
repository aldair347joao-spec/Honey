/*
==========================================
HONEY IA
AGENT MARKETPLACE
Premium Agent Store
V1.0
==========================================
*/


import Agents from "./agents.js";
import AgentStudio from "./agentStudio.js";
import Subscription from "./subscription.js";
import UpgradeModal from "./upgradeModal.js";


class AgentMarketplace {



constructor(){

    this.container = null;

}







init(containerId){


    this.container =
    document.getElementById(containerId);

if(!Subscription.canUseAgent(id)){

UpgradeModal.open();

return;

}

    if(!this.container){

        console.error(
            "Marketplace container não encontrado."
        );

        return;

    }



    this.render();



}








render(){



const agents =
Agents.getAll();





this.container.innerHTML = `



<section class="marketplace">


<header class="marketplace-header">


<h1>
🐝 Honey AI Agents
</h1>


<p>
Escolha especialistas inteligentes para o seu negócio.
</p>


</header>







<div class="marketplace-grid">



${agents.map(agent=>`



<article class="market-agent-card">


<div class="market-agent-icon">

${agent.emoji || "🐝"}

</div>



<h2>

${agent.name}

</h2>



<p>

${agent.description}

</p>




<div class="agent-plan">


<span>

Plano Individual

</span>


<strong>

15.000 Kz/mês

</strong>


</div>






<div class="market-actions">



<button

class="use-agent"

data-id="${agent.id}"

>

Usar Agente

</button>




<button

class="open-agent"

data-id="${agent.id}"

>

Ver Studio

</button>



</div>




</article>



`).join("")}



</div>



</section>


`;




this.attachEvents();



}









attachEvents(){



this.container
.querySelectorAll(".use-agent")
.forEach(button=>{


button.addEventListener(
"click",
()=>{


const id =
button.dataset.id;



AgentStudio.setAgent(id);



document.dispatchEvent(

new CustomEvent(
"agent-selected",
{

detail:
Agents.get(id)

}

)

);



}

);


});







this.container
.querySelectorAll(".open-agent")
.forEach(button=>{


button.addEventListener(
"click",
()=>{


const id =
button.dataset.id;



const agent =
Agents.get(id);



AgentStudio.setAgent(id);



document.dispatchEvent(

new CustomEvent(
"agent-studio-open",
{

detail:{
agent
}

}

)

);



}

);


});



}



}



export default new AgentMarketplace();
