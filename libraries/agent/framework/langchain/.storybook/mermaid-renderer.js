let diagramCount = 0;

function createDiagramId() {
  diagramCount += 1;
  return `mermaid-diagram-${diagramCount}`;
}

export function hasMermaidBlocks(root = document) {
  return root.querySelector('pre.mermaid') !== null;
}

function hasPendingMermaidBlocks(root) {
  return root.querySelector('pre.mermaid:not([data-mermaid-state])') !== null;
}

export function observeMermaidBlocks({
  root = document,
  MutationObserverClass = MutationObserver,
  render,
}) {
  let isRendering = false;
  let rerunRequested = false;

  const renderIfPresent = () => {
    if (isRendering) {
      rerunRequested = true;
      return;
    }

    if (!hasPendingMermaidBlocks(root)) {
      return;
    }

    isRendering = true;
    let rendering;

    try {
      rendering = render();
    } catch (error) {
      isRendering = false;
      throw error;
    }

    Promise.resolve(rendering)
      .catch((error) => {
        console.error('Mermaid 渲染调度失败', error);
      })
      .finally(() => {
        isRendering = false;

        if (rerunRequested) {
          rerunRequested = false;
          renderIfPresent();
        }
      });
  };
  const observer = new MutationObserverClass(renderIfPresent);

  observer.observe(root.body ?? root, {
    childList: true,
    subtree: true,
  });
  renderIfPresent();

  return () => observer.disconnect();
}

function markBlockAsError(block, error) {
  block.classList.add('mermaid-diagram', 'mermaid-diagram-error');
  block.dataset.mermaidState = 'error';
  block.dataset.mermaidError =
    error instanceof Error ? error.message : String(error);
}

export function markMermaidBlocksAsError({ root = document, error }) {
  const blocks = root.querySelectorAll(
    'pre.mermaid:not([data-mermaid-state])',
  );

  for (const block of blocks) {
    markBlockAsError(block, error);
  }
}

export async function renderMermaidBlocks({
  root = document,
  mermaid,
  createId = createDiagramId,
  isActive = () => true,
}) {
  const blocks = root.querySelectorAll('pre.mermaid');

  for (const block of blocks) {
    if (block.dataset.mermaidState) {
      continue;
    }

    const rawSource = block.textContent;
    const source = rawSource.trim();

    block.classList.add('mermaid-diagram');
    block.dataset.mermaidState = 'rendering';

    try {
      const { svg, bindFunctions } = await mermaid.render(createId(), source);

      if (
        !isActive() ||
        block.dataset.mermaidState !== 'rendering' ||
        block.textContent !== rawSource
      ) {
        if (isActive() && block.dataset.mermaidState === 'rendering') {
          delete block.dataset.mermaidState;
        }
        continue;
      }

      block.innerHTML = svg;
      block.dataset.mermaidState = 'rendered';
      bindFunctions?.(block);
    } catch (error) {
      if (
        !isActive() ||
        block.dataset.mermaidState !== 'rendering' ||
        block.textContent !== rawSource
      ) {
        if (isActive() && block.dataset.mermaidState === 'rendering') {
          delete block.dataset.mermaidState;
        }
        continue;
      }

      block.textContent = rawSource;
      markBlockAsError(block, error);
    }
  }
}
