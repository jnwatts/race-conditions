window.addEventListener('load', () => {
    class Driver {
        constructor(params) {
            if (!params) {
                params = {};
            }
            const driver_template = document.querySelector("#driver_template");
            let e = driver_template.content.cloneNode(true);
            this.e_li = e.querySelector("li.driver");
            this.e_name = e.querySelector("#name");
            this.e_time = e.querySelector("#time");
            this.e_delete = e.querySelector("#del_driver");
            if ("name" in params) {
                this.name = params.name;
            } else {
                this.name = "";
            }
            if ("time" in params) {
                this.time = params.time;
            } else {
                this.time = 0.0;
            }
            e.querySelectorAll("input").forEach((v, i, l) => {
                v.addEventListener('change', (e) => { this.change(e); });
            });
            this.e_delete.addEventListener('click', (e) => { window.lb.del_driver(this); });
        }

        static timeToString(t) {
            if (!t) {
                return "0.000";
            }
            let v;
            let m = Math.floor(t / 60.0);
            t -= m * 60.0;
            let s = Math.floor(t);
            t -= s;
            let ms = Math.floor(t * 1000);
            if (m > 0) {
                v = m.toString() + ":" + s.toString().padStart(2, '0') + ".";
            } else {
                v = s.toString() + ".";
            }
            v += ms.toString().padStart(3, '0');
            return v;
        }

        static stringToTime(v) {
            if (!v) {
                return 0.0;
            }
            let t = 0.0;
            let p;
            p = v.split(':');
            if (p.length > 1) {
                t += 60.0 * parseFloat(p[0]);
                p.shift();
            }
            t += parseFloat(p[0]);
            if (t == NaN)
                return 0.0;
            return t;
        }

        render() {
            this.e_name.value = this.name;
            this.e_time.value = Driver.timeToString(this.time);
        }

        change(e) {
            this.name = this.e_name.value.replace(/[^A-Za-z\s]/g, '');
            this.time = Driver.stringToTime(this.e_time.value);
            this.e_li.setAttribute('id', this.name);
            this.render();
        }
    }

    window.lb = {
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
            window.lb.drivers.sort((a,b) => {
                return a.time - b.time;
            });
            let drivers = window.lb.drivers;
            let sorted_elements = drivers.map((d) => {
                d.render();
                return d.e_li;
            });
            document.querySelector("#drivers").replaceChildren(...sorted_elements);
            let names = drivers.map((d) => d.name);
            let times = drivers.map((d) => d.time);
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
                    time: Driver.stringToTime(p[3])
                }));
            });
            window.lb.sort_drivers();
        },
        load: () => {
            fetch('board').then((res) => {
                res.json().then((board) => {
                    window.lb.drivers = board.drivers.map((d) => new Driver(d));
                    window.lb.sort_drivers();
                });
            });
        },
        save: () => {
            let board = {
                ver: 1,
                drivers: window.lb.drivers.map((d) => { return {name: d.name, time: d.time} }),
            };
            fetch('board', {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(board),
            });
        },
    };

    document.querySelector("#add_driver").addEventListener('click', lb.add_driver);
    document.querySelector("#sort_drivers").addEventListener('click', lb.sort_drivers);
    document.querySelector("#parse_table").addEventListener('click', lb.parse_table);
    document.querySelector("#load").addEventListener('click', lb.load);
    document.querySelector("#save").addEventListener('click', lb.save);

    window.lb.load();
});
