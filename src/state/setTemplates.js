// The distinct FRONT designs a user must supply for each set. Physical sets
// repeat most tiles (suits/winds/dragons x4), so these are the unique faces
// to upload, one graphic per design. Filenames are the recommended names for
// automatic assignment on batch upload.

function range(prefix, n) {
  return Array.from({ length: n }, (_, i) => `${prefix}-${String(i + 1).padStart(2, '0')}`)
}

const SUITS = [
  ...range('crak', 9),
  'red-dragon',
  ...range('bam', 9),
  'green-dragon',
  ...range('dot', 9),
  'soap',
]
const WINDS = ['north', 'east', 'west', 'south']

export const SET_TEMPLATES = {
  '160': {
    label: '160-tile set',
    total: 160,
    groups: [
      { name: 'Crak', files: [...range('crak', 9), 'red-dragon'], note: '1–9 + Red Dragon' },
      { name: 'Bam', files: [...range('bam', 9), 'green-dragon'], note: '1–9 + Green Dragon' },
      { name: 'Dot', files: [...range('dot', 9), 'soap'], note: '1–9 + Soap (White Dragon)' },
      { name: 'Winds', files: WINDS, note: 'N · E · W · S' },
      { name: 'Flowers', files: range('flower', 8), note: '8 designs' },
      { name: 'Jokers', files: range('joker', 10), note: '10 designs' },
      { name: 'Blanks', files: range('blank', 6), note: '6 spares' },
    ],
  },
  '166': {
    label: '166-tile set',
    total: 166,
    groups: [
      { name: 'Crak', files: [...range('crak', 9), 'red-dragon'], note: '1–9 + Red Dragon' },
      { name: 'Bam', files: [...range('bam', 9), 'green-dragon'], note: '1–9 + Green Dragon' },
      { name: 'Dot', files: [...range('dot', 9), 'soap'], note: '1–9 + Soap (White Dragon)' },
      { name: 'Winds', files: WINDS, note: 'N · E · W · S' },
      { name: 'Flowers', files: range('flower', 16), note: '16 designs' },
      { name: 'Jokers', files: range('joker', 10), note: '10 designs' },
      { name: 'Blanks', files: range('blank', 4), note: '4 spares' },
    ],
  },
}

export function templateDesignCount(key) {
  const t = SET_TEMPLATES[key]
  if (!t) return 0
  return t.groups.reduce((sum, g) => sum + g.files.length, 0)
}

export const ALL_SUIT_FILES = [...SUITS, ...WINDS]
