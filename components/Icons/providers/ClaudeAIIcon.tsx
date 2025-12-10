import React from 'react';

/**
 * Claude AI logo icon - a 12-ray starburst pattern.
 * Based on Anthropic's official Claude AI symbol.
 */
export function ClaudeAIIcon(props: React.SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      {...rest}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <title>Claude AI</title>
      <g transform="translate(12, 12)">
        {/* 12 rays at 30-degree intervals */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(
          (angle) => (
            <polygon
              key={angle}
              points="0,-1.8 1.2,-10.5 0,-11.5 -1.2,-10.5"
              transform={`rotate(${angle})`}
            />
          ),
        )}
        {/* Central circle */}
        <circle cx="0" cy="0" r="3" />
      </g>
    </svg>
  );
}

/**
 * Claude AI logo icon with brand color (terracotta orange).
 * Use this variant when the brand color should be displayed regardless of theme.
 */
export function ClaudeAIIconBrand(props: React.SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      {...rest}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="#D97757"
    >
      <title>Claude AI</title>
      <g transform="translate(12, 12)">
        {/* 12 rays at 30-degree intervals */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(
          (angle) => (
            <polygon
              key={angle}
              points="0,-1.8 1.2,-10.5 0,-11.5 -1.2,-10.5"
              transform={`rotate(${angle})`}
            />
          ),
        )}
        {/* Central circle */}
        <circle cx="0" cy="0" r="3" />
      </g>
    </svg>
  );
}
