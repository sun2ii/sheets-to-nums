const { ImageData, createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const cv = require('opencv.js');

// Utility function to save an OpenCV matrix as an image
function saveMatAsImage(mat, filename) {
    const canvas = createCanvas(mat.cols, mat.rows);
    const ctx = canvas.getContext('2d');
    let img = new cv.Mat();
    cv.cvtColor(mat, img, cv.COLOR_GRAY2RGBA);
    const imgData = new ImageData(new Uint8ClampedArray(img.data), img.cols, img.rows);
    ctx.putImageData(imgData, 0, 0);
    const out = fs.createWriteStream(filename);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => console.log(`${filename} saved.`));
    img.delete();
}

// Load the image
const imagePath = './a.png';
loadImage(imagePath).then((image) => {
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
    saveMatAsImage(gray, 'gray.png'); // Save intermediate grayscale image

    // Apply binary thresholding
    let binary = new cv.Mat();
    cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
    saveMatAsImage(binary, 'binary.png'); // Save intermediate binary image

    // Define a horizontal kernel and detect horizontal lines
    let horizontalKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(40, 1));
    let detectedLines = new cv.Mat();
    cv.morphologyEx(binary, detectedLines, cv.MORPH_OPEN, horizontalKernel);
    saveMatAsImage(detectedLines, 'detectedLines.png'); // Save detected horizontal lines image

    // Subtract detected lines from the binary image
    let horizontalRemoved = new cv.Mat();
    cv.subtract(binary, detectedLines, horizontalRemoved);
    saveMatAsImage(horizontalRemoved, 'horizontalRemoved.png'); // Save the image with horizontal lines removed

    // Optional: Clean up the remaining noise
    let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    let cleaned = new cv.Mat();
    cv.morphologyEx(horizontalRemoved, cleaned, cv.MORPH_CLOSE, kernel);
    saveMatAsImage(cleaned, 'cleaned.png'); // Save the cleaned image

    // Find contours
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(cleaned, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // Draw bounding boxes around detected objects
    for (let i = 0; i < contours.size(); ++i) {
        let contour = contours.get(i);
        let rect = cv.boundingRect(contour);

        // Draw the bounding box
        let point1 = new cv.Point(rect.x, rect.y);
        let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
        cv.rectangle(src, point1, point2, [255, 0, 0, 255], 2); // Adjust color and thickness as needed
    }

    // Convert the processed image back to canvas
    const outputImageData = new ImageData(new Uint8ClampedArray(src.data), src.cols, src.rows);
    canvas.width = src.cols;
    canvas.height = src.rows;
    ctx.putImageData(outputImageData, 0, 0);

    // Save the result to a file
    const out = fs.createWriteStream('./output.png');
    const stream = canvas.createPNGStream();
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
});