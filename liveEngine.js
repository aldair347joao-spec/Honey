/*
==========================================
HONEY IA
Live Voice Engine
Versão 1.0
==========================================
*/

class LiveEngine {

    constructor(){

        this.recognition = null;

        this.isListening = false;

        this.voiceEnabled = false;

        this.init();

    }


    init(){

        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;


        if(!SpeechRecognition){

            console.warn(
                "Reconhecimento de voz não suportado."
            );

            return;

        }


        this.recognition = new SpeechRecognition();


        this.recognition.lang = "pt-PT";

        this.recognition.continuous = false;

        this.recognition.interimResults = false;



        this.recognition.onstart = ()=>{

            this.isListening = true;

            this.emitStatus("listening");

        };


        this.recognition.onend = ()=>{

            this.isListening = false;

            this.emitStatus("idle");

        };


        this.recognition.onerror = (error)=>{

            console.error(
                "Erro de voz:",
                error
            );

            this.emitStatus("error");

        };

    }



    start(callback){

        if(!this.recognition){

            return false;

        }


        this.recognition.onresult = (event)=>{

            const text =
            event.results[0][0].transcript;


            if(callback){

                callback(text);

            }

        };


        this.recognition.start();

    }



    stop(){

        if(this.recognition){

            this.recognition.stop();

        }

    }



    speak(text){

        if(!window.speechSynthesis){

            return;

        }


        const voice =
        new SpeechSynthesisUtterance(text);


        voice.lang = "pt-PT";

        voice.rate = 1;

        voice.pitch = 1;


        speechSynthesis.speak(voice);

    }



    emitStatus(status){

        document.dispatchEvent(

            new CustomEvent(
                "live-status",
                {
                    detail:{
                        status
                    }
                }
            )

        );

    }

}


export default new LiveEngine();
