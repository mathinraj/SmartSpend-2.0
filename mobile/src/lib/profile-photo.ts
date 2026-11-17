import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { withLockSuppressed } from '@/lib/lock';

/** Profile photos are shown at most ~100 pt; 512 px covers high-density screens with room to spare. */
const PHOTO_SIZE = 512;
/** Large camera photos are downsampled while decoding so the full-size bitmap never sits in memory. */
const DECODE_LIMIT = 2048;

/** The system photo picker with a square crop; `null` if it isn't available on this phone. */
async function pickWithPhotoPicker(): Promise<{ uri: string; cropped: boolean } | null | 'cancelled'> {
  try {
    const result = await withLockSuppressed(() =>
      ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 1 })
    );
    if (result.canceled || !result.assets[0]) return 'cancelled';
    return { uri: result.assets[0].uri, cropped: true };
  } catch (error) {
    // Some phones (and emulators) ship without Android's photo picker; fall back to the file picker.
    if (String(error).includes('ActivityNotFoundException')) return null;
    throw error;
  }
}

async function pickWithFilePicker(): Promise<{ uri: string; cropped: boolean } | 'cancelled'> {
  const picked = await withLockSuppressed(() => File.pickFileAsync({ mimeTypes: 'image/*' }));
  if (picked.canceled) return 'cancelled';
  return { uri: picked.result.uri, cropped: false };
}

/**
 * Lets the user pick a photo, then saves a square 512×512 JPEG in the app's documents folder. Photos
 * that weren't cropped in the picker are center-cropped. Returns the saved file's URI, or `null` if cancelled.
 */
export async function pickProfilePhoto(): Promise<string | null> {
  const picked = (await pickWithPhotoPicker()) ?? (await pickWithFilePicker());
  if (picked === 'cancelled') return null;

  const loaded = await ImageManipulator.manipulate(picked.uri, { maxWidth: DECODE_LIMIT, maxHeight: DECODE_LIMIT }).renderAsync();
  const context = ImageManipulator.manipulate(loaded);
  if (!picked.cropped) {
    const side = Math.min(loaded.width, loaded.height);
    context.crop({ originX: (loaded.width - side) / 2, originY: (loaded.height - side) / 2, width: side, height: side });
  }
  const image = await context.resize({ width: PHOTO_SIZE, height: PHOTO_SIZE }).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });

  // The manipulator writes to the cache, which Android may clear; keep a copy in documents instead.
  const target = new File(Paths.document, `profile-${Date.now()}.jpg`);
  await new File(saved.uri).copy(target);
  return target.uri;
}

/** Deletes a previously saved profile photo; missing files are ignored. */
export function deleteProfilePhoto(uri: string | null) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already gone; nothing to clean up.
  }
}
