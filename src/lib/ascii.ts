// A card's art as text for the Machine view: its subject (media/<id>/pop.webp, the cut-out every card prints, or its
// poster when it has none) read at build, one character per cell. A more opaque, brighter cell takes a denser
// character, so the subject stands out of the dark terminal and its transparent ground stays blank. Nothing is decoded
// in the browser: the page carries the text.
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';

const RAMP = ' .:-=+*#%@';
// Katagami Mono's advance is 0.625 em and the art is set at line-height 1, so a cell is 0.625 as wide as it is tall
const CELL = 0.625;
const cache = new Map<string, Promise<string>>();

function source(id: string) {
  const ex = path.join(process.cwd(), 'public/ex');
  const pop = path.join(ex, 'media', id, 'pop.webp');
  return fs.existsSync(pop) ? pop : path.join(ex, 'posters', `${id}.webp`);
}

/** The card's art `cols` characters wide, its rows joined by newlines, trailing blanks cut. */
export function asciiArt(id: string, cols: number): Promise<string> {
  const key = `${id}:${cols}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = (async () => {
      const img = sharp(source(id)).ensureAlpha();
      const { width = 1, height = 1 } = await img.metadata();
      const rows = Math.max(1, Math.round((cols * (height / width) * CELL)));
      const { data } = await img.resize(cols, rows, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
      // presence first, brightness second, so a dark subject (Claude of Tanks' hulls) still reads on the dark ground;
      // then each card's range is stretched to the whole ramp
      const v: number[] = [];
      for (let i = 0; i < cols * rows * 4; i += 4) {
        const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
        v.push((data[i + 3] / 255) * (0.35 + 0.65 * lum));
      }
      const top = Math.max(...v) || 1;
      const out: string[] = [];
      for (let y = 0; y < rows; y++) {
        let line = '';
        for (let x = 0; x < cols; x++) line += RAMP[Math.min(RAMP.length - 1, Math.round((v[y * cols + x] / top) * (RAMP.length - 1)))];
        out.push(line.replace(/\s+$/, ''));
      }
      // drop blank rows at the top and bottom, so the subject sits where its art is
      while (out.length && !out[0]) out.shift();
      while (out.length && !out[out.length - 1]) out.pop();
      return out.join('\n');
    })();
    cache.set(key, hit);
  }
  return hit;
}
