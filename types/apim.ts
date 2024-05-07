interface FilterResult {
    filtered: boolean;
    severity: string;
}

interface ContentFilterResults {
    hate: FilterResult;
    self_harm: FilterResult;
    sexual: FilterResult;
    violence: FilterResult;
}

interface Message {
    content: string;
    role: string;
}

interface Choice {
    content_filter_results: ContentFilterResults;
    finish_reason: string;
    index: number;
    message: Message;
}

interface PromptFilterResult {
    prompt_index: number;
    content_filter_results: ContentFilterResults;
}

interface Usage {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
}

export interface ApimChatResponseDataStructure {
    choices: Choice[];
    created: number;
    id: string;
    model: string;
    object: string;
    prompt_filter_results: PromptFilterResult[];
    system_fingerprint: null | string;
    usage: Usage;
}