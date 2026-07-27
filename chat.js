import { Conversation, Message } from "./models.js";
import { listMemories } from "./memory.js";

/**
 * Cria uma nova conversa
 */
export async function createConversation(userId, titulo = "Nova Conversa") {

    const conversa = new Conversation({
        userId,
        titulo
    });

    await conversa.save();

    return conversa;

}

/**
 * Guarda uma mensagem
 */
export async function saveMessage(conversationId, role, content) {

    const mensagem = new Message({
        conversationId,
        role,
        content
    });

    await mensagem.save();

    return mensagem;

}

/**
 * Obtém todo o histórico da conversa
 */
export async function getConversationHistory(conversationId) {

    return await Message.find({
        conversationId
    }).sort({
        criadoEm: 1
    });

}

/**
 * Monta o contexto para enviar para a IA
 */
export async function buildContext(userId, conversationId) {

    const memorias = await listMemories(userId);

    const mensagens = await getConversationHistory(conversationId);

    let contexto = "===== MEMÓRIA =====\n";

    memorias.forEach(memoria => {

        contexto += `${memoria.chave}: ${memoria.valor}\n`;

    });

    contexto += "\n===== HISTÓRICO =====\n";

    mensagens.forEach(msg => {

        contexto += `${msg.role}: ${msg.content}\n`;

    });

    return contexto;

}
