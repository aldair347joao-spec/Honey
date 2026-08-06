/*
==========================================
HONEY IA
AGENT STUDIO ENGINE V8
Specialist Workspace Controller
30 Agents Integration
==========================================
*/


import Agents from "./agents.js";







class AgentStudio {





constructor(){



    this.activeAgent =

    "general";



    this.mode =

    "chat";



    this.container =

    null;



    this.history =

    [];



    this.workspace =

    {};



}









// ==========================================================
// INITIALIZE
// ==========================================================


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









// ==========================================================
// OPEN AGENT
// ==========================================================


open(agent){



if(!agent)

return;








this.activeAgent =

agent.id;








if(

typeof Agents.setActive ===

"function"

){



Agents.setActive(

agent.id

);



}








this.history =



typeof Agents.getConversation ===

"function"



?





Agents.getConversation(

agent.id

)





:




[];









document.dispatchEvent(



new CustomEvent(

"agent-opened",

{


detail:agent


}



)



);








this.render();



}









// ==========================================================
// GET CURRENT AGENT ID
// ==========================================================


getAgent(){



return this.activeAgent;



}









// ==========================================================
// GET PROFILE
// ==========================================================


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

agent.category || "",





level:

agent.level || "Professional",





tools:

agent.tools || [],





description:

agent.description || ""



};



}// ==========================================================
// MODE CONTROL
// ==========================================================


setMode(mode){



if(

mode !== "chat"

&&

mode !== "live"

)

return;








this.mode =

mode;








this.updateModeUI();



}









getMode(){



return this.mode;



}









// ==========================================================
// RENDER STUDIO
// ==========================================================


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


            ${

            agent.emoji ||

            "🤖"

            }


        </div>







        <div class="studio-agent-info">



            <h2>


            ${agent.name}


            </h2>






            <p>


            ${

            agent.description ||

            "Especialista Honey IA"

            }


            </p>







            <span class="agent-level">


            ${

            agent.level ||

            "Professional"

            }


            </span>



        </div>



    </div>









    <div class="studio-tools">



        <h3>

        Ferramentas

        </h3>







        <div class="tools-list">



        ${



        (agent.tools || [])

        .map(tool=>`



            <span class="tool-item">

            ${tool}

            </span>



        `)

        .join("")



        }



        </div>



    </div>









    <div class="studio-mode">



        <button

        class="mode-btn

        ${this.mode === "chat" ? "active" : ""}"

        data-mode="chat"

        >


        💬 Chat


        </button>








        <button

        class="mode-btn

        ${this.mode === "live" ? "active" : ""}"

        data-mode="live"

        >


        ⚡ Live


        </button>



    </div>









    <div class="studio-chat-area">



        <div

        id="studioHistory"

        class="studio-history">



        ${

        this.renderHistory()

        }



        </div>









        <div class="studio-input-area">



            <textarea

            id="studioInput"

            placeholder="Fale com este especialista..."

            ></textarea>








            <button

            id="studioSend"

            >


            Enviar


            </button>



        </div>



    </div>



</div>



`;









this.bindEvents();



}









// ==========================================================
// HISTORY RENDER
// ==========================================================


renderHistory(){



if(

!this.history ||

this.history.length === 0

){



return `



<div class="empty-history">


Inicie uma conversa com este especialista.


</div>



`;



}









return this.history

.map(message=>`



<div class="history-message ${message.role}">


${message.content}


</div>



`)

.join("");



}// ==========================================================
// EVENT BINDING
// ==========================================================


bindEvents(){



if(!this.container)

return;










// MODE BUTTONS


const modeButtons =

this.container.querySelectorAll(

"[data-mode]"

);








modeButtons.forEach(button=>{



button.addEventListener(

"click",

()=>{



this.setMode(

button.dataset.mode

);



}

);



});










// SEND BUTTON


const sendButton =

this.container.querySelector(

"#studioSend"

);









if(sendButton){



sendButton.addEventListener(

"click",

()=>{



this.sendMessage();



}

);



}










// ENTER SEND


const input =

this.container.querySelector(

"#studioInput"

);








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



}

);



}



}









// ==========================================================
// SEND MESSAGE
// ==========================================================


async sendMessage(){



const input =

this.container.querySelector(

"#studioInput"

);









if(!input)

return;









const text =

input.value.trim();








if(!text)

return;









input.value = "";








this.saveConversation(

"user",

text

);








this.render();









try{



const response =

await fetch(

`${window.location.origin}/gerar-gratis`,

{


method:"POST",



headers:{


"Content-Type":

"application/json"


},






body:JSON.stringify({



prompt:

text,





agentId:

this.activeAgent,





history:

this.history,





mode:

this.mode



})



}

);








const data =

await response.json();








const answer =

data.response ||

data.resposta ||

"Sem resposta.";








this.saveConversation(

"assistant",

answer

);








this.render();



}

catch(error){



this.saveConversation(



"assistant",



"Erro ao comunicar com Honey IA."



);



this.render();



}



}









// ==========================================================
// SAVE CONVERSATION
// ==========================================================


saveConversation(

role,

content

){



if(

typeof Agents.addConversation ===

"function"

){



Agents.addConversation(



this.activeAgent,



role,



content



);



}









this.history.push({



role,



content



});



}// ==========================================================
// UPDATE MODE UI
// ==========================================================


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









// ==========================================================
// CLEAR HISTORY
// ==========================================================


clearHistory(){



const agent =

Agents.get(

this.activeAgent

);








if(agent){



agent.conversations = [];



}








this.history = [];








this.render();



}









// ==========================================================
// WORKSPACE STATE
// ==========================================================


getWorkspaceState(){



return {



agent:

this.activeAgent,





mode:

this.mode,





history:

this.history,





profile:

this.getAgentProfile()



};



}









// ==========================================================
// RESET STUDIO
// ==========================================================


reset(){



this.activeAgent =

"general";





this.mode =

"chat";





this.history = [];








if(this.container){



this.render();



}



}









// ==========================================================
// EVENT LISTENERS
// ==========================================================


listenEvents(){



document.addEventListener(

"agent-selected",

(event)=>{



const agent =

event.detail;








if(agent){



this.open(

agent

);



}



}

);



}









// ==========================================================
// EXPORT PROFILE
// ==========================================================


exportProfile(){



const profile =

this.getAgentProfile();








if(!profile)

return null;








return JSON.stringify(

profile,

null,

2

);



}// ==========================================================
// DESTROY
// ==========================================================


destroy(){



if(this.container){



    this.container.innerHTML = "";



}








this.container = null;



this.history = [];



this.workspace = {};



}









// ==========================================================
// AUTO INIT
// ==========================================================


autoInit(){



const studio =

document.getElementById(

"agentStudioContainer"

);








if(studio){



this.init(

"agentStudioContainer"

);



}



}









// ==========================================================
// SINGLE INSTANCE
// ==========================================================


}





const agentstudio =

new AgentStudio();





export default agentstudio;
