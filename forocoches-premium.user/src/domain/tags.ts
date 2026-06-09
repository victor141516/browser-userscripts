export interface TagMatch {
  tag: string;
  start: number;
  end: number;
}

export interface TextTagPart {
  type: "tag" | "text";
  text: string;
  tag?: string;
}

// Multi-word tags must be listed here so they win over the default one-word parser.
export const SPECIAL_TAGS = [
  "tema serio",
];

const SINGLE_WORD_TAG_PATTERN = /^[A-Za-z0-9_-]+/;

const SPECIAL_TAG_PATTERNS = SPECIAL_TAGS.map((tag) => ({
  tag,
  pattern: new RegExp(
    `^${escapeRegExp(tag).replace(/\\ /g, "\\s+")}(?![\\p{L}\\p{N}_-])`,
    "iu",
  ),
}));

export function normalizeTag(tag: string): string {
  return tag.replace(/\s+/g, " ").trim().toLowerCase();
}

export function findTagsInText(source: string | null | undefined): TagMatch[] {
  const text = String(source || "");
  const matches: TagMatch[] = [];

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "+") {
      continue;
    }

    const tagMatch = matchTagAfterPlus(text.slice(index + 1));

    if (!tagMatch) {
      continue;
    }

    matches.push({
      tag: tagMatch.tag,
      start: index,
      end: index + 1 + tagMatch.length,
    });
    index += tagMatch.length;
  }

  return matches;
}

export function getTagsFromText(
  source: string | null | undefined,
): string[] {
  return Array.from(new Set(findTagsInText(source).map((match) => match.tag)));
}

export function splitTextByTags(source: string): TextTagPart[] {
  const parts: TextTagPart[] = [];
  let currentIndex = 0;

  for (const match of findTagsInText(source)) {
    if (match.start > currentIndex) {
      parts.push({
        type: "text",
        text: source.slice(currentIndex, match.start),
      });
    }

    parts.push({
      type: "tag",
      text: source.slice(match.start, match.end),
      tag: match.tag,
    });
    currentIndex = match.end;
  }

  if (currentIndex < source.length) {
    parts.push({
      type: "text",
      text: source.slice(currentIndex),
    });
  }

  return parts;
}

function matchTagAfterPlus(source: string): { tag: string; length: number } | null {
  for (const special of SPECIAL_TAG_PATTERNS) {
    const match = source.match(special.pattern);

    if (match?.[0]) {
      return {
        tag: normalizeTag(special.tag),
        length: match[0].length,
      };
    }
  }

  const wordMatch = source.match(SINGLE_WORD_TAG_PATTERN);

  if (!wordMatch?.[0]) {
    return null;
  }

  return {
    tag: normalizeTag(wordMatch[0]),
    length: wordMatch[0].length,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
