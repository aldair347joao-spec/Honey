/*
==========================================
HONEY IA
AGENTS UI ENGINE V8
30 Specialist Agents Workspace
Compatible with Agent Studio V8
==========================================
*/


import Agents from "./agents.js";
import agentstudio from "./agentstudio.js";



class AgentsUI {


    constructor(){

        this.container = null;

        this.searchInput = null;

        this.agents = [];

        this.activeFilter = "Todos";

    }






    /*
    ======================================
    INIT
    ======================================
    */


    init(containerId){


        this.container = document.getElementById(
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







    /*
    ======================================
    LOAD AGENTS
    ======================================
    */


    loadAgents(){


        if(
            Agents &&
            typeof Agents.getAll === "function"
        ){


            this.agents = Agents.getAll();


        }
        else{


            this.agents = [];


            console.warn(
                "[Agents UI] Nenhum agente encontrado."
            );


        }


    }







    /*
    ======================================
    FILTER
    ======================================
    */


    getFilteredAgents(){


        if(
            this.activeFilter === "Todos"
        ){

            return this.agents;

        }



        return this.agents.filter(agent=>{


            return (
                agent.category === this.activeFilter
            );


        });


    }







    /*
    ======================================
    RENDER
    ======================================
    */


    render(){


        if(!this.container)
        return;



        const agents = this.getFilteredAgents();



        this.container.innerHTML = `


        <div class="agents-toolbar">


            <div class="agents-title">


                <h1>
                    Agentes Honey IA
                </h1>


                <p>
                    Especialistas inteligentes para cada necessidade.
                </p>


            </div>



            <input

            id="agentSearch"

            class="agent-search"

            type="search"

            placeholder="Pesquisar agente..."

            >


        </div>





        ${this.renderFilters()}





        <div

        class="agents-grid"

        id="agentsGrid">


            ${
                agents
                .map(agent =>
                    this.createAgentCard(agent)
                )
                .join("")
            }


        </div>


        `;


    }








    /*
    ======================================
    AGENT CARD
    ======================================
    */


    createAgentCard(agent){


        return `


        <article

        class="agent-card"

        data-agent-id="${agent.id}"

        >



            <div class="agent-icon">

                ${agent.emoji || "🤖"}

            </div>




            <div class="agent-info">


                <h3>

                    ${agent.name}

                </h3>



                <p>

                    ${agent.description || 
                    "Especialista Honey IA"}

                </p>




                <span>

                    ${agent.category || "Tecnologia"}

                </span>



            </div>





            <button

            class="open-agent-btn"

            data-agent="${agent.id}"

            >

                Abrir Studio

            </button>



        </article>


        `;


    }/*
==========================================
FILTER BAR
==========================================
*/


renderFilters(){


    const categories = [

        "Todos",

        ...new Set(

            this.agents.map(agent =>

                agent.category

            )

        )

    ];





    return `


    <div class="agent-filters">


    ${
        categories.map(category => `


            <button

            class="filter-btn 
            ${
                this.activeFilter === category
                ? "active"
                : ""
            }"

            data-filter="${category}"

            >


                ${category}


            </button>


        `).join("")
    }


    </div>


    `;


}







/*
==========================================
EVENTS
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








    const filterButtons =

    this.container.querySelectorAll(
        ".filter-btn"
    );





    filterButtons.forEach(button=>{


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









    const openButtons =

    this.container.querySelectorAll(
        ".open-agent-btn"
    );







    openButtons.forEach(button=>{


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








/*
==========================================
SEARCH
==========================================
*/


search(term=""){



    const value =

    term
    .toLowerCase()
    .trim();







    if(!value){


        this.render();

        this.bindEvents();

        return;


    }








    const result =

    this.agents.filter(agent=>{


        const content = `

        ${agent.name}

        ${agent.description}

        ${agent.category}

        `

        .toLowerCase();




        return content.includes(value);



    });








    this.renderList(result);



}







/*
==========================================
RENDER LIST
==========================================
*/


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



}







/*
==========================================
CARD EVENTS
==========================================
*/


bindCardEvents(){


    const buttons =

    this.container.querySelectorAll(
        ".open-agent-btn"
    );







    buttons.forEach(button=>{


        button.addEventListener(
            "click",
            ()=>{


                this.openAgent(
                    button.dataset.agent
                );


            }
        );


    });



}/*
==========================================
OPEN AGENT STUDIO
==========================================
*/


openAgent(agentId){


    const agent =

    this.agents.find(item =>

        item.id === agentId

    );





    if(!agent){


        console.warn(

            "[Agents UI] Agente não encontrado:",

            agentId

        );


        return;


    }







    /*
    ------------------------------
    DEFINE AGENTE ATIVO
    ------------------------------
    */


    if(
        Agents &&
        typeof Agents.setActive === "function"
    ){


        Agents.setActive(
            agent.id
        );


    }







    /*
    ------------------------------
    ABRE O STUDIO
    ------------------------------
    */


    if(
        agentstudio &&
        typeof agentstudio.open === "function"
    ){


        agentstudio.open(
            agent
        );


    }







    /*
    ------------------------------
    EVENT BUS GLOBAL
    ------------------------------
    */


    document.dispatchEvent(

        new CustomEvent(

            "agent-selected",

            {

                detail: agent

            }

        )

    );




    this.selectAgent(
        agent.id
    );


}









/*
==========================================
SELECT ACTIVE CARD
==========================================
*/


selectAgent(agentId){


    if(!this.container)
    return;






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






    return this.agents.find(agent =>

        agent.id === agentId

    );



}









/*
==========================================
LISTEN STUDIO EVENTS
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
ACTIVE AGENT
==========================================
*/


getActiveAgent(){


    const card =

    this.container?.querySelector(

        ".agent-card.active"

    );






    if(!card)
    return null;






    const id =

    card.dataset.agentId;







    return this.agents.find(agent =>

        agent.id === id

    );



}








/*
==========================================
REFRESH
==========================================
*/


refresh(){


    this.loadAgents();


    this.render();


    this.bindEvents();



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



}/*
==========================================
GET CATEGORIES
==========================================
*/


getCategories(){


    const categories = new Set();



    this.agents.forEach(agent=>{


        if(agent.category){


            categories.add(
                agent.category
            );


        }


    });





    return [

        "Todos",

        ...categories

    ];



}









/*
==========================================
SYNC WITH AGENT STUDIO
==========================================
*/


syncStudio(){


    document.addEventListener(

        "agent-opened",

        event=>{


            const agent = event.detail;



            if(agent?.id){


                this.selectAgent(
                    agent.id
                );


            }


        }

    );



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
DESTROY
==========================================
*/


destroy(){


    if(this.container){


        this.container.innerHTML = "";


    }



    this.container = null;


    this.agents = [];


}






}



// ==========================================================
// SINGLE INSTANCE
// ==========================================================


export default new AgentsUI();
