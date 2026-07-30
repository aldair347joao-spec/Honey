import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import orchestratorinstance from './orchestrator.js';

// Carrega variáveis de ambiente (.env)
dotenv.config();

class kernel {
    constructor() {
        this.app = express();
        this.groq = null;
        this.isInitialized = false;
    }

    /**
     * Inicializa os serviços core da plataforma
     */
    async boot() {
        if (this.isInitialized) return;

        console.log("🚀 [Honey IA Kernel] A inicializar o sistema...");

        // 1. Validação de Variáveis de Ambiente
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.warn("⚠️ [Honey IA Kernel] ALERTA: GROQ_API_KEY não definida no ambiente.");
        } else {
            // Inicializa a SDK da Groq e injeta no Orchestrator
            this.groq = new Groq({ apiKey });
            orchestratorInstance.setGroqClient(this.groq);
            console.log("✅ [Honey IA Kernel] SDK Groq vinculada ao Orchestrator.");
        }

        // 2. Middlewares Globais de Rede
        this.app.use(cors({ origin: '*' }));
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

        // 3. Rota de Health Check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'online',
                system: 'Honey IA OS',
                version: '4.0.0',
                telemetry: orchestratorInstance.getTelemetry()
            });
        });

        this.isInitialized = true;
        console.log("✅ [Honey IA Kernel] Kernel pronto com sucesso.");
    }

    getApp() {
        return this.app;
    }
}

const kernelInstance = new kernel();
export default kernelInstance;
