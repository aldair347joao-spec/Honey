// ======================================================
// HONEY IA
// AGENTS UI CONTROLLER V3.0
// Premium Agent Marketplace + Agent Chat
// ======================================================


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







this.renderAgents();







}









// ======================================================
// RENDER PRINCIPAL
// ======================================================



renderAgents(){



const allAgents =
agents.getAll();






this.container.innerHTML =

this.createCards(
allAgents
);






this.attachEvents();





}









// ======================================================
// CRIAÇÃO DOS CARDS DOS 30 AGENTES
// ======================================================



createCards(list){



if(!list.length){



return `



<div class="agent-empty">


Nenhum agente encontrado.


</div>



`;



}







return list.map(agent=>`



<article

class="agent-card"

data-agent="${agent.id}"

>








<div class="agent-top">






<div class="agent-avatar">


${agent.emoji || "🤖"}


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





Usar agente


<i class="fa-solid fa-arrow-right"></i>



</button>








</article>



`).join("");





}











// ======================================================
// EVENTOS
// ======================================================



attachEvents(){



this.attachSearch();


this.attachFilters();


this.attachAgentButtons();


this.attachChatEvents();



}


// ======================================================
// EVENTOS DO CHAT
// ======================================================


attachChatEvents(){



const sendBtn =

document.getElementById(
"agentSendBtn"
);




const input =

document.getElementById(
"agentChatInput"
);







if(sendBtn){



sendBtn.addEventListener(
"click",
()=>{


this.sendMessage();


});



}







if(input){



input.addEventListener(
"keydown",
(event)=>{



if(
event.key === "Enter"
&&
!event.shiftKey
){


event.preventDefault();


this.sendMessage();



}



});


}



}






}






export default new agentsui();// ======================================================
// PESQUISA DE AGENTES
// ======================================================


attachSearch(){



const searchInput =

document.getElementById(
"agentSearch"
);





if(!searchInput)

return;







searchInput.addEventListener(
"input",
(event)=>{



this.search =

event.target.value
.toLowerCase();





this.updateAgents();





});



}











// ======================================================
// FILTROS
// ======================================================


attachFilters(){



const filters =

document.querySelectorAll(
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






});



});





}









// ======================================================
// ATUALIZAR LISTA
// ======================================================



updateAgents(){



let list =

agents.getAll();








// PESQUISA



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










// CATEGORIA



if(
this.category !== "Todos"
){



list =

list.filter(agent=>



agent.category ===
this.category



);



}







this.container.innerHTML =

this.createCards(
list
);








this.attachAgentButtons();






}











// ======================================================
// BOTÕES DOS AGENTES
// ======================================================



attachAgentButtons(){



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





});



});



}











// ======================================================
// ABRIR AGENTE
// ======================================================



async openAgent(agentId){



try{





const agent =

agentstudio.setagent(
agentId
);







if(!agent){



console.error(
"Agente não encontrado."
);



return;



}







this.activeAgent = agent;









document.dispatchEvent(



new CustomEvent(
"agent-selected",
{

detail:agent

}

)



);












// MODO LIVE (SE ATIVO)



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







// ======================================================
// ABRIR CHAT DO AGENTE
// ======================================================



openChat(agent){





const panel =

document.getElementById(
"activeAgentPanel"
);







if(!panel)

return;







panel.classList.remove(
"hidden"
);








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







if(emoji)

emoji.textContent =

agent.emoji || "🤖";







if(name)

name.textContent =

agent.name;







if(role)

role.textContent =

agent.category ||
"Especialista Honey IA";







panel.scrollIntoView({

behavior:"smooth",

block:"center"

});







}// ======================================================
// CHAT DO AGENTE
// ======================================================


sendMessage(){



const input =

document.getElementById(
"agentChatInput"
);





const messages =

document.getElementById(
"agentChatMessages"
);






if(
!input ||
!messages ||
!input.value.trim()
)

return;







const text =

input.value.trim();






// MENSAGEM DO UTILIZADOR



this.addMessage(
"Você",
text,
"user"
);






input.value = "";






// RESPOSTA TEMPORÁRIA
// (será substituída pela API)



setTimeout(()=>{



this.addMessage(


this.activeAgent?.name ||

"Honey IA",


this.generateLocalReply(
text
),


"honey"



);



},800);






}









// ======================================================
// ADICIONAR MENSAGEM NO CHAT
// ======================================================



addMessage(
sender,
message,
type
){



const messages =

document.getElementById(
"agentChatMessages"
);






if(!messages)

return;







const div =

document.createElement(
"div"
);







div.className =

`agent-message ${type}`;








div.innerHTML = `



<div class="message-bubble">


<strong>

${sender}

</strong>


<br><br>


${message}


</div>



`;








messages.appendChild(
div
);








messages.scrollTop =

messages.scrollHeight;







}











// ======================================================
// RESPOSTA LOCAL TEMPORÁRIA
// ======================================================



generateLocalReply(message){



if(
!this.activeAgent
)

return "Estou pronto para ajudar.";







return `

Sou o ${this.activeAgent.name}.

Recebi a sua mensagem:

"${message}"

<br><br>

Estou preparado para ajudar
com a minha especialidade:
${this.activeAgent.category}.

`;



}









// ======================================================
// PREPARAÇÃO PARA API HONEY IA
// ======================================================



async sendToHoneyAPI(message){



/*

Aqui ficará a ligação
com o backend:

POST /gerar-gratis

ou

POST /agent-chat


Exemplo futuro:

fetch("/agent-chat",{
method:"POST",
body:JSON.stringify({
agent:this.activeAgent.id,
message
})
})


*/





return null;



}









}






export default new agentsui();
