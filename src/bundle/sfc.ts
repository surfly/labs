/**
 * Single file components (SFCs) data renderer.
 */

import { Dirent, existsSync } from "fs";
import { extname, join } from "path";
import { readdir, readFile } from "fs/promises";
import { createHash } from "crypto";

import { parse } from "node-html-parser";

import { Bundler } from "./Mappers.js";
import { transpileSCSS, transpileTS } from "./transpilers.js";
import { load as loadTemplate, template } from "./templates.js";

import _config from "./config.json" with { type: "json" };


// TODO: Fallthrough attrs?
// TODO: Object-to-DOM templating?


export type TSfc = {
    wasModified: boolean;
    data: string[];
};


const SFC_TEMPLATE = await loadTemplate("sfc");


// Cache rendered data.
// SFC rendering is detached from mapper logic which keeps track of file changes.
const cache: Map<string, string> = new Map();


/**
 * Render an SFC based on raw component data, given the tag name to register it with.
 */
function render(tagName: string, component: string) {
	const throwOverloadError = () => {
		throw new SyntaxError(`Component must not be overloaded <${tagName.toUpperCase()}>`);
	};

	const ast = parse(component, {});

	let templateStr: string,
		styleStr: string,
		scriptStr: string;
	for(const child of ast.children.slice(0, 3)) {
		if(child.tagName === "TEMPLATE") {
			templateStr && throwOverloadError();
			templateStr = child.innerHTML.trim();
			continue;
		}

		const lang = (child.getAttribute("lang") ?? "").trim().toUpperCase();
		if(child.tagName === "STYLE") {
			styleStr && throwOverloadError();
			styleStr = child.innerHTML.trim();
			styleStr = (lang === "SCSS")
				? transpileSCSS(styleStr)
				: styleStr;
			continue;
		}
		if(child.tagName === "SCRIPT") {
			scriptStr && throwOverloadError();
			scriptStr = child.innerHTML.trim();
			scriptStr = (lang === "TS")
				? transpileTS(scriptStr)
				: scriptStr;
			continue;
		}
	}
	if(!templateStr && !scriptStr && !styleStr)
		throw new RangeError("Components must not be empty (or malformed)");
	if(ast.children.length > 3)
		throw new RangeError("Invalid element count on top level");

	let renderedComponent = SFC_TEMPLATE;
	renderedComponent = template(renderedComponent, "TEMPLATE", templateStr);
	renderedComponent = template(renderedComponent, "STYLE", styleStr);
	renderedComponent = template(renderedComponent, "SCRIPT", scriptStr);
	renderedComponent = template(renderedComponent, "TAG_NAME", tagName);
	renderedComponent = template(renderedComponent, "TEMPLATE_ID",
		createHash("md5")
            .update(renderedComponent)
            .digest("hex")
            .slice(0, 8));

	return renderedComponent;
}


/**
 * Render all components in an asset directories /components directory.
 */
export async function renderComponents(srcPath: string, prefix = _config.tagNamePrefix) {
	let wasModified: boolean = false;

	const wrapResults = (data: string[]): TSfc => {
		return {
			wasModified,
			data
		};
	};

	if(!existsSync(srcPath)) return wrapResults([]);

	const componentsData: string[] = await Promise.all((await readdir(srcPath, {
		recursive: false,
		withFileTypes: true
	}))
        .filter((dirent: Dirent) => dirent.isFile() && extname(dirent.name) === ".html")
        .map(async (dirent: Dirent) => {
        	const componentPath: string = join(srcPath, dirent.name);

        	if(!(await Bundler.fileModified(componentPath)))
        		return cache.get(componentPath);

        	const data: string = render(
        		`${prefix}${dirent.name.slice(0, -extname(dirent.name).length)}`,
        		(await readFile(componentPath)).toString()
        	);

        	cache.set(componentPath, data);

        	wasModified = true;

        	return data;
        }));

	return wrapResults(componentsData);
}