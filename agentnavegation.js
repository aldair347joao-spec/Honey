/*
==========================================
HONEY IA
AGENTS NAVIGATION
Agent Menu Controller
V1.0
==========================================
*/


import agentmarketplace from "./agentmarketplace.js";
import agentstudioview from "./agentstudioview.js";



class agentsnavigation {



constructor(){

    this.marketplaceOpen=false;

}






init(){



const marketplaceBtn =
document.getelementbyid(
"navagents"
);



if(!marketplacebtn){

return;

}




marketplacebtn.addeventlistener(
"click",
()=>{


this.openmarketplace();


}

);



}





openmarketplace(){



const views =
document.queryselectorall(
".workspace-view"
);



views.forEach(view=>{


view.style.display="none";


});





const marketplace =
document.getelementbyId(
"agentsmarketplaceview"
);



if(marketplace){


marketplace.style.display="block";


agentmarketplace.render();


}



}








openstudio(){



const views =
document.queryselectorall(
".workspace-view"
);



views.foreach(view=>{


view.style.display="none";


});





const studio =
document.getelementbyid(
"agentstudioview"
);



if(studio){


studio.style.display="block";


}



}



}



export default new AgentsNavigation();
