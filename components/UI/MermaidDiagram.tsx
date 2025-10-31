'use client';

import { useEffect, useRef } from 'react';

import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export function MermaidDiagram({ chart, className = '' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize mermaid with theme settings
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#1f2937',
        primaryBorderColor: '#2563eb',
        lineColor: '#6b7280',
        secondaryColor: '#10b981',
        tertiaryColor: '#f59e0b',
        background: '#ffffff',
        mainBkg: '#eff6ff',
        secondBkg: '#dbeafe',
        tertiaryBkg: '#fef3c7',
        textColor: '#1f2937',
        border1: '#d1d5db',
        border2: '#9ca3af',
        fontSize: '14px',
      },
    });

    // Render the diagram
    const renderDiagram = async () => {
      if (containerRef.current) {
        try {
          const uniqueId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(uniqueId, chart);
          containerRef.current.innerHTML = svg;
        } catch (error) {
          console.error('Error rendering mermaid diagram:', error);
          containerRef.current.innerHTML =
            '<p class="text-red-600">Error rendering diagram</p>';
        }
      }
    };

    renderDiagram();
  }, [chart]);

  return (
    <div ref={containerRef} className={`mermaid-container ${className}`} />
  );
}
