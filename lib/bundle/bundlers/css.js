import CSSMinifier from "clean-css";
import { Bundler } from "../mappers/Bundler.js";
import { Modifier } from "../mappers/Modifier.js";
import { transpileSCSS } from "../transpilers.js";
export const bundlerCSS = new Bundler((css, debug) => {
    return minifierCSS.apply(css, debug);
});
export const bundlerSCSS = new Bundler((scss, debug) => {
    return minifierCSS.apply(transpileSCSS(scss), debug);
});
export const minifierCSS = new Modifier(css => new CSSMinifier().minify(css).styles);
