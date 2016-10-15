import Promise from 'bluebird';


export const PRIORITY = Object.freeze({
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


export class Event {
    constructor () {
        this._stopped = false;
        this._active = false;
        this.result = null;
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
}

export class Result {
    constructor () {
        this.events = [];
    }

    _addEvent ($evt) {
        this.events.push($evt);
    }

    get stopped () {
        return this.events.some($evt => $evt.stopped);
    }
}

export class Emitter {
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
        let names = Array.isArray(names_) ? names_ : [names_];
        let $res = new Result();

        for (let name of names) {
            let listeners = this.listeners.get(name) || [];

            await Promise.delay(); // yield the current event for fully async emits

            for (let listener of listeners) {
                let $evt = new Event();

                $evt._active = true;
                let res = await Promise.cast(listener.hook.call(listener.thisArg, $evt, ...args));
                $evt._active = false;

                $evt.result = res;
                $res._addEvent($evt);

                if ($evt.stopped) {
                    break;
                }
            }
        }

        return $res;
    }
}


export default class EEE {
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
