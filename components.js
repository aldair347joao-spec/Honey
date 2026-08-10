/*
==========================================
HONEY IA
COMPONENTS MODULE V3.0
Dynamic Agent Studio UI
Compatible with Honey IA Core V10
==========================================
*/


import agents from "./agents.js";

import agentstudio from "./agentstudio.js";



/*
==========================================================
COMPONENTS
==========================================================
*/


export const Components = {



    /*
    ======================================================
    WORKSPACES
    ======================================================
    */


    renderWorkspaces(container){


        if(!container)

        return;



        container.innerHTML = `

            <div class="panel-page">

                <h2>📂 Workspaces Ativos</h2>

                <p class="muted">
                    Ambientes isolados com memória e contexto próprio.
                </p>

                <div class="cards-grid">

                    <div class="honey-card">

                        <h3>📌 Geral & Desenvolvimento</h3>

                        <p>
                            Ambiente principal da Honey IA.
                        </p>

                        <span class="status-online">
                            ● Ativo
                        </span>

                    </div>


                    <div class="honey-card">

                        <h3>📊 Financeiro</h3>

                        <p>
                            Análise de dados, Excel e documentos.
                        </p>

                        <span>
                            5 conversas
                        </span>

                    </div>


                    <div class="honey-card">

                        <h3>🎨 Design Studio</h3>

                        <p>
                            UI, UX e criação visual.
                        </p>

                        <span>
                            Preview Live
                        </span>

                    </div>

                </div>

            </div>

        `;

    },



    /*
    ======================================================
    MEMÓRIA
    ======================================================
    */


    renderMemories(container){


        if(!container)

        return;



        container.innerHTML = `

            <div class="panel-page">

                <h2>🧠 Memória Inteligente</h2>

                <p class="muted">
                    Contextos aprendidos pela Honey IA.
                </p>


                <div class="honey-card">

                    <h3>
                        Preferências do Sistema
                    </h3>

                    <p>
                        Arquitetura modular, ES Modules,
                        Node.js moderno.
                    </p>

                </div>


                <div class="honey-card">

                    <h3>
                        Contexto do Utilizador
                    </h3>

                    <p>
                        Projetos, conversas e preferências guardadas.
                    </p>

                </div>

            </div>

        `;

    },



    /*
    ======================================================
    AGENTES DINÂMICOS
    ======================================================
    */


    renderAgents(container){


        if(!container)

        return;



        /*
        --------------------------------------------------
        O módulo agents pode expor getAll()
        ou diretamente um array.
        --------------------------------------------------
        */


        let agentList = [];



        try{


            if(

                agents &&

                typeof agents.getAll ===

                "function"

            ){


                agentList =

                    agents.getAll() || [];


            }

            else if(

                Array.isArray(

                    agents

                )

            ){


                agentList =

                    agents;


            }


        }

        catch(error){


            console.error(

                "Components agents error:",

                error

            );


            agentList = [];


        }



        /*
        --------------------------------------------------
        RENDER
        --------------------------------------------------
        */


        container.innerHTML = `

            <div class="panel-page">

                <h2>🤖 Honey Agent Studio</h2>

                <p class="muted">
                    Escolha um especialista para trabalhar.
                </p>


                <div class="agents-grid">

                    ${
                        agentList.length

                        ?

                        agentList.map(

                            agent => `

                                <div
                                    class="agent-card"
                                    data-agent-id="${this.escapeHTML(
                                        agent.id
                                    )}"
                                >

                                    <div class="agent-header">

                                        <div class="agent-avatar">

                                            ${
                                                agent.emoji ||
                                                "🐝"
                                            }

                                        </div>


                                        <div>

                                            <h3>

                                                ${
                                                    this.escapeHTML(
                                                        agent.name ||
                                                        "Agente Honey IA"
                                                    )
                                                }

                                            </h3>


                                            <span class="status-online">

                                                ● Online

                                            </span>

                                        </div>

                                    </div>


                                    <p>

                                        ${
                                            this.escapeHTML(
                                                agent.description ||
                                                "Agente inteligente Honey IA."
                                            )
                                        }

                                    </p>


                                    <button

                                        type="button"

                                        class="activate-agent-btn"

                                        data-agent="${this.escapeHTML(
                                            agent.id
                                        )}"

                                    >

                                        Ativar Agente

                                    </button>

                                </div>

                            `

                        ).join("")

                        :

                        `

                            <div class="empty-state">

                                <div class="empty-icon">

                                    🤖

                                </div>

                                <h3>

                                    Nenhum agente disponível

                                </h3>

                                <p>

                                    Os agentes Honey IA serão carregados
                                    quando o módulo estiver disponível.

                                </p>

                            </div>

                        `

                    }

                </div>

            </div>

        `;



        /*
        --------------------------------------------------
        EVENTOS DOS AGENTES
        --------------------------------------------------
        */


        container

            .querySelectorAll(

                ".activate-agent-btn"

            )

            .forEach(

                button => {


                    button.addEventListener(

                        "click",

                        () => {


                            const id =

                                button.dataset.agent;



                            if(!id)

                            return;



                            try{


                                const selectedAgent =

                                    agentstudio &&

                                    typeof agentstudio.setAgent ===

                                    "function"

                                    ?

                                    agentstudio.setAgent(

                                        id

                                    )

                                    :

                                    null;



                                if(selectedAgent){


                                    button.innerText =

                                        "✓ Ativo";



                                    container

                                        .querySelectorAll(

                                            ".activate-agent-btn"

                                        )

                                        .forEach(

                                            otherButton => {


                                                if(

                                                    otherButton !==

                                                    button

                                                ){


                                                    otherButton.innerText =

                                                        "Ativar Agente";


                                                }


                                            }

                                        );



                                    document.dispatchEvent(

                                        new CustomEvent(

                                            "agent-selected",

                                            {

                                                detail:

                                                    selectedAgent

                                            }

                                        )

                                    );


                                }


                            }

                            catch(error){


                                console.error(

                                    "Agent activation error:",

                                    error

                                );


                            }


                        }

                    );


                }

            );


    },



    /*
    ======================================================
    TOOLS
    ======================================================
    */


    renderTools(container){


        if(!container)

        return;



        container.innerHTML = `

            <div class="panel-page">

                <h2>
                    🧩 Ferramentas
                </h2>


                <div class="cards-grid">

                    <div class="honey-card">

                        <h3>
                            🌐 Web
                        </h3>

                        <p>
                            Pesquisa e análise.
                        </p>

                    </div>


                    <div class="honey-card">

                        <h3>
                            💻 Code
                        </h3>

                        <p>
                            Programação e automação.
                        </p>

                    </div>

                </div>

            </div>

        `;

    },



    /*
    ======================================================
    ANALYTICS
    ======================================================
    */


    renderAnalytics(container){


        if(!container)

        return;



        container.innerHTML = `

            <div class="panel-page">

                <h2>
                    📊 Analytics
                </h2>


                <div class="cards-grid">

                    <div class="honey-card">

                        <h3>
                            420ms
                        </h3>

                        <p>
                            Tempo médio resposta
                        </p>

                    </div>


                    <div class="honey-card">

                        <h3>
                            99.8%
                        </h3>

                        <p>
                            Sucesso API
                        </p>

                    </div>

                </div>

            </div>

        `;

    },



    /*
    ======================================================
    SISTEMA
    ======================================================
    */


    renderSystem(container){


        if(!container)

        return;



        container.innerHTML = `

            <div class="panel-page">

                <h2>
                    ⚙ Sistema
                </h2>


                <div class="honey-card">

                    <p>
                        Honey IA OS V10
                    </p>

                    <p>
                        Sistema operacional de agentes inteligentes.
                    </p>

                </div>

            </div>

        `;

    },



    /*
    ======================================================
    ESCAPE HTML
    ======================================================
    */


    escapeHTML(value){


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

};



/*
==========================================================
BACKWARD COMPATIBILITY
==========================================================
*/


export const components =

    Components;



/*
==========================================================
DEFAULT EXPORT
==========================================================
*/


export default Components;
