const http = require('node:http');
const fs = require('node:fs');
const Ajv = require('ajv');
const ajv = new Ajv();
const board_file_name = "/var/lib/race/board.json";
const validate_board = ajv.compile({
	type: "object",
	properties: {
		ver: {type: "integer", const: 1},
		drivers: {
			type: "array",
			items: {
				type: "object",
				properties: {
					name: {
						type: "string",
						maxLength: 128
					},
					time: {type: "number"}
				},
				required: [
					"name",
					"time"
				],
				additionalProperties: false
			},
			maxItems: 128
		}
	},
	required: [
		"ver",
		"drivers"
	],
	additionalProperties: false
});

function serve_file(res, fn, type) {
	let st;
	try {
		st = fs.statSync(fn);
	} catch (err) {
		let empty = "{}";
		res.writeHead(200, {
			'Content-Type': type,
			'Content-Length': empty.length,
		});
		res.write(empty);
		res.end();
		return;
	}
	res.writeHead(200, {
		'Content-Type': type,
		'Content-Length': st.size
	});
	var readStream = fs.createReadStream(fn);
	readStream.pipe(res);
}

function write_file(req, res, fn) {
	let body = null;
	req.on('data', (chunk) => {
		if (body == null) {
			body = chunk.toString();
			if (chunk.length > 2*1024) {
				res.statusCode = 400;
				res.end();
			}
		}
	}).on('end', () => {
		let board = JSON.parse(body);
		if (!validate_board(board)) {
			res.statusCode = 400;
			res.end();
			return;
		}
		board.drivers = board.drivers.map((d) => {
			d.name = d.name.replace(/[^A-Za-z\s]/g, '');
			return d;
		});
		console.log(Date.now(), 'WRITE', board);
		fs.writeFileSync(fn, JSON.stringify(board));
	});
}

const s = http.createServer();
s.on('request', (req, res) => {
	try {
		console.log(Date.now(), req.method, req.url);
		if (req.url == "/board") {
			if (req.method == "GET") {
				serve_file(res, board_file_name, "application/json");
			} else if (req.method == "POST") {
				write_file(req, res, board_file_name);
			} else {
				res.statusCode = 400;
				res.end();
			}
		} else if (req.url == "/" || req.url == "/index.html") {
			serve_file(res, "./index.html", "text/html");
		} else if (req.url == "/index.js") {
			serve_file(res, "./index.js", "application/javascript");
		} else {
			res.statusCode = 404;
			res.end();
		}
	} catch(err) {
		console.log(500, err);
		res.statusCode = 500;
		res.end();
	}
});
s.listen(8000);
