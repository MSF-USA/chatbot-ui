'use client';

import { useEffect, useRef, useState } from 'react';

import mermaid from 'mermaid';

interface MermaidBlockProps {
  chart: string;
}

/**
 * Client-side Mermaid diagram renderer
 * Renders Mermaid diagrams after component mounts (client-side only)
 */
export function MermaidBlock({ chart }: MermaidBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize mermaid with theme settings
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'inherit',
    });

    const renderDiagram = async () => {
      if (!ref.current) return;

      try {
        // Generate unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Render the diagram
        const { svg } = await mermaid.render(id, chart);

        // Insert the rendered SVG
        ref.current.innerHTML = svg;
        setError(null);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to render diagram',
        );
      }
    };

    renderDiagram();
  }, [chart]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 my-4">
        <p className="text-sm text-red-500 dark:text-red-400">
          Failed to render diagram: {error}
        </p>
        <details className="mt-2">
          <summary className="text-xs text-red-500/70 cursor-pointer">
            Show diagram code
          </summary>
          <pre className="mt-2 text-xs overflow-x-auto">
            <code>{chart}</code>
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="mermaid-diagram flex justify-center my-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 overflow-x-auto"
    />
  );
}
