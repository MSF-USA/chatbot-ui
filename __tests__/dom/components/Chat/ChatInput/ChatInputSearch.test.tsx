import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';

import ChatInputSearch from '@/components/Chat/ChatInput/ChatInputSearch';

// ENSURE JEST-DOM MATCHERS ARE AVAILABLE
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// --- Mocks for dependencies (icons, i18n, context) ---
vi.mock('@tabler/icons-react', () => ({
  IconBrandBing: (props: any) => (
    <svg data-testid="icon-brand-bing" {...props} />
  ),
  IconChevronDown: (props: any) => (
    <svg data-testid="icon-chevron-down" {...props} />
  ),
  IconChevronUp: (props: any) => (
    <svg data-testid="icon-chevron-up" {...props} />
  ),
  IconLink: (props: any) => <svg data-testid="icon-link" {...props} />,
  IconSearch: (props: any) => <svg data-testid="icon-search" {...props} />,
}));

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const { hoistedMockHomeState, hoistedMockHomeDispatch } = vi.hoisted(() => ({
  hoistedMockHomeState: {
    user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
  },
  hoistedMockHomeDispatch: vi.fn(),
}));

vi.mock('@/pages/api/home/home.context', () => ({
  __esModule: true,
  default: React.createContext({
    state: {
      ...hoistedMockHomeState,
      selectedConversation: {
        id: 'test-conversation',
        name: 'Test Chat',
        messages: [],
        model: {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          maxLength: 128000,
          tokenLimit: 128000,
        },
        prompt: '',
        temperature: 0.7,
        folderId: null,
      },
    },
    dispatch: hoistedMockHomeDispatch,
  }),
}));

// --- Crypto Mock (for filename hashing) ---
const { hoistedMockDigest, hoistedMockUpdate, hoistedMockCryptoCreateHash } =
  vi.hoisted(() => {
    const digestFn = vi.fn().mockReturnValue('mockedhash123');
    const updateFn = vi.fn();
    const createHashFn = vi.fn(() => {
      const hashInstance = { update: updateFn, digest: digestFn };
      updateFn.mockImplementation(() => hashInstance);
      return hashInstance;
    });
    return {
      hoistedMockDigest: digestFn,
      hoistedMockUpdate: updateFn,
      hoistedMockCryptoCreateHash: createHashFn,
    };
  });

vi.mock('crypto', () => ({
  default: { createHash: hoistedMockCryptoCreateHash },
  createHash: hoistedMockCryptoCreateHash,
}));

// Mock makeRequest from frontendChatServices
const { mockMakeRequest } = vi.hoisted(() => ({
  mockMakeRequest: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/services/frontendChatServices', () => ({
  makeRequest: mockMakeRequest,
}));

// --- Global Fetch Mock ---
global.fetch = vi.fn();

// --- Test Suite ---
describe('ChatInputSearch Component', () => {
  let props: any;
  const user = userEvent.setup();
  // Declare urlSpy here, will be assigned in beforeEach
  let urlSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'URL'>>;

  beforeEach(() => {
    hoistedMockHomeDispatch.mockClear();
    hoistedMockCryptoCreateHash.mockClear();
    hoistedMockUpdate.mockClear();
    hoistedMockDigest.mockClear();
    hoistedMockDigest.mockReturnValue('mockedhash123');
    mockMakeRequest.mockClear();

    (fetch as Mock).mockClear();

    // Spy on global.URL and provide our mock implementation for its constructor
    //@ts-ignore
    urlSpy = vi.spyOn(globalThis, 'URL', 'get');
    urlSpy.mockImplementation(() => {
      const MockURLConstructor = function (urlStringInput: string | URL) {
        const urlString = String(urlStringInput);
        let determinedHostname: string | undefined;

        if (urlString === 'http://test.com') {
          determinedHostname = 'test.com';
        } else if (urlString === 'http://anothertest.com') {
          determinedHostname = 'anothertest.com';
        } else if (urlString === 'http://invalid-url.com') {
          // For error test
          determinedHostname = 'invalid-url.com';
        } else if (urlString === 'http://api-error-url.com') {
          // For error test
          determinedHostname = 'api-error-url.com';
        } else {
          // Fallback for any other URL to avoid breaking other unexpected calls
          determinedHostname = 'fallback.mocked.com';
        }

        let protocol = 'http:';
        if (urlString.startsWith('https://')) {
          protocol = 'https:';
        }

        const instance = {
          hostname: determinedHostname,
          href: urlString,
          protocol: protocol,
          origin: `${protocol}//${determinedHostname || 'unknown.mock.com'}`,
          pathname: '/mock-path-spy',
          search: '',
          searchParams: new URLSearchParams(''),
          hash: '',
          port: '',
          username: '',
          password: '',
          toString: () => urlString,
          toJSON: () => urlString,
        };
        return instance;
      };
      return MockURLConstructor as any; // Using 'as any' to simplify complex constructor typing
    });

    props = {
      isOpen: true,
      onClose: vi.fn(),
      onFileUpload: vi.fn().mockResolvedValue(undefined),
      setSubmitType: vi.fn(),
      setFilePreviews: vi.fn(),
      setFileFieldValue: vi.fn(),
      setImageFieldValue: vi.fn(),
      setUploadProgress: vi.fn(),
      setTextFieldValue: vi.fn(),
      // New props for agent-based search
      onSend: vi.fn(),
      setRequestStatusMessage: vi.fn(),
      setProgress: vi.fn(),
      stopConversationRef: { current: false },
      apiKey: 'test-api-key',
      pluginKeys: [],
      systemPrompt: 'You are a helpful assistant',
      temperature: 0.7,
      initialMode: 'search',
    };
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks(); // This will restore the global.URL spy
  });

  it('should not render if isOpen is false', () => {
    render(<ChatInputSearch {...props} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render if isOpen is true and default to search mode', () => {
    render(<ChatInputSearch {...props} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should initialize with specified initialMode (url)', () => {
    render(<ChatInputSearch {...props} initialMode="url" />);
    expect(screen.getByText('chatUrlInputTitle')).toHaveClass(
      'border-blue-500',
    );
  });

  it('should switch between search and url mode via tabs', async () => {
    render(<ChatInputSearch {...props} initialMode="search" />);
    const urlTabButton = screen.getByText('chatUrlInputTitle');
    await user.click(urlTabButton);
    expect(urlTabButton).toHaveClass('border-blue-500');
    const searchTabButton = screen.getByText('webSearchModalTitle');
    await user.click(searchTabButton);
    expect(searchTabButton).toHaveClass('border-blue-500');
  });

  describe('URL Mode', () => {
    beforeEach(() => {
      props.initialMode = 'url';
    });

    it('should focus url input when opened in url mode', () => {
      render(<ChatInputSearch {...props} />);
      expect(screen.getByPlaceholderText('https://example.com')).toHaveFocus();
    });

    it('should auto-populate question input if url is entered and question is empty', async () => {
      render(<ChatInputSearch {...props} />);
      const urlInput = screen.getByPlaceholderText('https://example.com');
      await user.type(urlInput, 'http://test.com'); // Plain string URL
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('defaultWebPullerQuestion'),
        ).toHaveValue('defaultWebPullerQuestion');
      });
    });

    it('should handle successful URL submission', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'Fetched URL content' }),
      });

      render(<ChatInputSearch {...props} />);
      const urlInputEl = screen.getByPlaceholderText('https://example.com');
      const questionInputEl = screen.getByPlaceholderText(
        'defaultWebPullerQuestion',
      );
      const submitButton = screen.getByRole('button', { name: 'submitButton' });

      // Set the custom question first to avoid useEffect interference
      await user.clear(questionInputEl);
      await user.type(questionInputEl, 'Custom question about URL');

      // Then type the URL
      await user.type(urlInputEl, 'http://test.com'); // Plain string URL

      await user.click(submitButton);

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      expect(fetch).toHaveBeenCalledWith(
        '/api/v2/web/pull',
        expect.objectContaining({
          body: JSON.stringify({ url: 'http://test.com' }),
        }),
      );

      await waitFor(() => expect(props.onFileUpload).toHaveBeenCalledTimes(1));
      const fileArg = (props.onFileUpload as Mock).mock.calls[0][0][0];
      expect(fileArg.name).toBe('web-pull-test.com_mockedhash123.txt');

      expect(props.setTextFieldValue).toHaveBeenCalledWith(
        `Custom question about URL\n\nwebPullerCitationPrompt: http://test.com\n\nwebPullerReferencePrompt`,
      );
      // URL mode doesn't call onSend directly
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('should handle URL submission with default question', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'Fetched URL content' }),
      });

      render(<ChatInputSearch {...props} />);
      await user.click(screen.getByRole('button', { name: 'chatUrlInputTitle' }));
      
      const submitButton = screen.getByRole('button', {
        name: 'submitButton',
      });
      await user.type(
        screen.getByPlaceholderText('https://example.com'),
        'http://anothertest.com', // Plain string URL
      );

      await user.click(submitButton);

      await waitFor(() => expect(props.onFileUpload).toHaveBeenCalledTimes(1));
      const fileArg = (props.onFileUpload as Mock).mock.calls[0][0][0];
      expect(fileArg.name).toBe('web-pull-anothertest.com_mockedhash123.txt');

      expect(props.setTextFieldValue).toHaveBeenCalledWith(
        `defaultWebPullerQuestion\n\nwebPullerCitationPrompt: http://anothertest.com\n\nwebPullerReferencePrompt`,
      );
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('should display error message on failed URL fetch (network error)', async () => {
      (fetch as Mock).mockResolvedValueOnce({ ok: false });
      render(<ChatInputSearch {...props} />);
      await user.type(
        screen.getByPlaceholderText('https://example.com'),
        'http://invalid-url.com', // Plain string URL
      );
      await user.click(screen.getByRole('button', { name: 'submitButton' }));
      await waitFor(() => {
        expect(screen.getByText('errorFailedToFetchUrl')).toBeInTheDocument();
      });
    });

    it('should display API error message on failed URL fetch (server error in JSON)', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'Actual server error message' }),
      });
      render(<ChatInputSearch {...props} />);
      await user.type(
        screen.getByPlaceholderText('https://example.com'),
        'http://api-error-url.com', // Plain string URL
      );
      await user.click(screen.getByRole('button', { name: 'submitButton' }));
      await waitFor(() => {
        expect(
          screen.getByText('Actual server error message'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Search Mode', () => {
    beforeEach(() => {
      props.initialMode = 'search';
    });
    it('should focus search input when opened in search mode', () => {
      render(<ChatInputSearch {...props} />);
      expect(
        screen.getByPlaceholderText('searchQueryPlaceholder'),
      ).toHaveFocus();
    });
    // Removed test for toggling advanced options as that UI has been removed
    it('should handle successful search submission', async () => {
      render(<ChatInputSearch {...props} />);
      const searchInputEl = screen.getByPlaceholderText(
        'searchQueryPlaceholder',
      );
      await user.type(searchInputEl, 'test query');
      await user.click(screen.getByRole('button', { name: 'submitButton' }));
      
      // Expect onSend to be called with user's message and forced agent type
      await waitFor(() => expect(props.onSend).toHaveBeenCalledTimes(1));
      expect(props.onSend).toHaveBeenCalledWith(
        {
          role: 'user',
          content: 'test query',
          messageType: 'text',
        },
        null,
        undefined,
        'web_search', // AgentType.WEB_SEARCH
      );
      // No API calls should be made directly by the component
      expect(fetch).not.toHaveBeenCalled();
      expect(mockMakeRequest).not.toHaveBeenCalled();
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });
    it('should handle search submission with simple workflow', async () => {
      render(<ChatInputSearch {...props} />);
      const searchInput = screen.getByPlaceholderText('searchQueryPlaceholder');
      await user.type(searchInput, 'test query');
      await user.click(screen.getByRole('button', { name: 'submitButton' }));
      
      // Expect onSend to be called with user's message and forced agent type
      await waitFor(() => expect(props.onSend).toHaveBeenCalledTimes(1));
      expect(props.onSend).toHaveBeenCalledWith(
        {
          role: 'user',
          content: 'test query',
          messageType: 'text',
        },
        null,
        undefined,
        'web_search', // AgentType.WEB_SEARCH
      );
      // No direct API calls or makeRequest should happen
      expect(fetch).not.toHaveBeenCalled();
      expect(mockMakeRequest).not.toHaveBeenCalled();
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });
    it('should handle search query submission', async () => {
      render(<ChatInputSearch {...props} />);
      await user.type(
        screen.getByPlaceholderText('searchQueryPlaceholder'),
        'original query',
      );
      await user.click(screen.getByRole('button', { name: 'submitButton' }));
      
      // Expect onSend to be called with user's message and forced agent type
      await waitFor(() => expect(props.onSend).toHaveBeenCalledTimes(1));
      expect(props.onSend).toHaveBeenCalledWith(
        {
          role: 'user',
          content: 'original query',
          messageType: 'text',
        },
        null,
        undefined,
        'web_search', // AgentType.WEB_SEARCH
      );
      // No API calls should be made
      expect(fetch).not.toHaveBeenCalled();
      expect(mockMakeRequest).not.toHaveBeenCalled();
    });
    // Removed test for 'Number of Results' input as advanced options have been removed;
    it('should not display error for normal search submission', async () => {
      render(<ChatInputSearch {...props} />);
      await user.type(
        screen.getByPlaceholderText('searchQueryPlaceholder'),
        'failing search',
      );
      await user.click(screen.getByRole('button', { name: 'submitButton' }));
      
      // Should just call onSend and close
      await waitFor(() => expect(props.onSend).toHaveBeenCalledTimes(1));
      expect(props.onSend).toHaveBeenCalledWith(
        {
          role: 'user',
          content: 'failing search',
          messageType: 'text',
        },
        null,
        undefined,
        'web_search',
      );
      // No error should be displayed since we're just passing to parent
      expect(
        screen.queryByText('errorFailedToFetchSearchResults'),
      ).not.toBeInTheDocument();
    });
  });
});
