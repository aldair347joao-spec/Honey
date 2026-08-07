/*
==========================================
HONEY IA
AUTH MANAGER
User Session Controller
V2.0 (Real Auth & Persistence)
==========================================
*/

class authmanager {

constructor(){
    this.user = null;
    this.load();
}

load(){
    const saved = localStorage.getItem("honey_current_user");
    if(saved){
        try {
            this.user = JSON.parse(saved);
        } catch (e) {
            this.user = null;
        }
    }
}

// Regista um novo utilizador na "base de dados" local
register(data){
    const users = this.getStoredUsers();
    
    // Verifica se o e-mail já existe
    const exists = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
    if (exists) {
        throw new Error("Este e-mail já está registado. Faça login.");
    }

    const newUser = {
        id: data.id || crypto.randomUUID(),
        name: data.name || "Utilizador Honey",
        email: data.email || "",
        password: data.password || "", // Guarda a palavra-passe para validação futura
        plan: data.plan || "free",
        createdAt: new Date()
    };

    users.push(newUser);
    localStorage.setItem("honey_all_users", JSON.stringify(users));

    // Faz login automático após o registo
    return this.login({ email: newUser.email, password: newUser.password });
}

// Valida e efetua o login real
login(data){
    const users = this.getStoredUsers();
    
    // Se a lista de utilizadores existir e tivermos password a validar
    if (users.length > 0 && data.password !== undefined) {
        const found = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
        
        if (!found) {
            throw new Error("E-mail não encontrado. Por favor, cadastre-se primeiro.");
        }
        if (found.password !== data.password) {
            throw new Error("Palavra-passe incorreta.");
        }
        this.user = found;
    } else {
        // Fallback caso seja passado diretamente um objeto de sessão simulado
        this.user = {
            id: data.id || crypto.randomUUID(),
            name: data.name || "Utilizador Honey",
            email: data.email || "",
            plan: data.plan || "free",
            createdAt: new Date()
        };
    }

    localStorage.setItem(
        "honey_current_user",
        JSON.stringify(this.user)
    );

    return this.user;
}

logout(){
    this.user = null;
    localStorage.removeItem("honey_current_user");
}

isAuthenticated(){
    return !!this.user;
}

getUser(){
    return this.user;
}

getPlan(){
    return this.user?.plan || "free";
}

// Método auxiliar para ir buscar todos os utilizadores guardados
getStoredUsers(){
    const data = localStorage.getItem("honey_all_users");
    return data ? JSON.parse(data) : [];
}

}

export default new authmanager();
