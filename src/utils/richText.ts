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
  'strike',
  'del',
  'sup',
  'sub',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'h1',
  'h2',
  'h3',
  'h4',
  'mark',
  'hr',
  'a'
]);

const ALLOWED_CLASSES = new Set([
  'rt-equation',
  'rt-equation-inline',
  'rt-equation-block',
  'rt-equation-frac',
  'rt-equation-frac-num',
  'rt-equation-frac-den',
  'rt-equation-sqrt',
  'rt-equation-sqrt-radicand',
  'rt-highlight-yellow',
  'rt-highlight-green',
  'rt-highlight-pink',
  'rt-highlight-blue',
  'text-left',
  'text-center',
  'text-right',
  'text-justify',
  'text-sm',
  'text-base',
  'text-lg'
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  span: new Set(['class', 'data-equation', 'style']),
  div: new Set(['class', 'data-equation', 'style']),
  mark: new Set(['class']),
  a: new Set(['href', 'target', 'rel']),
  p: new Set(['class', 'style'])
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

/**
 * Get the current cursor position as an offset from the start of text content
 */
export function getCursorPosition(container: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return 0;
  }

  const range = selection.getRangeAt(0);
  if (!container.contains(range.startContainer)) {
    return 0;
  }

  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(container);
  preCaretRange.setEnd(range.startContainer, range.startOffset);

  return preCaretRange.toString().length;
}

/**
 * Set the cursor position to a specific offset from the start of text content
 */
export function setCursorPosition(container: HTMLElement, offset: number): void {
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  let currentOffset = 0;
  let found = false;

  function findOffset(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent || '';
      if (currentOffset + textContent.length >= offset) {
        range.setStart(node, offset - currentOffset);
        range.collapse(true);
        found = true;
        return true;
      }
      currentOffset += textContent.length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of Array.from(node.childNodes)) {
        if (findOffset(child)) {
          return true;
        }
      }
    }
    return false;
  }

  findOffset(container);

  if (found) {
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    // If offset not found, place cursor at the end
    range.selectNodeContents(container);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
