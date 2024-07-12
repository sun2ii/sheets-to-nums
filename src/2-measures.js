const { phrasesInputPath, measuresOutputFolder } = require('../configs/config');

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
    out.on('finish', () => console.log(`The PNG file was created at ${outputPath}`));
}

// Function to crop and save the section using sharp
function cropAndSaveSection(inputImagePath, x1, x2, phraseIndex) {
    const measureFileName = `${measuresOutputFolder}phrase_${phraseIndex}.png`
    sharp(inputImagePath)
        .metadata()
        .then(metadata => {
            return sharp(inputImagePath)
                .extract({ left: x1, top: 0, width: x2 - x1, height: metadata.height })
                .toFile(measureFileName);
        })
        .catch(err => {
            console.error('Error cropping the image:', err);
        });
}

// Load the image and process it
loadImage(phrasesInputPath).then(image => {
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);
    const imgData = ctx.getImageData(0, 0, image.width, image.height);

    // Convert image data to cv.Mat
    let src = cv.matFromImageData(imgData);
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

    // Apply GaussianBlur to reduce noise
    let blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // Apply Canny edge detector
    let edges = new cv.Mat();
    cv.Canny(blurred, edges, 50, 150);

    // Use morphological operations to highlight vertical lines
    let kernel = cv.Mat.ones(9, 1, cv.CV_8U);  // Vertical kernel
    let morph = new cv.Mat();
    cv.morphologyEx(edges, morph, cv.MORPH_CLOSE, kernel);

    // Use Hough Line Transform to detect lines
    let rho = 1; // Distance resolution in pixels
    let theta = Math.PI / 180; // Angle resolution in radians
    let threshold = 40; // Minimum number of votes
    let minLineLength = 20; // Minimum line length in pixels
    let maxLineGap = 10; // Maximum allowed gap between line segments in pixels

    // Function to run Hough Transform with current parameters and save result
    function detectLines() {
        let lines = new cv.Mat();
        cv.HoughLinesP(morph, lines, rho, theta, threshold, minLineLength, maxLineGap);

        let verticalLines = [];
        for (let i = 0; i < lines.rows; ++i) {
            let line = lines.data32S.subarray(i * 4, (i + 1) * 4);
            let [x1, , x2, ] = line;
            // Check if the line is vertical
            if (Math.abs(x2 - x1) < 10) { // Threshold for vertical line
                verticalLines.push(x1);
                cv.line(src, new cv.Point(x1, 0), new cv.Point(x2, src.rows), new cv.Scalar(255, 0, 0, 255), 2);
            }
        }

        // Save the entire processed image with detected lines
        saveMat(src, measuresOutputFolder + 'output.png');

        // Sort the vertical lines based on x-coordinates
        verticalLines.sort((a, b) => a - b);

        // Combine lines that are close to each other
        const proximityThreshold = 30; // You can adjust this value
        let combinedLines = [verticalLines[0]];
        for (let i = 1; i < verticalLines.length; i++) {
            if (verticalLines[i] - combinedLines[combinedLines.length - 1] > proximityThreshold) {
                combinedLines.push(verticalLines[i]);
            }
        }

        // Save sections between combined vertical lines using sharp
        for (let i = 0; i < combinedLines.length - 1; i++) {
            let x1 = combinedLines[i];
            let x2 = combinedLines[i + 1];
            cropAndSaveSection(phrasesInputPath, x1, x2, i);
        }

        lines.delete();
    }

    detectLines();

    // Clean up
    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    morph.delete();
}).catch(err => {
    console.error('Failed to load the image:', err);
});