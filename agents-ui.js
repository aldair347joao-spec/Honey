/*
==========================================
HONEY IA
AGENTS UI ENGINE V8
30 Specialist Agents Workspace
==========================================
*/


import Agents from "./agents.js";

import agentstudio from "./agentstudio.js";





class AgentsUI {





constructor(){



    this.container = null;



    this.searchInput = null;



    this.activeFilter = "Todos";



    this.agents = [];



}









// ==========================================================
// INITIALIZE
// ==========================================================


init(containerId){



    this.container =

    document.getElementById(

        containerId

    );








    if(!this.container){



        console.warn(

            "[Agents UI] Container não encontrado:",

            containerId

        );



        return;



    }








    this.loadAgents();



    this.render();



    this.bindEvents();



    this.listenStudioEvents();



}









// ==========================================================
// LOAD AGENTS
// ==========================================================


loadAgents(){



    if(

        Agents &&

        typeof Agents.getAll === "function"

    ){



        this.agents =

        Agents.getAll();



    }

    else{



        this.agents = [];



        console.warn(

            "[Agents UI] Engine de agentes indisponível."

        );



    }



}









// ==========================================================
// FILTER
// ==========================================================


getFilteredAgents(){



    if(

        this.activeFilter === "Todos"

    ){



        return this.agents;



    }








    return this.agents.filter(agent=>{



        return (

            agent.category ===

            this.activeFilter

        );



    });



}









// ==========================================================
// MAIN RENDER
// ==========================================================


render(){



    if(!this.container)

    return;








    const agents =

    this.getFilteredAgents();








    this.container.innerHTML = `



    <div class="agents-toolbar">



        <div class="agents-title">


            <h1>

            Agentes Honey IA

            </h1>


            <p>

            Especialistas inteligentes para cada área.

            </p>


        </div>






        <input

        id="agentSearch"

        class="agent-search"

        type="search"

        placeholder="Pesquisar especialista..."

        />



    </div>








    ${

        this.renderFilters()

    }








    <div

    class="agents-grid"

    id="agentsGrid">


    ${


        agents

        .map(agent=>


            this.createAgentCard(agent)


        )

        .join("")



    }



    </div>



    `;



}// ==========================================================
// CREATE AGENT CARD
// ==========================================================


createAgentCard(agent){



return `



<div

class="agent-card"

data-agent-id="${agent.id}"

>





    <div class="agent-card-icon">


        ${

            agent.emoji ||

            "🤖"

        }


    </div>







    <div class="agent-card-content">



        <h3>


        ${

            agent.name ||

            "Honey Agent"

        }


        </h3>






        <p>


        ${

            agent.description ||

            "Especialista inteligente."

        }


        </p>






        <span class="agent-category">


        ${

            agent.category ||

            "Tecnologia"

        }


        </span>



    </div>









    <button


    class="open-agent-btn"


    data-agent="${agent.id}"

    >



        Abrir Studio



    </button>





</div>



`;



}









// ==========================================================
// EVENTS
// ==========================================================


bindEvents(){



if(!this.container)

return;









// SEARCH


this.searchInput =

this.container.querySelector(

"#agentSearch"

);








if(this.searchInput){



this.searchInput

.addEventListener(

"input",

()=>{



this.search(

this.searchInput.value

);



}

);



}









// OPEN BUTTONS


this.bindCardEvents();



}









// ==========================================================
// CARD EVENTS
// ==========================================================


bindCardEvents(){



const buttons =

this.container.querySelectorAll(

".open-agent-btn"

);









buttons.forEach(button=>{



button.addEventListener(

"click",

()=>{



const id =

button.dataset.agent;





this.openAgent(id);



}

);



});



}









// ==========================================================
// SEARCH AGENTS
// ==========================================================


search(term){



const value =

term

.toLowerCase()

.trim();








if(!value){



this.render();



this.bindEvents();



return;



}









const filtered =

this.agents.filter(agent=>{



const content = `



${agent.name}



${agent.description}



${agent.category}



`

.toLowerCase();







return content.includes(value);



});








this.renderList(filtered);



}









// ==========================================================
// RENDER SEARCH RESULT
// ==========================================================


renderList(list){



const grid =

this.container.querySelector(

"#agentsGrid"

);







if(!grid)

return;









grid.innerHTML =



list

.map(agent=>


this.createAgentCard(agent)


)

.join("");








this.bindCardEvents();



}// ==========================================================
// OPEN AGENT STUDIO
// ==========================================================


openAgent(agentId){



const agent =

this.agents.find(item=>{


    return item.id === agentId;


});








if(!agent){



console.warn(

"[Agents UI] Agente não encontrado:",

agentId

);



return;



}









// Atualiza agente ativo no Engine


if(

Agents &&

typeof Agents.setActive === "function"

){



Agents.setActive(

agentId

);



}








// Abre Studio


if(

agentstudio &&

typeof agentstudio.open === "function"

){



agentstudio.open(

agent

);



}








// Evento global


document.dispatchEvent(



new CustomEvent(

"agent-selected",

{


detail:agent


}



)



);





}









// ==========================================================
// FILTER BUTTONS
// ==========================================================


renderFilters(){



const categories =

Agents.getCategories

?

Agents.getCategories()

:

[

"Todos"

];









return `



<div class="agent-filters">



${



categories

.map(category=>`



<button



class="filter-btn

${

this.activeFilter === category

?

"active"

:

""

}"



data-filter="${category}"

>



${category}



</button>



`)

.join("")



}



</div>



`;



}









bindFilterEvents(){



const buttons =

this.container.querySelectorAll(

".filter-btn"

);








buttons.forEach(button=>{



button.addEventListener(

"click",

()=>{



this.activeFilter =

button.dataset.filter;





this.render();



this.bindEvents();



}

);



});



}









// ==========================================================
// LISTEN STUDIO EVENTS
// ==========================================================


listenStudioEvents(){



document.addEventListener(



"agent-opened",



(event)=>{



const agent =

event.detail;







if(

agent &&

agent.id

){



this.selectAgent(

agent.id

);



}



}



);



}









// ==========================================================
// SELECT ACTIVE CARD
// ==========================================================


selectAgent(agentId){



if(!this.container)

return;









this.container

.querySelectorAll(

".agent-card"

)

.forEach(card=>{



card.classList.remove(

"active"

);



});









const active =

this.container.querySelector(



`[data-agent-id="${agentId}"]`



);








if(active){



active.classList.add(

"active"

);



}



}









// ==========================================================
// REFRESH ENGINE
// ==========================================================


refresh(){



this.loadAgents();



this.render();



this.bindEvents();



this.bindFilterEvents();



}// ==========================================================
// GET ACTIVE AGENT
// ==========================================================


getActiveAgent(){



if(!this.container)

return null;









const card =

this.container.querySelector(

".agent-card.active"

);









if(!card)

return null;








const id =

card.dataset.agentId;








return this.agents.find(agent=>{


    return agent.id === id;


}) || null;



}









// ==========================================================
// SET FILTER MANUALLY
// ==========================================================


setFilter(category){



this.activeFilter =

category;





this.render();



this.bindEvents();



this.bindFilterEvents();



}









// ==========================================================
// AUTO INIT
// ==========================================================


autoInit(){



const container =

document.getElementById(

"agentsContainer"

);








if(container){



this.init(

"agentsContainer"

);



}



}









// ==========================================================
// DESTROY
// ==========================================================


destroy(){



if(this.container){



this.container.innerHTML = "";



}









this.container = null;



this.agents = [];



this.searchInput = null;



}









}



// ==========================================================
// SINGLE INSTANCE
// ==========================================================


const agentsui =

new AgentsUI();





export default agentsui;
