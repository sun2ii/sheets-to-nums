const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const cv = require('opencv.js');

// Function to generate a random color
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Configuration for size and shape filtering
const config = {
    minArea: 50, // Minimum area to consider a contour as a note head
    maxArea: 100, // Maximum area to consider a contour as a note head
    aspectRatioThreshold: 0.1, // Aspect ratio threshold to filter elongated shapes
    circularityThreshold: 0.1, // Circularity threshold to ensure the shape is approximately circular
    maxContourWidth: 20, // Maximum width for a contour to be considered
    maxContourHeight: 100, // Maximum height for a contour to be considered
    inputPath: './note_1.png', // Path to your input image
    outputNotesFolder: 'test/abc/', // Folder to save segmented notes
    outputFullImagePath: './output.png' // Path to save the full image with color-coded contours
};

// Ensure the output directory exists
if (!fs.existsSync(config.outputNotesFolder)) {
    fs.mkdirSync(config.outputNotesFolder, { recursive: true });
}

async function findContoursAndDisplay() {
    try {
        const src = await loadImage(config.inputPath);
        const canvas = createCanvas(src.width, src.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(src, 0, 0, src.width, src.height);

        // Convert image to grayscale
        const imageData = ctx.getImageData(0, 0, src.width, src.height);
        const grayMat = cv.matFromImageData(imageData);
        cv.cvtColor(grayMat, grayMat, cv.COLOR_RGBA2GRAY);

        // Apply adaptive thresholding
        const binaryMat = new cv.Mat();
        cv.adaptiveThreshold(grayMat, binaryMat, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);

        // Morphological operations to remove noise
        const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
        cv.morphologyEx(binaryMat, binaryMat, cv.MORPH_CLOSE, kernel);
        cv.morphologyEx(binaryMat, binaryMat, cv.MORPH_OPEN, kernel);

        // Find contours
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(binaryMat, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        console.log(`Total contours found: ${contours.size()}`);

        // Draw contours with different colors and save only the note heads
        const contoursCanvas = createCanvas(src.width, src.height);
        const contoursCtx = contoursCanvas.getContext('2d');
        contoursCtx.drawImage(src, 0, 0, src.width, src.height);

        let detectedNotes = [];

        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const rect = cv.boundingRect(contour);
            const area = cv.contourArea(contour);
            const perimeter = cv.arcLength(contour, true);

            // Filter contours based on dimensions
            if (rect.width > config.maxContourWidth || rect.height > config.maxContourHeight) {
                continue;
            }

            // Calculate the aspect ratio and circularity of the contour
            const aspectRatio = rect.width / rect.height;
            const circularity = 4 * Math.PI * (area / (perimeter * perimeter));

            // Filter contours by area, aspect ratio, and circularity to capture only note heads
            if (area >= config.minArea && area <= config.maxArea &&
                aspectRatio >= config.aspectRatioThreshold && circularity >= config.circularityThreshold) {
                const color = getRandomColor();

                contoursCtx.strokeStyle = color;
                contoursCtx.lineWidth = 2;
                contoursCtx.strokeRect(rect.x, rect.y, rect.width, rect.height);

                // Fill the contour area with color for better visualization
                contoursCtx.fillStyle = color;
                contoursCtx.globalAlpha = 0.4; // Set transparency level
                contoursCtx.fillRect(rect.x, rect.y, rect.width, rect.height);
                contoursCtx.globalAlpha = 1.0; // Reset transparency

                detectedNotes.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
            }
        }

        // Save the image with color-coded contours to verify
        const out = fs.createWriteStream(config.outputFullImagePath);
        const stream = contoursCanvas.createPNGStream();
        stream.pipe(out);
        out.on('finish', () => console.log(`The image with color-coded contours was saved: ${config.outputFullImagePath}`));

        // Save the individual notes as images and print their dimensions
        detectedNotes.forEach((note, index) => {
            const noteCanvas = createCanvas(note.width, note.height);
            const noteCtx = noteCanvas.getContext('2d');
            noteCtx.drawImage(canvas, note.x, note.y, note.width, note.height, 0, 0, note.width, note.height);

            const noteOutPath = path.join(config.outputNotesFolder, `note_${index + 1}.png`);
            const noteOut = fs.createWriteStream(noteOutPath);
            const noteStream = noteCanvas.createPNGStream();
            noteStream.pipe(noteOut);
            noteOut.on('finish', () => {
                console.log(`The PNG file was created: ${noteOutPath} with dimensions: width=${note.width}, height=${note.height}`);
            });
        });

        // Clean up
        grayMat.delete();
        binaryMat.delete();
        contours.delete();
        hierarchy.delete();
    } catch (error) {
        console.error('Error finding contours and displaying the image:', error);
    }
}

findContoursAndDisplay();