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
const validate_board_version = ajv.compile({
	type: "object",
	properties: {
		ver: {type: "integer"},
	},
	required: ["ver"],
	additionalProperties: true
});
const validate_board_v1 = ajv.compile({
	type: "object",
	properties: {
		ver: {type: "integer", const: 1},
		id: {
			type: "integer",
			minimum: 1
		},
		name: {
			type: "string",
			maxLength: 64
		},
		created: {
			type: "string"
		},
		modified: {
			type: "string"
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
		"drivers",
		"name"
	],
	additionalProperties: false
});
const validate_board_v2 = ajv.compile({
	type: "object",
	properties: {
		ver: {type: "integer", const: 2},
		id: {
			type: "integer",
			minimum: 1
		},
		name: {
			type: "string",
			maxLength: 64
		},
		created: {
			type: "string"
		},
		modified: {
			type: "string"
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
					times: {
						type: "array",
						items: {
							type: "number"
						}
					}
				},
				required: [
					"name",
					"times"
				],
				additionalProperties: false
			},
			maxItems: 128
		}
	},
	required: [
		"ver",
		"drivers",
		"name"
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
		this._id = undefined;
		this._name = undefined;
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

	static default() {
		let bid = undefined;
		try {
			bid = parseInt(fs.readFileSync(path.join(board_path, "default")));
		} catch (err) {
		}

		if (!bid) {
			return null;
		}

		return Board.byId(bid);
	}

	static setDefault(bid) {
		try {
			fs.writeFileSync(path.join(board_path, "default"), bid.toString());
		} catch (err) {
		}
		console.log("DEFAULT", bid);
	}

	static byId(bid) {
		if (!Board.exists(bid)) {
			return null;
		}
		let o;
		let st;
		try {
			console.log("READ", bid);
			let fn = bid_to_path(bid);
			o = JSON.parse(fs.readFileSync(bid_to_path(bid)));
		} catch(err) {
			return null;
		}
		let b = Board.fromJson(o);
		b._id = bid;
		return b;
	}

	static exists(bid) {
		let fn = bid_to_path(bid);
		let exists = false;
		try {
			let st = fs.statSync(fn);
			exists = true;
		} catch(err) {
			// console.log("ERR", err);
		}
		console.log("EXISTS", bid, fn, exists);
		return exists;
	}

	save(bid) {
		if (!bid) {
			this._id = Board.nextId();
			this._created = new Date();
		} else {
			this._id = bid;
		}
		this._modified = new Date();
		let o = this.toFileJson();
		console.log(Date.now(), 'SAVE', o);
		fs.writeFileSync(bid_to_path(this._id), JSON.stringify(o));
	}

	static parseVersion(o) {
		if (!validate_board_version(o)) {
			console.log("Validate version fail", o);
			return null;
		}
		return parseInt(o.ver);
	}

	static fromJson(o) {
		let ver = Board.parseVersion(o);
		if (!ver) {
			return null;
		}
		if (ver == 1) {
			if (!validate_board_v1(o)) {
				console.log("Validate fail", o);
				return null;
			}
			// Upgrade to 2
			o.drivers = o.drivers.map((d) => {
				return {
					name: d.name,
					times: [d.time]
				};
			});
			o.ver = 2;
			ver = 2;
		}
		if(ver == 2) {
			if (!validate_board_v2(o)) {
				console.log("Validate fail", o);
				return null;
			}
		} else {
			console.log("Invalid version", o);
		}

		let board = new Board();
		board._id = o.id;
		board._drivers = o.drivers.map((d) => {
			d.name = d.name.replace(/[^A-Za-z\s]/g, '');
			return d;
		});
		board._name = o.name.replace(/[^\w+\w\s,.-_=#\[\]]/g, '');
		if (!board._name) {
			board._name = "Unititled";
		}
		board._created = new Date(o.created);
		board._modified = new Date(o.modified);
		return board;
	}

	toJson() {
		return {
			ver: 2,
			id: this._id,
			name: this._name,
			created: this._created,
			modified: this._modified,
			drivers: this._drivers
		}
	}

	toFileJson() {
		return {
			ver: 2,
			name: this._name,
			created: this._created,
			modified: this._modified,
			drivers: this._drivers
		}
	}

	static allIds() {
		return fs.readdirSync(board_path).filter((f) => f.endsWith(".json")).map((f) => parseInt(f.replace(".json", "")));
	}

	static all() {
		return this.allIds().map((bid) => Board.byId(bid));
	}

	static top(limit) {
		return this.all().sort((a,b) => b._created - a._created).slice(0,limit);
	}
}

s = express();
s.set('etag', false);
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
	res.type('application/json').json(board.toJson());
	res.status(200);
	res.end();

});
s.get('/boards', (req, res) => {
	res.status(200);
	let boards = [];
	if ('limit' in req.query) {
		let limit = parseInt(req.query.limit);
		console.log(limit);
		if (limit > 0 && limit <= 100) {
			boards = Board.top(limit);
		} else {
			res.status(400);
			res.end();
			return;
		}
	} else {
		boards = Board.all();
	}
	res.type('application/json').json(boards.map((b) => b.toJson()));
});
s.route('/board/:bid?')
	.get((req, res) => {
		let bid = req.params.bid;
		if (!bid) {
			bid = undefined;
		} else {
			bid = parseInt(bid);
		}
		let board;
		if (!bid) {
			board = Board.default();
		} else {
			board = Board.byId(bid);
		}
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
		res.type('application/json').json(board.toJson());
		res.status(200);
		res.end();
	});
s.route('/board/:bid/default')
	.get((req, res) => {
		let bid = req.params.bid;
		bid = parseInt(bid);
		if (!Board.exists(bid)) {
			res.status(404);
			res.end();
			return;
		}
		let b = Board.default();
		res.type('application/json').json(b.id == bid);
		res.status(200);
		res.end();
	})
	.put((req, res) => {
		let bid = req.params.bid;
		bid = parseInt(bid);
		if (!Board.exists(bid)) {
			res.status(404);
			res.end();
			return;
		}
		Board.setDefault(bid);
		res.type('application/json').json(true);
		res.status(200);
		res.end();
	});
s.listen(http_port);

console.log("STATIC_PATH", static_path);
console.log("BOARD_PATH", board_path);
console.log("PORT", http_port);