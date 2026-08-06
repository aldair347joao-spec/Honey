/*
==========================================
HONEY IA
AGENTS UI ENGINE V8
30 Specialist Agents Workspace
Connected with Agent Studio V7
==========================================
*/


import agents from "./agents.js";

import agentstudio from "./agentstudio.js";





class AgentsUI {



constructor(){


    this.container = null;


    this.searchInput = null;


    this.activeFilter = "all";


    this.agents = [];


}









/*
==========================================
INITIALIZATION
==========================================
*/


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


    this.listenAgentChanges();



}









/*
==========================================
LOAD AGENTS
==========================================
*/


loadAgents(){



    if(

        agents &&

        typeof agents.getAll === "function"

    ){



        this.agents =

        agents.getAll();



    }else{



        console.warn(

        "[Agents UI] Engine de agentes inválida."

        );


        this.agents = [];



    }



}









/*
==========================================
FILTER AGENTS
==========================================
*/


filterAgents(){



    if(

        this.activeFilter === "all"

    ){



        return this.agents;



    }








    return this.agents.filter(

        agent =>

        agent.category === this.activeFilter

    );



}









/*
==========================================
MAIN RENDER
==========================================
*/


render(){



    if(!this.container)

    return;








    const list =

    this.filterAgents();








    this.container.innerHTML = `



    <div class="agents-header">


        <div>


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

        placeholder="Pesquisar agente..."

        />



    </div>







    ${

        this.renderFilters()

    }







    <div

    class="agents-grid"

    id="agentsGrid">



    ${

        list

        .map(agent =>

            this.createAgentCard(agent)

        )

        .join("")

    }



    </div>



    `;



}









/*
==========================================
CREATE AGENT CARD
==========================================
*/


createAgentCard(agent){



return `



<div

class="agent-card"

data-agent-id="${agent.id}"

>





<div class="agent-card-icon">

${

agent.emoji || "🤖"

}

</div>






<div class="agent-card-info">


<h3>

${

agent.name || "Honey Agent"

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






<div class="agent-card-actions">


<button

class="open-agent-btn"

data-agent="${agent.id}"

>

Abrir Studio

</button>



</div>





</div>



`;



}/*
==========================================
EVENT BINDING
==========================================
*/


bindEvents(){



    if(!this.container)

    return;







    this.searchInput =

    this.container.querySelector(

        "#agentSearch"

    );








    if(this.searchInput){



        this.searchInput.addEventListener(

            "input",

            ()=>{


                this.search(

                    this.searchInput.value

                );


            }

        );



    }









    this.bindCardEvents();



}









/*
==========================================
CARD BUTTON EVENTS
==========================================
*/


bindCardEvents(){



    if(!this.container)

    return;








    const buttons =

    this.container.querySelectorAll(

        ".open-agent-btn"

    );








    buttons.forEach(button=>{



        button.addEventListener(

            "click",

            ()=>{


                const agentId =

                button.dataset.agent;





                this.openAgent(

                    agentId

                );



            }

        );



    });



}









/*
==========================================
SEARCH
==========================================
*/


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

    this.agents.filter(

        agent=>{



            const content = `

            ${agent.name}

            ${agent.description}

            ${agent.category}

            ${agent.id}

            `

            .toLowerCase();





            return content.includes(

                value

            );



        }

    );









    this.renderList(

        filtered

    );



}









/*
==========================================
OPEN AGENT STUDIO
==========================================
*/


openAgent(agentId){



    const agent =

    this.agents.find(

        item =>

        item.id === agentId

    );








    if(!agent){



        console.warn(

        "[Agents UI] Agente não encontrado:",

        agentId

        );


        return;



    }








    if(

        agents &&

        typeof agents.setActive === "function"

    ){



        agents.setActive(

            agent.id

        );



    }









    if(

        agentstudio &&

        typeof agentstudio.open === "function"

    ){



        agentstudio.open(

            agent

        );



    }









    document.dispatchEvent(

        new CustomEvent(

            "agent-selected",

            {

                detail:agent

            }

        )

    );









    document.dispatchEvent(

        new CustomEvent(

            "agent-opened",

            {

                detail:agent

            }

        )

    );



}









/*
==========================================
RENDER FILTERED LIST
==========================================
*/


renderList(list){



    if(!this.container)

    return;








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



}/*
==========================================
FILTER SYSTEM
==========================================
*/


getCategories(){



    const categories =

    new Set();








    this.agents.forEach(agent=>{



        if(agent.category){



            categories.add(

                agent.category

            );



        }



    });








    return [

        "all",

        ...categories

    ];



}









renderFilters(){



    const categories =

    this.getCategories();








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

        }

        "

        data-filter="${category}"

        >



        ${

            category === "all"

            ?

            "Todos"

            :

            category

        }



        </button>



        `)

        .join("")

    }



    </div>



    `;



}









/*
==========================================
SET FILTER
==========================================
*/


setFilter(category){



    this.activeFilter =

    category;





    this.render();


    this.bindEvents();



}









/*
==========================================
SELECT ACTIVE AGENT
==========================================
*/


selectAgent(agentId){



    if(!this.container)

    return null;








    const cards =

    this.container.querySelectorAll(

        ".agent-card"

    );








    cards.forEach(card=>{



        card.classList.remove(

            "active"

        );



    });








    const activeCard =

    this.container.querySelector(

        `[data-agent-id="${agentId}"]`

    );








    if(activeCard){



        activeCard.classList.add(

            "active"

        );



    }








    return this.agents.find(

        agent =>

        agent.id === agentId

    );



}









/*
==========================================
STUDIO EVENT LISTENER
==========================================
*/


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









/*
==========================================
AGENT CHANGE LISTENER
==========================================
*/


listenAgentChanges(){



    document.addEventListener(

        "agent-selected",

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









/*
==========================================
GET ACTIVE AGENT
==========================================
*/


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








    return this.agents.find(

        agent =>

        agent.id === id

    );



}









/*
==========================================
REFRESH ENGINE
==========================================
*/


refresh(){



    this.loadAgents();


    this.render();


    this.bindEvents();



}/*
==========================================
DESTROY
==========================================
*/


destroy(){



    if(this.container){



        this.container.innerHTML = "";



    }








    this.container = null;


    this.searchInput = null;


    this.agents = [];


}









/*
==========================================
AUTO INIT
==========================================
*/


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









/*
==========================================
GET ALL LOADED AGENTS
==========================================
*/


getAgents(){



    return this.agents;



}









/*
==========================================
OPEN BY ID
==========================================
*/


openById(agentId){



    const agent =

    this.agents.find(

        item =>

        item.id === agentId

    );








    if(agent){



        this.openAgent(

            agentId

        );



    }



}









/*
==========================================
EXPORT SINGLE INSTANCE
==========================================
*/


}



export default new AgentsUI();
