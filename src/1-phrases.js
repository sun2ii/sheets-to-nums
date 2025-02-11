const { sheetInput, phrasesFolder, phrasesOutput, templateFolder } = require('../configs/config.js');

const fs = require('fs');
const cv = require('opencv.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

// Function to apply non-maximum suppression
function nonMaximumSuppression(boxes, overlapThresh) {
    if (boxes.length === 0) return [];

    // Initialize the list of picked indexes
    const pick = [];

    // Sort the bounding boxes by the bottom-right y-coordinate of the bounding box
    boxes.sort((a, b) => a[1] + a[3] - (b[1] + b[3]));

    while (boxes.length > 0) {
        // Grab the last rectangle
        const last = boxes.pop();
        const keep = [];
        pick.push(last);

        for (let i = 0; i < boxes.length; i++) {
            const box = boxes[i];
            // Calculate the intersection over union (IoU)
            const xx1 = Math.max(last[0], box[0]);
            const yy1 = Math.max(last[1], box[1]);
            const xx2 = Math.min(last[0] + last[2], box[0] + box[2]);
            const yy2 = Math.min(last[1] + last[3], box[1] + box[3]);

            const w = Math.max(0, xx2 - xx1);
            const h = Math.max(0, yy2 - yy1);
            const overlap = (w * h) / (last[2] * last[3]);

            if (overlap < overlapThresh) {
                keep.push(box);
            }
        }

        boxes = keep;
    }

    return pick;
}

async function loadTemplates(folderPath) {
    try {
        const files = fs.readdirSync(folderPath);
        const imagePaths = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ext === '.png' || ext === '.jpg' || ext === '.jpeg';
        }).map(file => path.join(folderPath, file));

        const templates = [];
        for (const imagePath of imagePaths) {
            const image = await loadImage(imagePath);
            const canvas = createCanvas(image.width, image.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0, image.width, image.height);
            const imageData = ctx.getImageData(0, 0, image.width, image.height);
            const mat = cv.matFromImageData(imageData);
            cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
            templates.push(mat);
        }

        return templates;
    } catch (error) {
        console.error('Error loading templates:', error);
        throw error;
    }
}

async function detectTrebleClefs() {
    try {
        const src = await loadImage(sheetInput);
        const canvas = createCanvas(src.width, src.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(src, 0, 0, src.width, src.height);

        // Convert image to grayscale
        const imageData = ctx.getImageData(0, 0, src.width, src.height);
        const grayMat = cv.matFromImageData(imageData);
        cv.cvtColor(grayMat, grayMat, cv.COLOR_RGBA2GRAY);

        // Load templates from the folder
        const templates = await loadTemplates(templateFolder);

        // Ensure the output directory exists
        if (!fs.existsSync(phrasesFolder)) {
            fs.mkdirSync(phrasesFolder, { recursive: true });
        }

        let phraseCount = 1;
        const rectangles = [];

        for (const templateMat of templates) {
            // Check if the template is larger than the source image
            if (templateMat.cols > grayMat.cols || templateMat.rows > grayMat.rows) {
                console.warn(`Skipping template ${templateMat.cols}x${templateMat.rows} as it is larger than the source image.`);
                continue;
            }

            // Match template
            const result = new cv.Mat();
            cv.matchTemplate(grayMat, templateMat, result, cv.TM_CCOEFF_NORMED);

            // Thresholding to find good matches
            const threshold = 0.5;
            const resultData = result.data32F;
            for (let i = 0; i < resultData.length; i++) {
                if (resultData[i] >= threshold) {
                    const x = i % result.cols;
                    const y = Math.floor(i / result.cols);
                    const width = result.cols - (2 * x);
                    const height = templateMat.rows * 1.2;
                    rectangles.push([1.75 * x, y, width, height]);
                }
            }
        }

        // Apply non-maximum suppression to filter overlapping rectangles
        const pickedRectangles = nonMaximumSuppression(rectangles, 0.3);

        // Draw and save the filtered rectangles
        for (const [x, y, width, height] of pickedRectangles) {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);

            // Extract and save the phrases image
            const phraseCanvas = createCanvas(width, height);
            const phraseCtx = phraseCanvas.getContext('2d');
            phraseCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
            const phraseFileName = `phrase_${phraseCount}.png`;
            const phraseOutPath = path.join(phrasesFolder, phraseFileName);
            const phraseOut = fs.createWriteStream(phraseOutPath);
            const phraseStream = phraseCanvas.createPNGStream();
            phraseStream.pipe(phraseOut);
            phraseOut.on('finish', () => console.log(`${phraseOutPath}`));
            phraseCount++;
        }

        // Save the result
        const out = fs.createWriteStream(phrasesOutput);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
    }  catch (error) {
        console.error('Error detecting treble clefs:', error);
    }
}

detectTrebleClefs();