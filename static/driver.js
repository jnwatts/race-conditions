class Driver {
    constructor(params) {
        if (!params) {
            params = {};
        }
        const driver_template = document.querySelector("#driver_template");
        this.time_template = document.querySelector("#time_template");
        let e = driver_template.content.cloneNode(true);
        this.e_li = e.querySelector("li.driver");
        this.e_rank = e.querySelector("#rank");
        this.e_name = e.querySelector("#name");
        this.e_time = e.querySelector("#time");
        this.e_delete = e.querySelector("#del_driver");
        if ("name" in params) {
            this.name = params.name;
        } else {
            let names = ["Kevin", "Ken", "Adrian", "Paul", "Tim", "Nathan", "Lewis", "Cody", "Brian", "Chuck", "Tom", "Larry", "Tim", "Sir Jerry", "Carl", "Chris", "Donny", "Butch", "Lance", "Bob", "Gary", "Stuart", "Claude", "Phil", "Jerry", "Darwin", "Barry", "Steve", "Dave", "Mark", "Kevin", "Lionel", "Donnie", "Other Jerry", "Jorge", "Jeff", "Mack", "Bob", "Gaetano", "Brad", "Eric", "Bob", "Mel", "Otto", "Justin", "Alex", "Ronald", "Phil", "Ralph"];
            this.name = names[Math.floor((Math.random()*names.length))];
        }
        if ("times" in params) {
            this.times = params.times;
        } else {
            this.times = [];
        }
        this.rank = 0;
        e.querySelector("#name").addEventListener('change', (e) => { this.change(e); });
        this.e_delete.addEventListener('click', (e) => { window.lb.del_driver(this); });
        this.render();
    }

    static timeToString(t) {
        if (!t) {
            return "";
        }
        let v;
        let m = Math.floor(t / 60.0);
        t -= m * 60.0;
        let s = Math.floor(t);
        t -= s;
        let ms = Math.round(t * 1000.0);
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

    toJson() {
        return {
            name: this.name,
            times: this.validTimes(),
        };
    }

    validTimes() {
        return this.times.filter((t) => t && t > 0.00);
    }

    hasTimes() {
        return this.validTimes().length > 0;
    }

    bestTime() {
        let times = this.validTimes();
        if (times.length == 0) {
            return NaN;
        }
        return Math.min(...times);
    }

    render() {
        this.e_rank.value = this.rank;
        this.e_name.value = this.name;
        let times = this.validTimes();
        times.push(0);
        times = times.map((t) => {
            let e = this.time_template.content.cloneNode(true);
            let e_v = e.querySelector(".time");
            e_v.value = Driver.timeToString(t);
            e_v.addEventListener('change', (e) => { this.change(e); });
            return e;
        });
        this.e_time.replaceChildren(...times);
    }

    change(e) {
        this.name = this.e_name.value.replace(/[^A-Za-z\s]/g, '');
        this.times = Array.from(this.e_time.querySelectorAll(".time").values().map((e) => {
            return Driver.stringToTime(e.value);
        }).filter((t) => t));
        this.e_li.setAttribute('id', this.name);
        this.render();
    }
}