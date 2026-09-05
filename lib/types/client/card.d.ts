/**
 * Native settings card for the DSH web settings panel.
 *
 * Renders billing mode, API key, and advanced endpoint controls. The card
 * reads host state through a {@link CardStore} subscription and writes only
 * through DSH settings and credentials APIs — it never reads a stored key
 * back into the browser.
 *
 * @module dsh-web-search-zai/client/card
 */
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