export const ocamlLanguageConfiguration = {
  comments: {
    lineComment: null, // OCaml uses (* ... *) for comments
    blockComment: ['(*', '*)'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '(', close: ')' },
    { open: '[', close: ']' },
    { open: '{', close: '}' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '(*', close: '*)' },
  ],
  surroundingPairs: [
    { open: '(', close: ')' },
    { open: '[', close: ']' },
    { open: '{', close: '}' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  folding: {
    markers: {
      start: /^\s*(\(\*|{\*)\s*#?region\b.*$/,
      end: /^\s*(\*\)|\*})\s*#?endregion\b.*$/,
    },
  },
};

export const ocamlTokensProvider = {
  defaultToken: '',
  tokenPostfix: '.ocaml',

  keywords: [
    'and', 'as', 'assert', 'asr', 'begin', 'class', 'constraint', 'do', 'done',
    'downto', 'else', 'end', 'exception', 'external', 'for', 'fun', 'function',
    'functor', 'if', 'in', 'include', 'inherit', 'initializer', 'lazy', 'let',
    'match', 'method', 'mod', 'module', 'mutable', 'new', 'object', 'of', 'open',
    'or', 'private', 'rec', 'sig', 'struct', 'then', 'to', 'try', 'type', 'val',
    'virtual', 'when', 'while', 'with',
  ],

  typeKeywords: [
    'int', 'float', 'bool', 'string', 'char', 'unit', 'list', 'array', 'option',
    'ref', 'exn',
  ],

  operators: [
    '=', '>', '<', '<=', '>=', '<>', ':', ':=', '->', '+', '-', '*', '/', '@', '^',
    '|', '&', '::', ':>', '$', '%', '!',
  ],

  // Common regular expressions
  symbols: /[=><:@\^&|+\-*\/\~\$%!]+/,

  // The main tokenizer
  tokenizer: {
    root: [
      // Identifiers and keywords
      [/[a-zA-Z_][a-zA-Z0-9_']*/, {
        cases: {
          '@keywords': 'keyword',
          '@typeKeywords': 'type.identifier',
          '@default': 'identifier',
        },
      }],

      // Whitespace and comments
      { include: '@whitespace' },

      // Delimiters and operators
      [/[{}()\[\]]/, '@brackets'],
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': '',
        },
      }],

      // Numbers
      [/\d+\.\d+([eE][-+]?\d+)?[lf]?/, 'number.float'],
      [/\d+[lL]?/, 'number'],

      // Strings
      [/"/, 'string', '@string'],

      // Characters
      [/'[^\\']'/, 'string'],
      [/'/, 'string.invalid'],
    ],

    comment: [
      [/[^\(\*]+/, 'comment'],
      [/\*\)/, 'comment', '@pop'],
      [/\(\*/, 'comment', '@push'],
      [/\(\*|\*\)/, 'comment'],
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],

    whitespace: [
      [/[ \t\r\n]+/, ''],
      [/\(\*/, 'comment', '@comment'],
    ],
  },
};