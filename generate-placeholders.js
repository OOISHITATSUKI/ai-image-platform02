const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public', 'showcase');
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

async function createPlaceholder(filename, color) {
    await sharp({
        create: {
            width: 576,
            height: 1024,
            channels: 3,
            background: color
        }
    })
        .jpeg()
        .toFile(path.join(dir, filename));
    console.log(`Created ${filename}`);
}

async function main() {
    await createPlaceholder('before-1.jpg', { r: 100, g: 100, b: 200 });
    await createPlaceholder('after-1.jpg', { r: 200, g: 100, b: 100 });
    await createPlaceholder('before-2.jpg', { r: 100, g: 150, b: 200 });
    await createPlaceholder('after-2.jpg', { r: 200, g: 150, b: 100 });
    await createPlaceholder('before-3.jpg', { r: 150, g: 100, b: 200 });
    await createPlaceholder('after-3.jpg', { r: 150, g: 200, b: 100 });
    console.log('Done');
}

main().catch(console.error);
