/** Report block identifiers — determine sections in production report (D-026) */
export const REPORT_BLOCKS = {
  ACTORS: 'A',           // АКТЁРЫ
  CREW: 'P',             // ЦЕХА
  TRANSPORT: 'T',        // СПЕЦТРАНСПОРТ
  EXTRA_STAFF: 'D',      // ДОП.ПЕРСОНАЛ
  EQUIPMENT: 'E',        // ОБОРУДОВАНИЕ
  EXTRAS: 'M',           // АМС (массовка)
  COSTUME: 'K',          // КОСТЮМ
  PROPS: 'R',            // РЕКВИЗИТ
  LOCATION: 'L',         // ЛОКАЦИЯ
} as const;

export type ReportBlock = (typeof REPORT_BLOCKS)[keyof typeof REPORT_BLOCKS];

/** Display labels for report blocks */
export const REPORT_BLOCK_LABELS: Record<ReportBlock, string> = {
  [REPORT_BLOCKS.ACTORS]: 'АКТЁРЫ',
  [REPORT_BLOCKS.CREW]: 'ЦЕХА',
  [REPORT_BLOCKS.TRANSPORT]: 'СПЕЦТРАНСПОРТ',
  [REPORT_BLOCKS.EXTRA_STAFF]: 'ДОП.ПЕРСОНАЛ',
  [REPORT_BLOCKS.EQUIPMENT]: 'ОБОРУДОВАНИЕ',
  [REPORT_BLOCKS.EXTRAS]: 'АМС',
  [REPORT_BLOCKS.COSTUME]: 'КОСТЮМ',
  [REPORT_BLOCKS.PROPS]: 'РЕКВИЗИТ',
  [REPORT_BLOCKS.LOCATION]: 'ЛОКАЦИЯ',
};

/** All blocks in display order */
export const REPORT_BLOCK_ORDER: readonly ReportBlock[] = [
  REPORT_BLOCKS.ACTORS,
  REPORT_BLOCKS.CREW,
  REPORT_BLOCKS.TRANSPORT,
  REPORT_BLOCKS.EXTRA_STAFF,
  REPORT_BLOCKS.EQUIPMENT,
  REPORT_BLOCKS.EXTRAS,
  REPORT_BLOCKS.COSTUME,
  REPORT_BLOCKS.PROPS,
  REPORT_BLOCKS.LOCATION,
] as const;
