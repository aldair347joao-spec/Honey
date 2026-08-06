/*
==========================================
HONEY IA
LOGIN & REGISTER CONTROLLER
Authentication UI & Logic
V2.0
==========================================
*/

import authmanager from "./auth.js";

class LoginController {

constructor(){
    this.container = null;
    this.isRegisterMode = false;
}

init(containerId){
    this.container = document.getElementById(containerId);

    if(!this.container){
        console.error("Contentor de login não encontrado.");
        return;
    }

    this.render();
}

render(){
    this.container.innerHTML = `
        <div class="auth-card glass-panel" style="max-width: 440px; margin: 50px auto; padding: 40px; border-radius: 28px; background: rgba(15,17,23,0.85); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(20px); box-shadow: 0 25px 70px rgba(0,0,0,0.35);">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 36px; margin-bottom: 12px;">🐝</div>
                <h2 id="auth-title" style="font-size: 26px; font-weight: 900; color: #fff; background: linear-gradient(90deg, #ffffff, #f5b942); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    Entrar na Honey IA
                </h2>
                <p id="auth-subtitle" style="color: rgba(255,255,255,0.6); font-size: 14px; margin-top: 6px;">
                    AI Enterprise Studio
                </p>
            </div>

            <div id="auth-error" style="display: none; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; padding: 12px; border-radius: 12px; font-size: 13px; margin-bottom: 20px; text-align: center;"></div>

            <form id="login-form">
                <div id="name-group" style="display: none; margin-bottom: 20px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.8); margin-bottom: 8px;">Nome Completo</label>
                    <input type="text" name="name" placeholder="O seu nome" style="width: 100%; padding: 14px 16px; border-radius: 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 14px; outline: none;">
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.8); margin-bottom: 8px;">E-mail</label>
                    <input type="email" name="email" required placeholder="seu@email.com" style="width: 100%; padding: 14px 16px; border-radius: 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 14px; outline: none;">
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.8); margin-bottom: 8px;">Palavra-passe</label>
                    <input type="password" name="password" required placeholder="••••••••" style="width: 100%; padding: 14px 16px; border-radius: 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 14px; outline: none;">
                </div>

                <button type="submit" id="auth-btn" style="width: 100%; padding: 15px; border-radius: 14px; background: linear-gradient(135deg, #f5b942, #ffd978); color: #08090c; font-weight: 700; font-size: 15px; border: none; cursor: pointer; box-shadow: 0 10px 25px rgba(245,185,66,0.2); transition: 0.3s;">
                    Entrar no Studio
                </button>
            </form>

            <div style="text-align: center; margin-top: 25px;">
                <button id="toggle-auth-mode" style="background: none; border: none; color: #f5b942; font-size: 13px; font-weight: 600; cursor: pointer;">
                    Não tem uma conta? Cadastre-se
                </button>
            </div>
        </div>
    `;

    this.attachEvents();
}

attachEvents(){
    const form = document.getElementById("login-form");
    const toggleBtn = document.getElementById("toggle-auth-mode");
    const nameGroup = document.getElementById("name-group");
    const title = document.getElementById("auth-title");
    const submitBtn = document.getElementById("auth-btn");
    const errorBox = document.getElementById("auth-error");

    // Alternar entre modo de Login e modo de Cadastro
    toggleBtn.addEventListener("click", () => {
        this.isRegisterMode = !this.isRegisterMode;
        errorBox.style.display = "none";

        if(this.isRegisterMode){
            nameGroup.style.display = "block";
            title.innerText = "Criar Conta na Honey IA";
            submitBtn.innerText = "Cadastrar e Entrar";
            toggleBtn.innerText = "Já tem uma conta? Faça login";
        } else {
            nameGroup.style.display = "none";
            title.innerText = "Entrar na Honey IA";
            submitBtn.innerText = "Entrar no Studio";
            toggleBtn.innerText = "Não tem uma conta? Cadastre-se";
        }
    });

    // Submissão do formulário
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        errorBox.style.display = "none";

        const email = form.querySelector("[name=email]").value;
        const password = form.querySelector("[name=password]").value;
        const name = form.querySelector("[name=name]")?.value || "Utilizador Honey";

        try {
            let user;
            if(this.isRegisterMode){
                // Efetua o registo real e guarda na base de dados local
                user = authmanager.register({
                    name,
                    email,
                    password,
                    plan: "free"
                });
            } else {
                // Efetua a validação e login real
                user = authmanager.login({
                    email,
                    password
                });
            }

            // Dispara o evento de sucesso para atualizar a interface principal
            document.dispatchEvent(
                new CustomEvent("user-login", {
                    detail: user
                })
            );

            // Recarrega a página ou limpa estado para entrar no workspace
            location.reload();

        } catch (err) {
            errorBox.innerText = err.message;
            errorBox.style.display = "block";
        }
    });
}

}

export default new LoginController();
