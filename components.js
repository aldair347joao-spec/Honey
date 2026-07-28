/**
 * Honey AI OS — Components Module
 * Contém a lógica de renderização de componentes e telas dinâmicas do Sistema Operacional.
 */

export const Components = {
    /**
     * Renderiza o Painel de Workspaces (Projetos isolados com contexto e memória próprios)
     */
    renderWorkspaces(container) {
        container.innerHTML = `
            <div style="padding: 30px; height: 100%; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 700;">📂 Workspaces Ativos</h2>
                        <p style="color: var(--text-muted); font-size: 0.88rem;">Gerencie ambientes isolados de desenvolvimento e contextos de memória.</p>
                    </div>
                    <button class="action-btn-sm" style="background: var(--accent-yellow); color: var(--text-dark); border: none; font-weight: 700; padding: 8px 16px;">
                        + Novo Workspace
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
                    <div style="background: var(--bg-panel); border: 1px solid var(--border-highlight); padding: 20px; border-radius: var(--radius-lg);">
                        <div style="font-size: 1.5rem; margin-bottom: 12px;">📌</div>
                        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 6px;">Geral & Desenvolvimento</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 16px;">Ambiente padrão para tarefas gerais, codificação Node.js e orquestração de scripts.</p>
                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--accent-yellow);">
                            <span>14 Conversas</span>
                            <span>Ativo Agora</span>
                        </div>
                    </div>

                    <div style="background: var(--bg-panel); border: 1px solid var(--border-color); padding: 20px; border-radius: var(--radius-lg); opacity: 0.8;">
                        <div style="font-size: 1.5rem; margin-bottom: 12px;">📊</div>
                        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 6px;">Análise Financeira & Dados</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 16px;">Workspace dedicado para leitura de PDFs, planilhas Excel e geração de gráficos.</p>
                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted);">
                            <span>5 Conversas</span>
                            <span>Modificado há 2 dias</span>
                        </div>
                    </div>

                    <div style="background: var(--bg-panel); border: 1px solid var(--border-color); padding: 20px; border-radius: var(--radius-lg); opacity: 0.8;">
                        <div style="font-size: 1.5rem; margin-bottom: 12px;">🎨</div>
                        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 6px;">UI/UX & Frontend Prototyping</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 16px;">Ambiente com visualização Split Live Preview ativada para interfaces HTML/CSS.</p>
                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted);">
                            <span>8 Conversas</span>
                            <span>Modificado ontem</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza o Painel de Memória Inteligente
     */
    renderMemories(container) {
        container.innerHTML = `
            <div style="padding: 30px; height: 100%; overflow-y: auto;">
                <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 6px;">🧠 Central de Memória Contextual</h2>
                <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 24px;">Fatos, preferências e contextos persistidos aprendidos automaticamente pelo sistema.</p>

                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="background: var(--bg-panel); border: 1px solid var(--border-color); padding: 16px; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="font-size: 0.7rem; color: var(--accent-yellow); font-weight: 700; text-transform: uppercase;">Preferência de Código</span>
                            <p style="font-size: 0.9rem; margin-top: 4px;">Utilizar sempre Node.js moderno (ES Modules) e arquitetura modular isolada.</p>
                        </div>
                        <button class="action-btn-sm" style="color: #ef4444;">Remover</button>
                    </div>

                    <div style="background: var(--bg-panel); border: 1px solid var(--border-color); padding: 16px; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="font-size: 0.7rem; color: var(--accent-yellow); font-weight: 700; text-transform: uppercase;">Identidade do Usuário</span>
                            <p style="font-size: 0.9rem; margin-top: 4px;">Desenvolvedor de software focado em aplicações e plataformas de Inteligência Artificial.</p>
                        </div>
                        <button class="action-btn-sm" style="color: #ef4444;">Remover</button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza o Painel de Agentes Especialistas
     */
    renderAgents(container) {
        container.innerHTML = `
            <div style="padding: 30px; height: 100%; overflow-y: auto;">
                <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 6px;">🤖 Agentes do Kernel Honey</h2>
                <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 24px;">Especialistas acionados automaticamente dependendo da intenção da sua mensagem.</p>

                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;">
                    <div style="background: var(--bg-panel); border: 1px solid var(--border-color); padding: 18px; border-radius: var(--radius-lg);">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <span style="font-size: 1.5rem;">🐝</span>
                            <div>
                                <h3 style="font-size: 0.95rem; font-weight: 700;">Orquestrador Central</h3>
                                <span style="font-size: 0.7rem; color: var(--status-active);">● Ativo</span>
                            </div>
                        </div>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">Analisa comandos e delega tarefas para agentes secundários.</p>
                    </div>

                    <div style="background: var(--bg-panel); border: 1px solid var(--border-color); padding: 18px; border-radius: var(--radius-lg);">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <span style="font-size: 1.5rem;">💻</span>
                            <div>
                                <h3 style="font-size: 0.95rem; font-weight: 700;">Agente de Código & Dev</h3>
                                <span style="font-size: 0.7rem; color: var(--status-active);">● Pronto</span>
                            </div>
                        </div>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">Gera, refatora e analisa estruturas de software completas.</p>
                    </div>

                    <div style="background: var(--bg-panel); border: 1px solid var(--border-color); padding: 18px; border-radius: var(--radius-lg);">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <span style="font-size: 1.5rem;">📑</span>
                            <div>
                                <h3 style="font-size: 0.95rem; font-weight: 700;">Agente de Visão & Docs</h3>
                                <span style="font-size: 0.7rem; color: var(--status-active);">● Pronto</span>
                            </div>
                        </div>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">Processa imagens, PDFs, contratos e dados estruturados.</p>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza o Centro de Ferramentas Integradas
     */
    renderTools(container) {
        container.innerHTML = `
            <div style="padding: 30px; height: 100%; overflow-y: auto;">
                <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 6px;">🧩 Centro de Ferramentas (Tools)</h2>
                <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 24px;">Capacidades operacionais do backend conectadas ao sistema.</p>

                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
                    <div style="background: var(--bg-panel); border: 1px solid var(--border-color); padding: 18px; border-radius: var(--radius-lg);">
                        <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 4px;">🌐 Web Scraping & Busca</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">Capacidade de pesquisar e extrair informações em tempo real da internet.</p>
                    </div>

                    <div style="background: var(--bg-panel); border: 1px solid var(--border-color); padding: 18px; border-radius: var(--radius-lg);">
                        <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 4px;">⚡ Code Executor Sandbox</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">Validação e simulação de scripts JavaScript e Python no ambiente interno.</p>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza o Painel de Analytics do Sistema
     */
    renderAnalytics(container) {
        container.innerHTML = `
            <div style="padding: 30px; height: 100%; overflow-y: auto;">
                <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 6px;">📊 Analytics & Uso do Kernel</h2>
                <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 24px;">Métricas de desempenho, tempo de resposta e consumo da API backend.</p>

                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
                    <div style="background: var(--bg-panel); border: 1px solid var(--border-color); padding: 20px; border-radius: var(--radius-lg); text-align: center;">
                        <span style="font-size: 0.75rem; color: var(--text-muted);">Tempo Médio de Resposta</span>
                        <div style="font-size: 1.8rem; font-weight: 800; color: var(--accent-yellow); margin-top: 6px;">420ms</div>
                    </div>

                    <div style="background: var(--bg-panel); border: 1px solid var(--border-color); padding: 20px; border-radius: var(--radius-lg); text-align: center;">
                        <span style="font-size: 0.75rem; color: var(--text-muted);">Requisições com Sucesso</span>
                        <div style="font-size: 1.8rem; font-weight: 800; color: var(--status-active); margin-top: 6px;">99.8%</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza as Configurações Globais do Sistema
     */
    renderSystem(container) {
        container.innerHTML = `
            <div style="padding: 30px; height: 100%; overflow-y: auto;">
                <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 6px;">⚙ Configurações do Sistema</h2>
                <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 24px;">Ajustes de API, preferências de interface e parâmetros do Kernel.</p>

                <div style="background: var(--bg-panel); border: 1px solid var(--border-color); padding: 20px; border-radius: var(--radius-lg); max-width: 600px;">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">Endpoint de API Backend</label>
                        <input type="text" value="/gerar-gratis" readonly style="width: 100%; background: var(--bg-dark); border: 1px solid var(--border-color); padding: 10px; border-radius: var(--radius-md); color: var(--text-main); font-family: var(--font-mono); font-size: 0.85rem;">
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">Modo de Transmissão (Streaming)</label>
                        <select style="width: 100%; background: var(--bg-dark); border: 1px solid var(--border-color); padding: 10px; border-radius: var(--radius-md); color: var(--text-main); font-size: 0.85rem;">
                            <option>Ativado (Resposta Gradual em Tempo Real)</option>
                            <option>Desativado (Aguardar pacote completo)</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }
};
