/*
==========================================
HONEY IA OS
EMAIL SERVICE
Verification & Notification System
V2.0
Production Email Service
SMTP + Render Safe Configuration
==========================================
*/


import nodemailer from "nodemailer";



class EmailService {



    constructor(){


        this.transporter = null;


        this.configured = false;


        this.initialize();


    }








    /*
    ==========================================
    INITIALIZE EMAIL SERVICE
    ==========================================
    */


    initialize(){


        const {

            EMAIL_HOST,

            EMAIL_PORT,

            EMAIL_SECURE,

            EMAIL_USER,

            EMAIL_PASSWORD

        } = process.env;



        /*
        --------------------------------------
        Validate configuration
        --------------------------------------
        */


        if(

            !EMAIL_HOST ||

            !EMAIL_USER ||

            !EMAIL_PASSWORD

        ){


            console.warn(

                "⚠️ HONEY IA EMAIL: Serviço de email não configurado."

            );


            this.transporter = null;


            this.configured = false;


            return;


        }



        /*
        --------------------------------------
        SMTP PORT
        --------------------------------------
        */


        const port =

            Number(

                EMAIL_PORT || 587

            );



        /*
        --------------------------------------
        SMTP SECURITY
        --------------------------------------
        */


        const secure =

            String(

                EMAIL_SECURE || ""

            )

                .toLowerCase() ===

            "true";



        /*
        --------------------------------------
        CREATE TRANSPORTER
        --------------------------------------
        */


        this.transporter =

            nodemailer.createTransport({

                host:

                    EMAIL_HOST,

                port,

                secure,

                auth: {

                    user:

                        EMAIL_USER,

                    pass:

                        EMAIL_PASSWORD

                },

                connectionTimeout:

                    10000,

                greetingTimeout:

                    10000,

                socketTimeout:

                    15000

            });



        this.configured = true;



        console.log(

            "📧 HONEY IA EMAIL: Serviço SMTP carregado."

        );


    }








    /*
    ==========================================
    VERIFY SMTP CONNECTION
    ==========================================
    */


    async verify(){


        if(

            !this.transporter ||

            !this.configured

        ){


            return false;


        }



        try{


            await this.transporter.verify();



            console.log(

                "✅ HONEY IA EMAIL: Conexão SMTP verificada."

            );



            return true;


        }


        catch(error){


            console.error(

                "❌ HONEY IA EMAIL: Falha na conexão SMTP:",

                error.message

            );



            return false;


        }


    }








    /*
    ==========================================
    SEND VERIFICATION CODE
    ==========================================
    */


    async sendVerificationCode(

        email,

        code,

        name = "Utilizador"

    ){


        /*
        --------------------------------------
        Validate transporter
        --------------------------------------
        */


        if(

            !this.transporter ||

            !this.configured

        ){


            throw new Error(

                "Serviço de email indisponível."

            );


        }



        /*
        --------------------------------------
        Validate recipient
        --------------------------------------
        */


        if(!email){


            throw new Error(

                "Email do destinatário não fornecido."

            );


        }



        /*
        --------------------------------------
        Validate code
        --------------------------------------
        */


        if(!code){


            throw new Error(

                "Código de confirmação não fornecido."

            );


        }



        /*
        --------------------------------------
        Sanitize display name
        --------------------------------------
        */


        const safeName =

            String(

                name || "Utilizador"

            )

                .trim();



        /*
        --------------------------------------
        SEND EMAIL
        --------------------------------------
        */


        try{


            await this.transporter.sendMail({

                from:

                    `"Honey IA" <${process.env.EMAIL_USER}>`,

                to:

                    email,

                subject:

                    "Código de confirmação Honey IA",

                text:

                    `Olá ${safeName}. O seu código de confirmação Honey IA é ${code}. Este código expira em breve.`,

                html:

                    `

                    <!DOCTYPE html>

                    <html lang="pt">

                    <head>

                        <meta charset="UTF-8">

                        <meta

                            name="viewport"

                            content="width=device-width, initial-scale=1.0"

                        >

                        <title>

                            Código de confirmação Honey IA

                        </title>

                    </head>


                    <body style="

                        margin:0;

                        padding:0;

                        background:#07080a;

                        font-family:Arial,Helvetica,sans-serif;

                        color:#ffffff;

                    ">


                        <div style="

                            max-width:600px;

                            margin:0 auto;

                            padding:40px 20px;

                        ">


                            <div style="

                                background:#0f1117;

                                border:1px solid rgba(255,255,255,.08);

                                border-radius:20px;

                                padding:32px;

                            ">


                                <h2 style="

                                    margin:0 0 24px;

                                    color:#f59e0b;

                                ">

                                    🐝 Honey IA

                                </h2>


                                <p style="

                                    color:#ffffff;

                                    font-size:16px;

                                    line-height:1.6;

                                ">

                                    Olá ${safeName},

                                </p>


                                <p style="

                                    color:#b8bdc7;

                                    font-size:15px;

                                    line-height:1.6;

                                ">

                                    Use o código abaixo para confirmar a sua conta Honey IA:

                                </p>


                                <div style="

                                    margin:30px 0;

                                    padding:24px;

                                    background:#07080a;

                                    border-radius:16px;

                                    text-align:center;

                                ">


                                    <div style="

                                        font-size:36px;

                                        font-weight:700;

                                        letter-spacing:10px;

                                        color:#f59e0b;

                                    ">

                                        ${code}

                                    </div>


                                </div>


                                <p style="

                                    color:#8f96a3;

                                    font-size:13px;

                                    line-height:1.6;

                                ">

                                    Este código é temporário e expira em breve.

                                </p>


                                <p style="

                                    color:#8f96a3;

                                    font-size:13px;

                                    line-height:1.6;

                                ">

                                    Se não foi você que tentou criar esta conta, pode ignorar este email.

                                </p>


                            </div>


                        </div>


                    </body>

                    </html>

                    `

            });



            console.log(

                "📨 HONEY IA EMAIL: Código de confirmação enviado."

            );



            return true;


        }


        catch(error){


            console.error(

                "❌ HONEY IA EMAIL: Erro ao enviar código:",

                error.message

            );


            throw error;


        }


    }








    /*
    ==========================================
    SEND WELCOME EMAIL
    ==========================================
    */


    async sendWelcomeEmail(

        email,

        name = "Utilizador"

    ){


        /*
        --------------------------------------
        Service unavailable
        --------------------------------------
        */


        if(

            !this.transporter ||

            !this.configured

        ){


            console.warn(

                "⚠️ HONEY IA EMAIL: Email de boas-vindas ignorado. Serviço indisponível."

            );


            return false;


        }



        /*
        --------------------------------------
        Validate recipient
        --------------------------------------
        */


        if(!email){


            return false;


        }



        const safeName =

            String(

                name || "Utilizador"

            )

                .trim();



        /*
        --------------------------------------
        SEND EMAIL
        --------------------------------------
        */


        try{


            await this.transporter.sendMail({

                from:

                    `"Honey IA" <${process.env.EMAIL_USER}>`,

                to:

                    email,

                subject:

                    "Bem-vindo à Honey IA",

                text:

                    `Bem-vindo ${safeName}. A sua conta Honey IA foi criada com sucesso.`,

                html:

                    `

                    <!DOCTYPE html>

                    <html lang="pt">

                    <head>

                        <meta charset="UTF-8">

                        <meta

                            name="viewport"

                            content="width=device-width, initial-scale=1.0"

                        >

                        <title>

                            Bem-vindo à Honey IA

                        </title>

                    </head>


                    <body style="

                        margin:0;

                        padding:0;

                        background:#07080a;

                        font-family:Arial,Helvetica,sans-serif;

                        color:#ffffff;

                    ">


                        <div style="

                            max-width:600px;

                            margin:0 auto;

                            padding:40px 20px;

                        ">


                            <div style="

                                background:#0f1117;

                                border:1px solid rgba(255,255,255,.08);

                                border-radius:20px;

                                padding:32px;

                            ">


                                <h2 style="

                                    margin:0 0 24px;

                                    color:#f59e0b;

                                ">

                                    🐝 Bem-vindo à Honey IA

                                </h2>


                                <p style="

                                    color:#ffffff;

                                    font-size:16px;

                                    line-height:1.6;

                                ">

                                    Olá ${safeName},

                                </p>


                                <p style="

                                    color:#b8bdc7;

                                    font-size:15px;

                                    line-height:1.6;

                                ">

                                    A sua conta Honey IA foi criada com sucesso.

                                </p>


                                <p style="

                                    color:#b8bdc7;

                                    font-size:15px;

                                    line-height:1.6;

                                ">

                                    Agora pode entrar no seu Workspace e começar a utilizar os recursos da Honey IA.

                                </p>


                            </div>


                        </div>


                    </body>

                    </html>

                    `

            });



            console.log(

                "📨 HONEY IA EMAIL: Email de boas-vindas enviado."

            );



            return true;


        }


        catch(error){


            console.error(

                "⚠️ HONEY IA EMAIL: Erro no email de boas-vindas:",

                error.message

            );



            return false;


        }


    }


}








/*
==========================================
GLOBAL EMAIL SERVICE
==========================================
*/


const emailservice =

    new EmailService();








/*
==========================================
EXPORT
==========================================
*/


export default emailservice;
