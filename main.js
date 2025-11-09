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

async function handleGet(req, res, filePath) {
    try {
        const data = await fs.readFile(filePath);
        console.log(`[CACHE HIT] Serving ${path.basename(filePath)} from cache.`);
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`[CACHE MISS] ${path.basename(filePath)} not in cache.`);
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found in cache');
        } else {
            console.error(`Error reading file: ${error.message}`);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        }
    }
}

async function handlePut(req, res, filePath) {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    
    req.on('end', async () => {
        try {
            const data = Buffer.concat(chunks);
            await fs.writeFile(filePath, data);
            console.log(`[CACHE PUT] Stored ${path.basename(filePath)} in cache.`);
            res.writeHead(201, { 'Content-Type': 'text/plain' });
            res.end('Created');
        } catch (error) {
            console.error(`Error writing file: ${error.message}`);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        }
    });
}

async function handleDelete(req, res, filePath) {
    try {
        await fs.unlink(filePath);
        console.log(`[CACHE DELETE] Deleted ${path.basename(filePath)} from cache.`);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Deleted');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`[CACHE DELETE] File not found: ${path.basename(filePath)}`);
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        } else {
            console.error(`Error deleting file: ${error.message}`);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        }
    }
}

async function requestHandler(req, res) {
    const { method, url } = req;
    
    const match = url.match(/^\/(\d{3})$/);

    if (!match) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request: URL must be in /XXX format (e.g., /200)');
        return;
    }

    const httpCode = match[1];
    const fileName = `${httpCode}.jpeg`;
    const filePath = path.join(cacheDir, fileName);

    console.log(`Request: ${method} ${url}`);

    switch (method) {
        case 'GET':
            await handleGet(req, res, filePath);
            break;
        case 'PUT':
            await handlePut(req, res, filePath);
            break;
        case 'DELETE':
            await handleDelete(req, res, filePath);
            break;
        default:
            res.writeHead(405, { 'Content-Type': 'text/plain', 'Allow': 'GET, PUT, DELETE' });
            res.end('Method Not Allowed');
            break;
    }
}

async function startServer() {
    try {
        await fs.mkdir(cacheDir, { recursive: true });
        console.log(`Cache directory ensures at: ${cacheDir}`);

        const server = http.createServer(requestHandler);

        server.listen(options.port, options.host, () => {
            console.log(`Server successfully started, listening on http://${options.host}:${options.port}`);
        });

    } catch (error) {
        console.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
}

startServer();