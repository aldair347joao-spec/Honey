 /*
==========================================
HONEY IA
AGENT ROUTER
Message Routing Layer
V1.0
==========================================
*/


import agentstudio from "./agentstudio.js";


class agentrouter {



constructor(){

    this.currentagent =
    "general";

}






setagent(agentId){


    this.currentagent =
    agentId;


    agentstudio.setagent(
        agentid
    );


}







getagent(){


    return (
        agentstudio.getagent()
        ||
        this.currentagent
    );


}








preparepayload(message){



return {


    prompt:message,


    agent:
    this.getsgent(),


    mode:
    agentstudio.getMode()



};



}



}



export default new agentrouter();
