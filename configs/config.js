const musicSheet = "etude-12";

module.exports = {
  // Folders
  templateFolder: '../templates/trebles',

  // 1. Phrases
  sheetInputPath: `../input/${musicSheet}.png`,
  phrasesOutputPath: `../output/1-phrases/main/${musicSheet}.png`,
  phrasesOutputFolder: `../output/1-phrases/${musicSheet}/`,

  // 2. Measures
  phrasesInputPath: `../output/1-phrases/${musicSheet}/note_2.png`,
  measuresOutputFolder: `../output/2-measures/${musicSheet}/`,

  // 3. Notes

  // 4. JSON

  // Other Settings
  minArea: 10, 
  maxArea: 500, 
  aspectRatioThreshold: 0.05,
  circularityThreshold: 0.05, 
  minContourWidth: 5,
  minContourHeight: 5,
  maxContourWidth: 50, 
  maxContourHeight: 50,
};