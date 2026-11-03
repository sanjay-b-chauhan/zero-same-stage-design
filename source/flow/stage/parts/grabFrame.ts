/* One frame of the screen, as a JPEG data URL. b14 (his note, 2 Nov: "no real functiaonlity please lets fake it untill we make it"):
   never a real capture, so Chrome's screen picker never opens. The frame is the page itself, drawn by deskShot. */
import { grabScreen } from '../../pip/frame';

export async function grabFrame(_from: Element | null): Promise<string | null> {
  const f = await grabScreen();
  return f?.url ?? null;
}
