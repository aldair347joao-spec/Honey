/*
==========================================
HONEY IA
AUTH MANAGER
User Session Controller
V1.0
==========================================
*/


class authmanager {



constructor(){

    this.user = null;

    this.load();


}







load(){


const saved =
localStorage.getItem(
"honey_user"
);



if(saved){


this.user =
JSON.parse(saved);


}



}







login(data){



this.user={


id:
data.id || crypto.randomUUID(),


name:
data.name || "Utilizador Honey",


email:
data.email || "",


plan:
data.plan || "free",


createdAt:
new Date()


};




localStorage.setItem(

"honey_user",

JSON.stringify(
this.user
)

);




return this.user;



}







logout(){


this.user=null;


localStorage.removeItem(
"honey_user"
);


}







isAuthenticated(){


return !!this.user;


}







getUser(){


return this.user;


}







getPlan(){


return this.user?.plan || "free";


}




}



export default new authmanager();
