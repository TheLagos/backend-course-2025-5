import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { program } from 'commander';


program
    .option('-h, --host <address>', "Server address", 'localhost')
    .option('-p, --port <number>', "Server port", '8080')
    .option('-c, --cache <path>', "Cache directory path")
    .parse(process.argv);

const options = program.opts();

if (!options.cache) {
    console.error('Error: Required option --cache <path> is missing');
    program.help();
    process.exit(1);
}

const cacheDir = path.resolve(options.cache);

async function startServer() {
    try {
        await fs.mkdir(cacheDir, { recursive: true });
        console.log(`Cache directory created at: ${cacheDir}`);

        const server = http.createServer((req, res) => {
            res.writeHead(501, { 'Content-Type': 'text/plain' });
            res.end('Not Implemented Yet');
        });

        server.listen(options.port, options.host, () => {
            console.log(`Server successfully started, listening on http://${options.host}:${options.port}`);
            console.log(`Cache directory is: ${cacheDir}`);
        });

    } catch (error) {
        console.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
}

startServer();