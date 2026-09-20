import type { Preview } from '@storybook/html-vite';

import '../assets/docs-layout.css';
import '../assets/story-canvas.css';
import { MermaidDocsContainer } from './mermaid-docs-container.js';

const preview: Preview = {
  parameters: {
    controls: {
      expanded: true,
    },
    docs: {
      container: MermaidDocsContainer,
      toc: {
        title: '本页目录',
        headingSelector: 'h2, h3',
      },
      canvas: {
        sourceState: 'hidden',
      },
      codePanel: false,
    },
  },
};

export default preview;
