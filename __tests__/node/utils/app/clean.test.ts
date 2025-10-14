import { describe, it, beforeEach, expect, vi } from 'vitest'
import { cleanSelectedConversation, cleanConversationHistory } from '@/lib/utils/app/clean'
import { Conversation, } from '@/types/chat'
import { OpenAIModels, OpenAIModelID } from '@/types/openai'
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/lib/utils/app/const'

let tempConversation: Conversation = {
    id: '1',
    name: 'Test Conversation',
    model: OpenAIModels[OpenAIModelID.GPT_4o],
    prompt: '',
    messages: [],
    folderId: '',
    temperature: 0
}
let tempHistory: Conversation[] = []

beforeEach(() => {
    // initialized with minimum properties for a "Conversation" type
    tempConversation = {
        id: '1',
        name: 'Test Conversation',
        model: OpenAIModels[OpenAIModelID.GPT_4o],
        prompt: '',
        messages: [],
        folderId: '',
        temperature: 0
    }

    tempHistory = [
        { ...tempConversation },
        { ...tempConversation, id: '2', name: 'Test 2' },
        { ...tempConversation, id: '3', name: 'Test 3' }
    ]
})

describe('Conversation tests', () => {

    it('cleans single conversation correctly', () => {
        const result: Conversation = cleanSelectedConversation(tempConversation)

        expect(result.model).toBe(OpenAIModels[OpenAIModelID.GPT_3_5])
        expect(result.prompt).toBe(DEFAULT_SYSTEM_PROMPT)
        expect(result.temperature).toBe(DEFAULT_TEMPERATURE)
        expect(result.folderId).toBe(null)
        expect(result.messages).toStrictEqual([])
    })

    it('cleans conversation history with valid array correctly', () => {
        const results: Conversation[] = cleanConversationHistory(tempHistory)

        for (const result of results) {
            expect(result.model).toBe(OpenAIModels[OpenAIModelID.GPT_3_5])
            expect(result.prompt).toBe(DEFAULT_SYSTEM_PROMPT)
            expect(result.temperature).toBe(DEFAULT_TEMPERATURE)
            expect(result.folderId).toBe(null)
            expect(result.messages).toStrictEqual([])
        }
    })

    it('returns an empty array when a non-array input is used for cleaning conversation history', () => {
        // @ts-ignore - testing error handling with invalid input
        const result = cleanConversationHistory('this is not an array')

        expect(result).toStrictEqual([])
    })

    it('invalid conversation types are removed during clean', () => {
        // @ts-ignore
        tempHistory[1] = 'this is not a conversation'
        expect(tempHistory.length).toEqual(3);

        const originalWarn = console.warn;
        console.warn = vi.fn();

        let cleanHistory: Conversation[] = cleanConversationHistory(tempHistory)
        expect(console.warn).toBeCalledTimes(1);
        expect(cleanHistory.length).toEqual(2);

        console.warn = originalWarn;
    })
})
