// ------------------------------------------------------------
// Components
// ------------------------------------------------------------
import { BisouBisou } from './components/bisou/bisou.component.js'

// ------------------------------------------------------------
// Prerender
// ------------------------------------------------------------
await Promise.allSettled([customElements.whenDefined('bisou')])

document.body.dataset.state = 'ready'
