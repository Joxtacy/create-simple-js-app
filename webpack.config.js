const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = () => {
    const isProduction = process.env.MODE === "production";

    return {
        mode: process.env.MODE,
        entry: path.join(__dirname, "src/index.js"),
        output: {
            filename: isProduction ? "[name]-[contenthash].js" : "[name].js",
            chunkFilename: isProduction ? "[name]-[contenthash].js" : "[name].js",
            path: path.join(__dirname, "dist")
        },
        devServer: {
            host: "localhost",
            port: 3003,
            hot: true
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: path.join(__dirname, "src/index.html")
            })
        ]
    }
}

