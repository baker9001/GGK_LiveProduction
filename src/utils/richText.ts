const allowedTags = new Set([
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'sup',
  'sub',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'span',
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'hr',
  'div',
  'img'
]);

const globalAllowedAttributes = new Set<string>(['data-equation']);
const globalAllowedAttributes = new Set<string>();

const tagSpecificAllowedAttributes: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
};

const sanitizeElement = (element: Element) => {
  const tagName = element.tagName.toLowerCase();
  if (!allowedTags.has(tagName)) {
    const parent = element.parentNode;
    if (!parent) {
      element.remove();
      return;
    }

    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
    return;
  }

  const allowedAttributes = tagSpecificAllowedAttributes[tagName] || new Set<string>();
  Array.from(element.attributes).forEach(attr => {
    const attrName = attr.name.toLowerCase();
    if (globalAllowedAttributes.has(attrName) || allowedAttributes.has(attrName)) {
      if (tagName === 'a' && attrName === 'href') {
        const value = attr.value.trim();
        if (value.startsWith('javascript:')) {
          element.removeAttribute(attrName);
        }
      }
      return;
    }

    element.removeAttribute(attrName);
  });

  if (tagName === 'a' && !element.getAttribute('rel')) {
    element.setAttribute('rel', 'noopener noreferrer');
  }

  Array.from(element.children).forEach(child => sanitizeElement(child));
};

const withDocument = <T,>(operation: (document: Document) => T, fallback: () => T): T => {
  if (typeof window === 'undefined' || typeof window.document === 'undefined') {
    return fallback();
  }
  return operation(window.document);
};

export const sanitizeRichText = (value: string | null | undefined): string => {
  if (!value) {
    return '';
  }

  return withDocument(
    (document) => {
      const working = document.createElement('div');
      working.innerHTML = value;

      Array.from(working.children).forEach(child => sanitizeElement(child));

      const result = working.innerHTML
        .replace(/\s+class=""/g, '')
        .replace(/<br\s*\/?>\s*(<br\s*\/?>)+/gi, '<br />');

      return result.trim();
    },
    () =>
      value
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/on[a-z]+="[^"]*"/gi, '')
        .trim()
  );
};

export const extractPlainText = (value: string | null | undefined): string => {
  if (!value) {
    return '';
  }

  const sanitized = sanitizeRichText(value);

  return withDocument(
    (document) => {
      const working = document.createElement('div');
      working.innerHTML = sanitized;
      return working.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    },
    () => sanitized.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  );
};

export const isRichTextEmpty = (value: string | null | undefined): boolean => {
  return extractPlainText(value).length === 0;
};

export const mergeRichTextChange = (value: string): string => {
  const sanitized = sanitizeRichText(value);
  if (!sanitized || sanitized === '<p><br></p>' || sanitized === '<div><br></div>') {
    return '';
  }
  return sanitized;
};
