const musicSheet = "etude-12";
const phrase = "phrase_1";
const measure = "measure_1";

module.exports = {
  // Folders
  templateFolder: '../templates/trebles',
  phrasesFolder: `../output/1-phrases/${musicSheet}/`,
  measuresFolder: `../output/2-measures/${musicSheet}/`,
  notesFolder: `../output/3-notes/${musicSheet}/`,

  // 0. Bar Data
  measuresInput: `../output/2-measures/${musicSheet}/${measure}.png`,
  measuresOutput: `../output/2-measures/${musicSheet}/vertical.png`,

  // 1. Phrases
  sheetInput: `../input/${musicSheet}.png`,
  phrasesOutput: `../output/1-phrases/${musicSheet}/main.png`,

  // 2. Measures
  phrasesInput: `../output/1-phrases/${musicSheet}/${phrase}.png`,

  // 3. Notes
  notesInput: `../output/2-measures/${musicSheet}/${measure}.png`,

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