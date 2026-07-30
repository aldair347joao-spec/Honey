/*
==========================================
HONEY IA
SUBSCRIPTION MANAGER
Plans Controller
V1.0
==========================================
*/


class subscription {



constructor(){


    this.plan = "free";


    this.plans = {


        free:{


            name:"Free",


            price:0,


            agents:[
                "general"
            ],


            export:false,


            workspaces:1


        },



        individual:{


            name:"Individual",


            price:15000,


            agents:"all",


            export:true,


            workspaces:10


        },



        business:{


            name:"Business",


            price:400000,


            agents:"all",


            export:true,


            workspaces:"unlimited"


        }



    };


}








setPlan(plan){


if(!this.plans[plan]){


throw new Error(
"Plano inválido."
);


}



this.plan=plan;



return this.getPlan();



}







getPlan(){


return this.plans[this.plan];


}







canuseagent(agentId){



const current =
this.getPlan();



if(
current.agents==="all"
){

return true;

}



return current.agents.includes(
agentId
);


}







canExport(){


return this.getPlan().export;


}





}



export default new subscription();
