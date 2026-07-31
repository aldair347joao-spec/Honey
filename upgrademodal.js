 /*
==========================================
HONEY IA
UPGRADE MODAL
Premium Subscription UI
V1.0
==========================================
*/


import subscription from "./subscription.js";



class upgrademodal {



constructor(){

    this.modal=null;

}







create(){



if(this.modal){

return;

}



this.modal =
document.createElement("div");



this.modal.className =
"upgrade-modal";




this.modal.innerHTML = `



<div class="upgrade-box">



<button class="close-upgrade">

✕

</button>



<h2>

🐝 Upgrade Honey IA

</h2>



<p>

Desbloqueie agentes profissionais.

</p>




<div class="upgrade-plans">



<div class="upgrade-card">


<h3>

Individual

</h3>


<strong>

15.000 Kz/mês

</strong>


<ul>

<li>Todos os agentes</li>

<li>Exportação</li>

<li>Studios profissionais</li>

</ul>



<button

data-plan="individual"

class="upgrade-btn"

>

Escolher

</button>


</div>






<div class="upgrade-card">


<h3>

Business

</h3>


<strong>

400.000 Kz/mês

</strong>



<ul>

<li>Equipe</li>

<li>Agentes empresariais</li>

<li>Workspaces ilimitados</li>

</ul>



<button

data-plan="business"

class="upgrade-btn"

>

Escolher

</button>


</div>




</div>



</div>



`;




document.body.appendChild(
this.modal
);



this.attachEvents();



}









attachEvents(){



this.modal
.querySelector(
".close-upgrade"
)
.onclick=()=>{


this.close();


};






this.modal
.querySelectorAll(
".upgrade-btn"
)
.forEach(button=>{



button.onclick=()=>{



const plan =
button.dataset.plan;



subscription.setPlan(
plan
);



this.close();




document.dispatchEvent(

new CustomEvent(
"subscription-updated",
{

detail:
subscription.getPlan()

}

)

);



};



});



}








open(){



this.create();



this.modal.classList.add(
"active"
);



}







close(){



this.modal?.classList.remove(
"active"
);



}





}



export default new upgrademodal();
