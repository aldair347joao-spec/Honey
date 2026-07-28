import { Message } from "./models.js";

/**
 * Guarda uma nova mensagem no histórico do banco de dados
 */
export async function saveMessage(userId, role, content) {
    try {
        const message = new Message({
            userId,
            role,
            content
        });
        await message.save();
        return message;
    } catch (error) {
        console.error("Erro ao salvar mensagem no Chat:", error);
        return null;
    }
}

/**
 * Procura as mensagens recentes de um utilizador específico
 */
export async function getRecentMessages(userId, limit = 10) {
    try {
        const messages = await Message.find({ userId })
            .sort({ criadoEm: -1 })
            .limit(limit);
        
        // Inverte para manter a ordem cronológica correta na conversa
        return messages.reverse();
    } catch (error) {
        console.error("Erro ao procurar histórico de mensagens:", error);
        return [];
    }
}

export default {
    saveMessage,
    getRecentMessages
};
