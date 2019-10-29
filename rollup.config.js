import { terser } from "rollup-plugin-terser";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";
import html from "rollup-plugin-bundle-html";
import babel from "rollup-plugin-babel";
import del from "rollup-plugin-delete";

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
        del({
            targets: "dist/bundle*"
        }),

        html({
            template: "src/index.html",
            dest: "dist",
            filename: "index.html"
        }),

        babel({
            extensions: [".js"]
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

