const PRIORITY = Object.freeze({
    'HIGHEST': -1000,
    'HIGHER':   -100,
    'HIGH':      -10,
    'NORMAL':      0,
    'LOW':       +10,
    'LOWER':    +100,
    'LOWEST':  +1000,
});

/* Sequential ordering for events */
let ORDER = 0;


class Event {
    constructor () {
        this._stopped = false;
        this._active = false;
        this._value = null;
    }

    stop () {
        if (!this._active) {
            throw new Error('can\'t stop an event after it has ended!');
        }

        this._stopped = true;
    }

    get stopped () {
        return this._stopped;
    }

    get value () {
        return this._value;
    }
}

class Result {
    constructor () {
        this.events = [];
    }

    _addEvent ($evt) {
        this.events.push($evt);
    }

    get stopped () {
        return this.events.some($evt => $evt.stopped);
    }

    get values () {
        let values = [];

        for (let evt of this.events) {
            let value = evt.value;

            if (value instanceof Result) {
                values.push(...value.values);
            } else if (value !== undefined) {
                values.push(value);
            }
        }

        return values;
    }
}

class Emitter {
    constructor (source) {
        this.source = source;
        this.listeners = new Map();
    }

    on (name, hook, priority=PRIORITY.NORMAL, thisArg=this) {
        if (!this.listeners.has(name)) {
            this.listeners.set(name, []);
        }

        let funcs = this.listeners.get(name);

        funcs.push({
            'hook': hook,
            'this': thisArg,
            'order': ORDER++,
            'priority': priority
        });

        funcs.sort((a, b) => (a.priority - b.priority) || (a.order - b.order));

        return hook;
    }

    off (name, hook) {
        // branch on arguments
        if (name && hook) return this._off_nameHook(name, hook);
        else if (name) return this._off_nameAll();
        else if (hook) return this._off_hookAny();
        else return this._off_all();
    }

    _off_all () {
        this.listeners.clear();
    }

    _off_nameAll (name) {
        this.listeners.delete(name);
    }

    _off_hookAny (hook) {
        this.listeners.forEach((_, name) => this._off_nameHook(name, hook))
    }

    _off_nameHook (name, hook) {
        let listeners = this.listeners.get(name) || [];
        for (let i in listeners) {
            let listener = listeners[i];

            if (hook === listener.hook) {
                listeners.splice(i, 1)
            }
        }
    }

    async emit (names_, ...args) {
        await 1; // yield the current event for fully async emits (await is always async)

        // preserves priority across multiple events
        const $res = new Result();
        const listeners = [];

        if (Array.isArray(names_)) {
            for (const name of names_) {
                listeners.push(...(this.listeners.get(name) || []));
            }

            // resort because we are mixing event listeners
            listeners.sort((l1, l2) => (l1.priority - l2.priority) || (l1.order - l2.order));
        } else if (this.listeners.has(names_)) {
            listeners.push(...this.listeners.get(names_));
        } else {
            return $res;
        }

        for (const listener of listeners) {
            const $evt = new Event();

            $evt._active = true;
            const res = await listener.hook.call(listener.thisArg, $evt, ...args);
            $evt._active = false;

            $evt._value = res;
            $res._addEvent($evt);

            if ($res.stopped) {
                break;
            }
        }

        return $res;
    }
}


class EEE {
    constructor (...args) {
        this.__eee = new Emitter(this, ...args);
    }

    on (...args) {
        return this.__eee.on(...args);
    }

    once (...args) {
        return this.__eee.once(...args);
    }

    off (...args) {
        return this.__eee.off(...args)
    }

    emit (...args) {
        return this.__eee.emit(...args);
    }
}

module.exports = EEE;
module.exports.PRIORITY = PRIORITY;
module.exports.Event = Event;
module.exports.Result = Result;
module.exports.Emitter = Emitter;
