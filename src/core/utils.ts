/**
 * Utility functions for the ORM
 */

/**
 * Convert camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Convert snake_case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Simple pluralization (basic implementation)
 * For production, consider using a library like 'pluralize'
 */
export function pluralize(word: string): string {
  const rules: [RegExp, string][] = [
    [/person$/i, 'people'],
    [/child$/i, 'children'],
    [/(quiz)$/i, '$1zes'],
    [/^(ox)$/i, '$1en'],
    [/([m|l])ouse$/i, '$1ice'],
    [/(matr|vert|ind)ix|ex$/i, '$1ices'],
    [/(x|ch|ss|sh)$/i, '$1es'],
    [/([^aeiouy]|qu)y$/i, '$1ies'],
    [/(hive)$/i, '$1s'],
    [/(?:([^f])fe|([lr])f)$/i, '$1$2ves'],
    [/sis$/i, 'ses'],
    [/([ti])um$/i, '$1a'],
    [/(buffal|tomat)o$/i, '$1oes'],
    [/(bu)s$/i, '$1ses'],
    [/(alias|status)$/i, '$1es'],
    [/(octop|vir)us$/i, '$1i'],
    [/(ax|test)is$/i, '$1es'],
    [/s$/i, 's'],
  ];

  for (const [pattern, replacement] of rules) {
    if (pattern.test(word)) {
      return word.replace(pattern, replacement);
    }
  }

  return word + 's';
}

/**
 * Simple singularization (basic implementation)
 * For production, consider using a library like 'pluralize'
 */
export function singularize(word: string): string {
  const rules: [RegExp, string][] = [
    [/people$/i, 'person'],
    [/children$/i, 'child'],
    [/(quiz)zes$/i, '$1'],
    [/(matr)ices$/i, '$1ix'],
    [/(vert|ind)ices$/i, '$1ex'],
    [/^(ox)en/i, '$1'],
    [/(alias|status)es$/i, '$1'],
    [/(octop|vir)i$/i, '$1us'],
    [/(cris|ax|test)es$/i, '$1is'],
    [/(shoe)s$/i, '$1'],
    [/(o)es$/i, '$1'],
    [/(bus)es$/i, '$1'],
    [/([m|l])ice$/i, '$1ouse'],
    [/(x|ch|ss|sh)es$/i, '$1'],
    [/(m)ovies$/i, '$1ovie'],
    [/(s)eries$/i, '$1eries'],
    [/([^aeiouy]|qu)ies$/i, '$1y'],
    [/([lr])ves$/i, '$1f'],
    [/(tive)s$/i, '$1'],
    [/(hive)s$/i, '$1'],
    [/([^f])ves$/i, '$1fe'],
    [/(^analy)ses$/i, '$1sis'],
    [/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$/i, '$1$2sis'],
    [/([ti])a$/i, '$1um'],
    [/(n)ews$/i, '$1ews'],
    [/s$/i, ''],
  ];

  for (const [pattern, replacement] of rules) {
    if (pattern.test(word)) {
      return word.replace(pattern, replacement);
    }
  }

  return word;
}

/**
 * Convert class name to table name
 * e.g., User -> users, BlogPost -> blog_posts
 */
export function classToTableName(className: string): string {
  const snakeCase = toSnakeCase(className);
  return pluralize(snakeCase);
}
