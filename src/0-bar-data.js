const { measuresInput, measuresOutput, measuresFolder } = require('../configs/config');

const { ImageData, createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const cv = require('opencv.js');

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

    // Store coordinates of the horizontal lines
    let horizontalLineCoordinates = [];

    // Draw purple lines on the detected horizontal lines
    for (let y = 0; y < detectedLines.rows; y++) {
        for (let x = 0; x < detectedLines.cols; x++) {
            if (detectedLines.ucharPtr(y, x)[0] === 255) {
                // Draw a purple line
                cv.line(src, new cv.Point(x, y), new cv.Point(x + 1, y), [128, 0, 128, 255], 1);
                // Store the y-coordinate
                horizontalLineCoordinates.push(y);
            }
        }
    }

    // Count occurrences of each y-coordinate
    const yCoordinateOccurrences = {};
    horizontalLineCoordinates.forEach(y => {
        yCoordinateOccurrences[y] = (yCoordinateOccurrences[y] || 0) + 1;
    });

    // Get the sorted y-coordinates excluding 0
    let sortedYCoordinates = Object.entries(yCoordinateOccurrences)
        .map(entry => parseInt(entry[0]))
        .filter(y => y !== 0) // Exclude 0
        .sort((a, b) => a - b);

    // Combine close values and ensure consistent distances
    let combinedYCoordinates = [];
    const threshold = 10; // Adjust this threshold as needed for "closeness"
    for (let i = 0; i < sortedYCoordinates.length; i++) {
        if (i === 0 || sortedYCoordinates[i] - combinedYCoordinates[combinedYCoordinates.length - 1] > threshold) {
            combinedYCoordinates.push(sortedYCoordinates[i]);
        }
    }

    // Ensure we have exactly 5 y-coordinates by adjusting the threshold if needed
    while (combinedYCoordinates.length > 5) {
        combinedYCoordinates.pop();
    }

    // Ensure consistent distances and default to even numbers
    let finalYCoordinates = [combinedYCoordinates[0]];
    for (let i = 1; i < combinedYCoordinates.length; i++) {
        let nextY = finalYCoordinates[finalYCoordinates.length - 1] + 2 * Math.round((combinedYCoordinates[i] - finalYCoordinates[finalYCoordinates.length - 1]) / 2);
        finalYCoordinates.push(nextY);
    }

    // Add intermediate coordinates by dividing the distance by 2
    let allYCoordinates = [];
    for (let i = 0; i < finalYCoordinates.length - 1; i++) {
        allYCoordinates.push(finalYCoordinates[i]);
        let midPoint = Math.round((finalYCoordinates[i] + finalYCoordinates[i + 1]) / 2);
        allYCoordinates.push(midPoint);
    }
    allYCoordinates.push(finalYCoordinates[finalYCoordinates.length - 1]);

    // Save the top 5 y-coordinates and intermediate coordinates to a JSON file
    fs.writeFileSync(measuresFolder + 'bars.json', JSON.stringify({ top5YCoordinates: allYCoordinates.sort((a, b) => a - b) }, null, 2));

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
    const out = fs.createWriteStream(measuresOutput);
    const stream = rotatedCanvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => {
        console.log(allYCoordinates.sort((a, b) => a - b));
    });

    // Cleanup
    src.delete();
    gray.delete();
    binary.delete();
    detectedLines.delete();
}).catch((err) => {
    console.error('Error:', err);
});