const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const Ajv = require('ajv');
const ajv = new Ajv();
var static_path = process.env.STATIC_PATH;
static_path ??= "/usr/share/race/";
var board_path = process.env.BOARD_PATH;
board_path ??= "/var/lib/race/";
var http_port = process.env.HTTP_PORT;
http_port ??= 8000;
const validate_board = ajv.compile({
	type: "object",
	properties: {
		ver: {type: "integer", const: 1},
		id: {
			type: "integer"
		},
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

function bid_to_path(bid) {
	bid ??= 1;
	return path.join(board_path, (bid).toString() + ".json");
}

class Board {
	static _next = undefined;

	constructor() {
		this._drivers = [];
		this._bid = undefined;
	}

	static nextId() {
		if (!Board._next) {
			Board._next = 1;
		}
		while (Board.exists(Board._next)) {
			Board._next += 1;
		}
		return Board._next;
	}

	static byId(bid) {
		if (!Board.exists(bid)) {
			return null;
		}
		let o;
		try {
			console.log("READ", bid);
			o = JSON.parse(fs.readFileSync(bid_to_path(bid)));
		} catch(err) {
			return null;
		}
		let board = new Board();
		board._drivers = o.drivers;
		return board;
	}

	static exists(bid) {
		let fn = bid_to_path(bid);
		let exists = false;
		try {
			let st = fs.statSync(fn);
			exists = true;
		} catch(err) {
			console.log("ERR", err);
		}
		console.log("EXISTS", bid, fn, exists);
		return exists;
	}

	save(bid) {
		if (!bid) {
			this._bid = Board.nextId();
		}
		let o = this.toJson();
		console.log(Date.now(), 'SAVE', o);
		fs.writeFileSync(bid_to_path(bid), JSON.stringify(o));
	}

	static fromJson(o) {
		if (!validate_board(o)) {
			console.log("Validate fail", o);
			return null;
		}
		let board = new Board();
		board._drivers = o.drivers.map((d) => {
			d.name = d.name.replace(/[^A-Za-z\s]/g, '');
			return d;
		});
		return board;
	}

	toJson() {
		return {
			ver: 1,
			bid: this._bid,
			drivers: this._drivers
		}
	}
}

s = express();
s.use(express.json());
s.use(express.static(static_path));
s.get('/', (req, res) => {
	res.sendFile(static_path + "/index.html");
});
s.post('/board', (req, res) => {
	let board = Board.fromJson(req.body);
	if (!board) {
		res.status(400);
		res.end();
		return;
	}
	board.save(undefined);
	res.status(200);
	res.end();

});
s.route('/board/:bid?')
	.get((req, res) => {
		let bid = req.params.bid;
		if (!bid) {
			bid = undefined;
		} else {
			bid = parseInt(bid);
		}
		let board = Board.byId(bid);
		if (!board) {
			res.status(404);
			res.end();
			return;
		}
		res.type('application/json').json(board.toJson());
	})
	.put((req, res) => {
		let bid = req.params.bid;
		if (!bid) {
			res.status(400);
			res.end();
			return;
		} else {
			bid = parseInt(bid);
		}
		if (!Board.exists(bid)) {
			res.status(404);
			res.end();
			return;
		}
		let board = Board.fromJson(req.body);
		if (!board) {
			res.status(400);
			res.end();
			return;
		}
		board.save(bid);
		res.status(200);
		res.end();
	});
s.route('/board/:bid/drivers')
	.get((req, res) => {
		let bid = req.params.bid;
		if (!bid) {
			bid = undefined;
		} else {
			bid = parseInt(bid);
		}
		let board = Board.byId(bid);
		console.log(board);
		res.json(board.drivers());
	});
s.route('/board/:bid/driver/:name')
	.get((req, res) => {
		let bid = req.params.bid;
		if (!bid) {
			bid = undefined;
		} else {
			bid = parseInt(bid);
		}
		let name = req.params.name;
		if (!name) {
			name = undefined;
		}
		let board = Board.byId(bid);
		res.json(board.driver(name));
	});
s.listen(http_port);

console.log("BOARD_PATH", board_path);
console.log("PORT", http_port);