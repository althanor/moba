import { boot } from './application/composition/boot';
import './style.css';
const dispose = boot();
if (import.meta.hot) import.meta.hot.dispose(dispose);
