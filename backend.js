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

	static byId(bid) {
		if (!Board.exists(bid)) {
			return null;
		}
		let o;
		let st;
		try {
			console.log("READ", bid);
			let fn = bid_to_path(bid);
			st = fs.statSync(fn);
			o = JSON.parse(fs.readFileSync(bid_to_path(bid)));
		} catch(err) {
			return null;
		}
		let b = Board.fromJson(o);
		b._id = bid;
		b._st = st;
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
		} else {
			this._id = bid;
		}
		let o = this.toFileJson();
		console.log(Date.now(), 'SAVE', o);
		fs.writeFileSync(bid_to_path(this._id), JSON.stringify(o));
	}

	static fromJson(o) {
		if (!validate_board(o)) {
			console.log("Validate fail", o);
			return null;
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
		return board;
	}

	toJson() {
		return {
			ver: 1,
			id: this._id,
			created: this._st.birthtime,
			modified: this._st.mtime,
			name: this._name,
			drivers: this._drivers
		}
	}

	toFileJson() {
		return {
			ver: 1,
			name: this._name,
			drivers: this._drivers
		}
	}

	static all() {
		return fs.readdirSync(board_path).filter((f) => f.endsWith(".json")).map((f) => parseInt(f.replace(".json", "")));
	}

	static top10() {
		return Board.all().sort((a,b) => b - a).slice(0,10).map((bid) => Board.byId(bid).toJson());
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
	res.status(200);
	res.end();

});
s.get('/boards', (req, res) => {
	res.status(200);
	res.type('application/json').json(Board.top10());
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