class AgentStudio {

    constructor() {

        this.currentAgent = "general";

        this.mode = "chat"; // chat | live

        this.status = "idle";

    }

    setAgent(agentId) {

        this.currentAgent = agentId;

    }

    getAgent() {

        return this.currentAgent;

    }

    setMode(mode) {

        this.mode = mode;

    }

    getMode() {

        return this.mode;

    }

    setStatus(status) {

        this.status = status;

        document.dispatchEvent(new CustomEvent("agent-status", {

            detail: {

                status

            }

        }));

    }

}

export default new AgentStudio();
