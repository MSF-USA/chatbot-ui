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
    state: hoistedMockHomeState,
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
      handleSend: vi.fn(),
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

  it('should call onClose when close button is clicked', async () => {
    render(<ChatInputSearch {...props} />);
    await user.click(screen.getByLabelText('closeModalAriaLabel'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking outside the modal', async () => {
    render(<ChatInputSearch {...props} isOpen={true} />);
    await screen.findByRole('dialog');
    fireEvent.mouseDown(document.body);
    expect(props.onClose).toHaveBeenCalledTimes(1);
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

    it('should handle successful URL submission with autoSubmit true', async () => {
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
      expect(props.handleSend).toHaveBeenCalledTimes(1);
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('should handle successful URL submission with autoSubmit false', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'Fetched URL content' }),
      });

      render(<ChatInputSearch {...props} />);
      const autoSubmitCheckbox = screen.getByLabelText('autoSubmitButton');
      await user.click(autoSubmitCheckbox);

      const submitButton = screen.getByRole('button', {
        name: 'generatePromptButton',
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
      expect(props.handleSend).not.toHaveBeenCalled();
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
    it('should toggle advanced options', async () => {
      render(<ChatInputSearch {...props} />);
      const advancedButton = screen.getByRole('button', {
        name: /advancedOptionsButton/i,
      });
      expect(
        screen.queryByLabelText('webSearchModalOptimizeLabel'),
      ).not.toBeInTheDocument();
      await user.click(advancedButton);
      expect(
        screen.getByLabelText('webSearchModalOptimizeLabel'),
      ).toBeInTheDocument();
      await user.click(advancedButton);
      expect(
        screen.queryByLabelText('webSearchModalOptimizeLabel'),
      ).not.toBeInTheDocument();
    });
    it('should handle successful search submission without optimization', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'Search results content' }),
      });
      render(<ChatInputSearch {...props} />);
      await user.click(
        screen.getByRole('button', { name: /advancedOptionsButton/i }),
      );
      const optimizeCheckbox = screen.getByLabelText(
        'webSearchModalOptimizeLabel',
      );
      if ((optimizeCheckbox as HTMLInputElement).checked) {
        await user.click(optimizeCheckbox);
      }
      const searchInputEl = screen.getByPlaceholderText(
        'searchQueryPlaceholder',
      );
      const questionInputEl = screen.getByPlaceholderText(
        'webSearchModalQuestionPlaceholder',
      );
      await user.type(questionInputEl, 'Custom search question');
      await user.type(searchInputEl, 'test query');
      await user.click(screen.getByRole('button', { name: 'submitButton' }));
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      expect(fetch).toHaveBeenCalledWith(
        '/api/v2/web/search?q=test+query&mkt=&safeSearch=Moderate&count=5&offset=0',
      );
      await waitFor(() => expect(props.onFileUpload).toHaveBeenCalledTimes(1));
      expect(props.setTextFieldValue).toHaveBeenCalledWith(
        `Custom search question\n\nwebSearchModalPromptUserContext:\n\n\`\`\`user-request\ntest query\n\`\`\`\n\nwebSearchModalPromptCitation`,
      );
      expect(props.handleSend).toHaveBeenCalledTimes(1);
    });
    it('should handle successful search submission WITH optimization', async () => {
      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            optimizedQuery: 'optimized test query',
            optimizedQuestion: 'optimized search question',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ content: 'Optimized search results content' }),
        });
      render(<ChatInputSearch {...props} />);
      const searchInput = screen.getByPlaceholderText('searchQueryPlaceholder');
      await user.type(searchInput, 'test query');
      await user.click(screen.getByRole('button', { name: 'submitButton' }));
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        '/api/v2/web/search/structure',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        '/api/v2/web/search?q=optimized+test+query&mkt=&safeSearch=Moderate&count=5&offset=0',
      );
      await waitFor(() => expect(props.onFileUpload).toHaveBeenCalledTimes(1));
      expect(props.setTextFieldValue).toHaveBeenCalledWith(
        `optimized search question\n\nwebSearchModalPromptUserContext:\n\n\`\`\`user-request\noptimized test query\n\`\`\`\n\nwebSearchModalPromptCitation`,
      );
    });
    it('should handle failed optimization but proceed with original query', async () => {
      (fetch as Mock)
        .mockResolvedValueOnce({ ok: false, statusText: 'Optimization Failed' })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ content: 'Search results (no opt)' }),
        });
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      render(<ChatInputSearch {...props} />);
      await user.type(
        screen.getByPlaceholderText('searchQueryPlaceholder'),
        'original query',
      );
      await user.click(screen.getByRole('button', { name: 'submitButton' }));
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
      expect((fetch as Mock).mock.calls[1][0]).toContain(
        '/api/v2/web/search?q=original+query',
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to optimize query:',
        'Optimization Failed',
      );
      await waitFor(() => expect(props.handleSend).toHaveBeenCalled());
      consoleWarnSpy.mockRestore();
    });
    it('should adjust "Number of Results" input (min 1, max 15, default 5 on blur)', async () => {
      render(<ChatInputSearch {...props} />);
      await user.click(
        screen.getByRole('button', { name: /advancedOptionsButton/i }),
      );
      const countInput = screen.getByLabelText(
        'webSearchModalResultsLabel',
      ) as HTMLInputElement;
      await user.clear(countInput);
      await user.type(countInput, '0');
      fireEvent.blur(countInput);
      await waitFor(() => expect(countInput.value).toBe('1'));
      await user.clear(countInput);
      await user.type(countInput, '20');
      fireEvent.blur(countInput);
      await waitFor(() => expect(countInput.value).toBe('15'));
      await user.clear(countInput);
      fireEvent.blur(countInput);
      await waitFor(() => expect(countInput.value).toBe('5'));
    });
    it('should display error message on failed search fetch', async () => {
      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            optimizedQuery: 'failing search',
            optimizedQuestion: 'q',
          }),
        })
        .mockResolvedValueOnce({ ok: false });
      render(<ChatInputSearch {...props} />);
      await user.type(
        screen.getByPlaceholderText('searchQueryPlaceholder'),
        'failing search',
      );
      await user.click(screen.getByRole('button', { name: 'submitButton' }));
      await waitFor(() => {
        expect(
          screen.getByText('errorFailedToFetchSearchResults'),
        ).toBeInTheDocument();
      });
    });
  });
});
