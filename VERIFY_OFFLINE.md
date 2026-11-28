# Offline verification

Download `index.html` and `index.self-extract.html` from the [GitHub Releases page](https://github.com/ttomohisa/htmlapps-image-compressor-converter/releases). To test a local build instead, run `build-standalone.bat` from a Windows checkout and use the two files in `dist/`. Use a browser with gzip `DecompressionStream` support for the self-extracting file.

Repeat these steps with each HTML file.

1. Disconnect the network and open the saved HTML directly from disk. Open the browser's Network panel, clear its log, and reload. The app should start with a `file://` address.
2. Check the version in the header and at the end of Help. Switch languages and check that the version stays the same.
3. Add a JPEG and a transparent PNG. Run **Smart Optimize** and check the success count and file sizes. Open the comparison for the PNG and drag the divider. The original is on the left and the output on the right. Use **Highlight differences** to inspect changes.
4. Rename an output and save it. Check both outputs and use **Save checked ZIP**. Open the ZIP and confirm it includes both files and the edited name. Repeat with just one output checked and confirm the ZIP has one file.
5. Under **Export**, generate a Base64 data URI, choose `<picture>`, then save the **Web assets ZIP**. Extract it, open `snippet.html` offline, and confirm that the image resolves from the files beside it.
6. Check the Network panel while performing these actions. The page and selected images can appear as local `file:`, `blob:` or `data:` URLs. Expect zero app-initiated HTTP or HTTPS requests, including failed attempts.
