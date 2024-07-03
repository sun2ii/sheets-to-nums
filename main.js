const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const cv = require('opencv.js');
const config = require('./config.js');

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
        const src = await loadImage(config.inputPath);
        const canvas = createCanvas(src.width, src.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(src, 0, 0, src.width, src.height);

        // Convert image to grayscale
        const imageData = ctx.getImageData(0, 0, src.width, src.height);
        const grayMat = cv.matFromImageData(imageData);
        cv.cvtColor(grayMat, grayMat, cv.COLOR_RGBA2GRAY);

        // Load templates from the folder
        const templates = await loadTemplates(config.templateFolder);

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
            const resultData = result.data32F;
            for (let i = 0; i < resultData.length; i++) {
                if (resultData[i] >= config.threshold) {
                    const x = i % result.cols;
                    const y = Math.floor(i / result.cols);
                    ctx.strokeStyle = 'red';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(x, y, result.cols - x, templateMat.rows);
                }
            }
        }

        // Save the result
        const out = fs.createWriteStream(config.outputPath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
        out.on('finish', () => console.log('The PNG file was created.'));
    } catch (error) {
        console.error('Error detecting treble clefs:', error);
    }
}

detectTrebleClefs();
