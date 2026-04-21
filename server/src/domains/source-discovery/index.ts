// Public API for the source-discovery domain
export {
    listPendingHandler,
    approvePendingHandler,
    rejectPendingHandler,
    triggerDiscoveryJobHandler,
} from './source-discovery.controller.js';
export { searchForSources, deduplicateUrls, filterExistingUrls } from './search.service.js';
export type { TavilySearchResult, SearchServiceResult } from './search.service.js';
