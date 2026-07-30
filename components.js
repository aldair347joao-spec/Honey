/**
 * ==========================================================
 * HONEY IA OS
 * COMPONENTS MODULE V3.0
 * Dynamic Enterprise UI Components
 * ==========================================================
 */

export const Components = {


    /*
    ==========================================================
    WORKSPACES
    ==========================================================
    */

    renderWorkspaces(container){


        container.innerHTML = `

        <section class="studio-page">


            <header class="page-header">

                <div>

                    <h2>
                        📂 Workspaces
                    </h2>

                    <p>
                        Ambientes isolados com memória,
                        contexto e projetos próprios.
                    </p>

                </div>


                <button class="primary-btn">

                    + Novo Workspace

                </button>


            </header>





            <div class="workspace-grid">



                ${this.workspaceCard(
                    "🐝",
                    "Honey General",
                    "Ambiente principal da Honey IA para tarefas gerais e conversação.",
                    "Ativo agora"
                )}




                ${this.workspaceCard(
                    "💻",
                    "Development Lab",
                    "Programação, APIs, Node.js, React e arquitetura de software.",
                    "14 conversas"
                )}






                ${this.workspaceCard(
                    "📊",
                    "Business Analytics",
                    "Dados, Excel, relatórios financeiros e documentos.",
                    "Atualizado recentemente"
                )}






                ${this.workspaceCard(
                    "🎨",
                    "Creative Studio",
                    "Design, imagens, UI/UX e criação visual.",
                    "8 projetos"
                )}



            </div>


        </section>

        `;


    },





    workspaceCard(icon,title,description,status){


        return `

        <article class="workspace-card">


            <div class="workspace-icon">

                ${icon}

            </div>



            <h3>

                ${title}

            </h3>



            <p>

                ${description}

            </p>



            <span class="workspace-status">

                ${status}

            </span>



        </article>

        `;


    },






    /*
    ==========================================================
    MEMORY CENTER
    ==========================================================
    */

    renderMemories(container){


        container.innerHTML = `


        <section class="studio-page">


            <header class="page-header">


                <div>


                    <h2>
                        🧠 Memória Inteligente
                    </h2>


                    <p>
                        Contextos aprendidos e informações
                        persistentes da Honey IA.
                    </p>


                </div>


            </header>





            <div class="memory-list">



                ${this.memoryCard(
                    "Código",
                    "Preferência por arquitetura modular ES Modules e Node.js moderno."
                )}





                ${this.memoryCard(
                    "Sistema",
                    "Projeto Honey IA utiliza agentes especializados e orquestração."
                )}





                ${this.memoryCard(
                    "Workspace",
                    "Contextos separados por projeto para melhor organização."
                )}



            </div>



        </section>



        `;


    },






    memoryCard(title,text){


        return `

        <article class="memory-card">


            <div>

                <small>
                    ${title}
                </small>


                <p>
                    ${text}
                </p>


            </div>



            <button class="danger-btn">

                Remover

            </button>



        </article>

        `;


    },    /*
    ==========================================================
    AGENTS STUDIO
    Integração com AgentEngine V3.0
    ==========================================================
    */


    renderAgents(container){


        import("./agents.js")
        .then(({default:Agents})=>{


            const agents =
            Agents.getAll();



            container.innerHTML = `


            <section class="studio-page">


                <header class="page-header">


                    <div>


                        <h2>
                            🤖 Honey Agents Studio
                        </h2>


                        <p>
                            Especialistas IA disponíveis
                            no Kernel Honey.
                        </p>


                    </div>



                </header>





                <div class="agents-grid">



                ${
                    agents.map(agent=>`


                    <article class="agent-card"
                    data-agent="${agent.id}">



                        <div class="agent-top">


                            <span class="agent-avatar">

                                ${agent.emoji || "🐝"}

                            </span>



                            <div>


                                <h3>

                                    ${agent.name}

                                </h3>


                                <span class="agent-online">

                                    ● Online

                                </span>


                            </div>



                        </div>





                        <p>

                            ${agent.description}

                        </p>





                        <button
                        class="agent-open-btn"
                        data-id="${agent.id}">


                            Abrir Studio


                        </button>





                    </article>



                    `).join("")
                }



                </div>



            </section>


            `;





            this.bindAgentEvents(container);



        });



    },








    bindAgentEvents(container){


        import("./agentStudio.js")
        .then(({default:AgentStudio})=>{


            import("./liveClient.js")
            .then(({default:LiveClient})=>{





                container
                .querySelectorAll(
                    ".agent-open-btn"
                )
                .forEach(button=>{


                    button.addEventListener(
                        "click",
                        async()=>{


                            const id =
                            button.dataset.id;



                            AgentStudio.setAgent(
                                id
                            );




                            await LiveClient.changeAgent(
                                id
                            );





                            container
                            .querySelectorAll(
                                ".agent-card"
                            )
                            .forEach(card=>{

                                card.classList.remove(
                                    "active"
                                );

                            });





                            button
                            .closest(
                                ".agent-card"
                            )
                            .classList.add(
                                "active"
                            );




                            document.dispatchEvent(

                                new CustomEvent(
                                    "agent-selected",
                                    {

                                        detail:{
                                            id
                                        }

                                    }

                                )

                            );





                        }

                    );


                });



            });



        });



    },    /*
    ==========================================================
    TOOLS CENTER
    ==========================================================
    */

    renderTools(container){


        container.innerHTML = `


        <section class="studio-page">


            <header class="page-header">

                <div>

                    <h2>
                        🧩 Tools Center
                    </h2>


                    <p>
                        Ferramentas disponíveis para os agentes.
                    </p>

                </div>


            </header>





            <div class="tools-grid">



                <article class="tool-card">

                    <h3>
                        🌐 Web Intelligence
                    </h3>

                    <p>
                        Pesquisa e análise de informações externas.
                    </p>

                </article>





                <article class="tool-card">

                    <h3>
                        📄 Document Engine
                    </h3>

                    <p>
                        Processamento de documentos,
                        PDFs e ficheiros.
                    </p>

                </article>





                <article class="tool-card">

                    <h3>
                        👁️ Vision Engine
                    </h3>

                    <p>
                        Análise de imagens e conteúdos visuais.
                    </p>

                </article>



            </div>



        </section>


        `;


    },







    /*
    ==========================================================
    ANALYTICS
    ==========================================================
    */


    renderAnalytics(container){


        container.innerHTML = `


        <section class="studio-page">


            <header class="page-header">


                <div>


                    <h2>
                        📊 Analytics Kernel
                    </h2>


                    <p>
                        Estado operacional da Honey IA.
                    </p>


                </div>


            </header>






            <div class="analytics-grid">



                <div class="analytics-card">


                    <span>
                        Agentes Online
                    </span>


                    <strong>
                        14
                    </strong>


                </div>





                <div class="analytics-card">


                    <span>
                        Sistema
                    </span>


                    <strong>
                        ONLINE
                    </strong>


                </div>





                <div class="analytics-card">


                    <span>
                        Kernel
                    </span>


                    <strong>
                        V5
                    </strong>


                </div>



            </div>



        </section>



        `;


    },








    /*
    ==========================================================
    SYSTEM SETTINGS
    ==========================================================
    */


    renderSystem(container){


        container.innerHTML = `


        <section class="studio-page">


            <header class="page-header">


                <div>


                    <h2>
                        ⚙ Sistema
                    </h2>


                    <p>
                        Configurações da plataforma.
                    </p>


                </div>


            </header>






            <div class="system-card">



                <label>

                    Backend Endpoint

                </label>



                <input

                readonly

                value="/gerar-gratis"

                />





                <label>

                    IA Engine

                </label>




                <input

                readonly

                value="Groq + Honey Orchestrator"

                />





            </div>



        </section>


        `;


    }





};
