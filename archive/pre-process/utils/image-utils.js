const fs = require('fs');
const { createCanvas, loadImage, ImageData } = require('canvas');
const cv = require('opencv.js');

// Function to save a canvas as a PNG file
function saveCanvasAsPNG(canvas, outputPath) {
    const out = fs.createWriteStream(outputPath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => console.log(`The PNG file was created: ${outputPath}`));
}

// Function to generate a random color
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

async function saveOriginalPNG1(inputPath, outputPath) {
    const src = await loadImage(inputPath);
    const canvas = createCanvas(src.width, src.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(src, 0, 0, src.width, src.height);

    saveCanvasAsPNG(canvas, outputPath);
    return ctx;
}

async function convertToGrayscale2(ctx, srcWidth, srcHeight, outputPath) {
    try {
        // Get image data from canvas
        const imageData = ctx.getImageData(0, 0, srcWidth, srcHeight);
        const srcMat = cv.matFromImageData(imageData);

        // Convert to grayscale
        const grayMat = new cv.Mat();
        cv.cvtColor(srcMat, grayMat, cv.COLOR_RGBA2GRAY);

        // Convert back to RGBA for saving
        const rgbaMat = new cv.Mat();
        cv.cvtColor(grayMat, rgbaMat, cv.COLOR_GRAY2RGBA);

        // Create a new canvas for the grayscale image
        const grayCanvas = createCanvas(srcWidth, srcHeight);
        const grayCtx = grayCanvas.getContext('2d');

        // Create ImageData from the grayscale matrix
        const grayImageData = new ImageData(new Uint8ClampedArray(rgbaMat.data), rgbaMat.cols, rgbaMat.rows);
        grayCtx.putImageData(grayImageData, 0, 0);

        // Save the grayscale image
        saveCanvasAsPNG(grayCanvas, outputPath);

        // Clean up
        srcMat.delete();
        grayMat.delete();
        rgbaMat.delete();

        return grayCtx;
    } catch (error) {
        console.error('Error converting image to grayscale:', error);
    }
}

async function applyAdaptiveThresholding3(ctx, srcWidth, srcHeight, outputPath) {
    try {
        // Get image data from canvas
        const imageData = ctx.getImageData(0, 0, srcWidth, srcHeight);
        const srcMat = cv.matFromImageData(imageData);

        // Convert to grayscale
        const grayMat = new cv.Mat();
        cv.cvtColor(srcMat, grayMat, cv.COLOR_RGBA2GRAY);

        // Apply adaptive thresholding
        const binaryMat = new cv.Mat();
        cv.adaptiveThreshold(grayMat, binaryMat, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 19, 1);

        // Convert back to RGBA for saving
        const rgbaMat = new cv.Mat();
        cv.cvtColor(binaryMat, rgbaMat, cv.COLOR_GRAY2RGBA);

        // Create a new canvas for the binary image
        const binaryCanvas = createCanvas(srcWidth, srcHeight);
        const binaryCtx = binaryCanvas.getContext('2d');

        // Create ImageData from the binary matrix
        const binaryImageData = new ImageData(new Uint8ClampedArray(rgbaMat.data), rgbaMat.cols, rgbaMat.rows);
        binaryCtx.putImageData(binaryImageData, 0, 0);

        // Save the binary image
        saveCanvasAsPNG(binaryCanvas, outputPath);

        // Clean up
        srcMat.delete();
        grayMat.delete();
        binaryMat.delete();
        rgbaMat.delete();

        return binaryCtx;
    } catch (error) {
        console.error('Error applying adaptive thresholding:', error);
    }
}

async function applyMorphologicalOperations4(ctx, srcWidth, srcHeight, outputPath) {
    try {
        const KERNEL_SIZE = 3;
        const ITERATIONS = 1;

        // Get image data from canvas
        const imageData = ctx.getImageData(0, 0, srcWidth, srcHeight);
        const srcMat = cv.matFromImageData(imageData);

        // Ensure the input is binary (single-channel) for morphological operations
        const grayMat = new cv.Mat();
        cv.cvtColor(srcMat, grayMat, cv.COLOR_RGBA2GRAY);

        // Remove horizontal lines
        const horizontalKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(KERNEL_SIZE * 0.5, 1));
        const horizontalRemovedMat = new cv.Mat();
        cv.morphologyEx(grayMat, horizontalRemovedMat, cv.MORPH_OPEN, horizontalKernel);

        // Dilation - Adding more ink to a stamp.
        const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(KERNEL_SIZE, KERNEL_SIZE));
        const dilatedMat = new cv.Mat();
        cv.dilate(horizontalRemovedMat, dilatedMat, kernel, new cv.Point(-1, -1), ITERATIONS);

        // Erosion - Sandpaper smoothing out rough edges.
        const erodedMat = new cv.Mat();
        cv.erode(dilatedMat, erodedMat, kernel, new cv.Point(-1, -1), ITERATIONS);

        // Convert back to RGBA for saving
        const rgbaMat = new cv.Mat();
        cv.cvtColor(erodedMat, rgbaMat, cv.COLOR_GRAY2RGBA);

        // Create a new canvas for the morphologically processed image
        const morphCanvas = createCanvas(srcWidth, srcHeight);
        const morphCtx = morphCanvas.getContext('2d');

        // Create ImageData from the morph matrix
        const morphImageData = new ImageData(new Uint8ClampedArray(rgbaMat.data), rgbaMat.cols, rgbaMat.rows);
        morphCtx.putImageData(morphImageData, 0, 0);

        // Save the morphologically processed image
        saveCanvasAsPNG(morphCanvas, outputPath);

        // Clean up
        srcMat.delete();
        grayMat.delete();
        dilatedMat.delete();
        erodedMat.delete();
        rgbaMat.delete();

        return morphCtx;
    } catch (error) {
        console.error('Error applying morphological operations:', error);
    }
}

module.exports = {
    saveOriginalPNG1,
    convertToGrayscale2,
    applyAdaptiveThresholding3,
    applyMorphologicalOperations4,
};