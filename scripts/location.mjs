// Finds location metadata in a shipped file, for the sync scan and the release guard alike.
// Images: an EXIF TIFF block whose first IFD holds the GPS pointer (tag 0x8825). JPEG and AVIF wrap it in "Exif\0\0";
// WebP and PNG store the bare TIFF, so the header is searched directly. XMP is searched for GPS properties.
// Video and audio: the QuickTime and MP4 location atoms.
export const MEDIA = /\.(jpe?g|webp|png|avif|gif|mp4|m4a|mov|webm)$/i;

export function hasLocation(buf) {
  for (const sig of [Buffer.from('II*\0', 'latin1'), Buffer.from('MM\0*', 'latin1')]) {
    for (let at = buf.indexOf(sig); at >= 0; at = buf.indexOf(sig, at + 1)) if (ifdHasGps(buf, at)) return 'GPS in EXIF';
  }
  const t = buf.toString('latin1');
  if (/exif:GPS(Latitude|Longitude)|GPSLatitude/.test(t)) return 'GPS in XMP';
  if (t.includes('\xa9xyz') || t.includes('com.apple.quicktime.location')) return 'location atom';
  return null;
}

function ifdHasGps(buf, tiff) {
  const le = buf[tiff] === 0x49;
  const u16 = (o) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const u32 = (o) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  if (tiff + 8 > buf.length) return false;
  const ifd = tiff + u32(tiff + 4);
  if (ifd + 2 > buf.length) return false;
  const n = u16(ifd);
  if (n === 0 || n > 512 || ifd + 2 + n * 12 > buf.length) return false;
  for (let i = 0; i < n; i++) if (u16(ifd + 2 + i * 12) === 0x8825) return true;
  return false;
}
