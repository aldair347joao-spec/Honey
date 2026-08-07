/*
==========================================
HONEY IA OS
AUTH CONTROLLER
Authentication Business Logic
V1.0
==========================================
*/


import bcrypt from "bcrypt";

import jwt from "jsonwebtoken";

import validator from "validator";

import crypto from "crypto";


import {

    User,

    Session

} from "./models.js";


import emailservice from "./emailservice.js";









/*
==========================================
CONFIG
==========================================
*/


const JWT_SECRET =

process.env.JWT_SECRET ||

"honey-secret-change-me";









/*
==========================================
PASSWORD VALIDATION
==========================================
*/


function validatePassword(password){



    if(!password || password.length < 8){


        return false;


    }







    const hasUpperCase =

    /[A-Z]/.test(password);







    const hasNumber =

    /[0-9]/.test(password);







    const hasSpecial =

    /[^A-Za-z0-9]/.test(password);







    return (

        hasUpperCase &&

        hasNumber &&

        hasSpecial

    );



}









/*
==========================================
GENERATE VERIFICATION CODE
==========================================
*/


function generateCode(){



    return Math.floor(

        100000 +

        Math.random() *

        900000

    ).toString();



}









/*
==========================================
REGISTER USER
CREATE ACCOUNT
==========================================
*/


export async function registerUser(

    req,

    res

){



    try{



        const {

            firstName,

            lastName,

            email,

            password,

            confirmPassword


        } = req.body;








        if(

            !firstName ||

            !lastName ||

            !email ||

            !password ||

            !confirmPassword

        ){



            return res.status(400).json({



                success:false,


                error:

                "Preencha todos os campos."



            });



        }







        if(!validator.isEmail(email)){



            return res.status(400).json({



                success:false,


                error:

                "Email inválido."



            });



        }

        if(password !== confirmPassword){



            return res.status(400).json({



                success:false,


                error:

                "As palavras-passe não coincidem."



            });



        }









        if(!validatePassword(password)){



            return res.status(400).json({



                success:false,


                error:

                "A palavra-passe deve ter no mínimo 8 caracteres, uma letra maiúscula, um número e um símbolo."



            });



        }









        const existingUser =

        await User.findOne({



            email:

            email.toLowerCase()



        });









        if(existingUser){



            return res.status(400).json({



                success:false,


                error:

                "Este email já está registado."



            });



        }









        const hashedPassword =

        await bcrypt.hash(

            password,

            12

        );









        const verificationCode =

        generateCode();









        const newUser =

        await User.create({



            firstName,


            lastName,



            email:

            email.toLowerCase(),



            password:

            hashedPassword,



            emailVerified:false,



            verificationCode,



            verificationExpires:

            new Date(

                Date.now() +

                15 *

                60 *

                1000

            ),



            plan:"free"



        });









        await emailservice.sendVerificationCode(



            newUser.email,



            verificationCode,



            firstName



        );









        return res.json({



            success:true,



            message:

            "Conta criada. Verifique o código enviado para o seu email.",



            userId:

            newUser._id



        });



    }

    catch(error){



        console.error(

            "REGISTER ERROR:",

            error

        );



        return res.status(500).json({



            success:false,


            error:

            "Erro ao criar conta."



        });



    }



}

/*
==========================================
VERIFY EMAIL
CONFIRM ACCOUNT
==========================================
*/


export async function verifyEmail(

    req,

    res

){



    try{



        const {

            email,

            code


        } = req.body;








        const user =

        await User.findOne({



            email:

            email.toLowerCase()



        });









        if(!user){



            return res.status(404).json({



                success:false,


                error:

                "Utilizador não encontrado."



            });



        }









        if(user.emailVerified){



            return res.json({



                success:true,


                message:

                "Email já confirmado."



            });



        }









        if(

            user.verificationCode !== code

        ){



            return res.status(400).json({



                success:false,


                error:

                "Código inválido."



            });



        }









        if(

            user.verificationExpires < new Date()

        ){



            return res.status(400).json({



                success:false,


                error:

                "Código expirado."



            });



        }









        user.emailVerified = true;


        user.verificationCode = null;


        user.verificationExpires = null;



        await user.save();









        await emailservice.sendWelcomeEmail(



            user.email,



            user.firstName



        );









        return res.json({



            success:true,


            message:

            "Email confirmado com sucesso."



        });



    }

    catch(error){



        console.error(

            "VERIFY ERROR:",

            error

        );



        return res.status(500).json({



            success:false,


            error:

            "Erro ao confirmar email."



        });



    }



}









/*
==========================================
CREATE SESSION
==========================================
*/


async function createSession(user, req){



    const token =

    jwt.sign(



        {

            id:

            user._id.toString(),


            email:

            user.email



        },


        JWT_SECRET,


        {

            expiresIn:

            "30d"

        }



    );









    await Session.create({



        userId:

        user._id,



        token,



        device:

        req.headers["user-agent"] || "unknown",



        ip:

        req.ip,



        expiresAt:

        new Date(

            Date.now() +

            30 *

            24 *

            60 *

            60 *

            1000

        )



    });









    return token;



}/*
==========================================
LOGIN USER
AUTHENTICATE ACCOUNT
==========================================
*/


export async function loginUser(

    req,

    res

){


    try{


        const {

            email,

            password


        } = req.body;







        const user =

        await User.findOne({

            email:

            email.toLowerCase()

        });









        if(!user){


            return res.status(404).json({


                success:false,


                error:

                "Email ou palavra-passe incorretos."


            });


        }









        if(!user.emailVerified){


            return res.status(403).json({


                success:false,


                error:

                "Confirme o seu email antes de entrar."


            });


        }









        const passwordMatch =

        await bcrypt.compare(

            password,

            user.password

        );









        if(!passwordMatch){


            return res.status(401).json({


                success:false,


                error:

                "Email ou palavra-passe incorretos."


            });


        }









        const token =

        await createSession(

            user,

            req

        );









        user.lastLogin = new Date();


        await user.save();









        return res.json({


            success:true,


            token,


            user:{


                id:

                user._id,


                firstName:

                user.firstName,


                lastName:

                user.lastName,


                email:

                user.email,


                photo:

                user.photo,


                plan:

                user.plan



            }



        });



    }

    catch(error){


        console.error(

            "LOGIN ERROR:",

            error

        );



        return res.status(500).json({


            success:false,


            error:

            "Erro ao realizar login."


        });



    }



}









/*
==========================================
GET CURRENT USER
RESTORE SESSION
==========================================
*/


export async function getCurrentUser(

    req,

    res

){


    try{


        const user =

        await User.findById(

            req.user.id

        )

        .select(

            "-password -verificationCode"

        );









        if(!user){


            return res.status(404).json({


                success:false,


                error:

                "Utilizador não encontrado."


            });


        }









        return res.json({


            success:true,


            user



        });



    }

    catch(error){


        return res.status(500).json({


            success:false,


            error:

            error.message


        });


    }


}









/*
==========================================
LOGOUT USER
REMOVE SESSION
==========================================
*/


export async function logoutUser(

    req,

    res

){


    try{


        const token =

        req.headers.authorization

        ?.replace(

            "Bearer ",

            ""

        );









        if(token){


            await Session.deleteOne({


                token


            });


        }









        return res.json({


            success:true,


            message:

            "Sessão encerrada."


        });



    }

    catch(error){


        return res.status(500).json({


            success:false,


            error:

            "Erro ao terminar sessão."


        });


    }


}









/*
==========================================
EXPORT CONTROLLER
==========================================
*/


export default {


    registerUser,

    verifyEmail,

    loginUser,

    getCurrentUser,

    logoutUser

};
