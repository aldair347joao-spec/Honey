/*
HONEY IA
LOGIN & REGISTER CONTROLLER
Authentication UI & Logic
V2.1 (Independente do index.html)
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
            <div class="honey-login-box">
                <div class="login-logo-header">
                    <span>🐝</span>
                    <h2 id="auth-title">Entrar na Honey IA</h2>
                    <p>AI Enterprise Studio</p>
                </div>
                <div id="auth-error" class="auth-error-box" style="display: none;"></div> 
                <form id="login-form"> 
                    <div id="name-group" class="input-group" style="display: none;"> 
                        <label>Nome Completo</label> 
                        <input type="text" name="name" placeholder="O seu nome"> 
                    </div> 
                    <div class="input-group"> 
                        <label>E-mail</label> 
                        <input type="email" name="email" required placeholder="seu@email.com"> 
                    </div> 
                    <div class="input-group"> 
                        <label>Palavra-passe</label> 
                        <input type="password" name="password" required placeholder="••••••••"> 
                    </div> 
                    <button type="submit" id="auth-btn" class="auth-submit-btn">Entrar no Studio</button> 
                </form> 
                <div class="auth-toggle-container"> 
                    <button id="toggle-auth-mode" type="button">Não tem uma conta? Cadastre-se</button> 
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

        form.addEventListener("submit", (e) => { 
            e.preventDefault(); 
            errorBox.style.display = "none"; 
            const email = form.querySelector("[name=email]").value; 
            const password = form.querySelector("[name=password]").value; 
            const name = form.querySelector("[name=name]")?.value || "Utilizador Honey"; 
            try { 
                let user; 
                if(this.isRegisterMode){ 
                    user = authmanager.register({ name, email, password, plan: "free" }); 
                } else { 
                    user = authmanager.login({ email, password }); 
                } 
                document.dispatchEvent(new CustomEvent("user-login", { detail: user })); 
                location.reload(); 
            } catch (err) { 
                errorBox.innerText = err.message; 
                errorBox.style.display = "block"; 
            } 
        }); 
    }
}

export default new LoginController();
