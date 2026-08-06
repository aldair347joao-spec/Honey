/*
==========================================
HONEY IA
AGENTS UI ENGINE V6
Enterprise Agent Marketplace Interface
==========================================
*/

import agents from "./agents.js";
import agentstudio from "./agentstudio.js";


class AgentsUI {


constructor(){

    this.container = null;

    this.activeCategory = "Todos";

    this.searchText = "";

}



/*
==========================================
INITIALIZATION
==========================================
*/


init(containerId){


    this.container =
    document.getElementById(containerId);


    if(!this.container){

        console.warn(
            "[Agents UI] Container não encontrado:",
            containerId
        );

        return;

    }


    this.render();


    this.bindEvents();


}






/*
==========================================
MAIN RENDER
==========================================
*/


render(){


    if(!this.container) return;



    const agents =
    this.getFilteredAgents();



    this.container.innerHTML = `

    <div class="agents-header">

        <div>

            <h1>
            🐝 Agentes Honey IA
            </h1>


            <p>
            Escolha um especialista inteligente
            para o seu trabalho.
            </p>

        </div>


        <div class="agents-search">

            <input
            id="agentSearch"
            type="text"
            placeholder="Pesquisar agente..."
            value="${this.searchText}"
            >

        </div>


    </div>



    <div class="agents-categories">

        ${
            Agents
            .getCategories()
            .map(category=>`

                <button
                class="
                agent-category
                ${
                    this.activeCategory===category
                    ?
                    "active"
                    :
                    ""
                }
                "
                data-category="${category}"
                >

                ${category}

                </button>

            `)
            .join("")
        }

    </div>



    <div class="agents-grid">


        ${
            agents.length

            ?

            agents
            .map(agent =>
                this.createAgentCard(agent)
            )
            .join("")

            :

            `
            <div class="empty-agents">

                Nenhum agente encontrado.

            </div>
            `

        }


    </div>


    `;


}






/*
==========================================
FILTER SYSTEM
==========================================
*/


getFilteredAgents(){


    let result;


    if(this.activeCategory==="Todos"){

        result =
        Agents.getAll();

    }

    else{

        result =
        Agents.filterByCategory(
            this.activeCategory
        );

    }



    if(this.searchText){


        const text =
        this.searchText
        .toLowerCase();



        result =
        result.filter(agent=>{


            return (

                agent.name
                .toLowerCase()
                .includes(text)


                ||

                agent.description
                ?.toLowerCase()
                .includes(text)


            );


        });


    }



    return result;


}






/*
==========================================
AGENT CARD
==========================================
*/


createAgentCard(agent){


return `

<div class="agent-card"

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
"Agente especializado Honey IA"}

</p>



<div class="agent-meta">


<span>

${agent.category || "Tecnologia"}

</span>


<span>

${agent.level || "Professional"}

</span>


</div>


</div>



<button

class="open-agent-btn"

data-open-agent="${agent.id}"

>

Abrir Studio

</button>


</div>


`;

}



export default new agentsui();/*
==========================================
EVENT SYSTEM
==========================================
*/


bindEvents(){


    if(!this.container)
    return;



    /*
    ===============================
    SEARCH
    ===============================
    */


    const searchInput =
    document.getElementById(
        "agentSearch"
    );



    if(searchInput){


        searchInput.addEventListener(
            "input",
            (event)=>{


                this.searchText =
                event.target.value;



                this.render();


                this.restoreSearchFocus();


            }
        );


    }






    /*
    ===============================
    CATEGORY BUTTONS
    ===============================
    */


    const categoryButtons =
    this.container.querySelectorAll(
        ".agent-category"
    );



    categoryButtons.forEach(button=>{


        button.addEventListener(
            "click",
            ()=>{


                this.activeCategory =
                button.dataset.category;



                this.render();



            }
        );


    });







    /*
    ===============================
    OPEN AGENT STUDIO
    ===============================
    */


    const openButtons =
    this.container.querySelectorAll(
        "[data-open-agent]"
    );



    openButtons.forEach(button=>{


        button.addEventListener(
            "click",
            ()=>{


                const agentId =
                button.dataset.openAgent;



                this.openAgent(
                    agentId
                );


            }
        );


    });



}







/*
==========================================
SEARCH FOCUS RESTORE
==========================================
*/


restoreSearchFocus(){


    const input =
    document.getElementById(
        "agentSearch"
    );


    if(input){


        input.focus();



        input.selectionStart =
        input.value.length;


    }


}








/*
==========================================
OPEN AGENT
==========================================
*/


openAgent(id){



    const agent =
    Agents.get(id);



    if(!agent){


        console.warn(
            "[Agents UI] Agente não encontrado:",
            id
        );


        return;


    }







    /*
    Guarda agente ativo
    no Agent Engine
    */


    Agents.setActive(id);








    /*
    Integração com Agent Studio
    */


    if(
        agentstudio &&
        typeof agentstudio.open === "function"
    ){


        agentstudio.open(agent);



    }






    /*
    Evento global para outros módulos
    */


    document.dispatchEvent(

        new CustomEvent(
            "agent-selected",
            {

                detail:agent

            }
        )

    );






    this.showAgentNotification(
        agent
    );


}








/*
==========================================
NOTIFICATION
==========================================
*/


showAgentNotification(agent){



    const toast =
    document.createElement(
        "div"
    );



    toast.className =
    "agent-toast";



    toast.innerHTML = `


    <strong>

    ${agent.emoji || "🤖"}
    ${agent.name}

    </strong>


    <span>

    Agente ativado

    </span>


    `;



    document.body.appendChild(
        toast
    );



    setTimeout(()=>{


        toast.classList.add(
            "show"
        );


    },50);





    setTimeout(()=>{


        toast.classList.remove(
            "show"
        );



        setTimeout(()=>{


            toast.remove();


        },300);



    },3000);



} /*
==========================================
AGENT EVENTS INTEGRATION
==========================================
*/


listenAgentEvents(){


    document.addEventListener(
        "agent-updated",
        ()=>{


            this.render();


        }
    );



    document.addEventListener(
        "agents-refresh",
        ()=>{


            this.render();


        }
    );


}








/*
==========================================
ACTIVE AGENT DISPLAY
==========================================
*/


renderActiveAgent(){



    const active =
    Agents.getActive();



    const element =
    document.getElementById(
        "activeAgent"
    );



    if(!element || !active)
    return;





    element.innerHTML = `


    <div class="active-agent-box">


        <div class="active-agent-icon">

        ${active.emoji || "🤖"}

        </div>



        <div>


            <strong>

            ${active.name}

            </strong>


            <span>

            Agente ativo

            </span>


        </div>



    </div>


    `;



}








/*
==========================================
AGENT STATISTICS
==========================================
*/


getAgentStatistics(){


    const agents =
    Agents.getAll();



    return {


        total:
        agents.length,



        online:
        agents.filter(
            agent=>
            agent.status==="online"
        ).length,



        featured:
        agents.filter(
            agent=>
            agent.featured
        ).length



    };


}









/*
==========================================
DASHBOARD WIDGET
==========================================
*/


createSummaryWidget(){


    const stats =
    this.getAgentStatistics();



    return `


    <div class="agent-summary-widget">


        <div class="summary-item">


            <strong>

            ${stats.total}

            </strong>


            <span>

            Agentes

            </span>


        </div>




        <div class="summary-item">


            <strong>

            ${stats.online}

            </strong>


            <span>

            Online

            </span>


        </div>





        <div class="summary-item">


            <strong>

            ${stats.featured}

            </strong>


            <span>

            Destaques

            </span>


        </div>



    </div>


    `;



}









/*
==========================================
PROGRAMMATIC SELECT
==========================================
*/


selectAgent(id){



    const agent =
    Agents.setActive(id);



    if(agent){


        this.openAgent(
            agent.id
        );


    }



    return agent;


}








/*
==========================================
REFRESH UI
==========================================
*/


refresh(){


    this.render();


    this.renderActiveAgent();


}






/*
==========================================
INITIALIZE EXTENSIONS
==========================================
*/


enableExtensions(){


    this.listenAgentEvents();



} /*
==========================================
FINAL BOOTSTRAP
==========================================
*/


boot(){


    this.enableExtensions();



    if(this.container){

        this.refresh();

    }



}







/*
==========================================
PUBLIC API
==========================================
*/


getCurrentAgent(){


    return agents.getActive();


}




getAllAgents(){


    return agents.getAll();


}




searchAgents(text){


    this.searchText =
    text || "";



    this.render();


}




setCategory(category){


    if(
        Agents
        .getCategories()
        .includes(category)
    ){


        this.activeCategory =
        category;



        this.render();


    }


}







/*
==========================================
DEBUG / TELEMETRY
==========================================
*/


getStatus(){


    return {


        loaded:true,


        totalAgents:
        Agents.getAll().length,


        activeAgent:
        Agents.activeAgent,


        category:
        this.activeCategory,


        search:
        this.searchText



    };


}



}




/*
==========================================
EXPORT INSTANCE
==========================================
*/


const agentsui =
new AgentsUI();



export default agentsui;
