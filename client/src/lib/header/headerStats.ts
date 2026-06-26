export type HeaderStatKind = 'readingTime' | 'wordCount' | 'charCount';

export interface HeaderStatOption {
  id: string;
  mobileId: string;
  labelId: string;
  mobileLabelId: string;
  icon: string;
  label: string;
  kind: HeaderStatKind;
  spaced: boolean;
}

export const headerStats: HeaderStatOption[] = [
  {
    id: 'reading-time',
    mobileId: 'mobile-reading-time',
    labelId: 'lbl-min-read',
    mobileLabelId: 'lbl-mobile-min-read',
    icon: 'bi-clock',
    label: 'Min Read',
    kind: 'readingTime',
    spaced: true
  },
  {
    id: 'word-count',
    mobileId: 'mobile-word-count',
    labelId: 'lbl-words',
    mobileLabelId: 'lbl-mobile-words',
    icon: 'bi-text-paragraph',
    label: 'Words',
    kind: 'wordCount',
    spaced: true
  },
  {
    id: 'char-count',
    mobileId: 'mobile-char-count',
    labelId: 'lbl-chars',
    mobileLabelId: 'lbl-mobile-chars',
    icon: 'bi-fonts',
    label: 'Chars',
    kind: 'charCount',
    spaced: false
  }
];
