# Enhanced Event Emitter

Enhanced Event Emitter (EEE) is a reimagination and reimplementation of the Node.js [Event Emitter][ee].

  [ee]: https://nodejs.org/api/events.html#events_class_eventemitter


## Why?

The standard [Event Emitter][ee], as well as its reimplementations ([EE2][] and [EE3][]), are a mechanism for object to
announce events to an unknown number of *listeners*, and for those listeners to communicate that they want to receive
those events.  This mechanism is a one-way communication method, allowing *emitters* to send information but not
allowing *listeners* to reply back or communicate between them in any way.

What EEE tries to solve is that very last problem: communication from *listener* to *emitter* and between listeners.
We do this by allowing *listeners* to return values back to the *emitter*, pass values through to other *listeners* or
even completely stop propagation of the events.

  [ee2]: https://github.com/asyncly/EventEmitter2
  [ee3]: https://github.com/primus/eventemitter3


## Usage

The main exported symbol is an `EventEmitter`-like class.  You can derive from that class to add the typical `.emit`
and `.on` methods, among others.

```js
import EEE from 'enhanced-event-emitter';

class SomeClass extends EEE {
  constructor (/* ... */) {
    super();
  }

  /* ... */
}
```

This class is, however, a *proxy*: Upon construction, it creates an [`EEE.Emitter`][class-emitter] object, stored in
the `__eee` object attribute, and redirects all of `EEE`'s methods to methods of this object.  It is recommended to use
this class as you would a regular `EventEmitter` for most situations, but see the documentation of
[`EEE.Emitter`][class-emitter] if you need something more custom.


### Listening

Adding a listener to an emitter can be done by calling [`#on`][method-on] or [`#once`][method-once] in the emitter.
These methods accept four arguments:

  - `name`: The name of the event to listen on
  - `hook`: The function that will be called when the event fires
  - `thisArg`: Which object will be bound too the `this` variable inside the `hook` function (defaults to the event source)
  - `priority`: The priority of this listener (defaults to `0` or `EEE.PRIORITY.NORMAL`)

If you've ever used [`EventEmitter3`][ee3], you should recognize the first three arguments.  If you haven't, you should
recognize the first two and understand the third.  The priority, however, might be kind of new to you.  What priority
means is, essentially, *in which order the listeners will be run*.

Because we are interested in *communication*, all events are fired *serially*: An event listener is not fired until the
previous one ends.  Being a completely asynchronous environment, of course, we can't really know when an event end, so
we rely on the event hook function returning a `Promise` which fulfillment means the event has ended.

The order in which listeners are fired, then, is determined first by their `priority`, and then by their order.
Priority is just a number, with lower number coming first.  There are a few constants for priority inside the
`EEE.PRIORITY` object with the following values:

  - `HIGHEST`: -1000
  - `HIGHER`: -100
  - `HIGH`: -10
  - `NORMAL`: 0
  - `LOW':`: +10
  - `LOWER`: +100
  - `LOWEST`: +1000

Of course, any number would work, but these are there for your convenience.

The `hook` function will receive a first argument before the objects given to the `emit` mehtod, which represents the
event itself.  This [`Event`][class-event] object can be used to obtain information about the event itself, to *stop*
the event propagation, and to share information with other listeners.


> Note: If your hook function can return a result and do all its work that's dependent on the emitter without waiting
for something else to end, you can (and should) fulfill the promise early.  In particular, if you *can* return
immediately, you should.  By returning as early as you can, you allow other listeners to run as soon as possible.


### Emitting
