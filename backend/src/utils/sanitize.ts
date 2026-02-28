import DOMPurify from 'isomorphic-dompurify';

/**
 * sanitize.ts — XSS sanitization utility for the backend.
 *
 * Uses isomorphic-dompurify (JSDOM on Node.js) — the same engine browsers use.
 * This correctly handles attribute-level vectors that regex cannot:
 *   - <img src=x onerror=alert(1)>
 *   - <a href="javascript:void(0)">
 *   - encoded variants (%3Cscript%3E, &#x3C;script&#x3E;)
 *
 * Usage:
 *   sanitizeHtml(input)       — for rich-text fields (project scope)
 *   sanitizePlainText(input)  — for plain text fields (names, labels)
 */

/**
 * Sanitize scoped HTML — allows safe formatting tags, blocks all script vectors.
 */
export function sanitizeHtml(input: unknown): string {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input.trim(), {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'u', 's', 'p', 'br',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'span',
    ],
    ALLOWED_ATTR: [],
  }) as string;
}

/**
 * Sanitize plain text — strips ALL HTML tags.
 */
export function sanitizePlainText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input.trim(), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }) as string;
}
