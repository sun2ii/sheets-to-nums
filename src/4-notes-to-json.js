const sharp = require('sharp');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const cv = require('opencv.js');
const path = require('path');

// Notes mapping
const notesScaled = {
  10: "E",
  20: "C",
  30: "A",
  40: "F",
  50: "D",
};

// Load image
const imagePath = './section_1.png';
const outputPath = './a.png';

function getUniqueValues(array) {
    return Array.from(new Set(array));
}

function getConsistentDifferences(array) {
    const differences = array.map((x, i) => (i > 0 ? x - array[i - 1] : null)).filter(diff => diff !== null);
    const consistentDifference = differences.sort((a, b) =>
        differences.filter(v => v === a).length - differences.filter(v => v === b).length
    ).pop();

    return array.filter((x, i) => i === 0 || x - array[i - 1] === consistentDifference);
}

async function processImage() {
  // Load the image using sharp
  const imageBuffer = await sharp(imagePath).toBuffer();
  const img = await loadImage(imageBuffer);

  // Create a canvas and draw the image
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // Convert the image to ImageData object
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Convert ImageData to OpenCV Mat
  const src = cv.matFromImageData(imageData);

  // Convert the image to grayscale
  cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

  // Threshold the image to create a binary image
  const binary = new cv.Mat();
  cv.threshold(src, binary, 128, 255, cv.THRESH_BINARY_INV);

  // Remove horizontal lines using morphological operations
  const horizontalKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(30, 1));
  const detectedLines = new cv.Mat();
  cv.morphologyEx(binary, detectedLines, cv.MORPH_OPEN, horizontalKernel);

  const subtracted = new cv.Mat();
  cv.subtract(binary, detectedLines, subtracted);

  // Find contours
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(subtracted, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const totalWidth = canvas.width;
  const redItemsXCoordinates = [];
  let greenBoxXCoordinate = null;

  // Sort contours by x-coordinate
  const contourRects = [];
  for (let i = 0; i < contours.size(); ++i) {
    const contour = contours.get(i);
    const rect = cv.boundingRect(contour);
    contourRects.push({ contour, rect });
  }
  contourRects.sort((a, b) => a.rect.x - b.rect.x);

  let finalNote = "";

  // Draw bounding boxes around detected contours and calculate densities
  contourRects.forEach(({ contour, rect }) => {
    const relativeWidth = rect.width / totalWidth;

    // Define color based on the relative width
    let color;
    if (relativeWidth < 0.02) { // Adjust threshold as necessary
      color = 'red'; // Red for small width objects
      redItemsXCoordinates.push(rect.x); // Collect X coordinate
    } else {
      // Calculate the density of black vs white within the bounding box
      const roi = subtracted.roi(rect);
      const whitePixels = cv.countNonZero(roi);
      const totalPixels = rect.width * rect.height;
      const blackPixels = totalPixels - whitePixels;
      const blackDensity = (blackPixels / totalPixels) * 100;

      if (blackDensity <= 50 && blackDensity >= 1) {
        color = 'green'; // Green for shapes with 50% or more black pixels
        // Draw rectangle around the contour
        ctx.beginPath();
        ctx.rect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        console.log(`Green Box at (${rect.x}, ${rect.y}) - Black: ${blackDensity.toFixed(2)}%`);
        // Store the green box X coordinate
        greenBoxXCoordinate = rect.x;
      }

      roi.delete();
    }

    if (color === 'red') {
      // Draw rectangle around the contour
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });

  // Print all X coordinates of the red items
  console.log('X coordinates of red items:', redItemsXCoordinates);

  // Add the green box X coordinate if it exists
  if (greenBoxXCoordinate !== null) {
    redItemsXCoordinates.push(greenBoxXCoordinate);
  }

  // Filter X coordinates
  const filteredXCoordinates = getUniqueValues(redItemsXCoordinates.filter(x => x > totalWidth * 0.1 && x < totalWidth * 0.9))
  console.log('Filtered X coordinates:', filteredXCoordinates);

  // Calculate differences
  const differences = filteredXCoordinates.map((x, i, arr) => (i > 0 ? x - arr[i - 1] : 0)).slice(1);
  console.log('Differences:', differences);

  // Get consistent X coordinates
  const consistentXCoordinates = getConsistentDifferences(filteredXCoordinates);

  console.log('Consistent X coordinates:', consistentXCoordinates);

  // Map X coordinates to new values
  const transformedXCoordinates = consistentXCoordinates.map((x, i) => (i + 1) * 10);
  console.log('Transformed X coordinates:', transformedXCoordinates);

  // Find the note for the final green box
  const finalTransformedValue = transformedXCoordinates[transformedXCoordinates.length - 1] + 10;
  const finalNoteName = notesScaled[finalTransformedValue] || "Unknown";
  console.log(`Final Note for the green box at (${greenBoxXCoordinate}) is: ${finalNoteName}`);

  // Save the resulting image
  const out = fs.createWriteStream(outputPath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on('finish', () => console.log('The file was created.'));

  // Clean up
  src.delete();
  binary.delete();
  detectedLines.delete();
  subtracted.delete();
  contours.delete();
  hierarchy.delete();
}

processImage().catch(err => console.error(err));