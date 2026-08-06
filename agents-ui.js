/*
==========================================
HONEY IA
AGENTS UI ENGINE V6
Enterprise Agent Marketplace Interface
30 Specialized Agents
==========================================
*/


import agents from "./agents.js";
import agentstudio from "./agentstudio.js";



class AgentsUI {



constructor(){


    this.container = null;


    this.searchInput = null;


    this.activeCategory = "Todos";


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



    this.render();



}









/*
==========================================
MAIN RENDER
==========================================
*/


render(){



    if(!this.container)
    return;



    const agents =
    Agents.getAll();



    this.container.innerHTML = `


    <div class="agents-workspace">


        <div class="agents-header">


            <div class="agents-title">


                <h1>
                    🐝 Honey IA Agents
                </h1>


                <p>
                    Escolha um especialista
                    de inteligência artificial
                    para o seu projeto.
                </p>


            </div>




            <div class="agents-search">


                <input 
                id="agentsSearchInput"
                type="text"
                placeholder="Pesquisar agente..."
                >


            </div>


        </div>





        <div class="agents-categories">


            ${
                Agents.getCategories()
                .map(category=>`


                    <button
                    class="category-btn ${
                        category === this.activeCategory
                        ? "active"
                        : ""
                    }"
                    data-category="${category}"
                    >


                        ${category}


                    </button>


                `)
                .join("")
            }


        </div>





        <div
        class="agents-grid"
        id="agentsGrid"
        >


            ${
                this.renderCards(
                    agents
                )
            }


        </div>



    </div>


    `;



    this.bindEvents();


}









/*
==========================================
AGENT CARDS
==========================================
*/


renderCards(agents){



    if(!agents.length){


        return `

        <div class="empty-agents">

            Nenhum agente encontrado.

        </div>

        `;


    }






    return agents.map(agent=>`


        <div 
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
                    ${
                    agent.description ||
                    "Especialista Honey IA"
                    }
                </p>



                <span class="agent-category">

                    ${agent.category}

                </span>


            </div>





            <button
            class="open-agent-btn"
            data-open-agent="${agent.id}"
            >


                Abrir Studio


            </button>




        </div>


    `).join("");



}/*
==========================================
EVENT BINDING
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


    this.searchInput =
    document.getElementById(
        "agentsSearchInput"
    );



    if(this.searchInput){


        this.searchInput.addEventListener(

            "input",

            ()=>{


                const query =
                this.searchInput.value;



                const results =
                Agents.search(
                    query
                );



                this.updateGrid(
                    results
                );



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
        "[data-category]"
    );



    categoryButtons.forEach(button=>{


        button.addEventListener(

            "click",

            ()=>{


                this.activeCategory =
                button.dataset.category;



                categoryButtons.forEach(btn=>{


                    btn.classList.remove(
                        "active"
                    );


                });



                button.classList.add(
                    "active"
                );



                const filtered =
                Agents.filterByCategory(
                    this.activeCategory
                );



                this.updateGrid(
                    filtered
                );



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



                const agent =
                Agents.get(
                    agentId
                );



                if(!agent)
                return;




                agentstudio.open(
                    agent
                );



                this.highlightAgent(
                    agentId
                );



                agentstudio.notifyAgentChange();



            }

        );


    });



}









/*
==========================================
UPDATE GRID DYNAMICALLY
==========================================
*/


updateGrid(agents){



    const grid =
    document.getElementById(
        "agentsGrid"
    );



    if(!grid)
    return;



    grid.innerHTML =
    this.renderCards(
        agents
    );



    this.bindAgentButtons();



}









/*
==========================================
RE-BIND CARD BUTTONS
==========================================
*/


bindAgentButtons(){



    const buttons =
    this.container.querySelectorAll(
        "[data-open-agent]"
    );



    buttons.forEach(button=>{


        button.addEventListener(

            "click",

            ()=>{


                const id =
                button.dataset.openAgent;



                const agent =
                Agents.get(
                    id
                );



                if(agent){


                    agentstudio.open(
                        agent
                    );


                    this.highlightAgent(
                        id
                    );


                }



            }

        );


    });


}









/*
==========================================
ACTIVE CARD EFFECT
==========================================
*/


highlightAgent(agentId){



    const cards =
    this.container.querySelectorAll(
        ".agent-card"
    );



    cards.forEach(card=>{


        if(
            card.dataset.agentId ===
            agentId
        ){


            card.classList.add(
                "active"
            );


        }

        else{


            card.classList.remove(
                "active"
            );


        }


    });


}/*
==========================================
FEATURED AGENTS SECTION
==========================================
*/


renderFeatured(){



    const featured =
    Agents.getFeatured();



    if(!featured.length){


        return "";


    }




    return `


    <section class="featured-agents">


        <div class="section-header">


            <h2>
                ⭐ Agentes em Destaque
            </h2>


            <p>
                Especialistas recomendados
                para tarefas avançadas.
            </p>


        </div>




        <div class="featured-grid">


            ${
                featured
                .map(agent=>`


                    <div 
                    class="featured-agent-card"
                    data-open-agent="${agent.id}"
                    >


                        <div class="featured-icon">

                            ${agent.emoji || "🤖"}

                        </div>



                        <h3>
                            ${agent.name}
                        </h3>



                        <p>

                            ${
                            agent.description ||
                            "Especialista Honey IA"
                            }

                        </p>



                    </div>


                `)
                .join("")
            }


        </div>



    </section>


    `;


}









/*
==========================================
SMART RECOMMENDATION
==========================================
*/


recommend(prompt = ""){



    const result =
    Agents.recommend(
        prompt
    );



    if(!result)
    return null;



    return {


        primary:
        result.primary,



        alternatives:
        result.alternatives



    };


}









/*
==========================================
RENDER RECOMMENDED AGENT
==========================================
*/


renderRecommendation(prompt){



    const recommendation =
    this.recommend(
        prompt
    );



    if(
        !recommendation ||
        !recommendation.primary
    ){

        return "";

    }




    const agent =
    recommendation.primary;



    return `


    <div class="agent-recommendation">


        <div class="recommendation-icon">

            🧠

        </div>




        <div class="recommendation-info">


            <span>

                Sugestão Honey IA

            </span>


            <h3>

                ${agent.name}

            </h3>



            <p>

                ${
                agent.description ||
                "Agente recomendado para esta tarefa."
                }

            </p>


        </div>




        <button
        data-open-agent="${agent.id}"
        class="recommend-agent-btn"
        >

            Usar Agente

        </button>



    </div>


    `;



}









/*
==========================================
AGENT PROFILE PANEL
==========================================
*/


showAgentProfile(agentId){



    const agent =
    Agents.get(
        agentId
    );



    if(!agent)
    return;



    const profile =
    {


        id:
        agent.id,


        name:
        agent.name,


        category:
        agent.category,


        level:
        agent.level,


        tools:
        agent.tools || [],


        description:
        agent.description || "",


        status:
        agent.status || "online"



    };



    this.emit(

        "agent-profile-open",

        profile

    );



    return profile;



}









/*
==========================================
GLOBAL UI EVENTS
==========================================
*/


emit(event,data){



    document.dispatchEvent(

        new CustomEvent(

            event,

            {

                detail:data

            }

        )

    );



}









/*
==========================================
LISTEN TO AGENT CHANGES
==========================================
*/


listenStudio(){



    document.addEventListener(

        "agent-changed",

        (event)=>{


            const agent =
            event.detail;



            if(agent && agent.id){


                this.highlightAgent(
                    agent.id
                );


            }



        }

    );



}/*
==========================================
LIVE UPDATE AGENTS
==========================================
*/


refresh(){



    if(!this.container)
    return;



    this.render();



}









/*
==========================================
OPEN AGENT DIRECTLY
==========================================
*/


openAgent(agentId){



    const agent =
    Agents.get(
        agentId
    );



    if(!agent)
    return;



    agentstudio.open(
        agent
    );



    this.highlightAgent(
        agentId
    );



    this.showAgentProfile(
        agentId
    );



}









/*
==========================================
GET ACTIVE AGENT
==========================================
*/


getActiveAgent(){



    return Agents.getActive();



}









/*
==========================================
AGENT STATISTICS
==========================================
*/


getStats(){



    const all =
    Agents.getAll();



    return {


        total:
        all.length,



        categories:
        Agents.getCategories()
        .length,



        featured:
        Agents.getFeatured()
        .length



    };


}









/*
==========================================
CLEAN UI
==========================================
*/


destroy(){



    if(this.container){


        this.container.innerHTML =
        "";


    }



    this.container =
    null;



    this.searchInput =
    null;



}









}









/*
==========================================
HONEY IA AGENTS UI INSTANCE
==========================================
*/


const agentsui =
new AgentsUI();



export default agentsui;
