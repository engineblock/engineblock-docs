---
date: 2017-05-19T22:09:53
title: Cycle Tracking
weight: 13
menu:
  main:
    parent: Design Sketches
    identifier: Cycle Tracking
    weight: 12
---

## Synopsis

When coordinating activities with each other, it is necessary to link the
completion status of an activity to the inputs available to another. Doing this
concurrently and efficiently presents some interesting challenges.

Some testing scenarios require that you are able to take the results of
one phase of testing as input to another phase. For example, you may want
to simply visit created data in a later phase to verify that it is accurate.

Engineblock already encapsulates a phase of testing with the *activity* concept.
Activities also have well-defined input semantics. However, there is not yet
a facility to allow an activity to feed another one with a set of inputs
that match some criteria selected by the tester. There isn't even yet a
facility for an activity to capture results as an information source for others.

In this section, hypothetical activities A and B will be coordinating
their execution on individual cycles.

## Definitions

### Pacing

A simple form of interplay between two activities is to allow a downstream
activity to take action on cycles that have been fully retired or completed by
an upstream activity. This specific functionality is termed *pacing* in this
section. When pacing an activity A to activity B, you are ensuring that, for
each specific cycle executed by A, B will not see it until the cycle has fully
completed on A. This is a way to achieve serialization of cycle iterations
between A and B. It simply means that the input to B blocks until it has enough
completion data from A to know that the next cycle is no longer active in A.

### Marking

If you want to provide some detail to activity B for the specific iterations run
by A, then each cycle of A needs to yield a result. This means that Activities
in general need to to act as a function between the cycle number and some result
type. Not only do you need to track whether a given cycle has been completed,
but you also need to know what the result of that cycle was, providing it to
activity B to operate on. *Marking* refers to the ability to record specific
cycle outcomes for an activity. It is the producer side of cycle status sharing
between two activities. A *CycleMarker* is an implementation of the recorder
side of result data provided by an activity.

### Tracking

Tracking is the consumer side of cycle status sharing between two activities. A
*CycleTracker* is an implementation of the reader side of data provided by a
cycle marker. If activity A is marking cycles, then activity B could be tracking
those cycles with the help of a tracker.

### Result Coding

The semantics and representation of specific result types vary across
activity types. That makes it a non-trivial problem to allow various types of
activities to communicate about results in their own idiomatic way.

Instead, we will choose a simple and common data format that can be optimized
and built upon. Because of the affinity between ints and the Enum type, 
a cycle result of int is suitable. Further, because of the trade-offs between
space and information density, a single byte is a suitable maximum size for
storage. We can ask an individual cycle to return an int to represent its 
result, with some limitations about the values it may take.

There are some trade-offs in this approach. One is that a user may have to map
the semantics of specific values to things like "pass", or "fail", or something
entirely different. However, the ability to do this is also a degree of
flexibility. It should be possible to create flows between activities with
different semantic languages simply by providing a suitable result code for
interesting cycle outcomes.
 
For the reasons above, activities will be required to provide a single integer
value, but the allowable values provided will be limited to zero and positive
values between 1 and 127, inclusive. The reasons for this will become clearer as
we go forward.

### Filtering

Once you have the ability to provide specific outcomes from each activity cycle,
filtering becomes relatively easy. This would be useful, for example, for
marking cycles of activity A for further work **downstream** in activity B.

## The Marking Bestiary

There are various functional design trade-offs to think about when building an
efficient coordination layer between different thread pools. Practically
speaking, that is what we are attempting to do. However, the trade-offs are
center stage, given the heterogeneous nature of activity types as well as the
performance mandate. This section is meant to describe the various functional
gamuts in one place, in order to clarify the choices ultimately made in
different implementations.

### blocking or non-blocking

A Marker or Tracker is non-blocking if it is able to scale well to many marking
cycles. It is not, for example, if it has internal synchronization that makes it
block cycles as a bottleneck. Given that this EngineBlock is meant to be a test
instrument, you should not build markers that do this unless they are purchasing
something very useful for the trade-off.

### throttling or non-throttling

Slightly different than blocking is the notion of throtting. In terms of functional
needs, a marker may have good reason to throttle a completing activity cycle, and
a tracker may have good reason to throttle a starting activity cycle. 

### blocking vs throttling

The primary distinction between blocking and throttling is whether or not the
behavior is needed to support a particular scenario or configuration.

Consider a case in which activity A runs 54,000,000,000 cycles, each after which
activity B is intended to repeat a different action on the same cycles. If
activity A ran on average 2x a fast as activity B, then there is an implied
buffer of 27,000,000,000 cycles. If this were a performance test, then the cost
of holding that queue would surely impact the results and very likely the
ability of the test system to run well. In this case it would make sense to tie
the execution rate of activity B to activity A, at least within some reasonable
bound. That would mean that A would have to wait on B about half the time,
however the flow between the two activities would still be meaningful and
executable. This is an example of throttling that makes sense.

However, if you were to cause activity A to wait often in a marker even if there
were no activity B tracking the data for that marker, this would be considered a
serious blocking effect that would limit the fidelity of any such test.

### Thread-safety: all markers and trackers

All markers and trackers must be thread safe. Any practical scenario has
activities with many threads.

### persisted or non-persisted

A marker may record its data stream (a sequence of cycle values and result codes)
in a form to be later re-used.

### buffered or non-buffered

The interaction between the producer-consumer pairing of a marker and tracker
may be buffered, meaning that the tracker may not always see the last logical
value recorded by the marker, or that the marker may not expose it immediately.


## Open questions

Buffering is necessary in order to reduce contention between markers and
trackers acting on the same internal data. You can have a buffering range of,
say 1K cycles, and still maintain high throughput between the producer and the
consumer thread pools. However, if you required that the tracker always see
the immediate state of the marker, it becomes more difficult to build an optimal
marker, and vice versa.

Still, when a marker has stopped providing new data, it may be necessary to
allow a marker or tracker implementation to fall back to a finer-grained
high-precision mode in order to avoid blocking a scenario completion. The catch
is that you don't always know how many cycles will actually be attempted, and
thus how many you should absolutely be expecting a cycle result for. If you are
blocking a reader (tracker) while you await a marker segment to be completed,
and that marker segment will never complete because the marking activity is
stopped, then you have a deadlock.

One potential solution to this is to require marker users (senders) to have a
logicall connected and disconnected state, and to allow marker implementations
to use these as active management events for the purposes of adjusting blocking
modes according to efficiency and timeliness requirements.