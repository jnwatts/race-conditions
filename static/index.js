window.addEventListener('load', () => {
    window.lb = {
        id: undefined,
        name: undefined,
        drivers: [],

        add_driver: () => {
            let driver = new Driver();
            window.lb.drivers.push(driver);
            document.querySelector("#drivers").appendChild(driver.e_li);
        },
        del_driver: (d) => {
            d.e_li.remove();
            window.lb.drivers = window.lb.drivers.filter((_d) => { return _d.name != d.name; });
        },
        sort_drivers: (e) => {
            document.querySelector("#board_name").value = window.lb.name;
            window.lb.drivers.sort((a,b) => {
                return a.bestTime() - b.bestTime();
            });
            let drivers = window.lb.drivers;
            let sorted_elements = drivers.map((d, i) => {
                if (d.hasTimes()) {
                    d.rank = (i+1);
                } else {
                    d.rank = "DNS";
                }
                d.render();
                return d.e_li;
            });
            document.querySelector("#drivers").replaceChildren(...sorted_elements);
            let valid_drivers = drivers.filter((d) => d.hasTimes());
            let names = valid_drivers.map((d) => d.name);
            let times = valid_drivers.map((d) => d.bestTime());
            let times_str = times.map((t) => Driver.timeToString(t));
            let n_width = Math.max(...names.map((v) => v.length));
            let t_width = Math.max(...times_str.map((v) => v.length));
            let v = "";
            for (let i = 0; i < names.length; i++) {
                if (i == 0) {
                    delta = "---";
                } else {
                    delta = Driver.timeToString(times[i] - times[i - 1]);
                    if (delta == 0.0) {
                        delta = "---";
                    }
                }
                const pad = "   ";
                v += (i+1).toString() + ". " + names[i].padEnd(n_width, ' ') + pad + times_str[i].padStart(t_width, ' ') + pad + delta + "\n";
            }
            let tbl = document.querySelector('#table');
            tbl.value = v;
            tbl.setAttribute('rows', names.length);
        },
        parse_table: () => {
            window.lb.drivers = [];
            document.querySelector('#drivers').replaceChildren();
            let lines = document.querySelector('#table').value.split("\n");
            lines.forEach((l) => {
                let p = l.match(/([0-9]+.)?\s*([^0-9:.]+)\s+([0-9:.]+).*/);
                if (!p) {
                    return;
                }
                window.lb.drivers.push(new Driver({
                    name: p[2].trim(),
                    times: [Driver.stringToTime(p[3])]
                }));
            });
            window.lb.sort_drivers();
        },
        load: (id) => {
            Boards.get(id).then((board) => {
                if (!board) {
                    window.lb.new();
                    return;
                }
                window.lb.id = board.id;
                window.lb.name = board.name;
                window.lb.drivers = board.drivers.map((d) => new Driver(d));
                window.lb.sort_drivers();
                document.querySelector("#set_default").disabled = (!id);
            }).catch((e) => {
                console.log(e);
                window.lb.new();
            });
        },
        new: () => {
            window.lb.id = undefined;
            window.lb.name = "Untitled";
            window.lb.drivers = [];
            window.lb.add_driver();
            window.lb.sort_drivers();
            document.querySelector("#set_default").disabled = true;
        },
        save: () => {
            window.lb.sort_drivers();
            let board = {
                ver: 2,
                name: window.lb.name,
                drivers: window.lb.drivers.map((d) => d.toJson()),
            };
            Boards.put(window.lb.id, board);
        },
        open: () => {
            window.location.href = Boards.api_path + "/open.html";
        },
        set_default: () => {
            Boards.setDefault(window.lb.id).then(() => {
                window.location.search = "";
            });
        },
        name_change: (e) => {
            window.lb.name = e.target.value;
        },
    };

    document.querySelector("#table").addEventListener('change', lb.parse_table);
    document.querySelector("#add_driver").addEventListener('click', lb.add_driver);
    document.querySelector("#new").addEventListener('click', lb.new);
    document.querySelector("#save").addEventListener('click', lb.save);
    document.querySelector("#open").addEventListener('click', lb.open);
    document.querySelector("#set_default").addEventListener('click', lb.set_default);
    document.querySelector("#board_name").addEventListener('change', lb.name_change);

    window.lb.search_id = parseInt((new URLSearchParams(window.location.search)).get("id"))
Boards.api_path = document.URL.substr(0,document.URL.lastIndexOf('/'));

    try {
        window.lb.load(window.lb.search_id);
    } catch (err) {
        window.lb.new();
    }
});
