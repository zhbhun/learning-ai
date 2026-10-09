/* 命令式 Canvas 共用的尺寸观察与离屏渲染生命周期。 */

export function readCanvasSize(canvas) {
  const target = canvas.parentElement ?? canvas;

  return {
    width: Math.max(1, Math.floor(target.clientWidth ?? canvas.width ?? 1)),
    height: Math.max(1, Math.floor(target.clientHeight ?? canvas.height ?? 1)),
  };
}

export function createResizeObserver(
  canvas,
  resize,
  { ResizeObserverClass = globalThis.ResizeObserver } = {},
) {
  if (!ResizeObserverClass) {
    throw new Error('当前浏览器不支持 ResizeObserver。');
  }

  const observer = new ResizeObserverClass(resize);
  observer.observe(canvas.parentElement ?? canvas);
  return observer;
}

export function createRenderLoop(
  element,
  frame,
  {
    rootMargin = '200px 0px',
    runtimeDocument = element.ownerDocument ?? globalThis.document,
    runtimeWindow = runtimeDocument?.defaultView ?? globalThis.window,
    IntersectionObserverClass =
      runtimeWindow?.IntersectionObserver ?? globalThis.IntersectionObserver,
  } = {},
) {
  if (!runtimeWindow?.requestAnimationFrame || !runtimeWindow.cancelAnimationFrame) {
    throw new Error('当前浏览器不支持 requestAnimationFrame。');
  }
  if (!IntersectionObserverClass) {
    throw new Error('当前浏览器不支持 IntersectionObserver。');
  }

  let animationId = 0;
  let lastTime = 0;
  let nearViewport = false;
  let running = false;
  let disposed = false;

  function tick(time) {
    if (!running) {
      return;
    }

    const delta = lastTime ? (time - lastTime) / 1000 : 0;
    lastTime = time;
    frame(delta);

    if (running) {
      animationId = runtimeWindow.requestAnimationFrame(tick);
    }
  }

  function start() {
    if (disposed || running) {
      return;
    }

    running = true;
    lastTime = 0;
    animationId = runtimeWindow.requestAnimationFrame(tick);
  }

  function stop() {
    if (!running) {
      return;
    }

    running = false;
    runtimeWindow.cancelAnimationFrame(animationId);
    animationId = 0;
    lastTime = 0;
  }

  function syncRunningState() {
    if (nearViewport && runtimeDocument?.visibilityState !== 'hidden') {
      start();
    } else {
      stop();
    }
  }

  const intersectionObserver = new IntersectionObserverClass(
    (entries) => {
      nearViewport = entries.at(-1)?.isIntersecting ?? false;
      syncRunningState();
    },
    { rootMargin },
  );

  intersectionObserver.observe(element);
  runtimeDocument?.addEventListener?.('visibilitychange', syncRunningState);

  return {
    renderOnce() {
      if (!disposed) {
        frame(0);
      }
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      stop();
      intersectionObserver.disconnect();
      runtimeDocument?.removeEventListener?.(
        'visibilitychange',
        syncRunningState,
      );
    },
  };
}
