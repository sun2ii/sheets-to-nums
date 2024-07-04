/*

1. Original
2. Grayscale
3. Adaptive Thresholding
4. Morphological Operations
5. Draw Boxes

*/

const { loadImage } = require('canvas');
const fs = require('fs');

const {
    input,
    outputGrayscale,
    outputOriginal,
    outputThreshold,
    outputMorph,
    outputFinal
} = require('../configs/config-pre-process.js');

const {
    saveOriginalPNG1,
    convertToGrayscale2,
    applyAdaptiveThresholding3,
    applyMorphologicalOperations4,
} = require('./utils/image-utils');

if (!fs.existsSync('./pre-process/')) {
    fs.mkdirSync('./pre-process/', { recursive: true });
}

async function processImage() {
    const src = await loadImage(input);
    const originalCtx = await saveOriginalPNG1(input, outputOriginal);
    const grayscaleCtx = await convertToGrayscale2(originalCtx, src.width, src.height, outputGrayscale);
    const binaryCtx = await applyAdaptiveThresholding3(grayscaleCtx, src.width, src.height, outputThreshold);
    const morphCtx = await applyMorphologicalOperations4(binaryCtx, src.width, src.height, outputMorph);
    // await drawColorBoxes5(morphCtx, src.width, src.height, outputFinal);
}

processImage();