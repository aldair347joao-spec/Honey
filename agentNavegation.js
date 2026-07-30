/*
==========================================
HONEY IA
AGENTS NAVIGATION
Agent Menu Controller
V1.0
==========================================
*/


import AgentMarketplace from "./agentMarketplace.js";
import AgentStudioView from "./agentStudioView.js";



class AgentsNavigation {



constructor(){

    this.marketplaceOpen=false;

}






init(){



const marketplaceBtn =
document.getElementById(
"navAgents"
);



if(!marketplaceBtn){

return;

}




marketplaceBtn.addEventListener(
"click",
()=>{


this.openMarketplace();


}

);



}





openMarketplace(){



const views =
document.querySelectorAll(
".workspace-view"
);



views.forEach(view=>{


view.style.display="none";


});





const marketplace =
document.getElementById(
"agentsMarketplaceView"
);



if(marketplace){


marketplace.style.display="block";


AgentMarketplace.render();


}



}








openStudio(){



const views =
document.querySelectorAll(
".workspace-view"
);



views.forEach(view=>{


view.style.display="none";


});





const studio =
document.getElementById(
"agentStudioView"
);



if(studio){


studio.style.display="block";


}



}



}



export default new AgentsNavigation();
