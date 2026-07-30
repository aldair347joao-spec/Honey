 /*
==========================================
HONEY IA
AGENT ROUTER
Message Routing Layer
V1.0
==========================================
*/


import AgentStudio from "./agentStudio.js";


class AgentRouter {



constructor(){

    this.currentAgent =
    "general";

}






setAgent(agentId){


    this.currentAgent =
    agentId;


    AgentStudio.setAgent(
        agentId
    );


}







getAgent(){


    return (
        AgentStudio.getAgent()
        ||
        this.currentAgent
    );


}








preparePayload(message){



return {


    prompt:message,


    agent:
    this.getAgent(),


    mode:
    AgentStudio.getMode()



};



}



}



export default new AgentRouter();
