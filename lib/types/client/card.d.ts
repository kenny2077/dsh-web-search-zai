import type { ReactElement } from 'react';
import type { CardStore } from './store.ts';
import type { MessageKey } from './locales.ts';
export interface CardProps {
    store: CardStore;
    t: (key: MessageKey) => string;
}
/** DSH supplies React and theme tokens; the form reads the host's shared settings mirror. */
export declare function Card({ store, t }: CardProps): ReactElement;
//# sourceMappingURL=card.d.ts.map