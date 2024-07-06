const musicSheet = "etude-12";

module.exports = {
  // Folders
  templateFolder: '../templates/trebles',

  // 1. Sheets
  sheetInputPath: `../input/${musicSheet}.png`,
  sheetOutputPath: `../output/1-sheet-to-sections/main/${musicSheet}.png`,
  sheetOutputFolder: `../output/1-sheet-to-sections/${musicSheet}/`,

  // 2. Phrases
  phrasesInputPath: `../output/1-sheet-to-sections/${musicSheet}/note_2.png`,
  phrasesOutputFolder: `../output/2-to-phrases/${musicSheet}/`,

  // Other Settings
  threshold: 0.5,
  minArea: 10, 
  maxArea: 500, 
  aspectRatioThreshold: 0.05,
  circularityThreshold: 0.05, 
  minContourWidth: 5,
  minContourHeight: 5,
  maxContourWidth: 50, 
  maxContourHeight: 50,
};