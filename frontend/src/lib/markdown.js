// Some models write LaTeX-style \( \) / \[ \] delimiters despite being told to use
// $ $ / $$ $$ (what remark-math actually parses). Normalize defensively.
export function normalizeMathDelimiters(text) {
  return text
    .replace(/\\\[(.+?)\\\]/gs, (_, inner) => `$$${inner}$$`)
    .replace(/\\\((.+?)\\\)/gs, (_, inner) => `$${inner}$`);
}
