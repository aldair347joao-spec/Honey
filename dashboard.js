 /*
==========================================
HONEY IA
DASHBOARD ENGINE V6
Enterprise Workspace Dashboard
==========================================
*/


import agents from "./agents.js";



class Dashboard {



constructor(){


    this.container = null;


    this.refreshInterval = null;


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
            "[Dashboard] Container não encontrado:",
            containerId
        );


        return;


    }



    this.render();


    this.bindEvents();


    this.startAutoRefresh();



}









/*
==========================================
MAIN RENDER
==========================================
*/


render(){



    if(!this.container)
    return;



    const stats =
    this.getStatistics();




    this.container.innerHTML = `


    <section class="dashboard-wrapper">


        <div class="dashboard-header">


            <div>


                <h1>

                🐝 Honey IA Dashboard

                </h1>


                <p>

                Centro de controlo inteligente da plataforma.

                </p>


            </div>



            <div class="system-status online">


                <span class="online-dot"></span>


                Sistema Online


            </div>


        </div>






        <div class="dashboard-grid">


            ${

            this.createMetricCard(
                "🤖",
                "Agentes",
                stats.agents
            )

            }



            ${

            this.createMetricCard(
                "⚡",
                "Estado",
                "Online"
            )

            }





            ${

            this.createMetricCard(
                "📂",
                "Projetos",
                stats.projects
            )

            }




            ${

            this.createMetricCard(
                "💬",
                "Conversas",
                stats.messages
            )

            }



        </div>





        <div class="dashboard-sections">


            <div class="dashboard-panel">


                <h2>

                Agentes disponíveis

                </h2>


                <div id="dashboardAgents">


                ${

                this.renderAgentPreview()

                }


                </div>



            </div>





            <div class="dashboard-panel">


                <h2>

                Ações rápidas

                </h2>



                <div class="quick-actions">


                    <button data-action="chat">

                    💬 Novo Chat

                    </button>



                    <button data-action="agents">

                    🤖 Explorar Agentes

                    </button>



                    <button data-action="projects">

                    📁 Projetos

                    </button>



                </div>



            </div>



        </div>



    </section>


    `;



}








/*
==========================================
STATISTICS
==========================================
*/


getStatistics(){


    return {


        agents:
        Agents.getAll().length,



        projects:
        Number(
            localStorage.getItem(
                "honey_projects"
            )
        ) || 0,



        messages:
        Number(
            localStorage.getItem(
                "honey_messages"
            )
        ) || 0



    };


} /*
==========================================
METRIC CARD COMPONENT
==========================================
*/


createMetricCard(icon, title, value){


return `


<div class="dashboard-card">


    <div class="dashboard-card-icon">

        ${icon}

    </div>



    <div class="dashboard-card-content">


        <span>

        ${title}

        </span>


        <strong>

        ${value}

        </strong>


    </div>



</div>


`;

}









/*
==========================================
AGENT PREVIEW
==========================================
*/


renderAgentPreview(){



    const agents =
    Agents
    .getAll()
    .slice(0,6);



    return agents
    .map(agent=>`


    <div class="dashboard-agent">


        <div class="dashboard-agent-icon">

        ${agent.emoji || "🤖"}

        </div>



        <div>


            <strong>

            ${agent.name}

            </strong>



            <small>

            ${agent.category || "Tecnologia"}

            </small>


        </div>



        <span class="agent-status">

        ●

        </span>



    </div>



    `)
    .join("");

}









/*
==========================================
EVENT LISTENERS
==========================================
*/


bindEvents(){


    if(!this.container)
    return;



    const buttons =
    this.container.querySelectorAll(
        "[data-action]"
    );



    buttons.forEach(button=>{


        button.addEventListener(
            "click",
            ()=>{


                const action =
                button.dataset.action;



                this.handleAction(
                    action
                );


            }
        );


    });



}









/*
==========================================
QUICK ACTIONS
==========================================
*/


handleAction(action){



    document.dispatchEvent(

        new CustomEvent(
            "dashboard-action",
            {

                detail:{
                    action
                }

            }
        )

    );



    switch(action){


        case "chat":


            this.openView(
                "chat"
            );


        break;



        case "agents":


            this.openView(
                "agents"
            );


        break;



        case "projects":


            this.openView(
                "projects"
            );


        break;



    }



}









/*
==========================================
VIEW NAVIGATION
==========================================
*/


openView(view){


    const link =
    document.querySelector(
        `[data-target="${view}"]`
    );



    if(link){

        link.click();

    }


} /*
==========================================
REAL TIME UPDATE
==========================================
*/


refresh(){


    if(!this.container)
    return;



    const currentScroll =
    this.container.scrollTop;



    this.render();



    this.bindEvents();



    this.container.scrollTop =
    currentScroll;



}









/*
==========================================
AUTO REFRESH
==========================================
*/


startAutoRefresh(){



    this.stopAutoRefresh();



    this.refreshInterval =
    setInterval(
        ()=>{


            this.refresh();



        },
        30000
    );



}









stopAutoRefresh(){



    if(this.refreshInterval){


        clearInterval(
            this.refreshInterval
        );


        this.refreshInterval =
        null;


    }


}









/*
==========================================
SYSTEM TELEMETRY
==========================================
*/


getSystemInfo(){



    return {


        platform:
        "Honey IA OS",



        version:
        "V6",



        agents:
        Agents.getAll().length,



        timestamp:
        new Date()
        .toISOString()



    };


}









/*
==========================================
PROJECT MANAGEMENT
==========================================
*/


createProject(name){



    const projects =
    JSON.parse(

        localStorage.getItem(
            "honey_projects_list"
        )
        ||

        "[]"

    );



    const project = {


        id:
        crypto.randomUUID(),



        name,



        createdAt:
        new Date()



    };



    projects.push(
        project
    );



    localStorage.setItem(

        "honey_projects_list",

        JSON.stringify(
            projects
        )

    );



    return project;


}









getProjects(){



    return JSON.parse(

        localStorage.getItem(
            "honey_projects_list"
        )

        ||

        "[]"

    );


}









deleteProject(id){



    const projects =
    this.getProjects()
    .filter(
        project=>
        project.id !== id
    );



    localStorage.setItem(

        "honey_projects_list",

        JSON.stringify(
            projects
        )

    );



    this.refresh();



} /*
==========================================
USER ACTIVITY TRACKING
==========================================
*/


trackMessage(){


    let count =
    Number(
        localStorage.getItem(
            "honey_messages"
        )
    )
    || 0;



    count++;



    localStorage.setItem(

        "honey_messages",

        count

    );


}









/*
==========================================
DASHBOARD EVENTS
==========================================
*/


listenEvents(){



    document.addEventListener(
        "chat-message-sent",
        ()=>{


            this.trackMessage();



        }
    );



    document.addEventListener(
        "agent-selected",
        ()=>{


            this.refresh();



        }
    );



}









/*
==========================================
DESTROY
==========================================
*/


destroy(){



    this.stopAutoRefresh();



    this.container =
    null;



}









/*
==========================================
PUBLIC STATUS
==========================================
*/


getStatus(){



    return {


        initialized:
        !!this.container,



        statistics:
        this.getStatistics(),



        system:
        this.getSystemInfo()



    };


}



}








const dashboard =
new Dashboard();



export default dashboard;
