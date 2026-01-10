// Configure Stockfish to locate WASM files correctly
self.locateFile = function(path) {
  if (path.endsWith('.wasm')) {
    return '/assets/' + path;
  }
  return path;
};

importScripts('./stockfish-nnue-16.js');
