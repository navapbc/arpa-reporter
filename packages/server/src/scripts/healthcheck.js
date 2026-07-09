// Usage: node healthcheck.js [url] [timeout]
// Exits with error (status code 1) when HTTP request errors or responds with non-200 status.
const url = process.argv[2] || 'http://localhost:3000/api/health';
const timeout = Number.parseInt(process.argv[3], 10) || 5000;

console.log(url);

// Uses the global fetch available in Node 18+ (previously the `got` package).
fetch(url, { signal: AbortSignal.timeout(timeout) }).then((res) => {
    const { status } = res;
    console.log(status);
    if (status !== 200) {
        process.exit(1);
    }
    process.exit(0);
}).catch((e) => {
    console.error(e);
    process.exit(1);
});
