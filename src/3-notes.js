// const measuresInput = '../output/2-to-phrases/etude-12/section_1.png'
const { measuresInput, notesFolder } = require('../configs/config');

const fs = require('fs');
const cv = require('opencv.js');
const { createCanvas, loadImage, ImageData } = require('canvas');
const sharp = require('sharp');

// Utility function to save a cv.Mat as an image
function saveMat(mat, outputPath) {
    const canvas = createCanvas(mat.cols, mat.rows);
    const ctx = canvas.getContext('2d');
    const imageData = new ImageData(new Uint8ClampedArray(mat.data), mat.cols, mat.rows);
    ctx.putImageData(imageData, 0, 0);
    const out = fs.createWriteStream(outputPath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => console.log(`${outputPath}`));
}

// Function to crop and save a section using sharp
function cropAndSaveSection(inputImagePath, x1, x2, height, measureIndex) {
    sharp(inputImagePath)
        .extract({ left: x1, top: 0, width: x2 - x1, height: height })
        .rotate(270)
        .toFile(`${notesFolder}note_${measureIndex}.png`)
        .then(() => {
            console.log(`The cropped section has been saved to section_${measureIndex}.png`);
        })
        .catch(err => {
            console.error('Error cropping the image:', err);
        });
}

// Load the image
loadImage(measuresInput).then((image) => {
    // Create a canvas and draw the image on it
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);

    // Convert the canvas to an OpenCV matrix
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const src = cv.matFromImageData(imageData);

    // Convert to grayscale
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // Apply binary thresholding
    let binary = new cv.Mat();
    cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);

    // Define a horizontal kernel and detect horizontal lines
    let horizontalKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(40, 1));
    let detectedLines = new cv.Mat();
    cv.morphologyEx(binary, detectedLines, cv.MORPH_OPEN, horizontalKernel);

    // Subtract detected lines from the binary image
    let horizontalRemoved = new cv.Mat();
    cv.subtract(binary, detectedLines, horizontalRemoved);

    // Optional: Clean up the remaining noise
    let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    let cleaned = new cv.Mat();
    cv.morphologyEx(horizontalRemoved, cleaned, cv.MORPH_CLOSE, kernel);
    // saveMatAsImage(cleaned, '_5-cleaned.png'); // Save the cleaned image

    // Find contours
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(cleaned, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // Create an array of bounding rectangles
    let boundingRects = [];
    for (let i = 0; i < contours.size(); ++i) {
        let contour = contours.get(i);
        let rect = cv.boundingRect(contour);
        if (rect.width > canvas.width * 0.05 ) {
            boundingRects.push({ rect: rect, contourIndex: i });
        }
    }

    // Sort the rectangles by their x-coordinate
    boundingRects.sort((a, b) => a.rect.x - b.rect.x);

    // Process the sorted rectangles
    for (let validSectionIndex = 0; validSectionIndex < boundingRects.length; ++validSectionIndex) {
        let { rect, contourIndex } = boundingRects[validSectionIndex];
        console.log(`box ${validSectionIndex + 1}: x=${rect.x}, y=${rect.y}, width=${rect.width}, height=${rect.height}`);

        // Crop and save the section using sharp
        cropAndSaveSection(measuresInput, rect.x, rect.x + rect.width, src.rows, validSectionIndex + 1);

        // Draw the bounding box
        let point1 = new cv.Point(rect.x, 0);
        let point2 = new cv.Point(rect.x + rect.width, src.rows);
        cv.rectangle(src, point1, point2, [255, 0, 0, 255], 2); // Adjust color and thickness as needed

        // Prepare the text annotation
        let text = (validSectionIndex + 1).toString();
        let textPosition = new cv.Point(rect.x - 10, 10); // Position the text above the rectangle

        // Set text properties
        let fontScale = 0.5;
        let color = new cv.Scalar(0, 0, 255, 255); // Blue color
        let thickness = 2;
        let font = cv.FONT_HERSHEY_SIMPLEX;

        // Put the text on the image
        cv.putText(src, text, textPosition, font, fontScale, color, thickness);
    }

    // Save the annotated image
    const outputImageData = new ImageData(new Uint8ClampedArray(src.data), src.cols, src.rows);
    canvas.width = src.cols;
    canvas.height = src.rows;
    ctx.putImageData(outputImageData, 0, 0);

    // Rotate the canvas 90 degrees clockwise
    const rotatedCanvas = createCanvas(canvas.height, canvas.width);
    const rotatedCtx = rotatedCanvas.getContext('2d');
    rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
    rotatedCtx.rotate(-Math.PI / 2);
    rotatedCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

    // Save the rotated image to a file
    const out = fs.createWriteStream('./_6-output.png');
    const stream = rotatedCanvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => console.log('The image was created.'));

    // Cleanup
    src.delete();
    gray.delete();
    binary.delete();
    detectedLines.delete();
    horizontalRemoved.delete();
    cleaned.delete();
    contours.delete();
    hierarchy.delete();
}).catch((err) => {
    console.error('Error:', err);
});
