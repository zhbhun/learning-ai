import { createElement, lazy, Suspense, useEffect } from 'react';

import {
  markMermaidBlocksAsError,
  observeMermaidBlocks,
  renderMermaidBlocks,
} from './mermaid-renderer.js';

const LazyDocsContainer = lazy(() =>
  import('@storybook/addon-docs/blocks').then(({ DocsContainer }) => ({
    default: DocsContainer,
  })),
);

let mermaidPromise;

export const mermaidConfig = {
  startOnLoad: false,
  securityLevel: 'strict',
  suppressErrorRendering: true,
  theme: 'base',
  themeVariables: {
    background: '#ffffff',
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    lineColor: '#73809c',
    primaryBorderColor: '#4f7cff',
    primaryColor: '#eff6ff',
    primaryTextColor: '#172033',
    secondaryColor: '#fff7ed',
    tertiaryColor: '#f8fafc',
  },
};

function loadMermaid() {
  mermaidPromise ??= import('mermaid')
    .then(({ default: mermaid }) => {
      mermaid.initialize(mermaidConfig);
      return mermaid;
    })
    .catch((error) => {
      mermaidPromise = undefined;
      throw error;
    });

  return mermaidPromise;
}

export function MermaidDocsContainer(props) {
  useEffect(() => {
    let active = true;
    const stopObserving = observeMermaidBlocks({
      root: document,
      MutationObserverClass: MutationObserver,
      render() {
        return loadMermaid()
          .then((mermaid) => {
            if (active) {
              return renderMermaidBlocks({
                root: document,
                mermaid,
                isActive: () => active,
              });
            }
          })
          .catch((error) => {
            if (active) {
              markMermaidBlocksAsError({ root: document, error });
              console.error('Mermaid 加载失败', error);
            }
          });
      },
    });

    return () => {
      active = false;
      stopObserving();
    };
  }, []);

  return createElement(
    Suspense,
    { fallback: null },
    createElement(LazyDocsContainer, props),
  );
}
