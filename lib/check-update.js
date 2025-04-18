import { join } from "path";
import { readFileSync, writeFileSync } from "fs";
import { get } from "https";
const RAW_PACKAGE_URL = "https://raw.githubusercontent.com/surfly/labs/refs/heads/main/package.json";
const TEMP_FILE = join(import.meta.dirname, ".tmp");
const CHECK_INTERVAL = 1000 * 60 * 30;
function fetchCurrentVersion() {
    return new Promise(async (resolve) => {
        const packageModule = await import(join(import.meta.dirname, "../package.json"));
        const packageJson = packageModule.default;
        resolve(packageJson.version);
    });
}
function fetchLatestVersion() {
    return new Promise(resolve => {
        get(RAW_PACKAGE_URL, res => {
            const chunks = [];
            res.on("data", chunk => {
                chunks.push(chunk);
            });
            res.on("end", () => {
                const packageJson = JSON.parse(chunks.join(""));
                resolve(packageJson.version);
            });
        });
    });
}
export async function retrieveAvailableUpdate() {
    const binPath = process.argv[1];
    if (!/^\/usr\//.test(binPath) || !/\/bin\//.test(binPath)) {
        return null;
    }
    try {
        const lastCheckTimestamp = parseInt(readFileSync(TEMP_FILE).toString());
        if (Date.now() - lastCheckTimestamp <= CHECK_INTERVAL)
            return null;
    }
    catch { }
    writeFileSync(TEMP_FILE, Date.now().toString());
    const numerifySemver = (semver) => parseInt(semver.match(/\d+/g).join(""));
    try {
        const currentVersion = await fetchCurrentVersion();
        const latestVersion = await fetchLatestVersion();
        return (numerifySemver(currentVersion) < numerifySemver(latestVersion))
            ? {
                current: currentVersion,
                latest: latestVersion
            }
            : null;
    }
    catch {
        return null;
    }
}
