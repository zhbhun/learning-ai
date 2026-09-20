import { addons } from 'storybook/manager-api';

addons.setConfig({
  layoutCustomisations: {
    showToolbar: () => false,
    // 阅读器外壳只承载 Docs：Canvas / Controls 内嵌在正文里，不使用 addon 面板
    showPanel: () => false,
  },
});
