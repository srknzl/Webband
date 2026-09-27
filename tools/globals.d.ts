// What the type check can't read from the game's own files: PixiJS is vendored minified
// (vendor/pixi.min.js), so its global is left untyped.
declare const PIXI: any;
// app.js routes alert() to a modal, and its second argument runs when the modal is closed
declare function alert(message?: any, then?: () => void): void;
