/*
==========================================
HONEY IA OS
AUTH SERVICE
Business Authentication Logic
V1.0
==========================================
*/

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import { User } from "./models.js";





const JWT_SECRET =

process.env.JWT_SECRET || "honey-secret-key";









class AuthService {





    async register(data){



        const {

            nome,

            apelido,

            email,

            password

        } = data;







        if(!nome || !apelido || !email || !password){

            throw new Error(

                "Preencha todos os campos."

            );

        }









        if(!validator.isEmail(email)){


            throw new Error(

                "Email inválido."

            );


        }









        const strongPassword =

        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;









        if(!strongPassword.test(password)){


            throw new Error(

                "A palavra-passe deve ter mínimo 8 caracteres, maiúscula, minúscula, número e símbolo."

            );


        }









        const exists =

        await User.findOne({

            email

        });









        if(exists){


            throw new Error(

                "Este email já está registado."

            );


        }









        const encryptedPassword =

        await bcrypt.hash(

            password,

            12

        );









        const code =

        Math.floor(

            100000 +

            Math.random() *

            900000

        ).toString();









        const user =

        await User.create({



            nome,


            apelido,


            email,


            password:

            encryptedPassword,



            codigoVerificacao:

            code,



            codigoExpira:

            new Date(

                Date.now()+

                15*60*1000

            )



        });









        // Aqui futuramente ligaremos ao serviço real de email


        console.log(

            "Código Honey IA:",

            code

        );









        return {


            message:

            "Conta criada. Verifique o email.",



            userId:

            user._id



        };



    }













    async verifyEmail(email,code){



        const user =

        await User.findOne({

            email

        });









        if(!user){


            throw new Error(

                "Utilizador não encontrado."

            );


        }









        if(

            user.codigoVerificacao !== code

        ){


            throw new Error(

                "Código incorreto."

            );


        }









        if(

            user.codigoExpira < new Date()

        ){


            throw new Error(

                "Código expirado."

            );


        }









        user.emailVerificado = true;

        user.codigoVerificacao = null;

        user.codigoExpira = null;



        await user.save();









        return {


            message:

            "Email confirmado com sucesso."



        };



    }












    async login(email,password){



        const user =

        await User.findOne({

            email

        });









        if(!user){


            throw new Error(

                "Conta não encontrada."

            );


        }









        if(!user.emailVerificado){


            throw new Error(

                "Confirme o seu email primeiro."

            );


        }









        const valid =

        await bcrypt.compare(

            password,

            user.password

        );









        if(!valid){


            throw new Error(

                "Palavra-passe incorreta."

            );


        }









        user.ultimoLogin =

        new Date();



        await user.save();









        const token =

        jwt.sign(

            {

                id:user._id,

                email:user.email

            },

            JWT_SECRET,

            {

                expiresIn:"30d"

            }

        );









        return {


            token,


            user:{


                id:user._id,


                nome:user.nome,


                apelido:user.apelido,


                email:user.email,


                plano:user.plano,


                avatar:user.avatar


            }



        };



    }












    async getUser(id){



        return await User.findById(id)

        .select(

            "-password -codigoVerificacao"

        );



    }









}


export default new AuthService();
