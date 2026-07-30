/*
==========================================
HONEY IA
AGENT MARKETPLACE
Premium Agent Store
V1.0
==========================================
*/


import agents from "./agents.js";
import agentstudio from "./agentstudio.js";
import subscription from "./subscription.js";
import upgrademodal from "./upgrademodal.js";


class agentmarketplace {



constructor(){

    this.container = null;

}







init(containerId){


    this.container =
    document.getelementbyid(containerId);

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
agents.getall();





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




this.attachevents();



}









attachevents(){



this.container
.queryselectorall(".use-agent")
.foreach(button=>{


button.addeventlistener(
"click",
()=>{


const id =
button.dataset.id;


if(!subscription.canuseagent(id)){

    upgrademodal.open();

    return;

}


agentstudio.setagent(id);



document.dispatchevent(

new customvvent(
"agent-selected",
{

detail:
agents.get(id)

}

)

);



}

);


});







this.container
.queryselectorall(".open-agent")
.foreach(button=>{


button.addeventlistener(
"click",
()=>{


const id =
button.dataset.id;


if(!subscription.canuseagent(id)){

    upgrademodal.open();

    return;

}


const agent =
agents.get(id);



agentstudio.setagent(id);



document.dispatchevent(

new customevent(
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
