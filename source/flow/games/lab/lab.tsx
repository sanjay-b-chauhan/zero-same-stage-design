/* The games owner's own harness: the card lab with the same stylesheets as the app (main.tsx), built apart from it. */
import '../../ds/zero-jobs.css';
import '../../ds/tokens.css';
import '../../theme.css';
import '../../ds/b36.css';
import { createRoot } from 'react-dom/client';
import GameLab from '../GameLab';

createRoot(document.getElementById('root')!).render(<GameLab />);
