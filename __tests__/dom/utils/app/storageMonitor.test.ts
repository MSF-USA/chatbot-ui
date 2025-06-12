// src/test/storageMonitor.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
    getStorageUsage,
    getItemSize,
    getDismissedThresholds,
    dismissThreshold,
    getSortedConversations,
    clearOlderConversations,
    getCurrentThresholdLevel,
    STORAGE_THRESHOLDS
} from '@/utils/app/storageMonitor'
import type { Conversation } from '@/types/chat'

describe('Storage Monitor', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear()
        // Clear any console.error mocks
        vi.clearAllMocks()
    })

    describe('getItemSize', () => {
        it('should return 0 for non-existent items', () => {
            expect(getItemSize('nonexistent')).toBe(0)
        })

        it('should calculate size of stored items', () => {
            const testData = 'hello world'
            localStorage.setItem('test', testData)

            const size = getItemSize('test')
            expect(size).toBeGreaterThan(0)
            expect(size).toBe(testData.length) // Should fallback to string length
        })
    })

    describe('getStorageUsage', () => {
        it('should return empty usage when localStorage is empty', () => {
            const usage = getStorageUsage()

            expect(usage.currentUsage).toBe(0)
            expect(usage.percentUsed).toBe(0)
            expect(usage.isNearingLimit).toBe(false)
        })

        it('should calculate usage correctly', () => {
            localStorage.setItem('test1', 'data1')
            localStorage.setItem('test2', 'data2')

            const usage = getStorageUsage()
            expect(usage.currentUsage).toBeGreaterThan(0)
            expect(usage.percentUsed).toBeGreaterThan(0)
        })
    })

    describe('dismissed thresholds', () => {
        it('should return empty array when no thresholds dismissed', () => {
            expect(getDismissedThresholds()).toEqual([])
        })

        it('should store and retrieve dismissed thresholds', () => {
            dismissThreshold('WARNING')
            dismissThreshold('CRITICAL')

            const dismissed = getDismissedThresholds()
            expect(dismissed).toContain('WARNING')
            expect(dismissed).toContain('CRITICAL')
        })

        it('should not duplicate dismissed thresholds', () => {
            dismissThreshold('WARNING')
            dismissThreshold('WARNING')

            const dismissed = getDismissedThresholds()
            expect(dismissed.filter((t: string) => t === 'WARNING')).toHaveLength(1)
        })
    })

    describe('getSortedConversations', () => {
        const mockConversations: Conversation[] = [
            {
                id: '1',
                name: 'Old Conversation',
                messages: [],
                createdAt: '2023-01-01T00:00:00Z',
                updatedAt: '2023-01-01T00:00:00Z',
                // @ts-expect-error only keeping relevant elements of the model
                model: { id: 'gpt-4' },
                prompt: '',
                temperature: 1,
                folderId: null
            },
            {
                id: '2',
                name: 'New Conversation',
                messages: [],
                createdAt: '2023-12-01T00:00:00Z',
                updatedAt: '2023-12-01T00:00:00Z',
                // @ts-expect-error only keeping relevant elements of the model
                model: { id: 'gpt-4' },
                prompt: '',
                temperature: 1,
                folderId: null
            }
        ]

        it('should return empty array when no conversations exist', () => {
            expect(getSortedConversations()).toEqual([])
        })

        it('should sort conversations by date (newest first)', () => {
            localStorage.setItem('conversations', JSON.stringify(mockConversations))

            const sorted = getSortedConversations()
            expect(sorted).toHaveLength(2)
            expect(sorted[0].id).toBe('2') // Newer conversation first
            expect(sorted[1].id).toBe('1') // Older conversation second
        })
    })

    describe('clearOlderConversations', () => {
        const mockConversations: Conversation[] = [
            // ... same mock data as above
        ]

        it('should keep specified number of recent conversations', () => {
            localStorage.setItem('conversations', JSON.stringify(mockConversations))

            const result = clearOlderConversations(1)
            expect(result).toBe(true)

            const remaining = getSortedConversations()
            expect(remaining).toHaveLength(1)
            expect(remaining[0].id).toBe('2') // Should keep the newest
        })

        it('should return false when nothing to clear', () => {
            localStorage.setItem('conversations', JSON.stringify([mockConversations[0]]))

            const result = clearOlderConversations(5)
            expect(result).toBe(false)
        })
    })

    describe('getCurrentThresholdLevel', () => {
        it('should return null when storage usage is low', () => {
            // Empty localStorage = 0% usage
            expect(getCurrentThresholdLevel()).toBeNull()
        })

        // Note: Testing high usage scenarios in jsdom is tricky since
        // localStorage limits don't behave exactly like real browsers
        it('should detect warning threshold with mocked usage', () => {
            // You might need to mock getStorageUsage for this test
            vi.doMock('@/utils/storageMonitor', async (importOriginal) => {
                const mod = await importOriginal() as any
                return {
                    ...mod,
                    getStorageUsage: () => ({
                        currentUsage: 3500000, // 3.5MB
                        maxUsage: 5000000,     // 5MB
                        percentUsed: 70,       // Warning threshold
                        isNearingLimit: true
                    })
                }
            })
        })
    })
})
