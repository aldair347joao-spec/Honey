/*
==========================================
HONEY IA
INDEX SERVER
Enterprise Backend V6
Multi-Agent + Live Mode
==========================================
*/

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import rateLimit from "express-rate-limit";

import liveRoute from "./liveRoute.js";
import Orchestrator from "./orchestrator.js";
import { connectDatabase } from "./database.js";
import Kernel from "./kernel.js";
import { saveMessage } from "./chat.js";

dotenv.config();


// ==========================================
// DATABASE INITIALIZATION
// ==========================================

try {

    await connectDatabase();

    Kernel.register(
        "Database",
        "MongoDB"
    );

}

catch(err){

    console.warn(
        "⚠️ MongoDB indisponível. Sistema continuará em memória.",
        err.message
    );

}


// ==========================================
// KERNEL MODULES
// ==========================================

Kernel.register(
    "AI",
    "Groq"
);


Kernel.register(
    "Server",
    "Express"
);



// ==========================================
// EXPRESS SERVER
// ==========================================

const app = express();

const port = process.env.PORT || 3000;



app.use(
    express.json({
        limit:"20mb"
    })
);


app.use(
    express.urlencoded({
        limit:"20mb",
        extended:true
    })
);


app.use(cors());


app.use(express.static("."));



// ==========================================
// LIVE ROUTE
// ==========================================

app.use(
    "/api",
    liveRoute
);



// ==========================================
// GROQ
// ==========================================

const groq = new Groq({

    apiKey:
    process.env.GROQ_API_KEY

});



// ==========================================
// RATE LIMIT
// ==========================================

const apiLimiter = rateLimit({

    windowMs:
    60 * 1000,


    max:
    30,


    standardHeaders:true,


    legacyHeaders:false,


    message:{

        sucesso:false,

        erro:
        "A Honey IA está a receber muitos pedidos. Aguarde alguns segundos. 🐝"

    }

});



app.use(
    "/gerar-gratis",
    apiLimiter
);



// ==========================================
// MAIN AI ROUTE
// ==========================================

app.post(
"/gerar-gratis",
async(req,res)=>{


try{


let {

    prompt,

    imagem,

    anexoBase64,

    mimeType,

    userId="guest_user",

    agent="general",

    mode="chat"


}=req.body;



const base64Content =
anexoBase64 || imagem;



if(
!prompt &&
!base64Content
){


return res.status(400).json({

    sucesso:false,

    erro:
    "Envie uma mensagem ou anexo para análise."

});


}



// ==========================================
// MIME DETECTION
// ==========================================


if(
base64Content &&
!mimeType
){


const matches =
base64Content.match(
/^data:(.+);base64,/
);



if(matches){

    mimeType =
    matches[1];

}

else{

    mimeType =
    "image/png";

}


}



const rawBase64 =
base64Content
?
base64Content.replace(
/^data:.+;base64,/,
""
)
:
null;



const user={

    id:userId,

    name:"Utilizador",

    language:"pt-PT",

    preferences:{}

};



// ==========================================
// ORCHESTRATOR
// ==========================================


let orchestratorResult=null;


let systemPrompt =
"Você é a Honey IA. Responda em Português de forma profissional.";



try{


if(
Orchestrator &&
typeof Orchestrator.process==="function"
){


orchestratorResult =
await Orchestrator.process({

    userId:user.id,

    message:
    prompt ||
    "Analisa o conteúdo enviado.",

    user,

    agent,

    mode

});



systemPrompt =
orchestratorResult.prompt ||
systemPrompt;


}


}

catch(err){


console.warn(

"Falha no Orchestrator:",
err.message

);


}

// ==========================================
// GROQ MESSAGE BUILDER
// ==========================================

const messages = [

    {
        role:"system",
        content:systemPrompt
    }

];



let selectedModel =
"llama-3.3-70b-versatile";



// ==========================================
// IMAGE / DOCUMENT HANDLING
// ==========================================


if(rawBase64){


const isImage =
mimeType &&
(
mimeType.startsWith("image/") ||
base64Content.startsWith("data:image/")
);



if(isImage){


selectedModel =
"llama-3.2-11b-vision-preview";



const imageUrl =
base64Content.startsWith("data:")
?
base64Content
:
`data:${mimeType};base64,${rawBase64}`;



messages.push({

    role:"user",

    content:[

        {
            type:"text",

            text:
            prompt ||
            "Analisa esta imagem em detalhe."
        },


        {
            type:"image_url",

            image_url:{
                url:imageUrl
            }

        }

    ]

});


}

else{


let textoDocumento="";


try{


textoDocumento =
Buffer
.from(
rawBase64,
"base64"
)
.toString("utf-8");


}

catch(e){


textoDocumento =
"[Não foi possível extrair o conteúdo do ficheiro.]";


}



messages.push({

role:"user",

content:

`
[Conteúdo do ficheiro]

${textoDocumento}


[Instrução]

${prompt || "Analisa este ficheiro."}

`

});


}


}

else{


messages.push({

    role:"user",

    content:prompt

});


}




// ==========================================
// GROQ EXECUTION
// ==========================================


const completion =
await groq.chat.completions.create({

    messages,

    model:selectedModel,

    temperature:0.7,

    max_tokens:4096

});



const resposta =
completion
.choices[0]
?.message
?.content
||
"Não foi possível gerar resposta.";



// ==========================================
// SAVE CHAT HISTORY
// ==========================================


try{


if(
typeof saveMessage==="function"
){


if(prompt){

await saveMessage(
user.id,
"user",
prompt
);

}



await saveMessage(
user.id,
"assistant",
resposta
);



}


}

catch(dbErr){


console.warn(

"Erro ao guardar histórico:",
dbErr.message

);


}




// ==========================================
// RESPONSE
// ==========================================


return res.json({

    sucesso:true,

    resposta,

    agent:
    orchestratorResult?.agentId ||
    agent,


    mode,


    timestamp:
    Date.now()

});





}

catch(error){



console.error(
"❌ ERRO HONEY IA:",
error
);



if(error.status===429){


return res.status(429).json({

    sucesso:false,

    erro:
    "Limite da IA atingido. Aguarde alguns instantes. 🐝"

});


}



return res.status(500).json({

    sucesso:false,

    erro:
    `Erro interno: ${
        error.message ||
        "Falha desconhecida"
    }`

});



}


});



// ==========================================
// START SERVER
// ==========================================


app.listen(
port,
()=>{

console.log(
`🐝 Honey IA Enterprise V6 online na porta ${port}`
);

});
