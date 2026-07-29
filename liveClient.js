/*
==========================================
HONEY IA
LIVE CLIENT
Frontend Controller
==========================================
*/


class LiveClient {


    constructor(){

        this.active = false;

        this.agent = null;

    }




    async start(){


        const response = await fetch(
            "/api/live/start",
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                }
            }
        );


        const data = await response.json();


        if(data.success){

            this.active = true;

            this.agent = data.session.identity;

        }


        return data;

    }





    async send(message){


        if(!this.active){

            throw new Error(
                "Modo Live não iniciado."
            );

        }



        const response = await fetch(
            "/api/live/chat",
            {

                method:"POST",

                headers:{
                    "Content-Type":"application/json"
                },


                body:JSON.stringify({

                    message

                })

            }
        );



        return await response.json();

    }





    stop(){

        this.active=false;

        this.agent=null;

    }





    getAgent(){

        return this.agent;

    }



}



export default new LiveClient();
