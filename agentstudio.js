/*
==========================================
HONEY IA
AGENT STUDIO ENGINE V6
Specialist Workspace Controller
==========================================
*/

import agents from "./agents.js";


class AgentStudio {


    constructor(){

        this.activeAgent = "general";

        this.mode = "chat";

        this.container = null;

        this.history = [];

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
                "[Agent Studio] Container não encontrado:",
                containerId
            );

            return;

        }


        this.render();


    }




    /*
    ==========================================
    OPEN AGENT WORKSPACE
    ==========================================
    */


    open(agent){


        if(!agent)
        return;


        this.activeAgent =
        agent.id;


        Agents.setActive(
            agent.id
        );


        this.history =
        Agents.getConversation(
            agent.id
        );


        this.render();


    }




    /*
    ==========================================
    GET ACTIVE AGENT
    ==========================================
    */


    getagent(){


        return this.activeAgent;


    }




    /*
    ==========================================
    GET AGENT PROFILE
    ==========================================
    */


    getAgentProfile(){


        const agent =
        Agents.get(
            this.activeAgent
        );


        if(!agent)
        return null;


        return {

            id:
            agent.id,


            name:
            agent.name,


            description:
            agent.description || "",


            category:
            agent.category || "",


            level:
            agent.level || "",


            tools:
            agent.tools || []


        };


    }




    /*
    ==========================================
    MODE CONTROL
    ==========================================
    */


    setmode(mode){


        if(
            mode !== "chat" &&
            mode !== "live"
        ){

            return;

        }


        this.mode =
        mode;


        this.updateModeUI();


    }




    getmode(){


        return this.mode;


    }    /*
    ==========================================
    RENDER STUDIO INTERFACE
    ==========================================
    */


    render(){


        if(!this.container)
        return;


        const agent =
        Agents.get(
            this.activeAgent
        );


        if(!agent)
        return;



        this.container.innerHTML = `

        <div class="agent-studio-panel">


            <div class="studio-agent-header">


                <div class="studio-agent-icon">

                    ${agent.emoji || "🤖"}

                </div>



                <div class="studio-agent-info">

                    <h2>
                        ${agent.name}
                    </h2>


                    <p>
                        ${agent.description || 
                        "Especialista Honey IA"}
                    </p>


                </div>


            </div>




            <div class="studio-agent-meta">


                <span>
                    Categoria:
                    ${agent.category || "Tecnologia"}
                </span>


                <span>
                    Nível:
                    ${agent.level || "Professional"}
                </span>


                <span>
                    Status:
                    ${agent.status || "online"}
                </span>


            </div>




            <div class="studio-mode">


                <button
                class="mode-btn ${this.mode === "chat" ? "active" : ""}"
                data-mode="chat">

                    💬 Chat

                </button>



                <button
                class="mode-btn ${this.mode === "live" ? "active" : ""}"
                data-mode="live">

                    ⚡ Live

                </button>


            </div>




            <div class="studio-tools">


                ${
                    (agent.tools || [])
                    .map(tool => `

                        <span class="tool-tag">
                            ${tool}
                        </span>

                    `)
                    .join("")
                }


            </div>



        </div>

        `;



        this.bindEvents();


    }







    /*
    ==========================================
    EVENT BINDING
    ==========================================
    */


    bindEvents(){


        if(!this.container)
        return;



        const buttons =
        this.container.querySelectorAll(
            "[data-mode]"
        );



        buttons.forEach(button=>{


            button.onclick = ()=>{


                const mode =
                button.dataset.mode;


                this.setmode(
                    mode
                );


            };


        });



    }







    /*
    ==========================================
    UPDATE MODE UI
    ==========================================
    */


    updateModeUI(){


        if(!this.container)
        return;



        const buttons =
        this.container.querySelectorAll(
            "[data-mode]"
        );



        buttons.forEach(button=>{


            if(
                button.dataset.mode === this.mode
            ){


                button.classList.add(
                    "active"
                );


            }

            else{


                button.classList.remove(
                    "active"
                );


            }


        });



    }







    /*
    ==========================================
    CONVERSATION MEMORY
    ==========================================
    */


    saveConversation(
        role,
        content
    ){


        if(!content)
        return;



        Agents.addConversation(

            this.activeAgent,

            role,

            content

        );



        this.history =
        Agents.getConversation(
            this.activeAgent
        );


    }



    getHistory(){


        return this.history;


    }    /*
    ==========================================
    AGENT MANAGEMENT
    ==========================================
    */


    selectAgent(agentId){


        const agent =
        Agents.get(
            agentId
        );


        if(!agent){


            console.warn(
                "[Agent Studio] Agente não encontrado:",
                agentId
            );


            return null;


        }



        this.activeAgent =
        agent.id;



        Agents.setActive(
            agent.id
        );



        this.history =
        Agents.getConversation(
            agent.id
        );



        this.render();



        return agent;


    }









    /*
    ==========================================
    GET ALL AGENTS
    ==========================================
    */


    getAllAgents(){


        return Agents.getAll();


    }









    /*
    ==========================================
    SEARCH AGENTS
    ==========================================
    */


    searchAgents(query = ""){


        return Agents.search(
            query
        );


    }









    /*
    ==========================================
    CATEGORY FILTER
    ==========================================
    */


    filterAgents(category){


        return Agents.filterByCategory(
            category
        );


    }









    /*
    ==========================================
    FEATURED AGENTS
    ==========================================
    */


    getFeaturedAgents(){


        return Agents.getFeatured();


    }









    /*
    ==========================================
    RECOMMEND AGENT
    ==========================================
    */


    recommendAgent(prompt = ""){


        return Agents.recommend(
            prompt
        );


    }









    /*
    ==========================================
    ACTIVE AGENT STATE
    ==========================================
    */


    getState(){


        return {


            activeAgent:
            this.activeAgent,


            mode:
            this.mode,


            history:
            this.history,


            profile:
            this.getAgentProfile()



        };


    }









    /*
    ==========================================
    CLEAR CURRENT HISTORY
    ==========================================
    */


    clearHistory(){



        const agent =
        Agents.get(
            this.activeAgent
        );



        if(agent){


            agent.conversations =
            [];


        }



        this.history =
        [];



    }









    /*
    ==========================================
    RESET STUDIO
    ==========================================
    */


    reset(){



        this.activeAgent =
        "general";



        this.mode =
        "chat";



        this.history =
        [];



        Agents.setActive(
            "general"
        );



        this.render();



    }    /*
    ==========================================
    WORKSPACE EVENTS
    ==========================================
    */


    emit(
        event,
        data = {}
    ){


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
    AGENT CHANGE EVENT
    ==========================================
    */


    notifyAgentChange(){



        const agent =
        Agents.get(
            this.activeAgent
        );



        if(!agent)
        return;



        this.emit(

            "agent-changed",

            {

                id:
                agent.id,


                name:
                agent.name,


                agent

            }

        );


    }









    /*
    ==========================================
    DESTROY STUDIO
    ==========================================
    */


    destroy(){



        if(this.container){


            this.container.innerHTML =
            "";


        }



        this.container =
        null;



        this.history =
        [];



    }









}




/*
==========================================
HONEY IA AGENT STUDIO INSTANCE
==========================================
*/


const agentstudio =
new agentstudio();



export default agentstudio;
