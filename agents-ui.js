/*
==================================================
HONEY IA
AGENTS UI CONTROLLER V3.0
Premium Agent Marketplace
==================================================
*/


import agents from "./agents.js";
import agentstudio from "./agentstudio.js";
import liveclient from "./liveclient.js";





class AgentsUI {



    constructor(){


        this.container = null;


        this.search = "";


        this.category = "Todos";


        this.categories = [
            "Todos",
            "Negócios",
            "Criativos",
            "Técnicos"
        ];


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

                "Agents UI: container não encontrado."

            );


            return;


        }







        this.render();



    }









    render(){



        const allAgents =

        agents.getAll();







        this.container.innerHTML = `



        <div class="agent-studio">





            <header class="agent-market-header">





                <div class="market-title">





                    <span class="market-badge">


                        <i class="fa-solid fa-sparkles"></i>


                        Honey Intelligence


                    </span>







                    <h2>


                    Agents Studio


                    </h2>







                    <p>


                    Especialistas digitais
                    preparados para empresas,
                    profissionais e criadores.


                    </p>





                </div>




            </header>









            <div class="agent-tools">






                <div class="agent-search">



                    <i class="fa-solid fa-magnifying-glass"></i>




                    <input


                    type="text"


                    id="agentSearch"


                    placeholder="Pesquisar agente..."


                    >




                </div>









                <div class="agent-filters">



                    ${this.createFilters()}



                </div>






            </div>









            <div


            class="agents-grid"


            id="agentsGrid"



            >



            ${this.createCards(allAgents)}



            </div>







        </div>



        `;







        this.attachEvents();





    }








    createFilters(){



        return this.categories.map(

            (category,index)=>`



            <button


            class="filter ${index===0 ? "active":""}"


            >


            ${category}


            </button>



            `


        ).join("");



    }    createCards(list){



        if(!list || list.length === 0){



            return `


            <div class="agent-loading">


                <p>

                Nenhum agente encontrado.

                </p>


            </div>



            `;


        }








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








            <div class="agent-tags">



            ${
                agent.tags ?

                agent.tags.map(tag=>`

                    <span>

                    ${tag}

                    </span>

                `).join("")

                :

                ""

            }



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

                    .toLowerCase()

                    .trim();





                    this.updateAgents();



                }


            );


        }









        const filters =


        this.container.querySelectorAll(

            ".filter"

        );







        filters.forEach(button=>{



            button.addEventListener(

                "click",

                ()=>{






                    filters.forEach(item=>{


                        item.classList.remove(
                            "active"
                        );


                    });






                    button.classList.add(
                        "active"
                    );







                    this.category =

                    button.textContent.trim();






                    this.updateAgents();




                }


            );



        });









        this.attachCardEvents();




    }









    updateAgents(){



        let list =


        agents.getAll();









        if(this.search){



            list =


            list.filter(agent=>{


                const name =

                agent.name

                .toLowerCase();





                const description =

                agent.description

                .toLowerCase();





                return (

                    name.includes(
                        this.search
                    )

                    ||

                    description.includes(
                        this.search
                    )


                );



            });



        }









        if(this.category !== "Todos"){



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



        const buttons =


        this.container.querySelectorAll(

            ".agent-open-btn"

        );







        buttons.forEach(button=>{



            button.addEventListener(

                "click",

                ()=>{



                    const id =

                    button.dataset.id;





                    this.openAgent(id);



                }


            );



        });



    }    async openAgent(agentId){



        try{





            const agent =


            agentstudio.setagent(

                agentId

            );








            if(!agent){



                console.error(

                    "Agente não encontrado:",

                    agentId

                );


                return;



            }









            document.dispatchEvent(


                new CustomEvent(

                    "agent-selected",

                    {


                        detail:agent


                    }


                )


            );









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






        document.dispatchEvent(



            new CustomEvent(

                "agent-studio-open",

                {



                    detail:{


                        agent


                    }



                }


            )



        );









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



            icon.textContent =


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









const agentsui = new agentsui();







export default agentsui;
