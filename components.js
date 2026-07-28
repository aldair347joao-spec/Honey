export function createLayout() {
    return `
    <div id="app">

        <aside class="sidebar">

            <div class="logo">
                <span class="logo-icon">🐝</span>
                <div>
                    <h2>Honey AI</h2>
                    <small>Enterprise</small>
                </div>
            </div>

            <nav class="sidebar-menu">

                <button class="menu-item active" data-page="chat">
                    💬 <span>Chat</span>
                </button>

                <button class="menu-item" data-page="memory">
                    🧠 <span>Memória</span>
                </button>

                <button class="menu-item" data-page="agents">
                    🤖 <span>Agentes</span>
                </button>

                <button class="menu-item" data-page="tools">
                    🧩 <span>Ferramentas</span>
                </button>

                <button class="menu-item" data-page="projects">
                    📂 <span>Projetos</span>
                </button>

                <button class="menu-item" data-page="settings">
                    ⚙️ <span>Configurações</span>
                </button>

            </nav>

        </aside>

        <main class="workspace">

            <header class="topbar">

                <h1>Honey AI</h1>

                <div class="topbar-actions">

                    <button id="newChatBtn">
                        Novo Chat
                    </button>

                </div>

            </header>

            <section id="chatArea" class="chat-area">

            </section>

            <footer class="prompt-bar">

                <input
                    id="promptInput"
                    type="text"
                    placeholder="Escreva uma mensagem..."
                >

                <button id="sendBtn">
                    Enviar
                </button>

            </footer>

        </main>

    </div>
    `;
}
