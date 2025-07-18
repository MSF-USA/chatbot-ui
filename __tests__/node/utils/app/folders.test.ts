import { saveFolders } from '@/utils/app/folders';

import { FolderInterface } from '@/types/folder';

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('saveFolders', () => {
  let folders: FolderInterface[];

  beforeEach(() => {
    // Assign folders before each test
    folders = [{ id: '2345', name: 'Test', type: 'chat' }];

    // Mock the localStorage
    (global as any).localStorage = {
      setItem: vi.fn(),
    } as any;
  });

  it('saves folders to localStorage', () => {
    saveFolders(folders);
    expect(global.localStorage.setItem).toHaveBeenCalledWith(
      'folders',
      JSON.stringify(folders),
    );
  });
});
