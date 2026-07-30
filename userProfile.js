 /*
==========================================
HONEY IA
USER PROFILE
Account Management
V1.0
==========================================
*/


import AuthManager from "./auth.js";
import Subscription from "./subscription.js";
import UpgradeModal from "./upgradeModal.js";



class UserProfile {



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
AuthManager.getUser();



if(!user){


this.container.innerHTML = `

<p>
Nenhuma conta ativa.
</p>

`;

return;

}




const plan =
Subscription.getPlan();





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


UpgradeModal.open();


}

);








this.container
.querySelector(
".logout-account"
)
?.addEventListener(
"click",
()=>{


AuthManager.logout();



location.reload();



}

);



}



}



export default new UserProfile();
