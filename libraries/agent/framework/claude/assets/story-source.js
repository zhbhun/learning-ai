export function storySource(source, { language = 'ts' } = {}) {
  return {
    docs: {
      source: {
        type: 'code',
        language,
        code: source,
      },
    },
  };
}
