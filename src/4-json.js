const sharp = require('sharp');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const cv = require('opencv.js');

// Function to get the target note
function getTargetNote(array, target) {
    const characters = ['G', 'F', 'E', 'D', 'C', 'B', 'A', 'G', 'F'];

    // Find the closest character in the array
    let closestIndex = 0;
    let closestDistance = Math.abs(target - array[0]);
    for (let i = 1; i < array.length; i++) {
        let distance = Math.abs(target - array[i]);
        if (distance < closestDistance) {
            closestIndex = i;
            closestDistance = distance;
        }
    }
    return characters[closestIndex % characters.length];
}

async function processImage(imagePath, outputPath) {
    // Read top 5 Y coordinates from bars.json
    const barsData = JSON.parse(fs.readFileSync('bars.json', 'utf-8'));
    const top5YCoordinates = barsData.top5YCoordinates;
    console.log('top5YCoordinates', top5YCoordinates);

    const imageBuffer = await sharp(imagePath).toBuffer();
    const img = await loadImage(imageBuffer);

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const src = cv.matFromImageData(imageData);

    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

    const binary = new cv.Mat();
    cv.threshold(src, binary, 128, 255, cv.THRESH_BINARY_INV);

    const horizontalKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(30, 1));
    const detectedLines = new cv.Mat();
    cv.morphologyEx(binary, detectedLines, cv.MORPH_OPEN, horizontalKernel);

    const subtracted = new cv.Mat();
    cv.subtract(binary, detectedLines, subtracted);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(subtracted, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const totalWidth = canvas.width;
    let greenBoxXCoordinate = null;

    const contourRects = [];
    for (let i = 0; i < contours.size(); ++i) {
        const contour = contours.get(i);
        const rect = cv.boundingRect(contour);
        contourRects.push({ contour, rect });
    }
    contourRects.sort((a, b) => a.rect.x - b.rect.x);

    contourRects.forEach(({ rect }) => {
        const relativeWidth = rect.width / totalWidth;
        if (relativeWidth >= 0.02) {
            const roi = subtracted.roi(rect);
            const whitePixels = cv.countNonZero(roi);
            const totalPixels = rect.width * rect.height;
            const blackPixels = totalPixels - whitePixels;
            const blackDensity = (blackPixels / totalPixels) * 100;

            if (blackDensity <= 60) { // Adjusted threshold to ensure only high-density black areas are detected
                greenBoxXCoordinate = rect.x + rect.width;
                ctx.beginPath();
                ctx.rect(rect.x, rect.y, rect.width, rect.height);
                ctx.strokeStyle = 'green';
                ctx.lineWidth = 2;
                ctx.stroke();
                console.log(`Green Box at (${rect.x}, ${rect.y}) - Black: ${blackDensity.toFixed(2)}%`);
            }
            roi.delete();
        }
    });

    const consistentXCoordinates = [0, totalWidth];

    const targetX = greenBoxXCoordinate || consistentXCoordinates[0];
    console.log('targetX', targetX);

    const targetNote = getTargetNote(top5YCoordinates, targetX);
    console.log('Target Note:', targetNote);

    const out = fs.createWriteStream(outputPath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => console.log('The file was created.'));

    src.delete();
    binary.delete();
    detectedLines.delete();
    subtracted.delete();
    contours.delete();
    hierarchy.delete();
}

const imagePath = './section_1.png';
const outputPath = './a.png';
processImage(imagePath, outputPath).catch(err => console.error(err));