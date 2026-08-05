/*
==========================================
HONEY IA
AGENTS UI CONTROLLER V2.0
Premium Agent Marketplace
==========================================
*/


import agents from "./agents.js";
import agentstudio from "./agentstudio.js";
import liveclient from "./liveclient.js";



class AgentsUI {


    constructor(){

        this.container = null;

        this.search = "";

        this.category = "Todos";

    }





    init(containerId){


        this.container =

        document.getElementById(containerId)

        ||

        document.getElementById(
            "agentmarketplacecontainer"
        );



        if(!this.container){

            console.error(
                "Agents UI container não encontrado."
            );

            return;

        }



        this.render();

    }






    render(){


        const allAgents = agents.getAll();



        this.container.innerHTML = `


        <div class="agent-studio">



            <header class="agent-market-header">


                <div>


                    <span class="market-badge">

                    <i class="fa-solid fa-sparkles"></i>

                    Honey Intelligence

                    </span>



                    <h2>

                    Agents Studio

                    </h2>



                    <p>

                    Escolha especialistas digitais
                    preparados para empresas e profissionais.

                    </p>


                </div>




            </header>






            <div class="agent-tools">


                <div class="agent-search">


                    <i class="fa-solid fa-search"></i>


                    <input

                    type="text"

                    id="agentSearch"

                    placeholder="Pesquisar agente..."

                    >


                </div>






                <div class="agent-filters">


                    <button class="filter active">

                    Todos

                    </button>


                    <button class="filter">

                    Negócios

                    </button>


                    <button class="filter">

                    Criativos

                    </button>


                    <button class="filter">

                    Técnicos

                    </button>



                </div>


            </div>






            <div class="agents-grid" id="agentsGrid">


            ${this.createCards(allAgents)}


            </div>




        </div>


        `;



        this.attachEvents();


    }






    createCards(list){


        return list.map(agent => `


        <article

        class="agent-card"

        data-agent="${agent.id}"

        >



            <div class="agent-top">



                <div class="agent-avatar">

                    ${agent.emoji || "🐝"}

                </div>





                <div>


                    <h3>

                    ${agent.name}

                    </h3>


                    <span class="agent-role">

                    ${agent.category || "Especialista IA"}

                    </span>


                </div>



            </div>





            <p>

            ${agent.description}

            </p>






            <div class="agent-online">


                <span></span>

                Online agora


            </div>





            <button

            class="agent-open-btn"

            data-id="${agent.id}"

            >


            Abrir Studio

            <i class="fa-solid fa-arrow-right"></i>


            </button>



        </article>


        `).join("");

    }



    attachEvents(){



        /*
        ===============================
        PESQUISA DE AGENTES
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


                    this.search =
                    event.target.value
                    .toLowerCase();



                    this.updateAgents();


                }

            );


        }







        /*
        ===============================
        FILTROS
        ===============================
        */


        const filters =

        this.container.querySelectorAll(
            ".filter"
        );




        filters.forEach(button=>{


            button.addEventListener(
                "click",
                ()=>{


                    filters.forEach(
                        item=>
                        item.classList.remove(
                            "active"
                        )
                    );



                    button.classList.add(
                        "active"
                    );



                    this.category =
                    button.textContent;



                    this.updateAgents();


                }

            );


        });









        /*
        ===============================
        ABRIR AGENTE
        ===============================
        */


        this.container

        .querySelectorAll(
            ".agent-open-btn"
        )

        .forEach(button=>{


            button.addEventListener(
                "click",
                ()=>{


                    const id =
                    button.dataset.id;



                    this.openAgent(id);



                }

            );


        });



    }









    updateAgents(){



        let list =
        agents.getAll();




        /*
        FILTRO POR TEXTO
        */


        if(this.search){


            list =
            list.filter(agent=>{


                return (

                    agent.name
                    .toLowerCase()
                    .includes(this.search)

                    ||

                    agent.description
                    .toLowerCase()
                    .includes(this.search)


                );


            });


        }







        /*
        FILTRO POR CATEGORIA
        */


        if(

        this.category !== "Todos"

        ){


            list =

            list.filter(agent=>{


                return (

                agent.category ===
                this.category

                );


            });



        }







        const grid =

        document.getElementById(
            "agentsGrid"
        );



        if(grid){


            grid.innerHTML =

            this.createCards(list);



            this.attachCardEvents();


        }



    }








    attachCardEvents(){



        this.container

        .querySelectorAll(
            ".agent-open-btn"
        )

        .forEach(button=>{


            button.addEventListener(
                "click",
                ()=>{


                    this.openAgent(
                        button.dataset.id
                    );


                }

            );


        });


    }








    async openAgent(agentId){


        try{



            const agent =

            agentstudio.setagent(
                agentId
            );




            if(!agent){

                console.error(
                    "Agente não encontrado"
                );

                return;

            }








            /*
            EVENTO GLOBAL
            */


            document.dispatchEvent(

                new CustomEvent(
                    "agent-selected",
                    {

                        detail:agent

                    }

                )

            );








            /*
            MODO LIVE
            */


            if(

            agentstudio.getmode()

            ===

            "live"

            ){


                await liveclient.changeAgent(
                    agentId
                );


            }







            this.showStudio(agent);




        }


        catch(error){


            console.error(

            "Erro ao abrir agente:",

            error

            );


        }



    }

    showStudio(agent){



        const event =

        new CustomEvent(

            "agent-studio-open",

            {

                detail:{
                    agent
                }

            }

        );



        document.dispatchEvent(event);




        this.renderActiveAgent(agent);



    }








    renderActiveAgent(agent){



        const panel =

        document.getElementById(
            "activeAgentPanel"
        );



        if(!panel){

            return;

        }







        panel.classList.remove(
            "hidden"
        );







        const icon =

        document.getElementById(
            "activeEmoji"
        );



        const name =

        document.getElementById(
            "activeName"
        );



        const role =

        document.getElementById(
            "activeRole"
        );






        if(icon){

            icon.innerHTML =

            agent.emoji || "🐝";

        }






        if(name){

            name.textContent =

            agent.name;

        }







        if(role){

            role.textContent =

            agent.category ||

            "Especialista Honey IA";

        }








        panel.scrollIntoView({

            behavior:"smooth",

            block:"center"

        });



    }









    getCurrent(){



        return (

            agentstudio
            .getactiveagent()

        );


    }



}





export default new agentsui();
