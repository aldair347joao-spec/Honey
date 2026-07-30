import { Message } from "./models.js";

/**
 * Guarda uma nova mensagem no histórico do banco de dados
 */
export async function saveMessage(userId, role, content, agentId = "general") {
    try {
        const message = new Message({
            userId,
            role,
            content,
            agentId
        });
        await message.save();
        return message;
    } catch (error) {
        console.error("Erro ao salvar mensagem no Chat:", error);
        return null;
    }
}

/**
 * Procura as mensagens recentes de um utilizador e agente específico
 */
export async function getRecentMessages(userId, agentId = null, limit = 10) {
    try {
        // Se for passado agentId, filtra pelo agente específico; caso contrário, traz o histórico geral
        const query = { userId };
        if (agentId) {
            query.agentId = agentId;
        }

        // Tenta ordenar por createdAt (padrão Mongoose) ou criadoEm
        const messages = await Message.find(query)
            .sort({ createdAt: -1, criadoEm: -1 })
            .limit(limit);
        
        // Inverte para manter a ordem cronológica correta (antigas -> recentes)
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
