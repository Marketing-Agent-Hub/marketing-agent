export class DuplicateScriptError extends Error {
    constructor(contentHash: string) {
        super(`ContentScript with hash ${contentHash} already exists`);
        this.name = 'DuplicateScriptError';
    }
}

export class AgentDisabledError extends Error {
    readonly agentType: string;
    constructor(agentType: string) {
        super(`Agent ${agentType} is disabled for this brand`);
        this.name = 'AgentDisabledError';
        this.agentType = agentType;
    }
}
