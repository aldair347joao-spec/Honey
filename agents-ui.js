/*
==================================================
HONEY IA
AGENTS UI CONTROLLER V3.0
Premium Agent Marketplace + Agent Chat Studio
==================================================
*/


import agents from "./agents.js";
import agentstudio from "./agentstudio.js";
import liveclient from "./liveclient.js";





class AgentsUI {



constructor(){


    this.container = null;


    this.activeAgent = null;


    this.search = "";


    this.category = "Todos";


}









/*
==================================================
INITIALIZE
==================================================
*/


init(containerId){



    this.container =

    document.getElementById(
        containerId
    )

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
==================================================
RENDER MARKETPLACE
==================================================
*/


render(){



const allAgents =

agents.getAll();







this.container.innerHTML = `



<div class="agent-marketplace">





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


Escolha um especialista digital
para trabalhar consigo.


</p>






</div>





</header>








<div class="agent-tools">





<div class="agent-search">



<i class="fa-solid fa-magnifying-glass"></i>





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





</div>





</div>








<div 

class="agents-grid"

id="agentsGrid">



${this.createCards(allAgents)}



</div>







</div>



`;





this.attachEvents();



}/*
==================================================
CREATE AGENT CARDS
==================================================
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
agent.skills

?

agent.skills.map(skill=>`

<span>

${skill}

</span>

`).join("")

:

`

<span>

Honey IA

</span>

`

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









/*
==================================================
EVENTOS PRINCIPAIS
==================================================
*/


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
.toLowerCase();





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









/*
==================================================
BOTÕES DOS AGENTES
==================================================
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



}/*
==================================================
SEARCH + FILTER UPDATE
==================================================
*/


updateAgents(){



let list =

agents.getAll();






/*
=========================
PESQUISA
=========================
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
=========================
CATEGORIA
=========================
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
==================================================
OPEN SELECTED AGENT
==================================================
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
=========================
EVENTO GLOBAL
=========================
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
=========================
LIVE MODE
=========================
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



}









/*
==================================================
ABRIR CHAT DO AGENTE
==================================================
*/


openChat(agent){





const chat =

document.getElementById(
"agentChatStudio"
);






if(!chat){

return;

}







chat.classList.remove(
"hidden"
);









/*
=========================
ATUALIZA DADOS
=========================
*/





const emoji =

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








if(emoji){


emoji.innerHTML =

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








/*
=========================
LIMPAR CHAT ANTERIOR
=========================
*/


const messages =

document.getElementById(
"agentMessages"
);






if(messages){



messages.innerHTML = `


<div class="agent-welcome-message">


<div class="welcome-icon">


<i class="fa-solid fa-robot"></i>


</div>




<div>


<h4>


Olá, sou ${agent.name}.


</h4>




<p>


Estou pronto para ajudar
com tarefas de ${agent.category}.


</p>



</div>


</div>



`;



}









chat.scrollIntoView({

behavior:"smooth",

block:"center"

});





}/*
==================================================
AGENT CHAT SYSTEM
==================================================
*/


initChat(){



const sendButton =

document.getElementById(
"sendAgentMessage"
);





const input =

document.getElementById(
"agentMessageInput"
);





const messages =

document.getElementById(
"agentMessages"
);








if(!sendButton || !input || !messages){

return;

}









const sendMessage = ()=>{





const text =

input.value.trim();






if(!text){

return;

}







/*
=========================
USER MESSAGE
=========================
*/


this.addChatMessage(

text,

"user"

);







input.value = "";









/*
=========================
AI RESPONSE TEMPORÁRIA
=========================
*/


setTimeout(()=>{



this.addChatMessage(



`Sou o ${this.activeAgent?.name || "Honey IA"}.
Recebi a sua mensagem e estou a preparar uma resposta personalizada.`,



"agent"



);



},800);







};










sendButton.addEventListener(

"click",

sendMessage

);









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













/*
==================================================
ADD CHAT MESSAGE
==================================================
*/


addChatMessage(text,type){



const messages =

document.getElementById(
"agentMessages"
);





if(!messages){

return;

}





const div =

document.createElement(
"div"
);







div.className =

type === "user"

?

"user-chat-message"

:

"ai-chat-message";







div.innerHTML = `



<div class="message-content">


${text}


</div>



`;






messages.appendChild(div);






messages.scrollTop =

messages.scrollHeight;



}













/*
==================================================
CURRENT AGENT
==================================================
*/


getCurrent(){



return this.activeAgent;


}






}









const agentsUI =

new AgentsUI();






export default agentsUI;







/*
==================================================
AUTO START
==================================================
*/


document.addEventListener(

"DOMContentLoaded",

()=>{



agentsUI.init(
"agentsContainer"
);



agentsUI.initChat();



}

);
