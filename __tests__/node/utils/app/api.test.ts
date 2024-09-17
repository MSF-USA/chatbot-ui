import { describe, it, expect, beforeEach } from 'vitest'
import { getEndpoint } from '../../../../utils/app/api'
import { Plugin, PluginID } from '@/types/plugin'

let plugin: { id: PluginID } | null

describe('getEndpoint', () => {
    beforeEach(() => {
        plugin = { id: PluginID.GOOGLE_SEARCH }
    })

    it('should return default endpoint if no plugin is provided', () => {
        plugin = null
        let result = getEndpoint({plugin})
        expect(result).toEqual('api/v2/chat')
    })

    it('should return default endpoint if plugin id is not Google Search', () => {
        // @ts-ignore
        plugin = {
            id: 'SOME_OTHER_PLUGIN' as PluginID,
            name: '',
            requiredKeys: []
        } as Plugin
        // @ts-ignore
        let result = getEndpoint({plugin})
        expect(result).toEqual('api/v2/chat')
    })

    it('should throw an error if plugin id is Google Search', () => {
        expect(() => {
            // @ts-ignore
            let result = getEndpoint({plugin});
        }).toThrow();
    })
})
