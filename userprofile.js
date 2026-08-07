/*
==========================================
HONEY IA OS
USER PROFILE
Account Management
V2.0
Integrated with AuthManager V4
JWT + MongoDB + Plans
==========================================
*/


import authmanager from "./auth.js";
import upgrademodal from "./upgrademodal.js";



class UserProfile {



    constructor(){


        this.container = null;

        this.unsubscribe = null;

        this.initialized = false;


    }









    /*
    ==========================================
    INITIALIZE
    ==========================================
    */


    init(containerId){


        if(this.initialized){

            this.refresh();

            return;

        }



        this.container =

            document.getElementById(

                containerId

            );



        if(!this.container){

            console.warn(

                "USER PROFILE: Container não encontrado:",

                containerId

            );

            return;

        }



        this.initialized = true;



        this.render();



        /*
        --------------------------------------
        Listen for authentication changes
        --------------------------------------
        */


        this.unsubscribe =

            authmanager.subscribe(

                () => {

                    this.refresh();

                }

            );


    }









    /*
    ==========================================
    REFRESH
    ==========================================
    */


    refresh(){


        if(!this.container)

            return;



        this.render();


    }









    /*
    ==========================================
    RENDER
    ==========================================
    */


    render(){


        if(!this.container)

            return;



        const user =

            authmanager.getUser();



        /*
        --------------------------------------
        No authenticated user
        --------------------------------------
        */


        if(!user){


            this.container.innerHTML = `

                <div class="profile-card">

                    <div class="profile-avatar">

                        👤

                    </div>


                    <h2>

                        Nenhuma conta ativa.

                    </h2>


                    <p>

                        Inicie sessão para visualizar o seu perfil.

                    </p>

                </div>

            `;


            return;

        }



        /*
        --------------------------------------
        USER DATA
        --------------------------------------
        */


        const displayName =

            authmanager.getDisplayName();



        const email =

            authmanager.getEmail();



        const plan =

            authmanager.getPlan();



        const avatar =

            authmanager.getAvatar();



        const initials =

            this.getInitials(

                user

            );



        const planLabel =

            this.formatPlanName(

                plan

            );



        /*
        --------------------------------------
        AVATAR
        --------------------------------------
        */


        const avatarContent =

            avatar

            ?

            `

                <img

                    src="${this.escapeAttribute(avatar)}"

                    alt="Avatar de ${this.escapeHtml(displayName)}"

                >

            `

            :

            `

                ${this.escapeHtml(initials)}

            `;



        /*
        --------------------------------------
        PROFILE
        --------------------------------------
        */


        this.container.innerHTML = `

            <div class="profile-card">


                <div class="profile-avatar">

                    ${avatarContent}

                </div>



                <h2>

                    ${this.escapeHtml(displayName)}

                </h2>



                <p>

                    ${this.escapeHtml(email)}

                </p>



                <div class="profile-plan">


                    <h3>

                        Plano Atual

                    </h3>



                    <strong>

                        ${this.escapeHtml(planLabel)}

                    </strong>


                </div>



                <div class="profile-actions">


                    ${
                        plan === "free"

                        ?

                        `

                        <button

                            type="button"

                            class="upgrade-account"

                        >

                            🚀 Fazer Upgrade

                        </button>

                        `

                        :

                        `

                        <button

                            type="button"

                            class="upgrade-account"

                        >

                            ⚙️ Gerir Plano

                        </button>

                        `

                    }



                    <button

                        type="button"

                        class="logout-account"

                    >

                        Sair

                    </button>


                </div>


            </div>

        `;



        this.attachEvents();


    }









    /*
    ==========================================
    ATTACH EVENTS
    ==========================================
    */


    attachEvents(){


        if(!this.container)

            return;



        /*
        --------------------------------------
        UPGRADE / PLAN
        --------------------------------------
        */


        this.container

            .querySelector(

                ".upgrade-account"

            )

            ?.addEventListener(

                "click",

                () => {


                    this.openUpgrade();


                }

            );



        /*
        --------------------------------------
        LOGOUT
        --------------------------------------
        */


        this.container

            .querySelector(

                ".logout-account"

            )

            ?.addEventListener(

                "click",

                () => {


                    this.logout();


                }

            );


    }









    /*
    ==========================================
    OPEN UPGRADE
    ==========================================
    */


    openUpgrade(){


        if(

            upgrademodal &&

            typeof upgrademodal.open ===

            "function"

        ){


            upgrademodal.open();


            return;

        }



        console.warn(

            "UPGRADE MODAL não está disponível."

        );


    }









    /*
    ==========================================
    LOGOUT
    ==========================================
    */


    async logout(){


        const button =

            this.container

            ?.querySelector(

                ".logout-account"

            );



        if(button){


            button.disabled = true;



            button.dataset.originalText =

                button.textContent;



            button.textContent =

                "A sair...";


        }



        try{


            await authmanager.logout();


        }

        catch(error){


            console.error(

                "USER PROFILE LOGOUT ERROR:",

                error

            );

        }

        finally{


            /*
            ----------------------------------
            AuthManager já limpa:
            - JWT
            - utilizador
            - sessão local
            ----------------------------------
            */


            window.location.href =

                "/";

        }


    }









    /*
    ==========================================
    GET INITIALS
    ==========================================
    */


    getInitials(user){


        const firstName =

            user?.firstName ||

            "";



        const lastName =

            user?.lastName ||

            "";



        const name =

            `${firstName} ${lastName}`

            .trim();



        if(!name){


            const email =

                user?.email ||

                "";



            return (

                email.charAt(0) ||

                "U"

            ).toUpperCase();


        }



        const parts =

            name.split(

                /\s+/

            );



        if(parts.length === 1){


            return (

                parts[0].charAt(0)

            ).toUpperCase();


        }



        return (

            parts[0].charAt(0) +

            parts[parts.length - 1].charAt(0)

        ).toUpperCase();


    }









    /*
    ==========================================
    FORMAT PLAN
    ==========================================
    */


    formatPlanName(plan){


        const plans = {


            free:

                "Gratuito",



            individual:

                "Individual",



            business:

                "Business"

        };



        return (

            plans[plan] ||

            "Gratuito"

        );


    }









    /*
    ==========================================
    ESCAPE HTML
    ==========================================
    */


    escapeHtml(value){


        return String(

            value ?? ""

        )

        .replace(

            /&/g,

            "&amp;"

        )

        .replace(

            /</g,

            "&lt;"

        )

        .replace(

            />/g,

            "&gt;"

        )

        .replace(

            /"/g,

            "&quot;"

        )

        .replace(

            /'/g,

            "&#039;"

        );


    }









    /*
    ==========================================
    ESCAPE ATTRIBUTE
    ==========================================
    */


    escapeAttribute(value){


        return this.escapeHtml(

            value

        );


    }









    /*
    ==========================================
    DESTROY
    ==========================================
    */


    destroy(){


        if(this.unsubscribe){


            this.unsubscribe();


            this.unsubscribe =

                null;


        }



        this.container =

            null;



        this.initialized =

            false;


    }


}



/*
==========================================
SINGLETON
==========================================
*/


const userprofile =

    new UserProfile();



export default userprofile;
