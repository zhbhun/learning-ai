/*
把命令式 Canvas 实例接到 Storybook args 上。舞台和实例只创建一次，后续参数
变化只调用 apply；派生值由 readout 显示，离开当前 Docs 页时调用实例的 dispose。
*/

const READOUT_INTERVAL = 100;

/**
 * @template Args
 * @template Snapshot
 * @template Instance
 * @param {{
 *   create: (canvas: HTMLCanvasElement, emit: (snapshot: Snapshot) => void) => Instance,
 *   apply: (instance: Instance, args: Args) => void,
 *   readout?: (snapshot: Snapshot) => Array<[string, unknown]>,
 *   captions?: string[]
 * }} options
 * @returns {(args: Args) => HTMLDivElement}
 */
export function canvasStory({ create, apply, readout, captions }) {
  let stage;
  let instance;
  let readoutEl;
  let lastPaint = 0;

  return (args) => {
    if (!stage) {
      stage = document.createElement('div');
      stage.className = 'cs-stage';

      const canvas = document.createElement('canvas');
      stage.append(canvas);

      captions?.forEach((text, index) => {
        const caption = document.createElement('p');
        caption.className =
          index === 0
            ? 'cs-caption cs-caption--left'
            : 'cs-caption cs-caption--right';
        caption.textContent = text;
        stage.append(caption);
      });

      if (readout) {
        readoutEl = document.createElement('dl');
        readoutEl.className = 'cs-readout';
        stage.append(readoutEl);
      }

      instance = create(canvas, (snapshot) => {
        if (!readoutEl) {
          return;
        }

        const now = performance.now();
        if (now - lastPaint < READOUT_INTERVAL) {
          return;
        }
        lastPaint = now;
        paint(readoutEl, readout(snapshot));
      });

      const observedStage = stage;
      const observedInstance = instance;
      requestAnimationFrame(() => {
        const parent = observedStage.parentElement;
        if (!parent) {
          return;
        }

        const observer = new MutationObserver(() => {
          if (!observedStage.isConnected) {
            observer.disconnect();
            observedInstance?.dispose?.();

            if (stage === observedStage) {
              stage = undefined;
              instance = undefined;
              readoutEl = undefined;
              lastPaint = 0;
            }
          }
        });
        observer.observe(parent, { childList: true });
      });
    }

    lastPaint = 0;
    apply(instance, args);
    return stage;
  };
}

function paint(root, entries) {
  if (root.childElementCount !== entries.length * 2) {
    root.replaceChildren();

    for (const [label] of entries) {
      const term = document.createElement('dt');
      term.textContent = label;
      root.append(term, document.createElement('dd'));
    }
  }

  const terms = root.querySelectorAll('dt');
  const values = root.querySelectorAll('dd');

  entries.forEach(([label, value], index) => {
    const text = String(value);

    if (terms[index].textContent !== label) {
      terms[index].textContent = label;
    }

    if (values[index].textContent !== text) {
      values[index].textContent = text;
    }
  });
}
