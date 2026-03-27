/**
 * Cleanup expired guest images
 * Purges guest images older than 24h that haven't been unlocked.
 * Run via cron every 15 minutes.
 */

import { purgeExpiredGuestImages } from '../lib/db/guest_images';

const purged = purgeExpiredGuestImages();
if (purged > 0) {
    console.log(`Purged ${purged} expired generation records`);
} else {
    console.log('No expired guest images to purge');
}
