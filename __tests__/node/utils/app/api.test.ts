import { describe, it, expect } from 'vitest'
import { getEndpoint } from '@/lib/utils/app/api'

describe('getEndpoint', () => {
    it('should return the chat endpoint', () => {
        let result = getEndpoint()
        expect(result).toEqual('/api/chat')
    })
})
