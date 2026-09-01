import { endLine, outerStartLine, sectionStartLine } from './markers.ts';
import type { Document } from './types.ts';

/**
 * Document back to text. The managed region comes first, the free zone below
 * it, exactly one blank line between every block — so a second render of a
 * rendered document is a no-op, which is what makes `check` a usable CI gate.
 */
export function render(doc: Document): string {
  const out: string[] = [];

  if (doc.hasRegion || doc.header.length > 0 || doc.sections.length > 0) {
    out.push(outerStartLine(), ...doc.header);

    for (const section of doc.sections) {
      out.push(
        '',
        sectionStartLine(section.stack, section.version),
        ...section.lines,
        endLine()
      );
    }

    out.push('', endLine());
  }

  if (doc.freeZone.length > 0) {
    if (out.length > 0) out.push('');
    out.push(...doc.freeZone);
  }

  return out.length > 0 ? `${out.join('\n')}\n` : '';
}
