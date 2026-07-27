const messages = document.getElementById("messages");
const prompt = document.getElementById("prompt");
const send = document.getElementById("send");
const newChat = document.getElementById("newChat");

function addMessage(text, type = "assistant") {

    const row = document.createElement("div");
    row.className = type;

    if (type === "assistant") {

        row.innerHTML = `
            <div class="avatar">🐝</div>
            <div class="bubble">${marked.parse(text)}</div>
        `;

    } else {

        row.innerHTML = `
            <div class="bubble">${text}</div>
        `;

    }

    messages.appendChild(row);

    messages.scrollTop = messages.scrollHeight;

}

async function sendMessage() {

    const text = prompt.value.trim();

    if (!text) return;

    addMessage(text, "user");

    prompt.value = "";

    try {

        const response = await fetch("/gerar-gratis", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                prompt: text,
                modo: "general"

            })

        });

        const data = await response.json();

        if (data.sucesso) {

            addMessage(data.resposta);

        } else {

            addMessage("❌ " + data.erro);

        }

    } catch (erro) {

        addMessage("❌ Não foi possível comunicar com o servidor.");

        console.error(erro);

    }

}

send.addEventListener("click", sendMessage);

prompt.addEventListener("keydown", function(e){

    if(e.key==="Enter" && !e.shiftKey){

        e.preventDefault();

        sendMessage();

    }

});

newChat.addEventListener("click", ()=>{

    messages.innerHTML = `
        <div class="assistant">
            <div class="avatar">🐝</div>
            <div class="bubble">
                Olá! Sou a Honey AI.<br><br>
                Como posso ajudar hoje?
            </div>
        </div>
    `;

});
