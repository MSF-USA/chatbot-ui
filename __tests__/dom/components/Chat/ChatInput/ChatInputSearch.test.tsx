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

// --- Store Original Globals BEFORE Any Mocks ---
const OriginalRealURL = global.URL;

// --- Mocks ---
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

global.fetch = vi.fn();

// Define mockHostnameFn at module scope. This is the single instance we will configure.
const mockHostnameFn = vi.fn();

global.URL = vi
  .fn()
  .mockImplementation((urlInputStr: string | URL, base?: string | URL) => {
    const urlString =
      typeof urlInputStr === 'string' ? urlInputStr : urlInputStr.href;

    // Call the single mockHostnameFn instance. Its behavior is set in beforeEach/tests.
    const returnedHostnameFromMockFn = mockHostnameFn(urlString); // This is the value from our test-specific mockReturnValue

    // console.log(`[GLOBAL.URL MOCK] Input: '${urlString}', mockHostnameFn returned: '${returnedHostnameFromMockFn}'`);

    let realUrlInstance: InstanceType<typeof OriginalRealURL> | null = null;
    // Fallback hostname if mockHostnameFn somehow returns undefined AND OriginalRealURL parsing fails
    let realHostnameFallback: string | undefined = 'fallback.hostname.com';
    let searchParams = new URLSearchParams();
    let protocol = urlString.startsWith('https://') ? 'https:' : 'http:';
    let pathname = '/';
    let search = '',
      hash = '',
      port = '',
      username = '',
      password = '',
      origin = '';

    try {
      realUrlInstance = new OriginalRealURL(
        urlString,
        base || 'http://localhost',
      );
      realHostnameFallback = realUrlInstance.hostname;
      searchParams = realUrlInstance.searchParams;
      protocol = realUrlInstance.protocol;
      pathname = realUrlInstance.pathname;
      search = realUrlInstance.search;
      hash = realUrlInstance.hash;
      port = realUrlInstance.port;
      username = realUrlInstance.username;
      password = realUrlInstance.password;
      origin = realUrlInstance.origin;
    } catch (e) {
      // Minimal parsing if OriginalRealURL fails
      const qIndex = urlString.indexOf('?');
      if (qIndex !== -1) {
        search = urlString.substring(qIndex);
        searchParams = new URLSearchParams(search.substring(1));
      }
      const protocolEndIndex = urlString.indexOf('://');
      if (protocolEndIndex !== -1) {
        const authorityAndPath = urlString.substring(protocolEndIndex + 3);
        const pathStartIndex = authorityAndPath.indexOf('/');
        if (pathStartIndex !== -1) {
          realHostnameFallback = authorityAndPath
            .substring(0, pathStartIndex)
            .split(':')[0];
          pathname =
            authorityAndPath
              .substring(pathStartIndex)
              .split('?')[0]
              .split('#')[0] || '/';
        } else {
          realHostnameFallback = authorityAndPath.split('?')[0].split('#')[0];
        }
      }
      origin = `${protocol}//${realHostnameFallback}`;
    }

    // Prioritize the value directly returned by mockHostnameFn.
    // If mockHostnameFn returned undefined (e.g., if a test forgot to .mockReturnValue()),
    // then use the parsed realHostnameFallback.
    const finalHostname =
      typeof returnedHostnameFromMockFn !== 'undefined'
        ? returnedHostnameFromMockFn
        : realHostnameFallback;

    return {
      href: urlString,
      hostname: finalHostname,
      searchParams,
      protocol,
      pathname,
      search,
      hash,
      port,
      username,
      password,
      origin: origin.replace(
        realHostnameFallback || 'unknown.host',
        finalHostname || 'unknown.host',
      ),
      toJSON: () => urlString,
      toString: () => urlString,
    };
  }) as any;

describe('ChatInputSearch Component', () => {
  let props: any;
  const user = userEvent.setup();

  beforeEach(() => {
    hoistedMockHomeDispatch.mockClear();
    hoistedMockCryptoCreateHash.mockClear();
    hoistedMockUpdate.mockClear();
    hoistedMockDigest.mockClear();
    hoistedMockDigest.mockReturnValue('mockedhash123');

    // Reset mockHostnameFn completely. It will return undefined by default for any call.
    mockHostnameFn.mockReset();

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

    (fetch as Mock).mockClear();
    if (vi.isMockFunction(global.URL)) {
      (global.URL as unknown as Mock).mockClear();
    }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ... (All previously passing tests) ...
  it('should not render if isOpen is false', () => {
    render(<ChatInputSearch {...props} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render if isOpen is true and default to search mode', () => {
    render(<ChatInputSearch {...props} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('webSearchModalTitle')).toHaveClass(
      'border-blue-500',
    );
    expect(
      screen.getByPlaceholderText('searchQueryPlaceholder'),
    ).toBeInTheDocument();
  });

  it('should initialize with specified initialMode (url)', () => {
    render(<ChatInputSearch {...props} initialMode="url" />);
    expect(screen.getByText('chatUrlInputTitle')).toHaveClass(
      'border-blue-500',
    );
    expect(
      screen.getByPlaceholderText('https://example.com'),
    ).toBeInTheDocument();
  });

  it('should switch between search and url mode via tabs', async () => {
    render(<ChatInputSearch {...props} initialMode="search" />);
    const urlTabButton = screen.getByText('chatUrlInputTitle');
    const searchTabButton = screen.getByText('webSearchModalTitle');
    expect(searchTabButton).toHaveClass('border-blue-500');
    await user.click(urlTabButton);
    expect(urlTabButton).toHaveClass('border-blue-500');
    expect(
      screen.getByPlaceholderText('https://example.com'),
    ).toBeInTheDocument();
    await user.click(searchTabButton);
    expect(searchTabButton).toHaveClass('border-blue-500');
    expect(
      screen.getByPlaceholderText('searchQueryPlaceholder'),
    ).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    render(<ChatInputSearch {...props} />);
    await user.click(screen.getByLabelText('closeModalAriaLabel'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking outside the modal', async () => {
    render(<ChatInputSearch {...props} />);
    fireEvent.mouseDown(document.body);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  describe('URL Mode', () => {
    beforeEach(() => {
      props.initialMode = 'url';
    });

    it('should focus url input when opened in url mode', () => {
      // For this test, if URL().hostname is called, mockHostnameFn will return undefined
      // as it's only mockReset in the outer beforeEach. This test doesn't rely on hostname.
      render(<ChatInputSearch {...props} />);
      expect(screen.getByPlaceholderText('https://example.com')).toHaveFocus();
    });

    it('should auto-populate question input if url is entered and question is empty', async () => {
      // If URL().hostname is called, mockHostnameFn returns undefined here.
      render(<ChatInputSearch {...props} />);
      const urlInput = screen.getByPlaceholderText('https://example.com');
      await user.type(urlInput, 'http://test.com');
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
      // Set mockHostnameFn to return 'test.com' for ANY call during this test.
      mockHostnameFn.mockReturnValue('test.com');
      // console.log("Test 'autoSubmit true': mockHostnameFn configured to return 'test.com'");

      render(<ChatInputSearch {...props} />);
      const urlInputEl = screen.getByPlaceholderText('https://example.com');
      const submitButton = screen.getByRole('button', { name: 'submitButton' });

      await user.type(urlInputEl, 'http://test.com');
      const questionInputEl = screen.getByPlaceholderText(
        'defaultWebPullerQuestion',
      );
      await user.clear(questionInputEl);
      await user.type(questionInputEl, 'Custom question about URL');

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
      // Set mockHostnameFn to return 'anothertest.com' for ANY call during this test.
      mockHostnameFn.mockReturnValue('anothertest.com');
      // console.log("Test 'autoSubmit false': mockHostnameFn configured to return 'anothertest.com'");

      render(<ChatInputSearch {...props} />);
      const autoSubmitCheckbox = screen.getByLabelText('autoSubmitButton');
      await user.click(autoSubmitCheckbox);

      const submitButton = screen.getByRole('button', {
        name: 'generatePromptButton',
      });
      await user.type(
        screen.getByPlaceholderText('https://example.com'),
        'http://anothertest.com',
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
      mockHostnameFn.mockReturnValue('irrelevant.host.for.error.test');
      render(<ChatInputSearch {...props} />);
      await user.type(
        screen.getByPlaceholderText('https://example.com'),
        'http://invalid-url.com',
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
      mockHostnameFn.mockReturnValue('irrelevant.api.error.host');
      render(<ChatInputSearch {...props} />);
      await user.type(
        screen.getByPlaceholderText('https://example.com'),
        'http://api-error-url.com',
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
    // ... (Search mode tests - should be unaffected by hostname mock changes if they don't use new URL().hostname)
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
