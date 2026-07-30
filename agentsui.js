/*
==========================================
HONEY IA
AGENTS UI ENGINE V1.0
Frontend Agent Studio Controller
==========================================
*/


import agentstudio from "./agentstudio.js";
import liveclient from "./liveclient.js";




// ==========================================
// CONFIGURAÇÃO DOS AGENTES
// ==========================================

const agentsui = {



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
            id:"healthcare",
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
            document.createelement(
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




            this.container.appendchild(card);



        });



    },









    bindevents(){



        document
        .queryselectorall(".agent-card")
        .foreach(card=>{



            card.addeventlistener(
                "click",
                ()=>{


                    const id =
                    card.dataset.agent;



                    this.selectAgent(id);


                }
            );



        });







        const chat =
        document.getElementbyid(
            "btnagentchat"
        );



        const live =
        document.getelementbyid(
            "btnagentlive"
        );







        if(chat){


            chat.onclick=()=>{


                agentstudio.setmode(
                    "chat"
                );


                window.location.href =
                "index.html";


            };


        }








        if(live){


            live.onclick=
            async()=>{


                agentstudio.setmode(
                    "live"
                );


                await liveclient.start();



                window.location.href =
                "index.html";


            };


        }





    },









    async selectagent(id){



        const agent =
        this.agents.find(
            item=>item.id===id
        );



        if(!agent){

            return;

        }






        agentstudio.setagent(
            id
        );




        await liveclient.changeagent(
            id
        );





        const panel =
        document.getelementbyid(
            "activeagentpanel"
        );



        if(panel){

            panel.classList.remove(
                "hidden"
            );

        }






        document.getelementbyid(
            "activeemoji"
        ).textcontent =
        agent.emoji;




        document.getelementbyid(
            "activename"
        ).textcontent =
        agent.name;




        document.getelementbyid(
            "activerole"
        ).textcontent =
        agent.description;





    }




};







document.addeventlistener(
    "domcontentloaded",
    ()=>{


        agentsui.init();


    }
);



export default agentsui;
