import type { StorybookConfig } from '@storybook/html-vite';
import remarkGfm from 'remark-gfm';

import rehypeMermaidFences from './rehype-mermaid-fences.js';
import { roadmapStories } from './roadmap-stories.js';

const config: StorybookConfig = {
  stories: roadmapStories({
    fallback: [
      '../cheatsheets/sample-course/sample-course.stories.ts',
      '../cheatsheets/sample-course/README.mdx',
    ],
  }),
  addons: [
    {
      name: '@storybook/addon-docs',
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeMermaidFences],
          },
        },
      },
    },
  ],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  // 阅读器外壳只承载每课的 Docs 页：进入 documentation mode，让 Storybook 始终以
  // Docs 视图打开课程，不再因同级隐藏 story 把 docs 条目停留在 story 视图的加载态。
  docs: {
    docsMode: true,
  },
  features: {
    backgrounds: false,
    measure: false,
    outline: false,
    viewport: false,
    sidebarOnboardingChecklist: false,
    menuOnboardingChecklist: false,
  },
};

export default config;
