/*
==========================================
HONEY IA
AGENTS UI ENGINE V7
30 Specialist Agents Workspace
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
    ======================================
    INITIALIZATION
    ======================================
    */


    init(containerId){



        this.container =

        document.getElementById(
            containerId
        );





        if(
            !this.container
        ){



            console.warn(

            "[Agents UI] Container não encontrado:",

            containerId

            );



            return;



        }









        this.loadAgents();



        this.render();



        this.bindEvents();



    }









    /*
    ======================================
    LOAD AGENTS
    ======================================
    */


    loadAgents(){



        if(
            typeof Agents.getAll ===
            "function"
        ){



            this.agents =

            Agents.getAll();



        }

        else{



            this.agents =

            Object.values(
                Agents.registry || {}
            );



        }



    }









    /*
    ======================================
    FILTER AGENTS
    ======================================
    */


    filterAgents(){



        if(
            this.activeFilter ===
            "all"
        ){



            return this.agents;



        }









        return this.agents.filter(

            agent=>{


                return (

                    agent.category ===

                    this.activeFilter

                );


            }

        );



    }









    /*
    ======================================
    RENDER MAIN
    ======================================
    */


    render(){



        if(
            !this.container
        )
        return;





        const agents =

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



    }/*
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

                agent.emoji ||

                "🤖"

            }


        </div>





        <div class="agent-card-info">



            <h3>


            ${

                agent.name ||

                "Agente Honey IA"

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



}









/*
==========================================
EVENT BINDING
==========================================
*/


bindEvents(){



    if(
        !this.container
    )
    return;








    /*
    ------------------------------
    SEARCH
    ------------------------------
    */


    this.searchInput =

    this.container.querySelector(

        "#agentSearch"

    );









    if(
        this.searchInput
    ){



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









    /*
    ------------------------------
    OPEN AGENT BUTTONS
    ------------------------------
    */


    const buttons =

    this.container
    .querySelectorAll(

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
SEARCH AGENTS
==========================================
*/


search(term){



    const value =

    term

    .toLowerCase()

    .trim();









    if(
        !value
    ){



        this.render();



        this.bindEvents();



        return;



    }









    const filtered =

    this.agents.filter(

        agent=>{


            const text =

            `

            ${agent.name}

            ${agent.description}

            ${agent.category}

            `

            .toLowerCase();





            return text.includes(
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








    if(
        !agent
    ){



        console.warn(

        "[Agents UI] Agente não encontrado:",

        agentId

        );



        return;



    }









    if(
        agentstudio &&

        typeof agentstudio.open ===
        "function"

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



}/*
==========================================
RENDER FILTERED LIST
==========================================
*/


renderList(list){



    if(
        !this.container
    )
    return;








    const grid =

    this.container.querySelector(

        "#agentsGrid"

    );









    if(
        !grid
    )
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
CARD EVENTS ONLY
==========================================
*/


bindCardEvents(){



    if(
        !this.container
    )
    return;








    const buttons =

    this.container
    .querySelectorAll(

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



}









/*
==========================================
GET CATEGORIES
==========================================
*/


getCategories(){



    const categories =

    new Set();








    this.agents.forEach(agent=>{



        if(
            agent.category
        ){



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









/*
==========================================
RENDER FILTER BAR
==========================================
*/


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

            }"



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
UPDATE COMPLETE RENDER
==========================================
*/


refresh(){



    this.loadAgents();



    this.render();



    this.bindEvents();



}









/*
==========================================
SELECT ACTIVE AGENT
==========================================
*/


selectAgent(agentId){



    const agent =

    this.agents.find(

        item=>

        item.id === agentId

    );








    if(
        !agent
    )
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









    const activeCard =

    this.container
    .querySelector(

        `[data-agent-id="${agentId}"]`

    );








    if(
        activeCard
    ){



        activeCard.classList.add(

            "active"

        );



    }








    return agent;



}









/*
==========================================
EVENT FROM AGENT STUDIO
==========================================
*/


listenStudioEvents(){



    document.addEventListener(

        "agent-opened",

        (event)=>{



            const agent =

            event.detail;





            if(agent?.id){



                this.selectAgent(

                    agent.id

                );



            }



        }

    );



}/*
==========================================
AGENT STATE LISTENER
SYNC WITH STUDIO
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



    const active =

    this.container

    ?

    this.container.querySelector(

        ".agent-card.active"

    )

    :

    null;









    if(
        !active
    )
    return null;








    const id =

    active.dataset.agentId;








    return this.agents.find(

        agent =>

        agent.id === id

    );



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
DESTROY
==========================================
*/


destroy(){



    if(
        this.container
    ){



        this.container.innerHTML =
        "";



    }





    this.container =
    null;



    this.agents =
    [];



}









/*
==========================================
SAFE INIT
==========================================
*/


autoInit(){



    const container =

    document.getElementById(

        "agentsContainer"

    );








    if(
        container
    ){



        this.init(

            "agentsContainer"

        );



    }



}









}


// ==========================================================
// EXPORT SINGLE INSTANCE
// ==========================================================


export default new AgentsUI();
