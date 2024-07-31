const express = require('express');
const fs = require('node:fs');
const Ajv = require('ajv');
const ajv = new Ajv();
var static_path = process.env.STATIC_PATH;
static_path ??= "/usr/share/race/";
var board_file_name = process.env.BOARD_FILE;
board_file_name ??= "/var/lib/race/board.json";
var http_port = process.env.HTTP_PORT;
http_port ??= 8000;
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

s = express();
s.use(express.json());
s.use(express.static(static_path));
s.get('/', (req, res) => {
	res.sendFile(static_path + "/index.html");
});
s.route('/board')
	.get((req, res) => {
		res.type('application/json').sendFile(board_file_name);
	})
	.post((req, res) => {
		let board = req.body;
		if (!validate_board(board)) {
			res.status(400);
			res.end();
			return;
		}
		board.drivers = board.drivers.map((d) => {
			d.name = d.name.replace(/[^A-Za-z\s]/g, '');
			return d;
		});
		console.log(Date.now(), 'WRITE', board);
		fs.writeFileSync(board_file_name, JSON.stringify(board));
		res.status(200);
		res.end();
	});
s.listen(http_port);

console.log("BOARD_FILE", board_file_name);
console.log("PORT", http_port);