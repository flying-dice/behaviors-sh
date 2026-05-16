export function pickFile<T>(
    accept: string,
    process: (file: File) => Promise<T>,
): Promise<T | null> {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.style.display = "none";
        input.addEventListener("change", async () => {
            const file = input.files?.[0];
            input.remove();
            if (!file) return resolve(null);
            try {
                resolve(await process(file));
            } catch (err) {
                reject(err);
            }
        });
        input.addEventListener("cancel", () => {
            input.remove();
            resolve(null);
        });
        document.body.appendChild(input);
        input.click();
    });
}

export function downloadBlob(text: string, filename: string, mime = "application/json"): void {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
