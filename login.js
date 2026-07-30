 /*
==========================================
HONEY IA
LOGIN CONTROLLER
Authentication UI
V1.0
==========================================
*/


import AuthManager from "./auth.js";



class LoginController {



constructor(){

    this.form=null;

}







init(formId){



this.form =
document.getElementById(
formId
);



if(!this.form){

console.error(
"Formulário de login não encontrado."
);

return;

}



this.attachEvents();



}








attachEvents(){



this.form.addEventListener(
"submit",
(e)=>{


e.preventDefault();



const name =
this.form.querySelector(
"[name=name]"
)?.value;



const email =
this.form.querySelector(
"[name=email]"
)?.value;



const plan =
this.form.querySelector(
"[name=plan]"
)?.value
||
"free";





const user =
AuthManager.login({

name,

email,

plan


});






document.dispatchEvent(

new CustomEvent(
"user-login",
{

detail:user

}

)

);




}

);



}



}



export default new LoginController();
