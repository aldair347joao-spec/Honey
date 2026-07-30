/*
==========================================
HONEY IA
API CLIENT
Frontend ↔ Backend Communication
V1.0
==========================================
*/


class ApiClient {



constructor(){

    this.baseURL =
    "https://honey-ia.onrender.com";

}







async request(
endpoint,
options={}
){



const response =
await fetch(

this.baseURL + endpoint,

{

headers:{


"Content-Type":
"application/json",


},

...options


}

);





const data =
await response.json();



if(!response.ok){


throw new Error(

data.error ||
data.erro ||
"Erro na API"

);


}



return data;



}








async login(user){



return this.request(

"/api/auth/login",

{


method:"POST",


body:
JSON.stringify(user)


}


);



}








async register(user){



return this.request(

"/api/auth/register",

{


method:"POST",


body:
JSON.stringify(user)


}


);



}








async getProfile(){



return this.request(

"/api/user/profile",

{

method:"GET"

}

);


}








async getAgents(){



return this.request(

"/api/agents",

{

method:"GET"

}

);


}







async subscribe(plan){



return this.request(

"/api/subscription",

{


method:"POST",


body:
JSON.stringify({

plan

})


}


);



}



}



export default new ApiClient();
