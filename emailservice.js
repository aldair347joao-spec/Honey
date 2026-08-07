/*
==========================================
HONEY IA OS
EMAIL SERVICE
Verification & Notification System
V1.0
==========================================
*/


import nodemailer from "nodemailer";



class EmailService {



    constructor(){


        this.transporter = null;


        this.initialize();


    }








    initialize(){


        if(

            !process.env.EMAIL_HOST ||

            !process.env.EMAIL_USER ||

            !process.env.EMAIL_PASSWORD

        ){


            console.warn(

            "⚠️ Serviço de email não configurado."

            );


            return;


        }







        this.transporter =

        nodemailer.createTransport({



            host:

            process.env.EMAIL_HOST,



            port:

            Number(

                process.env.EMAIL_PORT || 587

            ),



            secure:

            process.env.EMAIL_SECURE === "true",



            auth:{



                user:

                process.env.EMAIL_USER,



                pass:

                process.env.EMAIL_PASSWORD



            }



        });



        console.log(

        "📧 Email Service carregado."

        );



    }









    async sendVerificationCode(

        email,

        code,

        name="Utilizador"

    ){



        if(!this.transporter){



            throw new Error(

            "Serviço de email indisponível."

            );


        }








        await this.transporter.sendMail({



            from:

            `"Honey IA" <${process.env.EMAIL_USER}>`,



            to:

            email,



            subject:

            "Código de confirmação Honey IA",



            html:`



            <div style="

            font-family:Arial;

            background:#07080a;

            color:white;

            padding:30px;

            ">



            <h2>

            🐝 Honey IA

            </h2>



            <p>

            Olá ${name},

            </p>



            <p>

            Use este código para confirmar a sua conta:

            </p>



            <h1 style="

            letter-spacing:8px;

            color:#f59e0b;

            ">

            ${code}

            </h1>



            <p>

            Este código expira em breve.

            </p>



            </div>



            `



        });



        return true;



    }









    async sendWelcomeEmail(

        email,

        name

    ){



        if(!this.transporter)

        return false;








        await this.transporter.sendMail({



            from:

            `"Honey IA" <${process.env.EMAIL_USER}>`,



            to:

            email,



            subject:

            "Bem-vindo à Honey IA",



            html:`



            <h2>

            🐝 Bem-vindo ${name}

            </h2>



            <p>

            A sua conta Honey IA foi criada com sucesso.

            </p>



            <p>

            Explore o seu Workspace inteligente.

            </p>



            `



        });



        return true;



    }







}









export default new EmailService();
