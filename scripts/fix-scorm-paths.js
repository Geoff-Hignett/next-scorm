const fs = require("fs");
const path = require("path");

function patchHtml(filePath) {
    let html = fs.readFileSync(filePath, "utf8");

    const relativePath = path.relative("out", filePath);

    // Only patch nested pages (not root index.html)
    if (relativePath !== "index.html") {
        html = html.replace(/\.\/_next/g, "../_next");
    }

    fs.writeFileSync(filePath, html);
    console.log("patched:", filePath);
}

function walk(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);

        if (stat.isDirectory()) {
            walk(full);
        }

        if (file.endsWith(".html")) {
            patchHtml(full);
        }
    }
}

walk("out");
