/*
==========================================
HONEY IA
Decision Engine
Versão 2.0
==========================================
*/

class decisionengine {

    detectagent(prompt = "") {

        const text = prompt.toLowerCase();

        // Developer
        if (
            text.includes("html") ||
            text.includes("css") ||
            text.includes("javascript") ||
            text.includes("node") ||
            text.includes("react") ||
            text.includes("python") ||
            text.includes("api") ||
            text.includes("program")
        ) {
            return "developer";
        }

        // Designer
        if (
            text.includes("design") ||
            text.includes("ui") ||
            text.includes("ux") ||
            text.includes("logo") ||
            text.includes("figma") ||
            text.includes("interface")
        ) {
            return "designer";
        }

        // Marketing
        if (
            text.includes("marketing") ||
            text.includes("facebook") ||
            text.includes("instagram") ||
            text.includes("publicidade") ||
            text.includes("copy") ||
            text.includes("campanha")
        ) {
            return "marketing";
        }

        // Financeiro
        if (
            text.includes("banco") ||
            text.includes("financeiro") ||
            text.includes("finanças") ||
            text.includes("crédito") ||
            text.includes("empréstimo") ||
            text.includes("pagamento") ||
            text.includes("conta")
        ) {
            return "finance";
        }

        // Saúde
        if (
            text.includes("hospital") ||
            text.includes("clínica") ||
            text.includes("medicina") ||
            text.includes("médico") ||
            text.includes("paciente") ||
            text.includes("saúde")
        ) {
            return "health";
        }

        // Educação
        if (
            text.includes("escola") ||
            text.includes("professor") ||
            text.includes("educação") ||
            text.includes("aluno") ||
            text.includes("curso") ||
            text.includes("universidade")
        ) {
            return "education";
        }

        // Jurídico
        if (
            text.includes("advogado") ||
            text.includes("contrato") ||
            text.includes("lei") ||
            text.includes("tribunal") ||
            text.includes("jurídico")
        ) {
            return "legal";
        }

        // Arquitetura
        if (
            text.includes("arquitetura") ||
            text.includes("planta") ||
            text.includes("casa") ||
            text.includes("edifício") ||
            text.includes("3d")
        ) {
            return "architect";
        }

        // Excel
        if (
            text.includes("excel") ||
            text.includes("planilha") ||
            text.includes("xlsx") ||
            text.includes("tabela") ||
            text.includes("gráfico")
        ) {
            return "excel";
        }

        // Vendas
        if (
            text.includes("venda") ||
            text.includes("cliente") ||
            text.includes("crm") ||
            text.includes("negócio") ||
            text.includes("proposta")
        ) {
            return "sales";
        }

        // Vídeo
        if (
            text.includes("vídeo") ||
            text.includes("video") ||
            text.includes("youtube") ||
            text.includes("edição")
        ) {
            return "video";
        }

        // Imagens
        if (
            text.includes("imagem") ||
            text.includes("foto") ||
            text.includes("banner") ||
            text.includes("cartaz")
        ) {
            return "image";
        }

        // Segurança
        if (
            text.includes("segurança") ||
            text.includes("security") ||
            text.includes("criptografia") ||
            text.includes("hack") ||
            text.includes("firewall")
        ) {
            return "security";
        }

        return "general";
    }

}

export default new decisionengine();
