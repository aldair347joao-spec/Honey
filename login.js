/*
==========================================
HONEY IA OS
LOGIN CONTROLLER
Professional Authentication UI
V3.0
==========================================
*/


import authmanager from "./auth.js";



class LoginController {



    constructor(){


        this.container = null;


        this.mode = "login";


        this.pendingEmail = null;


    }









    init(){



        this.createContainer();


        this.render();


        this.attachEvents();



    }









    createContainer(){



        let existing =

        document.getElementById(

            "loginApp"

        );








        if(existing){


            this.container = existing;


            return;


        }








        const div =

        document.createElement(

            "div"

        );








        div.id =

        "loginApp";








        document.body.prepend(

            div

        );








        this.container = div;



    }









    render(){



        if(!this.container)

        return;








        this.container.innerHTML = `



        <div class="honey-auth-wrapper">



            <div class="honey-auth-card">





                <div class="auth-brand">


                    <div class="auth-logo">

                        🐝

                    </div>



                    <h1>

                    Honey IA

                    </h1>



                    <p>

                    Enterprise AI Studio

                    </p>



                </div>







                <div 
                id="authMessage"
                class="auth-message">

                </div>







                <div id="loginMode">



                    <button 
                    id="googleLogin"
                    class="google-btn">


                    <i class="fa-brands fa-google"></i>


                    Continuar com Google


                    </button>








                    <div class="divider">

                        <span>

                        ou

                        </span>

                    </div>








                    <input

                    id="loginEmail"

                    type="email"

                    placeholder="Email"


                    >








                    <input

                    id="loginPassword"

                    type="password"

                    placeholder="Palavra-passe"


                    >








                    <button

                    id="loginButton"

                    class="auth-button">


                    Entrar


                    </button>








                    <button

                    id="showRegister"

                    class="auth-link">


                    Criar nova conta


                    </button>



                </div>







                <div 
                id="registerMode"
                style="display:none;">





                    <input

                    id="registerNome"

                    placeholder="Primeiro nome"


                    >





                    <input

                    id="registerApelido"

                    placeholder="Apelido"


                    >





                    <input

                    id="registerEmail"

                    type="email"

                    placeholder="Email"


                    >





                    <input

                    id="registerPassword"

                    type="password"

                    placeholder="Criar palavra-passe"


                    >






                    <input

                    id="registerConfirm"

                    type="password"

                    placeholder="Confirmar palavra-passe"


                    >








                    <button

                    id="registerButton"

                    class="auth-button">


                    Criar conta


                    </button>








                    <button

                    id="backLogin"

                    class="auth-link">


                    Já tenho conta


                    </button>






                </div>







                <div

                id="verifyMode"

                style="display:none;">





                    <h3>

                    Confirmar Email

                    </h3>





                    <p>

                    Enviamos um código para o seu email.

                    </p>








                    <input

                    id="verifyCode"

                    placeholder="Código de 6 dígitos"


                    >





                    <button

                    id="verifyButton"

                    class="auth-button">


                    Confirmar


                    </button>





                </div>






            </div>



        </div>



        `;



    }
