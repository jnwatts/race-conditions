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
            let d_width = 5;
            let r_width = 5;
            let v = "";
            let delta = 0;
            for (let i = 0; i < names.length; i++) {
                if (i == 0) {
                    delta = "---";
                    ratio_to_first = "100";
                } else {
                    delta = Driver.timeToString(times[i] - times[i - 1]);
                    if (delta == 0.0) {
                        delta = "---";
                    }
                    ratio_to_first = ((times[0] / times[i]) * 100.0).toFixed(3);
                }
                const pad = "   ";
                v += (i+1).toString() + ". " + names[i].padEnd(n_width, ' ') + pad + times_str[i].padStart(t_width, ' ') + pad + delta.padEnd(d_width) + pad + ratio_to_first.padEnd(r_width) + "\n";
            }
            let tbl = document.querySelector('#table');
            tbl.value = v;
            tbl.setAttribute('rows', names.length);

            if (typeof window.Chart !== 'undefined') {
                if (typeof window.lb.chart !== 'undefined') {
                    window.lb.chart.destroy();
                }
                let session_counts = [];
                let all_times = [];
                let datasets = drivers.map((d) => {
                    let times = d.validTimes().map((t,session) => t);
                    session_counts.push(times.length);
                    all_times.push(...times);
                    return {
                        label: d.name,
                        data: times,
                    };
                });
                window.lb.chart = new Chart(document.querySelector('#chart'), {
                    type: 'line',
                    data: {
                        labels: new Array(Math.max(...session_counts)).fill(1).map( (_, i) => i+1 ),
                        datasets: datasets,
                    },
                    options: {
                        scales: {
                            y: {
                                min: Math.min(...all_times) - 0.25,
                                max: Math.max(...all_times) + 0.25,
                                ticks: {
                                    callback: (value, index, ticks) => {
                                        return Driver.timeToString(value);
                                    }
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    title: (tooltips) => { return tooltips.map((t) => { return t.dataset.label + " #" + t.label; }) },
                                    label: (t) => { return Driver.timeToString(t.raw); },
                                }
                            }
                        }
                    }
                });
            }
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
        parse_board: (board) => {
            if (!board) {
                window.lb.new();
                return;
            }
            window.lb.id = board.id;
            window.lb.name = board.name;
            window.lb.created = board.created;
            window.lb.modified = board.modified;
            window.lb.drivers = board.drivers.map((d) => new Driver(d));
            window.lb.sort_drivers();
            document.querySelector("#set_default").disabled = (!board.id);
            window.history.replaceState(null, document.title, window.location.href.replace(window.location.search, '') + "?id=" + board.id);
        },
        load: (id) => {
            Boards.get(id).then(window.lb.parse_board)
            .catch((e) => {
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
            window.history.replaceState(null, document.title, window.location.href.replace(window.location.search, ''));
        },
        save: () => {
            window.lb.sort_drivers();
            let board = {
                ver: 2,
                name: window.lb.name,
                created: window.lb.created,
                modified: window.lb.modified,
                drivers: window.lb.drivers.map((d) => d.toJson()),
            };
            Boards.put(window.lb.id, board).then((board) => {
                window.lb.parse_board(board);
            });
        },
        open: () => {
            window.location.href = Boards.api_path + "/open.html?limit=10";
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
