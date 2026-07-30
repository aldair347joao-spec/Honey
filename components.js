/*
==========================================
HONEY IA
COMPONENTS MODULE V2.0
Dynamic Agent Studio UI
==========================================
*/

import Agents from "./agents.js";
import AgentStudio from "./agentStudio.js";



export const Components = {



/*
==========================================
WORKSPACES
==========================================
*/


renderWorkspaces(container){


container.innerHTML = `

<div class="panel-page">

<h2>📂 Workspaces Ativos</h2>

<p class="muted">
Ambientes isolados com memória e contexto próprio.
</p>


<div class="cards-grid">


<div class="honey-card">

<h3>📌 Geral & Desenvolvimento</h3>

<p>
Ambiente principal da Honey IA.
</p>

<span class="status-online">
● Ativo
</span>

</div>




<div class="honey-card">

<h3>📊 Financeiro</h3>

<p>
Análise de dados, Excel e documentos.
</p>

<span>
5 conversas
</span>

</div>



<div class="honey-card">

<h3>🎨 Design Studio</h3>

<p>
UI, UX e criação visual.
</p>

<span>
Preview Live
</span>

</div>


</div>

</div>

`;

},







/*
==========================================
MEMÓRIA
==========================================
*/


renderMemories(container){



container.innerHTML = `

<div class="panel-page">


<h2>🧠 Memória Inteligente</h2>


<p class="muted">
Contextos aprendidos pela Honey IA.
</p>



<div class="honey-card">


<h3>
Preferências do Sistema
</h3>


<p>
Arquitetura modular, ES Modules,
Node.js moderno.
</p>


</div>



<div class="honey-card">


<h3>
Contexto do Utilizador
</h3>


<p>
Projetos, conversas e preferências guardadas.
</p>


</div>


</div>

`;

},









/*
==========================================
AGENTES DINÂMICOS
==========================================
*/


renderAgents(container){



const agents =
Agents.getAll();






container.innerHTML = `


<div class="panel-page">


<h2>🤖 Honey Agent Studio</h2>


<p class="muted">
Escolha um especialista para trabalhar.
</p>




<div class="agents-grid">


${agents.map(agent=>`



<div class="agent-card">


<div class="agent-header">


<div class="agent-avatar">

${agent.emoji || "🐝"}

</div>



<div>


<h3>

${agent.name}

</h3>


<span class="status-online">

● Online

</span>


</div>


</div>




<p>

${agent.description}

</p>





<button

class="activate-agent-btn"

data-agent="${agent.id}"

>

Ativar Agente

</button>



</div>



`).join("")}



</div>


</div>


`;






container
.querySelectorAll(".activate-agent-btn")
.forEach(button=>{



button.addEventListener(
"click",
async()=>{


const id =
button.dataset.agent;




const agent =
AgentStudio.setAgent(id);




if(agent){


button.innerText =
"✓ Ativo";


document.dispatchEvent(

new CustomEvent(
"agent-changed",
{

detail:agent

}

)

);



}



}

);



});




},









/*
==========================================
TOOLS
==========================================
*/


renderTools(container){



container.innerHTML=`


<div class="panel-page">


<h2>
🧩 Ferramentas
</h2>



<div class="cards-grid">


<div class="honey-card">


<h3>
🌐 Web
</h3>


<p>
Pesquisa e análise.
</p>


</div>



<div class="honey-card">


<h3>
💻 Code
</h3>


<p>
Programação e automação.
</p>


</div>


</div>


</div>


`;



},









/*
==========================================
ANALYTICS
==========================================
*/


renderAnalytics(container){



container.innerHTML=`


<div class="panel-page">


<h2>
📊 Analytics
</h2>


<div class="cards-grid">


<div class="honey-card">


<h3>
420ms
</h3>


<p>
Tempo médio resposta
</p>


</div>



<div class="honey-card">


<h3>
99.8%
</h3>


<p>
Sucesso API
</p>


</div>


</div>


</div>


`;



},









/*
==========================================
SISTEMA
==========================================
*/


renderSystem(container){



container.innerHTML=`


<div class="panel-page">


<h2>
⚙ Sistema
</h2>


<div class="honey-card">


<p>
Honey IA OS V6
</p>


<p>
Sistema operacional de agentes inteligentes.
</p>


</div>


</div>


`;



}



};
