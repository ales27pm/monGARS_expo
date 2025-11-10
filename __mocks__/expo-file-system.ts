const noop = async () => {};

const downloadAsync = jest.fn(async () => ({
  uri: "file:///mock/path/mock-model.gguf",
  status: 200,
  headers: {},
}));

export const documentDirectory = "file:///mock/documents/";
export const getInfoAsync = jest.fn(async () => ({
  exists: false,
  size: 0,
  isDirectory: false,
  uri: documentDirectory,
}));
export const makeDirectoryAsync = jest.fn(noop);
export const deleteAsync = jest.fn(noop);
export const createDownloadResumable = jest.fn(() => ({
  downloadAsync,
  pauseAsync: jest.fn(noop),
  resumeAsync: jest.fn(noop),
  savable: true,
}));

export default {
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  deleteAsync,
  createDownloadResumable,
};
