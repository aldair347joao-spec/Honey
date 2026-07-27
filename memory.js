import { Memory } from "./models.js";

/**
 * Guarda uma memória do utilizador
 */
export async function saveMemory(userId, chave, valor, importancia = 1) {

    try {

        const memoriaExistente = await Memory.findOne({
            userId,
            chave
        });

        if (memoriaExistente) {

            memoriaExistente.valor = valor;
            memoriaExistente.importancia = importancia;

            await memoriaExistente.save();

            return memoriaExistente;
        }

        const memoria = new Memory({
            userId,
            chave,
            valor,
            importancia
        });

        await memoria.save();

        return memoria;

    } catch (erro) {

        console.error("Erro ao guardar memória:", erro);

        return null;
    }

}

/**
 * Procura uma memória específica
 */
export async function getMemory(userId, chave) {

    try {

        return await Memory.findOne({
            userId,
            chave
        });

    } catch (erro) {

        console.error(erro);

        return null;
    }

}

/**
 * Lista todas as memórias do utilizador
 */
export async function listMemories(userId) {

    try {

        return await Memory.find({
            userId
        }).sort({
            importancia: -1
        });

    } catch (erro) {

        console.error(erro);

        return [];

    }

}

/**
 * Remove uma memória
 */
export async function deleteMemory(userId, chave) {

    try {

        await Memory.deleteOne({
            userId,
            chave
        });

        return true;

    } catch (erro) {

        console.error(erro);

        return false;

    }

}
