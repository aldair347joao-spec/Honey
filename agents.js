/*
==========================================
HONEY IA
AGENT ENGINE V3.0
Central Agent Registry
==========================================
*/


import DesignerAgent from "./agents/designerAgent.js";
import GeneralAgent from "./agents/generalAgent.js";
import DeveloperAgent from "./agents/developerAgent.js";
import MarketingAgent from "./agents/marketingAgent.js";
import FinanceAgent from "./agents/financeAgent.js";
import HealthAgent from "./agents/healthAgent.js";
import EducationAgent from "./agents/educationAgent.js";
import LegalAgent from "./agents/legalAgent.js";
import ArchitectAgent from "./agents/architectAgent.js";
import ExcelAgent from "./agents/excelAgent.js";
import SalesAgent from "./agents/salesAgent.js";
import VideoAgent from "./agents/videoAgent.js";
import ImageAgent from "./agents/imageAgent.js";
import SecurityAgent from "./agents/securityAgent.js";



class AgentEngine {


    constructor(){


        this.agents = new Map();


        this.activeAgent = "general";


        this.loadAgents();


    }






    loadAgents(){



        const agents = [


            GeneralAgent,

            DeveloperAgent,

            DesignerAgent,

            MarketingAgent,

            FinanceAgent,

            HealthAgent,

            EducationAgent,

            LegalAgent,

            ArchitectAgent,

            ExcelAgent,

            SalesAgent,

            VideoAgent,

            ImageAgent,

            SecurityAgent


        ];





        agents.forEach(agent=>{


            this.register(agent);


        });



    }









    register(agent){



        if(!agent || !agent.id){


            return;


        }






        this.agents.set(

            agent.id,

            {


                status:"online",


                conversations:[],


                memory:[],


                tools:[],


                ...agent


            }


        );





        console.log(
            `✅ Agente carregado: ${agent.name}`
        );



    }








    get(id){


        return this.agents.get(id);


    }







    getById(id){


        return this.agents.get(id);


    }








    getAll(){


        return [
            ...this.agents.values()
        ];


    }








    setActive(id){



        if(this.agents.has(id)){


            this.activeAgent=id;



            return this.agents.get(id);


        }





        return this.agents.get(
            "general"
        );



    }








    getActive(){


        return this.agents.get(
            this.activeAgent
        );


    }









    addConversation(id,role,content){



        const agent =
        this.agents.get(id);




        if(!agent)return;





        agent.conversations.push({

            role,

            content,

            date:new Date()

        });



    }









    getConversation(id){



        const agent =
        this.agents.get(id);




        if(!agent)return [];



        return agent.conversations;



    }









    saveMemory(id,key,value){



        const agent =
        this.agents.get(id);




        if(!agent)return;





        agent.memory.push({

            key,

            value,

            createdAt:new Date()

        });



    }









    getMemory(id){



        const agent =
        this.agents.get(id);



        if(!agent)return [];



        return agent.memory;



    }









    detect(prompt=""){



        const text =
        prompt.toLowerCase();





        if(
            text.includes("código") ||
            text.includes("program") ||
            text.includes("javascript") ||
            text.includes("python") ||
            text.includes("api") ||
            text.includes("node") ||
            text.includes("react")
        ){

            return this.get("developer");

        }







        if(
            text.includes("logo") ||
            text.includes("design") ||
            text.includes("ui") ||
            text.includes("ux") ||
            text.includes("figma")
        ){

            return this.get("designer");

        }







        if(
            text.includes("marketing") ||
            text.includes("publicidade") ||
            text.includes("instagram") ||
            text.includes("facebook") ||
            text.includes("vendas")
        ){

            return this.get("marketing");

        }







        if(
            text.includes("banco") ||
            text.includes("finança") ||
            text.includes("financeiro") ||
            text.includes("investimento")
        ){

            return this.get("finance");

        }







        if(
            text.includes("hospital") ||
            text.includes("clínica") ||
            text.includes("saúde") ||
            text.includes("medicina")
        ){

            return this.get("health");

        }







        if(
            text.includes("escola") ||
            text.includes("curso") ||
            text.includes("educação") ||
            text.includes("ensino")
        ){

            return this.get("education");

        }







        if(
            text.includes("excel") ||
            text.includes("planilha") ||
            text.includes("dados")
        ){

            return this.get("excel");

        }







        if(
            text.includes("segurança") ||
            text.includes("hacker") ||
            text.includes("proteção")
        ){

            return this.get("security");

        }







        if(
            text.includes("imagem") ||
            text.includes("foto")
        ){

            return this.get("image");

        }







        if(
            text.includes("vídeo") ||
            text.includes("video")
        ){

            return this.get("video");

        }







        if(
            text.includes("casa") ||
            text.includes("planta") ||
            text.includes("arquitetura")
        ){

            return this.get("architect");

        }







        if(
            text.includes("contrato") ||
            text.includes("lei") ||
            text.includes("jurídico")
        ){

            return this.get("legal");

        }







        if(
            text.includes("cliente") ||
            text.includes("vender")
        ){

            return this.get("sales");

        }







        return this.get("general");



    }



}




const Agents = new AgentEngine();


export default Agents;
