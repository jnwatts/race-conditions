class Boards {
    constructor (params) {
        if (!params) {
            params = {};
        }
    }

    static get(bid) {
        if (!bid) {
            return fetch(`board`).then((res) => res.json());
        }
        return fetch(`board/${bid}`).then((res) => res.json());
    }

    static put(bid, board) {
        let uri = 'board';
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
        return fetch(`boards`).then((res) => res.json());
    }

    static setDefault(bid) {
        return fetch(`board/${bid}/default`, {
            method: 'PUT'
        });
    }
}