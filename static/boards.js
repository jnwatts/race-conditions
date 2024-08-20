class Boards {
    constructor (params) {
        if (!params) {
            params = {};
        }
    }

    static jsonFetch(args) {
        return fetch(args).then((res) => {
            if (!res.ok) {
                return null;
            }
            return res.json();
        });
    }

    static get(bid) {
        if (!bid) {
            return Boards.jsonFetch(this.api_path + `/board`);
        }
        return Boards.jsonFetch(this.api_path + `/board/${bid}`);
    }

    static put(bid, board) {
        let uri = this.api_path + '/board';
        let method = 'POST';
        if (bid) {
            uri += '/' + bid.toString();
            method = 'PUT';
        }
        return fetch(uri, {
            method: method,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(board),
        });
    }

    static top10() {
        return Boards.jsonFetch(this.api_path + `/boards`);
    }

    static setDefault(bid) {
        return fetch(this.api_path + `/board/${bid}/default`, {
            method: 'PUT'
        });
    }
}
