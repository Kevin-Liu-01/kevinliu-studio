// The script that hands a translated battle its words: globalThis.BATTLE_STRINGS, only the keys its language changes
// (src/i18n index.ts L(code).battle), so every other key keeps the battle's own English.
import crypto from 'node:crypto';
import { L } from '../i18n';

export const battleStrings = (code: string) => `/* kevinliu.studio, ${L(code).name}: the battle's words (src/lib/i18n-battle.ts) */\nglobalThis.BATTLE_STRINGS=${JSON.stringify(L(code).battle).replace(/</g, '\\u003c')};\n`;
export const battleStringsSrc = (code: string) => `${L(code).p('/battle-strings.js')}?v=${crypto.createHash('sha256').update(battleStrings(code)).digest('hex').slice(0, 10)}`;
