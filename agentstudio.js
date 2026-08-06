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
SET ACTIVE AGENT
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
GET CURRENT AGENT
==========================================
*/


getAgent(){



    return this.activeAgent;



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









/*
==========================================
RENDER STUDIO
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



            <div>


                <h2>

                ${agent.name}

                </h2>



                <p>

                ${agent.description || 
                "Especialista Honey IA"}

                </p>


            </div>



        </div>




        <div class="studio-mode">


            <button 
            class="mode-btn active"
            data-mode="chat"
            >

            💬 Chat

            </button>



            <button 
            class="mode-btn"
            data-mode="live"
            >

            ⚡ Live

            </button>



        </div>



    </div>


    `;



    this.bindEvents();



} /*
==========================================
EVENT HANDLERS
==========================================
*/


bindEvents(){


    if(!this.container)
    return;



    const modeButtons =
    this.container.querySelectorAll(
        "[data-mode]"
    );



    modeButtons.forEach(button=>{


        button.addEventListener(
            "click",
            ()=>{


                const mode =
                button.dataset.mode;



                this.setmode(
                    mode
                );



            }
        );


    });



}









/*
==========================================
MODE UI UPDATE
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
            button.dataset.mode ===
            this.mode
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
AGENT INFORMATION
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



        category:
        agent.category,



        level:
        agent.level,



        tools:
        agent.tools || [],



        description:
        agent.description || ""



    };


}









/*
==========================================
AGENT MEMORY
==========================================
*/


saveConversation(
    role,
    content
){



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


}









/*
==========================================
CLEAR MEMORY
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



}/*
==========================================
AGENT WORKSPACE CONTROL
==========================================
*/


switchAgent(agentId){


    const agent = 
    Agents.get(
        agentId
    );


    if(!agent){


        console.warn(
            "[Agent Studio] Tentativa de abrir agente inexistente:",
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



    this.emit(
        "agent-selected",
        {
            agent
        }
    );



    return agent;


}









/*
==========================================
AGENT LIST FOR STUDIO
==========================================
*/


getAvailableAgents(){


    return Agents.getAll();



}









/*
==========================================
AGENT SEARCH
==========================================
*/


search(
    query=""
){


    return Agents.search(
        query
    );


}









/*
==========================================
CATEGORY FILTER
==========================================
*/


getAgentsByCategory(
    category
){


    return Agents.filterByCategory(
        category
    );


}









/*
==========================================
FEATURED AGENTS
==========================================
*/


getFeatured(){


    return Agents.getFeatured();


}









/*
==========================================
AGENT RECOMMENDATION
==========================================
*/


recommend(
    prompt=""
){


    return Agents.recommend(
        prompt
    );


}









/*
==========================================
SEND MESSAGE MEMORY SYNC
==========================================
*/


addMessage(
    role,
    content
){


    if(
        !content
    )
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



    this.emit(

        "message-added",

        {

            role,

            content

        }

    );


}









/*
==========================================
GET STUDIO HISTORY
==========================================
*/


getConversation(){



    return Agents.getConversation(

        this.activeAgent

    );


}









/*
==========================================
AGENT STATUS
==========================================
*/


getStatus(){



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


        category:
        agent.category,


        level:
        agent.level,


        status:
        agent.status || "online",


        tools:
        agent.tools || [],


        memory:
        agent.memory || []



    };


}









/*
==========================================
WORKSPACE EVENTS
==========================================
*/


emit(
    event,
    data
){



    document.dispatchEvent(

        new CustomEvent(

            event,

            {

                detail:data

            }

        )

    );



} /*
==========================================
STUDIO LIFECYCLE
==========================================
*/


refresh(){


    if(
        !this.container
    )
    return;



    this.history =
    Agents.getConversation(
        this.activeAgent
    );



    this.render();


}









/*
==========================================
EXPORT WORKSPACE DATA
==========================================
*/


exportWorkspace(){


    const agent =
    Agents.get(
        this.activeAgent
    );



    if(!agent)
    return null;



    return {


        agent:{


            id:
            agent.id,


            name:
            agent.name,


            category:
            agent.category,


            description:
            agent.description



        },


        history:
        this.history,



        mode:
        this.mode,



        exportedAt:
        new Date()



    };


}









/*
==========================================
RESTORE WORKSPACE
==========================================
*/


restoreWorkspace(data){



    if(
        !data ||
        !data.agent
    )
    return;



    const agent =
    Agents.get(
        data.agent.id
    );



    if(!agent)
    return;



    this.activeAgent =
    agent.id;



    Agents.setActive(
        agent.id
    );



    this.history =
    data.history || [];



    this.mode =
    data.mode || "chat";



    this.render();



}









/*
==========================================
CHECK ACTIVE AGENT
==========================================
*/


hasActiveAgent(){



    return Boolean(

        Agents.get(
            this.activeAgent
        )

    );


}









/*
==========================================
GET MODE
==========================================
*/


getMode(){



    return this.mode;


}









/*
==========================================
TOGGLE MODE
==========================================
*/


toggleMode(){



    if(
        this.mode === "chat"
    ){


        this.setmode(
            "live"
        );


    }

    else{


        this.setmode(
            "chat"
        );


    }



    return this.mode;


}









/*
==========================================
CLEAR CURRENT STUDIO
==========================================
*/


clear(){



    this.history =
    [];



    const agent =
    Agents.get(
        this.activeAgent
    );



    if(agent){


        agent.conversations =
        [];


    }



    this.render();



}









/*
==========================================
INITIAL STATE
==========================================
*/


getWorkspaceState(){



    return {


        activeAgent:
        this.activeAgent,


        mode:
        this.mode,


        history:
        this.history,


        initialized:
        Boolean(
            this.container
        )



    };


}



}




/*
==========================================
HONEY IA AGENT STUDIO INSTANCE
==========================================
*/


const agentstudio =
new AgentStudio();



export default agentstudio;
