 /*
==========================================
HONEY IA
USER PROFILE
Account Management
V1.0
==========================================
*/


import authmanager from "./auth.js";
import subscription from "./subscription.js";
import upgrademodal from "./upgrademodal.js";



class userprofile {



constructor(){

    this.container=null;

}







init(containerId){


this.container =
document.getElementById(
containerId
);



if(!this.container){

return;

}



this.render();



}







render(){



const user =
authmanager.getUser();



if(!user){


this.container.innerHTML = `

<p>
Nenhuma conta ativa.
</p>

`;

return;

}




const plan =
subscription.getPlan();





this.container.innerHTML = `



<div class="profile-card">


<div class="profile-avatar">

👤

</div>




<h2>

${user.name}

</h2>



<p>

${user.email}

</p>






<div class="profile-plan">


<h3>

Plano Atual

</h3>


<strong>

${plan.name}

</strong>


</div>






<div class="profile-actions">


<button 
class="upgrade-account"
>

🚀 Fazer Upgrade

</button>



<button 
class="logout-account"
>

Sair

</button>


</div>



</div>



`;



this.attachEvents();



}









attachEvents(){



this.container
.querySelector(
".upgrade-account"
)
?.addEventListener(
"click",
()=>{


upgrademodal.open();


}

);








this.container
.querySelector(
".logout-account"
)
?.addEventListener(
"click",
()=>{


authmanager.logout();



location.reload();



}

);



}



}



export default new userprofile();
