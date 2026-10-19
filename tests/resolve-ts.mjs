// Membolehkan `node --test` memuat berkas .ts proyek apa adanya: impor relatif tanpa ekstensi
// ('./efek') dan alias '@/' (menunjuk ke src/) diselesaikan seperti yang dilakukan Metro dan tsc.
import { register } from 'node:module';

register('./resolve-ts-hook.mjs', import.meta.url);
