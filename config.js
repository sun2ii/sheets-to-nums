const musicSheet = "mayer";

module.exports = {
  // 1 - sheet to treble
  sheetInputPath: `../input/${musicSheet}.png`,
  sheetOutputPath: `../output/${musicSheet}.png`,
  sheetOutputFolder: `../output/${musicSheet}/`,
  templateFolder: '../templates/trebles',
  threshold: 0.5,

  // 2 - treble to notes
  minArea: 20, // Minimum area to consider a contour as a note head
  maxArea: 100, // Maximum area to consider a contour as a note head
  aspectRatioThreshold: 0.1, // Aspect ratio threshold to filter elongated shapes
  circularityThreshold: 0.1, // Circularity threshold to ensure the shape is approximately circular
  maxContourWidth: 100, // Maximum width for a contour to be considered (changed to 20)
  maxContourHeight: 100, // Maximum height for a contour to be considered
  notesInputPath: `../output/${musicSheet}/note_3.png`,
  notesOutputPath: `../output2/${musicSheet}.png`,
  notesOutputFolder: `../output2/${musicSheet}/`,
};

