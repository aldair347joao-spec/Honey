/*
==========================================
HONEY IA
AGENTS UI ENGINE V1.0
Frontend Agent Studio Controller
==========================================
*/


import AgentStudio from "./agentStudio.js";
import LiveClient from "./liveClient.js";




// ==========================================
// CONFIGURAÇÃO DOS AGENTES
// ==========================================

const AgentsUI = {



    agents:[

        {
            id:"general",
            emoji:"🐝",
            name:"Honey Assistant",
            description:"Assistente principal da Honey IA."
        },


        {
            id:"developer",
            emoji:"💻",
            name:"Honey Developer",
            description:"Especialista em programação, código e tecnologia."
        },


        {
            id:"designer",
            emoji:"🎨",
            name:"Honey Designer",
            description:"Especialista em UI, UX e identidade visual."
        },


        {
            id:"marketing",
            emoji:"📈",
            name:"Honey Marketing",
            description:"Estratégias de marketing e crescimento."
        },


        {
            id:"finance",
            emoji:"💰",
            name:"Honey Finance",
            description:"Análise financeira e negócios."
        },


        {
            id:"health",
            emoji:"🏥",
            name:"Honey Health",
            description:"Informações gerais sobre saúde."
        },


        {
            id:"education",
            emoji:"🎓",
            name:"Honey Education",
            description:"Ensino, explicações e aprendizagem."
        },


        {
            id:"legal",
            emoji:"⚖️",
            name:"Honey Legal",
            description:"Assistente para assuntos jurídicos."
        },


        {
            id:"architect",
            emoji:"🏠",
            name:"Honey Architect",
            description:"Projetos, plantas e arquitetura."
        },


        {
            id:"excel",
            emoji:"📊",
            name:"Honey Excel",
            description:"Dados, tabelas e produtividade."
        },


        {
            id:"sales",
            emoji:"🤝",
            name:"Honey Sales",
            description:"Vendas e relacionamento com clientes."
        },


        {
            id:"video",
            emoji:"🎬",
            name:"Honey Video",
            description:"Criação e ideias para vídeos."
        },


        {
            id:"image",
            emoji:"🖼️",
            name:"Honey Image",
            description:"Análise e criação visual."
        },


        {
            id:"security",
            emoji:"🛡️",
            name:"Honey Security",
            description:"Segurança digital e proteção."
        }


    ],








    init(){



        this.container =
        document.getElementById(
            "agentsContainer"
        );



        if(!this.container){

            return;

        }




        this.render();

        this.bindEvents();



    },









    render(){



        this.container.innerHTML="";




        this.agents.forEach(agent=>{



            const card =
            document.createElement(
                "div"
            );



            card.className =
            "agent-card";



            card.dataset.agent =
            agent.id;




            card.innerHTML = `


                <div class="agent-icon">

                    ${agent.emoji}

                </div>



                <h3>

                    ${agent.name}

                </h3>



                <p>

                    ${agent.description}

                </p>



                <button class="agent-button">

                    Abrir Studio

                </button>


            `;




            this.container.appendChild(card);



        });



    },









    bindEvents(){



        document
        .querySelectorAll(".agent-card")
        .forEach(card=>{



            card.addEventListener(
                "click",
                ()=>{


                    const id =
                    card.dataset.agent;



                    this.selectAgent(id);


                }
            );



        });







        const chat =
        document.getElementById(
            "btnAgentChat"
        );



        const live =
        document.getElementById(
            "btnAgentLive"
        );







        if(chat){


            chat.onclick=()=>{


                AgentStudio.setMode(
                    "chat"
                );


                window.location.href =
                "index.html";


            };


        }








        if(live){


            live.onclick=
            async()=>{


                AgentStudio.setMode(
                    "live"
                );


                await LiveClient.start();



                window.location.href =
                "index.html";


            };


        }





    },









    async selectAgent(id){



        const agent =
        this.agents.find(
            item=>item.id===id
        );



        if(!agent){

            return;

        }






        AgentStudio.setAgent(
            id
        );




        await LiveClient.changeAgent(
            id
        );





        const panel =
        document.getElementById(
            "activeAgentPanel"
        );



        if(panel){

            panel.classList.remove(
                "hidden"
            );

        }






        document.getElementById(
            "activeEmoji"
        ).textContent =
        agent.emoji;




        document.getElementById(
            "activeName"
        ).textContent =
        agent.name;




        document.getElementById(
            "activeRole"
        ).textContent =
        agent.description;





    }




};







document.addEventListener(
    "DOMContentLoaded",
    ()=>{


        AgentsUI.init();


    }
);



export default AgentsUI;
