import mongoose from "mongoose";

let conectado = false;

export async function connectdatabase() {
    if (conectado) {
        console.log("📦 MongoDB já está ligado.");
        return;
    }

    try {
        const uri = process.env.MONGODB_URI;

        if (!uri) {
            throw new Error("A variável MONGODB_URI não foi encontrada.");
        }

        await mongoose.connect(uri, {
            dbName: "honeyia"
        });

        conectado = true;

        console.log("🐝 MongoDB ligado com sucesso!");
    } catch (erro) {
        console.error("❌ Erro ao ligar ao MongoDB:", erro.message);
        process.exit(1);
    }
}
