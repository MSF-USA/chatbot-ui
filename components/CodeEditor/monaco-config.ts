import { loader } from '@monaco-editor/react';

import * as monaco from 'monaco-editor';

// Configure Monaco to use local files instead of CDN
loader.config({ monaco });

// Disable the default CDN loading
export const configureMonaco = () => {
  loader.config({
    monaco,
    paths: {
      vs: '/monaco-editor/min/vs',
    },
  });
};
