/*
==========================================
HONEY IA
USER DASHBOARD
SaaS Control Panel
V1.0
==========================================
*/


import Subscription from "./subscription.js";
import Agents from "./agents.js";



class Dashboard {



constructor(){

    this.container=null;

}






init(containerId){



this.container =
document.getElementById(
containerId
);



if(!this.container){

console.error(
"Dashboard não encontrado."
);

return;

}



this.render();



}








render(){



const plan =
Subscription.getPlan();



const agents =
Agents.getAll();




this.container.innerHTML = `



<div class="dashboard-page">



<header class="dashboard-header">


<h1>

🐝 Honey IA Dashboard

</h1>


<p>

Centro de controlo da sua inteligência artificial.

</p>


</header>







<div class="dashboard-grid">





<div class="dashboard-card">


<h3>
💳 Plano Atual
</h3>


<strong>

${plan.name}

</strong>


<p>

Acesso aos agentes:

${plan.agents==="all"
?
"Todos"
:
"Limitado"}

</p>



</div>








<div class="dashboard-card">


<h3>
🤖 Agentes
</h3>


<strong>

${agents.length}

</strong>


<p>

Agentes disponíveis no sistema.

</p>


</div>








<div class="dashboard-card">


<h3>
📂 Workspaces
</h3>


<strong>

${plan.workspaces}

</strong>


<p>

Ambientes de trabalho.

</p>


</div>








<div class="dashboard-card">


<h3>
📤 Exportação
</h3>


<strong>

${plan.export
?
"Ativa"
:
"Bloqueada"}

</strong>


<p>

Exportação de projetos.

</p>


</div>





</div>







<section class="dashboard-agents">


<h2>

Agentes Recentes

</h2>



<div class="mini-agent-grid">



${agents.slice(0,6).map(agent=>`


<div class="mini-agent">


<span>

${agent.emoji}

</span>


<p>

${agent.name}

</p>


</div>



`).join("")}



</div>



</section>




</div>



`;



}



}



export default new Dashboard();
