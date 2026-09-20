function hasClass(node, className) {
  const classes = node.properties?.className ?? [];
  return Array.isArray(classes)
    ? classes.includes(className)
    : classes.split(/\s+/).includes(className);
}

function visit(node) {
  if (node.type === 'element' && node.tagName === 'pre') {
    const code = node.children?.[0];

    if (
      code?.type === 'element' &&
      code.tagName === 'code' &&
      hasClass(code, 'language-mermaid')
    ) {
      node.properties = { ...node.properties, className: ['mermaid'] };
      node.children = code.children;
      return;
    }
  }

  for (const child of node.children ?? []) {
    visit(child);
  }
}

export default function rehypeMermaidFences() {
  return visit;
}
