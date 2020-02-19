import svelte from "rollup-plugin-svelte";
import { terser } from "rollup-plugin-terser";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";
import html from "rollup-plugin-bundle-html";
import babel from "rollup-plugin-babel";
import del from "rollup-plugin-delete";
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

const isProduction = process.env.MODE === "production";

export default {
    input: "src/index.js",
    output: {
        sourcemap: !isProduction,
        file: isProduction ? "dist/bundle-[contenthash].js" : "dist/bundle.js",
        name: "app",
        format: "iife"
    },
    plugins: [
		svelte({
			// enable run-time checks when not in production
			dev: !isProduction,
			// we'll extract any component CSS out into
			// a separate file — better for performance
			css: css => {
				css.write(isProduction ? "dist/bundle-[contenthash].js" : "dist/bundle.js");
			}
		}),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration —
		// consult the documentation for details:
		// https://github.com/rollup/rollup-plugin-commonjs
		resolve({
			browser: true,
			dedupe: importee => importee === 'svelte' || importee.startsWith('svelte/')
		}),

		commonjs(),

        del({
            targets: "dist/bundle*"
        }),

        html({
            template: "src/index.html",
            dest: "dist",
            filename: "index.html"
        }),

        babel({
            extensions: [".js", ".mjs", ".html", ".svelte"]
        }),

        !isProduction && livereload({
            watch: "dist"
        }),

        !isProduction && serve({
            contentBase: "dist",
            port: 3003
        }),

        isProduction && terser(),
    ]
};

