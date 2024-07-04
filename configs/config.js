const musicSheet = "etude-101";

module.exports = {
  // 1 - sheet to treble : SECTION
  sheetInputPath: `../input/${musicSheet}.png`,
  sheetOutputPath: `../output/1-section/${musicSheet}.png`,
  sheetOutputFolder: `../output/1-section/${musicSheet}/`,
  templateFolder: '../templates/trebles',
  threshold: 0.5,

  // 2 - treble to notes : PHRASE

  minArea: 10, // Minimum area to consider a contour as a note head
  maxArea: 500, // Maximum area to consider a contour as a note head
  aspectRatioThreshold: 0.05, // Aspect ratio threshold to filter elongated shapes
  circularityThreshold: 0.05, // Circularity threshold to ensure the shape is approximately circular
  minContourWidth: 5,
  minContourHeight: 5,
  maxContourWidth: 50, // Maximum width for a contour to be considered (changed to 20)
  maxContourHeight: 50,
  notesInputPath: `../output/1-section/${musicSheet}/note_2.png`,
  notesOutputPath: `../output/2-phrase/${musicSheet}.png`,
  notesOutputFolder: `../output/2-phrase/${musicSheet}/`,
};