const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'div',
  'span',
  'strong',
  'em',
  'b',
  'i',
  'u',
  's',
  'sup',
  'sub',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code'
]);

const ALLOWED_CLASSES = new Set([
  'rt-equation',
  'rt-equation-inline',
  'rt-equation-block',
  'rt-equation-frac',
  'rt-equation-frac-num',
  'rt-equation-frac-den',
  'rt-equation-sqrt',
  'rt-equation-sqrt-radicand'
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  span: new Set(['class', 'data-equation']),
  div: new Set(['class', 'data-equation'])
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(str: string): string {
  return escapeHtml(str).replace(/`/g, '&#96;');
}

function hasDocument(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

function sanitizeNode(node: Node, doc: Document) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      const textNode = doc.createTextNode(element.textContent || '');
      element.replaceWith(textNode);
      return;
    }

    const allowedAttrs = ALLOWED_ATTRIBUTES[tagName] || new Set<string>();
    Array.from(element.attributes).forEach(attr => {
      if (!allowedAttrs.has(attr.name)) {
        if (attr.name === 'class') {
          const filtered = attr.value
            .split(/\s+/)
            .filter(cls => ALLOWED_CLASSES.has(cls));
          if (filtered.length > 0) {
            element.setAttribute('class', filtered.join(' '));
          } else {
            element.removeAttribute('class');
          }
        } else {
          element.removeAttribute(attr.name);
        }
      } else if (attr.name === 'data-equation') {
        element.setAttribute(attr.name, escapeAttribute(attr.value));
      }
    });

    Array.from(element.childNodes).forEach(child => sanitizeNode(child, doc));
  } else if (node.nodeType === Node.COMMENT_NODE) {
    node.parentNode?.removeChild(node);
  }
}

export function sanitizeRichText(html: string): string {
  if (!html) return '';
  if (!hasDocument()) {
    return html;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;
  Array.from(body.childNodes).forEach(child => sanitizeNode(child, doc));
  return body.innerHTML;
}

export function getPlainTextFromRichText(html: string): string {
  if (!html) return '';
  if (!hasDocument()) {
    return html.replace(/<[^>]+>/g, ' ');
  }
  const sanitized = sanitizeRichText(html);
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${sanitized}</div>`, 'text/html');
  return doc.body.textContent || '';
}

function extractBetweenBraces(value: string, startIndex: number) {
  let depth = 0;
  let content = '';
  let index = startIndex;

  if (value[index] !== '{') {
    return { content: '', nextIndex: index };
  }

  depth = 1;
  index += 1;

  while (index < value.length && depth > 0) {
    const char = value[index];
    if (char === '{') {
      depth += 1;
      content += char;
    } else if (char === '}') {
      depth -= 1;
      if (depth > 0) {
        content += char;
      }
    } else {
      content += char;
    }
    index += 1;
  }

  return { content, nextIndex: index };
}

function parseEquationSegment(value: string, startIndex: number): { html: string; nextIndex: number } {
  let html = '';
  let index = startIndex;

  while (index < value.length) {
    const char = value[index];

    if (char === '}') {
      break;
    }

    if (char === '\\') {
      if (value.startsWith('\\frac{', index)) {
        const first = extractBetweenBraces(value, index + 5);
        const second = extractBetweenBraces(value, first.nextIndex);
        if (first.content && second.content) {
          const num = parseEquationSegment(first.content, 0).html;
          const den = parseEquationSegment(second.content, 0).html;
          html += `<span class="rt-equation-frac"><span class="rt-equation-frac-num">${num}</span><span class="rt-equation-frac-den">${den}</span></span>`;
          index = second.nextIndex;
          continue;
        }
      }

      if (value.startsWith('\\sqrt{', index)) {
        const content = extractBetweenBraces(value, index + 5);
        if (content.content) {
          const inner = parseEquationSegment(content.content, 0).html;
          html += `<span class="rt-equation-sqrt"><span class="rt-equation-sqrt-radicand">${inner}</span></span>`;
          index = content.nextIndex;
          continue;
        }
      }

      html += escapeHtml('\\');
      index += 1;
      continue;
    }

    if (char === '^' || char === '_') {
      const tag = char === '^' ? 'sup' : 'sub';
      index += 1;
      if (value[index] === '{') {
        const group = extractBetweenBraces(value, index);
        const parsed = parseEquationSegment(group.content, 0).html;
        html += `<${tag}>${parsed}</${tag}>`;
        index = group.nextIndex;
      } else if (index < value.length) {
        html += `<${tag}>${escapeHtml(value[index])}</${tag}>`;
        index += 1;
      }
      continue;
    }

    if (char === '\n') {
      html += '<br />';
      index += 1;
      continue;
    }

    html += escapeHtml(char);
    index += 1;
  }

  return { html, nextIndex: index };
}

export function convertEquationInputToHtml(input: string, block: boolean = false): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }
  const parsed = parseEquationSegment(trimmed, 0).html;
  const wrapperClass = block ? 'rt-equation rt-equation-block' : 'rt-equation rt-equation-inline';
  return `<span class="${wrapperClass}" data-equation="${escapeAttribute(trimmed)}">${parsed}</span>`;
}

export function restoreSelection(range: Range | null) {
  if (!range) return;
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
}

export function saveSelection(container: HTMLElement): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) {
    return null;
  }
  return range.cloneRange();
}

export function insertHtmlAtCaret(html: string, container: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    container.focus();
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const fragment = document.createDocumentFragment();
  let node: ChildNode | null;
  while ((node = temp.firstChild)) {
    fragment.appendChild(node);
  }
  range.insertNode(fragment);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function ensureParagraphStructure(container: HTMLElement) {
  if (!container.innerHTML || container.innerHTML === '<br>') {
    container.innerHTML = '<p><br /></p>';
  }
}
