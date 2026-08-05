/*
====================================================
HONEY IA
AGENTS UI CONTROLLER V3.0
30 AGENTS MARKETPLACE + CHAT
====================================================
*/


import agents from "./agents.js";
import agentstudio from "./agentstudio.js";
import liveclient from "./liveclient.js";




class AgentsUI {



constructor(){


this.container = null;


this.search = "";


this.category = "Todos";


this.activeAgent = null;


}







/*
====================================================
INICIALIZAÇÃO
====================================================
*/


init(containerId){



this.container =

document.getElementById(containerId)

||

document.getElementById(
"agentsContainer"
);



if(!this.container){


console.error(
"Container de agentes não encontrado."
);


return;


}



this.render();



}









/*
====================================================
RENDER PRINCIPAL
====================================================
*/


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

Escolha um dos 30 especialistas IA
para trabalhar consigo.

</p>



</div>



</header>









<div class="agent-tools">





<div class="agent-search">



<i class="fa-solid fa-search"></i>



<input

id="agentSearch"

type="text"

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



<button class="filter">

Produtividade

</button>



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









/*
====================================================
CRIAR CARDS DOS 30 AGENTES
====================================================
*/


createCards(list){



return list.map(agent=>`



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

(agent.tags || [])

.map(tag=>`

<span>

${tag}

</span>

`).join("")

}



</div>









<button


class="agent-open-btn"


data-id="${agent.id}"


>


Abrir Chat


<i class="fa-solid fa-arrow-right"></i>


</button>







</article>



`).join("");



}/*
====================================================
EVENTOS
====================================================
*/


attachEvents(){



/*
==============================
PESQUISA
==============================
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
==============================
FILTROS
==============================
*/


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

button.textContent;





this.updateAgents();





}


);



});








/*
==============================
ABRIR CHAT DO AGENTE
==============================
*/



this.attachCardEvents();



}










/*
====================================================
EVENTOS DOS CARDS
====================================================
*/


attachCardEvents(){



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









/*
====================================================
ATUALIZAR LISTA
====================================================
*/


updateAgents(){



let list =

agents.getAll();







/*
BUSCA
*/


if(this.search){



list =

list.filter(agent=>{


return(


agent.name

.toLowerCase()

.includes(
this.search
)



||



agent.description

.toLowerCase()

.includes(
this.search
)



);



});



}








/*
CATEGORIA
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









/*
====================================================
ABRIR AGENTE SELECIONADO
====================================================
*/


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






this.activeAgent = agent;






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








this.openChat(agent);






}



catch(error){



console.error(

"Erro ao abrir agente:",

error

);



}



}    attachCardEvents(){


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


    }







    async openAgent(agentId){


        try{


            const agent =

            agents.getById(agentId);



            if(!agent){

                console.error(
                    "Agente não encontrado"
                );

                return;

            }







            this.activeAgent = agent;







            /*
            Guardar agente selecionado
            */


            localStorage.setItem(

                "honey_active_agent",

                JSON.stringify(agent)

            );







            /*
            Informar outros módulos
            */


            document.dispatchEvent(

                new CustomEvent(

                    "agent-selected",

                    {

                        detail:agent

                    }

                )

            );








            this.showChat(agent);



        }


        catch(error){


            console.error(

                "Erro ao selecionar agente:",

                error

            );


        }



    }









    showChat(agent){



        let chat =

        document.getElementById(
            "agentChatWindow"
        );





        if(!chat){



            chat = document.createElement(
                "section"
            );



            chat.id =
            "agentChatWindow";



            chat.className =
            "agent-chat-window";



            document.querySelector(
                ".main-page"
            )
            .appendChild(chat);



        }







        chat.innerHTML = `



        <div class="agent-chat-header">



            <div class="agent-chat-profile">


                <div class="agent-chat-avatar">

                    ${agent.emoji || "🐝"}

                </div>



                <div>

                    <h3>

                    ${agent.name}

                    </h3>


                    <span>

                    ${agent.category || "Especialista IA"}

                    </span>


                </div>


            </div>





            <button 
            id="closeAgentChat"
            >

            <i class="fa-solid fa-xmark"></i>

            </button>



        </div>









        <div 
        class="agent-chat-messages"
        id="agentMessages"
        >


            <div class="agent-message">


                <strong>

                ${agent.name}

                </strong>


                <p>

                Olá, sou o ${agent.name}.
                Estou pronto para ajudar na sua tarefa.

                </p>


            </div>



        </div>







        <div class="agent-chat-input">



            <textarea

            id="agentMessageInput"

            placeholder="Escreva uma mensagem..."

            ></textarea>





            <button

            id="sendAgentMessage"

            >

            <i class="fa-solid fa-paper-plane"></i>

            </button>



        </div>



        `;






        chat.scrollIntoView({

            behavior:"smooth"

        });





        this.attachChatEvents(agent);



    }    attachChatEvents(agent){


        const closeButton =

        document.getElementById(
            "closeAgentChat"
        );



        if(closeButton){


            closeButton.onclick = ()=>{


                const chat =

                document.getElementById(
                    "agentChatWindow"
                );



                if(chat){

                    chat.remove();

                }


            };


        }









        const input =

        document.getElementById(
            "agentMessageInput"
        );



        const sendButton =

        document.getElementById(
            "sendAgentMessage"
        );



        if(!input || !sendButton){

            return;

        }








        const sendMessage = async ()=>{



            const message =

            input.value.trim();




            if(!message){

                return;

            }






            input.value = "";






            this.addMessage(

                message,

                "user"

            );







            /*
            Aqui futuramente entra
            a chamada para a API
            da Honey IA
            */





            setTimeout(()=>{



                this.addMessage(

                `Estou a analisar a sua solicitação.
                Sou o ${agent.name} e vou ajudar com
                a minha especialidade: ${agent.category}.`,

                "agent"

                );



            },800);





        };









        sendButton.onclick =
        sendMessage;





        input.addEventListener(

            "keydown",

            (event)=>{


                if(

                event.key === "Enter"

                &&

                !event.shiftKey

                ){


                    event.preventDefault();


                    sendMessage();


                }


            }

        );



    }












    addMessage(text,type){



        const box =

        document.getElementById(
            "agentMessages"
        );



        if(!box){

            return;

        }






        const message =

        document.createElement(
            "div"
        );



        message.className =

        type === "user"

        ?

        "user-message"

        :

        "agent-message";







        message.innerHTML = `



        <p>

        ${text}

        </p>


        `;







        box.appendChild(message);






        box.scrollTop =

        box.scrollHeight;



    }












    restoreAgent(){



        const saved =

        localStorage.getItem(

            "honey_active_agent"

        );




        if(saved){


            try{


                this.activeAgent =

                JSON.parse(saved);



            }

            catch(error){


                console.error(
                    "Erro ao recuperar agente",
                    error
                );


            }



        }



    }








    getCurrent(){



        return this.activeAgent;



    }






}








const agentsUI =

new AgentsUI();




document.addEventListener(

"DOMContentLoaded",

()=>{


    agentsui.init(
        "agentsContainer"
    );


});






export default agentsui;
