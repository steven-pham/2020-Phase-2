import _ from 'lodash';
import moment from 'moment';

import {
  IHistoricalData,
  ITransformedHistoricalData,
  IUpdatedCell,
  getColorDataById,
  ICanvasData,
  IHistoricalDataDates,
  IColorData,
} from '../api/Api';

const DATE_FORMAT = 'YYYY-MM-DD';

// resolve all promises inside the array
const getAllColorData = async (histDataArray: IHistoricalData[]): Promise<IColorData[]> => {
  const promises: Promise<IColorData>[] = [];

  for (const histData of histDataArray) {
    const colorDataId = deserialzeHistoricalData(histData).colorDataId;

    promises.push(getColorDataById(colorDataId));
  }

  return Promise.all(promises);
};

const deserialzeHistoricalData = (hist: IHistoricalData) => {
  const { oldValues, newValues, keyValues, dateTime } = hist;

  const oldHex = JSON.parse(oldValues).Hex;
  const newHex = JSON.parse(newValues).Hex;
  const colorDataId = JSON.parse(keyValues).ColorDataID;

  return { oldHex, newHex, colorDataId, dateTime }
};

// all the dates value in the array are sorted from earliest to the latest already
export const transformHistoricalData = async (historicalDataArray: IHistoricalData[]): Promise<ITransformedHistoricalData> => {
  const result: ITransformedHistoricalData = {};

  // allColorData will have the same length as historicalDataArray
  const allColorData = await getAllColorData(historicalDataArray);

  for (let idx = 0; idx < allColorData.length && idx < historicalDataArray.length; idx++) {
    const { rowIndex, columnIndex, canvasID } = allColorData[idx];

    const { oldHex, newHex, dateTime } = deserialzeHistoricalData(historicalDataArray[idx])

    // transform from 2020-08-25T12:08:51.026Z to 2020-08-25
    const localDateValue = moment.utc(dateTime).local().format(DATE_FORMAT);

    // initializations
    if (!result[canvasID]) result[canvasID] = {};
    if (!result[canvasID][localDateValue]) result[canvasID][localDateValue] = [];

    // format cell data
    const updatedCell: IUpdatedCell = { row: rowIndex, col: columnIndex, oldHex, newHex };
    result[canvasID][localDateValue].push(updatedCell);
  }

  return result;
};

export const historicalDataDates = (histData: ITransformedHistoricalData): IHistoricalDataDates => {
  const result: IHistoricalDataDates = {};

  for (const key of Object.keys(histData)) {
    const canvasID = Number(key);
    const canvasIDModifiedDates = Object.keys(histData[canvasID]);
    result[canvasID] = canvasIDModifiedDates;
  }

  return result;
};

export const extractColors = (canvas: ICanvasData): string[][] => {
  // assume it is a square grid
  const gridSize = Math.sqrt(canvas.colorData.length);
  // init a gridSize by gridSize array filled with '' strings
  const colors: string[][] = [...Array(gridSize)].map((_) => Array(gridSize).fill(''));

  // first sort by row index, then by the column index
  const sortedColorData = _.orderBy(canvas.colorData, ['rowIndex', 'columnIndex']);

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      colors[r][c] = sortedColorData[gridSize * r + c].hex;
    }
  }
  return colors;
};
